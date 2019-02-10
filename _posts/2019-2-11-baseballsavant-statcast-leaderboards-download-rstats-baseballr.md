---
layout: post
title: Directly Downloading Statcast Leaderboards with baseballr
tags: [R, baseballr, statcast, scraping]
---

[BaseballSavant](https://baseballsavant.mlb.com) recently made their series of [leaderboards](https://baseballsavant.mlb.com/statcast_leaderboard) available through csv downloads. The [baseballr](https://billpetti.github.io/baseballr/) package now includes a function that allows users to directly read these leaderboad csv's into `R`.

![directional outs above average leaderboard screenshot](https://github.com/BillPetti/BillPetti.github.io/blob/master/_posts/statcast_leaderboard?raw=true)

The `scrape_statcast_leaderboards()` function can be used to access all of the leaderboards available as csv downloads. The function isn't doing anything too sophisticated; it simply builds the appropriate url for the csv download based on a series of parameters and then reads the csv into `R`.

Users specificy which leaderboard they want to download using the `leaderboard` argument. The following are currently available:

- `exit_velocity_barrels`
- `expected_statistics`
- `pitch_arsenal`
- `outs_above_average`
- `directional_oaa`
- `catch_probability`
- `pop_time`
- `sprint_speed`
- `running_splits_90_ft`

Each leaderboard has different parameters that can be specific to alter the content of the downloads, but not all parameters work for every leaderboard. (I would check the leaderboard interface on BaseballSavant directly if you are not sure which ones to use.)

Here is an example of the `expected_statistics` leaderboard for pitchers who faced at least 250 batters in 2018:

```r
require(baseballr)
require(dplyr)
> payload <- scrape_savant_leaderboards(leaderboard = "expected_statistics", 
+                            year = 2018, 
+                            player_type = "pitcher", 
+                            min_pa = 250)

> payload %>%
+   arrange(est_woba) %>% 
+   head()
# A tibble: 6 x 15
  last_name first_name player_id  year    pa   bip    ba est_ba est_ba_minus_ba…   slg est_slg est_slg_minus_s…  woba
  <chr>     <chr>          <int> <int> <int> <int> <dbl>  <dbl>            <dbl> <dbl>   <dbl>            <dbl> <dbl>
1 Diaz      Edwin         621242  2018   280   133 0.16   0.157            0.003 0.241   0.235            0.006 0.214
2 Hader     Josh          623352  2018   306   132 0.132  0.149           -0.017 0.265   0.269           -0.004 0.219
3 Treinen   Blake         595014  2018   315   192 0.158  0.198           -0.04  0.199   0.266           -0.067 0.187
4 Ottavino  Adam          493603  2018   309   154 0.158  0.15             0.008 0.238   0.235            0.003 0.231
5 Sale      Chris         519242  2018   617   332 0.181  0.168            0.013 0.288   0.284            0.004 0.237
6 Verlander Justin        434378  2018   833   498 0.2    0.184            0.016 0.36    0.307            0.053 0.26 
# ... with 2 more variables: est_woba <dbl>, est_woba_minus_woba_diff <dbl>
```
You can also look at pop times for catchers with a minimum of 20 throws to second base:

```r
> payload <- scrape_savant_leaderboards(leaderboard = "pop_time", 
+                                       year = 2018,
+                                       min2b = 20)
> payload %>%
+   arrange(pop_2b_sba) %>% 
+   head()
# A tibble: 6 x 14
  catcher player_id team_id   age maxeff_arm_2b_3… exchange_2b_3b_… pop_2b_sba_count pop_2b_sba pop_2b_cs pop_2b_sb
  <chr>       <int>   <int> <int>            <dbl>            <dbl>            <int>      <dbl>     <dbl>     <dbl>
1 J.T. R…    592663     146    27             87.8             0.69               23       1.9       1.88      1.9 
2 Yan Go…    543228     114    31             81.2             0.66               36       1.93      1.96      1.92
3 Jorge …    595751     143    25             90.8             0.73               46       1.94      1.9       1.96
4 Austin…    595978     135    26             83.1             0.7                24       1.94      1.92      1.95
5 Manny …    444489     158    31             83.9             0.67               28       1.94      1.93      1.95
6 Willso…    575929     112    26             86.2             0.74               30       1.96      1.96      1.96
# ... with 4 more variables: pop_3b_sba_count <int>, pop_3b_sba <chr>, pop_3b_cs <chr>, pop_3b_sb <chr>
```
New Phillie J.T. Realmuto had the fastest average pop time on stolen base attempts to second base at 1.90 seconds He was two one hundreths of a second faster when he caught a runner (1.88 vs. 1.90).  As good as Jorge Alfaro is as a thrower, he trailed Realmuto by about four one hundreths on average, and Realmuto appeared to be more consistent with his pop times given the smalle difference between caught stealing and succcess steal times. 

The one leaderboard not yet available through a csv download are the series of positional leaderboards. If and when they become available I will add them to the function. 

If you run into any issues, please post a reproduceable example [here](https://github.com/BillPetti/baseballr/issues).
