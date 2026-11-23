---
title: RAG — Giving an LLM Your Documents to Read
summary: Retrieval-augmented generation explained from first principles — why models need it, the full pipeline from loading documents to cited answers, the choices that make or break quality (chunking, hybrid retrieval, reranking, prompts), how to measure it, and the ways RAG systems go wrong in production.
---

## The open-book exam

> [!STORY] A bank deploys a chatbot. A customer asks, "What's the fee for an international wire on the Gold account?" The model was trained a year ago on public internet text; it has never seen this bank's fee schedule. It answers anyway — confidently — with a number it made up. Next week the bank changes the fee, and even a model fine-tuned on the old schedule would be wrong.

The fix is to stop asking the model to **remember** and let it **read**. That's **retrieval-augmented generation (RAG)**: before answering, search your documents for the relevant passages, paste them into the prompt, and tell the model to answer from them — with citations.

> [!ANALOGY] A closed-book exam vs an open-book exam. In a closed-book exam, a student who doesn't know an answer might bluff. In an open-book exam, they look it up, quote the page, and are far more accurate — as long as they can **find the right page quickly**. RAG turns the LLM's exam into an open-book one; most of the engineering is about finding the right page.

Why RAG rather than fine-tuning the model on your documents?

- **Fresh:** update a document and the next answer uses it. No retraining.
- **Cited:** answers point to sources users can check.
- **Permission-aware:** each user only retrieves what they're allowed to see.
- **Cheap:** no training runs.

Fine-tuning is better for teaching **style, format or behavior**, not facts (chapter 8).

## The pipeline, end to end

::widget Stepper {"type":"flow","cols":4,"title":"RAG end to end: preparing documents (first row) and answering a question (second row)","what":"The eight stages of a RAG system. The first four run ahead of time on your documents; the last four run for every question.","steps":["Press Play and follow the stages.","Notice which stages happen once per document and which once per question.","For each stage, think about what could go wrong — most RAG failures happen before the LLM is ever called."],"nodes":[["1. Load","Gather documents from wikis, PDFs, help centers, tickets and databases, keeping who may see each one and when it was updated."],["2. Parse and clean","Extract the text and structure — headings, tables, lists — and drop menus, footers and other noise. Scanned PDFs need OCR."],["3. Chunk","Split documents into passages of a few hundred tokens, following the document's own sections, with a little overlap so no idea is cut in half."],["4. Embed and index","Attach metadata (title, section, date, permissions) to each chunk, embed it (chapter 5), and store it in both a vector index and a keyword index."],["5. Understand the question","Turn follow-ups like 'what about Silver?' into standalone questions ('What's the international wire fee on the Silver account?'). Split multi-part questions."],["6. Retrieve and rerank","Hybrid search with permission filters, then a reranker picks the best 5–10 chunks."],["7. Build the prompt","Instructions + the retrieved chunks, each labeled with an ID + the question. Tell the model: answer only from these sources, cite them, and say so if the answer isn't there."],["8. Answer with citations","The model answers, citing chunk IDs; the app turns them into links. Log everything for evaluation."]]}

A minimal prompt looks like this:

```text
You are the support assistant for Acme Bank. Answer using ONLY the sources below.
Cite sources like [2]. If the sources don't contain the answer, say you don't know
and suggest contacting support.

[1] Fee schedule (updated 2026-10-01) — Gold account: international wire ₹350 ...
[2] Gold account FAQ — Wires sent after 4 pm are processed the next business day ...

Question: What's the fee for an international wire on the Gold account?
```

## The choices that make or break quality

### Chunking

Too big, and a chunk contains lots of irrelevant text that dilutes the match and wastes prompt space. Too small, and the answer gets split from its context ("The fee is ₹350" — for which account?).

- Split along the document's **structure** (headings, paragraphs, table rows), not every N characters.
- Add **context** to each chunk: the document title and section heading ("Fee schedule › Gold account").
- Keep tables together; for code, chunk by function.

> [!EXAMPLE] A popular trick: embed **small** chunks for precise matching, but when one matches, give the model the **surrounding larger section** for context ("small-to-big retrieval").

### Retrieval

- Use **hybrid** search (meaning + keywords) — product names and account types are exactly what vector search misses (chapter 5).
- **Rerank** the top candidates with a cross-encoder.
- **Filter by permissions before** retrieval, never after the model has seen the text.
- **Rewrite** conversational questions into standalone ones.

### Prompting

Label sources with IDs, ask for citations, give explicit permission to say "I don't know", and put the most relevant chunks first or last (models attend less to the middle of very long contexts).

## Measuring RAG

You can't improve what you don't measure. Build a test set of real questions with known good answers and sources, and score the two halves separately:

- **Retrieval:** did the right chunk appear in the top 5? (recall@k)
- **Generation:**
  - **Faithfulness / groundedness:** is every claim supported by the retrieved sources?
  - **Answer relevance:** does it actually answer the question?
  - **Citation accuracy:** do the citations point to passages that support the claims?

LLM-as-judge (a strong model grading answers with a rubric) makes this scalable; spot-check it against human judgments.

> [!NOTE] When an answer is wrong, first check **retrieval**. If the right passage was never retrieved, no prompt can fix it. In practice, most RAG problems are search problems.

## How RAG goes wrong in production

- **Stale or duplicate documents:** three versions of the fee schedule, and the old one ranks higher. Keep metadata dates, delete old versions, prefer recent.
- **Permission leaks:** a junior employee's question retrieves a confidential HR document. Enforce access at retrieval time.
- **Prompt injection through documents:** a web page or uploaded file contains "Ignore previous instructions and…". Treat retrieved text as **data**, not instructions, and limit what the model is allowed to do afterwards.
- **Questions that need everything:** "Summarize all complaints from last quarter" can't be answered from 5 chunks. Route those to a different workflow (a database query, or map-reduce summarization).
- **Long context isn't a replacement:** even with million-token context windows, stuffing everything in is slow, expensive and less accurate. Retrieval still matters; long context lets you include bigger, better chunks.

> [!RECAP]
> - **RAG** = retrieve relevant passages, put them in the prompt, answer with **citations**. Fresh, permission-aware, and cheaper than fine-tuning for facts.
> - Quality depends mostly on **retrieval**: structure-aware **chunking** with context, **hybrid** search, **reranking**, permission **filters**, query rewriting.
> - Prompt: answer only from sources, cite, allow "I don't know".
> - Evaluate retrieval (**recall@k**) and generation (**faithfulness**, relevance, citations) separately.
> - Watch for stale docs, permission leaks, **prompt injection** and aggregate questions.

> [!INTERVIEW] "Design a chatbot over our company's documents" is a very common question. Walk through ingestion, chunking, hybrid retrieval, reranking, prompting with citations, permissions, evaluation, freshness and cost — and say when you'd choose fine-tuning instead.

::quiz {"q":"A RAG bot gives a wrong answer. What should you check first?","options":["The temperature","Whether the correct passage was retrieved at all","The model size","The UI"],"answer":1,"explain":"If retrieval missed it, the model never had a chance."}

::quiz {"q":"Where should document permissions be enforced?","options":["In the prompt: 'don't reveal confidential info'","During retrieval, so unauthorized chunks are never fetched","After the answer is generated","Nowhere — embeddings are anonymous"],"answer":1,"explain":"Never rely on the model to keep secrets it has already seen."}

::quiz {"q":"When is fine-tuning a better fit than RAG?","options":["When facts change daily","When you need to teach a consistent style, format or behavior","When you need citations","When permissions vary by user"],"answer":1,"explain":"RAG for knowledge; fine-tuning for behavior."}
