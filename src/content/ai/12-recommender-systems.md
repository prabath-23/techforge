---
title: Recommender Systems
summary: How Netflix, YouTube, Amazon and Spotify decide what to show you — implicit vs explicit feedback, content-based and collaborative filtering, matrix factorization and embeddings, two-tower retrieval models, the multi-stage pipeline (candidate generation, ranking, re-ranking), cold start, feedback loops, and how recommendations are evaluated online.
---

::widget Scene {"title": "Recommendations: from millions of items to the top 30", "sub": "one home-feed request through retrieval, ranking and re-ranking", "nodes": [{"id": "u", "kind": "phone", "label": "User opens app", "x": 3.72, "y": 3.72}, {"id": "all", "kind": "blocks", "label": "All videos (10 M)", "x": 7.72, "y": -0.28, "count": 36, "color": "dark"}, {"id": "cand", "kind": "blocks", "label": "Candidates (1,000)", "x": 11.72, "y": -4.28, "count": 12, "color": "blue"}, {"id": "rank", "kind": "blocks", "label": "Ranked (100)", "x": 15.72, "y": -8.28, "count": 6, "color": "purple"}, {"id": "top", "kind": "blocks", "label": "Shown (30)", "x": 19.72, "y": -12.28, "count": 4, "color": "green"}, {"id": "log", "kind": "doc", "label": "Feedback log", "x": 17.3, "y": 1.3, "color": "orange"}], "links": [["u", "all"], ["all", "cand", {"label": "retrieve"}], ["cand", "rank", {"label": "rank"}], ["rank", "top", {"label": "re-rank"}], ["top", "log", {"dashed": true}]], "metrics": [["stage", "Stage"], ["n", "Items"], ["ms", "Time budget"]], "steps": [{"short": "Req", "tag": "Request", "title": "User opens the app: 200 ms to fill the feed", "body": "<p>Scoring 10 million videos with a heavy model is impossible in that time.</p>", "show": ["u", "all"], "metrics": {"stage": ["request"], "n": ["10 M"], "ms": ["200 ms total"]}}, {"short": "Two", "tag": "Two towers", "title": "Retrieval: user embedding and video embeddings (two-tower model)", "body": "<p>Learned so that users land near videos they'll enjoy.</p>"}, {"short": "Retrieve", "tag": "Retrieve", "title": "Nearest-neighbour search + a few other sources", "body": "<p>Subscriptions, trending, \"because you watched X\". Union ≈ 1,000 candidates.</p>", "show": ["u", "all", "cand"], "flow": [["all", "cand", "#3b82f6", "ANN + sources"]], "metrics": {"stage": ["retrieve"], "n": ["1,000"], "ms": ["~20 ms"]}}, {"short": "Features", "tag": "Features", "title": "Fetch features for each candidate", "body": "<p>User history, video stats, freshness, creator, device, time of day — from a feature store.</p>", "metrics": {"stage": ["features"]}}, {"short": "Rank", "tag": "Rank", "title": "A heavy model predicts click, watch time, like, \"not interested\"", "body": "<p>Combine into one score aligned with long-term satisfaction, not just clicks.</p>", "show": ["u", "all", "cand", "rank"], "flow": [["cand", "rank", "#a855f7", "score 1,000"]], "metrics": {"stage": ["rank"], "n": ["100"], "ms": ["~60 ms"]}}, {"short": "Rerank", "tag": "Re-rank", "title": "Re-rank with rules", "body": "<p>Diversity (not ten cricket clips in a row), remove watched items, freshness boost, policy filters.</p>", "show": ["u", "all", "cand", "rank", "top"], "flow": [["rank", "top", "#22c55e", "top 30"]], "metrics": {"stage": ["re-rank"], "n": ["30"], "ms": ["~10 ms"]}}, {"short": "Log", "tag": "Feedback", "title": "Log what was shown and what the user did", "body": "<p>Including what they skipped — that's tomorrow's training data.</p>", "show": ["u", "all", "cand", "rank", "top", "log"], "flow": [["top", "log", "#f59e0b", "impressions + actions"]]}, {"short": "Loop", "tag": "Danger", "title": "Feedback loops: shown items get clicked, so they're shown more", "body": "<p>Add exploration and correct for position bias.</p>"}, {"short": "Cold", "tag": "Cold start", "title": "New users and new videos have no history", "body": "<p>Use content features, popularity in their region, and onboarding choices.</p>", "note": {"kind": "key", "text": "Funnel: cheap retrieval (embeddings) → expensive ranking (multi-objective model) → rule-based re-ranking. Log everything; watch feedback loops and cold start."}}]}



