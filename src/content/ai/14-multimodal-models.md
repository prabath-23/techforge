---
title: Multimodal Models — Seeing, Hearing and Reading Together
summary: How modern AI models understand images, audio, documents and video alongside text — turning every modality into tokens, vision encoders and projection layers, early vs late fusion, speech in and out (Whisper, voice assistants), document understanding, video, agents that see screens, and how to build and evaluate multimodal features.
---

::widget Scene {"title": "How a model \"sees\" a photo", "sub": "fridge photo → patches → image tokens → recipe answer", "nodes": [{"id": "img", "kind": "doc", "label": "Fridge photo", "x": 3.72, "y": 3.72}, {"id": "p", "kind": "cells", "label": "patches (16×16 px)", "x": 3.18, "y": -4.42, "values": ["p1", "p2", "p3", "p4"]}, {"id": "enc", "kind": "cpu", "label": "Vision encoder", "x": 7.72, "y": -0.28, "color": "teal"}, {"id": "proj", "kind": "cube", "label": "Projector", "x": 11.72, "y": -4.28, "color": "purple"}, {"id": "llm", "kind": "cube", "label": "Language model", "x": 15.72, "y": -8.28, "color": "orange"}, {"id": "q", "kind": "doc", "label": "Question text", "x": 9.83, "y": -14.17}, {"id": "ans", "kind": "doc", "label": "Answer", "x": 19.72, "y": -12.28}], "links": [["img", "enc"], ["enc", "proj"], ["proj", "llm"], ["q", "llm"], ["llm", "ans"]], "metrics": [["stage", "Stage"], ["tok", "Tokens"]], "steps": [{"short": "Ask", "tag": "Input", "title": "\"What can I cook with this?\" + a fridge photo", "body": "<p>Text the model already understands; pixels it must translate.</p>", "show": ["img", "q"], "metrics": {"stage": ["input"], "tok": ["—"]}}, {"short": "Patch", "tag": "Patches", "title": "Cut the image into small square patches", "body": "<p>Like words of an image.</p>", "show": ["img", "q", "p"], "set": {"p": {"marks": {"0": "teal", "1": "teal", "2": "teal", "3": "teal"}, "ptr": {}}}, "metrics": {"stage": ["patchify"]}}, {"short": "Encode", "tag": "Encode", "title": "A vision transformer turns patches into vectors", "body": "<p>Trained (e.g. CLIP-style) so image vectors align with text that describes them.</p>", "show": ["img", "q", "p", "enc"], "flow": [["img", "enc", "#14b8a6", "patches"]], "metrics": {"stage": ["encode"], "tok": ["~700 image vectors"]}}, {"short": "Project", "tag": "Project", "title": "A projector maps them into the language model's token space", "body": "<p>Now they look like token embeddings.</p>", "show": ["img", "q", "p", "enc", "proj"], "flow": [["enc", "proj", "#a855f7", ""]], "metrics": {"stage": ["project"]}}, {"short": "Join", "tag": "Join", "title": "Image tokens + question tokens form one sequence", "body": "<p>The LLM attends across both: \"paneer\", \"tomatoes\", \"capsicum\" regions match the question.</p>", "show": ["img", "q", "p", "enc", "proj", "llm"], "flow": [["proj", "llm", "#f59e0b", "image tokens"], ["q", "llm", "#3b82f6", "text tokens"]], "metrics": {"stage": ["joint attention"], "tok": ["~700 + 12"]}}, {"short": "Answer", "tag": "Generate", "title": "\"Paneer bhurji or kadai paneer — you have paneer, tomatoes and capsicum.\"", "body": "<p>Generated token by token as usual.</p>", "show": ["img", "q", "p", "enc", "proj", "llm", "ans"], "flow": [["llm", "ans", "#22c55e", "answer"]], "metrics": {"stage": ["generate", "good"]}}, {"short": "Cost", "tag": "Cost", "title": "Images cost tokens", "body": "<p>Higher resolution = more patches = more cost and latency. Resize sensibly; crop to what matters.</p>"}, {"short": "Risk", "tag": "Risks", "title": "Text inside images is read too", "body": "<p>A photo of a sign saying \"ignore previous instructions\" is a prompt injection. Treat image content as untrusted.</p>"}, {"short": "Audio", "tag": "Other modalities", "title": "Audio and video work the same way", "body": "<p>Audio frames or video frames become tokens; some models also output images or speech.</p>", "note": {"kind": "key", "text": "Multimodal LLM: encode each modality into vectors, project into the LLM's token space, attend jointly, generate text."}}]}



