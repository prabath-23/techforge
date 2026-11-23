---
title: Generative Models — Diffusion and Image Generation
summary: How AI creates new images, audio and video — what "generative" means, autoencoders and latent spaces, GANs and their rise and fall, diffusion models explained as learning to remove noise, latent diffusion (Stable Diffusion), text conditioning and classifier-free guidance, controlling outputs, video generation, and the questions of provenance, copyright and misuse.
---

::widget Scene {"title": "Diffusion: generating an image by removing noise", "sub": "training by adding noise; generating by removing it, guided by a prompt", "nodes": [{"id": "img", "kind": "blocks", "label": "Real photo", "x": 0.0, "y": 0.0, "count": 16, "color": "green"}, {"id": "noisy", "kind": "blocks", "label": "Noisy photo", "x": 5.0, "y": -5.0, "count": 16, "color": "purple"}, {"id": "net", "kind": "cpu", "label": "Denoiser (U-Net / transformer)", "x": 10.0, "y": -10.0, "color": "orange"}, {"id": "n0", "kind": "blocks", "label": "Pure noise", "x": 7.13, "y": 7.13, "count": 16, "color": "dark"}, {"id": "mid", "kind": "blocks", "label": "Step 15", "x": 12.13, "y": 2.13, "count": 16, "color": "purple"}, {"id": "out", "kind": "blocks", "label": "New image", "x": 17.13, "y": -2.87, "count": 16, "color": "green"}, {"id": "txt", "kind": "doc", "label": "\"a red fox in snow\"", "x": 21.13, "y": -6.87}], "links": [["img", "noisy"], ["noisy", "net"], ["n0", "mid"], ["mid", "out"], ["txt", "out", {"dashed": true}]], "metrics": [["phase", "Phase"], ["step", "Step"], ["note", "Note"]], "steps": [{"short": "Add", "tag": "Training", "title": "Training: take a real photo and add a random amount of noise", "body": "<p>Sometimes a little, sometimes almost all.</p>", "show": ["img", "noisy"], "flow": [["img", "noisy", "#a855f7", "+ noise"]], "metrics": {"phase": ["training"], "step": ["—"], "note": ["—"]}}, {"short": "Predict", "tag": "Training", "title": "The network learns to predict the noise that was added", "body": "<p>A simple, stable regression task — repeated over hundreds of millions of image–caption pairs.</p>", "show": ["img", "noisy", "net"], "flow": [["noisy", "net", "#f59e0b", "what noise?"]], "metrics": {"note": ["predict the noise"]}}, {"short": "Text", "tag": "Conditioning", "title": "The caption is fed in too", "body": "<p>So it learns which denoising directions mean \"fox\" or \"snow\".</p>"}, {"short": "Start", "tag": "Generate", "title": "Generation starts from pure random noise", "body": "<p>Plus your prompt.</p>", "show": ["img", "noisy", "net", "n0", "txt"], "metrics": {"phase": ["generation"], "step": ["0 / 30"]}}, {"short": "Step", "tag": "Generate", "title": "Each step: predict the noise, remove a little of it", "body": "<p>Shapes appear first, then details.</p>", "show": ["img", "noisy", "net", "n0", "mid", "txt"], "flow": [["n0", "mid", "#a855f7", "denoise ×15"]], "metrics": {"step": ["15 / 30"]}}, {"short": "CFG", "tag": "Guidance", "title": "Classifier-free guidance pushes harder toward the prompt", "body": "<p>Compare predictions with and without the prompt and exaggerate the difference. Higher = more literal, less varied.</p>", "metrics": {"note": ["guidance scale ~5–8"]}}, {"short": "Done", "tag": "Generate", "title": "After ~30 steps: a brand-new fox in snow", "body": "<p>Different seed → different image.</p>", "show": ["img", "noisy", "net", "n0", "mid", "out", "txt"], "flow": [["mid", "out", "#22c55e", "denoise ×15"]], "metrics": {"step": ["30 / 30", "good"]}}, {"short": "Latent", "tag": "Efficiency", "title": "Latent diffusion works in a compressed space", "body": "<p>An autoencoder shrinks images 8× per side; denoise there, decode at the end. Runs on a consumer GPU.</p>"}, {"short": "Beyond", "tag": "Beyond", "title": "The same idea generates video, audio and molecules", "body": "<p>Plus image editing: add noise to part of a photo and denoise with a new prompt (inpainting).</p>", "note": {"kind": "key", "text": "Diffusion: learn to predict added noise; generate by starting from noise and denoising step by step, steered by the prompt (guidance), usually in a latent space."}}]}



