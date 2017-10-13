---
layout: post
title: Who has Hit the Most Home Runs the Fastest? 
tags: [R, tidyverse, dplyr, ggplot2, baseball, shiny]
---

I have nine nieces and nephews with another one on the way, so the topic of baby names has been floating around pretty consistently over the past few months. When people started throwing around potential names I wanted to see how the popularity of those names had trended over time.

Now, there are a number of tools for R for exploring trends in baby names in the United States. Hadley Wickham's [babynames R package](https://cran.r-project.org/package=babynames) contains the country-level data from the Social Security Administration (SSA) from 1880-2015. There is also [code for a  `shiny` application](https://ntguardian.wordpress.com/2016/08/22/ssa-baby-names-visualization-with-r-and-shiny/) for exploring the data from Wickham's package.

# Acquiring and Processing the Data

So, we will need to do a few things to get the data in the right format:

- Create a new variable for each row in each file that notes what year the data represents (since this is missing)
- Create names for each variable in each dataset
- Combine all of the datasets into a single dataset

I wrote the following function to handle the first two of these tasks:

```
babyfiles <- function(babyfile) {
  year <- str_extract(paste0(babyfile), "\\d{4}")
  df <- read_delim(file = babyfile, 
             delim = ",", 
             col_names = FALSE, 
             col_types = cols(
               X1 = col_character(),
               X2 = col_character(),
               X3 = col_integer()
             ))
  df$year <- year
  names(df) <- c("name", "sex", "count", "year")
  df
}
```
![alt text](https://github.com/BillPetti/BillPetti.github.io/blob/master/_posts/william_count.png?raw=true "william_count")
  
![alt text](https://github.com/BillPetti/BillPetti.github.io/blob/master/_posts/william_rank.png?raw=true "william_rank")