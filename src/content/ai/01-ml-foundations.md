---
title: Machine Learning Foundations: Teaching Computers by Example
summary: What it means for a program to "learn", the main kinds of machine learning, how a model improves itself step by step with gradient descent (try it interactively), why a model that's perfect on its training data can be useless, and how to measure whether a model is actually good, including why "99% accurate" can be a lie.
---

::widget Scene {"title": "Gradient descent: learning by walking downhill", "sub": "fit price = w × area to five houses, one update at a time", "nodes": [{"id": "loss", "kind": "cells", "label": "loss after each step", "x": 3.1, "y": 3.1, "values": ["", "", "", "", "", "", ""]}], "metrics": [["w", "Weight w (₹/sq ft)"], ["loss", "Loss (mean squared error)"], ["grad", "Gradient"]], "steps": [{"short": "Data", "tag": "Data", "title": "Five houses: area and price", "body": "<p>True relationship ≈ ₹6,000 per sq ft. The model must discover it.</p>", "metrics": {"w": ["?"], "loss": ["-"], "grad": ["-"]}}, {"short": "Model", "tag": "Model", "title": "Model: predicted price = w × area", "body": "<p>One knob (w). Real models have billions, but the loop is identical.</p>"}, {"short": "Init", "tag": "Start", "title": "Start with a random guess: w = 1,000", "body": "<p>Predictions are far too low.</p>", "set": {"loss": {"marks": {"0": "red"}, "ptr": {}, "values": [90, "", "", "", "", "", ""]}}, "metrics": {"w": ["1,000"], "loss": ["90", "bad"]}}, {"short": "Loss", "tag": "Loss", "title": "Loss measures how wrong: average of (prediction − actual)²", "body": "<p>Squaring punishes big errors and keeps everything positive.</p>"}, {"short": "Grad", "tag": "Gradient", "title": "The gradient says which way and how steeply loss changes with w", "body": "<p>Here it's strongly negative: increasing w reduces the loss.</p>", "metrics": {"grad": ["−0.45 (go up)"]}}, {"short": "Step", "tag": "Update", "title": "Update: w ← w − learning_rate × gradient", "body": "<p>w jumps to 3,200. Loss 90 → 41.</p>", "set": {"loss": {"marks": {"1": "orange"}, "ptr": {}, "values": [90, 41, "", "", "", "", ""]}}, "metrics": {"w": ["3,200"], "loss": ["41"]}}, {"short": "Repeat", "tag": "Repeat", "title": "Repeat: 4,600 → 5,400 → 5,800", "body": "<p>Steps shrink as the slope flattens near the bottom.</p>", "set": {"loss": {"marks": {"2": "orange", "3": "orange", "4": "green"}, "ptr": {}, "values": [90, 41, 18, 7, 3, "", ""]}}, "metrics": {"w": ["5,800"], "loss": ["3"], "grad": ["−0.02"]}}, {"short": "Converge", "tag": "Converge", "title": "w ≈ 6,000: loss stops improving", "body": "<p>Converged.</p>", "set": {"loss": {"marks": {"5": "green", "6": "green"}, "ptr": {}, "values": [90, 41, 18, 7, 3, 2, 2]}}, "metrics": {"w": ["5,990", "good"], "loss": ["2", "good"], "grad": ["≈ 0"]}}, {"short": "LR", "tag": "Learning rate", "title": "Learning rate too big: overshoot and bounce; too small: crawl", "body": "<p>The most important knob to tune.</p>"}, {"short": "Generalise", "tag": "Generalisation", "title": "Test on houses the model never saw", "body": "<p>Low training loss means nothing if test loss is high (overfitting). Keep a held-out set.</p>", "note": {"kind": "key", "text": "ML loop: model with parameters → loss on data → gradient → small step downhill → repeat. Judge on held-out data."}}]}



## Rules vs examples

How would you write a program to detect spam emails?

The traditional way: write **rules**. "If the email contains 'FREE MONEY', mark it spam. If it has more than 5 exclamation marks… If the sender is unknown and there's a link…" You'd need thousands of rules, spammers would adapt in days, and you'd still miss most spam.

The machine learning way: collect **examples** a million emails, each labeled "spam" or "not spam", and let an algorithm **find the patterns itself**. When spammers change tactics, you add new examples and retrain.

> [!ANALOGY] Teaching a child what a dog is. You don't give them a rulebook ("four legs, fur, a tail, barks…", which would also describe some cats and exclude a three-legged dog). You point at many dogs and say "dog", and at cats, cows and horses and say "not a dog". Eventually the child recognizes dogs they've never seen before. Machine learning works the same way, just with numbers.

More precisely, a machine learning setup has three parts:

1. A **model**: a function with adjustable knobs, called **parameters** (or weights). For example, a line `price = w × size + b`, where `w` and `b` are knobs.
2. A **loss function** that measures how wrong the model's predictions are on the examples.
3. An **optimizer** that turns the knobs to make the loss smaller.

"Training" means turning the knobs until the model is as right as possible on the examples, and, crucially, **also right on new examples it has never seen**.

## The main kinds of machine learning

- **Supervised learning:** examples come with the correct answer (a **label**).
  - **Regression** predicts a number: a house's price, tomorrow's demand, a delivery time.
  - **Classification** predicts a category: spam or not, which of 1,000 objects is in a photo, whether a transaction is fraudulent.
- **Unsupervised learning:** no labels; find structure. **Clustering** groups similar customers; **dimensionality reduction** compresses many features into a few.
- **Self-supervised learning:** the data labels itself. Hide a word in a sentence and predict it; predict the next word. **This is how large language models learn from the whole internet** without anyone labeling anything.
- **Reinforcement learning:** an agent tries actions and learns from **rewards**: game-playing AIs like AlphaGo, robots learning to walk, and a key step in training chatbots to be helpful.

## Your first model: fitting a line

Suppose you want to predict house prices from size. Your model is a straight line: `predicted_price = w × size + b`. How wrong is it? For each house, take the difference between the predicted and actual price, square it (so big errors count much more, and negative errors don't cancel positive ones), and average over all houses. This is the **mean squared error (MSE)** the loss.

Now, how do you find the best `w` and `b`?

### Gradient descent: walking downhill in fog

> [!ANALOGY] You're standing on a hillside in thick fog, and you want to reach the bottom of the valley. You can't see the valley, but you can feel which way the ground slopes under your feet. So you take a step downhill, feel the slope again, take another step, and repeat. Eventually you reach the bottom. That's **gradient descent**. The "slope" is the **gradient** how much the loss changes as you nudge each knob, and each step nudges every knob a little in the downhill direction.

1. Start with any values for `w` and `b`.
2. Compute the **gradient**: for each knob, which direction (and how strongly) would reduce the loss?
3. Move each knob a small step in that direction. The step size is the **learning rate**.
4. Repeat until the loss stops improving.

Watch it happen. The left side shows the line fitting the data; the right side is a map of the loss for every possible `w` and `b` (blue = low loss), with the white path showing the journey downhill. Then try a large learning rate and watch it overshoot:

::widget GradientDescent {}

The **learning rate** is crucial:

- Too small: progress is painfully slow.
- Too large: each step overshoots the bottom, bouncing back and forth or even flying off to infinity ("diverging").

Real training uses refinements:

- **Mini-batches (stochastic gradient descent):** instead of computing the slope using all million examples for every step, estimate it from a random batch of, say, 256. Much faster per step, and the slight noise even helps.
- **Momentum:** like a ball rolling downhill, keep some speed from previous steps, so you roll through small bumps instead of getting stuck.
- **Adam:** an optimizer that adapts the step size for each knob automatically. It's the default for training most modern neural networks, including large language models.

This same idea, measure the error, compute the slope, step downhill, repeat, trains everything from a two-knob line to a model with a trillion knobs.

## Classification: from scores to probabilities

For yes/no questions ("is this spam?"), the model computes a score and squashes it into a probability between 0 and 1 using the **sigmoid** function. For many categories ("which of 1,000 objects?"), the **softmax** function turns a list of scores into probabilities that add up to 1.

The loss for classification is **cross-entropy** which punishes confident wrong answers very heavily: saying "99% sure it's not spam" when it is spam costs far more than saying "60% sure".

> [!NOTE] Softmax plus cross-entropy is exactly how large language models predict the next word: a score for each of ~100,000 possible tokens, turned into probabilities, trained so the correct next word gets high probability.

## Other classic models worth knowing

- **Decision trees** learn a flowchart of yes/no questions ("income > ₹50k? → age < 30? → …"). Easy to explain, but a single tree overfits easily.
- **Random forests** train hundreds of slightly different trees and let them vote.
- **Gradient-boosted trees** (XGBoost, LightGBM) add trees one at a time, each fixing the previous ones' mistakes. For **table-shaped business data** fraud detection, credit scoring, demand forecasting, they're often still the best choice, even in the age of deep learning.
- **k-nearest neighbors:** predict from the most similar past examples, the ancestor of today's vector search (chapter 5).
- **k-means clustering:** group data into k clusters around central points.

## The real goal: working on new data

Here's the central challenge of machine learning: a model that's perfect on its training examples can be **useless** on new ones.

> [!ANALOGY] Two students prepare for an exam. One **memorizes** the answers to last year's paper; the other **understands** the subject. On last year's paper, both score 100%. On this year's paper, the memorizer fails. A model that memorizes its training data instead of learning the general pattern is said to be **overfitting**.

- **Underfitting:** the model is too simple to capture the pattern (a straight line through clearly curved data). Bad on training data and new data.
- **Overfitting:** the model memorized the noise and quirks of the training data. Great on training data, bad on new data.

How to fight overfitting:

- **More data** and more varied data, the most reliable fix.
- **Regularization:** penalize overly complex models (for example, large weights), or randomly switch off parts of a neural network during training (**dropout**) so it can't rely on memorized details.
- **Early stopping:** stop training when performance on held-out data stops improving.
- **Simpler models** when data is limited.

### Splitting your data honestly

Always split your examples into three sets:

- **Training set** used to fit the model.
- **Validation set** used to make choices (which model, which learning rate).
- **Test set** touched **once** at the very end, to estimate real-world performance. Every time you peek at it and adjust something, it becomes less honest.

> [!WARN] **Data leakage** is the most common way ML projects fool themselves. If information from the future or from the answer sneaks into training, for example, randomly splitting data over time so the model trains on next month to predict last month, or a "days until cancellation" feature that only exists for customers who cancelled, the model looks brilliant in testing and fails in the real world. Split by time for time-based data, and by user when one user's examples are similar.

## Measuring whether a model is good

### Why "99% accurate" can mean nothing

Suppose 0.1% of card transactions are fraud. A "model" that simply says "not fraud" every time is **99.9% accurate** and completely useless, because it catches no fraud at all.

For problems like this, look at the **confusion matrix** the four possible outcomes:

| | Model says "fraud" | Model says "not fraud" |
|---|---|---|
| **Actually fraud** | ✓ Caught it (true positive) | ✗ Missed it (false negative) |
| **Actually fine** | ✗ False alarm (false positive) | ✓ Correctly ignored (true negative) |

From it come the two most important measures:

- **Precision:** of everything the model flagged, how much was really fraud? Low precision means many **false alarms** customers whose cards get blocked for nothing.
- **Recall:** of all the real fraud, how much did the model catch? Low recall means **missed** fraud.

> [!EXAMPLE] **Which matters more depends on the cost of each mistake.** A spam filter needs **high precision**: deleting an important real email is worse than letting one spam through. A cancer screening test needs **high recall**: missing a real case is far worse than a false alarm that leads to a follow-up test. Most models output a probability, and choosing the cut-off is a business decision that trades precision against recall.

Other useful measures: the **F1 score** (combines precision and recall), **ROC-AUC** (how well the model ranks positives above negatives), and for predicting numbers, the average error in real units ("we're off by ₹42,000 on average").

## Machine learning in production

A model in a notebook is a small part of the job. Real ML systems also need: data pipelines that collect and clean training data; tracking of every experiment; serving the model fast enough for live requests; **A/B tests** to prove it actually improves the product; and **monitoring for drift** the world changes (new fraud tactics, new products, a pandemic), and a model trained on last year's data slowly gets worse unless it's retrained.

> [!RECAP]
> - Machine learning finds patterns from **examples** instead of hand-written rules: a **model** with adjustable **parameters** a **loss** measuring error, and an **optimizer**.
> - Kinds: **supervised** (regression, classification), **unsupervised** **self-supervised** (how LLMs learn), **reinforcement**.
> - **Gradient descent** walks downhill on the loss; the **learning rate** sets the step size (too big → diverges).
> - The goal is performing well on **new data**: avoid **overfitting** with more data, regularization and early stopping; keep a separate **test set**; beware **data leakage**.
> - With rare events, accuracy misleads; use **precision** (false alarms) and **recall** (misses), chosen by the cost of each mistake.

> [!INTERVIEW] Even non-ML engineering interviews touch these: overfitting and how to prevent it, train/validation/test splits and leakage, precision vs recall with a concrete example, why accuracy fails on imbalanced data, and what gradient descent and the learning rate do.

::quiz {"q":"A fraud model is 99.9% accurate on data where 0.1% of transactions are fraud. What should you conclude?","options":["It's excellent","Nothing yet, always predicting 'not fraud' would score the same; check precision and recall","It's overfitting","It needs more layers"],"answer":1,"explain":"Accuracy is meaningless when one class is extremely rare."}

::quiz {"q":"Training error keeps dropping while validation error starts rising. What's happening?","options":["Underfitting","Overfitting, the model is memorizing training data","The learning rate is too small","The data is leaking"],"answer":1,"explain":"Stop early, regularize, or get more data."}

::quiz {"q":"What happens if the learning rate is far too large?","options":["Training is slow but steady","Each step overshoots the minimum, so the loss bounces around or blows up","The model underfits","Nothing changes"],"answer":1,"explain":"Try a learning rate near 1 in the interactive figure to see it diverge."}
