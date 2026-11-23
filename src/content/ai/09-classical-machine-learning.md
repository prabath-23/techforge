---
title: Classical Machine Learning — Trees, Boosting and Clustering
summary: The workhorse models that still power most business predictions — linear and logistic regression, decision trees and how they choose splits, random forests, gradient boosting (XGBoost, LightGBM), k-means and other clustering, feature engineering, and why these often beat deep learning on tabular data.
---

::widget Scene {"title": "Decision trees: twenty questions for data", "sub": "learn a loan-default tree, predict, then fix overfitting with a forest", "nodes": [{"id": "r", "kind": "cube", "label": "Missed payments > 2?", "x": 5.0, "y": -5.0, "color": "purple"}, {"id": "y", "kind": "cube", "label": "Debt ratio > 45%?", "x": 6.77, "y": 3.77, "color": "purple"}, {"id": "n", "kind": "cube", "label": "Income < ₹25k?", "x": 13.77, "y": -3.23, "color": "purple"}, {"id": "a", "kind": "node", "label": "38%", "x": 10.54, "y": 10.54, "size": 1.9, "color": "red"}, {"id": "bb", "kind": "node", "label": "14%", "x": 13.54, "y": 7.54, "size": 1.9, "color": "orange"}, {"id": "c", "kind": "node", "label": "6%", "x": 17.54, "y": 3.54, "size": 1.9, "color": "yellow"}, {"id": "d", "kind": "node", "label": "2%", "x": 20.54, "y": 0.54, "size": 1.9, "color": "green"}], "links": [["r", "y", {"label": "yes"}], ["r", "n", {"label": "no"}], ["y", "a"], ["y", "bb"], ["n", "c"], ["n", "d"]], "metrics": [["stage", "Stage"], ["train", "Train accuracy"], ["test", "Test accuracy"]], "steps": [{"short": "Data", "tag": "Data", "title": "10,000 past loans with features and whether they defaulted", "body": "<p>Tabular data: columns of numbers and categories.</p>", "show": ["r"], "set": {"r": {"label": "10,000 loans"}}, "metrics": {"stage": ["data"], "train": ["—"], "test": ["—"]}}, {"short": "Split", "tag": "Learn", "title": "Try every feature and threshold; pick the split that best separates defaulters", "body": "<p>Measured by Gini impurity or information gain. \"Missed payments > 2\" wins.</p>", "show": ["r"], "set": {"r": {"label": "Missed payments > 2?"}}, "metrics": {"stage": ["first split"]}}, {"short": "Recurse", "tag": "Learn", "title": "Repeat on each side", "body": "<p>Each branch gets its own best question.</p>", "show": ["r", "y", "n"], "metrics": {"stage": ["recursive splits"]}}, {"short": "Leaves", "tag": "Leaves", "title": "Leaves hold the default rate of the training loans that reach them", "body": "<p>Readable: you can explain any decision.</p>", "show": ["r", "y", "n", "a", "bb", "c", "d"], "metrics": {"stage": ["leaves"]}}, {"short": "Predict", "tag": "Predict", "title": "New applicant: no missed payments, high income", "body": "<p>No → No → 2% risk.</p>", "flow": [[["r", "n", "d"], "#22c55e", ""]], "metrics": {"stage": ["predict: 2%"]}}, {"short": "Deep", "tag": "Overfit", "title": "Let it grow 30 levels deep", "body": "<p>It memorises noise: perfect on training data, poor on new loans.</p>", "metrics": {"stage": ["deep tree"], "train": ["99%"], "test": ["71%", "bad"]}}, {"short": "Prune", "tag": "Regularise", "title": "Limit depth / minimum samples per leaf", "body": "<p>Simpler tree, better on new data.</p>", "metrics": {"train": ["86%"], "test": ["82%"]}}, {"short": "Forest", "tag": "Ensemble", "title": "Random forest: hundreds of trees on random samples, then vote", "body": "<p>Individual errors cancel out.</p>", "metrics": {"stage": ["random forest"], "test": ["86%"]}}, {"short": "Boost", "tag": "Ensemble", "title": "Gradient boosting: each new tree fixes the previous trees' errors", "body": "<p>XGBoost / LightGBM — still the strongest choice for most tabular business problems.</p>", "metrics": {"stage": ["gradient boosting"], "test": ["89%", "good"]}}, {"short": "Check", "tag": "Validate", "title": "Cross-validation, a time-based split, and fairness checks", "body": "<p>Don't leak future information; check error rates across groups.</p>", "note": {"kind": "key", "text": "Trees split on the most informative questions; single deep trees overfit; forests and boosting ensemble many trees. Validate on held-out, time-respecting data."}}]}



