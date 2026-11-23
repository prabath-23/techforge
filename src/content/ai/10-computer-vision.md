---
title: Computer Vision — From CNNs to Vision Transformers
summary: How machines learn to see — images as arrays of numbers, convolutions and what filters learn, the landmark architectures (AlexNet, VGG, ResNet), transfer learning, the main vision tasks (classification, detection, segmentation), Vision Transformers and CLIP, data augmentation, and deploying vision models on phones and in production.
---

::widget Scene {"title": "Convolutions: sliding a pattern detector over an image", "sub": "edges → shapes → objects, then fine-tune for a new task", "nodes": [{"id": "img", "kind": "cells", "label": "pixel row", "x": 0.0, "y": 0.0, "values": [0, 0, 9, 9, 9, 0, 0]}, {"id": "f", "kind": "cells", "label": "edge filter", "x": 5.34, "y": 3.34, "values": [-1, 1]}, {"id": "out", "kind": "cells", "label": "feature map", "x": 8.06, "y": 8.06, "values": ["", "", "", "", "", ""]}], "metrics": [["pos", "Filter position"], ["val", "Response"], ["note", "Note"]], "steps": [{"short": "Pixels", "tag": "Input", "title": "An image is a grid of numbers", "body": "<p>One row shown: dark, dark, bright ×3, dark, dark.</p>", "show": ["img"], "metrics": {"pos": ["—"], "val": ["—"], "note": ["—"]}}, {"short": "Filter", "tag": "Filter", "title": "A filter is a small grid of learned weights", "body": "<p>[−1, +1] responds to \"brighter on the right\" — a vertical edge.</p>", "show": ["img", "f"]}, {"short": "P0", "tag": "Slide", "title": "Position 0: 0×−1 + 0×1 = 0", "body": "<p>Flat area, no response.</p>", "show": ["img", "f", "out"], "set": {"img": {"marks": {"0": "blue", "1": "blue"}, "ptr": {"win": 0}}, "out": {"marks": {"0": "dark"}, "ptr": {}, "values": [0, "", "", "", "", ""]}}, "metrics": {"pos": ["0"], "val": ["0"]}}, {"short": "P1", "tag": "Slide", "title": "Position 1: 0×−1 + 9×1 = 9 → edge!", "body": "<p>Strong response where dark meets bright.</p>", "set": {"img": {"marks": {"1": "blue", "2": "blue"}, "ptr": {"win": 1}}, "out": {"marks": {"1": "green"}, "ptr": {}, "values": [0, 9, "", "", "", ""]}}, "metrics": {"pos": ["1"], "val": ["9", "good"]}}, {"short": "Rest", "tag": "Slide", "title": "Slide across: 0, 9, 0, 0, −9, 0", "body": "<p>A negative response marks the bright-to-dark edge.</p>", "set": {"img": {"marks": {}, "ptr": {}}, "out": {"marks": {"1": "green", "4": "red"}, "ptr": {}, "values": [0, 9, 0, 0, -9, 0]}}, "metrics": {"note": ["two edges found"]}}, {"short": "Share", "tag": "Why", "title": "The same weights at every position", "body": "<p>A cat is recognised anywhere in the image, with far fewer parameters than a fully connected layer.</p>"}, {"short": "Deep", "tag": "Hierarchy", "title": "Stack layers: edges → textures → parts → objects", "body": "<p>Pooling or strides shrink the map so later layers see larger areas.</p>", "metrics": {"note": ["feature hierarchy"]}}, {"short": "Learn", "tag": "Training", "title": "Filters aren't hand-designed — they're learned by backprop", "body": "<p>Trained on millions of labelled images.</p>"}, {"short": "Transfer", "tag": "Transfer", "title": "New task, few photos? Fine-tune a pre-trained model", "body": "<p>Replace the last layer; a few hundred labelled images often suffice. Augment with flips, crops and colour changes.</p>", "metrics": {"note": ["transfer learning", "good"]}}, {"short": "ViT", "tag": "Today", "title": "Vision Transformers split images into patches and use attention", "body": "<p>Tasks: classification, detection (boxes), segmentation (pixels), and multimodal models.</p>", "note": {"kind": "key", "text": "Convolutions slide shared learned filters over images, building a hierarchy of features. Fine-tune pre-trained models for new tasks."}}]}



## A phone that knows your face

