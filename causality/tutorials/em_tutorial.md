---
title: Adjustment for Exposure Misclassification
---

## Overview

In epidemiology, it is not uncommon for an exposure to be measured with error. Reasons for the misclassification can include recall bias, flawed data collection, or imprecise measurement tools.  When an analysis unknowlingly uses a misclassified exposure (*Xstar*) instead of the true exposure (*X*), the estimated effect can be biased in either direction from the null. [Quantitative bias analysis (QBA)](/causality/bias_qba/) makes the systematic uncertainty explicit by encoding assumptions about misclassification in **bias parameters** and using them to obtain a bias-adjusted estimate.

Here we work through a probabilistic variant: specify a model for P(*X* \| *Xstar*, *Y*, *C*), use those parameters to predict *X* (or its probability) for each row, and propagate uncertainty with bootstrap resampling. Instead of scanning a table of scenarios, we embed the bias model in the analysis and examine how the adjusted estimate changes when the parameter inputs are correct or wrong.

We simulate data with a known causal effect, show the bias when *Xstar* is used in place of *X*, and implement two adjustment methods: regression weighting and stochastic imputation.

First, generate a dataset of 100,000 rows with the following binary variables:

* *X* = Exposure (1 = exposed, 0 = not exposed)
* *Y* = Outcome (1 = outcome, 0 = no outcome)
* *C* = Known Confounder (1 = present, 0 = absent)
* *Xstar* = Misclassified exposure (1 = exposed, 0 = not exposed)

```r
library(dplyr)

set.seed(1234)
n <- 100000

C <- rbinom(n, 1, .5)
X <- rbinom(n, 1, plogis(-.5 + .5 * C))
Y <- rbinom(n, 1, plogis(-.5 + log(2) * X + .5 * C))
Xstar <- ifelse(X == 1 & Y == 1, rbinom(n, 1, .75),
                (ifelse(X == 1 & Y == 0, rbinom(n, 1, .65),
                        (ifelse(X == 0 & Y == 1, rbinom(n, 1, .25), rbinom(n, 1, .35))))))

df <- data.frame(X, Xstar, Y, C)
rm(C, X, Y, Xstar)
```
This data reflects the following causal relationships:

![em_dag](/img/causal/em_dag.png)

From this dataset note that P(*Y*=1\|*X*=1, *C*=*c*, *U*=*u*) / P(*Y*=1\|*X*=0, *C*=*c*, *U*=*u*) should equal *expit*(log(2)).
Therefore, odds(*Y*=1\|*X*=1, *C*=*c*, *U*=*u*) / odds(*Y*=1\|*X*=0, *C*=*c*, *U*=*u*) = *OR<sub>YX</sub>* = *exp*(log(2)) = 2.

Compare the biased (exposure misclassified) model to the bias-free model.

```r
nobias_model <- glm(Y ~ X + C, family = binomial(link = "logit"), data = df)
exp(coef(nobias_model)[2])
c(exp(coef(nobias_model)[2] + summary(nobias_model)$coef[2, 2] * qnorm(.025)),
  exp(coef(nobias_model)[2] + summary(nobias_model)$coef[2, 2] * qnorm(.975)))
```
*OR<sub>YX</sub>* = 2.04 (1.99, 2.10)

This estimate corresponds to the odds ratio we would expect based off of the derivation of *Y*.

```r
biased_model <- glm(Y ~ Xstar + C, family = binomial(link = "logit"), data = df)
exp(coef(biased_model)[2])
c(exp(coef(biased_model)[2] + summary(biased_model)$coef[2, 2] * qnorm(.025)),
  exp(coef(biased_model)[2] + summary(biased_model)$coef[2, 2] * qnorm(.975)))
```
*OR<sub>YX</sub>* = 1.27 (1.24, 1.31)

The odds ratio falls from ~2 to ~1.3 when *Xstar* replaces *X* in the model, a concrete illustration of exposure misclassification bias. The sections below specify the assumptions needed to adjust for misclassification without observing *X*, obtain bias parameters, and apply two different adjustment methods. Note that we'll be assuming all base assumptions for causal identification (e.g., positivity) are already present.

## Assumptions for bias adjustment