## Not everything needs a neural network

> [!STORY] A bank wants to predict which loan applicants will default. A team spends two months training a deep neural network on the applicant table — income, age, existing loans, repayment history, employment type. It reaches 0.78 AUC. A colleague trains a gradient-boosted tree model in an afternoon: 0.81 AUC, trains in minutes on a laptop, and can explain which factors drove each decision — which regulators require. Study after study, and years of Kaggle competitions, show the same pattern: for **table-shaped data** (rows and columns of business features), tree ensembles are usually the strongest and most practical choice.

Chapter 1 introduced the ideas of training, loss and overfitting. This chapter covers the classical models you'll use most often outside of language and images.

## Linear and logistic regression

**Linear regression** predicts a number as a weighted sum of features: `price = w₁·area + w₂·bedrooms + w₃·distance_to_metro + b`. **Logistic regression** squashes that sum through a sigmoid into a probability for yes/no questions (will this customer churn?).

- **Fast, simple, interpretable:** each weight says how much a feature pushes the prediction.
- **Regularization** (L2 "ridge", L1 "lasso") keeps weights small; L1 also drives useless features' weights to zero.
- **Limits:** they assume effects add up in straight lines. "Income matters a lot below ₹30,000 and barely above ₹2,00,000" or "age matters differently for students and retirees" need hand-made features.

They remain excellent **baselines** — always train one first, to know what fancier models must beat.

## Decision trees

A **decision tree** learns a flowchart of yes/no questions:

::widget Stepper {"type":"tree","title":"A small decision tree for loan default risk","what":"A tree learned from past loans. Each box is a question about the applicant; follow the answers down to a leaf, which gives the predicted default rate of similar past applicants.","steps":["Click the root and follow one path to a leaf.","Notice that each split was chosen because it separates defaulters from non-defaulters best.","Find a path where the same feature (income) matters differently depending on an earlier answer."],"nodes":[["Missed payments in last 12 months > 2?","The most informative first question: it splits the training loans into the purest groups."],["Yes → Debt-to-income > 45%?","Applicants with a poor recent record. Next most useful question for this group."],["No → Monthly income < ₹25,000?","Applicants with a clean recent record."],["Yes, Yes → 38% default (leaf)","High risk: recent missed payments and heavily indebted."],["Yes, No → 14% default (leaf)","Missed payments but manageable debt."],["No, Yes → 6% default; No, No → 2% default (leaves)","Clean record: lower income is somewhat riskier, high income very low risk."]]}

**How splits are chosen:** at each node, try every feature and threshold, and pick the one that makes the two resulting groups most **pure** — measured by Gini impurity or entropy for classification, or variance reduction for regression. Repeat recursively until a stopping rule (maximum depth, minimum samples per leaf).

> [!ANALOGY] The game of twenty questions. A good player asks the question that splits the remaining possibilities most evenly ("Is it alive?") rather than a very specific one ("Is it a giraffe?"). A decision tree greedily picks the most informative question at each step.

Strengths: handles non-linear effects and interactions automatically, needs no feature scaling, copes with mixed numeric and categorical data, easy to explain. Weakness: a single deep tree **overfits badly** — it memorizes noise, and small data changes produce very different trees.

## Ensembles: many trees are better than one

### Random forests (bagging)

Train hundreds of trees, each on a random **bootstrap sample** of rows and considering a random subset of features at each split, then **average** their predictions (or vote). Individual trees overfit in different ways; averaging cancels much of the noise.

> [!ANALOGY] The wisdom of crowds: asking 500 people to guess the number of sweets in a jar and averaging gives a better answer than most individuals — as long as their errors are independent. Randomizing rows and features keeps the trees' errors different.

Random forests are robust, hard to badly misconfigure, and give a quick **feature importance** estimate.

### Gradient boosting

Boosting builds trees **one after another**, each new small tree trained to correct the **errors** (the gradient of the loss — chapter 1) of the ensemble so far. Add each tree's predictions with a small learning rate, and repeat hundreds or thousands of times.

```python
import lightgbm as lgb
from sklearn.metrics import roc_auc_score

model = lgb.LGBMClassifier(
    n_estimators=2000, learning_rate=0.03, num_leaves=63,
    subsample=0.8, colsample_bytree=0.8,           # randomness, like a forest, reduces overfitting
)
model.fit(X_train, y_train,
          eval_set=[(X_valid, y_valid)],
          callbacks=[lgb.early_stopping(100)])       # stop when validation stops improving
print(roc_auc_score(y_valid, model.predict_proba(X_valid)[:, 1]))
```