> [!STORY] Every time you unlock your phone by looking at it, a neural network compares the image from the camera with your face, in a fraction of a second, entirely on the device — in the dark, with glasses, with a new haircut. Twenty years ago, computer vision researchers hand-designed features like "edges at these angles" and struggled to recognize a cat reliably. Since 2012, networks that **learn their own features** from millions of images have made vision practical everywhere: photo search, medical scans, self-checkout, crop monitoring, factory quality control and self-driving cars.

## An image is a grid of numbers

A colour image is a 3D array: height × width × 3 channels (red, green, blue), each value 0–255. A 1080p photo is about 6 million numbers. Feeding all of them into a plain fully connected network (chapter 2) is wasteful — it would need billions of weights and wouldn't understand that a cat in the corner is still a cat.

## Convolutions: looking for patterns everywhere

A **convolution** slides a small **filter** (say 3×3 pixels) across the image, computing a weighted sum at each position. The output, a **feature map**, is bright wherever the filter's pattern appears.

> [!ANALOGY] Sliding a stencil of a small pattern — a vertical edge, a corner, a patch of fur texture — over a photograph, and marking every spot where it fits well. A convolutional layer learns dozens of such stencils, and uses the **same** stencil everywhere in the image (weight sharing), so it recognizes a pattern wherever it appears.

Stack many layers, with **pooling** or strided convolutions shrinking the maps between them, and the network builds up a **hierarchy**:

::widget Stepper {"type":"layers","title":"What the layers of a convolutional network learn","what":"The hierarchy of features a trained CNN builds, from raw pixels at the top to a decision at the bottom. Each layer combines the patterns found by the layer before it.","steps":["Press Play from the image down to the prediction.","Notice how each layer sees a larger region of the image than the one before.","Find the layer where a network trained on photos would recognize 'an eye' or 'a wheel'."],"nodes":[["Input image","A 224×224×3 grid of pixel values."],["Early layers: edges and colours","Filters respond to simple edges at different angles, colour blobs and gradients — similar to what neuroscientists found in the visual cortex."],["Middle layers: textures and parts","Combinations of edges: corners, circles, stripes, fur, brick, mesh textures."],["Deeper layers: object parts","Eyes, noses, wheels, windows, leaves — each neuron now 'sees' a large part of the image."],["Final layers: objects","Whole objects and scenes: dog, car, pizza. A last layer turns these into probabilities for each class (softmax — chapter 1)."]]}

## Landmark architectures

- **LeNet (1998):** Yann LeCun's network read handwritten digits on bank cheques.
- **AlexNet (2012):** deep CNN + ReLU + dropout + GPUs; won ImageNet by a huge margin and started the deep learning boom (chapter 2).
- **VGG (2014):** showed that deeper stacks of small 3×3 filters work better.
- **ResNet (2015):** **residual connections** let signals and gradients skip layers, making 50–150+ layer networks trainable; it surpassed estimated human accuracy on ImageNet classification. Residual connections are now in every transformer too.
- **EfficientNet, MobileNet:** designed for accuracy per unit of compute — ideal for phones.

## Transfer learning: don't start from scratch

Training a vision model from zero needs millions of labelled images and lots of GPU time. But early and middle layers learn **general** features (edges, textures, shapes) useful for almost any task. So:

1. Take a model **pre-trained** on a large dataset (ImageNet, or huge web-scale datasets).
2. Replace the final layer with one for **your** classes ("defective / OK", or 37 types of plant disease).
3. **Fine-tune** on your few hundred or thousand images — often just the last layers at first, then everything with a small learning rate.

```python
import torch, torchvision
model = torchvision.models.resnet50(weights="IMAGENET1K_V2")      # pre-trained
for p in model.parameters(): p.requires_grad = False              # freeze the backbone
model.fc = torch.nn.Linear(model.fc.in_features, 4)               # 4 classes of our own
# train only model.fc for a few epochs, then optionally unfreeze and fine-tune with a small LR
```

> [!EXAMPLE] **Factory quality control.** A manufacturer has 1,500 photos of circuit boards labelled "good" or with one of three defect types. Fine-tuning a pre-trained model reaches 98% accuracy in an hour of training — impossible from scratch with so little data.

## The main vision tasks

