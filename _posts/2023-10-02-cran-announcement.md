---
layout: post
title: The Multibias R Package is now Available on CRAN
tags: R
social-share: true
---

I decided to take the time to polish off the R package I had started around five years ago and finally get it over the finish line of a CRAN acceptance. Last week that goal was finally realized. You can check out the CRAN link [here](https://cran.r-project.org/web/packages/multibias/index.html).

It was very refreshing to revisit this old code and see a multitude of ametuer mistakes I had made. It's a sign of progress as a data scientist to look back and see that your old code looks like crap. Some of the biggest aspects of the code that needed attention included: adding unit testing, linting, adding single bias adjustments, providing more detail in the README, renaming the functions and variables, and providing code that derives the simulated data sets. The [R Packages](https://r-pkgs.org/) book was an immensely helpful resource to make sure I was thorough in including all the necessary components for the package.

Next I plan on adding functions that adjust for outcome misclassification, adding more functionality for continuous variables, and ensuring that all these changes are also incorporated in the [Shiny App](https://pcbrendel.shinyapps.io/multibias/).
