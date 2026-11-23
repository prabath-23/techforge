---
title: GPUs and Accelerators — Why AI Runs on Graphics Cards
summary: How a GPU differs from a CPU (thousands of simple cores vs a few clever ones), the SIMT execution model with warps and threads, why memory bandwidth and HBM matter most, a first CUDA kernel, tensor cores and low-precision math, TPUs and other AI chips, and how GPUs are connected into training clusters.
---

::widget Scene {"title": "CPU vs GPU: a few professors or a stadium of students", "sub": "brightening a 4K image, and multiplying matrices for AI", "nodes": [{"id": "cpu", "kind": "cpu", "label": "CPU: 16 big cores", "x": 3.72, "y": 3.72, "color": "purple"}, {"id": "gpu", "kind": "blocks", "label": "GPU: thousands of small cores", "x": 9.72, "y": -2.28, "count": 25, "color": "green"}, {"id": "mem", "kind": "disk", "label": "GPU memory (HBM)", "x": 15.72, "y": -8.28, "color": "orange"}], "links": [["cpu", "gpu", {"label": "PCIe"}], ["gpu", "mem"]], "metrics": [["task", "Task"], ["cpu", "CPU"], ["gpu", "GPU"]], "steps": [{"short": "Task", "tag": "Task", "title": "Brighten every pixel of a 4K image: 8.3 million identical operations", "body": "<p>Each pixel is independent.</p>", "show": ["cpu"], "metrics": {"task": ["8.3 M pixels"], "cpu": ["—"], "gpu": ["—"]}}, {"short": "CPU", "tag": "CPU", "title": "A CPU: few cores, each very clever", "body": "<p>Big caches, branch prediction, out-of-order execution — built for complex, branchy, sequential code.</p>", "metrics": {"cpu": ["16 cores × SIMD"]}}, {"short": "GPU", "tag": "GPU", "title": "A GPU: thousands of simple cores in lockstep groups", "body": "<p>A warp of 32 threads runs the same instruction on different data (SIMT).</p>", "show": ["cpu", "gpu"], "metrics": {"gpu": ["~10,000 threads at once"]}}, {"short": "Copy", "tag": "Transfer", "title": "Copy the image to GPU memory", "body": "<p>The PCIe transfer can cost more than the computation for small jobs.</p>", "show": ["cpu", "gpu", "mem"], "flow": [["cpu", "gpu", "#f59e0b", "copy 33 MB"]]}, {"short": "Run", "tag": "Kernel", "title": "Launch a kernel: one thread per pixel", "body": "<p>Finished in a fraction of a millisecond.</p>", "flow": [["gpu", "mem", "#22c55e", "read/write"]], "metrics": {"cpu": ["~4 ms"], "gpu": ["~0.2 ms", "good"]}}, {"short": "Diverge", "tag": "Divergence", "title": "Branches hurt: if half a warp takes \"if\" and half \"else\", both run", "body": "<p>GPUs love uniform work.</p>"}, {"short": "Matmul", "tag": "AI", "title": "Neural networks are mostly matrix multiplications", "body": "<p>Huge, regular, parallel — perfect for GPUs. Tensor cores do small matrix multiplies in one instruction.</p>", "metrics": {"task": ["matrix multiply"]}}, {"short": "Mem", "tag": "Bandwidth", "title": "Often the limit is memory bandwidth, not maths", "body": "<p>HBM gives TB/s. Large language model inference is usually memory-bound: weights must stream through every token.</p>"}, {"short": "Other", "tag": "Accelerators", "title": "Other accelerators", "body": "<p>TPUs (matrix units), NPUs in phones, video encoders, FPGAs — specialised hardware trades flexibility for efficiency.</p>", "note": {"kind": "key", "text": "CPUs: few smart cores for complex sequential work. GPUs: thousands of simple cores for the same operation on lots of data. Mind data transfer and memory bandwidth."}}]}


## From video games to ChatGPT

