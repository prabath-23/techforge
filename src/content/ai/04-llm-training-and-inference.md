---
title: How LLMs Are Trained and Served: From Internet Text to a Helpful Assistant
summary: The full journey of a large language model, pretraining on trillions of tokens across thousands of GPUs, turning a document-completer into an assistant with fine-tuning and human feedback, teaching it to reason, and then the engineering of serving it to millions of users fast and affordably.
---

::widget Scene {"title": "How an LLM generates a reply, one token at a time", "sub": "tokenise → prefill → sample → append → repeat, with the KV cache", "nodes": [{"id": "t", "kind": "cells", "label": "tokens", "x": 3.1, "y": 3.1, "values": ["The", "capital", "of", "France", "is", "", ""]}, {"id": "kv", "kind": "cache", "label": "KV cache", "x": 12.68, "y": 4.68, "color": "orange"}], "metrics": [["phase", "Phase"], ["probs", "Next-token probabilities"], ["cost", "Work this step"]], "steps": [{"short": "Tok", "tag": "Tokenise", "title": "Text is split into tokens (word pieces)", "body": "<p>\"capital\" might be one token; rare words become several. Prices and limits are counted in tokens.</p>", "metrics": {"phase": ["tokenise"], "probs": ["-"], "cost": ["-"]}}, {"short": "Prefill", "tag": "Prefill", "title": "Prefill: process the whole prompt in one parallel pass", "body": "<p>Every layer computes keys and values for all 5 tokens.</p>", "show": ["t", "kv"], "set": {"t": {"marks": {"0": "blue", "1": "blue", "2": "blue", "3": "blue", "4": "blue"}, "ptr": {}}, "kv": {"badge": "5 tokens × layers"}}, "metrics": {"phase": ["prefill"], "cost": ["all prompt tokens at once"]}}, {"short": "Logits", "tag": "Predict", "title": "The last position outputs a score for every token in the vocabulary", "body": "<p>~100,000 scores → softmax → probabilities.</p>", "metrics": {"phase": ["predict"], "probs": ["Paris 92%, the 3%, a 1%"]}}, {"short": "Sample", "tag": "Sample", "title": "Pick one: temperature and top-p control randomness", "body": "<p>Temperature 0 = always the most likely; higher = more varied.</p>", "metrics": {"phase": ["sample"]}}, {"short": "Append", "tag": "Append", "title": "Append \"Paris\" and run again", "body": "<p>Only the new token needs computing, earlier keys/values come from the KV cache.</p>", "set": {"t": {"marks": {"5": "green"}, "ptr": {}, "values": ["The", "capital", "of", "France", "is", "Paris", ""]}, "kv": {"badge": "6 tokens"}}, "metrics": {"phase": ["decode"], "probs": [". 80%, 9%"], "cost": ["1 token"]}}, {"short": "Stop", "tag": "Stop", "title": "Generate \".\" then an end-of-turn token", "body": "<p>Streaming shows each token as it's produced.</p>", "set": {"t": {"marks": {"6": "green"}, "ptr": {}, "values": ["The", "capital", "of", "France", "is", "Paris", "."]}, "kv": {"badge": "7 tokens"}}, "metrics": {"phase": ["done", "good"]}}, {"short": "Mem", "tag": "Memory", "title": "The KV cache grows with context length", "body": "<p>Long contexts and many users eat GPU memory; decoding is usually memory-bandwidth bound.</p>"}, {"short": "Train", "tag": "Training", "title": "How it learned: predict the next token on trillions of tokens", "body": "<p>Then fine-tuning on instructions and human feedback to become a helpful assistant.</p>"}, {"short": "Halluc", "tag": "Limits", "title": "It always produces a plausible continuation", "body": "<p>Plausible isn't the same as true, hence hallucinations. Ground answers with retrieval and tools.</p>", "note": {"kind": "key", "text": "Inference: tokenise → prefill the prompt → loop (predict distribution → sample → append) using a KV cache. Training: next-token prediction, then alignment."}}]}



