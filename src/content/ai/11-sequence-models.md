---
title: Sequence Models: RNNs, LSTMs and Why Attention Won
summary: How neural networks handle data that comes in order, text, speech, sensor readings, stock prices. Recurrent networks and their memory, why they forget (vanishing gradients), how LSTM and GRU gates fix it, sequence-to-sequence models and the bottleneck that led to attention, and why transformers replaced recurrence, plus where RNN-like ideas (state space models) are coming back.
---

::widget Scene {"title": "Why attention replaced recurrent networks", "sub": "an RNN reading a sentence, its memory fading, and the transformer fix", "nodes": [{"id": "rnn", "kind": "cells", "label": "RNN reads one word at a time", "x": 0.0, "y": 0.0, "values": ["The", "keys", "to", "the", "cabinet", "are"]}, {"id": "h", "kind": "cube", "label": "Hidden state (memory)", "x": 8.65, "y": 0.65, "color": "purple"}, {"id": "tr", "kind": "cells", "label": "Transformer: all words at once", "x": 9.3, "y": 9.3, "values": ["The", "keys", "to", "the", "cabinet", "are"]}], "metrics": [["model", "Model"], ["mem", "Memory of \"keys\""], ["speed", "Training"]], "steps": [{"short": "Seq", "tag": "RNN", "title": "An RNN reads word 1, updates its hidden state, moves to word 2…", "body": "<p>The hidden state is a running summary of everything so far.</p>", "show": ["rnn", "h"], "set": {"rnn": {"marks": {"0": "blue"}, "ptr": {}}}, "metrics": {"model": ["RNN"], "mem": ["-"], "speed": ["sequential"]}}, {"short": "Keys", "tag": "RNN", "title": "\"keys\" (plural) goes into the memory", "body": "<p>The verb at the end must agree with it.</p>", "set": {"rnn": {"marks": {"0": "blue", "1": "orange"}, "ptr": {}}, "h": {"badge": "keys: strong"}}, "metrics": {"mem": ["strong"]}}, {"short": "Fade", "tag": "Problem", "title": "Each step overwrites some of the memory", "body": "<p>By \"are\", the signal from \"keys\" has faded, and \"cabinet\" (singular) is fresher. Vanishing gradients make long-range learning hard.</p>", "set": {"rnn": {"marks": {"0": "blue", "1": "orange", "2": "blue", "3": "blue", "4": "blue", "5": "red"}, "ptr": {}}, "h": {"badge": "keys: weak"}}, "metrics": {"mem": ["faded", "bad"]}}, {"short": "LSTM", "tag": "LSTM", "title": "LSTMs add gates that decide what to keep and forget", "body": "<p>Much better at long dependencies, dominant until ~2017.</p>", "set": {"h": {"badge": "LSTM gates: keep \"keys\""}}, "metrics": {"model": ["LSTM"], "mem": ["kept"]}}, {"short": "Slow", "tag": "Problem", "title": "But training is still one step at a time", "body": "<p>Word 6 can't be processed until word 5 is done, GPUs sit mostly idle.</p>", "metrics": {"speed": ["slow", "bad"]}}, {"short": "Attn", "tag": "Transformer", "title": "A transformer processes all words in parallel", "body": "<p>\"are\" attends directly to \"keys\", one hop, no fading.</p>", "show": ["rnn", "h", "tr"], "set": {"tr": {"marks": {"1": "green", "5": "orange"}, "ptr": {}}}, "metrics": {"model": ["Transformer"], "mem": ["direct attention", "good"], "speed": ["parallel", "good"]}}, {"short": "Cost", "tag": "Trade-off", "title": "The cost: attention compares every pair of tokens", "body": "<p>O(n²) in sequence length. Long-context tricks: efficient attention kernels, sliding windows.</p>"}, {"short": "SSM", "tag": "Today", "title": "State-space models (Mamba) revisit recurrence for very long inputs", "body": "<p>Linear time, parallel training. Hybrids mix both.</p>", "note": {"kind": "key", "text": "RNNs pass a fading memory step by step and train sequentially; LSTMs gate it; transformers attend directly and train in parallel at O(n²) cost."}}]}



