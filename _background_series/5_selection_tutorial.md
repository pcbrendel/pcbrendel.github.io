---
title: Adjustment for Selection Bias
---

### Full code used in this analysis is available [here](https://github.com/pcbrendel/biasanalysis)

First, generate a dataset with a sample size of 100,000. The following binary variables are defined:

* X = Exposure (1 = exposed, 0 = not exposed)
* Y = Outcome (1 = outcome, 0 = no outcome)
* C = Known Confounder (1 = present, 0 = absent)
* S = Selection (1 = selected, 0 = not selected)

```r
set.seed(1234)
n <- 100000

C <- rbinom(n, 1, .5)
X  <- rbinom(n, 1, plogis(-.5 + .5 * C))
Y  <- rbinom(n, 1, plogis(-.5 + log(2) * X + .5 * C))
S <- rbinom(n, 1, plogis(-.5 + 1.5 * X + 1.5 * Y))

df <- data.frame(X, Y, C, S)
rm(C, X, Y, S)
```
This data reflects the following causal relationship:

![Seldemo](/background_series/Seldemo.png)

From this dataset note that P(Y=1\|X=1, C=c, U=u) / P(Y=1\|X=0, C=c, U=u) should equal expit(log(2)).
Therefore, odds(Y=1\|X=1, C=c, U=u) / odds(Y=1\|X=0, C=c, U=u) = odds ratio (OR<sub>YX</sub>) = exp(log(2)) = 2

Compare the biased (confounded model) to the bias-free model.

```r
no_bias <- glm(Y ~ X + C, family = binomial(link = "logit"), data = df)
exp(coef(no_bias)[2])
exp(coef(no_bias)[2] + summary(no_bias)$coef[2, 2] * qnorm(.025))
exp(coef(no_bias)[2] + summary(no_bias)$coef[2, 2] * qnorm(.975))
```
OR<sub>YX</sub> = 2.04 (1.99, 2.10)

This is the value we would expect based off of the derivation of Y.

To represent selection bias, perform the same analysis, but with a dataset including only those with S=1.  To allow for comparisons between the biased and bias-free models, we will sample from the original dataset with replpacement among those with S=1 so that the sample size remains 100,000.

```r
sel_bias <- glm(Y ~ X + C, family = binomial(link="logit"), 
                data = df[sample(1:nrow(df), n, replace = TRUE, df$S),])
exp(coef(sel_bias)[2])
exp(coef(sel_bias)[2] + summary(sel_bias)$coef[2, 2] * qnorm(.025))
exp(coef(sel_bias)[2] + summary(sel_bias)$coef[2, 2] * qnorm(.975))
```

OR<sub>YX</sub> = 1.32 (1.29, 1.36)

The odds ratio relating X to Y decreases from ~2 to ~1.3 when the analysis is conducted exclusively on those with S=1.  In a perfect world, an investigator would analyze data consisting of the exact same population as the population in which he or she would like to make inferences or a perfectly representative sample (i.e. target pop. = source pop.).  However, it is often not possible to collect data from the entire source population, and sometimes the selected sample will have collider stratification bias at \[S=1].  This bias analysis will allow for the adjustment of selection bias (S) even when data for S is unavailable.  We will instead rely on assumptions of how the exposure and outcome affect selection (each assumption corresponding to a bias parameter).  Using these assumptions, we will create a model to predict the probability of S, which will then be incorporated as a weight in the outcome regression.  This regression weight provides the bias adjustment.

Normally, the values of the bias parameters are obtained externally from the literature or from an internal validation sub-study.  However, for the purposes of this proof of concept, we can obtain the exact values of the uncertainty parameters.  We will perform the final regression of Y on X as if we are only analyzing those with S=1, but since we know the values of S we can model how S is affected by X and Y to obtain perfectly accurate bias parameters.

```r
s_model <- glm(S ~ X + Y, data = df, family = binomial(link = "logit"))
s_0 <- coef(s_model)[1] 
s_x <- coef(s_model)[2] 
s_y <- coef(s_model)[3] 
```
These parameters can be interpreted as follows:
* s_0 = log\[odds(S=1\|X=0, Y=0)]
* s_x = log\[odds(S=1\|X=1, Y=0)] / log\[odds(S=1\|X=0, Y=0)] i.e. the log odds ratio denoting the amount by which the log odds of S=1 changes for every 1 unit increase in X among the Y=0 subgroup.
* s_y = log\[odds(S=1\|X=0, Y=1)] / log\[odds(S=1\|X=0, Y=0)]

Now that values for the bias parameters have been obtained, use these values in the weights for the outcome regression.

We'll nest the analysis within a function so that values of the bias parameters can easily be changed. Bootstrapping will be used in order to obtain a confidence interval for the OR<sub>YX</sub> estimate. For the purposes of demonstration, we will only have 10 bootstrap samples, but more samples will be needed in practice. The steps in this analysis are as follows:

1. Sample with replacement from the dataset among rows with with S=1.
2. Predict the probability of S (pS) by combining the bias parameters with the data for X and Y in an expit function.
3. Using the sampled dataset (bdf), model the weighted logistic outcome regression \[P(Y=1)\| X, C]. The weight used in this regression is 1/pS, obtained in the previous step.

```r
adjust_sel <- function (cS, cSX, cSY) {
  set.seed(1234)
  est <- vector()
  nreps <- 10 #can vary number of bootstrap samples
  
  for(i in 1:nreps){
    bdf <- df[sample(1:nrow(df), n, replace = TRUE, df$S), ] #random samping with replacement among S=1
    
    pS <- plogis(cS + cSX * bdf$X + cSY * bdf$Y) #model the probability of S
    
    final <- glm(Y ~ X + C, family = binomial(link = "logit"), weights = (1/pS), data = bdf)
    est[i] <- coef(final)[2]
  }
  
  out <- list(exp(median(est)), exp(quantile(est, c(.025, .975))), hist(exp(est)))
  return(out)
}
```
We can run the analysis using different values of the bias parameters.  When we use the known, correct values for the bias parameters that we obtained earlier...

```r
adjust_sel(cS = s_0, cSX = s_x, cSY = s_y)
```
we obtain OR<sub>YX</sub> = 2.05 (2.01, 2.07), representing the bias-free effect estimate we expect.  The output also includes a histogram showing the distribution of the OR<sub>YX</sub> estimates from each bootstrap sample:

![Selhist](/background_series/Selhist.png)

We can analyze this plot to see how well the odds ratios converge.  If instead we use bias parameters that are each double the correct value:

```r
adjust_sel(cS = 2*s_0, cSX = 2*s_x, cSY = 2*s_y)
```
we obtain OR<sub>YX</sub> = 3.91 (3.84, 3.96), an incorrect estimate of effect.