## A photograph of something that never existed

> [!STORY] In 2022, people typed sentences like "an astronaut riding a horse, in the style of a watercolour" into DALL·E 2, Midjourney and Stable Diffusion, and within seconds received convincing images that no camera had ever taken. Two years earlier, generating a believable face at all was a research achievement. Behind the leap was a surprisingly simple idea: teach a network to **remove a little noise** from an image — and then start from pure noise and remove it, step by step, until a picture appears.

## What a generative model does

A **discriminative** model learns to tell things apart: "is this a cat or a dog?" A **generative** model learns the **distribution** of the data itself, so it can produce **new** examples that look like they came from it: new faces, new sentences, new melodies.

Language models (chapters 3–4) are generative models of text, producing one token at a time. For images, audio and video, other approaches have led the way.

## Autoencoders and latent spaces

An **autoencoder** has two halves: an **encoder** compresses an image into a small **latent** vector, and a **decoder** reconstructs the image from it. Trained to make the reconstruction match the input, the latent space learns the important features (pose, lighting, shape) and drops pixel-level noise.

A **variational autoencoder (VAE)** makes the latent space smooth and well-organized, so that **sampling** a random point and decoding it gives a plausible new image, and moving between two points morphs one image into another. VAEs alone tend to produce blurry images — but their compression trick became essential to modern diffusion models.

> [!ANALOGY] An autoencoder is like describing a face over the phone to a police sketch artist. You can't send every pixel; you compress it to a description ("oval face, thick eyebrows, short curly hair"), and the artist reconstructs it. The description is the latent vector.

## GANs: the forger and the detective

**Generative adversarial networks** (Ian Goodfellow, 2014) train two networks against each other: a **generator** that creates fake images from random noise, and a **discriminator** that tries to tell real images from fakes. Each improves by trying to beat the other.

GANs produced the first strikingly realistic images — StyleGAN's faces (the "this person does not exist" website, 2019) were indistinguishable from photos. But training was notoriously unstable, and GANs suffered **mode collapse** (producing only a few kinds of output). Diffusion models overtook them for most uses by 2021–2022.

## Diffusion: learning to remove noise

::widget Stepper {"type":"flow","cols":3,"title":"How a diffusion model learns and generates","what":"Training adds noise to real images and teaches a network to predict that noise. Generation runs the process backwards: start from pure noise and remove a little at each step.","steps":["Press Play to follow training first, then generation.","Notice that training never asks the network to create an image from nothing — only to denoise slightly.","Find where the text prompt influences the result."],"nodes":[["Forward process (training data)","Take a real image and add a small amount of random noise, again and again over ~1,000 steps, until it's pure static. This needs no learning — it's just adding noise."],["The training task","Pick a random image and a random step t; add that much noise; ask a neural network (a U-Net or a transformer) to predict the noise that was added. Train on hundreds of millions of images."],["Why that's enough","If the network can tell noise from image content at every noise level, it has learned what real images look like — edges, textures, faces, compositions."],["Generation: start from static","Sample pure random noise — like a TV with no signal."],["Remove noise step by step","At each step the network predicts the noise; subtract a portion of it. After 20–50 steps (with modern samplers), a clean, brand-new image emerges."],["Conditioning on text","At every step, the network also sees an embedding of the prompt (from a text encoder like CLIP's or T5 — chapter 10), steering denoising towards images that match the words."]]}

> [!ANALOGY] A sculptor who says every statue is already inside the block of marble — they just remove what doesn't belong. A diffusion model does the same with noise: it repeatedly asks "what here doesn't look like a real image matching this description?" and chips it away.

Why diffusion won: training is **stable** (just a regression loss — predict the noise), it covers the full diversity of the data (no mode collapse), and quality scales with model and data size.

## Latent diffusion: making it affordable

Running diffusion on full-resolution pixels (a 1024×1024 image has 3 million values) is expensive. **Latent diffusion** (2022, the basis of **Stable Diffusion**) first compresses images with a VAE into a much smaller latent grid (e.g. 128×128×4), runs the diffusion process **in latent space**, then decodes the final latent into pixels. This cut compute by orders of magnitude and made image generation possible on consumer GPUs — and, once its weights were openly released, sparked a huge open ecosystem.

