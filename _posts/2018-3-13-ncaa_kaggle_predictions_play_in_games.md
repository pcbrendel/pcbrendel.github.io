---
layout: post
title: Prediction Fun with the 2018 NCAA Men's Tournament
tags: [R, NCAA, basketball, March Madness]
---

For the first time, I decided to submit predictions for the annual [Kaggle March Madness prediction contest](https://www.kaggle.com/c/mens-machine-learning-competition-2018). Since I have the predictions at hand I thought I would post them as each round progresses with any comments about what it's seeing.

The model I used is pretty simple by some standards. It relies on adjusted measures of team performance--both from [Ken Pomeroy](https://kenpom.com) as well as my own generated from a hiearchical model. The model was trained on games (regular season and tournaments) between 2003 and 2018 (without 2018 tournament games, of course). Data gathering was made infinitely easier thanks to [Samuel Firke](https://github.com/sfirke/predicting-march-madness).

In terms of the play-in games, here's what the model thinks:

| Team 1 | Team 2 | Predicted Winner (%, odds) |
|-----------|------------|--------------------------------------|
| St. Bonaventure (11) |  UCLA (11) | UCLA (60%, 1.5:1) |
| LIU (16) | Radford (16) | Radford (73%, 2.7:1) |
| Syracuse (11) | Arizona State (11) | Arizona St. (52%, 1.1:1)|
| North Carolina Central (16) | Texas Southern (16) | Texas Southern (68%, 2.1:1) |

The surest game here according to the model is Radford-UCLA, with Radford a 2.7 to 1 favorite to advance. Texas Southern is roughly 2 to 1 to been NC Central. UCLA is the favorite over St. Bonaventure, but not by much. And Syracuse-Arizona State is essentially a toss-ups.

Once the tournment fully kicks off on Thursday I'll post a link to my full slate of predictions. These will be straight probabilities from the model.

