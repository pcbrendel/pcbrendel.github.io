---
layout: post
title: Making the Model Part 1 - Web Scraping Considerations
tags: R Python rvest
---

This is the first post in a series called Making the Model, which documents my journey to building a data set and creating the best model to predict baseball daily fantasy sports (DFS) scores. With the projected performances from such a model, a user can set an optimal lineup in FanDuel or DraftKings and dominate the competition. However, before reaching this goal, there will be many obstacles along the way. This post describes the first obstacle - obtaining the data.

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