| Task | Output | Examples | Typical models |
|---|---|---|---|
| **Classification** | One label per image | "Is this X-ray normal?" | ResNet, EfficientNet, ViT |
| **Object detection** | Boxes + labels for every object | Counting people, self-driving, retail shelves | YOLO family, DETR, Faster R-CNN |
| **Semantic segmentation** | A label for every pixel | Road vs sidewalk, tumour outlines | U-Net, DeepLab |
| **Instance segmentation** | Separate masks per object | Each person separately | Mask R-CNN, SAM (Segment Anything) |
| **Keypoints / pose** | Body joint positions | Fitness apps, motion capture | OpenPose, HRNet |
| **OCR** | Text from images | Reading invoices, number plates | Detection + recognition models, or multimodal LLMs |

## Vision Transformers

In 2020, the **Vision Transformer (ViT)** showed that transformers (chapter 3) work for images too: cut the image into 16×16-pixel **patches**, embed each patch like a word token, and apply self-attention so every patch can relate to every other — capturing long-range relationships that convolutions only build up slowly.

ViTs need more data than CNNs (they have fewer built-in assumptions about images) but scale better with large datasets, and they unify vision with the language-model toolkit. Today, many systems mix both ideas (ConvNeXt modernizes CNNs; hybrid models use convolutions early and attention later).

### CLIP: connecting images and words

**CLIP** (OpenAI, 2021) trained an image encoder and a text encoder together on 400 million image–caption pairs, so that matching images and captions land close together in the **same embedding space** (chapter 5). Results:

- **Zero-shot classification:** classify images into categories the model never trained on, by comparing the image embedding with embeddings of "a photo of a {label}".
- **Text-to-image search:** "a dog on a beach at sunset" finds matching photos.
- The text-image link behind image generators (chapter 13) and multimodal models (chapter 14).

## Making models robust

- **Data augmentation:** random crops, flips, rotations, colour changes, blur — teaching the model that a cat is still a cat. Stronger methods mix images (MixUp, CutMix).
- **Diverse data:** lighting, cameras, backgrounds, skin tones and demographics representative of real use. Biased datasets produce biased models — face recognition systems have shown much higher error rates on under-represented groups.
- **Watch for shortcuts:** a model detecting pneumonia learned to recognize which **hospital's** scanner produced an image (correlated with disease rates), not the disease itself. Test on data from new sources.

## Deploying vision models

- **On device** (phones, cameras, cars): small architectures (MobileNet, EfficientNet-Lite), **quantization** to 8-bit, and runtimes like Core ML, TensorFlow Lite/LiteRT or ONNX Runtime using the phone's NPU (Architecture track, chapter 7). Private, fast, works offline.
- **In the cloud:** batch processing of uploads, GPU serving for heavy models, with resizing and preprocessing identical to training.
- **Monitor drift:** new camera hardware, seasons, lighting and product designs change the input distribution over time (chapter 15).

> [!RECAP]
> - Images are grids of numbers; **convolutions** slide learned filters, sharing weights across positions; layers build a hierarchy from edges to objects.
> - **ResNet's residual connections** enabled very deep networks.
> - **Transfer learning** — fine-tune a pre-trained model — works with little data.
> - Tasks: classification, **detection** (YOLO), **segmentation** (U-Net, SAM), pose, OCR.
> - **Vision Transformers** treat patches as tokens; **CLIP** puts images and text in one embedding space for zero-shot use and search.
> - Robustness needs augmentation, diverse data and checks for shortcuts; deploy small, quantized models on devices.

> [!INTERVIEW] ML interviews ask why convolutions suit images (locality, weight sharing), what residual connections fix, how you'd build a classifier with only 1,000 labelled images (transfer learning + augmentation), detection vs segmentation, and how ViT and CLIP work.

::quiz {"q":"Why do convolutional layers need far fewer weights than fully connected layers on images?","options":["They use smaller images","The same small filter is reused at every position (weight sharing)","They skip colour channels","They don't use weights"],"answer":1,"explain":"A 3×3 filter has 9 weights per channel, regardless of image size."}

::quiz {"q":"You have 800 labelled photos of crop diseases. Best approach?","options":["Train a large CNN from scratch","Fine-tune a pre-trained model with data augmentation","Use k-means","Hand-write rules"],"answer":1,"explain":"Pre-trained features transfer well to small datasets."}

::quiz {"q":"What does CLIP enable?","options":["Faster GPUs","Matching images and text in a shared embedding space, enabling zero-shot classification and text-to-image search","Image compression","Audio recognition"],"answer":1,"explain":"Compare an image embedding with text embeddings of candidate labels."}