The adjusted estimate depends on a **bias model** that describes how the true exposure *X* relates to the misclassified measure and other observed variables. Here we use a logistic model for the probability that *X* = 1:

P(*X* = 1 \| *Xstar*, *Y*, *C*) = expit(β₀ + β<sub>*Xstar*</sub> *Xstar* + β<sub>*Y*</sub> *Y* + β<sub>*C*</sub> *C*)

The intercept and coefficients are **bias parameters**. They are not identified from the selected sample alone; they must be supplied from external sources.

**Why include *Y*?** The model includes *Y* not because we assume *Y* causes *X*, but because misclassification may differ by outcome—as it does in this simulation, where the sensitivity and specificity of *Xstar* depend on *Y*. Including *Y* lets the bias model reflect differential misclassification. In other settings, external validation data may justify a simpler model without *Y*.

**Where parameters come from in practice.** Bias parameters are usually set from prior literature, an internal validation substudy that compares *Xstar* to a gold-standard measure of *X*, meta-analytic estimates, or structured expert judgment—not by regressing on the true *X*, which is unknown by definition in the main analysis. Ranges or probability distributions over parameters can be used to reflect uncertainty. The doubled-parameter example later shows how sensitive the adjusted estimate is to misspecification.

**Proof of concept in this simulation.** Because we generated *X*, we can fit `glm(X ~ Xstar + Y + C)` as an oracle exercise: it recovers the conditional associations in this dataset and gives us correct parameters for demonstration. The outcome analysis that follows is otherwise performed using *Xstar* in place of *X*.

Given bias parameters, we predict P(*X* \| *Xstar*, *Y*, *C*) for each observation and use those probabilities in either a **weighting** or **imputation** step to approximate using *X* in the outcome regression. Bootstrapping propagates sampling uncertainty through the procedure.

```r
x_model <- glm(X ~ Xstar + Y + C, family = binomial(link = "logit"), data = df)
summary(x_model)
```
These parameters can be interpreted as follows:

* Intercept (β₀): log\[odds(*X*=1 \| *Xstar*=0, *C*=0, *Y*=0)]
* *Xstar* coefficient (β<sub>*Xstar*</sub>): log\[odds(*X*=1 \| *Xstar*=1, *C*=0, *Y*=0)] − log\[odds(*X*=1 \| *Xstar*=0, *C*=0, *Y*=0)]
* *Y* coefficient (β<sub>*Y*</sub>): log\[odds(*X*=1 \| *Xstar*=0, *C*=0, *Y*=1)] − log\[odds(*X*=1 \| *Xstar*=0, *C*=0, *Y*=0)]
* *C* coefficient (β<sub>*C*</sub>): log\[odds(*X*=1 \| *Xstar*=0, *C*=1, *Y*=0)] − log\[odds(*X*=1 \| *Xstar*=0, *C*=0, *Y*=0)]

Equivalently, exponentiating a coefficient gives an odds ratio for *X*. For example, exp(β<sub>*Xstar*</sub>) = odds(*X*=1 \| *Xstar*=1, *C*=0, *Y*=0) / odds(*X*=1 \| *Xstar*=0, *C*=0, *Y*=0).

With the bias parameters in hand, we implement two adjustment approaches below. In both cases, the analysis is wrapped in a function for quick reiteration.

## 1. Weighting approach

The weighting approach marginalizes over the unobserved true exposure by duplicating each row into pseudo-observations with *X* = 1 and *X* = 0, weighted by their predicted probabilities.

The steps for the weighting approach are as follows:

1. Sample with replacement from the dataset to get the bootstrap sample.
2. Predict the probability of *X* by combining the bias parameters with the data for *Xstar*, *Y*, and *C* via the inverse logit transformation.
3. Duplicate the bootstrap dataset and merge these two copies.
4. In the combined data, assign variable *Xbar*, which equals 1 in the first data copy and equals 0 in the second data copy.
5. Create variable *x_weight*, which equals the probability of *X*=1 in the first copy and equals 1 minus the probability of *X*=1 in the second copy.
6. With the combined dataset, model the weighted logistic outcome regression \[P(*Y*=1)\| *Xbar*, C]. The weight used in this regression comes from *x_weight*.
7. Save the exponentiated *Xbar* coefficient, corresponding to the odds ratio effect estimate of *X* on *Y*.
8. Repeat the above steps with a new bootstrap sample.
9. With the resulting vector of odds ratio estimates, obtain the final estimate and confidence interval from the median and 2.5, 97.5 quantiles, respectively.

