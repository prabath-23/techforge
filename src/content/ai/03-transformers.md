---
title: Transformers — The Architecture Behind Every Modern LLM
summary: How text becomes tokens, how attention lets every word look at every other word (try it interactively), what happens inside one transformer block, why "predict the next word" turns out to be so powerful, and how a model actually generates a reply one token at a time.
---

::widget Scene {"title": "Attention: which words should \"it\" look at?", "sub": "one attention head, step by step: query, keys, scores, softmax, mix", "nodes": [{"id": "w", "kind": "cells", "label": "tokens", "x": 3.1, "y": 3.1, "values": ["The", "trophy", "didn't", "fit", "suitcase", "it", "big"]}], "metrics": [["step", "Step"], ["att", "\"it\" attends to"]], "steps": [{"short": "Embed", "tag": "Embed", "title": "Each token becomes a vector (+ its position)", "body": "<p>Similar words start with similar vectors; position embeddings add word order.</p>", "metrics": {"step": ["embeddings"], "att": ["—"]}}, {"short": "QKV", "tag": "Q, K, V", "title": "Each token makes three vectors: Query, Key, Value", "body": "<p>Learned projections. Query = what I'm looking for; Key = what I contain; Value = what I pass on.</p>", "metrics": {"step": ["Q, K, V projections"]}}, {"short": "Query", "tag": "Query", "title": "\"it\" asks: who am I referring to?", "body": "<p>Its query vector is compared with every token's key.</p>", "set": {"w": {"marks": {"5": "orange"}, "ptr": {"query": 5}}}, "metrics": {"step": ["query from \"it\""]}}, {"short": "Scores", "tag": "Scores", "title": "Dot product query·key for each token, scaled by √d", "body": "<p>trophy 6.1, suitcase 4.2, big 2.0, the rest small.</p>", "set": {"w": {"marks": {"5": "orange", "1": "green", "4": "blue"}, "ptr": {"query": 5}}}, "metrics": {"step": ["scores"]}}, {"short": "Softmax", "tag": "Softmax", "title": "Softmax turns scores into weights that sum to 1", "body": "<p>trophy 0.71, suitcase 0.18, others 0.11.</p>", "metrics": {"step": ["softmax"], "att": ["trophy 0.71, suitcase 0.18"]}}, {"short": "Mix", "tag": "Mix", "title": "New \"it\" = weighted sum of the values", "body": "<p>Now the representation of \"it\" carries \"trophy-ness\". Every token does this, all in parallel.</p>", "metrics": {"step": ["weighted sum of V"], "att": ["trophy", "good"]}}, {"short": "Flip", "tag": "Context", "title": "Change \"big\" to \"small\" and attention shifts to suitcase", "body": "<p>Meaning comes from context, computed fresh every time.</p>", "set": {"w": {"marks": {"5": "orange", "4": "green"}, "ptr": {"query": 5}, "values": ["The", "trophy", "didn't", "fit", "suitcase", "it", "small"]}}, "metrics": {"att": ["suitcase 0.68"]}}, {"short": "Heads", "tag": "Multi-head", "title": "Many heads run in parallel", "body": "<p>One tracks references, another grammar, another nearby words. Their outputs are combined.</p>"}, {"short": "Block", "tag": "Block", "title": "A transformer block = attention + a feed-forward network", "body": "<p>Plus residual connections and normalisation. Stack 30–100 blocks.</p>"}, {"short": "Causal", "tag": "GPT-style", "title": "In a language model, tokens may only look backwards", "body": "<p>A causal mask hides future tokens, so the model learns to predict the next one.</p>", "note": {"kind": "key", "text": "Attention: query · keys → softmax → weighted mix of values. Multi-head, stacked with feed-forward layers, fully parallel over tokens."}}]}



## The sentence that broke older models

> [!STORY] Read this: "The trophy didn't fit in the suitcase because **it** was too big." What was too big? The trophy. Now: "The trophy didn't fit in the suitcase because **it** was too small." Now "it" means the suitcase. Changing one word at the end changes what a word near the middle refers to. Older models that read one word at a time and carried a fading memory forward (RNNs, chapter 2) struggled with exactly this. In 2017, a Google paper titled *Attention Is All You Need* introduced the **transformer**, which lets every word look directly at every other word. Today GPT, Claude, Gemini and Llama are all transformers.

## Step 1: text becomes tokens

Models don't see letters or words; they see **tokens** — common chunks of text. "unbelievable" might become `un` + `believ` + `able`. A typical vocabulary has 50,000–200,000 tokens, built with an algorithm called **byte-pair encoding** that repeatedly merges the most common pairs of characters.

> [!NOTE] Rough rule for English: one token ≈ ¾ of a word, so 1,000 tokens ≈ 750 words. Other languages and code often need more tokens per word. This is why pricing, context limits and speed are all measured in tokens — and why models are sometimes bad at counting letters: they never see individual letters.

Each token is turned into an **embedding** — a list of a few thousand numbers (chapter 2). Because attention itself ignores order, information about **position** is added too (modern models use a technique called **RoPE**, which rotates the vectors by an amount that depends on position).

## Step 2: attention — every word asks a question

> [!ANALOGY] A meeting where everyone holds three cards. A **Query** card: "what am I looking for?" A **Key** card: "here's what I'm about". A **Value** card: "here's what I'll share if you pick me". Each person compares their query with everyone's key; the better the match, the more attention they pay to that person's value. The word "it" holds a query like "I'm a pronoun — which noun am I?"; "trophy" and "suitcase" have keys that match well; the rest of the sentence decides which wins.

Mechanically, for each token:

1. Multiply its embedding by three learned matrices to get a **query**, a **key** and a **value**.
2. Score it against every other token: the dot product of its query with their keys (divided by a constant to keep numbers stable).
3. Turn the scores into weights that add up to 1 with **softmax**.
4. The output is the weighted mix of everyone's values.

Click on words below to see where each one "looks":

::widget AttentionViz {}

**Multi-head attention** runs many of these in parallel (say 32 "heads"), each with its own matrices. In practice different heads learn different jobs: one tracks which noun a pronoun refers to, another tracks the previous word, another matches opening and closing brackets in code.

**Causal masking:** a model trained to predict the next word must not peek at the future, so each token can only attend to tokens **before** it.

> [!DEEP] Attention compares every token with every other one, so its cost grows with the **square** of the length: doubling the context quadruples the work. This is why long contexts are expensive, and why techniques like **FlashAttention** (computing attention in small tiles that fit in the GPU's fastest memory) and grouped-query attention matter so much.

## Step 3: one transformer block

Attention lets tokens share information. Then each token goes, separately, through a **feed-forward network** (a small two-layer neural network) where much of the model's "knowledge" seems to be stored. Around both sit **normalization** and **residual connections** (chapter 2). That's one block. Large models stack 32 to over 100 of them.

::widget Stepper {"type":"layers","title":"Inside one transformer block (stacked dozens of times)","what":"The parts a token's vector passes through in one block, top to bottom. The output of one block is the input to the next.","steps":["Press Play and follow one token's vector down.","Notice where tokens talk to each other (attention) and where each thinks alone (feed-forward).","Find the residual connections that let information skip ahead."],"nodes":[["Input vectors","One vector per token, from the embedding layer or the previous block."],["Normalize","Rescale each vector so numbers stay in a healthy range (RMSNorm in most modern models)."],["Multi-head attention","Tokens exchange information: each mixes in the values of the earlier tokens it finds relevant."],["Add (residual)","The attention result is ADDED to the original vector, so nothing is lost and gradients flow easily."],["Normalize again","Prepare for the next step."],["Feed-forward network","Each token, on its own, passes through a wide two-layer network. Most of the model's parameters — and much of its factual knowledge — live here. Some models use 'mixture of experts', routing each token to only a few of many feed-forward networks."],["Add (residual)","Added back to the vector again, then passed to the next block."]]}

At the very end, the final vector of the last token is turned into a score for every token in the vocabulary, and softmax turns those into probabilities: "the next token is ` Paris` with 92%, ` the` with 3%…"

## Why "predict the next word" is so powerful

The training task sounds trivial: given some text, guess the next token. But to predict well across the whole internet, a model must learn grammar, facts ("The capital of France is…"), reasoning ("If all A are B, and x is A, then x is…"), code ("for i in range(…"), and even what different kinds of people would say. Predicting the next word of a physics textbook well requires something like understanding physics.

Researchers found **scaling laws**: making the model bigger, training on more data, and using more compute improves next-token prediction smoothly and predictably — and new abilities appear along the way.

## How a reply is generated

Generation is a loop:

1. Run the whole prompt through the model (the **prefill** step) — this can happen in parallel.
2. Pick one next token from the probabilities.
3. Append it and run again for the next token (the **decode** step), one token at a time, until a stop token.

How do you pick the token?

- **Greedy:** always the most likely. Predictable, but can be repetitive.
- **Temperature:** divides the scores before softmax. Low (0–0.3) → focused and consistent, good for code and extraction. High (0.8–1.2) → more varied, good for brainstorming.
- **Top-p (nucleus):** pick only from the smallest set of tokens whose probabilities add up to, say, 90%, cutting off nonsense tails.

> [!WARN] **Hallucination** follows directly from this design. The model always produces the most plausible-sounding continuation — it has no built-in "I don't know". If it never learned a fact, it may confidently invent a plausible one: a fake paper citation, a non-existent API function. Ground it with real documents (RAG, chapter 6), give it tools, and check its outputs.

**The KV cache:** when generating token 500, the keys and values of tokens 1–499 haven't changed, so they're stored instead of recomputed. This makes generation fast but uses a lot of GPU memory — a central concern in serving LLMs (next chapter).

> [!RECAP]
> - Text → **tokens** → **embeddings** + position information.
> - **Attention**: each token's query is compared with every key; the softmax weights mix the values. **Multi-head** = many in parallel; **causal mask** hides the future. Cost grows with length squared.
> - A **block** = attention + feed-forward, with normalization and residual connections; stacked dozens of times.
> - Trained to **predict the next token**; scale improves it predictably.
> - Generation picks one token at a time (**temperature**, **top-p**); the **KV cache** avoids recomputation; **hallucination** is a natural consequence.

> [!INTERVIEW] Explain attention with Q, K, V in plain words; why transformers beat RNNs (parallel training, direct long-range connections); why attention is quadratic; what temperature does; what the KV cache is; why models hallucinate.

::quiz {"q":"Why can transformers be trained much faster than RNNs on GPUs?","options":["They have fewer parameters","All positions in a sequence are processed in parallel instead of one word at a time","They don't use gradients","They use smaller vocabularies"],"answer":1,"explain":"RNNs must process step by step; transformer training handles every position at once (with a causal mask)."}

::quiz {"q":"You want an LLM to extract invoice fields consistently. Which temperature?","options":["High, around 1.2","Low, around 0","It doesn't matter","Negative"],"answer":1,"explain":"Low temperature makes output focused and repeatable."}

::quiz {"q":"What does the KV cache store?","options":["The user's chat history on disk","The keys and values of earlier tokens, so they aren't recomputed for each new token","The model's weights","Cached web pages"],"answer":1,"explain":"It trades GPU memory for much faster generation."}
