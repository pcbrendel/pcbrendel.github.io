---
title: Quantitative Bias Analysis
---

Every causal effect estimate contains uncertainty. Quantitative bias analysis (QBA) is the family of methods used to make that uncertainty explicit when it comes from systematic error, the nonrandom threats to internal validity.

In principle, an observed estimate reflects three components: the true causal effect we want to know, random error, and systematic error. Random and systematic error both contribute to distorting the truth, but they are not the same problem and warrant different solutions.

**Random error** is the residual variability that would remain even if the study were perfectly designed and analyzed. It reflects incomplete knowledge about individuals and events, most often because we study a sample rather than the entire target population (or the broader population of everyone who shares the relevant biological experience). Random error is mainly reduced by larger samples and design choices that improve precision. It is usually quantified with a standard error and confidence interval.

**Systematic error**, also simply called bias, comes from nonrandom flaws in design, measurement, or analysis. The three main pillars of systematic error include: uncontrolled confounding, selection bias, and misclassification. Unlike random error, bias does not shrink automatically as the sample grows. To grapple with systematic error, investigators must utilize methods that depend on bias models. These models reflect the strength and direction of the various bias sources (unmeasured confounders, selection mechanisms, and misclassification rates). External data and/or reasoned assumptions can be integrated with these models.

