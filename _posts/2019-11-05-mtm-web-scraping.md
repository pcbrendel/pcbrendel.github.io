---
layout: post
title: Making the Model Part 1 - Web Scraping Considerations
tags: R Python rvest
---

This is the first post in a series called Making the Model, which documents my journey to building a data set and creating the best model to predict baseball daily fantasy sports (DFS) scores. With the projected performances from such a model, a user can set an optimal lineup in FanDuel or DraftKings and dominate the competition. However, before reaching this goal, there will be many obstacles along the way. This post describes the first obstacle - obtaining the data.

![datafunnel](https://github.com/pcbrendel/pcbrendel.github.io/blob/master/_posts/datafunnel.jpg?raw=true "datafunnel")

To bulid my data set, I plan on using data from a variety of sources. But what is the best way to get the data from all these sources? At first, I thought there were two options: (1) scraping directly from the website and (2) downloading all the data. However, both of these options present some key disadvantages. The first option is probably going to be too slow; in order to scrape from the website and not get blacklisted or disrupt their server I would, at the very least, need to add a time delay between each iteration. With lots of iterations, these small delays add up and lead to very slow results. The downside of the second option is the memory demand. My computer doesn't have the space to store all of the data, so I would instead have to rely on external data storage such as an Apache Spark cluster. Based on my understanding, this would cost money, so I also ruled out this option.

When discussing this predicament with another data scientist, I learned of a third option: downloading the website HTMLs and scraping from those. This would allow me to scrape from the websites without me worrying about their server or getting blacklisted. Storing all the HTMLs would also not be a significant burden on my computer's memory.

With this in mind, I realized that going through and manually saving each HTML corresponding to each day of the season would be impractical. I therefore created Python scripts to accomplish this task. Here is an example of a script for saving the HTML of the Fangraphs Pitching Leaderboard for each day of the season:

```python
import urllib3
from datetime import date, timedelta
from random import randint
from time import sleep

http = urllib3.PoolManager(cert_reqs='CERT_NONE')
start = date(2019, 3, 21)
end = date(2019, 9, 30)
delta = timedelta(days=1)

# Get Fangraphs Pitching Leaders Dashboard

while start <= end:
    url = "https://www.fangraphs.com/leaders.aspx?pos=all&stats=pit&lg=all&qual=0&type=8&season=2019&month=1000&season1=2019&ind=0&team=&rost=&age=&filter=&players=&startdate=2019-03-01&enddate=2019-" + f"{start.month:02d}" + "-" + f"{start.day:02d}" + "&page=1_1000"

    r = http.request('GET', url, preload_content=False)

    with open("/Users/paulbrendel/Desktop/Baseball/DFS Project/fangraphs_pitching_leaders_dashboard/"
              + f"{start.month:02d}" + f"{start.day:02d}" + ".htm", "wb") as out:
        while True:
            data = r.read(65536)
            if not data:
                break
            out.write(data)

    start += delta

r.release_conn()
```

Next, I needed to figure out a way to go through these HTMLs and scrape the necessary data. The "rvest" comes in handy here through its functions read_html, html_nodes, and html_table. In this example, I want to know a pitcher's season stats at a particular point in time so the function has parameters for the name and the date. It was also to include in the function checks in case the pitcher doesn't appear in the data (maybe he started the year on the IL) and checks in case the HTML doesn't exist. In those two cases, I want the function to output a blank dataframe instead of the function producing an error.

```r
pitcher_season_stats <- function(name, end_month, end_day) {
  
  url <- paste0("fangraphs_pitching_leaders_dashboard/", end_month, end_day, ".htm")
  
  if (file.exists(url)) {
    
    l1 <- read_html(url)
    l1 <- html_nodes(l1, 'table')
    
    fangraphs <- html_table(l1, fill = TRUE)[[13]]
    fangraphs <- fangraphs[-c(1,3),]
    
    # Extract column names
    columnNames <- as.list(fangraphs[1,])
    # Take care of symbols in column names
    columnNames <- gsub("%", ".p", columnNames)
    columnNames <- gsub("/", "per", columnNames)
    
    # Rename data frame and remove row with column names
    colnames(fangraphs) <- columnNames
    fangraphs <- data.frame(fangraphs[-1,]) %>% 
      filter(Name == name) %>%
      mutate_at(c('W', 'G', 'IP', 'Kper9', 'BBper9', 'HRper9', 'BABIP', 'ERA', 'FIP', 'xFIP'), as.numeric) %>%
      mutate(LOB.p = parse_number(LOB.p),
             GB.p = parse_number(GB.p),
             HRperFB = parse_number(HRperFB),
             month = end_month,
             day = end_day)
  
  # Create NA row if no data available
  if(nrow(fangraphs) == 0) {
    df <- data.frame(matrix(NA, nrow = 1, ncol = length(fangraphs)))
    names(df) <- names(fangraphs)
    fangraphs <- df}
  
  }
    
  # Create NA row if no URL available
  else if(!file.exists(url)) {
    fangraphs <- data.frame(matrix(NA, nrow = 1, ncol = 22))
    names(fangraphs) <- c('X.', 'Name', 'Team', 'W', 'L', 'SV', 'G', 'GS', 'IP', 'Kper9', 'BBper9', 'HRper9', 
                          'BABIP', 'LOB.p', 'GB.p', 'HRperFB', 'ERA', 'FIP', 'xFIP', 'WAR', 'month', 'day')
    }
  
  return(fangraphs)
}
```

So these two steps provide the foundation of how I built my model training data. After several of these functions were created, the next step was to incorporate these smaller functions into one giant function that takes as input the pitcher's name and outputs a dataframe where each row corresponds to a game started during the 2019 season and has data for the pitcher's stats/info before the game and the pitcher's final DFS points for that game. Lastly, I looped this function through a list of all pitchers with 10 more more Start Innings Pitched.

The final result is a dataframe with 48 predictor variables, 249 pitchers, and X rows (individual starts). 