**XGBoost**, **LightGBM** and **CatBoost** are the standard libraries — fast, handling missing values natively, and (CatBoost especially) categorical features. They dominate tabular problems: credit scoring, fraud detection, click-through prediction, demand forecasting, churn, insurance pricing, ranking in search (System Design track, chapter 12).

Key knobs: number of trees with **early stopping**, learning rate, tree size (depth/leaves), row and column subsampling, regularization.

### Explaining predictions

Regulated industries need to justify decisions ("why was this loan declined?"). **SHAP values** attribute each individual prediction to the features that drove it ("+12% risk from missed payments, +5% from debt ratio, −3% from employment length"), and summarize global importance.

## Unsupervised learning: clustering

With no labels, **clustering** groups similar items.

### k-means

1. Pick k starting centers (k-means++ chooses them spread out).
2. Assign each point to its nearest center.
3. Move each center to the average of its assigned points.
4. Repeat until assignments stop changing.

Used for customer segmentation ("budget families", "frequent business travellers"), grouping documents, compressing colors in images, and as a building block in vector-search indexes (IVF — chapter 5). Choose k with the "elbow" of the error curve, silhouette scores, or business sense. Weaknesses: assumes roughly round, similar-sized clusters; sensitive to scaling and outliers.

### Other methods

- **DBSCAN / HDBSCAN:** find dense regions of any shape and label sparse points as noise — good for geographic hotspots and anomaly detection.
- **Hierarchical clustering:** a tree of merges, letting you choose the level of detail.
- **Gaussian mixture models:** soft assignments with probabilities.

**Dimensionality reduction** helps visualize and compress: **PCA** finds the directions of greatest variation; **t-SNE** and **UMAP** make 2D maps of high-dimensional data (like embedding plots — chapter 5).

**Anomaly detection** (fraud, intrusion, faulty sensors): isolation forests, distance to cluster centers, or simple statistical thresholds.

## Feature engineering: where most of the gains are

For classical models, **good features** matter more than model choice:

- **Aggregations over history:** "number of transactions in the last hour", "average order value over 90 days".
- **Ratios and differences:** debt-to-income, price relative to category average, days since last login.
- **Time features:** hour of day, day of week, holidays, seasonality.
- **Categorical encodings:** one-hot for few categories; target encoding (carefully, to avoid leakage) for many.
- **Text and images** turned into embeddings (chapter 5) and fed as features.

> [!WARN] Features must be computable **at prediction time** with only information available then. "Number of chargebacks on this card" computed using data from after the transaction is **leakage** (chapter 1) — great validation scores, useless in production. Feature stores (chapter 15) help keep training and serving consistent.

## When to use what

| Situation | Start with |
|---|---|
| Tabular business data, any size | Gradient boosting (LightGBM/XGBoost/CatBoost), with a logistic regression baseline |
| Need maximum interpretability / regulation | Logistic regression or shallow trees, plus SHAP |
| Few samples (hundreds) | Regularized linear models, small forests |
| Images, audio, free text | Deep learning or pre-trained embeddings |
| No labels, want groups | k-means / HDBSCAN on good features or embeddings |

> [!RECAP]
> - **Linear/logistic regression**: fast, interpretable baselines; regularize.
> - **Decision trees** split greedily on the most informative question; one tree overfits.
> - **Random forests** average many randomized trees; **gradient boosting** adds trees that fix previous errors — the top choice for tabular data.
> - Explain predictions with **SHAP**.
> - **Clustering** (k-means, DBSCAN) and **dimensionality reduction** (PCA, UMAP) find structure without labels.
> - **Feature engineering** drives results; never use information unavailable at prediction time.

> [!INTERVIEW] ML interviews ask: how a decision tree picks splits, bagging vs boosting, why boosting wins on tabular data, how to tune and prevent overfitting (early stopping), how k-means works and its limits, and how you'd engineer features for fraud or churn without leakage.

::quiz {"q":"What's the key difference between random forests and gradient boosting?","options":["Forests use neural networks","Forests average independently trained randomized trees; boosting adds trees sequentially, each correcting the ensemble's errors","Boosting uses only one tree","There's none"],"answer":1,"explain":"Bagging reduces variance; boosting reduces bias step by step."}

::quiz {"q":"For a credit-scoring dataset of 2 million rows and 80 numeric/categorical columns, what's a strong first model?","options":["A large transformer","Gradient-boosted trees, with a logistic regression baseline","k-means","A CNN"],"answer":1,"explain":"Tree ensembles usually lead on tabular data."}

::quiz {"q":"What does k-means do in each iteration?","options":["Builds a tree","Assigns points to the nearest center, then moves each center to the mean of its points","Removes outliers","Labels data with humans"],"answer":1,"explain":"Repeat until assignments stabilize."}
