---
layout: post
title: Making the Model Part 1 - Web Scraping Considerations
tags: R Python rvest
---

This is the first post in a series called Making the Model, which documents my journey to building a data set and creating the best model to predict baseball daily fantasy sports (DFS) scores. With the projected performances from such a model, a user can set an optimal lineup in FanDuel or DraftKings and dominate the competition. However, before reaching this goal, there will be many obstacles along the way. This post describes the first obstacle - obtaining the data.

To bulid my data set, I plan on using data from a variety of sources. But what is the best way to get the data from all these sources? At first, I thought there were two options: (1) scraping directly from the website and (2) downloading all the data. However, both of these options present some key disadvantages. The first option is probably going to be too slow; in order to scrape from the website and not get blacklisted or disrupt their server I would, at the very least, need to add a time delay between each iteration. With lots of iterations, these small delays add up and lead to very slow results. The downside of the second option is the memory demand. My computer doesn't have the space to store all of the data, so I would instead have to rely on external data storage such as an Apache Spark cluster. Based on my understanding, this would cost money, so I also ruled out this option.

When discussing this predicament with another data scientist, I learned of a third option: downloading the website HTMLs and scraping from those. 

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
