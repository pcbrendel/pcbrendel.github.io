---
title: Bias Analysis Methods
---

### Sensitivity Analysis

Traditional sensitivity analysis involves replacing the sources of uncertainty with fixed values.  The conventional analysis is then repeated with different values of the uncertainty parameters.  The consistency or any patterns in the resulting array of effect estimates can then be compared to the chosen values of the uncertainty parameters.  While this method is an improvement over completely ignoring bias in the analyses, it suffers from some key limitations: 1) this method becomes difficult as the number of bias parameters increases; 2) it usually does not demonstrate the full range of bias in the results; 3) the corrected estimates will not account for random error. 

An example of this method is seen in [this paper](https://academic.oup.com/ije/article/39/1/107/714781) by Groenwold et al.  In this example, different estimates of the exposure-outcome odds ratio are obtained by changing the values of: 1) the prevalence of the unmeasured confounder; 2) the confounder-exposure odds ratio; 3) the confounder-outcome odds ratio, conditional on the exposure.

### Monte Carlo Risk Analysis & Bayesian Uncertainty Assessment

The above method can be expanded by replacing the fixed values with specific probability distributions for each parameter via [Monte Carlo risk assessment or Bayesian methods](http://onlinelibrary.wiley.com/doi/10.1111/0272-4332.214136/abstract).

Monte Carlo methods, seen in a variety of different fields, rely on repeated random sampling to obtain numerical results.  In Monte Carlo risk assessment a value is drawn from the specified probability distribution for each bias parameter and the conventional analysis is performed using these values.  This process is repeated over different draws of the bias parameters.  Summaries of the distribution of the effect estimate are then presented.

Bayesian methods require that the investigator specify prior distributions (priors) for the unknown parameters.  Next, a model for the probability of the data given the parameters (i.e. the likelihood function) is created.  Lastly, the priors for unknown parameters are combined with the likelihood function to obtain a posterior distribution for the parameter of interest via Bayes' theorem.

An example of these two methods is seen in [this paper](https://www.ncbi.nlm.nih.gov/pubmed/15286024) by Steelandt and Greenland.  In this example, smoking is an uncontrolled confounder in a study of lung cancer in workers exposed to silica.  An SMR of 1.60 (1.31, 1.93) was observed comparing lung cancer deaths in the occupational cohort to the U.S. general population.

The SMR is divided by a bias factor to obtain an SMR adjusted for smoking.  The formula for this bias factor includes smoking prevalences (never, current, former) in the exposed and non-exposed.  It also includes the rate ratios for the current and former smokers versus nonsmokers in the exposed and non-exposed.  The Mone Carlo analysis proceeded by sampling 5,000 sets of the smoking proportions and rate ratios from their specified distributions to obtain 5,000 bias factors.  In addiiton, 5,000 samples were also taken from the distribution of the unadjusted SMR to add random-sampling error into the analysis.  Each of the bias factors was then used to adjust each of the smoking-unadjusted SMRs.

The Bayesian analysis used a data model that specified that the observed number of lung cancer deaths was from a Poisson distribution with mean equal to the expected number of deaths times the product of the (unknown) smoking-adjusted rate ratio and the bias factor.  The bias factor was calculated as in the Mone Carlo analysis and priors for the bias factor were the same distributions as were used in the Monte Carlo analysis. A non-informative prior was used for the smoking-adjusted rate ratio.  WinBUGS was used to obtain 100,000 samples of the smoking-adjusted rate ratio from the posterior distribution.

### External Adjustment

A variety of external adjustment formulas are also commonly used to adjust for bias.  Model-specific formulas are used to generate a bias factor, and this bias factor is subtracted or divided from the observed exposure-outcome effect estimate.  The resulting effect estimate is then considered free of the suspected source of bias, based on the assumptions used to generate the bias factor.

An example of bias analysis via external adjustment is seen in [this paper](http://www.bmj.com/content/347/bmj.f4533) by Goto et al.  In this example, the bias factor = (RR<sub>DZ</sub> * P<sub>Z1</sub> + 1 - P<sub>Z1</sub>) / (RR<sub>DZ</sub> * P<sub>Z0</sub> + 1 - P<sub>Z0</sub>), where RR<sub>DZ</sub> is the relative risk relating the uncontrolled confounder to the outcome, P<sub>Z1</sub> is the prevalence of the uncontrolled confounder in the exposed group, and P<sub>Z0</sub> is the prevalence of the uncontrolled confounder in the unexposed group.
 
### Multiple Imputation

All types of biases can be thought of as missing data problems.  [Multiple imputation](http://www.bmj.com/content/338/bmj.b2393) is a common approach to missing data in epidemiological studies.  This method involves four key steps:  (1) building a model to predict the missing vaules, (2) creating multiple copies of the dataset with the missing values replaced by imputed values, (3) fitting the model of interest to each of the imputeted datasets, and (4) averaging the results from each dataset together. 

This approach is based on the assumption that the data is [missing at random](https://en.wikipedia.org/wiki/Missing_data#Missing_at_random), i.e. missingness can be accounted for by the observed values.  Multiple imputation analyses will avoid bias only if enough variables predictive of missing values are included in the imputation model.

Multiple imputation methods applied to biases due to measurement error is demonstrated in [this paper](https://academic.oup.com/ije/article/35/4/1074/686404) by Cole, Chu and Greenland.  This study analyzed the relationship between (binary) glomerular filtration rate and end-stage renal disease in a hypothetical, simulated population.  Compared to the gold standard measurement used in the validation substudy, the exposure was mismeasured with 90% sensitivity and 70% specificity. The multiple imputation approach was found to adequately remove bias due to non-differential exposure misclassification and was more powerful than an analysis restricted to the validation sub-study.

### Regression Calibration

Regression calibration is a method generally applied to adjust for biases due to measurement/misclassification error.  Using data from an internal calibration study, the quantity E(X \| X\*) is estimated (where X = true, unknown exposure and X\* = mismeasured, known exposure).  The estimated quantity is then used in the outcome regression model, replacing the mismeasured exposure.
