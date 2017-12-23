---
title: "Using the Yelp API with R"
tags:
- Yelp
- R
- API
layout: post
---

This is a guide to using the Yelp API with R. The approach borrows liberally from advice [published by Jenny Bryan](https://github.com/jennybc/yelpr).

## Querying Yelp with `httr` and the Yelp API

First, load required packages:

```{r, echo=FALSE, message=FALSE, warning=FALSE}
require(tidyverse)
require(httr)
require(purrr)
require(DT)
```

Second, create a token for use with your API request. This requires that you have a `client_id` and a `client_secret`, both of which are provided when you [create an app through their developer area](https://www.yelp.com/developers/v3/manage_app):

```{r}
client_id <- "your client_id"
client_secret <- "your client_secret"

res <- POST("https://api.yelp.com/oauth2/token",
            body = list(grant_type = "client_credentials",
                        client_id = client_id,
                        client_secret = client_secret))

token <- content(res)$access_token
```

Next, you build the url for your query. In this example, we will query businesses with the term `sports` within 5 miles of Philadephia:

```{r}
yelp <- "https://api.yelp.com"
term <- "sports"
location <- "Philadephia, PA"
categories <- NULL
limit <- 50
radius <- 8000
url <- modify_url(yelp, path = c("v3", "businesses", "search"),
                  query = list(term = term, location = location, 
                               limit = limit,
                               radius = radius))
res <- GET(url, add_headers('Authorization' = paste("bearer", token)))

results <- content(res)
```

Now that we have the data we can create a function to parse and format the data:

```{r}
yelp_httr_parse <- function(x) {
  df <- data_frame(id = x$id, name = x$name, rating = x$rating, 
                   review_count = x$review_count,
                   latitude = x$coordinates$latitude,
                   longitude = x$coordinates$longitude, 
                   address1 = x$location$address1, city = x$location$city, 
                   state = x$location$state,
                   distance = x$distance)
  
  df
}

results_list <- lapply(results$businesses, FUN = yelp_httr_parse)
payload <- do.call("rbind", results_list)
arrange(payload, distance) %>%
  DT::datatable()
```

We can wrap the previous steps into a single function:

```{r}
yelp_business_search <- function(term = NULL, location = NULL, categories = NULL, 
                                 radius = NULL, limit = 50, client_id = NULL, 
                                 client_secret = NULL) {
  
  yelp <- "https://api.yelp.com"
  url <- modify_url(yelp, path = c("v3", "businesses", "search"),
               query = list(term = term, location = location, limit = limit, 
                            radius = radius, categories = categories))
  res <- GET(url, add_headers('Authorization' = paste("bearer", token)))
  results <- content(res)
  
  yelp_httr_parse <- function(x) {
  df <- data_frame(id = x$id, name = x$name, rating = x$rating, 
                   review_count = x$review_count,
                   latitude = x$coordinates$latitude,
                   longitude = x$coordinates$longitude, 
                   address1 = x$location$address1, city = x$location$city, 
                   state = x$location$state,
                   distance = x$distance)
  
  df
  }

  results_list <- lapply(results$businesses, FUN = yelp_httr_parse)
  payload <- do.call("rbind", results_list)
  payload <- payload %>%
    filter(grepl(term, name))
  
  payload
}
```
Now, we can use that function to find all Dunkin Donuts locations within 10 miles of Philadelphia, PA:

```{r}
results <- yelp_business_search(term = "Dunkin' Donuts", 
                                location = "Philadelphia, PA",
                                radius = 16000, 
                                client_id = client_id, 
                                client_secret = client_secret)

arrange(results, distance) %>%
  DT::datatable()
```

