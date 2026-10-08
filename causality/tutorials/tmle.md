---
title: Targeted Maximum Likelihood Estimation (TMLE)
---

TMLE is a powerful estimation method for causal inference. The reasons when or when not to choose TMLE versus other approaches could constitute its own blog post. But at a high level, TMLE may be the best choice under the following conditions:

* You don't trust parametric models to capture the true relationships between confounders, exposure, and outcome.
* You have the sample size and expertise to leverage machine learning wherein the data decides the form of the model.
* You want double robustness.
* You have positivity problems or extreme propensity scores.

This post will walk through how to 1) implement the method quickly with the `tmle` function, 2) produce the full code step-by-step, 3) understand the intution behind the "targeting" concepts, 4) demonstrate the doubly robust benefits.

We'll use the `df_uc_source` dataframe from `multibias`, which has the following binary columns:

* X = exposure
* Y = outcome
* C1 = confounder
* C2 = confounder
* C3 = confounder
* U = confounder

The dataframe was simulated such that the effect of X on Y, adjusted for all four confounders has a conditional odds ratio of approximately 2.

```{r setup, include=FALSE}
library(tidyverse)
library(multibias)
library(tmle)
```

```{r}
df <- df_uc_source |>
  mutate(
    Y = Y_bi,
    X = X_bi
  ) |>
  select(-X_bi, -Y_bi, -X_cont, -Y_cont)

head(df)
```

## With TMLE function

To start, we will use the `tmle()` function from the `tmle` package to arrive at the Average Treatment Effect (ATE; Risk Difference) and Odds Ratio (OR) of the X-Y effect in the `df_uc_source` dataframe.

Note that TMLE can be applied for other estimands as well, such as the Average Treatment Effect in the Treated (ATT). Different weights are used, but the same targeting philosophy applies.

```{r}
tmle_result <- tmle(
  Y = df$Y,
  A = df$X,
  W = df |> select(C1, C2, C3, U),
  family = "binomial",
  Q.SL.library = c("SL.glm", "SL.glmnet"),
  g.SL.library = c("SL.glm", "SL.glmnet")
)

tmle_result
sqrt(tmle_result$estimates$ATE$var.psi) # std error of ATE estimate

# ATE = 0.102, 95% CI = (0.097, 0.108), SE = 0.0028
# OR = 1.95, 95% CI = (1.89, 2.02)
```

Key parameters used in the `tmle()` function here:
* Y: outcome variable
* A: exposure variable
* W: covariates
* family: outcome distribution
* Q.SL.library: SuperLearner library for outcome model
* g.SL.library: SuperLearner library for propensity model

Some other useful parameters not used above:
* Q: an nx2 matrix of predicted outcome probabilities for each observation under each treatment level (column order is A=0, A=1); alternative to using Q.SL.library
* Z: intermediate covariate; for controlled direct effect estimation
* Delta: indicator of missing outcome or treatment

Note that the odds ratio produced by `tmle()` is the **marginal** odds ratio (standardized over the distributions of each of the confounders), which is *slightly* different than the "ground truth" **conditional** odds ratio used in the underlying data simulation.

What is this Super Learner mentioned in the outcome and propensity model? Super Learner is an ensemble method that fits a library of candidate algorithms you specify, such as GLMs, random forests, LASSO, and splines, and uses cross-validation to find the weighted combination of their predictions with the lowest prediction error. Theory guarantees it will perform asymptotically as well as the best possible weighted combination of the candidates, so you don't have to guess in advance which algorithm will work best. To prevent an extremely long run time, we just use `glm` and `glmnet` as the two specified algorithms.

## Step by Step

Now we'll pop open the hood and see how to arrive at these results without the aid of a tmle package. We will use the same data as above to see if we can replicate the results from the `tmle()` function output.

Despite the incredible flexibiilty and efficiency of Super Learner mentioned above, we will use GLM regression for all models for demonstration purposes.

### 1. Probability of outcome

To start, we simply fit a model for the outcome and produce predictions in the data under a few different scenarios. These predictions will eventually be "updated" in Step 3 using the clever covariate built from the propensity model. The updated predictions under X=1 and X=0 will be averaged to estimate the ATE in Step 4.

```{r}
# fit outcome model

Q_mod <- glm(
  Y ~ X + C1 + C2 + C3 + U,
  data = df,
  family = "binomial"
)

# predict in original data

Y_pred_X <- predict(
  Q_mod,
  type = "response"
)

# predict outcome when exposure = 1

Y_pred_X1 <- predict(
  Q_mod,
  newdata = mutate(df, X = 1),
  type = "response"
)

# predict outcome when exposure = 0

Y_pred_X0 <- predict(
  Q_mod,
  newdata = mutate(df, X = 0),
  type = "response"
)
```

