---
title: G-computation
---

```{r}
library(multibias)
library(broom)
library(boot)
```

Standardization (or marginalization over the covariate distribution) is conceptually very similar to g-computation and is, in fact, the core idea behind it. If you fit an outcome regression model and then use it to predict outcomes for everyone under different exposure levels, averaging these predictions across the observed distribution of confounders, you are performing standardization to get a marginal effect. G-computation essentially operationalizes this.

For some sample data to work with, load `df_em_source` from `multibias` package. This data has a misspecified exposure, Xstar, which we'll ignore for this analysis.

```{r}
head(df_em_source)
summary(df_em_source)
```

# 1. Fit outcome model

```{r}
outcome_model <- glm(
  Y ~ X + C1 + C2 + C3,
  data = df_em_source,
  family = "binomial"(link = "logit")
)
tidy(outcome_model, conf.int = TRUE, exponentiate = TRUE)
```

# 2. Predict potential outcomes

```{r}
# Create a dataset where everyone is exposed
df_exposed <- df_em_source
df_exposed$X <- 1

# Create a dataset where everyone is unexposed
df_unexposed <- df_em_source
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

# 3. Calculate marginal outcome estimates

```{r}
E_Y_do_X1_prob <- mean(exposed_pred_Y)
E_Y_do_X0_prob <- mean(unexposed_pred_Y)

print(
  paste(
    "Estimated mean outcome if all were exposed (E[Y|do(X=1)]):",
    round(E_Y_do_X1_prob, 2)
  )
)
print(
  paste(
    "Estimated mean outcome if all were unexposed (E[Y|do(X=0)]):",
    round(E_Y_do_X0_prob, 2)
  )
)
```

# 4. Estimate the causal effect

```{r}
odds_Y_do_X1 <- E_Y_do_X1_prob / (1 - E_Y_do_X1_prob)
odds_Y_do_X0 <- E_Y_do_X0_prob / (1 - E_Y_do_X0_prob)
ate <- odds_Y_do_X1 / odds_Y_do_X0
print(
  paste(
    "Estimated Average Treatment Effect (ATE):",
    round(ate, 2)
  )
)
```

This ATE is a marginal causal effect! Note that the effect estimate in `outcome_model` produces a conditional effect (effect of X on Y conditional on C1-C3).

This is great, but there's no confidence interval for our estimate. Let's perform bootstrap resampling to get a confidence interval.

# 5. Run with bootstrapping

First, make a function to perform g-computation on a single bootstrap sample. The `boot::boot()` function requires the statistic functino to have two parameters: `data`, the original dataset, and `indices`, the indices for the bootstrap sample.

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

  # 5. Calculate odds and ATE (odds ratio)
  odds_Y_do_X1 <- E_Y_do_X1 / (1 - E_Y_do_X1)
  odds_Y_do_X0 <- E_Y_do_X0 / (1 - E_Y_do_X0)
  ate <- odds_Y_do_X1 / odds_Y_do_X0

  return(c(E_Y_do_X1, E_Y_do_X0, ate))
}
```

Now let's run this function across bootstrap samples to get an estimate with a valid confidence interval.

```{r}
set.seed(123)
n_reps <- 100

# Run bootstrap
boot_results <- boot::boot(
  data = df_em_source,
  statistic = gcomp_fxn,
  R = n_reps
)

# Calculate confidence intervals
boot_ci <- boot::boot.ci(boot_results, type = "perc", index = 3)

# Get ate estimate from original data
original_ate <- boot_results$t0[3]

# Calculate median ate from bootstrap distribution
median_ate <- median(boot_results$t[, 3])

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
    round(boot_ci$percent[4], 2), "to",
    round(boot_ci$percent[5], 2)
  )
)
```

Finally, plot the distribution of the ATE estimates from each sample.

```{r}
hist(boot_results$t[, 3],
  main = "Bootstrap Distribution of ATE",
  xlab = "ATE",
  breaks = 30,
  xlim = range(boot_results$t[, 3])
)

abline(v = median_ate, col = "red", lwd = 2)
abline(v = boot_ci$percent[4:5], col = "blue", lty = 2)
```