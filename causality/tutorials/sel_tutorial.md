---
title: Adjustment for Selection Bias
---

## Overview

Observational studies rarely capture every member of the population of interest. When selection into the study depends on both exposure and outcome (collider stratification on *S*) an analysis restricted to selected participants can distort the exposure–outcome association, even after adjusting for measured confounders. [Quantitative bias analysis (QBA)](/causality/bias_qba/) makes that systematic uncertainty explicit by encoding assumptions about selection in **bias parameters** and using them to obtain a bias-adjusted estimate.

Here we work through a probabilistic variant: specify a model for P(*S* \| *X*, *Y*), use those parameters to estimate each participant's probability of selection, and propagate uncertainty with bootstrap resampling. Instead of scanning a table of scenarios, we embed the bias model in the analysis and examine how the adjusted estimate changes when the parameter inputs are correct or distorted.

In this tutorial, we simulate data with a known causal effect, show the bias among selected participants, and adjust via inverse-probability weighting in the outcome regression.

First, generate a dataset of 100,000 rows with the following binary variables:

* *X* = Exposure (1 = exposed, 0 = not exposed)
* *Y* = Outcome (1 = outcome, 0 = no outcome)
* *C* = Known Confounder (1 = present, 0 = absent)
* *S* = Selection (1 = selected into the study, 0 = not selected into the study)

```r
set.seed(1234)
n <- 100000

c <- rbinom(n, 1, .5)
x  <- rbinom(n, 1, plogis(-.5 + .5 * c))
y  <- rbinom(n, 1, plogis(-.5 + log(2) * x + .5 * c))
s <- rbinom(n, 1, plogis(-.5 + 1.5 * x + 1.5 * y))

df <- data.frame(X = x, Y = y, C = c, S = s)
rm(c, x, y, s)
```
This data reflects the following causal relationship:

![sel_dag](/img/causal/sel_dag.png)

From this dataset note that P(*Y*=1\|*X*=1, *C*=*c*, *U*=*u*) / P(*Y*=1\|*X*=0, *C*=*c*, *U*=*u*) should equal *expit*(log(2)).
Therefore, odds(*Y*=1\|*X*=1, *C*=*c*, *U*=*u*) / odds(*Y*=1\|*X*=0, *C*=*c*, *U*=*u*) = *OR<sub>YX</sub>* = *exp*(log(2)) = 2

Compare the biased model to the bias-free model.

```r
nobias_model <- glm(Y ~ X + C,
                    family = binomial(link = "logit"),
                    data = df)
exp(coef(nobias_model)[2])
c(exp(coef(nobias_model)[2] + summary(nobias_model)$coef[2, 2] * qnorm(.025)),
  exp(coef(nobias_model)[2] + summary(nobias_model)$coef[2, 2] * qnorm(.975)))
```
*OR<sub>YX</sub>* = 2.04 (1.99, 2.09)

This is the value we would expect based off of the derivation of Y.

To represent selection bias, the data for analysis will include only those observations with S=1. We will sample with replacement among those with S=1 from the original dataset so that the sample size remains 100,000.

```r
biased_model <- glm(Y ~ X + C,
                    family = binomial(link = "logit"),
                    data = df[sample(seq_len(n), n, replace = TRUE, df$S), ])
exp(coef(biased_model)[2])
c(exp(coef(biased_model)[2] + summary(biased_model)$coef[2, 2] * qnorm(.025)),
  exp(coef(biased_model)[2] + summary(biased_model)$coef[2, 2] * qnorm(.975)))
```

*OR<sub>YX</sub>* = 1.32 (1.29, 1.36)

The odds ratio falls from ~2 to ~1.3 when the analysis is limited to *S* = 1, a concrete illustration of selection bias. The sections below specify the assumptions needed to adjust for selection when the full selection mechanism is unobserved, obtain bias parameters, and apply inverse-probability weighting. Note that we'll be assuming all base assumptions for causal identification (e.g., positivity) are already present.

## Assumptions for bias adjustment

The adjusted estimate depends on a **bias model** that describes how selection into the study relates to the variables we observe among participants. Here we use a logistic model for the probability that *S* = 1:

P(*S* = 1 \| *X*, *Y*) = expit(β₀ + β<sub>*X*</sub> *X* + β<sub>*Y*</sub> *Y*)

The intercept and coefficients are **bias parameters**. They are not identified from the selected sample alone; they must be supplied from external sources.

**Why include *Y*?** In the DAG above, both *X* and *Y* directly affect *S*—that is the selection mechanism we want to encode. In a real study you may not observe *S* for non-participants, but you still need assumptions about how exposure and outcome jointly determine who enters the sample. Specifying P(*S* \| *X*, *Y*) captures those assumptions; omitting *Y* when selection depends on the outcome would misspecify the mechanism.

