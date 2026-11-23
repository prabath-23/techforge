---
title: Neural Networks — How Layers of Simple Units Learn Complex Things
summary: From a single artificial neuron to deep networks: why stacking layers needs a non-linear twist, how backpropagation figures out how to adjust millions of weights at once, the tricks that made deep learning finally work, why GPUs matter, and the architectures that came before transformers (CNNs for images, RNNs for sequences).
---

## A neuron is a tiny voting machine

An artificial **neuron** takes several numbers as input, multiplies each by a **weight** (how important that input is), adds them up with a **bias**, and passes the total through an **activation function** that decides how strongly the neuron "fires".

> [!ANALOGY] Deciding whether to go to the beach. Inputs: is it sunny (weight +3), is it the weekend (+2), is it raining (−5), do I have work due (−4). Add up the weighted inputs plus your general beach enthusiasm (the bias); if the total is high enough, you go. A neuron makes exactly this kind of weighted decision. **Learning** means adjusting the weights — maybe rain matters less to you than you thought.

One neuron can only draw a **straight line** between "yes" and "no". To learn complicated patterns — recognizing faces, understanding sentences — you connect many neurons in **layers**: each layer takes the previous layer's outputs as its inputs. That's a **neural network**, and a network with many layers is a **deep** network — hence **deep learning**.

## Why the non-linear twist is essential

If each neuron only did weighted adding, stacking a hundred layers would be pointless: a chain of weighted sums is mathematically just **one** weighted sum. The network could still only draw straight lines.

The **activation function** adds a bend. The most common one, **ReLU**, is almost absurdly simple: if the total is negative, output 0; otherwise, output the total. That small kink, repeated across thousands of neurons and many layers, lets the network bend its decision boundaries into any shape it needs.

> [!EXAMPLE] **XOR, the problem that once killed neural network research.** XOR means "exactly one of the two inputs is on". No single straight line can separate the "yes" cases from the "no" cases. In 1969, a famous book pointed out that single-layer networks couldn't learn it, and funding for neural networks largely dried up for over a decade. A network with just one hidden layer of a few neurons solves it easily. Watch one learn XOR live:

::widget NeuralNet {}

Each line's color and thickness shows a weight (blue positive, red negative). The square on the right shows the network's current answer for every possible input — it should end up bright at the two corners where the answer is "yes".

## Backpropagation: who's to blame?

A network might have millions of weights. After it makes a wrong prediction, how do you know **which** weights to adjust, and by how much? This is what **backpropagation** solves, and it's the engine of all deep learning.

> [!ANALOGY] A restaurant receives a complaint: "the soup was too salty". The head chef asks the cook who finished the soup; that cook says the broth they received was already salty; the broth cook says they followed the recipe, but the stock they were given was concentrated. Blame flows **backwards** through the kitchen, and each person learns how much of the problem was theirs — and how to adjust next time.

In a network:

1. **Forward pass:** feed an example in, layer by layer, to get a prediction. Remember each layer's intermediate values.
2. **Measure the error** with the loss function (chapter 1).
3. **Backward pass:** starting at the output, work backwards layer by layer, computing for every weight how much it contributed to the error — the gradient. Each layer passes "blame" to the layer before it using the chain rule from calculus.
4. **Update:** nudge every weight a little in the direction that reduces the error (gradient descent, chapter 1).
5. Repeat for millions of examples.

The remarkable part: computing the gradient for **every** weight costs only about as much as the forward pass itself.

Modern frameworks do this automatically. You describe the network and the loss, and the framework works out all the gradients for you:

```python
import torch, torch.nn as nn

model = nn.Sequential(            # a small network for recognizing handwritten digits
    nn.Linear(784, 256),          # 28×28 pixel image in, 256 neurons
    nn.ReLU(),                    # the non-linear bend
    nn.Linear(256, 10),           # 10 outputs: scores for digits 0–9
)
optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)
loss_fn = nn.CrossEntropyLoss()

for images, labels in training_batches:
    predictions = model(images.view(len(images), -1))   # 1. forward pass
    loss = loss_fn(predictions, labels)                  # 2. how wrong?
    optimizer.zero_grad()
    loss.backward()                                      # 3. backpropagation: every weight's gradient
    optimizer.step()                                     # 4. nudge every weight downhill
```

Those four lines inside the loop are, at heart, how every neural network — including ChatGPT and Claude — is trained.

## What finally made deep learning work

Neural networks have existed since the 1950s, but deep ones were nearly impossible to train until around 2012. Several breakthroughs came together:

- **Vanishing gradients, fixed.** In deep networks, the "blame" signal passed backward through many layers would shrink to almost nothing, so early layers barely learned. **ReLU** activations, careful **initial weight values**, **normalization layers** and **residual connections** fixed this.
- **Residual connections** (2015) let each layer **add** its contribution to its input rather than replace it, creating a shortcut for the blame signal to flow straight back. This allowed networks with hundreds of layers; every modern language model uses them.
- **Lots of data.** ImageNet (2009) provided 14 million labeled images.
- **GPUs.** Neural networks are mostly enormous numbers of multiplications that can all happen at the same time — exactly what graphics cards were built for.

> [!STORY] **The 2012 turning point.** In the ImageNet image-recognition competition, a deep neural network called **AlexNet**, trained by Alex Krizhevsky, Ilya Sutskever and Geoffrey Hinton on two ordinary gaming graphics cards, beat every other approach by a huge margin — cutting the error rate by about 40% compared with the runner-up. Within a few years, nearly every competitor used deep learning, and the modern AI boom began.

## Architectures before transformers

### Convolutional networks (CNNs): for images

Images have structure: nearby pixels belong together, and a cat is a cat whether it's in the corner or the center. A **convolutional** layer slides a small learned filter (say 3×3 pixels) across the whole image, looking for the same pattern everywhere. Early layers learn edges and colors; middle layers learn textures and shapes; deep layers learn eyes, wheels, faces.

> [!ANALOGY] Searching a crowd photo for your friend with a magnifying glass: you move the same glass across every part of the photo, looking for the same features everywhere, rather than learning a separate way to look at each spot.

CNNs power photo tagging, medical image analysis, face unlock and self-driving car vision, and they're still widely used on phones.

### Recurrent networks (RNNs): for sequences

Text, speech and time series are sequences. A **recurrent** network reads them one step at a time, carrying a "memory" (a hidden state) forward from each step to the next. Improved versions called **LSTMs** powered Google Translate and voice assistants in the mid-2010s.

Their weaknesses: they process one word at a time (so they can't use a GPU's parallelism well), and they struggle to remember things from far back in a long text. The **attention** mechanism was invented to help with that — and then the **transformer** (next chapter) showed attention alone was enough, replacing RNNs almost entirely.

### Embeddings: turning words into numbers

A network can't do math on the word "cat". An **embedding** turns each word (or token) into a list of numbers — a point in a space with hundreds of dimensions — learned during training so that words used in similar ways end up close together. In a famous 2013 result (word2vec), the vectors even supported arithmetic: **king − man + woman ≈ queen**. Embeddings are how meaning becomes geometry (chapter 5).

> [!RECAP]
> - A **neuron** computes a weighted sum plus a bias, then an **activation function**; networks stack neurons in **layers**.
> - Without the non-linear activation, many layers equal one; with it (e.g. **ReLU**), networks can learn any shape — like **XOR**.
> - **Backpropagation** passes "blame" backwards to compute every weight's gradient efficiently; frameworks do it automatically.
> - Deep learning took off around **2012** thanks to ReLU, residual connections, big datasets and **GPUs** (AlexNet).
> - **CNNs** scan images with shared filters; **RNNs** read sequences step by step (replaced by transformers); **embeddings** turn words into meaningful vectors.

> [!INTERVIEW] Be able to explain why non-linear activations are necessary, what backpropagation computes (gradients via the chain rule) and why it's efficient, the vanishing gradient problem and its fixes, why GPUs suit neural networks, and the intuition behind CNNs and RNNs.

::quiz {"q":"Why can't a network built only from weighted sums (no activation functions) learn XOR?","options":["Too few neurons","Stacked weighted sums collapse into a single weighted sum, which can only draw a straight line","It needs convolution","XOR is impossible for any network"],"answer":1,"explain":"The non-linear activation is what gives depth its power."}

::quiz {"q":"What does backpropagation compute?","options":["The model's predictions","How much each weight contributed to the error — its gradient — working backwards from the output","The training data","The learning rate"],"answer":1,"explain":"The optimizer then uses these gradients to update the weights."}

::quiz {"q":"Why are GPUs so well suited to neural networks?","options":["They have more memory than CPUs","Neural networks are mostly huge numbers of independent multiplications that can run in parallel","They're cheaper","They can run Python faster"],"answer":1,"explain":"GPUs have thousands of cores built for exactly this kind of parallel arithmetic."}
