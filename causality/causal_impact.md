---
title: Causal Impact
---

In Epidemiology, a lot of attention is placed on Cohort studies. I suspect this
is because they have the clearest parallel to clinical trials. Cohort studies
leverage panel data (tracking multiple entities over multiple points in time)
to compare two or more treatment groups. However, an even simpler causal
scenario can often arise: leveraging time series data (tracking a single entity
over multiple points in time) to make a comparison before and after an
intervention.

There are a couple major considerations for valid causal estimation in these
scenarios. A crucial assumption is that the pre-intervention trend in the
outcome variable would have continued unchanged into the post-intervention
period if the intervention had not occurred. In addition, the presence of any
other external events around the time of the intervention of interest that
affects the outcome (i.e., a confounder) would disrupt the validity of results.
To put it another way, we need to ensure we've removed all the ways that *time*
affects the outcome, except for that point of intervention and transition
from pre-event to post-event.

The crux of these analyses comes down to predicting the **counterfactual**
(what would have happened without the intervention) post-event data to
compare against the **observed** post-event data in order to quantify the
effect of the intervention. To this end, Google created a useful R package
called `CausalImpact`. This tool leverages Bayesian Structural Time Series
models to predict the post-intervention counterfactual. To arrive at this
counterfactual, it requires one or more "control" time series that are highly
correlated with the "treated" time series during the pre-intervention
period and that were **not** affected by the intervention.

In the spirit of Google, we actually have some Google stock data to work with,
courtesy of the `causaldata` package.

```{r}
library(CausalImpact)
library(tidyverse)
library(causaldata)
library(zoo)

head(google_stock)
event <- ymd("2015-08-10")
```

On August 10, 2015 Google changed its corporate structure with the creation of
parent company Alphabet. We'll quantify how this intervention impacted Google's
stock price by forming a counterfactual using the price of the S&P500 as a
"control".

```{r}
event <- ymd("2015-08-10")
df_google <- google_stock %>%
  filter(Date >= event - 21 & Date <= event + 14)
head(df_google)
```

```{r}
ggplot(df_google) +
  geom_line(aes(x = Date, y = Google_Return), color = "red") +
  geom_line(aes(x = Date, y = SP500_Return), color = "blue") +
  geom_vline(aes(xintercept = event), linetype = 'dashed') +
  labs(title = "Google Stock Price Over Time", x = "Date", y = "Price")
```
![image](image)

Data prep

```{r}
df <- read.zoo(df_google)
pre_period <- c(index(df)[1], event)
post_period <- c(event + 1, index(df)[nrow(df)])
head(df)
```

Note that for `CausalImpact` the response variable (i.e., the first column in data) may contain missing values (NA), but covariates (all other columns in data) may not. Now we'll fit and plot the `CausalImpact()` model.

```{r}
impact <- CausalImpact(df_zoo, pre_period, post_period)
summary(impact)
```

Interpret

```{r}
plot(impact)
```
![image](image)

* The first panel shows the data and a counterfactual prediction for the post-treatment period.
* The second panel shows the difference between observed data and counterfactual predictions. This is the pointwise causal effect, as estimated by the model.
* The third panel adds up the pointwise contributions from the second panel, resulting in a plot of the cumulative effect of the intervention.

To get a little more advanced, there are some additional parameters that users can specify as `model.args`.

```{r}
impact2 <- CausalImpact(
  df,
  pre_period,
  post_period,
  model.args = list(niter = 5000, nseasons = 5)
)
summary(impact2)
```

Overall, it