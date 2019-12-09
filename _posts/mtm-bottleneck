---
layout: post
title: Making the Model Part 2 - Identifying Bottlenecks
tags: R profvis
---

As explained in my last post, my vision for compiling my training data was to create a bunch of functions that each scrape from the various data sources, combine these functions into one single function, and then loop through this larger function across the list of all the starting pitchers. However, after I had this set up and running, it eventually became clear to me that this for loop will take way too long to run and won't scale well when I discover new data sources.

The logical first question is: *what specific parts are causing things to run slowly*? To answer this question I turned to a useful package - [profvis](https://support.rstudio.com/hc/en-us/articles/218221837-Profiling-with-RStudio).

The profiler is a really useful tool for understanding how long R is taking to run the different parts of your code. It conveys this information through a flame graph or the data view.  Using the profvis function on my code helped to shed light on which specific parts were the slowest. It turned out that the rvest scraping functions (e.g. read_html()) were particularly slow, which was not very surprising.

This raises the next question: *how can I construct my training data in a way that minimizes the number of times these functions need to be used*? 