> [!STORY] In the 1990s, graphics cards existed for one job: colouring millions of pixels on screen, 60 times a second, for video games. Each pixel's colour can be computed independently, so GPU designers built chips with huge numbers of simple calculators working side by side. In 2007, NVIDIA released **CUDA**, letting programmers use those calculators for anything. In 2012, AlexNet (AI track, chapter 2) was trained on two gaming GPUs and launched the deep learning boom. A decade later, NVIDIA had become one of the most valuable companies in the world, and data centers full of GPUs train and serve every large language model.

## CPU vs GPU: a professor vs a stadium of students

> [!ANALOGY] A CPU is a handful of brilliant professors: each can solve complicated problems with lots of decisions, very quickly, one at a time. A GPU is a stadium of 10,000 students who can each only do simple arithmetic — but if you need 10 million multiplications done, the stadium finishes long before the professors.

| | CPU | GPU |
|---|---|---|
| Cores | 8–192 complex cores | Thousands of simple cores (e.g. ~17,000 "CUDA cores" on a recent data-center GPU) |
| Optimized for | Low **latency** on one task: branch prediction, out-of-order execution, big caches (chapter 4–5) | High **throughput** on many identical tasks |
| Best at | Varied, branchy logic: operating systems, web servers, databases | The same operation on huge arrays: graphics, matrix math, simulations, AI |
| Memory | Large (hundreds of GB), ~100–500 GB/s | Smaller (tens to ~200 GB), but **2–8 TB/s** |

The GPU spends its transistors on **arithmetic units** rather than on prediction and caching tricks, and hides memory latency in a different way: when one group of threads waits for memory, it simply switches to another group that's ready.

## How GPUs execute: SIMT, warps and threads

GPU programs are written as a **kernel**: a function that runs once per **thread**, with thousands to millions of threads launched at once. Each thread uses its index to decide which piece of data to work on.

```cpp
// CUDA: add two vectors of n floats — each thread handles one element
__global__ void add(const float* a, const float* b, float* c, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;   // this thread's element
    if (i < n) c[i] = a[i] + b[i];
}

// launch enough blocks of 256 threads to cover n elements
add<<<(n + 255) / 256, 256>>>(d_a, d_b, d_c, n);
```

::widget Stepper {"type":"tree","title":"How GPU work is organized","what":"The hierarchy of a GPU program, from the whole launch down to a single thread, and the hardware each level runs on.","steps":["Click the top level, then work down.","Find the group of 32 threads that executes in lockstep.","Read why an if/else inside a warp can halve performance."],"nodes":[["Grid — the whole kernel launch","Millions of threads in total, organized into blocks. Runs across the whole GPU."],["Block — e.g. 256 threads","Runs on one streaming multiprocessor (SM). Threads in a block can share fast on-chip 'shared memory' and synchronize with each other. A large GPU has over a hundred SMs."],["Another block","Blocks are independent and can run in any order, on any SM — which is what lets the same code scale to bigger GPUs."],["Warp — 32 threads in lockstep","The SM schedules threads in groups of 32 that execute the same instruction at the same time on different data (SIMT: single instruction, multiple threads)."],["Thread","Computes one element using its own index. Cheap to create; there are far more threads than cores, so the GPU always has another warp ready while others wait for memory."],["Divergence","If threads in a warp take different sides of an if/else, the warp runs both sides one after the other, with half the threads idle each time. GPU code avoids branches that differ between neighbouring threads."]]}

## Memory bandwidth is the real limit

Many GPU workloads — including LLM inference (AI track, chapter 4) — are limited not by arithmetic but by how fast data can be fed to the cores.

- GPUs use **HBM** (high-bandwidth memory): stacks of DRAM chips placed right beside the GPU, connected by thousands of wires, delivering several **terabytes per second**.
- On-chip **shared memory** and caches are much faster still, so good kernels load a tile of data once and reuse it many times (the same tiling idea as CPU caches, and what FlashAttention does).
- Neighbouring threads should read neighbouring addresses (**coalesced** access), so one wide memory transaction serves a whole warp.

> [!NOTE] **Arithmetic intensity** — operations performed per byte loaded — decides whether a workload is compute-bound or memory-bound. Large matrix multiplications reuse each number many times (high intensity: compute-bound). Generating one token at a time in an LLM reads every weight for very little math per byte (low intensity: memory-bound). That's why batching users together helps so much.

