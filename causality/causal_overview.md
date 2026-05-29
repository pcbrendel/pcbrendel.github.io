---
title: Causal Overview
---

Everyone gets taught that **correlation does not imply causation**. But what about the case in which an association is both correlative and causative? What exactly does this imply?

Scientists and philosophers have been wrapping their heads around this for centuries. An English statistician named Bradford Hill went about creating a list of [rules](https://en.wikipedia.org/wiki/Bradford_Hill_criteria) for determining causality. This early attempt still serves as a useful heuristic to this day, but the gap in the development of more formal criteria for causality was present until a few decades ago.

Influential work by pioneers like Neyman, Rubin, and Pearl has shaped the modern understanding of the language and statistics of causality. Thanks in part to their work, we have the field of causal inference, the science of understanding how and with what strength an exposure influences an outcome.

### The Fundamental Problem of Causal Inference

To understand the concept of causality, we must first understand what is meant by a *causal effect*.

A causal effect represents the difference or ratio between some quantifiable outcome under two different exposure scenarios. In a perfect world, a doctor could give a person Drug A, observe the response, turn back time, give that person Drug B, observe the response, then compare the response between the two drugs to see which was superior. This difference in response would represent a true causal effect.

The reason there's a causal interpretation here is that the only difference between the two scenarios was the drug; every other factor (person, place, time) was identical.

Since we can't time travel, we only ever observe one outcome — the one that actually occurs. Our inability to observe the counterfactual is often called the fundamental problem of causal inference.

The best we can do is to reason in terms of **potential outcomes**. We must infer what the outcome *would have been* under a different exposure. For example, we can observe the average outcome in a large sample of patients taking Drug A and compare it to the average outcome in a different sample taking Drug B, ensuring the two groups are as similar as possible via study design or statistical analysis. When those groups are sufficiently exchangeable, the Drug B group's outcome serves as a valid stand-in for *what would have happened* to the Drug A group had they not received the drug.

### A Tale of Two Frameworks

This intuition is formalized by two primary frameworks:

First introduced by Neyman in 1923 and later extended by Donald Rubin into a general framework, the **Potential Outcomes Model** formalizes counterfactuals.

An individual causal effect exists when the value of an outcome under one exposure (Y<sub>a=1</sub>) differs from the value it would take under a different exposure (Y<sub>a=0</sub>), with all other factors held identical. Since only one exposure can occur at a time, only one of these potential outcomes is ever observable — the other remains hypothetical, or counterfactual. A population-level effect exists when the proportion of subjects who experience an outcome under one exposure (P[Y<sub>a=1</sub>=1]) differs from the proportion who experience it under a different exposure (P[Y<sub>a=0</sub>=1]).

Rubin elevated the importance of stating **causal assumptions** before proceeding with analyses. All causal analyses are grounded in causal assumptions. In peer-reviewed research it is common practice to explicitly state these assumptions before proceeding with any analysis. Some of the core assumptions include: exchangeability (no unmeasured confounding), positivity (everyone has a non-zero probability of every possible treatment or exposure level), and consistency (well-defined interventions).

Beginning in the 1990s, Pearl introduced a parallel framework, **Structural Causal Models**.

Pearl's journey started with introducing Bayesian Networks and probabilistic uncertainty to the world of AI. Having realized that probability alone cannot detect cause and effect relationships in these networks, he set his sights on the field of causality.

Pearl developed an approach that unifies Directed Acyclic Graphs and structural equations into a single method for testing causal assumptions. Structural Causal Models define how the world works; they lay out the data-generating mechanisms, structural equations, and counterfactuals.

This *specification* then sets up the *identification*: given the Structural Causal Model and observed data, can my causal question be answered? Pearl's *do*-calculus is the identification engine that provides a mathematical language for calculating the effects of interventions. It confirms whether a causal query (with a *do* expression) can be transformed into an expression that only contains observed data.

### Why it all Matters

The techniques and toolkit of modern causal inference methods largely draw on the work of Rubin and Pearl, but they are constantly evolving. Through this website I do my best to teach myself and others about this fascinating world.

Having a society of strong causal reasoning and evidence is essential for progress, both in terms of surfacing important relationships (smoking and cancer) and refuting erroneous relationships (vaccines and autism).