## A brilliant parrot that doesn't answer questions

> [!STORY] After months of training on most of the public internet, a freshly trained model is asked: "What is the capital of France?" It replies: "What is the capital of Germany? What is the capital of Italy?" It isn't broken. It learned to **continue documents** and on the internet, a list of quiz questions is usually followed by more quiz questions. It knows the answer, it just doesn't know it's supposed to **answer**. Turning this "base model" into an assistant is the second half of the story.

## Stage 1: pretraining, reading the internet

- **Data:** trillions of tokens of web pages, books, code, papers and more. Most of the work is **cleaning**: removing duplicates, spam, low-quality pages and personal data, and choosing the right mix (more code and math helps reasoning).
- **Task:** predict the next token (chapter 3), over and over.
- **Scale:** thousands of GPUs for weeks to months, costing tens to hundreds of millions of dollars for frontier models.

> [!ANALOGY] Pretraining is a child reading every book in the world's largest library, absorbing language, facts and patterns of reasoning, but with no idea yet how to hold a polite conversation.

### Splitting one model across thousands of GPUs

A big model doesn't fit on one GPU, and one GPU would take centuries. So the work is split several ways at once:

- **Data parallel:** every GPU group has a copy of the model and trains on different examples; they average their gradients each step.
- **Tensor parallel:** each big matrix multiplication is split across several GPUs in the same machine.
- **Pipeline parallel:** different layers live on different machines, with examples flowing through like an assembly line.
- **Sharding (ZeRO/FSDP):** split the model weights and optimizer memory across GPUs instead of copying them everywhere.

At this scale, hardware fails constantly, a GPU dies every few hours somewhere in the cluster, so training saves **checkpoints** frequently and restarts automatically. It's a distributed systems problem as much as an AI one.

## Stage 2: post-training, from parrot to assistant

::widget Stepper {"type":"flow","cols":3,"title":"From base model to helpful assistant","what":"The stages that turn a document-completer into an assistant that answers questions, follows instructions, reasons and behaves safely.","steps":["Press Play and follow the stages in order.","For each, ask: what data does this stage need, and who produces it?","Find the stage that teaches models to 'think' before answering."],"nodes":[["Base model","Knows a huge amount but only continues documents. Ask a question and it might list more questions."],["Supervised fine-tuning","Train on many examples of (request → ideal response) written by experts or strong models: answering, following formats, chatting, calling tools. Now it behaves like an assistant."],["Preference data","Show raters (people, or AI guided by written principles) two answers to the same request and record which is better, more helpful, more honest, safer."],["Learning from preferences","RLHF trains a 'reward model' to predict which answers raters prefer, then nudges the assistant toward higher-reward answers, without drifting too far from what it learned. DPO does this directly from the pairs."],["Reinforcement learning on checkable tasks","Give the model math problems with known answers and coding tasks with unit tests, and reward correct results. Models learn to plan, try, check and backtrack in long chains of thought, 'reasoning models'."],["Safety and evaluation","Training against written principles (Anthropic's Constitutional AI), red-teaming by experts trying to make it misbehave, and large evaluation suites before release."]]}

> [!NOTE] **Why reasoning models think longer.** Reinforcement learning on checkable problems taught models that writing out steps, checking work and trying another approach leads to more correct answers. Spending more computation at answer time, "test-time compute", turned out to be a new way to make models smarter, alongside making them bigger.

## Stage 3: serving, the engineering problem

Training happens once. Serving happens billions of times. Two numbers dominate users' experience:

- **Time to first token (TTFT):** how long until the reply starts appearing. Driven by **prefill** processing the whole prompt, which is compute-heavy but parallel.
- **Tokens per second:** how fast the reply streams. Driven by **decode** one token at a time, where each step must read **all** the model's weights from GPU memory. Decode is limited by **memory bandwidth** not raw compute.

