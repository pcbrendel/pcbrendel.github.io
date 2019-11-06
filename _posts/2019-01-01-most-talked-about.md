---
layout: post
title: Who is the most talked about player in r/fantasybaseball?
tags: [R, wordcloud, RedditExtractoR]
---

In progress

```r
library(tidyverse)
library(tm)
library(qdap)
library(RedditExtractoR)
library(wordcloud)
library(wordcloud2)
```

```r
apr29_1 <- reddit_content("www.reddit.com/r/fantasybaseball/comments/bipdua/daily_anything_goes_april_29_2019")
apr29_2 <- reddit_content("www.reddit.com/r/fantasybaseball/comments/biw3vm/nightly_anything_goes_april_29_2019")
apr30_1 <- reddit_content("www.reddit.com/r/fantasybaseball/comments/bj3596/daily_anything_goes_april_30_2019")
#apr30_2 - NA
may1_1 <- reddit_content("www.reddit.com/r/fantasybaseball/comments/bjfwbd/daily_anything_goes_may_01_2019")
may1_2 <- reddit_content("www.reddit.com/r/fantasybaseball/comments/bjnv12/nightly_anything_goes_may_01_2019")
may2_1 <- reddit_content("www.reddit.com/r/fantasybaseball/comments/bjtp9r/daily_anything_goes_may_02_2019")
may2_2 <- reddit_content("www.reddit.com/r/fantasybaseball/comments/bk1hc2/nightly_anything_goes_may_02_2019")
may3_1 <- reddit_content("www.reddit.com/r/fantasybaseball/comments/bk78v7/daily_anything_goes_may_03_2019")
may3_2 <- reddit_content("www.reddit.com/r/fantasybaseball/comments/bkes4g/nightly_anything_goes_may_03_2019")
may4_1 <- reddit_content("www.reddit.com/r/fantasybaseball/comments/bkk3bq/daily_anything_goes_may_04_2019")
may4_2 <- reddit_content("www.reddit.com/r/fantasybaseball/comments/bkr0gq/nightly_anything_goes_may_04_2019")
may5_1 <- reddit_content("www.reddit.com/r/fantasybaseball/comments/bkwliu/daily_anything_goes_may_05_2019")
may5_2 <- reddit_content("www.reddit.com/r/fantasybaseball/comments/bl4em9/nightly_anything_goes_may_05_2019")


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

wordcloud(names, term_frequency[names], colors = c("red", "blue"), scale = c(2, .25))
final <- wordcloud2(wc_df, color = "random-light", backgroundColor = "black", shuffle = F)

png("final.png")
final
dev.off()
```

![wordcloud](https://github.com/pcbrendel/pcbrendel.github.io/blob/master/_posts/wordcloud.png?raw=true "wordcloud")

[The discussion on Reddit](https://www.reddit.com/r/fantasybaseball/comments/bld8l2/the_most_discussed_players_in_rfantasybaseball/)
