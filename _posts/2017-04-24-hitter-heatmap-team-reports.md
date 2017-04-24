---
layout: post
title: Hitter Heatmap Team Reports
tags: [R, research-notebook, baseball]
---

![alt text](https://github.com/BillPetti/BillPetti.github.io/blob/master/_posts/heatmap_example.png?raw=true "heatmap example")

I created a function for quickly creating reports for Major League teams that include heatmaps for hitters based on pitcher handedness and the type of pitch. The function isolates a team's active roster, produces heatmaps using `ggplot2` for each hitter, and then binds all the heatmaps together in a pdf.

Reports for all 30 teams can be found in a public Dropbox folder [here](https://www.dropbox.com/sh/ji6t49fgs6ipdxt/AAD4bkoDhG9HSgQcZD9RMW45a?dl=0). 

I'll be updating these daily, so always sort by the date modified to get the most up to date versions for each team. Day-to-day, much shouldn't change, but as the season progresses there will be injuries, call-ups, trades, etc., that will change the composition of each team's active roster. These can be a nice one-stop reference as teams head into a series against a new team.

The entire data pipeline is written in `R` and the data comes courtsey of the writer's database at [FanGraphs](https://fangraphs.com).


