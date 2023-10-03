---
title: Adjustment for Uncontrolled Confounding
---

This tutorial will demonstrate how to adjust for an uncontrolled confounder. First, generate a dataset of 100,000 rows with the following binary variables:

* X = Exposure (1 = exposed, 0 = not exposed)
* Y = Outcome (1 = outcome, 0 = no outcome)
* C = Known Confounder (1 = present, 0 = absent)
* U = Unknown Confounder (1 = present, 0 = absent)

```r
set.seed(1234)
n <- 100000

C <- rbinom(n, 1, 0.5)
U <- rbinom(n, 1, 0.5)
X  <- rbinom(n, 1, plogis(-0.5 + 0.5 * C + 1.5 * U))
Y  <- rbinom(n, 1, plogis(-0.5 + log(2) * X + 0.5 * C + 1.5 * U))

df <- data.frame(X, Y, C, U)
rm(C, U, X, Y)
```
This data reflects the following causal relationship:

![UCdemo](/background_series/UCdemo.png)

From this dataset note that P(Y=1\|X=1, C=c, U=u) / P(Y=1\|X=0, C=c, U=u) should equal expit(log(2)).
Therefore, odds(Y=1\|X=1, C=c, U=u) / odds(Y=1\|X=0, C=c, U=u) = odds ratio (OR<sub>YX</sub>) = exp(log(2)) = 2.

Compare the biased (confounded) model to the bias-free model.

```r
nobias_model <- glm(Y ~ X + C + U,
                    family = binomial(link = "logit"),
                    data = df)
exp(summary(nobias_model)$coef[2, 1])
c(exp(summary(nobias_model)$coef[2, 1] +
        summary(nobias_model)$coef[2, 2] * qnorm(.025)),
  exp(summary(nobias_model)$coef[2, 1] +
        summary(nobias_model)$coef[2, 2] * qnorm(.975)))
```
OR<sub>YX</sub> = 2.02 (1.96, 2.09)

This is the odds ratio we would expect based off of the derivation of Y.

```r
bias_model <- glm(Y ~ X + C,
                  family = binomial(link = "logit"),
                  data = df)
exp(summary(bias_model)$coef[2, 1])
c(exp(summary(bias_model)$coef[2, 1] +
        summary(bias_model)$coef[2, 2] * qnorm(.025)),
  exp(summary(bias_model)$coef[2, 1] +
        summary(bias_model)$coef[2, 2] * qnorm(.975)))
```
OR<sub>YX</sub> = 3.11 (3.03, 3.20)

The odds ratio relating X to Y increases from ~2 to ~3 when the confounder U is not adjusted for in the model.  In a perfect world, an investigator would simply make sure to control for all confounding variables in the analysis.  However, it may not be feasible or possible to collect data on certain variables.  This bias analysis will allow for the adjustment of uncontrolled confounders (U) even when data for U is unavailable.  We will instead rely on assumptions of how the exposure, outcome, and known confounder(s) affect the unknown confounder (each assumption corresponding to a bias parameter).  Using these assumptions, we will create a model to predict the probability of U, which will then be incorporated as a weight in the outcome regression.  This regression weight provides the bias adjustment.

Normally, the values of the bias parameters are obtained externally from the literature or from an internal validation sub-study.  However, for the purposes of this proof of concept, we can obtain the exact values of the uncertainty parameters.  We will perform the final regression of Y on X as if we don't have data on U, but since we know the values of U we can model how U is affected by X, C, and Y to obtain accurate bias parameters. 

```r
u_model <- glm(U ~ X + C + Y,
               family = binomial(link = "logit"),
               data = df)
summary(u_model)
```
These parameters can be interpreted as follows:
* Intercept: log\[odds(U=1\|X=0, C=0, Y=0)]
* X coefficient: log\[odds(U=1\|X=1, C=0, Y=0)] / log\[odds(U=1\|X=0, C=0, Y=0)] i.e. the log odds ratio denoting the amount by which the log odds of U=1 changes for every 1 unit increase in X among the C=0, Y=0 subgroup.
* C coefficient: log\[odds(U=1\|X=0, C=1, Y=0)] / log\[odds(U=1\|X=0, C=0, Y=0)]
* Y coefficient: log\[odds(U=1\|X=0, C=0, Y=1)] / log\[odds(U=1\|X=0, C=0, Y=0)]

Now that values for the bias parameters have been obtained, use these values in the bias adjustment.

We'll build the analysis within a function for quick reiteration. Bootstrapping will be used in order to obtain a confidence interval for the OR<sub>YX</sub> estimate. The steps in this analysis are as follows:

1. Sample with replacement from the dataset.
2. Predict the probability of U by combining the bias parameters with the data for X, C, and Y in an inverse logit function. 
3. Duplicate the sampled dataset (bdf) and merge these two copies. The new dataset is named 'combined'.
4. Assign variable Ubar, which equals 1 in the first data copy and equals 0 in the second data copy.
5. Create variable u_weight, which equals the probability of U in the first copy and equals 1 minus the probability of U in the second copy.
6. Using the combined dataset, model the weighted logistic outcome regression \[P(Y=1)\| X, C, Ubar]. The weights used in this regression is in column u_weight, obtained in the previous step.

```r
adjust_uc_wgt_loop <- function(
  coef_0, coef_x, coef_c, coef_y, nreps, plot = FALSE
) {

  est <- vector()
  for (i in 1:nreps){
    # bootstrap sample
    bdf <- df[sample(seq_len(n), n, replace = TRUE), ]

    # the probability of U for each observation
    prob_u <- plogis(coef_0 + coef_x * bdf$X + coef_c * bdf$C + coef_y * bdf$Y)

    # duplicate data
    combined <- dplyr::bind_rows(bdf, bdf)
    # assign values for U
    combined$Ubar <- rep(c(1, 0), each = n)
    # create weight
    # when Ubar=1, u_weight=P(U=1); when Ubar=0, u_weight=P(U=0)
    combined$u_weight <- c(prob_u, 1 - prob_u)

    final_model <- glm(Y ~ X + C + Ubar, family = binomial(link = "logit"),
                       data = combined, weights = combined$u_weight)
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

We can run the analysis using different values of the bias parameters.  When we use the known, correct values for the bias parameters that we obtained earlier:

```r
set.seed(1234)
correct_results <- adjust_uc_wgt_loop(
  coef_0 = coef(u_model)[1],
  coef_x = coef(u_model)[2],
  coef_c = coef(u_model)[3],
  coef_y = coef(u_model)[4],
  nreps = 10
)

correct_results$estimate
correct_results$ci
```
we obtain OR<sub>YX</sub> = 2.03 (1.98, 2.07), representing the bias-adjusted effect estimate we expect. The output can also include a histogram showing the distribution of the OR<sub>YX</sub> estimates from each bootstrap sample:

![UChist](/background_series/UChist.png)

We can analyze this plot to see how well the odds ratios converge. If instead we use bias parameters that are each double the correct value:

```r
set.seed(1234)
incorrect_results <- adjust_uc_wgt_loop(
  coef_0 = coef(u_model)[1] * 2,
  coef_x = coef(u_model)[2] * 2,
  coef_c = coef(u_model)[3] * 2,
  coef_y = coef(u_model)[4] * 2,
  nreps = 10
)

incorrect_results$estimate
incorrect_results$ci
```
we obtain OR<sub>YX</sub> = 0.81 (0.79, 0.82), an incorrect estimate of effect.

<a href="https://github.com/pcbrendel/bias_analysis/blob/master/uc_tutorial.R" target="_blank">The full code for this analysis is available here</a>

