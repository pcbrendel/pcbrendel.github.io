---
layout: post
title: Scraping Non-table Content Using rvest
tags: [R, rvest, scraping]
---

A friend of mine was looking for a reference to help him make some choices about which books to order and the quality of the pricing. Essentially, he wanted to see what competitor outlets were offering for different books.

He asked whether there was a way to efficiently collect this information from a few websites in spreadsheet form. The information on these sites was not in table form, so even if he wanted to spend the time manually copying and pasting the tables it wasn't possible.

I used the `rvest` package from Hadley Wickham to scrape the data from the websites and thought I'd walk through my code and approach. I'll use [BookDepot](http://www.bookdepot.com) as an example.

When you click on the browse link you see the basic structure of the site; books are listed with a mixture of images and text. Much of the information we want is visible without having to crawl through the  books links: book title, ISBN number, author, book category, and the list price. The price of the book for those purchasing through BookDepot is show in the orange circle overlapping the book image.

![alt text](image "book depot browse")

First, we can see that there are 10,000 total books listed in 417 pages of 24 books each. I'd rather not loop through 417 pages, so we can adjust the link such that the books will be displayed in fewer pages. We can use the following link and adjust it so that we are starting on the first page and the page will display 1000 results: http://www.bookdepot.com/Store/Browse?page=1&size=1000&sort=arrival_1.

Next, we need to figure out how each of these elements are structured in the page's underlying html code. In many cases, it's a great idea to start by using Hadley's SelectorGadget tool. You can select different elements and see what node to note when using `rvest` to extract the content. You can also deselect elements that are not relevant so that you get the specific element you need without any extraneous results. 

Let's use the book's ISBN as an example. When you select the ISBN you not only get that element, but the type of binding (paperback or hardcover) as well as the genre (fiction, etc.). You will see the number of total elements in parentheses. Here we see 4000. Of course, we only want 1000, so we need to remove some things.

You can select different elements that show as highlighted that you are not interested in. After playing around a bit you will see `.small:nth-child(8)` and only 1000 total elements, which is exactly what we want. 

Repeat this process for every data element we want. Once we know the nodes we want to extract when can get to scraping.

First, we load a few necessary packages and set our options (this turns off scientific notation):

```r
require(rvest)
require(tidyverse)
require(magrittr)

options(scipen = 999)
```

Next, our actual code. Here's our underlying operations based on a single page:

```r

payload <- read_html(url)

  isbn <- payload %>%
    html_nodes(".small:nth-child(8)") %>%
    html_text() %>%
    as.data.frame()

  names(isbn) <- "ISBN"
  isbn$ISBN <- gsub(pattern = "ISBN: ", replacement = "", x = isbn$ISBN)
  
  title <- payload %>% 
    html_nodes("#items a strong") %>%
    html_text() %>%
    as.data.frame()
  
  names(title) <- "title"
  
  author <- payload %>% 
    html_nodes("#items p a:nth-child(2)") %>%
    html_text() %>%
    as.data.frame()
  
  names(author) <- "author"

  category <- payload %>% 
    html_nodes(".small:nth-child(6) a") %>%
    html_text() %>%
    as.data.frame()
  
  names(category) <- "category"
  
  list_price <- payload %>% 
    html_nodes(".pull-left strong") %>%
    html_text() %>%
    as.data.frame()
  
  names(list_price) <- "list_price"
  
  list_price$list_price <- gsub(pattern = "\\ -.*", replace = "", list_price$list_price)
  list_price$list_price <- gsub(pattern = "List: ", replace = "", list_price$list_price)
  
  price <- payload %>% 
    html_nodes("#items .price") %>%
    html_text() %>%
    as.data.frame()
  
  names(price) <- "price"
  
  payload <- data_frame(title = title$title, 
                        author = author$author, 
                        category = category$category, 
                        price = price$price, 
                        list_price = list_price$list_price, 
                        ISBN = isbn$ISBN)
```

We create separate frames for each element we want. Then there's a little formatting we need to do for some of them using some regular expression magic. Once we have each data frame we simply bind them together. 

We'll need to do this 10 times for each of the results pages. A function and a loop will make this simple.

We'll take our code above and place it into a single function where the only parameter is the page number we want, which will be updated in the url we use:

```r
page_scrape <- function(page_number) {
  url <- paste0("http://www.bookdepot.com/Store/Browse?page=", page_number, "&size=1000&sort=arrival_1")

  payload <- read_html(url)

  isbn <- payload %>%
    html_nodes(".small:nth-child(8)") %>%
    html_text() %>%
    as.data.frame()

  names(isbn) <- "ISBN"
  isbn$ISBN <- gsub(pattern = "ISBN: ", replacement = "", x = isbn$ISBN)
  
  title <- payload %>% 
    html_nodes("#items a strong") %>%
    html_text() %>%
    as.data.frame()
  
  names(title) <- "title"
  
  author <- payload %>% 
    html_nodes("#items p a:nth-child(2)") %>%
    html_text() %>%
    as.data.frame()
  
  names(author) <- "author"

  category <- payload %>% 
    html_nodes(".small:nth-child(6) a") %>%
    html_text() %>%
    as.data.frame()
  
  names(category) <- "category"
  
  list_price <- payload %>% 
    html_nodes(".pull-left strong") %>%
    html_text() %>%
    as.data.frame()
  
  names(list_price) <- "list_price"
  
  list_price$list_price <- gsub(pattern = "\\ -.*", replace = "", list_price$list_price)
  list_price$list_price <- gsub(pattern = "List: ", replace = "", list_price$list_price)
  
  price <- payload %>% 
    html_nodes("#items .price") %>%
    html_text() %>%
    as.data.frame()
  
  names(price) <- "price"
  
  payload <- data_frame(title = title$title, 
                        author = author$author, 
                        category = category$category, 
                        price = price$price, 
                        list_price = list_price$list_price, 
                        ISBN = isbn$ISBN)
  
  payload
}
```

Let's test our new function to make sure it works as intended:

```r
test <- page_scrape(1)
head(test)

# A tibble: 6 x 6
  title                                                                                                    
  <fct>                                                                                                    
1 100 Deadly Skills Survival Edition: The SEAL Operative's Guide to Surviving in the Wild and Being Prepar…
2 101 Things That Piss Me Off                                                                              
3 Adolf Hitler (History's Worst)                                                                           
4 After Tamerlane: The Rise and Fall of Global Empires, 1400-2000                                          
5 Alexis Cool as a Cupcake (Cupcake Diaries, #8)                                                           
6 All the Missing Girls                                                                                    
  author            category            price list_price ISBN         
  <fct>             <fct>               <fct> <chr>      <chr>        
1 Emerson, Clint    Reference           $4.00 $19.99     9781501143908
2 Ballinger, Rachel Humor               $4.00 $16.99     9781250129307
3 Buckley, James    Tweens Nonfiction   $4.25 $18.99     9781481479417
4 Darwin, John      History & Geography $3.00 $22.00     9781596916029
5 Simon, Coco       Children Fiction    $1.50 $5.99      9781442450806
6 Miranda, Megan    Fiction             $2.25 $16.00     9781501107979
```

Now we simply loop over each of the pages of results and we are done. I'll use `do()` for the looping:

```r
page_numbers <- data_frame(page_numbers = seq(1:10))

payload <- page_numbers %>%
  group_by(page_numbers) %>%
  do(page_scrape(.$page_numbers))

payload <- payload %>%
  ungroup() %>%
  mutate(ISBN = as.numeric(ISBN)) %>%
  select(-page_numbers)
```
If this worked as intended, we should have a single data frame with 10,000 rows:

```r
glimpse(payload)

Observations: 10,000
Variables: 7
$ page_numbers <int> 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1...
$ title        <chr> "100 Deadly Skills Survival Edition: The SEAL Operative's Guide to Surviving in th...
$ author       <chr> "Emerson, Clint", "Ballinger, Rachel", "Buckley, James", "Darwin, John", "Simon, C...
$ category     <chr> "Reference", "Humor", "Tweens Nonfiction", "History & Geography", "Children Fictio...
$ price        <chr> "$4.00", "$4.00", "$4.25", "$3.00", "$1.50", "$2.25", "$1.75", "$1.50", "$1.50", "...
$ list_price   <chr> "$19.99", "$16.99", "$18.99", "$22.00", "$5.99", "$16.00", "$8.95", "$5.99", "$5.9...
$ ISBN         <chr> "9781501143908", "9781250129307", "9781481479417", "9781596916029", "9781442450806...
```