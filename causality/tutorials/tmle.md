---
title: Targeted Maximum Likelihood Estimation (TMLE)
---

TMLE is a powerful estimation method for causal inference. The reasons when or when not to choose TMLE versus other approaches could constitute its own blog post. But at a high level, TMLE may be the best choice under the following conditions:

* You don't trust parametric models to capture the true relationships between confounders, exposure, and outcome.
* You have the sample size and expertise to leverage machine learning wherein the data decides the form of the model.
* You want double robustness.
* You have positivity problems or extreme propensity scores.

This post will walk through how to 1) implement the method quickly with the `tmle` package, 2) produce the full code step-by-step, 3) further understand the intuition behind the "targeting" concepts, 4) demonstrate the doubly robust benefits.

We'll use the `df_uc_source` dataframe from `multibias`, which has the following binary columns:

* X = exposure
* Y = outcome
* C1 = confounder
* C2 = confounder
* C3 = confounder
* U = confounder

The dataframe was simulated such that the effect of X on Y, adjusted for all four confounders, has a conditional odds ratio of approximately 2.

```{r}
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

## With the tmle package

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

Despite the incredible flexibility and efficiency of Super Learner mentioned above, we will use GLM regression for all models for demonstration purposes.

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

Similar to the above work, we will fit a model for the treatment (a propensity model) and produce a couple of different predictions with the model. These predictions will eventually be transformed into inverse probability weights, which form the "clever covariate" used to update the outcome predictions from Step 1 in the targeting step.

This covariate takes the value of the inverse probability of treatment for those who were treated and takes the negative inverse probability of not receiving treatment for those not receiving treatment. Intuitively, this weights each person's residual by how unusual their treatment was given their covariates. People who received treatment they were unlikely to get are under-represented in the data, so they carry the most information about what the unobserved counterfactual would have looked like.

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

# negative inverse probability of not receiving treatment

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

### 3. Targeting

A more formal way of thinking about the clever covariate is that it allows us to solve the influence curve (IC) estimating equation. The IC of an estimator describes how much each observation contributes to the estimate. It works like a per-person "influence score" whose variance determines the estimator's standard error. Solving this equation means finding predictions for which the IC averages to zero across all observations.

For the ATE, the efficient influence curve for each person is:

$$IC = H \cdot (Y - Q(X, C)) + Q(1, C) - Q(0, C) - \text{ATE}$$

* $H$ is the clever covariate (`IP_X_pred`)
* $\text{ATE}$ is the average treatment effect (`ate`)
* $Q$ is any set of outcome predictions. We'll evaluate it with two versions: the initial predictions from Step 1, $Q$ (`Y_pred_X`, `Y_pred_X1`, `Y_pred_X0`), and the updated predictions from this step, $Q^{\ast}$ (`Y_pred_X_star`, `Y_pred_X1_star`, `Y_pred_X0_star`).

The last three terms of the equation $Q(1, C) - Q(0, C) - \text{ATE}$ average to zero automatically, because the ATE is defined as the average of $Q(1, C) - Q(0, C)$. Thus the targeting step we do in this section addresses the remaining term: $H \cdot (Y - Q(X, C))$. With the initial predictions $Q$, this term generally does not average to zero, since the outcome model was fit to predict $Y$ well, not to satisfy this equation. The goal of targeting is to produce $Q^{\ast}$ such that the expression averages to zero.

We fit the fluctuation model: a logistic regression of the outcome on the clever covariate with no intercept, using the logit of the initial predictions as an offset. The offset holds the initial predictions fixed, so they are only nudged by a single coefficient, the fluctuation parameter (`eps`).

Logistic regression always chooses its coefficients so that each covariate's weighted residuals average to zero (i.e., maximum likelihood). In our fluctuation model the clever covariate $H$ is the only covariate, so the estimated coefficient is the value that makes $\text{mean}(H \cdot (Y - Q^{\ast}(X, C))) = 0$. That is exactly the influence curve estimating equation we wanted to solve!

This process removes the residual bias in the initial outcome predictions and is a key ingredient in TMLE's double robustness.

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

Here we arrive at the ATE by taking the average of the differences between the updated outcome under treatment and the updated outcome under no treatment.

```{r}
# estimate ATE