## Photograph the fridge, get a recipe

> [!STORY] You take a photo of the inside of your fridge and ask an assistant: "What can I cook tonight in 30 minutes?" It recognizes half a cabbage, eggs, a block of paneer, some tomatoes and a jar of pickle, suggests a recipe, and — when you ask by voice "can I skip the onions?" — answers out loud, adjusting the steps. A few years ago this needed separate systems for image recognition, speech recognition, language understanding and speech synthesis, stitched together. Today, one **multimodal model** handles all of it.

**Multimodal** models process — and increasingly generate — more than one kind of data: text, images, audio, video, documents, even screens and sensor data. Most frontier assistants (Claude, GPT, Gemini) are multimodal.

## The key idea: everything becomes tokens

Transformers (chapter 3) operate on sequences of vectors. If you can turn an image or a sound into a sequence of vectors that live in the same space as word embeddings, the same transformer can reason over all of them together.

::widget Stepper {"type":"flow","cols":4,"title":"How an image reaches a language model","what":"The path that turns a photo into tokens a language model can read alongside your question. Audio and video follow the same pattern with different encoders.","steps":["Press Play from the photo to the answer.","Notice the projection step that translates 'vision language' into 'text language'.","Estimate why a large, detailed image costs more tokens than a small one."],"nodes":[["Image","Your fridge photo, resized and split into patches (e.g. 14×14 pixels each)."],["Vision encoder","A Vision Transformer (chapter 10), often pre-trained CLIP-style to align images with text, turns each patch into a feature vector."],["Projection","A small learned layer maps those vectors into the language model's embedding space — now they look like 'words' the LLM can attend to."],["Combined sequence","Image tokens + your question's text tokens form one sequence. Attention lets text tokens look at image patches and vice versa (chapter 3)."],["Language model reasons","The transformer answers using both: identifying items, reading labels, inferring quantities."],["Output","Text — or, in models that also generate other modalities, speech audio or images."]]}

> [!NOTE] Images cost **tokens**: a high-resolution image might become hundreds to a couple of thousand tokens. Resizing images sensibly before sending them saves cost and latency, while keeping enough detail for small text.

### Fusion strategies

