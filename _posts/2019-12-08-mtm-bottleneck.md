---
layout: post
title: Making the Model Part 2 - Identifying Bottlenecks
tags: R profvis
---

As explained in my last post, my vision for compiling my training data was to create a bunch of functions that each scrape from the various data sources, combine these functions into one single function, and then loop through this larger function across the list of all the starting pitchers. However, after I had this set up and running, it eventually became clear to me that this for loop would take way too long to run and wouldn't scale well when I discovered new data sources.

The logical first question was: *what specific parts are causing things to run slowly*? To answer this question I turned to a useful package - [profvis](https://support.rstudio.com/hc/en-us/articles/218221837-Profiling-with-RStudio).

The profiler is a really useful tool for understanding how long R is taking to run the different parts of your code. It conveys this information through a flame graph or the data view.  Using the profvis function on my code helped to shed light on which specific parts were the slowest. It turned out that the rvest scraping functions (e.g. read_html()) were particularly slow, which was not very surprising.

![bottleneck](https://github.com/pcbrendel/pcbrendel.github.io/blob/master/_posts/bottleneck.jpg?raw=true "bottleneck")

This raised the next question: *how can I construct my training data in a way that minimizes the number of times these functions need to be used*? 

To demonstrate, let's consider a basic feature - the pitcher's season ERA going into the game. Based on my old plan, I would have a function that scrapes this feature for each row in the data set (>4000 rows). What I decided to do instead is to scrape this data for each potential day in the 2019 season (March 21 - September 30), combine the data from each day, and save this large data set. By doing this, I only have to call the time-consuming bottleneck functions <200 times as opposed to >4000 times. I could then build my training set by successively merging each new scraped dataframe onto my starting data.

The code below demonstrates my proces of going through all the URLs that I have saved based on the day in the season, scraping the data, and then combining the data across the whole season. The "map_dfr" function from purrr is a convenient tool for converting my list of dataframes into a single dataframe.

```r
start <- as.Date("03-21", format = "%m-%d")
end <- as.Date("09-30", format = "%m-%d")
date <- start
i <- 1
out <- vector("list", length(as.integer(end - start)))

while (date <= end) {
  month <- month(date)
  day <- day(date)
  url <- paste0("fg_pitching_leaders_dashboard_2019/", sprintf('%02d', month), sprintf('%02d', day), ".htm")
  
  if (file.exists(url) == F) {
    date <- date + 1
    next
  }
  
  l1 <- url %>% 
    read_html() %>% 
    html_nodes('table') %>% 
    html_table(fill=TRUE)
  
  df <- l1[[13]]
  df <- df[-c(1,3),]
  
  columnNames <- as.list(df[1,])
  columnNames <- gsub("%", ".p", columnNames)
  columnNames <- gsub("/", "per", columnNames)
  colnames(df) <- columnNames
  
  df <- df[-1,] %>% 
    mutate(month = month,
           day = day)
  
  out[[i]] <- df
  
  date <- date + 1
  i <- i + 1
  
}

x <- map_dfr(out, as.list)
```
While this change in approach to building my data was initially motivated by computational speed considerations, it also has the benefit of adding relability to my process. If one of my web sources decided to redo their web design or data arrangement, I would've had to go back and modify each of my scraping functions. Now that I am instead saving all of the necessary data sets, it is no longer a problem if the web source decided to make such modifications. 
