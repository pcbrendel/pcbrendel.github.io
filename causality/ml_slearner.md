---
title: Causal ML: S-Learner
---

Causal machine learning (ML) integrates the flexible, non-parametric power of machine learning algorithms, such as random forests or neural networks, into rigorous causal inference frameworks (like the potential outcomes model) to estimate treatment effects. For epidemiologists, this approach offers two distinct advantages over traditional regression: it handles high-dimensional confounding and complex non-linearities without requiring manual model specification, and it excels at identifying heterogeneous treatment effects to determine which specific subgroups benefit most from an intervention.

The core estimators in causal ML are called "meta-learners." They're "meta" because a new algorithm isn't invented from scratch. Instead, standard machine learning models serve as building blocks to estimate the Conditional Average Treatment Effect (CATE). The CATE helps measure how a treatment's average impact changes across different subgroups.

The most straightforward learner is the S-Learner (Single Learner). As the name implies, the S-Learner uses a single machine learning model to estimate causal effects. This model treats the treatment variable and relevant covariates as predictors of the outcome. Once the model is fit, individual treatment effects are calculated by: (1) predicting the outcome for each observation assuming treatment=1, (2) predicting the outcome for each observation assuming treatment=0, and (3) taking the difference between these two predictions for each individual. The final CATE estimate is the average of all these individual treatment effect differences. Bootstrapping is necessary to obtain a valid confidence interval of this estimate.

In this tutorial, we will start by performing a causal ML analysis "from scratch" in R then repeat the analysis by leveraging Uber's `causalml` package in python. We'll conclude by commenting on any differences between the two approaches and showcasing some of the additional capabilities of `causalml`. The analysis will work with the `df_uc_source` dataset from multibias (see [documentation](https://www.paulbrendel.com/multibias/reference/df_uc_source.html)).

First we load the data and apply a 80-20 train-test split. Variable `X_bi` represents the treatment and variable `Y_bi` represents the outcome. There are four covariates: `C1`, `C2`, `C3`, and `U`.

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

* Train CATE = 0.102 (95% CI: 0.096 to 0.108)
* Test CATE = 0.102 (95% CI: 0.091 to 0.116)

For observations with a treatment of X_bi=1, receiving the treatment increases their probability of Y_bi by 10 percentage points. The strong similarity in these estimates between the train and test data makes it unlikely that we're dealing with any concerns of overfitting. One could further inspect model performance on the train and test data by observing the accuracy and ROC AUC.

Normally, in a causal ML analysis, next steps would be to plot the distribution of individual effects and investigate the heterogeneity of the treatment effect across different covariates. We'll revisit this shortly.

In python, these types of analyses can be performed with the `causalml` package. Let's see if we can confirm the above results in `causalml` and explore some of its other functionalities.

As before, we start by loading the data and applying an 80-20 train test split.

```{python}
import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt
import random

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from causalml.inference.meta import BaseSClassifier
from causalml.metrics import plot_qini, plot_gain

# not shown: load df_uc_source from multibias as df

Y = df['Y_bi']
T = df['X_bi']
X = df[['C1', 'C2', 'C3', 'U']]

random.seed(123)
X_train, X_test, T_train, T_test, Y_train, Y_test = train_test_split(X, T, Y, test_size=0.2)
```

The user has a couple of options for creating a meta-learner in `causalml`. The flexible option is to use a meta-learner "parent class" and specify which algorithm serves as the learner. Alternatively, there are some S-learners in which the base model is **fixed** (e.g., `LRSRegressor`). We use the first approach by making a `BaseSClassifier` object with `LogisticRegression` as its base model. After fitting the model, the CATE can be obtained with the `estimate_ate` method. Parameter specification in this method ensures that we obtain a confidence interval via bootstrapping.

```{python}
random.seed(123)
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
  bootstrap_size=len(X_train)
)

# cate in test
slearner.estimate_ate(
  X=X_test,
  treatment=T_test,
  y=Y_test,
  return_ci=True,
  bootstrap_ci=True,
  bootstrap_size=len(X_test)
)
```
Train CATE = 0.101 (95% CI: 0.095 to 0.107)
Test CATE = 0.106 (95% CI: 0.094 to 0.117)

These estimates are very similar to those obtained in the R demonstration, demonstrating an average treatment effect of 10%, conditional on the covariates.

Let's evaluate our results in the test data, starting with a plot of the density of the test CATE distribution.

```{python}
cate_test = slearner.predict(X_test)
sns.kdeplot(data=pd.DataFrame({'cate': cate_test.reshape(-1)}), x="cate")
plt.title("Distribution of CATE in Test Data");
```

img

We observe several notable spikes in CATE across the distribution, each corresponding to a different sub-group in the population. We'll analyze this heterogeneity in the treatment effect by inspecting the mean covariate value across CATE strata. We use a binary stratification here based on whether the CATE is above or below the median.

```{python}
# covariate differences by high vs low cate
df_test = pd.DataFrame({
  'cate': cate_test.reshape(-1),
  'T': T_test,
  'Y': Y_test
}).merge(X, left_index = True, right_index = True)

df_test['cate_group'] = np.where(df_test['cate'] > np.median(df_test['cate']), "High", "Low")

df_test.groupby('cate_group')[['cate', 'T', 'Y', 'C1', 'C2', 'C3', 'U']].agg('mean')
```
| cate_group | cate |	T |	Y |	C1 | C2 |	C3 |	U |
| --- | --- | --- | --- | --- | --- | --- | --- |
| High |	0.13 |	0.41 |	0.26 |	0.51 |	0.00 |	0.80 |	1.00 |
| Low |	0.08 |	0.27 |	0.12 |	0.50 |	0.33 |	0.80 |	0.16 |

One thing immediately stands out: values of U and C2 are extremely different between the two groups! Everyone with an above-median CATE has a U=1 and C2=0. On the other hand, no real difference is observed between in C1 or C3 based on these two CATE strata. Let's dig further dig into understanding *how* the covariates influence the treatment effect. There are a few nice tools within `causalml` to elucidate these factors:

* Plot the Uplift: a visualization used to evaluate how well the causal model identifies those most affected by treatment.
  * Qini Curve (**count-based** difference in treatment effects)
  * Cumulative Gain Curve (**rate-based** difference in treatment effects)
* The feature importance: what predicts the **lift**

```{python}
plot_qini(
  df_test.drop('cate_group', axis=1),
  outcome_col='Y',
  treatment_col='T',
  treatment_effect_col='cate',
  normalize=True
)

plot_gain(
  df_test.drop('cate_group', axis=1),
  outcome_col='Y',
  treatment_col='T',
  treatment_effect_col='cate',
  normalize=True
)
```
img

Under the hood...

We can see...


```{python}
slearner.get_importance(
    X=X_test,
    tau=cate_test,
    method='auto',
    features=X_test.columns.tolist()
)

slearner.plot_importance(
    X=X_test,
    tau=cate_test,
    method='permutation',
    features=X_test.columns.tolist()
)
```

As expected, U and C2 have the great feature importance values: 0.457 and 0.355, respectively. [interpret]

[Comment on logistic regression / interaction / benefit of tree-based model]

The S-Learner for CausalML has a key limitation not obvious in the example here. The model might "ignore" the treatment variable if it's not a strong predictor, especially if the treatment is just a single binary column in a forest of hundreds of other features. This can cause the model to "wash out" the treatment effect, leading to an estimate of 0 for everyone. This motivates the need for other types of learners, like the T-Learner, which we'll explore next!