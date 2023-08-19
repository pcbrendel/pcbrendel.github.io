---
title: Adjustment for Uncontrolled Confounding
---

### Full code used in this analysis is available [here](https://github.com/pcbrendel/biasanalysis)

First, generate a dataset with a sample size of 100,000. The following binary variables are defined:

* X = Exposure (1 = exposed, 0 = not exposed)
* Y = Outcome (1 = outcome, 0 = no outcome)
* C = Known Confounder (1 = present, 0 = absent)
* U = Unknown Confounder (1 = present, 0 = absent)

```r
set.seed(1234)
n <- 100000

C <- rbinom(n, 1, .5)
U <- rbinom(n, 1, .5)
X  <- rbinom(n, 1, plogis(-.5 + .5 * C + 1.5 * U))
Y  <- rbinom(n, 1, plogis(-.5 + log(2) * X + .5 * C + 1.5 * U))

df <- data.frame(X, Y, C, U)
rm(C, U, X, Y)
```
This data reflects the following causal relationship:

![UCdemo](img/UCdemo.png)

From this dataset note that P(Y=1\|X=1, C=c, U=u) / P(Y=1\|X=0, C=c, U=u) should equal expit(log(2)).
Therefore, odds(Y=1\|X=1, C=c, U=u) / odds(Y=1\|X=0, C=c, U=u) = odds ratio (OR<sub>YX</sub>) = exp(log(2)) = 2.

Compare the biased (confounded) model to the bias-free model.

```r
no_bias <- glm(Y ~ X + C + U, family = binomial(link = "logit"), data = df)
exp(coef(no_bias)[2])
exp(coef(no_bias)[2] + summary(Nobias)$coef[2, 2] * qnorm(.025))
exp(coef(no_bias)[2] + summary(Nobias)$coef[2, 2] * qnorm(.975))
```
OR<sub>YX</sub> = 2.02 (1.96, 2.09)

This is the value we would expect based off of the derivation of Y.

```r
uc_bias <- glm(Y ~ X + C, family = binomial(link = "logit"), data = df)
exp(coef(uc_bias)[2])
exp(coef(uc_bias)[2] + summary(uc_bias)$coef[2, 2] * qnorm(.025))
exp(coef(uc_bias)[2] + summary(uc_bias)$coef[2, 2] * qnorm(.975))
```
OR<sub>YX</sub> = 3.11 (3.03, 3.20)

The odds ratio relating X to Y increases from ~2 to ~3 when the confounder U is not adjusted for in the model.  In a perfect world, an investigator would simply make sure to control for all confounding variables in the analysis.  However, it may not be feasible or possible to collect data on certain variables.  This bias analysis will allow for the adjustment of uncontrolled confounders (U) even when data for U is unavailable.  We will instead rely on assumptions of how the exposure, outcome, and known confounder(s) affect the unknown confounder (each assumption corresponding to a bias parameter).  Using these assumptions, we will create a model to predict the probability of U, which will then be incorporated as a weight in the outcome regression.  This regression weight provides the bias adjustment.

Normally, the values of the bias parameters are obtained externally from the literature or from an internal validation sub-study.  However, for the purposes of this proof of concept, we can obtain the exact values of the uncertainty parameters.  We will perform the final regression of Y on X as if we don't have data on U, but since we know the values of U we can model how U is affected by X, C, and Y to obtain perfectly accurate bias parameters. 

```r
u_model <- glm(U ~ X + C + Y, family = binomial(link = "logit"), data = df)
u_0 <- coef(u_model)[1]
u_x <- coef(u_model)[2]
u_c <- coef(u_model)[3]
u_y <- coef(u_model)[4]
```
These parameters can be interpreted as follows:
* u_0 = log\[odds(U=1\|X=0, C=0, Y=0)]
* u_x = log\[odds(U=1\|X=1, C=0, Y=0)] / log\[odds(U=1\|X=0, C=0, Y=0)] i.e. the log odds ratio denoting the amount by which the log odds of U=1 changes for every 1 unit increase in X among the C=0, Y=0 subgroup.
* u_c = log\[odds(U=1\|X=0, C=1, Y=0)] / log\[odds(U=1\|X=0, C=0, Y=0)]
* u_y = log\[odds(U=1\|X=0, C=0, Y=1)] / log\[odds(U=1\|X=0, C=0, Y=0)]

Now that values for the bias parameters have been obtained, use these values in the weight for the outcome regression.

We'll nest the analysis within a function so that values of the bias parameters can easily be changed. Bootstrapping will be used in order to obtain a confidence interval for the OR<sub>YX</sub> estimate. For the purposes of demonstration, we will only have 10 bootstrap samples, but more samples will be needed in practice. The steps in this analysis are as follows:

1. Sample with replacement from the dataset.
2. Predict the probability of U by combining the bias parameters with the data for X, C, and Y in an expit function. 
3. Duplicate the sampled dataset (bdf) and merge these two copies. The new dataset is named 'combined'.
4. Assign variable Ubar, which equals 1 in the first data copy and equals 0 in the second data copy.
5. Create variable pU, which equals the probability of U in the first copy and equals 1 minus the probability of U in the second copy.
6. Using the combined dataset, model the weighted logistic outcome regression \[P(Y=1)\| X, C, Usim]. The weight used in this regression is pU, obtained in the previous step.

```r
adjust_uc <- function (cU, cUX, cUC, cUY) {
  set.seed(1234)
  est <- vector()
  nreps <- 10 
  
  for(i in 1:nreps){
    bdf <- df[sample(1:nrow(df), n, replace=TRUE), ]
    
    pU <- plogis(cU + cUX * bdf$X + cUC * bdf$C + cUY * bdf$Y)
    
    combined <- bdf[rep(seq_len(nrow(bdf)), 2), ]
    combined$Ubar <- rep(c(1, 0), each=n) 
    combined$pU <- c(pU, 1 - pU) 
    
    Final <- glm(Y ~ X + C + Ubar, family=binomial(link="logit"), weights=pU, data=combined)
    est[i] <- coef(Final)[2]
  }
  
  out <- list(exp(median(est)), exp(quantile(est, c(.025, .975))), hist(exp(est)))
  return(out)
}
```

We can run the analysis using different values of the bias parameters.  When we use the known, correct values for the bias parameters that we obtained earlier:

```r
adjust_uc(cU = u_0, cUX = u_x, cUC = u_c, cUY = u_y)
```
we obtain OR<sub>YX</sub> = 2.02 (1.98, 2.06), representing the bias-free effect estimate we expect.  The output also includes a histogram showing the distribution of the OR<sub>YX</sub> estimates from each bootstrap sample:

![UChist](img/UChist.png)

We can analyze this plot to see how well the odds ratios converge.  If instead we use bias parameters that are each double the correct value:

```r
adjust_uc(cU = 2*u_0, cUX = 2*u_x, cUC = 2*u_c, cUY = 2*u_y)
```
we obtain OR<sub>YX</sub> = 0.80 (0.79, 0.82), an incorrect estimate of effect.