## The translation that forgot the beginning

> [!STORY] In 2016, Google switched Google Translate from older statistical methods to a neural network, an 8-layer **LSTM** sequence-to-sequence model. Translation quality jumped more in one release than in the previous decade. But engineers knew its weakness: the network read the whole source sentence, squeezed its meaning into **one fixed-size list of numbers** and then wrote the translation from that summary alone. Long sentences lost details from the beginning. The fix, letting the decoder **look back** at every source word as it wrote each output word, was called **attention**. A year later, a team at Google asked: what if attention is all you need? That question produced the transformer (chapter 3).

This chapter tells the story of how we got there, because the ideas, memory, gating, attention, state, still matter.

## Data that comes in order

Many problems involve **sequences** where order carries meaning: "dog bites man" vs "man bites dog". Examples: sentences, speech audio, sensor readings from a machine, daily sales, clickstreams, DNA.

A plain neural network takes a fixed-size input. Sequences vary in length, and the same pattern can appear at any position. We need a model that processes one step at a time and **remembers** what came before.

## Recurrent neural networks (RNNs)

An **RNN** reads the sequence one element at a time. At each step it combines the new input with a **hidden state** its running memory, to produce a new hidden state:

```text
h_t = tanh(W_x · x_t + W_h · h_(t-1) + b)
```

The **same weights** are used at every step (like a convolution shares weights across positions, chapter 10).

> [!ANALOGY] Reading a novel and keeping a mental summary. After each sentence, you update your summary using the new sentence and what you remembered. The summary is the hidden state. The way you update it, your reading skill, stays the same from page to page.

Training uses **backpropagation through time**: unroll the network across all the steps and backpropagate through the whole chain (chapter 2).

## Why plain RNNs forget

Gradients flowing back through many steps get multiplied by the same weights over and over. They either shrink towards zero (**vanishing gradients**) or blow up (**exploding gradients**). In practice, a plain RNN struggles to connect information more than 10–20 steps apart, it can't learn that a verb at the end of a long sentence must agree with a subject at the start.

Exploding gradients are tamed by **gradient clipping**. Vanishing gradients needed a new design.

## LSTMs and GRUs: memory with gates

The **LSTM** (long short-term memory, Hochreiter and Schmidhuber, 1997) adds a separate **cell state** a memory lane where information can flow across many steps almost unchanged, and **gates** that learn what to write, keep and read.

::widget Stepper {"type":"flow","cols":4,"title":"Inside one LSTM step","what":"The gates of an LSTM cell at one time step. Each gate is a small learned layer outputting values between 0 (block) and 1 (pass), deciding what happens to the long-term memory.","steps":["Press Play and follow the cell state from left to right.","For the sentence 'The keys to the cabinet ARE on the table', think about which gate keeps 'keys = plural' alive until 'are'.","Notice that the cell state is mostly updated by addition, the secret to avoiding vanishing gradients."],"nodes":[["Forget gate","Looks at the new input and previous output and decides what to erase from memory (e.g. forget the old subject when a new sentence starts)."],["Input gate + candidate","Decides what new information to store (e.g. 'the subject is plural') and how much of it."],["Update the cell state","Old memory × forget gate + new candidate × input gate. Because this is mostly addition, information and gradients can flow across hundreds of steps."],["Output gate","Decides what part of the memory to reveal as this step's output (the hidden state), e.g. the number of the subject when a verb is expected."]]}

The **GRU** (gated recurrent unit, 2014) simplifies this to two gates and no separate cell state, similar performance, fewer parameters.

LSTMs powered a generation of products in the mid-2010s: speech recognition (Google, Siri), machine translation, handwriting recognition, autocomplete keyboards and time-series forecasting.

## Sequence-to-sequence and the bottleneck

For translation, an **encoder** RNN reads the source sentence into a final hidden state; a **decoder** RNN generates the target sentence word by word, starting from that state.

