---
title: Quantitative Bias Analysis
---

Every causal effect estimate contains uncertainty. Quantitative bias analysis (QBA) is the family of methods used to make that uncertainty explicit when it comes from systematic error, the nonrandom threats to internal validity.

In principle, an observed estimate reflects three components: the true causal effect we want to know, random error, and systematic error. Random and systematic error both contribute to distorting the truth, but they are not the same problem and warrant different solutions.

**Random error** is the residual variability that would remain even if the study were perfectly designed and analyzed. It reflects incomplete knowledge about individuals and events, most often because we study a sample rather than the entire target population (or the broader population of everyone who shares the relevant biological experience). Random error is mainly reduced by larger samples and design choices that improve precision. It is usually quantified with a standard error and confidence interval.

**Systematic error**, also simply called bias, comes from nonrandom flaws in design, measurement, or analysis. The three main pillars of systematic error include: uncontrolled confounding, selection bias, and misclassification. Unlike random error, bias does not shrink automatically as the sample grows. To grapple with systematic error, investigators must utilize methods that depend on bias models. These models reflect the strength and direction of the various bias sources (unmeasured confounders, selection mechanisms, and misclassification rates). External data and/or reasoned assumptions can be integrated with these models.

QBA is the science of turning those assumptions into numbers: bias-adjusted effect estimates, tipping-point analyses, and intervals that reflect uncertainty in both sampling and bias. The [`multibias`](https://www.paulbrendel.com/multibias/) R package extends this workflow to multiple biases at once, which is increasingly important as studies grow more complex.

## Methods for QBA

### Simple Sensitivity Analysis

Traditional sensitivity analysis involves replacing sources of systematic uncertainty with **fixed, user-specified values** called **bias parameters**. A **bias model**—an algebraic relationship derived from study design and causal assumptions—maps those parameters to a **bias factor**, which is applied to the conventional (biased) effect estimate to obtain a bias-adjusted estimate. The analysis is repeated across a grid or range of plausible bias-parameter values. Patterns in the resulting array of adjusted estimates (how far estimates move toward or away from the null, and which parameter combinations are required to explain away an association) are then compared to the assumptions that produced them.

Sensitivity analysis in epidemiology has a long history. [Cornfield et al. (1959)](https://pubmed.ncbi.nlm.nih.gov/13621204/) famously asked whether a hypothetical unmeasured factor could account for the observed association between cigarette smoking and lung cancer — an early template for “how strong would confounding have to be?” [Greenland and Robins (1985)](https://pubmed.ncbi.nlm.nih.gov/4025298/) extended sensitivity methods to misclassification of exposure and confounders. [Greenland (1996)](https://pubmed.ncbi.nlm.nih.gov/9027513/) unified many of these ideas under a general framework for sensitivity analysis of biases and distinguished simple fixed-value approaches from probabilistic ones.

#### How it works

The workflow has four steps:

1. **Specify a bias model** for the suspected source of bias (uncontrolled confounding, selection, or misclassification), usually starting from a directed acyclic graph.
2. **Identify bias parameters**—quantities not identified from the observed data (e.g., the strength of an unmeasured confounder’s association with exposure and outcome).
3. **Assign fixed values** to each parameter, drawing on external studies, validation data, subject-matter knowledge, or deliberately conservative scenarios.
4. **Compute the bias-adjusted estimate** and repeat for other parameter combinations.

Results are often presented as a table (one row per scenario) or a tornado plot showing which parameters move the estimate most. A common inferential question is bias tipping: the combination of bias-parameter values that would shift the adjusted estimate to the null (or below a policy-relevant threshold), which helps readers judge whether residual confounding is a plausible explanation for the observed association.

#### Example

An accessible illustration is [Sensitivity analyses to estimate the potential impact of unmeasured confounding in causal research](https://academic.oup.com/ije/article/39/1/107/714781) by Groenwold et al. The authors consider an observational study with an observed exposure–outcome odds ratio that may be confounded by an unmeasured binary confounder. Under standard simplifying assumptions (binary confounder, constant effect of the confounder on the outcome within exposure strata, etc.), the corrected exposure–outcome odds ratio depends on three bias parameters:

1. The **prevalence** of the unmeasured confounder (often specified separately in exposed and unexposed groups, or as a prevalence difference)
2. The **confounder–exposure** association (e.g., an odds ratio)
3. The **confounder–outcome** association, conditional on exposure

The investigator chooses plausible values for each parameter and applies the corresponding bias formula to obtain an adjusted odds ratio. Repeating the calculation across a grid of values shows how strongly the conclusion depends on assumptions about the unmeasured confounder. If only extreme, implausible parameter combinations move the adjusted estimate to the null, the observed association is more robust to confounding than if modest, realistic values can explain it away.

#### Limitations

Simple sensitivity analysis is a substantial improvement over ignoring bias, but it has important limits:

1. **Curse of dimensionality** — Each additional bias parameter multiplies the number of scenarios to consider. Adjusting for two or three biases simultaneously quickly becomes unwieldy without automation.
2. **Incomplete exploration of uncertainty** — Fixing parameters to point values does not describe how uncertain those inputs are. A grid may miss combinations that matter, and readers can disagree about which scenarios are “plausible.”
3. **Limited uncertainty quantification** — Under fixed bias parameters, the sampling variance of the conventional estimate often carries over to the bias-adjusted point estimate (e.g., for simple additive corrections), but the analysis does **not** incorporate uncertainty in the bias parameters themselves. Interval estimates that reflect both random and systematic error require probabilistic bias analysis (below).
4. **Dependence on the bias model** — Adjusted estimates are only as credible as the structural assumptions encoded in the bias model; misspecified models can give a false sense of security.

Despite these limits, simple sensitivity analysis remains the most common entry point to quantitative bias analysis and is often sufficient to show whether a finding is fragile or robust to reasonable bias scenarios.

### Bayesian Bias Analysis

The above method can be expanded by replacing the fixed values with specific probability distributions for each parameter via [Monte Carlo risk assessment or Bayesian methods](http://onlinelibrary.wiley.com/doi/10.1111/0272-4332.214136/abstract).

Monte Carlo methods, seen in a variety of different fields, rely on repeated random sampling to obtain numerical results.  In Monte Carlo risk assessment a value is drawn from the specified probability distribution for each bias parameter and the conventional analysis is performed using these values.  This process is repeated over different draws of the bias parameters.  Summaries of the distribution of the effect estimate are then presented.

Bayesian methods require that the investigator specify prior distributions (priors) for the unknown parameters.  Next, a model for the probability of the data given the parameters (i.e. the likelihood function) is created.  Lastly, the priors for unknown parameters are combined with the likelihood function to obtain a posterior distribution for the parameter of interest via Bayes' theorem.

An example of these two methods is seen in [this paper](https://www.ncbi.nlm.nih.gov/pubmed/15286024) by Steelandt and Greenland.  In this example, smoking is an uncontrolled confounder in a study of lung cancer in workers exposed to silica.  An SMR of 1.60 (1.31, 1.93) was observed comparing lung cancer deaths in the occupational cohort to the U.S. general population.

The SMR is divided by a bias factor to obtain an SMR adjusted for smoking.  The formula for this bias factor includes smoking prevalences (never, current, former) in the exposed and non-exposed.  It also includes the rate ratios for the current and former smokers versus nonsmokers in the exposed and non-exposed.  The Monte Carlo analysis proceeded by sampling 5,000 sets of the smoking proportions and rate ratios from their specified distributions to obtain 5,000 bias factors.  In addition, 5,000 samples were also taken from the distribution of the unadjusted SMR to add random-sampling error into the analysis.  Each of the bias factors was then used to adjust each of the smoking-unadjusted SMRs.

The Bayesian analysis used a data model that specified that the observed number of lung cancer deaths was from a Poisson distribution with mean equal to the expected number of deaths times the product of the (unknown) smoking-adjusted rate ratio and the bias factor.  The bias factor was calculated as in the Monte Carlo analysis and priors for the bias factor were the same distributions as were used in the Monte Carlo analysis. A non-informative prior was used for the smoking-adjusted rate ratio.  WinBUGS was used to obtain 100,000 samples of the smoking-adjusted rate ratio from the posterior distribution.

### External Adjustment

A variety of external adjustment formulas are also commonly used to adjust for bias.  Model-specific formulas are used to generate a bias factor, and this bias factor is subtracted or divided from the observed exposure-outcome effect estimate.  The resulting effect estimate is then considered free of the suspected source of bias, based on the assumptions used to generate the bias factor.

An example of bias analysis via external adjustment is seen in [this paper](http://www.bmj.com/content/347/bmj.f4533) by Goto et al.  In this example, the bias factor = (RR<sub>DZ</sub> * P<sub>Z1</sub> + 1 - P<sub>Z1</sub>) / (RR<sub>DZ</sub> * P<sub>Z0</sub> + 1 - P<sub>Z0</sub>), where RR<sub>DZ</sub> is the relative risk relating the uncontrolled confounder to the outcome, P<sub>Z1</sub> is the prevalence of the uncontrolled confounder in the exposed group, and P<sub>Z0</sub> is the prevalence of the uncontrolled confounder in the unexposed group.

### Multiple Imputation

All types of biases can be thought of as missing data problems.  [Multiple imputation](http://www.bmj.com/content/338/bmj.b2393) is a common approach to missing data in epidemiological studies.  This method involves four key steps:  (1) building a model to predict the missing values, (2) creating multiple copies of the dataset with the missing values replaced by imputed values, (3) fitting the model of interest to each of the imputed datasets, and (4) averaging the results from each dataset together.

This approach is based on the assumption that the data is [missing at random](https://en.wikipedia.org/wiki/Missing_data#Missing_at_random), i.e. missingness can be accounted for by the observed values.  Multiple imputation analyses will avoid bias only if enough variables predictive of missing values are included in the imputation model.

Multiple imputation methods applied to biases due to measurement error is demonstrated in [this paper](https://academic.oup.com/ije/article/35/4/1074/686404) by Cole, Chu and Greenland.  This study analyzed the relationship between (binary) glomerular filtration rate and end-stage renal disease in a hypothetical, simulated population.  Compared to the gold standard measurement used in the validation substudy, the exposure was mismeasured with 90% sensitivity and 70% specificity. The multiple imputation approach was found to adequately remove bias due to non-differential exposure misclassification and was more powerful than an analysis restricted to the validation sub-study.

### Regression Calibration

Regression calibration is a method generally applied to adjust for biases due to measurement (misclassification) error.  Using data from an internal calibration study, the quantity E(X \| X\*) is estimated (where X = true, unknown exposure and X\* = mismeasured, known exposure).  The estimated quantity is then used in the outcome regression model, replacing the mismeasured exposure.

[example]

Key assumptions required for validity:

1. Non-differential measurement error: the measurement error is completely independent of the outcome variable
2. Linearity: The relationship between the true exposure and the proxy variable in the calibration step must be correctly specified (usually assumed to be linear)
3. Transportability: The relationship between the true exposure and the proxy found in the validation sub-study must accurately reflect the relationship in the main study population.

## E-Value
