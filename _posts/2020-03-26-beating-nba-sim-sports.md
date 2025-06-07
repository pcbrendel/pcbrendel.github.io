---
layout: post
title: Beating Fanduel's NBA Sim Sports
tags: R simulation
social-share: true
---

We're a couple weeks into life without professional sports and everyone is looking for ways to rekindle the flame that sports brought to our lives. For one particular group, the sports gamblers, the struggle is very real. Some are [turning to e-sports](https://www.draftkings.com/fantasy-league-of-legends). Some are [betting on the weather](https://betonweather.io/). Some are even [gambling on computers playing video games against each other](https://www.fanduel.com/awesemocontests).

While (currently) not much of a gambler, I can commiserate in the desire to fill the void left by sports. In exploring the various types of sports markets that are emerging during this time of need, I came across a competition offered by Fanduel called [NBA Sim Sports](https://www.fanduel.com/sim-sports-nba). The structure of the game is similar to that of normal NBA daily fantasy - you have a salary to select 9 NBA players to fill out your roster and their performance in real life corresponds to the amount of points they earn for your team. Of course there's a twist, since there is no NBA taking place in real life. The points each player earns is randomly selected based on a game they played earlier in the season.

My first reaction was about on par with getting an e-mail that I could enter for a chance to earn a $25 Starbucks gift card. But, I later realized that this game can be entirely optimized through a statistical simulation. Since there will be tens of thousands of other people in the tournament, it will ultimately still be a lottery, but at least I could give myself a better lottery ticket than my competitors.

![simulation](/img/posts/2020-03-26-simulation.jpg)

The first step in tackling this problem was to obtain data for all the game logs from the 2020 NBA season. For that, I turned to the [nbastatr](https://github.com/abresler/nbastatR) R package. This package comes with a *game_logs()* function that provides the game logs for all players for a given year. Using these game logs, I calculated how many fantasy points each NBA player scored in each game. I also downloaded the CSV from Fanduel that shows each of the eligible NBA players and their salaries for the day.

Next, I needed to figure out each potential combination of players I wanted to test out. I knew it wouldn't be worth exploring how a low-salary roster would perform, since they would be unlikely to win, so I restricted the analysis to rosters with a total salary of at least $55,000 (out of $60,000). To maximize the chances that a randomly sampled roster meets this criterion, I forced four of the nine players to have a salary over $6,000 ($60,000 / 9 roster spots means each spot can have an average salary of $6,667). The function below was used to sample each potential roster combination. Afterwards, I used the *compact()* function in R to remove any NULL values corresponding to those rosters not meeting my salary constraints.

```r
get_name_combos <- function(i) {

  set.seed(i)

  PG1 <- sample(filter(df3, Position=="PG", Salary>6000)$namePlayer, 1)
  PG2 <- sample(filter(df3, Position=="PG", namePlayer!=PG1)$namePlayer, 1)
  SG1 <- sample(filter(df3, Position=="SG", Salary>6000)$namePlayer, 1)
  SG2 <- sample(filter(df3, Position=="SG", namePlayer!=SG1)$namePlayer, 1)
  SF1 <- sample(filter(df3, Position=="SF", Salary>6000)$namePlayer, 1)
  SF2 <- sample(filter(df3, Position=="SF", namePlayer!=SF1)$namePlayer, 1)
  PF1 <- sample(filter(df3, Position=="PF", Salary>6000)$namePlayer, 1)
  PF2 <- sample(filter(df3, Position=="PF", namePlayer!=PF1)$namePlayer, 1)
  C <- sample(filter(df3, Position=="C")$namePlayer, 1)

  players <- c(PG1, PG2, SG1, SG2, SF1, SF2, PF1, PF2, C)

  sal_total <- sum(filter(df3, namePlayer %in% players)$Salary)

  # $60000 is the max salary, <$55000 is probably not optimal
  if(sal_total < 55000 | sal_total > 60000)
    {return(NULL)}

  return(players)

}
```

Now that I had a list of each roster combination, my goal was to see how each roster would perform over a large number of trials. I  first created a function that performed one simulation trial for a given roster. This process involved four steps: (1) filter the game logs data for each player, (2) create a vector from 1 to the number of games played for each player, (3) randomly sample a game for each player, and (4) sum the total number of points for all of the nine NBA players.

```r
get_one_score <- function(players) {

  # dataframes filtered by each player
  p1 <- df2[which(df2$namePlayer == players[1]),]
  p2 <- df2[which(df2$namePlayer == players[2]),]
  p3 <- df2[which(df2$namePlayer == players[3]),]
  p4 <- df2[which(df2$namePlayer == players[4]),]
  p5 <- df2[which(df2$namePlayer == players[5]),]
  p6 <- df2[which(df2$namePlayer == players[6]),]
  p7 <- df2[which(df2$namePlayer == players[7]),]
  p8 <- df2[which(df2$namePlayer == players[8]),]
  p9 <- df2[which(df2$namePlayer == players[9]),]

  # vector from 1 to number of games played
  r1 <- 1:max(p1$count)
  r2 <- 1:max(p2$count)
  r3 <- 1:max(p3$count)
  r4 <- 1:max(p4$count)
  r5 <- 1:max(p5$count)
  r6 <- 1:max(p6$count)
  r7 <- 1:max(p7$count)
  r8 <- 1:max(p8$count)
  r9 <- 1:max(p9$count)

  # sample the day's points for each player
  c1 <- sample(r1, 1)
  c2 <- sample(r2, 1)
  c3 <- sample(r3, 1)
  c4 <- sample(r4, 1)
  c5 <- sample(r5, 1)
  c6 <- sample(r6, 1)
  c7 <- sample(r7, 1)
  c8 <- sample(r8, 1)
  c9 <- sample(r9, 1)

  final_points <- p1[which(p1$count==c1),]$fd_points +
    p2[which(p2$count==c2),]$fd_points +
    p3[which(p3$count==c3),]$fd_points +
    p4[which(p4$count==c4),]$fd_points +
    p5[which(p5$count==c5),]$fd_points +
    p6[which(p6$count==c6),]$fd_points +
    p7[which(p7$count==c7),]$fd_points +
    p8[which(p8$count==c8),]$fd_points +
    p9[which(p9$count==c9),]$fd_points

  return(final_points)

}
```

Using the newly created *get_one_score()* function, I then created a new function that performs the above function for a given number of iterations and returns the corresponding roster and the mean, standard deviation, and max score.

```r
get_mean_score <- function(n, players) {

  x <- replicate(n, get_one_score(players))
  final <- list(roster=players, score_mean=mean(x), score_sd=sd(x), score_max=max(x))

  return(final)

}
```

Finally, I ran each of the potential roster combinations through the *get_mean_score()* function for 500 repetitions each. To maximize computational performance, I used the *map2()* function from the *purrr* package. I converted the final result to a dataframe for easier inspection of the results.

Then came the fun part. I was able to see which roster had the best average score across the 500 simulations. However, there's a reason I also included the standard deviation and maximum value of the simulations. Looking at the competition structure, with its thousands of competitors and significant prize money for only the top few, it doesn't pay to have a "safe but good" roster. I need a roster with high upside if my lottery ticket is going to beat out thousands of other rosters. So instead of choosing my roster exclusively on the mean score, I will want to ensure that the combination of players has sufficient upside to place highly in the tournament.

I don't think anybody knows how long this competition will be running for, but I plan on using this code to give myself the best chance possible for each tournament. I'll post an update if I ever place in the money. Taking a peak at my lineups each day may just be enough to distract myself from the fact that these aren't real (or *real* fantasy) NBA games being played.