## Tensor cores and low precision

Deep learning is dominated by **matrix multiplication**. Modern GPUs include **tensor cores**: units that multiply small matrices (e.g. 16×16) in a single operation, delivering many times the throughput of ordinary cores.

They work best with **low-precision** numbers (chapter 1): 16-bit (FP16, bfloat16), 8-bit (FP8, INT8) and even 4-bit formats. Each halving of precision roughly doubles throughput and halves memory use — and neural networks tolerate the rounding. Mixed-precision training keeps a high-precision master copy of weights while doing the heavy math in low precision.

## Other accelerators

- **TPUs** (Google's Tensor Processing Units): chips built around a large **systolic array** — a grid of multiply-accumulate units through which data flows rhythmically, each value reused by many units. Used to train and serve Google's Gemini models.
- **AWS Trainium and Inferentia, Microsoft Maia, Meta MTIA:** cloud providers' own AI chips, aiming for better cost than general-purpose GPUs.
- **NPUs** in phones and laptops (Apple's Neural Engine, Qualcomm's Hexagon): small, power-efficient accelerators for on-device AI — face recognition, photo enhancement, local language models.
- **FPGAs:** chips whose circuits can be reconfigured after manufacture; used for networking, trading systems and prototyping.
- **Others:** video encoders, cryptography engines, and **DPUs/SmartNICs** that offload networking and storage work from the CPU.

The general lesson: when a workload is huge and regular, **specialized hardware** beats general-purpose CPUs by 10–100× in performance per watt.

## Many GPUs: building an AI supercomputer

Training a frontier model needs thousands of GPUs working together (AI track, chapter 4), so the **connections** between them matter as much as the chips:

- **NVLink / NVSwitch** connect GPUs inside a server (and now across a rack) at hundreds of GB/s to over a TB/s per GPU — far faster than PCIe.
- **InfiniBand** or high-speed **Ethernet (RoCE)** connects servers, with GPUs reading each other's memory directly (RDMA), bypassing the CPU.
- **Collective operations** like all-reduce (averaging gradients across all GPUs) are implemented by libraries such as NCCL, carefully matched to the network layout.
- **Power and cooling** become central constraints: a single modern AI rack can draw over 100 kW and needs liquid cooling.

> [!RECAP]
> - CPUs optimize **latency** with a few complex cores; GPUs optimize **throughput** with thousands of simple ones.
> - GPU code is a **kernel** run by many threads, grouped into **blocks** and 32-thread **warps** executing in lockstep (SIMT); avoid divergence.
> - **Memory bandwidth** (HBM), tiling and coalesced access often decide performance; **arithmetic intensity** tells you whether you're compute- or memory-bound.
> - **Tensor cores** and **low-precision** formats power modern AI; **TPUs**, cloud AI chips and **NPUs** specialize further.
> - Large training needs fast interconnects (**NVLink**, **InfiniBand**), collective communication and serious power and cooling.

> [!INTERVIEW] ML infrastructure and systems interviews ask: why GPUs suit deep learning, what limits LLM inference speed (memory bandwidth), what a warp is and why divergence hurts, why low precision helps, and how multi-GPU training communicates.

::quiz {"q":"Why are GPUs much faster than CPUs for matrix multiplication?","options":["Higher clock speeds","Thousands of simple cores performing the same operation on different data in parallel, with very high memory bandwidth","Better branch prediction","Larger caches per core"],"answer":1,"explain":"GPUs trade per-thread cleverness for massive throughput."}

::quiz {"q":"Threads in one warp take different branches of an if/else. What happens?","options":["Nothing — they run independently","The warp executes both paths one after another, leaving some threads idle each time","The GPU crashes","The branch is skipped"],"answer":1,"explain":"This is branch divergence."}

::quiz {"q":"Why does LLM token generation tend to be memory-bound?","options":["It uses too much arithmetic","Each step reads all the weights from memory but does relatively little math per byte","GPUs have no memory","Tokens are large"],"answer":1,"explain":"Low arithmetic intensity — batching many requests helps."}