> [!ANALOGY] Decoding is like a chef who must walk the entire length of a huge pantry for every single word of the order. Walking it once to cook one dish is wasteful; walking it once to cook a word for **64 orders at the same time** is far better. That's why batching many users together is the key to cheap serving.

::widget Stepper {"type":"hub","title":"The tricks that make LLM serving fast and affordable","what":"The main techniques inference servers like vLLM use. The center is the goal; each box is one technique.","steps":["Click the center for the goal.","Click each technique and ask: does it save memory, compute, or waiting time?","Find the one borrowed from operating systems' virtual memory."],"nodes":[["The goal","Serve as many tokens per second per GPU as possible, while keeping first-token time and streaming speed within targets."],["Continuous batching","Instead of waiting for a whole batch to finish, slot new requests into the running batch at every step. Massive throughput gains."],["PagedAttention","Store each request's KV cache in small fixed-size blocks, like an OS's memory pages (OS track, chapter 4). No wasted gaps, and requests with the same beginning can share blocks."],["Quantization","Store weights in 8 or 4 bits instead of 16. Less memory to read per token, so decoding speeds up, at a small quality cost."],["Speculative decoding","A tiny fast model guesses the next several tokens; the big model checks them all in one parallel pass and keeps the correct ones. Same output, 2–3× faster."],["Prompt caching","Many requests share the same long beginning (a system prompt, a document). Reuse its already-computed KV cache instead of processing it again, faster and cheaper."],["Separate prefill and decode","Run the compute-heavy prefill and the memory-heavy decode on different GPU pools, each tuned for its job."]]}

### Rough cost math

A model with N parameters needs about 2N floating-point operations per token generated. Weights in 16-bit take 2 bytes per parameter, so a 70-billion-parameter model needs ~140 GB just for weights, two 80 GB GPUs, before any KV cache. Quantized to 4-bit, it fits in ~35 GB. This is why model size, quantization and context length dominate serving bills.

> [!EXAMPLE] **Choosing a model in practice.** A customer-support bot doesn't need the biggest model for "where is my order?". Teams route easy requests to a small, cheap, fast model and escalate hard ones to a frontier model, a **model cascade** often cutting costs by more than half with no visible quality drop.

> [!RECAP]
> - **Pretraining**: next-token prediction on trillions of cleaned tokens, split across thousands of GPUs (data, tensor, pipeline parallelism, sharding), with frequent checkpoints.
> - **Post-training**: supervised fine-tuning → preference learning (RLHF/DPO) → RL on checkable tasks (reasoning) → safety training.
> - **Serving**: prefill (compute-bound, drives first-token time) vs decode (memory-bandwidth-bound, drives streaming speed).
> - Key techniques: **continuous batching** **PagedAttention** **quantization** **speculative decoding** **prompt caching** model routing.

> [!INTERVIEW] Explain the stages from base model to assistant, what RLHF does, why decode is memory-bound, how batching and the KV cache interact, and how you'd cut the cost of an LLM feature (smaller models, routing, caching, quantization, batch APIs).

::quiz {"q":"Why does a freshly pretrained base model often fail to answer a question directly?","options":["It doesn't know the answer","It learned to continue documents, not to follow instructions, that comes from fine-tuning","It has no vocabulary","It needs more GPUs"],"answer":1,"explain":"Supervised fine-tuning and preference learning teach assistant behavior."}

::quiz {"q":"Why is batching many users together so effective during decoding?","options":["It reduces the prompt length","Each step must read all weights from memory anyway; sharing that read across many requests multiplies useful work","It avoids the KV cache","It improves accuracy"],"answer":1,"explain":"Decode is limited by memory bandwidth, so amortizing the weight reads is the key."}

::quiz {"q":"Roughly how much memory do the weights of a 70B-parameter model take in 16-bit precision?","options":["14 GB","70 GB","140 GB","1.4 TB"],"answer":2,"explain":"2 bytes × 70 billion ≈ 140 GB, before the KV cache."}
