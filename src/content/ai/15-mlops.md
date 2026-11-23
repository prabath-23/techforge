---
title: MLOps — Training Pipelines, Feature Stores and Monitoring
summary: The engineering that turns a model in a notebook into a reliable product — reproducible data and training pipelines, experiment tracking and model registries, feature stores and training/serving skew, batch vs online serving, deployment with shadow and canary releases, monitoring for data and concept drift, retraining loops, and LLMOps differences.
---

::widget Scene {"title": "Model drift: when the world changes under your model", "sub": "a delivery-time model from training to monsoon to retraining", "nodes": [{"id": "data", "kind": "db", "label": "Training data", "x": 3.72, "y": 3.72, "color": "purple"}, {"id": "pipe", "kind": "cpu", "label": "Training pipeline", "x": 7.72, "y": -0.28, "color": "blue"}, {"id": "reg", "kind": "doc", "label": "Model registry", "x": 11.72, "y": -4.28, "color": "orange"}, {"id": "prod", "kind": "server", "label": "Serving", "x": 15.72, "y": -8.28, "color": "green"}, {"id": "mon", "kind": "cube", "label": "Monitoring", "x": 21.3, "y": -2.7, "color": "red"}, {"id": "fs", "kind": "db", "label": "Feature store", "x": 17.3, "y": 1.3, "color": "teal"}], "links": [["data", "pipe"], ["pipe", "reg"], ["reg", "prod"], ["prod", "mon"], ["fs", "pipe", {"dashed": true}], ["fs", "prod", {"dashed": true}], ["mon", "pipe", {"dashed": true}]], "metrics": [["ver", "Model"], ["mae", "Error (minutes)"], ["state", "State"]], "steps": [{"short": "Train", "tag": "Train", "title": "A reproducible pipeline trains v1 on last year's deliveries", "body": "<p>Versioned data, code and config, so anyone can rebuild exactly this model.</p>", "show": ["data", "pipe"], "flow": [["data", "pipe", "#3b82f6", "2 M deliveries"]], "metrics": {"ver": ["v1"], "mae": ["—"], "state": ["training"]}}, {"short": "Register", "tag": "Registry", "title": "Store it in a registry with its metrics and lineage", "body": "<p>Which data, which code commit, which eval results.</p>", "show": ["data", "pipe", "reg"], "flow": [["pipe", "reg", "#f59e0b", "v1 + metrics"]]}, {"short": "Features", "tag": "Features", "title": "Serve with the same feature code as training", "body": "<p>A feature store computes \"orders in last 30 min\" identically in both places — avoiding training/serving skew.</p>", "show": ["data", "pipe", "reg", "fs"]}, {"short": "Deploy", "tag": "Deploy", "title": "Shadow first, then canary", "body": "<p>Shadow: v1 predicts on live traffic without affecting users; compare with the old model. Then 5% canary.</p>", "show": ["data", "pipe", "reg", "fs", "prod"], "flow": [["reg", "prod", "#22c55e", "v1"]], "metrics": {"mae": ["4.1 min", "good"], "state": ["live"]}}, {"short": "Monitor", "tag": "Monitor", "title": "Monitor inputs, outputs and (delayed) actual outcomes", "body": "<p>Latency and errors like any service, plus data drift and accuracy once deliveries complete.</p>", "show": ["data", "pipe", "reg", "fs", "prod", "mon"], "flow": [["prod", "mon", "#ef4444", "predictions + actuals"]]}, {"short": "Drift", "tag": "Drift", "title": "Monsoon: traffic patterns shift; error climbs", "body": "<p>The monitor sees feature distributions far from training data (data drift) and error rising (concept drift).</p>", "set": {"mon": {"badge": "drift alert"}, "prod": {"badge": "error ↑"}}, "metrics": {"mae": ["9.8 min", "bad"], "state": ["degraded"]}}, {"short": "Retrain", "tag": "Retrain", "title": "Trigger retraining on recent data", "body": "<p>Same pipeline, fresh window including rainy days.</p>", "flow": [["mon", "pipe", "#f59e0b", "retrain"]], "metrics": {"ver": ["v2 training"]}}, {"short": "Gate", "tag": "Gate", "title": "v2 must beat v1 on a held-out recent set before promotion", "body": "<p>Automated quality gates — never ship a model blind.</p>", "flow": [["pipe", "reg", "#f59e0b", "v2 (better)"]], "metrics": {"ver": ["v2"]}}, {"short": "Roll", "tag": "Roll out", "title": "Canary v2; roll back instantly if needed", "body": "<p>The registry keeps v1 ready.</p>", "flow": [["reg", "prod", "#22c55e", "v2"]], "set": {"mon": {"badge": "ok"}, "prod": {"badge": null}}, "metrics": {"mae": ["4.4 min", "good"], "state": ["recovered"]}}, {"short": "Loop", "tag": "Summary", "title": "MLOps closes the loop", "body": "<p>Data → train → register → deploy → monitor → retrain, automated and auditable.</p>", "note": {"kind": "key", "text": "Reproducible pipelines, a registry, shared feature code, shadow/canary deploys, drift and accuracy monitoring, gated retraining."}}]}



