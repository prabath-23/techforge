---
title: Building Real AI Products — Prompting, Fine-Tuning, Evals and Architecture
summary: The practical engineering of shipping AI features — the ladder from prompting to RAG to fine-tuning and when to climb it, cheap fine-tuning with LoRA, why evaluations are the most important thing you'll build, the architecture of a production LLM app, and controlling cost, latency and safety.
---

::widget Scene {"title": "Evals: the test suite for AI features", "sub": "building one, catching a regression, and deciding whether to fine-tune", "nodes": [{"id": "set", "kind": "doc", "label": "Eval set: 150 real cases", "x": 3.72, "y": 3.72}, {"id": "run", "kind": "cpu", "label": "Runner: old vs new prompt", "x": 8.22, "y": -0.78, "color": "purple"}, {"id": "g1", "kind": "cube", "label": "Code graders", "x": 9.62, "y": -8.38, "color": "blue"}, {"id": "g2", "kind": "cube", "label": "LLM judge + rubric", "x": 15.82, "y": -2.18, "color": "orange"}, {"id": "rep", "kind": "doc", "label": "Report by category", "x": 17.22, "y": -9.78, "color": "green"}], "links": [["set", "run"], ["run", "g1"], ["run", "g2"], ["g1", "rep"], ["g2", "rep"]], "metrics": [["old", "Old prompt"], ["new", "New prompt"], ["note", "Note"]], "steps": [{"short": "Vibes", "tag": "Problem", "title": "\"The new prompt feels better\" — based on 5 tries", "body": "<p>LLM outputs vary; anecdotes mislead.</p>", "show": ["set"], "metrics": {"old": ["?"], "new": ["?"], "note": ["vibes", "bad"]}}, {"short": "Data", "tag": "Dataset", "title": "Collect real inputs: common cases, edge cases, past failures", "body": "<p>Each with a reference answer or a rubric. Tag by category (refunds, Hindi, angry customers…).</p>", "metrics": {"note": ["150 cases, 8 categories"]}}, {"short": "Graders", "tag": "Grading", "title": "Grade automatically", "body": "<p>Code checks for exact things (valid JSON, correct order ID); an LLM judge with a clear rubric for tone and correctness — calibrated against human labels.</p>", "show": ["set", "run", "g1", "g2"], "metrics": {"note": ["code + LLM judge"]}}, {"short": "Run", "tag": "Run", "title": "Run both prompts on every case (several samples each)", "body": "<p>Same model, same settings.</p>", "flow": [["run", "g1", "#a855f7", "300 outputs"], ["run", "g2", "#a855f7", ""]], "metrics": {"old": ["81%"], "new": ["88%"]}}, {"short": "Slice", "tag": "Report", "title": "Look by category, not only the average", "body": "<p>Refunds 70% → 95%… but Hindi 92% → 61%.</p>", "show": ["set", "run", "g1", "g2", "rep"], "flow": [["g1", "rep", "#22c55e", ""], ["g2", "rep", "#22c55e", ""]], "set": {"rep": {"badge": "Hindi regressed"}}, "metrics": {"note": ["regression found", "bad"]}}, {"short": "Fix", "tag": "Iterate", "title": "Fix the prompt; rerun; all categories ≥ old", "body": "<p>Now ship. Add the failures to the eval set so they never come back.</p>", "set": {"rep": {"badge": "all green"}}, "metrics": {"new": ["90%", "good"], "note": ["shipped"]}}, {"short": "Ladder", "tag": "Fine-tune?", "title": "Climb the ladder only as far as evals show you need", "body": "<p>Prompting → retrieval (RAG) → tools → fine-tuning. Fine-tune for consistent format, style or a narrow skill at lower cost — not to add fresh facts.</p>"}, {"short": "FT", "tag": "Fine-tuning", "title": "Fine-tuning: train on hundreds–thousands of good examples", "body": "<p>LoRA updates small adapter weights cheaply. Evaluate against the same set — and watch for forgetting.</p>"}, {"short": "Prod", "tag": "Production", "title": "Keep evaluating in production", "body": "<p>Sample live traffic, collect user feedback, watch cost and latency, and alert on quality drops.</p>", "note": {"kind": "key", "text": "Evals are your tests: real cases, automatic graders, results by category, run on every change. Fine-tune only when evals show prompting and retrieval aren't enough."}}]}