- **Late fusion:** separate models per modality, combined at the end (e.g. an image classifier's label passed as text to an LLM). Simple, but loses detail.
- **Adapter-based (encoder + projection), as above:** the common recipe for vision-language models (LLaVA-style designs and many production models).
- **Natively multimodal / early fusion:** one model trained from the start on interleaved text, image and audio tokens, able to both read and generate multiple modalities (Gemini, GPT-4o-style models).

## Speech: listening and talking

- **Speech recognition (ASR):** models like **Whisper** (trained on 680,000 hours of multilingual audio) convert speech to text robustly across accents and noise — and translate.
- **Text-to-speech (TTS):** neural models produce natural, expressive voices; some can clone a voice from seconds of audio (with obvious misuse risks — chapter 13).
- **Voice assistants** traditionally chain ASR → LLM → TTS. Each hop adds latency and loses information like tone and hesitation. **Speech-to-speech** models handle audio tokens directly, responding in a few hundred milliseconds, hearing emotion and allowing natural interruptions.

> [!EXAMPLE] **Designing a voice support agent.** Latency is the make-or-break metric: people expect a reply within about half a second. Practical designs stream everything — partial transcripts start the LLM early, the LLM streams tokens, TTS starts speaking the first sentence while the rest is generated — and handle "barge-in" when the caller interrupts.

## Documents: the most valuable modality for businesses

Invoices, contracts, forms, slides, scanned PDFs, screenshots and charts hold enormous amounts of business information. Multimodal models can:

- **Read** layouts, tables, handwriting, stamps and charts directly from images — often replacing brittle OCR + template pipelines.
- **Extract** structured data ("return invoice number, vendor, line items and total as JSON matching this schema").
- **Answer questions** over long PDFs with figures, and power RAG over documents where the layout carries meaning (chapter 6).

Good practice: request **structured output** with a schema, validate totals and formats in code, keep a human review step for low-confidence or high-value cases, and evaluate on a labelled set of real documents (chapter 8).

## Video

Video adds time. Models sample frames (e.g. one per second), encode each, and add audio and transcript tokens — letting them summarize meetings, find the moment something happened ("when does the speaker show the architecture diagram?"), or describe actions. Long videos are token-hungry, so systems choose frame rates and resolution carefully, or index video into searchable segments first.

## Agents that see screens

**Computer-use** agents take **screenshots** of a desktop or browser, decide where to click and what to type, and act through tools — automating tasks in applications that have no API (chapter 7). They combine visual grounding (finding the right button), planning, and careful safety controls, since acting on a real computer has real consequences: confirmations for irreversible actions, restricted permissions, and defenses against prompt injection hidden in web pages.

## Building multimodal features

- **Choose the right granularity:** a cheap model for "is there a receipt in this photo?", a stronger one for "extract all line items".
- **Preprocess:** crop, rotate, resize and compress images; split long PDFs into pages; downsample video.
- **Ground outputs:** ask for coordinates or quoted text for verification; cross-check extracted numbers.
- **Evaluate per modality and case:** blurry photos, low light, handwriting, non-English scripts, rotated scans, small fonts — models that are excellent on clean inputs can fail on real-world ones.
- **Privacy:** images and audio often contain faces, IDs, addresses and voices; redact where possible, minimize retention, and get consent.

## Known weaknesses

- **Counting and precise spatial reasoning** ("how many screws?", "which object is left of which?") are still error-prone.
- **Small text and dense charts** may be misread, especially at low resolution.
- **Hallucinated details:** describing objects that aren't there, or reading numbers confidently but wrongly.
- **Prompt injection via images:** text hidden in an image can carry instructions — treat content in images as untrusted data, just like web pages.

> [!RECAP]
> - **Multimodal** models handle text, images, audio, documents and video together.
> - Common design: a **modality encoder** (e.g. ViT) + a **projection** into the LLM's embedding space, so attention works across modalities; natively multimodal models train on mixed tokens from the start.
> - Images and video cost **tokens** — resize and sample sensibly.
> - **Speech:** ASR (Whisper) and TTS chains vs low-latency **speech-to-speech** models; stream everything for voice agents.
> - **Documents** are a major business use: layout-aware extraction to validated structured output.
> - **Screen-reading agents** automate apps without APIs, with strong safety controls.
> - Watch for counting, small-text and hallucination errors, and image-borne prompt injection.

> [!INTERVIEW] Expect "how does an LLM understand an image?" (encoder + projection + shared attention), "design an invoice-processing pipeline" (multimodal extraction, schema validation, human review, evals), and "design a low-latency voice assistant" (streaming ASR/LLM/TTS or speech-to-speech, barge-in).

::quiz {"q":"How does a typical vision-language model feed an image to the language model?","options":["It converts the image to a caption first, always","A vision encoder turns patches into vectors, and a projection maps them into the LLM's embedding space as tokens","It sends raw pixels as text","It can't — images need a separate model"],"answer":1,"explain":"Then attention works across image and text tokens together."}

::quiz {"q":"Why can chained ASR → LLM → TTS voice assistants feel slow?","options":["Speech can't be compressed","Each stage adds latency, and waiting for each to finish compounds it; streaming or speech-to-speech models reduce it","LLMs can't read transcripts","TTS is always offline"],"answer":1,"explain":"People expect replies within about half a second."}

::quiz {"q":"Why validate totals and formats after a model extracts data from an invoice?","options":["It's required by the model","Models can misread small text or hallucinate numbers; code checks catch errors before they enter systems","Validation makes the model faster","Invoices are always correct"],"answer":1,"explain":"Combine model extraction with deterministic checks and human review."}
