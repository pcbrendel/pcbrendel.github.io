---
layout: post
title: Beating Fanduel's NBA Sim Sports
tags: R datapasta ggplot2
social-share: true
---

We're about a couple weeks into life without sports and everyone is looking for ways to rekindle the joy that sports brought to our lives. For one particular group, the degenerate sports gamblers, the struggle is very real. Some are [turning to e-sports](https://www.draftkings.com/fantasy-league-of-legends). Some are [betting on the weather](https://betonweather.io/). Some are even [gambling on computers playing video games against each other](https://www.fanduel.com/awesemocontests).

While (currently) not much of a gambler, I can commiserate in the desire to fill the void left by sports. In exploring the various types of sports markets that are emerging during this time of need, I came across a competition offered by Fanduel called [NBA Sim Sports](https://www.fanduel.com/sim-sports-nba). The structure of the game is similar to that of normal NBA daily fantasy - you have a salary to select 9 NBA players to fill out your roster and their performance in real life corresponds to the amount of points they earn for your team. Of course there's a twist, since there is no NBA taking place in real life. Instead, the points each player earns is randomly selected based on a random game they played earlier in the season.

My first reaction was about on par with getting an e-mail that I could enter for a chance to earn a $25 Starbucks gift card. But, I later realized that this game can be entirely optimized through a statistical simulation. Since there will be tens of thousands of other people in the tournament, it will ultimately still be a lottery, but at least I could give myself a better lottery ticket than my competitors.

The first step in tackling this problem was to obtain data for all the game logs from the 2020 NBA season. For that, I turned to the [nbastatr](https://github.com/abresler/nbastatR) R package. This package comes with a *game_logs()* function that gives me exactly what I'm looking for. Using the game logs, I calculate how many fantasy points each NBA player scored in each game. I also needed to download the CSV from Fanduel that shows each of the eligible NBA players and their salaries for the day.