## The demo that worked and the product that didn't

> [!STORY] A team builds a demo in an afternoon: paste a support ticket, get a perfect draft reply. Leadership loves it. Three months later it's in production and everyone is unhappy. It invents refund policies. It answers in English to Hindi tickets. It costs ₹9 per ticket. One prompt tweak fixed the refund problem but quietly broke the tone. Nobody can tell whether last week's change helped or hurt. The model was never the problem — the missing **engineering** around it was.

## The ladder: try the cheap rungs first

1. **Better prompting.** Clear instructions, the right context, a few examples, a defined output format. Solves most problems and takes minutes.
2. **RAG** (chapter 6) when the model lacks **knowledge** — your documents, recent facts.
3. **Tools and agents** (chapter 7) when it needs to **act** or look things up live.
4. **Fine-tuning** when it needs to learn a **behavior** prompting can't achieve reliably: a precise format, a house style, a narrow classification task — or when you want a **small, cheap model** to do what a big one does.

### Prompting well

- Give the model the context a smart new colleague would need: who the users are, what good looks like, what to avoid.
- Show **examples** of ideal outputs, including tricky cases.
- Ask for **structured output** (JSON matching a schema) when code will read it.
- Let it **think first** on hard problems, then give the final answer.
- Put stable instructions first so **prompt caching** can reuse them.

## Fine-tuning without breaking the bank

Fine-tuning continues training a model on your own examples. Updating all of a 70-billion-parameter model's weights needs a lot of GPU memory. **LoRA** (low-rank adaptation) freezes the original weights and trains small "adapter" matrices added alongside them — often under 1% of the parameters.

> [!ANALOGY] Instead of rewriting a whole textbook to suit your course, you add a thin set of sticky notes. The book stays the same; the notes change how it's used — and you can keep a different set of notes for each course.

**QLoRA** goes further by loading the frozen model in 4-bit precision, so a large model can be fine-tuned on a single GPU. Many adapters can be served on top of one base model.

> [!WARN] Fine-tuning is a poor way to teach **facts**: the model may still hallucinate, can't cite, and goes stale. Your training data quality matters more than quantity — a few hundred excellent examples beat thousands of sloppy ones. And fine-tuning can erode general abilities or safety behavior, so evaluate broadly afterwards.

**Distillation:** use a large model to generate high-quality outputs, then fine-tune a small model on them. The small model handles your specific task nearly as well at a fraction of the cost and latency.

## Evals: the most important thing you'll build

Without evaluations, every change is a guess. With them, you can swap models, rewrite prompts and refactor retrieval with confidence — exactly like a test suite in normal software.

::widget Stepper {"type":"cycle","title":"Eval-driven development","what":"The loop teams use to improve AI features steadily instead of by gut feeling. It's test-driven development, adapted for outputs that aren't exactly right or wrong.","steps":["Press Play and go around the loop.","Notice that production failures feed back into the test set.","Compare it with how you'd improve normal code using a test suite."],"nodes":[["Define 'good'","Write down what a good output means for this product: correct, grounded in sources, right format, right tone, safe, fast and affordable enough."],["Build a test set","Real (anonymized) user inputs, tricky edge cases, adversarial attempts and past failures, each with a reference answer or grading criteria. Start with 50–200; grow it forever."],["Grade","Use code checks wherever possible (valid JSON? correct label? tests pass?), an LLM judge with a rubric for fuzzy qualities, and human review to keep the judge honest."],["Change one thing","A prompt, model, retrieval setting or fine-tune. Re-run everything and compare with the previous results."],["Ship and watch","Track real-world signals — thumbs up/down, tasks completed, escalations to humans, A/B tests — and add new failures to the test set."]]}

