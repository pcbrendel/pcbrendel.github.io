---
title: G-computation
---

G-computation estimates marginal causal effects by (1) fitting an outcome model, (2) predicting everyone's outcome under each exposure level, and then (3) averaging. This averaging step is known as standardization, and g-computation is essentially a model-based way to carry it out.

For demonstration, we'll use the `df_em_source` dataset from the `multibias` package. This dataframe has the following binary columns:

* X = exposure
* Y = outcome
* C1 = confounder
* C2 = confounder
* C3 = confounder

Note: An additional column, *Xstar*, will be ignored for this analysis.

We assume no unmeasured confounding beyond *C1–C3*, positivity, consistency, and that the outcome model is correctly specified.

```{r}
library(dplyr)
library(multibias)
library(broom)
library(boot)

df <- df_em_source |>
  select(Y, X, C1, C2, C3)

head(df)

#   Y X C1 C2 C3
# 1 0 1  0  0  1
# 2 1 1  1  0  0
# 3 0 0  1  0  1
# 4 0 0  1  1  1
# 5 0 0  1  1  1
# 6 0 0  1  0  1
```

## 1. Fit outcome model

```{r}
outcome_model <- glm(
  Y ~ X + C1 + C2 + C3,
  data = df,
  family = "binomial"(link = "logit")
)
tidy(outcome_model, conf.int = TRUE, exponentiate = TRUE)

# A tibble: 5 × 7
#   term        estimate std.error statistic   p.value conf.low conf.high
#   <chr>          <dbl>     <dbl>     <dbl>     <dbl>    <dbl>     <dbl>
# 1 (Intercept)   0.0849    0.0275     -89.7 0           0.0804    0.0895
# 2 X             1.94      0.0204      32.5 3.43e-231   1.86      2.02
# 3 C1            1.47      0.0197      19.5 2.18e- 84   1.41      1.53
# 4 C2            0.396     0.0318     -29.1 1.72e-186   0.371     0.421
# 5 C3            1.34      0.0270      10.8 2.28e- 27   1.27      1.41
```

## 2. Predict potential outcomes

```{r}
# Create a dataset where everyone is exposed
df_exposed <- df
df_exposed$X <- 1

# Create a dataset where everyone is unexposed
df_unexposed <- df
df_unexposed$X <- 0

# Predict outcomes if everyone was exposed
exposed_pred_Y <- predict(
  outcome_model,
  newdata = df_exposed,
  type = "response"
)

# Predict outcomes if everyone was unexposed
unexposed_pred_Y <- predict(
  outcome_model,
  newdata = df_unexposed,
  type = "response"
)
```

## 3. Calculate marginal outcome estimates

```{r}
E_Y_do_X1_prob <- mean(exposed_pred_Y)
E_Y_do_X0_prob <- mean(unexposed_pred_Y)

print(
  paste(
    "Estimated mean outcome if all were exposed (E[Y|do(X=1)]):",
    round(E_Y_do_X1_prob, 2)
  )
)
# "Estimated mean outcome if all were exposed (E[Y|do(X=1)]): 0.18"

print(
  paste(
    "Estimated mean outcome if all were unexposed (E[Y|do(X=0)]):",
    round(E_Y_do_X0_prob, 2)
  )
)

# "Estimated mean outcome if all were unexposed (E[Y|do(X=0)]): 0.10"
```

## 4. Estimate the causal effect

```{r}
odds_Y_do_X1 <- E_Y_do_X1_prob / (1 - E_Y_do_X1_prob)
odds_Y_do_X0 <- E_Y_do_X0_prob / (1 - E_Y_do_X0_prob)
odds_ratio <- odds_Y_do_X1 / odds_Y_do_X0
print(
  paste(
    "Marginal Odds Ratio:",
    round(odds_ratio, 2)
  )
)
# "Marginal Odds Ratio: 1.92"

ate <- E_Y_do_X1_prob - E_Y_do_X0_prob
print(
  paste(
    "Average Treatment Effect (ATE):",
    round(ate, 2)
  )
)

# "Average Treatment Effect (ATE): 0.08"
```

These estimates are marginal causal effects of *X* on *Y*. Note that the effect estimate in `outcome_model` produces a conditional effect (effect of *X* on *Y* conditional on *C1-C3*). The conditional OR for *X* is 1.94, while the marginal OR is 1.92. They differ even though nothing is wrong, because the odds ratio is non-collapsible.

