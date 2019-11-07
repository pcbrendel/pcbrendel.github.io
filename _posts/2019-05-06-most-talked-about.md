---
layout: post
title: Who is the most talked about player in r/fantasybaseball?
tags: [R, wordcloud, RedditExtractoR]
---

While going through the "Nightly Anything Goes" thread in Reddit's r/fantasybaseball, I noticed one user's comment on the hivemind nature of the community and how every week there's a new player that people won't stop talking about. This got me thinking - who *is* the most talked about player in this community? This seemed to be a fun question worth exploring, while giving me some exposure to scraping from Reddit and working with text analyses.

I started off by exploring my different options for how to extract the data from Reddit. I came across a really cool package, [RedditExtractoR](https://cran.r-project.org/web/packages/RedditExtractoR/RedditExtractoR.pdf) that looked to be particularly useful for extracting the nested comments from Reddit.

Before I proceeded any farther, I also had to figure out the scope of this analysis. Would I be looking through every post throughout the history of this subreddit? What types of posts or comments would I be examining? Balancing these factors of making it meaningful but also not too time-consuming, I decided to analyze the comments from every "Daily Anything Goes" and "Nightly Anything Goes" threads of the current week (Week 5 of the season).  

Next, I'll start by going through the analysis, which, as always, begins with loading the necessary packages. Unfortunately, I never ended up using wordcloud2 package. Although it has the potential to produce more advanced word clouds, it is still rather buggy.

```r
library(tidyverse)
library(tm)
library(qdap)
library(RedditExtractoR)
library(wordcloud)
library(wordcloud2)
```

I used the 'reddit_content' function from RedditExtractoR to scrape the r/fantasybaseball comments. Sadly, each URL contains a random string of characters, so I was unable to apply this function through a loop. (describe the string replace)

```r
apr29_1 <- reddit_content("www.reddit.com/r/fantasybaseball/comments/bipdua/daily_anything_goes_april_29_2019")
# continued for rest of dates


df <- bind_rows(apr29_1, apr29_2, apr30_1, may1_1, may1_2, may2_1, may2_1, may2_2, may3_1, may3_2, may4_1, 
                may4_2, may5_1, may5_2) %>% 
  select(doc_id = id, text = comment, user) %>% 
  mutate(text = str_replace_all(text, "[^[:graph:]]", " "))
```

```r
source <- DataframeSource(df)
corpus <- VCorpus(source)

clean_corpus <- function(corpus){
  corpus <- tm_map(corpus, stripWhitespace)
  corpus <- tm_map(corpus, removePunctuation)
  corpus <- tm_map(corpus, content_transformer(tolower))
  corpus <- tm_map(corpus, removeWords, stopwords("en"))
  return(corpus)
}

clean_corpus <- clean_corpus(corpus)

tdm <- TermDocumentMatrix(clean_corpus)
comment_matrix <- as.matrix(tdm)

term_frequency <- rowSums(comment_matrix)
term_frequency <- sort(term_frequency, decreasing = T)

terms_vec <- as.vector(names(term_frequency))
wc_df <- data.frame(word = terms_vec, freq = term_frequency) %>%
  filter(freq > 50) %>% 
  filter(word %in% c("smith", "chavis", "paddack", "senzel", "lowe", "winker", "polanco", "robles",
                     "snell", "voit", "franmil", "yandy", "santana", "puig", "caleb", "glasnow",
                     "soroka", "nola", "trout", "joram", "votto", "harper", "kieboom", "shaw",
                     "vlad", "turner", "alonso", "marte", "segura", "boyd", "domingo", "weaver",
                     "degrom", "dozier"))

names <- c("smith", "chavis", "paddack", "senzel", "lowe", "winker", "polanco", "robles",
           "snell", "voit", "franmil", "yandy", "santana", "puig", "caleb", "glasnow",
           "soroka", "nola", "trout", "joram", "votto", "harper", "kieboom", "shaw",
           "vlad", "turner", "alonso", "marte", "segura", "boyd", "domingo", "weaver",
           "degrom", "dozier")

```
Finally, the word cloud is created.

```r
wordcloud(names, term_frequency[names], colors = c("red", "blue"), scale = c(2, .25))
``` 

![wordcloud](https://github.com/pcbrendel/pcbrendel.github.io/blob/master/_posts/wordcloud.png?raw=true "wordcloud")

If you'd like to see the post and discussion on Reddit, check it out [here](https://www.reddit.com/r/fantasybaseball/comments/bld8l2/the_most_discussed_players_in_rfantasybaseball/).