## The model that worked perfectly — in the notebook

> [!STORY] A data scientist builds a model that predicts which delivery orders will arrive late, with excellent accuracy on historical data. An engineer re-implements the feature calculations in the production service, deploys it, and… its predictions are noticeably worse. Weeks later they find out why: in the notebook, "average delivery time for this restaurant" was computed over **all** past orders; in production, over the last 7 days, and with a different timezone. Then, three months after launch, accuracy slowly drops again — monsoon season changed delivery patterns, and nobody noticed. Google researchers famously described ML systems as having high "hidden technical debt": the model code is a small box surrounded by much larger infrastructure for data, features, serving and monitoring. **MLOps** is about building that infrastructure well.

## The ML lifecycle

::widget Stepper {"type":"cycle","title":"The machine learning lifecycle","what":"The loop a production ML system goes through. Unlike regular software, it must keep re-learning as the world changes.","steps":["Press Play and go around the loop.","Find the steps that ordinary software doesn't have.","Notice where monitoring feeds back into data collection and retraining."],"nodes":[["Collect and label data","Gather training examples from logs, databases and labelling teams. Version the datasets."],["Engineer features","Compute model inputs with the SAME code for training and serving, ideally in a feature store."],["Train and evaluate","Reproducible training runs, tracked experiments, offline metrics on held-out data, checks for bias and leakage."],["Register and review","Store the model with its data version, code version, metrics and lineage in a registry; approve for release."],["Deploy","Serve in batch or online; roll out with shadow traffic, canaries and A/B tests."],["Monitor","Watch service health, input data drift, prediction distributions and real-world outcomes once labels arrive."],["Retrain","On a schedule or when drift is detected, retrain on fresh data and go round again."]]}

## Reproducible pipelines

Notebooks are great for exploration; production needs **pipelines**:

- **Code in version control**, with tests for feature logic.
- **Data versioning:** know exactly which data snapshot trained each model (Delta/Iceberg time travel, DVC, lakeFS — System Design track, chapter 13).
- **Orchestrated steps** — extract, validate, build features, train, evaluate, register — as a DAG (Airflow, Kubeflow Pipelines, Vertex AI Pipelines, SageMaker Pipelines, Metaflow).
- **Data validation** before training: schema checks, ranges, missing values, label distribution — garbage in stops the pipeline instead of producing a garbage model.
- **Fixed random seeds and environments** (containers) so results can be reproduced.

### Experiment tracking and the model registry

- **Experiment tracking** (MLflow, Weights & Biases): log parameters, metrics, plots and artifacts for every run, so you can compare and reproduce.
- **Model registry:** versioned models with metadata — training data version, code commit, metrics, owner — and stages (staging, production, archived). Deployments reference a registry version, never "the file on someone's laptop".

## Feature stores and training/serving skew

The story's bug is **training/serving skew**: features computed differently in training and in production.

> [!ANALOGY] Teaching a student with a textbook that measures temperature in Celsius, then giving them an exam in Fahrenheit. They learned the right things, but the inputs no longer mean what they learned.

A **feature store** (Feast, Tecton, Databricks/Vertex/SageMaker feature stores) defines each feature **once** and serves it to both:

- An **offline store** (warehouse/lakehouse) with full history, for building training sets with **point-in-time correctness** — each training example gets feature values **as they were at that moment**, preventing leakage of future information (chapter 1).
- An **online store** (Redis, DynamoDB) with the latest values, for low-latency lookup at prediction time.
- Streaming pipelines keep fast-changing features fresh ("orders this restaurant received in the last 15 minutes").

## Serving models

| Mode | How | Examples |
|---|---|---|
| **Batch** | Score everything on a schedule, store results | Nightly churn scores, weekly demand forecasts, email recommendations |
| **Online (real-time)** | An API returns a prediction per request in milliseconds | Fraud checks during payment, search ranking, ETA |
| **Streaming** | Score events as they flow through a stream processor | Real-time anomaly detection |
| **On-device** | Model runs on the phone or edge device | Keyboard suggestions, camera features |

Online serving concerns: latency budgets, autoscaling, GPU vs CPU, batching requests, model formats (ONNX, TorchScript, TensorRT), caching predictions, and **fallbacks** (a simple rule or previous model if the model service fails).