> [!EXAMPLE] In the story above, an eval set of 150 real tickets — including Hindi tickets and refund questions — would have caught both the invented policy and the tone regression **before** release, by showing the scores side by side for the old and new prompt.

## The architecture of a production LLM app

::widget Stepper {"type":"flow","cols":4,"title":"A reference architecture for an LLM product","what":"The components around the model in a real AI product. The model is one box; most of the engineering is everything else.","steps":["Press Play and follow a request from the user to the model and back.","Find where cost is controlled and where safety is enforced.","Notice that every step is logged for evaluation."],"nodes":[["App","Streams the reply token by token so it feels fast; lets users stop generation and give feedback."],["API and auth","Checks who the user is, what they may do, and per-user limits on requests and tokens."],["Orchestrator","Builds the context — conversation history, retrieved documents, available tools — and runs the workflow or agent loop with step and cost limits."],["Model gateway","One place for API keys, routing (a cheap model first, a stronger one for hard cases), fallbacks between providers, retries, caching and usage tracking."],["Models","Hosted APIs or self-hosted models on GPUs. Non-urgent work goes to batch APIs, which are typically about half price."],["Tools and data","Search, vector databases, SQL, internal APIs and MCP servers — each with its own permission checks."],["Guardrails","Filters on input and output: personal-data redaction, schema validation, checks that answers are grounded in sources."],["Observability","A trace of every step — prompts, documents, tool calls, tokens, latency, cost — feeding dashboards and the eval set."]]}

### Cost and latency levers

- **Smaller models** for easier steps; route only hard ones to big models.
- **Prompt caching** for long, repeated instructions or documents.
- **Shorter outputs** — output tokens are the slowest and most expensive.
- **Streaming** so users see progress immediately.
- **Batch APIs** for offline jobs.
- **Parallel calls** where steps don't depend on each other.

### Safety and trust

- Validate structured outputs against a schema and retry on failure.
- Redact personal data before logging.
- Keep humans in the loop for high-stakes decisions (medical, legal, financial).
- Be transparent with users that they're talking to AI, and give an easy path to a human.

> [!RECAP]
> - Climb the ladder: **prompting → RAG → tools → fine-tuning**. RAG for knowledge, fine-tuning for behavior.
> - **LoRA/QLoRA** make fine-tuning cheap; **distillation** makes small models good at narrow tasks.
> - **Evals** are your test suite: define good, build a dataset, grade (code, LLM judge, humans), change one thing, feed failures back.
> - A real AI product is mostly **engineering around the model**: orchestration, a gateway, guardrails and observability.
> - Control cost and latency with routing, caching, short outputs, streaming and batch.

> [!INTERVIEW] Be ready to explain when to use prompting vs RAG vs fine-tuning, what LoRA does, how you'd evaluate an LLM feature before and after launch, and to sketch the architecture of an AI product with cost, latency and safety controls.

::quiz {"q":"Your model keeps answering with outdated product prices. What's the right fix?","options":["Fine-tune it on the price list","Use RAG or a tool that fetches current prices","Raise the temperature","Use a bigger model"],"answer":1,"explain":"Facts that change belong in retrieval, not in weights."}

::quiz {"q":"What does LoRA do?","options":["Trains all weights faster","Freezes the base model and trains small adapter matrices — a tiny fraction of the parameters","Compresses prompts","Removes the need for training data"],"answer":1,"explain":"Cheap to train, and many adapters can share one base model."}

::quiz {"q":"Why build an eval set before tweaking prompts?","options":["It's required by providers","Without it you can't tell whether a change helped or quietly broke something else","It makes the model faster","It replaces monitoring"],"answer":1,"explain":"Evals are the AI equivalent of a regression test suite."}