## Steering the output

- **Classifier-free guidance:** at each step, the model predicts noise both **with** and **without** the prompt and exaggerates the difference. A higher **guidance scale** follows the prompt more literally (but less naturally); lower gives more variety.
- **Negative prompts:** steer away from unwanted features ("blurry, extra fingers").
- **Image-to-image:** start from a noised version of an existing image instead of pure noise, to restyle or vary it; **inpainting** regenerates only a masked region.
- **ControlNet** and similar: condition on edge maps, depth maps or human poses for precise composition.
- **Fine-tuning for a subject or style:** LoRA adapters (chapter 8) or DreamBooth teach a model a specific product, character or art style from a handful of images.
- **Fewer steps:** distillation and consistency models generate in 1–4 steps for near-real-time use.

> [!NOTE] **Transformers meet diffusion.** Newer image and video models replace the U-Net with a **diffusion transformer (DiT)** operating on patches of the latent (like ViT — chapter 10), and use **flow matching**, a closely related training objective with straighter, faster generation paths. The core idea — learn to turn noise into data gradually — is the same.

## Beyond images

- **Video:** diffusion transformers over **spacetime patches** generate coherent video clips from text (OpenAI's Sora, Google's Veo, and open models), with the hard problem being consistency of objects and physics across frames.
- **Audio and music:** diffusion and token-based language models generate speech in a given voice, sound effects and music.
- **3D, molecules and proteins:** diffusion models design protein structures and drug-like molecules (e.g. RFdiffusion), and generate 3D assets.

## Risks and responsibilities

- **Deepfakes and misinformation:** realistic fake images, voices and videos of real people — used for fraud (voice-cloned "CEO" calls requesting money transfers), harassment and political manipulation.
- **Provenance:** **C2PA content credentials** attach signed metadata about how an image was created or edited; **watermarking** (e.g. Google's SynthID) embeds hard-to-remove signals in generated content. Neither is foolproof, but both help platforms and users judge authenticity.
- **Copyright and consent:** models trained on scraped images raise legal and ethical questions about artists' work; there are ongoing lawsuits and new licensing and opt-out arrangements.
- **Bias:** generators reproduce stereotypes in their training data ("a CEO" → mostly one demographic) unless deliberately corrected.
- **Safety filters:** production systems filter prompts and outputs for prohibited content and restrict generating real people's likenesses.

> [!RECAP]
> - Generative models learn the data distribution to create **new** samples.
> - **Autoencoders/VAEs** compress into a latent space; **GANs** pit a generator against a discriminator (realistic but unstable).
> - **Diffusion** trains a network to predict added noise, then generates by **denoising pure noise step by step**; stable to train and high quality.
> - **Latent diffusion** (Stable Diffusion) works in a VAE's compressed space; **text conditioning** + **classifier-free guidance** steer it; ControlNet, inpainting and LoRA add control.
> - The same ideas generate **video, audio, 3D and proteins**; responsible use needs provenance, watermarking, consent and safety filters.

> [!INTERVIEW] Explain diffusion intuitively (add noise in training, learn to remove it, generate from noise), why latent diffusion is cheaper, what guidance scale does, how diffusion differs from GANs, and the risks (deepfakes, provenance) — common in ML and AI product interviews.

::quiz {"q":"What does a diffusion model's network learn to predict during training?","options":["The image caption","The noise that was added to an image at a given noise level","The next pixel","Whether an image is real"],"answer":1,"explain":"Generation then removes predicted noise step by step from pure static."}

::quiz {"q":"Why is latent diffusion much cheaper than pixel-space diffusion?","options":["It uses smaller prompts","It runs the denoising on a compressed latent representation, decoding to pixels only at the end","It skips training","It generates lower-quality images on purpose"],"answer":1,"explain":"The latent grid has far fewer values than the full image."}

::quiz {"q":"What does a higher classifier-free guidance scale do?","options":["Makes images larger","Follows the prompt more strictly, at the cost of naturalness and variety","Speeds up generation","Removes the need for a prompt"],"answer":1,"explain":"It amplifies the difference between prompted and unprompted predictions."}