```{r}
# confirm all predictions are between 0 and 1

all(Y_pred_X >= 0 & Y_pred_X <= 1) # TRUE
all(Y_pred_X1 >= 0 & Y_pred_X1 <= 1) # TRUE
all(Y_pred_X0 >= 0 & Y_pred_X0 <= 1) # TRUE
```

### 2. Probability of treatment

Similar to the above work, we will fit a model for the treatment (a propensity model) and produce a couple different predictions with the model. These predictions will eventually be transformed into inverse probability weights, which form the "clever covariate" used to update the outcome predictions from Step 1 in the targeting step.

```{r}
# fit treatment model

g_mod <- glm(
  X ~ C1 + C2 + C3 + U,
  data = df,
  family = "binomial"
)

# inverse probability of treatment

IP_X1_pred <- 1 / predict(
  g_mod,
  type = "response"
)

# negative inverse probabilty of not receiving treatment

IP_X0_pred <- -1 / (1 - predict(
  g_mod,
  type = "response"
))
```

```{r}
# confirm valid values for IP weights

all(is.finite(IP_X1_pred) & IP_X1_pred >= 1) # TRUE
all(is.finite(IP_X0_pred) & IP_X0_pred <= -1) # TRUE
```

```{r}
# clever covariate

IP_X_pred <- ifelse(df$X == 1, IP_X1_pred, IP_X0_pred)
```

### 3. Fluctuation parameter + Outcome update

Now things get a little trickier.

```{r}
# obtain fluctuation parameter

eps_mod <- glm(
  df$Y ~ -1 + offset(qlogis(Y_pred_X)) + IP_X_pred,
  family = binomial
)

eps <- coef(eps_mod)[1]

# update initial outcomes

Y_pred_X_star <- plogis(qlogis(Y_pred_X) + eps * IP_X_pred)

Y_pred_X1_star <- plogis(qlogis(Y_pred_X1) + eps * IP_X1_pred)

Y_pred_X0_star <- plogis(qlogis(Y_pred_X0) + eps * IP_X0_pred)
```

### 4. Effect estimation

```{r}
# estimate ATE

ate <- mean(Y_pred_X1_star - Y_pred_X0_star)
ate
# ATE = 0.1026
```

### 5. Standard errors

```{r}
# influence function
influence_curve <- IP_X_pred * (df$Y - Y_pred_X_star) +
  (Y_pred_X1_star - Y_pred_X0_star) - ate

se <- sqrt(var(influence_curve) / nrow(df))
se
# SE = 0.0028

ci <- ate + c(-1, 1) * qnorm(0.975) * se
ci
# 95% CI = (0.097, 0.108)
```

## Understanding how the targeting works

The efficient influence function (EIF) is the function that captures how
much a parameter estimate (here, the ATE) would change in response to a
small perturbation of the data distribution at a single observation.
It also determines the estimator's asymptotic variance.

The EIF for the ATE is:

D(O) = H(A,W) * (Y - Q̄(A,W)) + [Q̄(1,W) - Q̄(0,W) - ψ]

where:
* H(A,W) is the clever covariate (`IP_X_pred`)
* Q̄(A,W) is the predicted outcome (`Y_pred_X_star`)
* Q̄(1,W) is the predicted outcome under treatment (`Y_pred_X1_star`)
* Q̄(0,W) is the predicted outcome under control (`Y_pred_X0_star`)
* ψ is the ATE (`ate`)

A nuisance function is a function that must be estimated along the way
(here, Q̄ and the treatment-assignment probability g used to build H(A,W))
but isn't itself the quantity of interest — only the ATE is.

An estimator ψ_hat is asymptotically linear and efficient when the empirical
mean of D(O), evaluated at the fitted nuisance functions, is (close to)
zero. That's the "estimating equation" TMLE is built to solve.

Before targeting, there's no reason for that mean to be zero — `Y_pred_X`
was fit to predict Y well on average, not to zero out this particular
expression. "Targeting" perturbs `Y_pred_X` just enough, in exactly the
direction of `IP_X_pred`, to force the first term of D(O) to zero.

This works because `eps_mod` is a canonical-link (logistic) GLM with
`IP_X_pred` as its only covariate. The normal equations for any
canonical-link GLM guarantee that, at the MLE,
`sum(covariate * residual) = 0` exactly. Here that's precisely
`sum(IP_X_pred * (Y - Y_pred_X_star)) = 0` — the first term of D(O).

```{r}
# before targeting, the EIF's residual term is not zero

mean(IP_X_pred * (df$Y - Y_pred_X)) # 0.0005

# after targeting (fluctuating Y_pred_X along IP_X_pred), it is ~0 exactly
# this is a general property of canonical-link GLM score equations,
# not something specific to this data

mean(IP_X_pred * (df$Y - Y_pred_X_star)) # -3.0e-13
```

