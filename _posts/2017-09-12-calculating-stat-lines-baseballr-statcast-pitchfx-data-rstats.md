---
layout: post
title: Creating Stat Lines from Pitch-by-Pitch Data with baseballr 0.3.3
tags: [R, tidyverse, baseballr, baseball]
---

The latest release of the [`baseballr`](https://billpetti.github.io/baseballr/) package for `R` includes a number of enhancements and bug fixes.

In terms of new functions, `statline_from_statcast` allows users to take raw pitch-by-pitch data from Statcast/PITCHf/x and calculate aggregated, statline-like output. Examples include count data such as number of singles, doubles, etc., as well as rate metrics like Slugging and wOBA on swings or contact.

The function only has two arguments:

* `df`: a dataframe that includes pitch-by-pitch information. The function assumes the following columns are present: `events`, `description`, `game_date`, and `type`.
* `base`: base indicates what the denomincator should be for the rate stats that are calculated. The function defaults to "swings", but you can also choose to use "contact"

Here is an example using all data from the week of 2017-09-04. Here, we want to see a statline for all hitters based on swings:

```r
test <- scrape_statcast_savant_batter_all("2017-09-04", "2017-09-10")

statline_from_statcast(test)

year swings batted_balls  X1B X2B X3B  HR swing_and_miss swinging_strike_percent    ba
1 2017  13790        10663 1129 352  37 259           3127                   0.227 0.129

obp   slg   ops  woba
1 0.129 0.216 0.345 0.144
```
You can also combine the `statline_from_statcast` function with a `for loop` to create statlines for multiple players at once. Say you wanted to calculate stat lines based on contact for batters that saw at least 125 pitches over the past week (i.e. games played 2017-09-04 through 2017-09-10):

```r
test <- scrape_statcast_savant_batter_all("2017-09-04", "2017-09-10")

output <- data.frameI()

players_to_loop <- test %>%
  group_by(player_name) %>%
  count() %>%
  arrange(desc(n)) %>%
  filter(n >= 125) %>%
  ungroup()

for (i in players_to_loop$player_name) {
  reduced_test <- test %>%
    filter(player_name == i)
  x <- statline_from_statcast(reduced_test, base = "contact")
  x$player <- i
  x <- x %>%
    select(player, everything())
  output <- rbind(output, x) %>%
    arrange(desc(woba))
}

print(output, n = 40, width = Inf)

# A tibble: 21 x 12
              player  year batted_balls   X1B   X2B   X3B    HR    ba   obp   slg   ops  woba
               <chr> <chr>        <dbl> <int> <dbl> <dbl> <dbl> <dbl> <dbl> <dbl> <dbl> <dbl>
 1         Wil Myers  2017           18     6     1     0     3 0.556 0.556 1.111 1.667 0.690
 2       Aaron Judge  2017           13     2     1     0     3 0.462 0.462 1.231 1.693 0.685
 3      Matt Chapman  2017           17     5     1     1     2 0.529 0.529 1.059 1.588 0.654
 4     Nolan Arenado  2017           23     8     2     0     2 0.522 0.522 0.870 1.392 0.584
 5     Brandon Nimmo  2017           19     6     1     0     2 0.474 0.474 0.842 1.316 0.550
 6  Charlie Blackmon  2017           21     4     3     0     2 0.429 0.429 0.857 1.286 0.531
 7  Francisco Lindor  2017           27     4     2     1     3 0.370 0.370 0.852 1.222 0.498
 8     Jose Martinez  2017           21     6     1     0     2 0.429 0.429 0.762 1.191 0.497
 9      Rhys Hoskins  2017           14     2     1     0     2 0.357 0.357 0.857 1.214 0.495
10  Christian Yelich  2017           22     6     4     0     0 0.455 0.455 0.636 1.091 0.463
11   Freddie Freeman  2017           24     7     2     0     1 0.417 0.417 0.625 1.042 0.441
12     J.T. Realmuto  2017           24     8     1     1     0 0.417 0.417 0.542 0.959 0.408
13   Cesar Hernandez  2017           22     7     2     0     0 0.409 0.409 0.500 0.909 0.391
14       DJ LeMahieu  2017           25     6     3     0     0 0.360 0.360 0.480 0.840 0.358
15    Ender Inciarte  2017           30     8     0     1     1 0.333 0.333 0.500 0.833 0.351
16    Cody Bellinger  2017           17     2     3     0     0 0.294 0.294 0.471 0.765 0.320
17     Brett Gardner  2017           23     5     1     1     0 0.304 0.304 0.435 0.739 0.312
18      Byron Buxton  2017           17     2     0     1     1 0.235 0.235 0.529 0.764 0.311
19    Eugenio Suarez  2017           19     5     1     0     0 0.316 0.316 0.368 0.684 0.296
20 Andrew Benintendi  2017           21     4     2     0     0 0.286 0.286 0.381 0.667 0.284
21      Brian Dozier  2017           23     2     0     0     2 0.174 0.174 0.435 0.609 0.248

```

From here, you can cut the data in infinite ways. You could take all pitches that induced a swing by J.D. Martinez over the same time period and see how well he performed on swings by pitch type:

```r

jd_martinez <- test %>%
  filter(player_name == "J.D. Martinez")

jd_pitches <- jd_martinez %>%
  group_by(pitch_type) %>% 
  count() %>%
  arrange(desc(n)) %>%
  ungroup()

output <- data.frame()

for (i in jd_pitches$pitch_type) {
  reduced <- jd_martinez %>%
    filter(pitch_type == i)
  x <- statline_from_statcast(reduced)
  x$player <- "J.D. Martinez"
  x$pitch_type <- i
  x <- x %>%
    select(player, pitch_type, everything())
  output <- rbind(output, x) %>%
    arrange(desc(woba))
}

print(output, n = 40, width = Inf)

         player pitch_type year swings batted_balls X1B X2B X3B HR swing_and_miss
1 J.D. Martinez         FF 2017     19           12   0   1   0  4              7
2 J.D. Martinez         FT 2017     10            8   3   0   0  1              2
3 J.D. Martinez         SL 2017     12            6   0   0   0  2              6
4 J.D. Martinez         CU 2017      6            3   1   0   0  0              3
5 J.D. Martinez         CH 2017      8            3   0   0   0  0              5
  swinging_strike_percent    ba   obp   slg   ops  woba
1                   0.368 0.263 0.263 0.947 1.210 0.481
2                   0.200 0.400 0.400 0.700 1.100 0.461
3                   0.500 0.167 0.167 0.667 0.834 0.329
4                   0.500 0.167 0.167 0.167 0.334 0.146
5                   0.625 0.000 0.000 0.000 0.000 0.000
```
Now we can see that J.D. Martinez's monster week was driven largely by 4- and 2-seam fastballs and sliders. When swinging at curveballs and change ups, Martinex whiffed over 50% of the time and only generated one hit--a single--when putting bat to ball.




