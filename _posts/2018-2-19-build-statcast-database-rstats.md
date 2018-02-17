---
layout: post
title: How to Build a Statcast Database from BaseballSavant
tags: [R, statacast, baseballr]
---

I've seen a few questions recently regarding how one could build their own database of play-by-play data, most notably [Statcast data](http://m.mlb.com/glossary/statcast), by pulling data from the wonderful [baseballsavant](https://baseballsavant.mlb.com). 

My [`baseballr` package for R](http://billpetti.github.io/baseballr/) contains a number of functions for efficiently pulling data from baseballsavant, either by player or over time periods. The trick is the site rate limits how much data you can query at any one time--generally six days or 30,000 results.

If you want to use `baseballr` to obtain the data going back to 2008 (when PITCHF/x data started to be made available), that is a lot of individual queries. So the answer is to automate the process.

Here's how I build my database. I typically rebuild it once or twice per year, depdening on whether the team at MLBAM makes meaningful changes to the data. The entire process takes a few hours, but it is automated so you can set it and forget it.

First, load the following packages:

```r
require(readr)
require(dplyr)
require(xml2)
require(magrittr)
```
I loop over all regular season dates for which there was some play-by-play data to avoid annoying errors. I obtained these by querying the FanGraphs database that I have access to, but there are other ways you could gather them. To make life easier, I've exported the dates for years between 2008 through 2017 and posted it at GitHub for anyone that wants to use it.

Next, load the dates file:

```r
dates_reduced <- read_csv("https://raw.githubusercontent.com/BillPetti/baseball_research_notebook/master/dates_statcast_build.csv")
```

I then subset the dates by year. I decided to loop over each day, but break up the jobs by year. This made it easier for me to QA the results.

```r
x2008season <- dates_reduced %>%
  filter(substr(GameDate, 1, 4) == 2008)

x2009season <- dates_reduced %>%
  filter(substr(GameDate, 1, 4) == 2009)

x2010season <- dates_reduced %>%
  filter(substr(GameDate, 1, 4) == 2010)

x2011season <- dates_reduced %>%
  filter(substr(GameDate, 1, 4) == 2011)

x2012season <- dates_reduced %>%
  filter(substr(GameDate, 1, 4) == 2012)

x2013season <- dates_reduced %>%
  filter(substr(GameDate, 1, 4) == 2013)

x2014season <- dates_reduced %>%
  filter(substr(GameDate, 1, 4) == 2014)

x2015season <- dates_reduced %>%
  filter(substr(GameDate, 1, 4) == 2015)

x2016season <- dates_reduced %>%
  filter(substr(GameDate, 1, 4) == 2016)

x2017season <- dates_reduced %>%
  filter(substr(GameDate, 1, 4) == 2017)
  ```

Now, you can use one of the functions in `baseballr` to scrape all batters or pitchers based on the dates, but here's the raw function that use for this:

```r
scrape_statcast_savant_pitcher_date <- function(start_date, end_date) {
  
  # extract year
  year <- substr(start_date, 1,4)
  
  # Base URL.
  url <- paste0("https://baseballsavant.mlb.com/statcast_search/csv?all=true&hfPT=&hfAB=&hfBBT=&hfPR=&hfZ=&stadium=&hfBBL=&hfNewZones=&hfGT=R%7C&hfC=&hfSea=",year,"%7C&hfSit=&player_type=pitcher&hfOuts=&opponent=&pitcher_throws=&batter_stands=&hfSA=&game_date_gt=",start_date,"&game_date_lt=",end_date,"&team=&position=&hfRO=&home_road=&hfFlag=&metric_1=&hfInn=&min_pitches=0&min_results=0&group_by=name&sort_col=pitches&player_event_sort=h_launch_speed&sort_order=desc&min_abs=0&type=details&")
  
  payload <- utils::read.csv(url)
  
  if (length(payload$pitch_type) > 0) {
  
  # Clean up formatting.
  payload$game_date <- as.Date(payload$game_date, "%Y-%m-%d")
  payload$des <- as.character(payload$des)
  payload$game_pk <- as.character(payload$game_pk) %>% as.numeric()
  payload$on_1b <- as.character(payload$on_1b) %>% as.numeric()
  payload$on_2b <- as.character(payload$on_2b) %>% as.numeric()
  payload$on_3b <- as.character(payload$on_3b) %>% as.numeric()
  payload$release_pos_x <- as.character(payload$release_pos_x) %>% as.numeric()
  payload$release_pos_z <- as.character(payload$release_pos_z) %>% as.numeric()
  payload$release_pos_y <- as.character(payload$release_pos_y) %>% as.numeric()
  payload$pfx_x <- as.character(payload$pfx_x) %>% as.numeric()
  payload$pfx_z <- as.character(payload$pfx_z) %>% as.numeric()
  payload$hc_x <- as.character(payload$hc_x) %>% as.numeric()
  payload$hc_y <- as.character(payload$hc_y) %>% as.numeric()
  payload$woba_denom <- as.character(payload$woba_denom) %>% as.numeric()
  payload$woba_value <- as.character(payload$woba_value) %>% as.numeric()
  payload$babip_value <- as.character(payload$babip_value) %>% as.numeric()
  payload$iso_value <- as.character(payload$iso_value) %>% as.numeric()
  payload$plate_z <- as.character(payload$plate_z) %>% as.numeric()
  payload$plate_x <- as.character(payload$plate_x) %>% as.numeric()
  payload$sz_top <- as.character(payload$sz_top) %>% as.numeric()
  payload$sz_bot <- as.character(payload$sz_bot) %>% as.numeric()
  payload$hit_distance_sc <- as.character(payload$hit_distance_sc) %>% as.numeric()
  payload$launch_speed <- as.character(payload$launch_speed) %>% as.numeric()
  payload$launch_angle <- as.character(payload$launch_angle) %>% as.numeric()
  payload$effective_speed <- as.character(payload$effective_speed) %>% as.numeric()
  payload$release_speed <- as.character(payload$release_speed) %>% as.numeric()
  payload$zone <- as.character(payload$zone) %>% as.numeric()
  payload$release_spin_rate <- as.character(payload$release_spin_rate) %>% as.numeric()
  payload$release_extension <- as.character(payload$release_extension) %>% as.numeric()
  payload$barrel <- with(payload, ifelse(launch_angle <= 50 & launch_speed >= 98 & launch_speed * 1.5 - launch_angle >= 117 & launch_speed + launch_angle >= 124, 1, 0))
  payload$home_team <- as.character(payload$home_team)
  payload$away_team <- as.character(payload$away_team)
  
  return(payload)
  }
  
  else {
    vars <- names(payload)
    df <- lapply(vars, function(x) x <- NA)
    names(df) <- names(payload)
    payload_na <- bind_rows(df)
  
    return(payload_na)
    
    Sys.sleep(sample(x = runif(20, min = .01, max = 1), size = 1))
  }
}
```
The function builds the url for the csv download of the data, returns a payload based on the url, checks to see whether any data was returned, and if it was does a bunch of formatting and variable coding to the data.

I also include some code to ensure pauses inbetween each attempt to scrape a new date.

I would recommend testing the function on a small date range to start. Once you are sure it is working properly, here is how I then loop over each date for each year:

```r
x2008data <- x2008season %>%
  group_by(start_date) %>%
  do(scrape_statcast_savant_pitcher_date(.$start_date, .$end_date)) %>%
  ungroup() %>%
  select(-start_date)

(missing_2008 <- x2008data %>%
  filter(is.na(pitch_type)) %>%
  distinct(game_date) %>%
  select(game_date))

x2009data <- x2009season %>%
  group_by(start_date) %>%
  do(scrape_statcast_savant_pitcher_date(.$start_date, .$end_date)) %>%
  ungroup() %>%
  select(-start_date)

gc()

(missing_2009 <- x2009data %>%
  filter(is.na(pitch_type)) %>%
  distinct(game_date) %>%
  select(game_date))

x2010data <- x2010season %>%
  group_by(start_date) %>%
  do(scrape_statcast_savant_pitcher_date(.$start_date, .$end_date)) %>%
  ungroup() %>%
  select(-start_date)

gc()

(missing_2010 <- x2010data %>%
  filter(is.na(pitch_type)) %>%
  distinct(game_date) %>%
  select(game_date))

x2011data <- x2011season %>%
  group_by(start_date) %>%
  do(scrape_statcast_savant_pitcher_date(.$start_date, .$end_date)) %>%
  ungroup() %>%
  select(-start_date)

gc()

(missing_2011 <- x2011data %>%
  filter(is.na(pitch_type)) %>%
  distinct(game_date) %>%
  select(game_date))

x2012data <- x2012season %>%
  group_by(start_date) %>%
  do(scrape_statcast_savant_pitcher_date(.$start_date, .$end_date)) %>%
  ungroup() %>%
  select(-start_date)

gc()

(missing_2012 <- x2012data %>%
  filter(is.na(pitch_type)) %>%
  distinct(game_date) %>%
  select(game_date))

x2013data <- x2013season %>%
  group_by(start_date) %>%
  do(scrape_statcast_savant_pitcher_date(.$start_date, .$end_date)) %>%
  ungroup() %>%
  select(-start_date)

gc()

(missing_2013 <- x2013data %>%
  filter(is.na(pitch_type)) %>%
  distinct(game_date) %>%
  select(game_date))

x2014data <- x2014season %>%
  group_by(start_date) %>%
  do(scrape_statcast_savant_pitcher_date(.$start_date, .$end_date)) %>%
  ungroup() %>%
  select(-start_date)

gc()

(missing_2014 <- x2014data %>%
  filter(is.na(pitch_type)) %>%
  distinct(game_date) %>%
  select(game_date))

x2015data <- x2015season %>%
  group_by(start_date) %>%
  do(scrape_statcast_savant_pitcher_date(.$start_date, .$end_date)) %>%
  ungroup() %>%
  select(-start_date)

gc()

(missing_2015 <- x2015data %>%
  filter(is.na(pitch_type)) %>%
  distinct(game_date) %>%
  select(game_date))

x2016data <- x2016season %>%
  group_by(start_date) %>%
  do(scrape_statcast_savant_pitcher_date(.$start_date, .$end_date)) %>%
  ungroup() %>%
  select(-start_date)

gc()

(missing_2016 <- x2016data %>%
  filter(is.na(pitch_type)) %>%
  distinct(game_date) %>%
  select(game_date))

x2017data <- x2017season %>%
  group_by(start_date) %>%
  do(scrape_statcast_savant_pitcher_date(.$start_date, .$end_date)) %>%
  ungroup() %>%
  select(-start_date)

gc()

(missing_2017 <- x2017data %>%
  filter(is.na(pitch_type)) %>%
  distinct(game_date) %>%
  select(game_date))

statcast_bind <- rbind(x2008data, x2009data, x2010data, x2011data, x2012data, x2013data, x2014data, x2015data, x2016data, x2017data)

statcast_bind$game_date <- as.character(statcast_bind$game_date)

statcast_bind <- statcast_bind %>%
  arrange(game_date)

statcast_bind <- statcast_bind %>%
  filter(!is.na(game_date))
```

After each year finishes, you will see a print out that tells you whether there is any missing data for the dates the function attempted to pull from baseballsavant. That way you can go back re-run the query if you need it (i.e. if there is actually data avaliable). 

And that's it! I find it takes about 2.5-3 hours to obtain all of the data from 2008-2017, so plan accordingly. After that you can dump the data into your favorite database of choice.

Happy database building!