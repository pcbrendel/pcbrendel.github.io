---
layout: post
title: Acquiring Baseball Stats from the NCAA with R
tags: [R, web-scraping, baseball, baseballr, NCAA]
---

In the latest release of my [baseballr](https://billpetti.github.io/baseballr/) package I've included a function that makes it easy for a user to pull data from the [NCAA's website](http://stats.ncaa.org) for baseball teams across the three major divisions (I, II, III).

The function, ncaa_scrape, requires the user to pass the function three parameters:  

`school_id`: Numerical code used by the NCAA for each school
`year`: A four-digit year
`type`: Whether to pull data for batters or pitchers  

For the latter two, the inputs are easy. The issue for most will be knowing what the `school_id `is that the NCAA website uses for the school they are interested in. To help, I decided to include a massive lookup table in the package so a user could easily identify the necessary school_id.

I thought it would be helpful to walk through how I built that file and then show how to use the ncaa_scrape function to start acquiring actual statistics.

You can read the rest at [here](http://www.hardballtimes.com/research-notebook-acquiring-baseball-stats-from-the-ncaa-with-r/).