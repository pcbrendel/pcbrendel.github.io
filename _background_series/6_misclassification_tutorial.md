---
title: Adjustment for Exposure Misclassification 
subtitle: by Paul Brendel
---

### Full code used in this analysis is available [here](https://github.com/pcbrendel/biasanalysis)

First, generate a dataset with a sample size of 100,000. The following binary variables are defined:

* X = Exposure (1 = exposed, 0 = not exposed)
* Y = Outcome (1 = outcome, 0 = no outcome)
* C = Known Confounder (1 = present, 0 = absent)
* Xstar = Misclassified exposure (1 = exposed, 0 = not exposed)

```r
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
This data reflects the following causal relationship:

![MCdemo](/background_series/MCdemo.png)

From this dataset note that P(Y=1\|X=1, C=c, U=u) / P(Y=1\|X=0, C=c, U=u) should equal expit(log(2)).
Therefore, odds(Y=1\|X=1, C=c, U=u) / odds(Y=1\|X=0, C=c, U=u) = odds ratio (OR<sub>YX</sub>) = exp(log(2)) = 2.

Compare the biased (exposure misclassified) model to the bias-free model.

```r
no_bias <- glm(Y ~ X + C, family = binomial(link = "logit"), data = df)
exp(coef(no_bias)[2])
exp(coef(no_bias)[2] + summary(no_bias)$coef[2, 2] * qnorm(.025))
exp(coef(no_bias)[2] + summary(no_bias)$coef[2, 2] * qnorm(.975))
```
OR<sub>YX</sub> = 2.04 (1.99, 2.10)

This is the value we would expect based off of the derivation of Y.
```r
mc_bias <- glm(Y ~ Xstar + C, family = binomial(link = "logit"), data = df)
exp(coef(mc_bias)[2])
exp(coef(mc_bias)[2] + summary(mc_bias)$coef[2, 2] * qnorm(.025))
exp(coef(mc_bias)[2] + summary(mc_bias)$coef[2, 2] * qnorm(.975))
```
OR<sub>YX</sub> = 1.27 (1.24, 1.31)

The odds ratio relating X to Y decreases from ~2 to ~1.3 when the exposure (X) is misclassified (Xstar) in the model.  Misclassification is sometimes inevitable due to inaccurate measurement tools or human error.  This bias analysis will allow for correct inference even when Xstar is used instead of X.  We will rely on assumptions of how the misclassified exposure, outcome, and known confounder(s) affect the true exposure (each assumption corresponding to a bias parameter).  Using these assumptions, we will create a model to predict the probability of X, which will then be incorporated as a weight in the outcome regression.  This regression weight provides the bias adjustment.

Normally, the values of the bias parameters are obtained externally from the literature or from an internal validation sub-study.  However, for the purposes of this proof of concept, we can obtain the exact values of the uncertainty parameters.  We will perform the final regression of Y on Xstar instead of X, but since we know the values of X we can model how X is affected by Xstar, C, and Y to obtain perfectly accurate bias parameters.

```r
x_model <- glm(X ~ Xstar + C + Y, family = binomial(link = "logit"), data = df)
x_0     <- coef(x_model)[1]
x_xstar <- coef(x_model)[2]
x_c     <- coef(x_model)[3]
x_y     <- coef(x_model)[4]
```
These parameters can be interpreted as follows:
* x_0 = log\[odds(X=1\|Xstar=0, C=0, Y=0)]
* x_xstar = log\[odds(X=1\|Xstar=1, C=0, Y=0)] / log\[odds(X=1\|Xstar=0, C=0, Y=0)] i.e. the log odds ratio denoting the amount by which the log odds of X=1 changes for every 1 unit increase in Xstar among the C=0, Y=0 subgroup.
* x_c = log\[odds(X=1\|Xstar=0, C=1, Y=0)] / log\[odds(X=1\|Xstar=0, C=0, Y=0)]
* x_y = log\[odds(X=1\|Xstar=0, C=0, Y=1)] / log\[odds(X=1\|Xstar=0, C=0, Y=0)]

Now that values for the bias parameters have been obtained, use these values in the weight for the outcome regression.

We'll nest the analysis within a function so that values of the bias parameters can easily be changed. Bootstrapping will be used in order to obtain a confidence interval for the OR<sub>YX</sub> estimate. For the purposes of demonstration, we will only have 10 bootstrap samples, but more samples will be needed in practice. The steps in this analysis are as follows:

1. Sample with replacement from the dataset.
2. Predict the probability of X by combining the bias parameters with the data for X, C, and Y in an expit function.
3. Duplicate the sampled dataset (bdf) and merge these two copies. The new dataset is named 'combined'.
4. Assign variable Xbar, which equals 1 in the first data copy and equals 0 in the second data copy.
5. Create variable pX, which equals the probability of X in the first copy and equals 1 minus the probability of X in the second copy.
6. Using the combined dataset, model the weighted logistic outcome regression \[P(Y=1)\| Xsim, C]. The weight used in this regression is pX, obtained in the previous step.

```r
adjust_mc <- function (cX, cXXstar, cXC, cXY) {
  set.seed(1234)
  est <- vector()
  nreps <- 10 #can vary number of bootstrap samples
  
  for(i in 1:nreps){
    bdf <- df[sample(1:nrow(df), n, replace = TRUE), ] #random samping with replacement
    
    pX <- plogis(cX + cXXstar * bdf$Xstar + cXC * bdf$C + cXY * bdf$Y) #model the probability of X
    
    combined <- bdf[rep(seq_len(nrow(bdf)), 2), ] #duplicate data
    combined$Xbar <- rep(c(1, 0), each = n) #Xsim=1 in first copy, Xsim=0 in second copy
    combined$pX <- c(pX, 1 - pX) #when Xsim=1, pX is prob of X=1; when Xsim=0, pX is prob of X=0
    
    final <- glm(Y ~ Xsim + C, family = binomial(link = "logit"), weights = pX, data = combined)
    est[i] <- coef(final)[2]
  }
  
  out <- list(exp(median(est)), exp(quantile(est, c(.025, .975))), hist(exp(est)))
  return(out)
}
```
We can run the analysis using different values of the bias parameters.  When we use the known, correct values for the bias parameters that we obtained earlier...

```r
adjust_mc(cX = x_0, cXXstar = x_xstar, cXC = x_c, cXY = x_y)
```
we obtain OR<sub>YX</sub> = 2.04 (2.03, 2.05), representing the bias-free effect estimate we expect.  The output also includes a histogram showing the distribution of the OR<sub>YX</sub> estimates from each bootstrap sample:

![MChist](/background_series/MChist.png)

We can analyze this plot to see how well the odds ratios converge.  If instead we use bias parameters that are each double the correct value...

```r
adjust_mc(cX = 2*x_0, cXXstar = 2*x_xstar, cXC = 2*x_c, cXY = 2*x_y)
```
we obtain OR<sub>YX</sub> = 2.69 (2.67, 2.71), an incorrect estimate of effect.
