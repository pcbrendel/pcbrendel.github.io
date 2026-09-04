---
title: Causal Methods
---

## Design

*How the study population and the comparison are assembled, before any modeling begins.*

* Randomized designs (RCTs, cluster, stepped-wedge)
* Self-controlled designs (case-crossover, SCCS)
* Target trial emulation

## Identification

*The assumption that licenses reading a causal effect out of observational data.*

* Back-door Adjustment (conditional exchangeability)
* Difference-in-Differences
* Front-door Adjustment
* Instrumental Variables
* Interrupted Time Series
* Regression Discontinuity
* Synthetic Controls

## Estimation

*How the identified quantity is computed once those assumptions are in place.*

* Augmented Inverse Probability Weighting (AIPW)
* [Bayesian Structural Time Series](/causality/tutorials/causal_impact/)
* [G-computation](/causality/tutorials/gcomp/)
* Inverse Probability of Treatment Weighting (IPTW)
* Marginal Structural Models
* Matching
* Propensity Scores (the shared ingredient in matching, IPTW, and AIPW)
* Targeted Maximum Likelihood Estimate (TMLE)

## Sensitivity

*What happens to the conclusion when those assumptions fail.*

* E-value
* Negative Controls
* Positive Controls
* [Quantitative Bias Analysis](/causality/bias_qba/)
