---
layout: post
title: How to Automatically Retry a Scrape Function
tags: [R, web scraping]
---

If you do any decent amout of web scraping you've probably run into this situation: You have scheduled job set up to collect data from a website on some set interval (say, daily), where the assumption is the website will have updated its data by a certain time.

I run into this during the baseball season, since I have several Cron jobs set up that automatically redeploy the various tools I've made public. Those tools rely on data being updated from the games the night before. In some cases, that data is ready by 0700 EST everyday, but sometimes it isn't. 

Specifically, the [Statcast Search](https://baseballsavant.mlb.com/statcast_search) from [BaseballSavant](https://baseballsavant.mlb.com) typically includes data from the night before by 0700 EST. But, every once in a while the data isn't updated at the time. Sometimes it's updated within an hour, sometimes a few hours. Rather than having to manually retry the scrape job and then redeploying the apps that relied on the updated data, I wanted an automated solution that would simply retry the scrape until the latest data had been acquired.

Here's how I handled it.

The approach and function are based on a [gist](https://gist.github.com/dsparks/61428941c521f31439b7483a957e4063) from David Sparks and [this function](https://github.com/ijlyttle/warrenr/blob/master/R/persistently.R) from Ian Lyttle.

First, I needed to include a line of code in the basic scrape function that would creat a variable that would indicate whether the updated data was acquired. Here's what that looks like:

```r
didItWork <- length(payload$game_date)

assign("didItWork", didItWork, envir = .GlobalEnv)
```

The first line of code creates an object, `didItWork`, that holds the length of the game_date column from the dataframe containing the scraped data from the night before (i.e. `payload`). If the newest data isn't available, `payload$game_date` comes back with a length of `0`. The second line of code then assigns this object to the Global Environment.

Next, I wrote a function that takes as it's main argument the scraping function (`.f`). You can also set the maximum number of retry attempts before stoppping (`max_attempts`) and how many seconds inbetween attempts the function should wait before trying again (`wait_seconds`). 

The function runs the scrape function and then checks to see whether `didItWork` is greater than `0` (indicating new data was obtained). If the new data was obtained, the function simmply returns the output of the scrape function. If the new data wasn't obtained, the function waits however many seconds the user chose, and then attempts to execute the scrape function again:

```r
retry_function <- function(.f, max_attempts = 5,
                           wait_seconds = 5) {
  
  force(max_attempts)
  force(wait_seconds)
  
  for (i in seq_len(max_attempts)) {
    output <- .f
    if (didItWork > 0) {
      return(output)
    }
    
    else {
      
      if (wait_seconds > 0) {
        message(paste0("Retrying at ", Sys.time() + wait_seconds))
        Sys.sleep(wait_seconds)
      }
    }
  }
  
  stop()
}
```

Here's an example of how I use it:

```r
retry_function(update_statcast_function(), 
        max_attempts = 10, wait_seconds = 1800)  
```
The `update_statcast_function()` will retry up to 10 times every 30 minutes until the data from the night before is obtained. That means if the data isn't available at 0700 EST the job will automatically keep trying until 1200 EST. 