The second term of D(O), `Q̄(1,W) - Q̄(0,W) - ψ`, is zero on average by
construction too — `ate` is literally defined as
`mean(Y_pred_X1_star - Y_pred_X0_star)`. So both pieces of the EIF average
to zero, which is why `influence_curve` (their sum) should also average to
~0:

```{r}
mean(influence_curve) # -3.0e-13
```

That's the sense in which TMLE "targets" the initial outcome model: it
doesn't re-fit Q̄ to improve prediction, it nudges Q̄ along the one
covariate (the propensity-based clever covariate) needed to solve the
estimating equation for the parameter we actually care about (the ATE).
Solving that equation is what gives TMLE its efficiency and
double-robustness properties.

## Confirming the double robustness property

TMLE is "doubly robust": ψ_hat is consistent if *either* Q̄ (the outcome
model) or g (the treatment model, used to build `IP_X_pred`) is correctly
specified — not necessarily both. We can check this by deliberately
misspecifying the propensity model (dropping `C3` and `U`) while keeping
the outcome model (`Q_mod`, already fit above) unchanged, and confirming
the ATE barely moves:

```{r}
# propensity model missing confounders C3 and U

g_mod_misspec <- glm(
  X ~ C1 + C2,
  data = df,
  family = "binomial"
)

IP_X1_pred_misspec <- 1 / predict(g_mod_misspec, type = "response")
IP_X0_pred_misspec <- -1 / (1 - predict(g_mod_misspec, type = "response"))
IP_X_pred_misspec <- ifelse(df$X == 1, IP_X1_pred_misspec, IP_X0_pred_misspec)

# re-target using the *same* (correctly specified) Y_pred_X from above

eps_mod_misspec <- glm(
  df$Y ~ -1 + offset(qlogis(Y_pred_X)) + IP_X_pred_misspec,
  family = binomial
)
eps_misspec <- coef(eps_mod_misspec)[1]

Y_pred_X1_star_misspec <- plogis(
  qlogis(Y_pred_X1) + eps_misspec * IP_X1_pred_misspec
)
Y_pred_X0_star_misspec <- plogis(
  qlogis(Y_pred_X0) + eps_misspec * IP_X0_pred_misspec
)

ate_misspec_g <- mean(Y_pred_X1_star_misspec - Y_pred_X0_star_misspec)

ate # ATE = 0.103 (both models correctly specified)
ate_misspec_g # ATE = 0.102 (g misspecified, Q still correct)
```

As a contrast, if we also break the outcome model (drop `C3` and `U` from
`Q_mod` too), so that *neither* nuisance function is correctly specified,
the estimate is no longer protected and shifts noticeably:

```{r}
Q_mod_misspec <- glm(
  Y ~ X + C1 + C2,
  data = df,
  family = "binomial"
)

Y_pred_X_misspec <- predict(Q_mod_misspec, type = "response")
Y_pred_X1_misspec <- predict(
  Q_mod_misspec,
  newdata = mutate(df, X = 1),
  type = "response"
)
Y_pred_X0_misspec <- predict(
  Q_mod_misspec,
  newdata = mutate(df, X = 0),
  type = "response"
)

eps_mod_both_misspec <- glm(
  df$Y ~ -1 + offset(qlogis(Y_pred_X_misspec)) + IP_X_pred_misspec,
  family = binomial
)
eps_both_misspec <- coef(eps_mod_both_misspec)[1]

Y_pred_X1_star_both_misspec <- plogis(
  qlogis(Y_pred_X1_misspec) + eps_both_misspec * IP_X1_pred_misspec
)
Y_pred_X0_star_both_misspec <- plogis(
  qlogis(Y_pred_X0_misspec) + eps_both_misspec * IP_X0_pred_misspec
)

ate_both_misspec <- mean(
  Y_pred_X1_star_both_misspec - Y_pred_X0_star_both_misspec
)

ate # ATE = 0.103 (both models correctly specified)
ate_both_misspec # ATE = 0.126 (both Q and g misspecified - biased)
```

```{r}
sessionInfo()

# R version 4.6.1 (2026-06-24)
# Platform: aarch64-apple-darwin23
# Running under: macOS Tahoe 26.6.2

# attached base packages:
# [1] splines   stats     graphics  grDevices utils     datasets  methods
# [8] base

# other attached packages:
# [1] tmle_2.1.1          SuperLearner_2.0-41 gam_1.22-7
# [4] foreach_1.5.2       nnls_1.6            glmnet_5.0
# [7] Matrix_1.7-5        multibias_1.7.3     lubridate_1.9.5
# [10] forcats_1.0.1       stringr_1.6.0       dplyr_1.2.1
# [13] purrr_1.2.2         readr_2.2.0         tidyr_1.3.2
# [16] tibble_3.3.1        ggplot2_4.0.3       tidyverse_2.0.0
```