ate <- mean(Y_pred_X1_star - Y_pred_X0_star)
ate
# ATE = 0.1026
```

### 5. Standard errors

We can use the variance of the influence curve (defined in Step 3) to get valid standard errors for the ATE. We evaluate the IC at the updated predictions, $Q^{\ast}$, since those produce our final ATE estimate. Because the targeted ATE is approximately the true ATE plus the average of the IC, its variance is approximately $\text{var}(IC)/n$.

```{r}
# influence curve
influence_curve <- IP_X_pred * (df$Y - Y_pred_X_star) +
  (Y_pred_X1_star - Y_pred_X0_star) - ate

se <- sqrt(var(influence_curve) / nrow(df))
se
# SE = 0.0028

ci <- ate + c(-1, 1) * qnorm(0.975) * se
ci
# 95% CI = (0.097, 0.108)
```

## Confirming the targeting logic

We can check that targeting accomplished what Step 3 promised. With the initial predictions $Q$, the clever-covariate-weighted residuals don't average to zero. With the updated predictions $Q^{\ast}$, they do:

```{r}
# before targeting: initial predictions

mean(IP_X_pred * (df$Y - Y_pred_X)) # 0.0005

# after targeting: updated predictions

mean(IP_X_pred * (df$Y - Y_pred_X_star)) # -3.0e-13
```

The 0.0005 has a useful interpretation: it estimates the first-order bias of the ATE we'd get by plugging in the initial predictions (i.e., G-computation using `Y_pred_X1` and `Y_pred_X0`). That initial estimate is about 0.0005 too low, and targeting shifts it by about that amount. The number is tiny here because our outcome model is close to correctly specified. With a misspecified model, it can be much larger.

The rest of the influence curve, $Q^{\ast}(1, C) - Q^{\ast}(0, C) - \text{ATE}$, averages to zero by construction, so the full influence curve from Step 5 averages to zero too:

```{r}
mean(influence_curve) # -3.0e-13
```

This is the sense in which TMLE "targets" the outcome model. It doesn't refit $Q$ to predict $Y$ better. Instead, it nudges $Q$ in the one direction (the clever covariate) needed to solve the estimating equation for the parameter we actually care about, the ATE.

## Confirming the double robustness property

TMLE is "doubly robust": the ATE estimate is consistent if *either* the outcome model ($Q$) or the propensity model (used to build the clever covariate $H$) is correctly specified, not necessarily both. We can check this by deliberately misspecifying the propensity model (dropping `C3` and `U`) while keeping the outcome model (`Q_mod`, already fit above) unchanged, and confirming the ATE barely moves:

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
ate_misspec_g # ATE = 0.102 (propensity model misspecified, outcome model correct)
```

As a contrast, if we also break the outcome model (drop `C3` and `U` from `Q_mod` too), so that *neither* model is correctly specified, the estimate is no longer protected and shifts noticeably:

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

ate # ATE = 0.1026 (both models correctly specified)
ate_both_misspec # ATE = 0.1256 (both models misspecified - biased)
```

## Conclusion

TMLE can look intimidating, but it boils down to four steps: fit an outcome model, fit a treatment model, use the treatment model to "target" the outcome predictions, and then average the updated predictions. The targeting step is what sets TMLE apart. By nudging the initial predictions along the clever covariate, TMLE solves the influence curve estimating equation, which removes the first-oder bias of the initial estimate and provides valid standard errors.

As we saw above, the estimate stayed close to the truth when only the propensity model was misspecified, but drifted when both models were wrong. Double robustness gives you two chances to get it right, not a free pass.

In practice, use the `tmle()` function rather than coding the steps by hand. Let Super Learner fit the outcome and treatment models with a rich library of algorithms; that flexibility is where TMLE really shines. Finally, remember that TMLE is an estimation method, not an identification strategy. It can't correct for unmeasured confounding, selection bias, or measurement error, so the usual causal assumptions still have to hold.

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

{% raw %}
<script>
MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true,
  }
};
</script>
<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>
{% endraw %}