The problem from the story: everything about a 40-word sentence must fit into **one** vector. Information from early words gets diluted.

### Attention: look back instead of remembering everything

**Attention** (Bahdanau et al., 2014) lets the decoder, at each output step, compute a **weighted look** over **all** encoder hidden states, focusing on the source words most relevant to the word it's about to write (when writing "chat", focus on "cat").

> [!ANALOGY] A human translator doesn't memorize a whole paragraph and then write the translation from memory. They glance back at the relevant part of the original for each phrase they write. Attention gives the model that glance.

Translation quality on long sentences improved dramatically, and the attention weights were interpretable, showing which source words aligned with which target words.

## Why transformers replaced RNNs

The 2017 transformer (chapter 3) kept attention and **removed recurrence entirely**:

| | RNN / LSTM | Transformer |
|---|---|---|
| Processing | One step after another | All positions at once during training |
| GPU efficiency | Poor, sequential steps can't be parallelized | Excellent, big parallel matrix multiplications |
| Long-range connections | Through many steps of memory (can fade) | Direct: any token attends to any other in one layer |
| Cost with length | Linear | Quadratic attention (chapter 3) |
| Generation memory | Fixed-size state | Growing KV cache |

Parallel training on GPUs was decisive: it let models scale to billions of parameters and trillions of tokens, which is where modern capabilities came from.

## Recurrence returns: state space models

The transformer's weaknesses, quadratic cost in sequence length and a KV cache that grows with context, revived interest in recurrent ideas:

- **State space models** (S4, **Mamba** 2023) process sequences with a fixed-size state like an RNN at inference time (constant memory per token, linear time in length), but are designed so training can still run in parallel.
- **Linear attention** and RNN-transformer hybrids (RWKV, and hybrid models mixing attention layers with Mamba layers) aim for transformer quality with cheaper long contexts.

They're especially attractive for very long sequences, audio, genomics, long documents, and on-device inference.

## Sequence modeling beyond text

- **Time-series forecasting** (demand, energy load, server traffic): classical methods (ARIMA, exponential smoothing), gradient boosting with lag features (chapter 9), LSTMs, and transformer-based forecasters; increasingly, pre-trained "foundation" forecasting models.
- **Speech recognition:** modern systems (like Whisper) use transformer encoder-decoders on audio spectrograms.
- **Event sequences:** predicting a user's next action from their clickstream for recommendations (chapter 12).

> [!RECAP]
> - **RNNs** process sequences step by step with a hidden state and shared weights; trained with backpropagation through time.
> - Plain RNNs suffer **vanishing/exploding gradients** and forget long-range information.
> - **LSTMs/GRUs** add a mostly-additive memory and learned **gates** enabling long-range learning; they powered speech and translation in the 2010s.
> - **Seq2seq** squeezed inputs into one vector; **attention** let the decoder look back at all inputs.
> - **Transformers** dropped recurrence for parallel attention and scaled; **state space models** (Mamba) bring back fixed-size state for efficient long sequences.

> [!INTERVIEW] Explain vanishing gradients in RNNs and how LSTM gates help, what the seq2seq bottleneck was and how attention fixed it, and why transformers train faster than RNNs. Mentioning state space models shows you follow current research.

::quiz {"q":"Why do plain RNNs struggle with long-range dependencies?","options":["They have too few layers","Gradients shrink (or explode) as they flow back through many time steps","They can't process text","They're too fast"],"answer":1,"explain":"Vanishing gradients make distant connections hard to learn."}

::quiz {"q":"What problem did attention solve in seq2seq translation?","options":["Slow tokenization","The decoder had to rely on one fixed-size summary of the whole source sentence","GPU memory limits","Vocabulary size"],"answer":1,"explain":"Attention lets each output step look back at all source positions."}

::quiz {"q":"What's the main reason transformers replaced RNNs for large models?","options":["They use less memory always","Training processes all positions in parallel, using GPUs efficiently and allowing massive scale","They have no weights","They don't need data"],"answer":1,"explain":"Parallelism enabled scaling to billions of parameters."}
