---
title: Causal ML: S-Learner
---

Causal machine learning integrates the flexible, non-parametric power of machine learning algorithms—such as random forests or neural networks—into rigorous causal inference frameworks (like the potential outcomes model) to estimate treatment effects. For epidemiologists, this approach offers two distinct advantages over traditional regression: it handles high-dimensional confounding and complex non-linearities without requiring manual model specification, and it excels at identifying Heterogeneous Treatment Effects (HTE) to determine which specific subgroups benefit most from an intervention.

The core estimators in CausalML are called "meta-learners." They're "meta" because they don't invent a new algorithm from scratch. Instead, they use standard machine learning models as building blocks to estimate the Conditional Average Treatment Effect (CATE). The CATE measures how a treatment's average impact changes across different subgroups.

The most straightforward learner is the S-Learner (Single Learner). As the name implies, the S-Learner uses a single machine learning model to estimate causal effects. This model treats the treatment variable and relevant covariates as predictors of the outcome. Once the model is fit, individual treatment effects are calculated by: (1) predicting the outcome for each observation assuming treatment=1, (2) predicting the outcome for each observation assuming treatment=0, and (3) taking the difference between these two predictions for each individual. The final CATE estimate is the average of all these individual treatment effect differences. Bootstrapping is necessary to obtain a valid confidence interval of this estimate.

In this tutorial, we will first perform this analysis "from scratch" in R then again by leveraging Uber's `causalml` package in python. We'll conclude by commenting on any differences between the two approaches and showcasing some of the additional capabilities of `causalml`. The analysis will work with the `df_uc_source` dataset from multibias (see [documentation](https://www.paulbrendel.com/multibias/reference/df_uc_source.html)).

First we load the data and apply a 80-20 train-test split.

```{r}
library(multibias)
library(tidyverse)
library(tidymodels)
library(boot)

df <- df_uc_source %>%
  mutate(
    Y_bi = as.factor(Y_bi),
    X_bi = as.factor(X_bi)
  )

# split data
set.seed(123)
data_split <- initial_split(df, prop = 0.8)
train_data <- training(data_split)
test_data <- testing(data_split)
```
Then we create the function for obtaining the CATE from a bootstrap sample.

```{r}
# Function to compute mean cate on a bootstrap sample
cate_boot_fxn <- function(data, indices) {

  boot_data <- data[indices, ]

  boot_recipe <- recipe(Y_bi ~ X_bi + C1 + C2 + C3 + U, data = boot_data)

  boot_wf <- workflow() %>%
    add_recipe(boot_recipe) %>%
    add_model(lr_mod)

  boot_fit <- fit(boot_wf, boot_data)

  boot_x1 <- boot_data %>%
    mutate(X_bi = factor(1, levels = levels(boot_data$X_bi)))
  boot_x0 <- boot_data %>%
    mutate(X_bi = factor(0, levels = levels(boot_data$X_bi)))

  pred_x1 <- predict(boot_fit, boot_x1, type = "prob")$.pred_1
  pred_x0 <- predict(boot_fit, boot_x0, type = "prob")$.pred_1

  cate_boot <- pred_x1 - pred_x0

  return(mean(cate_boot))
}
```
Lastly, we run this function across bootstrap samples of the train data and test data.

```{r}
# Run bootstrap on training data
set.seed(123)
n_reps <- 200

boot_results_train <- boot::boot(
  data = train_data,
  statistic = cate_boot_fxn,
  R = n_reps
)

boot_ci_train <- boot::boot.ci(boot_results_train, type = "perc")

print(paste("CATE (train):", round(median(boot_results_train$t), 4)))
print(paste(
  "95% CI for CATE (train):",
  round(boot_ci_train$percent[4], 4), "to",
  round(boot_ci_train$percent[5], 4)
))

# Run bootstrap on test data
set.seed(123)
boot_results_test <- boot::boot(
  data = test_data,
  statistic = cate_boot_fxn,
  R = n_reps
)

boot_ci_test <- boot.ci(boot_results_test, type = "perc")

print(paste("CATE (test):", round(median(boot_results_test$t), 4)))
print(paste(
  "95% CI for CATE (test):",
  round(boot_ci_test$percent[4], 4), "to",
  round(boot_ci_test$percent[5], 4)
))
```
We arrive at the following estimates:

* Train CATE = 0.1017 (95% CI: 0.0958 to 0.1080)
* Test CATE = 0.1024 (95% CI: 0.0913 to 0.1157)

[intrepretation]
[similarity - no overfitting]
Normally, in a CausalML analysis, next steps would be to plot the distribution of individual effects and investigate the heterogeneity of the treatment effect across different covariates. We'll revisit this shortly.

In python, these analyses can be performed with the `causalml` package. Let's see if these we can confirm the above results in `causalml` and explore some of its other functionalities.

As before, we start by loading the data and applying an 80-20 train test split.

```{python}
import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt
import random

# not shown: load df_uc_source from multibias as df

Y = df['Y_bi']
T = df['X_bi']
X = df[['C1', 'C2', 'C3', 'U']]

random.seed(123)
X_train, X_test, T_train, T_test, Y_train, Y_test = train_test_split(X, T, Y, test_size=0.2)
```

```{python}
learner = LogisticRegression(penalty=None, solver='lbfgs')
slearner = BaseSClassifier(learner=learner)
slearner.fit(X=X_train, treatment=T_train, y=Y_train)

# cate in train
slearner.estimate_ate(
  X=X_train,
  treatment=T_train,
  y=Y_train,
  return_ci=True,
  bootstrap_ci=True,
  bootstrap_size=1000
)

# cate in test
slearner.estimate_ate(
  X=X_test,
  treatment=T_test,
  y=Y_test,
  return_ci=True,
  bootstrap_ci=True,
  bootstrap_size=1000
)
```
Train CATE = x (95% CI: x to x)
Test CATE = x (95% CI: x to x)

These estimates are very similar to those obtained in the R demonstration, however the confidence intervals are significantly wider. What is leading to this difference?

```{python}
cate_train = slearner.predict(X_train)
sns.kdeplot(data=pd.DataFrame({'cate': cate_train.reshape(-1)}), x="cate")
plt.title("Distribution of CATE in Train Data");

cate_test = slearner.predict(X_test)
sns.kdeplot(data=pd.DataFrame({'cate': cate_test.reshape(-1)}), x="cate")
plt.title("Distribution of CATE in Test Data");
```

```{python}
# covariate differences by high vs low cate
df_test = pd.DataFrame({
  'cate': cate.reshape(-1),
  'T': T_test,
  'Y': Y_test
}).merge(X, left_index = True, right_index = True)

df_test['cate_group'] = np.where(df_test['cate'] > np.median(df_test['cate']), "High", "Low")

df_test.groupby('cate_group')[['cate', 'T', 'Y', 'C1', 'C2', 'C3', 'U']].agg('mean')

# plot uplift
plot_gain(df_test.drop('cate_group', axis=1), outcome_col='Y', treatment_col='T', normalize=True)

# feature importance
slearner.plot_importance(
    X=X_test,
    tau=cate_test,
    method='permutation',
    features=X_test.columns.tolist()
)
```

The S-Learner for CausalML has a key limitation not obvious in the example here. The model might "ignore" the treatment variable if it's not a strong predictor, especially if the treatment is just a single binary column in a forest of hundreds of other features. This can cause the model to "wash out" the treatment effect, leading to an estimate of 0 for everyone. This motivates the need for other types of learners, like the T-Learner, which we'll explore next!