Finally, let's perform bootstrap resampling to arrive at a confidence interval for our estimate.

## 5. Run with bootstrapping

First, make a function to perform g-computation on a single bootstrap sample. The `boot::boot()` function requires the statistic function to have two parameters: `data`, the original dataset, and `indices`, the indices for the bootstrap sample.

```{r}
gcomp_fxn <- function(data, indices) {
  # Get bootstrap sample
  boot_data <- data[indices, ]

  # 1. Fit outcome model
  boot_model <- glm(
    Y ~ X + C1 + C2 + C3,
    data = boot_data,
    family = "binomial"(link = "logit")
  )

  # 2. Create datasets for predictions
  boot_exposed <- boot_data
  boot_exposed$X <- 1
  boot_unexposed <- boot_data
  boot_unexposed$X <- 0

  # 3. Predict outcomes
  exposed_pred <- predict(
    boot_model,
    newdata = boot_exposed,
    type = "response"
  )
  unexposed_pred <- predict(
    boot_model,
    newdata = boot_unexposed,
    type = "response"
  )

  # 4. Calculate marginal probabilities
  E_Y_do_X1 <- mean(exposed_pred)
  E_Y_do_X0 <- mean(unexposed_pred)

  # 5. Calculate odds ratio, ate
  odds_Y_do_X1 <- E_Y_do_X1 / (1 - E_Y_do_X1)
  odds_Y_do_X0 <- E_Y_do_X0 / (1 - E_Y_do_X0)
  odds_ratio <- odds_Y_do_X1 / odds_Y_do_X0
  ate <- E_Y_do_X1 - E_Y_do_X0

  return(c(Y1 = E_Y_do_X1, Y0 = E_Y_do_X0, OR = odds_ratio, ATE = ate))
}
```

Now let's run this function across bootstrap samples to get an estimate with a valid confidence interval. For demonstration purposes, we'll use 100 bootstrap samples, but in practice, you would want to use at least 1,000.

```{r}
set.seed(123)
n_reps <- 100

# Run bootstrap
boot_results <- boot::boot(
  data = df,
  statistic = gcomp_fxn,
  R = n_reps
)

# Calculate confidence intervals
boot_ci <- boot::boot.ci(boot_results, type = "perc", index = 4)

# Calculate median ate from bootstrap distribution
median_ate <- median(boot_results$t[, 4])

print("Bootstrap Results:")
print(
  paste(
    "Bootstrap ATE estimate:",
    round(median_ate, 3)
  )
)
print(
  paste(
    "95% CI for ATE:",
    round(boot_ci$percent[4], 3), "to",
    round(boot_ci$percent[5], 3)
  )
)

# "Bootstrap ATE estimate: 0.078"
# "95% CI for ATE: 0.072 to 0.082"
```

Finally, summarize the distribution of the ATE estimates across bootstrap samples.

```{r}
ate_draws <- boot_results$t[, 4]

summary(ate_draws)
sd(ate_draws)

#    Min. 1st Qu.  Median    Mean 3rd Qu.    Max.
# 0.07102 0.07557 0.07777 0.07757 0.07957 0.08321
# > sd(ate_draws)
# [1] 0.002681537
```

The bootstrap ATE estimates range from 0.071 to 0.083, centered around 0.078. Their spread (SD = 0.003) is the bootstrap standard error of the ATE.

## Conclusion

G-computation turned an ordinary logistic regression into a marginal causal estimate. In this sample, the risk of the outcome would be about 18% if everyone were exposed and 10% if no one were exposed. That's an ATE of 0.08 (95% CI: 0.072 to 0.082), or a marginal odds ratio of 1.92. Unlike the coefficient for *X* in outcome_model, these estimates describe the effect across the whole population, not within strata of *C1–C3*.

```{r}
sessionInfo()

# R version 4.6.1 (2026-06-24)
# Platform: aarch64-apple-darwin23
# Running under: macOS Tahoe 26.6.2

# attached base packages:
# [1] splines   stats     graphics  grDevices utils     datasets  methods
# [8] base

# other attached packages:
# [1] boot_1.3-32     broom_1.0.13    multibias_1.7.3 dplyr_1.2.1
```