**Where parameters come from in practice.** Bias parameters are usually set from prior literature, a validation or surrogate substudy, meta-analytic estimates, or structured expert judgment (not by regressing on the true *S* for the full source population, which is often unavailable). Ranges or probability distributions over parameters can be used to reflect uncertainty. The doubled-parameter example later shows how sensitive the adjusted estimate is to misspecification.

**Proof of concept in this simulation.** Because we generated *S* for everyone, we can fit `glm(S ~ X + Y)` as an oracle exercise: it recovers the conditional associations in this dataset and gives us correct parameters for demonstration. The outcome analysis that follows is otherwise performed as if we only had data on participants with *S* = 1.

Given bias parameters, we predict P(*S* \| *X*, *Y*) for each selected observation and weight the outcome regression by the inverse of that probability. Bootstrapping propagates sampling uncertainty through the procedure.

```r
s_model <- glm(S ~ X + Y, data = df, family = binomial(link = "logit"))
summary(s_model)
```
These parameters can be interpreted as follows:

* Intercept (β₀): log\[odds(*S*=1 \| *X*=0, *Y*=0)]
* *X* coefficient (β<sub>*X*</sub>): log\[odds(*S*=1 \| *X*=1, *Y*=0)] − log\[odds(*S*=1 \| *X*=0, *Y*=0)]
* *Y* coefficient (β<sub>*Y*</sub>): log\[odds(*S*=1 \| *X*=0, *Y*=1)] − log\[odds(*S*=1 \| *X*=0, *Y*=0)]

Equivalently, exponentiating a coefficient gives an odds ratio for *S*. For example, exp(β<sub>*X*</sub>) = odds(*S*=1 \| *X*=1, *Y*=0) / odds(*S*=1 \| *X*=0, *Y*=0).

With the bias parameters in hand, we implement inverse-probability weighting below. The analysis is wrapped in a function for quick reiteration.

## Bias adjustment

Inverse-probability weighting up-weights participants who were less likely to be selected given their *X* and *Y*, approximating the target population that would have been observed without selection distortion.

The steps to adjust for selection bias are as follows:

1. Sample with replacement from the dataset among rows with with *S*=1 to get a bootstrap sample.
2. Predict the probability of *S* by combining the bias parameters with the data for *X* and *Y* via the inverse logit transformation.
3. Using the sampled dataset (bdf), model the weighted logistic outcome regression \[P(*Y*=1)\| *X*, *C*]. The weight used in this regression is the inverse probability of selection, obtained in the previous step.
4. Save the exponentiated *X* coefficient, corresponding to the odds ratio effect estimate of *X* on *Y*.
5. Repeat the above steps with a new bootstrap sample.
6. With the resulting vector of odds ratio estimates, obtain the final estimate and confidence interval from the median and 2.5, 97.5 quantiles, respectively.

```r
adjust_sel_loop <- function(
  coef_0, coef_x, coef_y, nreps, plot = FALSE
) {
  est <- vector()
  for (i in 1:nreps){
    bdf <- df[sample(seq_len(n), n, replace = TRUE, df$S), ]
    prob_s <- plogis(coef_0 + coef_x * bdf$X + coef_y * bdf$Y)
    final_model <- glm(Y ~ X + C,
                       family = binomial(link = "logit"),
                       weights = (1 / prob_s),
                       data = bdf)
    est[i] <- exp(coef(final_model)[2])
  }
  out <- list(
    estimate = round(median(est), 2),
    ci = round(quantile(est, c(.025, .975)), 2)
  )
  if (plot) {
    out$hist <- hist(exp(est))
  }
  return(out)
}
```

## Evaluate

We can run the analysis using different values of the bias parameters.  When we use the known, correct values for the bias parameters that we obtained earlier we obtain *OR<sub>YX</sub>* = 2.05 (2.01, 2.07), representing the bias-free effect estimate we expect based on the derivation of the data.

```r
set.seed(1234)
correct_results <- adjust_sel_loop(
  coef_0 = coef(s_model)[1],
  coef_x = coef(s_model)[2],
  coef_y = coef(s_model)[3],
  nreps = 10
)

correct_results$estimate # 2.05
correct_results$ci # 2.01, 2.07
```
The output can also include a histogram showing the distribution of the *OR<sub>YX</sub>* estimates from each bootstrap sample. We can analyze this plot to see how well the odds ratios converge.

![sel_demo_hist](/img/causal/sel_demo_hist.png)

If instead we use bias parameters that are each double the correct value, we obtain *OR<sub>YX</sub>* = 3.92 (3.84, 3.96), an incorrect estimate of effect.

```r
set.seed(1234)
incorrect_results <- adjust_sel_loop(
  coef_0 = coef(s_model)[1] * 2,
  coef_x = coef(s_model)[2] * 2,
  coef_y = coef(s_model)[3] * 2,
  nreps = 10
)

incorrect_results$estimate # 3.92
incorrect_results$ci # 3.84, 3.96
```