## 80% of what people watch

> [!STORY] Netflix has said that around 80% of the hours members stream come from recommendations rather than search. YouTube has reported a similar majority of watch time comes from its recommendations. These systems choose, out of millions or billions of items, the few dozen to show each of hundreds of millions of people — within about 100 milliseconds, every time they open the app. When they work, you feel understood. When they don't, you see the same three shows you've already watched. Recommendation is one of the most commercially important applications of machine learning.

## The signals: what users tell you

- **Explicit feedback:** ratings, thumbs up/down, "not interested". Clear but rare — most people never rate anything.
- **Implicit feedback:** clicks, watch time, purchases, add-to-cart, skips, dwell time, shares. Abundant but noisy: a click isn't necessarily a like, and **not** clicking may just mean the item was never seen.

Most modern systems learn mostly from implicit signals, weighting stronger ones (a purchase, watching 90% of a video) more than weaker ones (a click).

## Approach 1: content-based filtering

Recommend items **similar to what the user liked**, based on item attributes: genre, director, ingredients, article text, product category — increasingly via **embeddings** of the item's text and images (chapter 5).

- Works for new items with no interaction history.
- But tends to recommend more of the same, and can't discover that people who love cricket documentaries also love a particular cooking show.

## Approach 2: collaborative filtering

Use the **behaviour of many users**: "people who liked what you liked also liked…". No item attributes needed.

> [!ANALOGY] Asking a friend with similar taste for a recommendation. You both loved the same five films, so the sixth film they loved — which you haven't seen — is probably a good bet, even if neither of you could explain what the films have in common.

### Matrix factorization

Arrange interactions as a huge, mostly empty **user × item matrix**. Matrix factorization learns a short **embedding** vector for every user and every item, such that the **dot product** of a user's and an item's vectors predicts how much the user will like the item.

::widget Stepper {"type":"flow","cols":3,"title":"Matrix factorization in pictures","what":"How a sparse table of who-watched-what becomes user and item embeddings, and how those embeddings produce recommendations.","steps":["Press Play and follow the steps.","Notice that the embedding dimensions aren't labelled by anyone — the model discovers them.","Find how a prediction is made for a movie the user has never seen."],"nodes":[["The interaction matrix","Rows = 100 million users, columns = 50,000 titles. Each cell is 'watched / liked' or empty. Over 99.9% of cells are empty — that's what we want to predict."],["Learn embeddings","Give every user and every title a vector of, say, 64 numbers. Train them so that user · title is high for observed interactions and low for sampled non-interactions."],["Hidden dimensions emerge","One dimension might end up tracking 'light comedy vs dark drama', another 'Indian vs international', another 'kids' content'. Nobody labels them; they emerge from patterns."],["Predict","For a user and an unseen title, the dot product of their vectors estimates interest."],["Recommend","Find the titles with the highest dot product for this user — a nearest-neighbour search in embedding space (chapter 5)."],["Similar items for free","Titles with nearby vectors are 'similar' in the eyes of viewers — that's how 'because you watched X' rows work."]]}

The **Netflix Prize** (2006–2009) offered $1 million for a 10% improvement in rating prediction; matrix factorization methods were central to the winning solution, and popularized the approach across the industry.

## Modern deep learning recommenders

### Two-tower retrieval

A **two-tower model** has one neural network (tower) that embeds the **user** — using their history, demographics, context like time and device — and another that embeds the **item** — using its ID, text, image, category, popularity. Train so that users and the items they engage with have high dot products.

At serving time, item embeddings are **precomputed and indexed** in an approximate nearest-neighbour index; the user tower runs once per request, and the index returns the top few hundred items in milliseconds. YouTube, Pinterest, Google Play and many others use this pattern for candidate generation.

### Sequence-aware models

Your **recent** actions predict your next one best: someone who just watched three cooking videos probably wants a fourth now, whatever they watched last month. Transformer-based sequence models (chapter 3) over a user's recent interaction history capture this "session intent".

## The multi-stage pipeline

No single model can score a billion items per request. Production systems are **funnels**:

::widget Architecture {"title":"A large-scale recommendation pipeline","what":"How millions of items are narrowed down to the dozen shown to a user, in stages that get more expensive per item as the number of items shrinks.","steps":["Follow a request from the app through each stage.","Notice how many items each stage handles and how much time it has.","Click the re-ranking stage to see the business rules applied at the end."],"nodes":[{"id":"app","label":"Home screen request","kind":"client","col":0,"row":1,"desc":"User 42 opens the app: we need ~30 items in ~100 ms."},{"id":"cand","label":"Candidate generation","kind":"service","col":1,"row":1,"desc":"Several fast sources each return a few hundred items: two-tower ANN retrieval, 'continue watching', trending in your region, items similar to recent views, new releases. Millions → ~1,000 candidates."},{"id":"ann","label":"ANN index of item embeddings","kind":"search","col":1,"row":0,"desc":"Precomputed item vectors searched by the user's embedding in milliseconds."},{"id":"feat","label":"Feature store","kind":"cache","col":2,"row":0,"desc":"Fresh user and item features — recent clicks, item popularity in the last hour — served consistently to training and serving (chapter 15)."},{"id":"rank","label":"Ranking model","kind":"ml","col":2,"row":1,"desc":"A heavier model (deep network or gradient boosting) scores each of ~1,000 candidates for predicted engagement — probability of click, expected watch time, chance of a 'like' — using hundreds of features."},{"id":"rerank","label":"Re-ranking & business rules","kind":"service","col":3,"row":1,"desc":"Adjusts the final list: diversity (not ten thrillers in a row), freshness, removing already-watched items, content policies, promotions, fairness to new creators."},{"id":"logs","label":"Impression & engagement logs","kind":"queue","col":3,"row":2,"desc":"What was shown, what was clicked or watched — the training data for every model, streamed for near-real-time features."},{"id":"train","label":"Training pipelines","kind":"worker","col":2,"row":2,"desc":"Retrain models daily or continuously from logs; evaluate offline; ship through A/B tests."}],"edges":[["app","cand","request"],["cand","ann","user embedding"],["cand","rank","~1,000 items"],["rank","feat","features"],["rank","rerank","scores"],["rerank","app","~30 items"],["app","logs","impressions & clicks",true],["logs","train","data",true],["train","rank","new model",true]]}

## Hard problems

- **Cold start:** a new user has no history; a new item has no interactions. Use onboarding questions, popularity in their region, content-based features and embeddings from item text and images, and **exploration** to gather data.
- **Exploration vs exploitation:** always showing the predicted best items means never learning about others. **Multi-armed bandit** methods deliberately show some uncertain items to learn.
- **Feedback loops and popularity bias:** the system recommends popular items → they get more clicks → they look even better. New and niche items never get a chance; tastes narrow into "filter bubbles". Counter with exploration, diversity constraints and debiasing for position (items at the top get clicked more regardless of quality).
- **What to optimize:** clicks are easy to measure but can reward clickbait. Better systems optimize longer-term outcomes — watch time with satisfaction, return visits, surveys — and add guardrails against harmful or misleading content.
- **Freshness:** news and short videos are only relevant for hours; models and features must update quickly.

## Measuring recommendations

- **Offline:** on held-out interactions — recall@k (did the item the user actually engaged with appear in our top k?), NDCG, AUC. Useful for iteration, but often poorly correlated with real impact.
- **Online:** **A/B tests** on real users — click-through, watch time, conversions, retention, diversity of consumption — are the final word (Practices/System Design tracks on experimentation).

> [!RECAP]
> - Recommenders learn mostly from **implicit feedback** (clicks, watch time, purchases).
> - **Content-based** uses item attributes; **collaborative filtering** uses patterns across users; **matrix factorization** learns user and item **embeddings** whose dot product predicts interest.
> - **Two-tower** models + an ANN index retrieve candidates fast; sequence models capture recent intent.
> - Production is a **funnel**: candidate generation → ranking → re-ranking with diversity and business rules.
> - Hard parts: **cold start**, **exploration**, **feedback loops and popularity bias**, choosing the right objective, freshness; measure with offline metrics and **A/B tests**.

> [!INTERVIEW] "Design YouTube/Netflix/Amazon recommendations" is a common ML system design question: discuss signals, candidate generation (two-tower + ANN), ranking features and objectives, re-ranking, cold start, feedback loops, and evaluation with A/B tests.

::quiz {"q":"What does matrix factorization learn?","options":["A decision tree per user","Embedding vectors for users and items whose dot products predict interest","Rules written by editors","Item prices"],"answer":1,"explain":"The hidden dimensions emerge from interaction patterns."}

::quiz {"q":"Why do recommenders use a multi-stage funnel?","options":["To show more ads","Heavy ranking models can't score millions of items per request in ~100 ms, so cheap retrieval narrows candidates first","Because of GDPR","To avoid embeddings"],"answer":1,"explain":"Each stage is more expensive per item but handles far fewer items."}

::quiz {"q":"A new item has no interactions yet. What helps it get recommended?","options":["Nothing","Content features/embeddings and deliberate exploration","Higher prices","Deleting old items"],"answer":1,"explain":"That's the item cold-start problem."}
