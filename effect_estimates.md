---
title: Quantifying Causality
subtitle: by Paul Brendel
---

A causal effect estimate represents the difference or ratio between an outcome under two different exposure/treatment scenarios.
In a perfect world, a doctor could give a person Drug A, observe the response, turn back time, give that person Drug B,
observe the response, then compare the respone between the two drugs. This difference in response would represent a causal
estimate. Unfortunately, the practice of time travel, to my best knowledge, is currently impossible. The reason that there's a 
causal interpretation here is that we know that the only difference between the two scenarios was the drug - every other factor 
(person, place, time) was identical. Since we can't time travel, the best we can do to quantify causality is essentially to 
observe the average outcome in a group taking Drug A, compare it to the average outcome in a different group taking Drug B, and 
make sure that these two groups match each other as closely as possible.   

In other words, as described by the counterfactual framework of [Neyman and Rubin](https://en.wikipedia.org/wiki/Rubin_causal_model), 
the individual effect of an exposure occurs when the value of an outcome under one exposure (Y<sub>a=0</sub>) differs from 
the value the outcome would have under a different exposure (Y<sub>a=1</sub>) and with all other factors identical in both 
scenarios besides the exposure.  Since the conditions for both effects must be identical, only one of these two effects is 
observable, the other being hypothetical or counterfactual.  A population effect occurs when the proportion of subjects, all 
with the same exposure, who experience an outcome (P[Y<sub>a=1</sub>=1]) differs from the proportion of subjects, all with a 
different exposure, who experience that outcome (P[Y<sub>a=0</sub>=1]) and with all other factors identical in both scenarios 
besides the exposure.

Estimates of the effect of an exposure on an outcome are comprised of the true effect, random error, and systematic error. 
Random error can be thought of as the residual variability of an effect measure that occurs because of a lack of sufficient 
knowledge to perfectly predict events. In epidemiological studies, a major contributor of random error is sampling variability, 
error that results from the inability to include everyone from the target population (or a broader conceptual population of 
everyone with the biological experience) who could have been included in the study.  Random error in epidemiological studies 
can be modified by changing the study size, efficiently apportioning subjects into study groups, and efficiently stratifying 
the data into covariate subcategories. The random error of an effect estimate is usually quantified by a standard error and 
confidence interval.

Systematic error, also known as bias, includes all the other (nonrandom) forces that harm the internal validity of a study. The
next posts describe these different types of bias and the practice of quantifying systematic error, known as bias analysis.