## Deploying safely

Models fail in quiet ways — they return plausible numbers that are wrong. So roll out cautiously:

- **Shadow deployment:** the new model scores real traffic, but its predictions aren't used; compare with the current model.
- **Canary:** send a small percentage of traffic to the new model; watch business and technical metrics (Cloud track, chapter 6).
- **A/B test:** measure real impact (fraud caught, conversion, delivery accuracy) with statistical rigour before full rollout.
- **Fast rollback** to the previous registry version.

## Monitoring: models decay

Software doesn't change on its own; **the world does**, and models trained on the past slowly become wrong.

- **Data drift:** the distribution of inputs changes — new user demographics, a new app version sending a field differently, monsoon traffic. Detect with statistics comparing live feature distributions with training data (population stability index, KS tests) and alerts on missing or out-of-range values.
- **Concept drift:** the relationship between inputs and the outcome changes — fraudsters adopt new tactics, so the same features now mean something different.
- **Prediction drift:** the distribution of the model's outputs shifts (suddenly flagging 3× more transactions).
- **Outcome monitoring:** the real test, once ground-truth labels arrive (was the order actually late? was the transaction actually fraud?) — sometimes days or weeks later.
- **Plus normal service monitoring:** latency, errors, throughput (Cloud track, chapter 7).

> [!EXAMPLE] **COVID-19 and demand forecasting.** In March 2020, models predicting retail demand, travel and credit risk broke almost overnight — the patterns they had learned simply stopped applying. Teams with drift monitoring noticed in days and switched to simpler rules or rapid retraining; others found out from angry business users weeks later.

### Retraining

- **Scheduled** retraining (daily, weekly) for steadily changing domains.
- **Triggered** retraining when drift or performance alerts fire.
- **Continuous training** pipelines that retrain, evaluate against the current model, and promote only if better — with humans approving high-risk changes.
- Beware **feedback loops**: a fraud model that blocks transactions never learns whether they were fraudulent; a recommender trains on what it chose to show (chapter 12). Keep some exploration or random holdout traffic.

## Responsible ML in production

- **Fairness checks** across groups (approval rates, error rates) before and after launch.
- **Explainability** for decisions affecting people (SHAP — chapter 9), and documentation ("model cards") describing intended use, data and limitations.
- **Governance:** who approved this model, on what evidence; audit trails for regulated domains (credit, insurance, hiring, health).

## LLMOps: what changes with large language models

Many of the same ideas apply to LLM applications (chapter 8), with differences:

- You usually **don't train** the model; you version **prompts**, retrieval settings, tool definitions and model versions — and treat changes to any of them like code changes.
- **Evals** replace simple accuracy: test sets with rubric-based and LLM-as-judge grading, run in CI on every prompt change.
- **Tracing** every step (prompt, retrieved documents, tool calls, tokens, latency, cost).
- **Cost and latency** monitoring per feature and per user; model routing and caching.
- **Safety monitoring:** jailbreak attempts, harmful outputs, prompt injection, PII leakage.
- Provider model updates can change behaviour — pin versions and re-run evals before upgrading.

> [!RECAP]
> - ML products are mostly **infrastructure around the model**: data, features, pipelines, serving, monitoring.
> - Build **reproducible pipelines** with versioned code and data, validation, experiment tracking and a **model registry**.
> - **Feature stores** define features once for training (point-in-time correct) and serving, preventing **training/serving skew**.
> - Serve in **batch, online, streaming or on-device**; deploy with **shadow, canary and A/B tests**, with fast rollback.
> - Monitor **data, concept and prediction drift** and real outcomes; retrain on schedule or on triggers; watch feedback loops.
> - Add fairness, explainability and governance; **LLMOps** versions prompts and runs evals, tracing, cost and safety monitoring.

> [!INTERVIEW] ML engineering interviews ask: what is training/serving skew and how do you prevent it, how would you deploy a new fraud model safely, how do you detect and handle drift, and batch vs online serving trade-offs.

::quiz {"q":"A model performs worse in production than offline because features are calculated differently in each. What is this called?","options":["Overfitting","Training/serving skew","Concept drift","Data leakage"],"answer":1,"explain":"Feature stores and shared feature code prevent it."}

::quiz {"q":"Fraudsters change tactics, so the same features now predict fraud differently. Which kind of drift is this?","options":["Data drift only","Concept drift","Prediction caching","Schema drift"],"answer":1,"explain":"The input-to-outcome relationship itself changed."}

::quiz {"q":"What does a shadow deployment do?","options":["Replaces the old model immediately","Runs the new model on real traffic without using its predictions, so it can be compared safely","Deletes old models","Hides the model from users permanently"],"answer":1,"explain":"Zero user impact while gathering evidence."}