QBA is the science of turning those assumptions into numbers: bias-adjusted effect estimates, tipping-point analyses, and intervals that reflect uncertainty in both sampling and bias. The [`multibias`](https://www.paulbrendel.com/multibias/) R package extends this workflow to multiple biases at once, which is increasingly important as studies grow more complex.

## Methods for QBA

### 1. Simple Sensitivity Analysis

Traditional sensitivity analysis involves replacing sources of systematic uncertainty with **fixed, user-specified values** called **bias parameters**. A **bias model**—an algebraic relationship derived from study design and causal assumptions—maps those parameters to a **bias factor**, which is applied to the conventional (biased) effect estimate to obtain a bias-adjusted estimate. The analysis is typically repeated across a grid or range of plausible bias-parameter values. Patterns in the resulting array of adjusted estimates (how far estimates move toward or away from the null, and which parameter combinations are required to explain away an association) are then compared to the assumptions that produced them.

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

#### External adjustment

The steps above describe scanning a range of assumed values, but the same bias model can also be applied once, with bias parameters taken directly from an external source: a published estimate of the confounder–outcome association, a validation substudy, or surveillance data on confounder prevalence. This is usually called **external adjustment**. A model-specific formula generates a bias factor, and the observed exposure–outcome effect estimate is then adjusted by subtracting or dividing by that factor. The result is a single bias-adjusted estimate rather than an array of scenarios, considered free of the suspected bias conditional on the assumptions used to generate the bias factor.

An example is seen in [Goto et al. (2013)](https://www.bmj.com/content/347/bmj.f4533). Here, the bias factor = (RR<sub>DZ</sub> \* P<sub>Z1</sub> + 1 - P<sub>Z1</sub>) / (RR<sub>DZ</sub> \* P<sub>Z0</sub> + 1 - P<sub>Z0</sub>), where RR<sub>DZ</sub> is the relative risk relating the uncontrolled confounder to the outcome, P<sub>Z1</sub> is the prevalence of the uncontrolled confounder in the exposed group, and P<sub>Z0</sub> is the prevalence of the uncontrolled confounder in the unexposed group. This is the same confounding bias model used in the Groenwold example above, reparameterized: the confounder–exposure association is carried by the two prevalences rather than specified as a separate odds ratio.

External adjustment carries one assumption that scanning a grid does not: **transportability**. The borrowed parameters must describe the study population as well as they describe the population they came from. Where that is doubtful, the external estimate is better treated as the center of a distribution than as a known constant — which is the step taken in the next section.

#### Limitations

Simple sensitivity analysis is a substantial improvement over ignoring bias, but it has important limits:

1. **Curse of dimensionality** — Each additional bias parameter multiplies the number of scenarios to consider. Adjusting for two or three biases simultaneously quickly becomes unwieldy without automation.
2. **Incomplete exploration of uncertainty** — Fixing parameters to point values does not describe how uncertain those inputs are. A grid may miss combinations that matter, and readers can disagree about which scenarios are “plausible.”
3. **Limited uncertainty quantification** — Under fixed bias parameters, the sampling variance of the conventional estimate often carries over to the bias-adjusted point estimate (e.g., for simple additive corrections), but the analysis does **not** incorporate uncertainty in the bias parameters themselves. Interval estimates that reflect both random and systematic error require probabilistic bias analysis (below).
4. **Dependence on the bias model** — Adjusted estimates are only as credible as the structural assumptions encoded in the bias model; misspecified models can give a false sense of security.

Despite these limits, simple sensitivity analysis remains the most common entry point to quantitative bias analysis and is often sufficient to show whether a finding is fragile or robust to reasonable bias scenarios.

### 2. Probabilistic - Monte Carlo Bias Analysis

The above method can be expanded by replacing the fixed values with specific probability distributions for each parameter via [Monte Carlo risk assessment or Bayesian methods](https://onlinelibrary.wiley.com/doi/10.1111/0272-4332.214136). Doing so addresses the second and third limitations of simple sensitivity analysis directly: instead of asking the reader to judge a handful of hand-picked scenarios, the analyst states how uncertain each bias parameter is and lets that uncertainty propagate into the final estimate.

Monte Carlo methods, seen in a variety of different fields, rely on repeated random sampling to obtain numerical results. In Monte Carlo risk assessment a value is drawn from the specified probability distribution for each bias parameter and the conventional analysis is performed using these values. This process is repeated over different draws of the bias parameters. Summaries of the distribution of the effect estimate are then presented. In epidemiology this approach usually goes by the name **probabilistic bias analysis**.

[Lash and Fink (2003)](https://pubmed.ncbi.nlm.nih.gov/12843771/) introduced a semi-automated implementation that propagates systematic and random error together, and [Fox, Lash, and Greenland (2005)](https://pubmed.ncbi.nlm.nih.gov/16172102/) extended it to misclassified binary variables at the record level. [Greenland (2005)](https://academic.oup.com/jrsssa/article/168/2/267/7084313) placed these methods in a general multiple-bias modeling framework, where several bias parameters are simulated jointly rather than one bias at a time.

#### How it works

The workflow parallels simple sensitivity analysis, with distributions in place of fixed values:

1. **Specify a bias model** for the suspected source of bias, exactly as in simple sensitivity analysis.
2. **Assign a probability distribution** to each bias parameter rather than a point value. Trapezoidal, beta, normal, and log-normal distributions are the usual choices, informed by validation data, external literature, or expert judgment. Parameters that are not independent—sensitivity and specificity, or confounder prevalence in the exposed and unexposed—should be drawn jointly rather than separately.
3. **Simulate.** On each iteration, draw one value per parameter, compute the bias factor, apply it to the conventional estimate, and add a random-error draw so that sampling error and systematic error propagate together.
4. **Summarize.** Repeat several thousand times and describe the resulting distribution of adjusted estimates: the median is the bias-adjusted point estimate, and the 2.5th and 97.5th percentiles give a **simulation interval** that reflects both systematic and random error.

Results are typically shown as a histogram or density of the adjusted estimates alongside the conventional estimate and its confidence interval, which makes plain how far the adjustment moves the finding and how the interval changes once bias uncertainty is admitted. Draws that imply impossible values—negative adjusted cell counts under a misclassification correction, for example—are conventionally discarded, and the share of draws discarded is itself informative about whether the assumed distributions are coherent with the observed data.

#### Example

[Steenland and Greenland (2004)](https://pubmed.ncbi.nlm.nih.gov/15286024/) performed an analysis of lung cancer in workers exposed to silica, where smoking is an uncontrolled confounder. An SMR of 1.60 (1.31, 1.93) was observed comparing lung cancer deaths in the occupational cohort to the U.S. general population.

The SMR is divided by a bias factor to obtain an SMR adjusted for smoking. The formula for this bias factor includes smoking prevalences (never, current, former) in the exposed and non-exposed. It also includes the rate ratios for the current and former smokers versus nonsmokers in the exposed and non-exposed. The Monte Carlo analysis proceeded by sampling 5,000 sets of the smoking proportions and rate ratios from their specified distributions to obtain 5,000 bias factors. In addition, 5,000 samples were also taken from the distribution of the unadjusted SMR to add random-sampling error into the analysis. Each of the bias factors was then used to adjust each of the smoking-unadjusted SMRs.

The result was an adjusted SMR of 1.43 with 95% Monte Carlo limits of 1.15 to 1.78, against a conventional 1.60 (1.31, 1.93). Adjusting for smoking moved the estimate toward the null and left a slightly wider interval on the ratio scale — one that now covers systematic as well as random error.

#### Limitations

1. **Garbage in, garbage out** — The output distribution is only as credible as the input distributions. A confidently narrow distribution placed on a poorly known parameter produces a falsely narrow simulation interval, which is arguably worse than an honest grid of scenarios.
2. **Independence assumptions** — Drawing parameters independently when they are in fact correlated can either understate or overstate the spread of the adjusted estimate, depending on the direction of the correlation.
3. **Not a posterior** — A simulation interval is not a Bayesian credible interval, and it carries no guaranteed frequentist coverage. It summarizes uncertainty *under* the assumed bias model; it does not update beliefs about the bias parameters using the observed data.
4. **Dependence on the bias model** — As with fixed-value analysis, distributions over the parameters do nothing to rescue a misspecified structure.

The [`multibias`](https://www.paulbrendel.com/multibias/) package implements exactly this step from simple to probabilistic: each bias parameter can be supplied either as a single value or as a probability distribution, and several biases can be adjusted for simultaneously.

### 3. Probabilistic - Bayesian Bias Analysis

Bayesian analysis takes the same distributions one step further. In a Monte Carlo analysis the input distributions pass through the calculation untouched, whereas in a Bayesian analysis they become genuine priors that the data update: the posterior for a bias parameter can differ from the prior it started as, because some parameter values fit the observed data better than others.

Bayesian methods require that the investigator specify prior distributions (priors) for the unknown parameters. Next, a model for the probability of the data given the parameters (i.e. the likelihood function) is created. Lastly, the priors for unknown parameters are combined with the likelihood function to obtain a posterior distribution for the parameter of interest via Bayes' theorem.

This framing recasts everything above it. [Greenland (2009)](https://pubmed.ncbi.nlm.nih.gov/19744933/) points out that a conventional analysis — one reporting an estimate and confidence interval with no bias adjustment at all — is already a Bayesian analysis in disguise, one that places every bias parameter at the null *with certainty*. The question is never whether to use a prior for bias, but whether to use a defensible one or an implausibly confident one.

#### How it works

1. **Specify a bias model**, exactly as in the previous two methods.
2. **Place priors on every unknown.** Bias parameters get informative priors — this is where the substantive knowledge lives — while the target effect usually gets a weak or non-informative prior, so that the data drive the effect estimate and the priors drive the bias correction.
3. **Write the likelihood**: a full probability model for the observed data given both the target parameter and the bias parameters.
4. **Sample from the posterior**, historically with WinBUGS and now more often with JAGS or Stan, then summarize it — the posterior median as the adjusted point estimate, and the 2.5th and 97.5th percentiles as a **credible interval**.

The defining structural feature is that bias parameters cannot be learned from the data. Consider two accounts of the same study: a strong exposure effect with no confounding, and a negligible effect with heavy confounding by an unmeasured variable. Both can produce exactly the same observed distribution of exposure and outcome. No amount of additional data will separate them, because the variable that would separate them is the one nobody measured. Parameters in this situation are called **nonidentified**.

This breaks a rule of thumb that holds almost everywhere else in Bayesian analysis. Normally a prior matters most when data are scarce and progressively stops mattering as they accumulate: the likelihood sharpens and eventually overwhelms whatever you started with. That reassurance applies only to parameters the data can speak to. For a nonidentified bias parameter the likelihood is flat (shifting the parameter does not change how well the model fits what you observed) and multiplying a prior by something flat returns the prior. Its posterior is therefore roughly what you put in, at any sample size. A prior on the prevalence of an unmeasured confounder is load-bearing permanently, which is why prior sensitivity analysis heads the list of limitations below. This is all intended behavior rather than a defect: the analysis reports that the data carry no information on the point in question instead of manufacturing some. The data are not wholly silent, though: they can still rule out certain *combinations* of bias parameters, which is why a joint posterior can shift even when no single parameter does.

Greenland (2009) also shows that these models can be fit with ordinary missing-data machinery: treat the unmeasured confounder or the true exposure as missing, convert the priors into augmented data records, and apply standard complete-data methods to the augmented set. This makes it straightforward to fold in validation or second-stage data where it exists.

#### Example

Steenland and Greenland performed a Bayesian analysis of the same silica cohort described above. The data model specified that the observed number of lung cancer deaths was from a Poisson distribution with mean equal to the expected number of deaths times the product of the (unknown) smoking-adjusted rate ratio and the bias factor. The bias factor was calculated as in the Monte Carlo analysis and priors for the bias factor were the same distributions as were used in the Monte Carlo analysis. A non-informative prior was used for the smoking-adjusted rate ratio. WinBUGS was used to obtain 100,000 samples of the smoking-adjusted rate ratio from the posterior distribution.

Because the priors matched the Monte Carlo input distributions exactly, the two analyses are directly comparable — and they agreed closely, with 95% posterior limits of 1.13 to 1.84 against Monte Carlo limits of 1.15 to 1.78. The posterior interval is the wider of the two.

#### Limitations

1. **The priors carry the nonidentified parameters** — Because the data cannot inform bias parameters, their posteriors never fully escape their priors. Reporting results under several plausible priors is essential rather than optional.
2. **Intuition is an unreliable guide** — [Gustafson and Greenland (2006)](https://pubmed.ncbi.nlm.nih.gov/16220473/) document cases where Bayesian misclassification adjustment behaves in ways most analysts would not predict: adjustment can *weaken* the evidence about the direction of an association, and admitting uncertainty about the misclassification parameters can *narrow* rather than widen the interval estimate.
3. **Computational burden** — Posterior sampling requires convergence diagnostics, and weakly identified models tend to mix poorly. This is considerably more machinery than a Monte Carlo loop.
4. **Dependence on the bias model** — As with both methods above, none of this rescues a misspecified structure.

How much the extra machinery buys you is an empirical question. [MacLehose and Gustafson (2012)](https://pubmed.ncbi.nlm.nih.gov/22157311/) compared probabilistic bias analysis against fully Bayesian adjustment for exposure misclassification in case-control studies, and found the two perform about equally well outside of a few detectable cases involving unrealistic prior specifications. The choice between the second and third methods is therefore often practical — what the software supports, whether validation data needs to be folded in, whether the data are informative about any of the bias parameters — rather than philosophical.