```r
adjust_em_wgt_loop <- function(
  coef_0, coef_xstar, coef_y, coef_c, nreps, plot = FALSE
) {
  est <- vector()
  for (i in 1:nreps) {
    bdf <- df[sample(seq_len(n), n, replace = TRUE), ]
    x_probability <- plogis(
      coef_0 + coef_xstar * bdf$Xstar + coef_y * bdf$Y + coef_c * bdf$C
    )
    combined <- dplyr::bind_rows(bdf, bdf)
    combined$Xbar <- rep(c(1, 0), each = n)
    combined$x_weight <- c(x_probability, 1 - x_probability)
    final_model <- glm(Y ~ Xbar + C, family = binomial(link = "logit"),
                       data = combined, weights = combined$x_weight)
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

## 2. Imputation approach

The steps for the imputation approach are as follows:

1. Sample with replacement from the dataset to get the bootstrap sample.
2. Predict the probability of *X* by combining the bias parameters with the data for *Xstar*, *Y*, and *C* via the inverse logit transformation.
3. Impute the value of the exposure, *Xpred*, across Bernoulli trials where the probability of each trial corresponds to the probability of *X* determined above.
4. With the bootstrap sample, model the logistic outcome regression \[P(*Y*=1)\| *Xpred*, *C*].
5. Save the exponentiated *Xpred* coefficient, corresponding to the odds ratio effect estimate of *X* on *Y*.
6. Repeat the above steps with a new bootstrap sample.
7. With the resulting vector of odds ratio estimates, obtain the final estimate and confidence interval from the median and 2.5, 97.5 quantiles, respectively.

```r
adjust_em_imp_loop <- function(
  coef_0, coef_xstar, coef_y, coef_c, nreps, plot = FALSE
) {
  est <- vector()
  for (i in 1:nreps) {
    bdf <- df[sample(seq_len(n), n, replace = TRUE), ]
    bdf$Xpred <- rbinom(
      n, 1, plogis(coef_0 + coef_xstar * bdf$Xstar +
                     coef_y * bdf$Y + coef_c * bdf$C)
    )
    final_model <- glm(Y ~ Xpred + C,
                       family = binomial(link = "logit"),
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

We can run the analysis using different values of the bias parameters.  When we use the known, correct values for the bias parameters that we obtained earlier we obtain *OR<sub>YX</sub>* = 2.05, representing the bias-adjusted effect estimate we expect based on the derivation of the data.

```r
# weighting
set.seed(1234)
correct_results <- adjust_em_wgt_loop(
  coef_0 =     coef(x_model)[1],
  coef_xstar = coef(x_model)[2],
  coef_y =     coef(x_model)[3],
  coef_c =     coef(x_model)[4],
  nreps = 10
)

correct_results$estimate # 2.05
correct_results$ci # 2.04, 2.06

# imputation
set.seed(1234)
correct_results <- adjust_em_imp_loop(
  coef_0 =     coef(x_model)[1],
  coef_xstar = coef(x_model)[2],
  coef_y =     coef(x_model)[3],
  coef_c =     coef(x_model)[4],
  nreps = 10
)

correct_results$estimate # 2.04
correct_results$ci # 2.01, 2.08
```
The output can also include a histogram showing the distribution of the OR<sub>YX</sub> estimates from each bootstrap sample. We can analyze this plot to see how well the odds ratios converge.

![em_demo_hist](/img/causal/em_demo_hist.png)

If instead we use bias parameters that are each double the correct value, we obtain OR<sub>YX</sub> = 2.85 (2.84, 2.88), an incorrect estimate of effect.

```r
set.seed(1234)
incorrect_results <- adjust_em_imp_loop(
  coef_0 =     coef(x_model)[1] * 2,
  coef_xstar = coef(x_model)[2] * 2,
  coef_y =     coef(x_model)[3] * 2,
  coef_c =     coef(x_model)[4] * 2,
  nreps = 10
)

incorrect_results$estimate # 2.85
incorrect_results$ci # 2.84, 2.88
```
