---
layout: post
title: Public Interactive Fantasy Football Tool
tags: [R, shiny, football, fantsay football]
---

For the past few years I've released an interactive tool that can be used for fantasy football players. The general idea is the tool combines traditional data, such as projected fantasy points and average draft position, with my custom 
Consistency metric. This year I've updated the tool, building it in R Shiny. It can be found [here](https://billpetti.shinyapps.io/shiny_ffl_app/).

![alt text](https://github.com/BillPetti/BillPetti.github.io/blob/master/_posts/shiny_tool.png?raw=true "shiny tool snapshot")  

The tool allows you to filter by player position, number of games played in 2016, and total number projected fantasy points for the upcoming season. You can also download the underlying data in csv format using the download button.

The Consistency metric tries to quantify how evenly players distribute their total fantasy points on a game to game basis. So, two players could score the same number of points in a season, but one could perform similarly each week while the other is more of a boom or bust player.

![alt text](https://github.com/BillPetti/BillPetti.github.io/blob/master/_posts/qb_comparison_br.png?raw=true)
![alt text](https://github.com/BillPetti/BillPetti.github.io/blob/master/_posts/qb_comparison_br.png?raw=true)  

For example, we can compare Philip Rivers to Ben Roethlisberger. Both quarterbacks are projected to average 15.4 points per week, but Rivers has been far more consistent than Big Ben over the past four years. Rivers average Consistency is .43 standard deviations better than the average quarterback, while Roethlisberger has averaged .228 standard deviations worse than average.

Here's some more detail about the Consistency metrics that are included:

**2016 Consistency**: Lower score = more consistent on a game to game basis. Consistency was calculated using Gini coefficients across a player's 2016 games.  
**2016 Normalized Consistency**: 2016 Consistency scores were normalized by season and position using z-scores; so, how many standard deviations above or below the league average on a per-player basis. Again, lower scores = more consistent.  
**Normalized Consistency (2013-2016)**: Average seasonal Consistency from 2013-2016 was calcualted and then normalized by season and position using z-scores; so, how many standard deviations above or below the league average ona per-player basis. Again, lower scores = more consistent.  

Special thanks to [Dennis Erny at Armchair Analysis](http://www.armchairanalysis.com) for the game-by-game data and to FantasyPros.com for the projected points and draft data.
