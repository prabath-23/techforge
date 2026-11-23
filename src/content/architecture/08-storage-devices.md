---
title: Storage Devices — Hard Disks, SSDs and NVMe
summary: How data is physically stored when the power is off — spinning hard disks and why random access is slow, how flash memory and SSDs work (pages, blocks, erase cycles, the flash translation layer, write amplification and wear), NVMe and its deep parallel queues, what fsync really guarantees, RAID, and choosing storage for databases and the cloud.
---

::widget Scene {"title": "Hard disks vs SSDs", "sub": "one random read on each, and why SSDs need garbage collection", "nodes": [{"id": "hdd", "kind": "disk", "label": "Hard disk (spinning platter)", "x": 3.72, "y": 3.72, "color": "orange"}, {"id": "ssd", "kind": "blocks", "label": "SSD (flash pages in blocks)", "x": 10.72, "y": -3.28, "count": 16, "color": "green"}, {"id": "ctl", "kind": "cpu", "label": "SSD controller (FTL)", "x": 4.83, "y": -9.17, "color": "purple"}], "links": [["ctl", "ssd"]], "metrics": [["dev", "Device"], ["lat", "Random read"], ["note", "Why"]], "steps": [{"short": "Seek", "tag": "HDD", "title": "HDD: move the arm to the right track (seek)", "body": "<p>A mechanical movement: ~5 ms.</p>", "show": ["hdd"], "set": {"hdd": {"badge": "seeking…"}}, "metrics": {"dev": ["HDD"], "lat": ["seek ~5 ms"], "note": ["moving parts"]}}, {"short": "Spin", "tag": "HDD", "title": "Wait for the sector to rotate under the head", "body": "<p>Half a rotation at 7,200 rpm ≈ 4 ms. Total ~10 ms → ~100 random reads per second.</p>", "set": {"hdd": {"badge": "rotating…"}}, "metrics": {"lat": ["~10 ms", "bad"]}}, {"short": "Seq", "tag": "HDD", "title": "Sequential reads are fine: ~200 MB/s", "body": "<p>No seeking between neighbouring sectors. That's why logs and LSM trees love sequential writes.</p>", "metrics": {"note": ["sequential OK, random slow"]}}, {"short": "SSD", "tag": "SSD", "title": "SSD: electronic, no moving parts", "body": "<p>Any page can be read in ~50–100 µs, and many in parallel across flash chips.</p>", "show": ["hdd", "ssd", "ctl"], "set": {"hdd": {"badge": null}}, "metrics": {"dev": ["SSD (NVMe)"], "lat": ["~0.08 ms", "good"], "note": ["~100,000s of IOPS"]}}, {"short": "Erase", "tag": "Flash rules", "title": "Flash can't overwrite in place", "body": "<p>Write in 16 KB pages, but erase only whole blocks of hundreds of pages.</p>", "set": {"ssd": {"badge": "erase = whole block"}}}, {"short": "FTL", "tag": "FTL", "title": "So the controller writes updates to fresh pages", "body": "<p>The flash translation layer remaps logical addresses; old pages are marked stale.</p>", "flow": [["ctl", "ssd", "#a855f7", "remap"]]}, {"short": "GC", "tag": "GC", "title": "Garbage collection: copy live pages out, erase the block", "body": "<p>Background work that can cause latency spikes when the drive is nearly full. TRIM tells the SSD which data is deleted.</p>", "set": {"ssd": {"badge": "GC running"}}}, {"short": "Wear", "tag": "Wear", "title": "Each block survives a limited number of erases", "body": "<p>Wear levelling spreads writes; write-heavy databases consume endurance (watch TBW ratings).</p>"}, {"short": "Choose", "tag": "Choose", "title": "Use SSDs for databases; HDDs/object storage for cheap bulk", "body": "<p>Cost per TB vs IOPS per rupee.</p>", "note": {"kind": "key", "text": "HDD: ~10 ms random reads (seek + rotation), fine sequentially. SSD: ~0.1 ms, massively parallel, but erase-before-write means FTL remapping, GC and wear."}}]}


## The database that got 100× faster overnight

> [!STORY] A company's main database ran on a large array of spinning hard disks. Its busiest queries waited on random reads: fetching one row here, one index page there. Over a weekend, the team moved it to NVMe SSDs. On Monday, the p99 query time dropped from 400 milliseconds to under 5. Nobody changed a line of code. The difference was **physics**: a hard disk has to move a mechanical arm to find each piece of data; an SSD doesn't move at all.

## Hard disk drives: spinning platters and a moving arm

A **hard disk drive (HDD)** stores data magnetically on metal platters spinning at 5,400–15,000 rpm. A read/write head on an arm moves across the platter to the right track, then waits for the right spot to spin under it.

> [!ANALOGY] A record player with a single needle. To play a song in the middle of the record, you lift the arm, move it to the right groove (the **seek**), and wait for the record to turn to the right place (**rotational latency**). Playing the whole side straight through is smooth; jumping between 100 different songs means 100 slow arm movements.

- A random read takes about **5–10 ms** — roughly 100–200 random reads per second (IOPS).
- But reading **sequentially** is fast: 150–250 MB/s, because no seeking is needed.

This is why storage software of the HDD era was designed around **sequential** access: log-structured designs, write-ahead logs (Databases track, chapter 7), and LSM trees (System Design track) that turn random writes into sequential ones. HDDs remain the cheapest storage per terabyte and are still used for bulk data, backups and archives — including inside cloud object storage.

## Flash memory and SSDs

A **solid-state drive (SSD)** stores data in **NAND flash** chips: tiny cells that trap electric charge, keeping it with the power off. No moving parts, so random reads take tens of **microseconds** — around **100 times faster** than an HDD seek, with hundreds of thousands of IOPS.

Flash has peculiar rules, though:

::widget Stepper {"type":"flow","cols":3,"title":"The quirks of flash memory, and how SSDs hide them","what":"How flash is physically organized and the problems that creates. Each box is one rule of flash and how the SSD's controller works around it.","steps":["Press Play and read each rule in order.","Notice the mismatch between writing pages and erasing blocks.","Find why SSDs slow down and wear out when nearly full of constantly rewritten data."],"nodes":[["Pages and blocks","Flash is written in pages (~4–16 KB) but can only be erased in much larger blocks (hundreds of pages, several MB)."],["No overwriting in place","A page can't be rewritten directly; it must be erased first — and erasing means wiping the whole block it belongs to."],["The flash translation layer","So the SSD's controller writes each update to a fresh, already-erased page and updates a map from 'logical block address' to 'physical page'. The old page is marked stale. The drive looks like a normal disk to the OS."],["Garbage collection","Eventually, blocks are full of stale pages. The controller copies the still-valid pages elsewhere and erases the block. This copying is extra writing the user never asked for."],["Write amplification","Because of that copying, writing 1 GB from the OS can mean writing 2–5 GB to flash, especially when the drive is nearly full. Sequential and aligned writes, free space and TRIM keep it low."],["Wear","Each cell survives a limited number of erase cycles — a few thousand for common types. Controllers spread writes evenly ('wear leveling'), and drives are rated in total terabytes written (TBW)."]]}

> [!NOTE] **TRIM** lets the operating system tell the SSD which blocks no longer hold useful data (after you delete a file), so garbage collection doesn't waste effort copying them. It's usually enabled automatically.

Flash cells store more bits each in cheaper drives: **SLC** (1 bit), **MLC** (2), **TLC** (3), **QLC** (4). More bits per cell means cheaper storage but slower writes and lower endurance.

## NVMe: an interface built for flash

Early SSDs plugged into the **SATA** interface designed for hard disks, which allows one command queue of 32 requests — fine for a single needle, a bottleneck for flash chips that can work in parallel.

**NVMe** connects SSDs directly over **PCIe** and supports up to **65,535 queues with 65,536 commands each**, so every CPU core can have its own queue with no locking. Modern NVMe drives deliver **millions of IOPS** and over **10 GB/s** sequentially.

> [!ANALOGY] SATA is a bank with one teller window and a single queue. NVMe is a bank with a separate window for every customer group, each with its own line — with thousands of tellers working in parallel behind them.

To actually use that parallelism, software must keep many requests in flight. Linux's **io_uring** interface lets programs submit and complete I/O through shared queues with very few system calls — a big win for databases and storage engines.

## What "saved" really means: fsync

When your program calls `write()`, the data usually lands only in the OS's **page cache** in memory (OS track). It reaches the disk later. If the power fails first, it's gone.

- `fsync(fd)` asks the OS to push the file's data **all the way** to stable storage, and the drive to flush its own volatile cache, before returning.
- Databases call it on their write-ahead log at every commit (or group of commits) — that's what makes "committed" mean durable.
- Data-center SSDs include **power-loss protection** (capacitors that let the drive finish writing its cache if power fails), which makes flushes fast and safe. Consumer drives may not.

> [!STORY] In 2018, PostgreSQL developers discovered ("fsyncgate") that when Linux reported an `fsync` **error**, it could discard the failed data from its cache and then report the **next** fsync as successful. A database that retried would wrongly believe its data was safe. PostgreSQL now treats an fsync failure as fatal and recovers from its write-ahead log. Lesson: the path from `write()` to durable storage has subtle traps, and correctness depends on every layer.

## RAID and redundancy

Drives fail. **RAID** combines several drives:

- **RAID 0** (striping): split data across drives for speed. No redundancy — one failure loses everything.
- **RAID 1** (mirroring): every write goes to two drives. Survives one failure.
- **RAID 5 / 6**: data plus parity spread across drives. Survives one (5) or two (6) failures, using less space than mirroring, but rebuilding a large failed drive takes a long time.
- **RAID 10**: mirrored pairs, striped. A common choice for databases.

> [!WARN] **RAID is not a backup.** It protects against a drive dying, not against deleting the wrong table, ransomware, a bug that corrupts data, or the whole server being lost. Those need separate, tested backups (System Design and Security tracks).

Distributed systems replace RAID with **replication across machines** and **erasure coding** (the generalized cousin of RAID 5/6 used by cloud object storage to survive multiple disk and even data-center failures at low storage overhead).

## Choosing storage

| Need | Good choice |
|---|---|
| Database with random reads and writes | Local NVMe, or provisioned-IOPS cloud block storage (e.g. AWS io2, gp3 with set IOPS) |
| General VM disks | Cloud SSD block storage (gp3, pd-balanced) |
| Scratch space, caches, temporary data | **Instance-local NVMe** — fastest, but **lost when the VM stops** |
| Huge files, backups, data lakes | Object storage (S3), backed by HDDs and erasure coding |
| Rarely accessed archives | Archive tiers (S3 Glacier, tape behind the scenes) |

Cloud block storage is **network-attached**: each I/O crosses the network (adding ~0.5–1 ms) and is capped by the volume's purchased IOPS and throughput — a frequent hidden bottleneck worth checking in metrics.

> [!RECAP]
> - **HDDs** seek mechanically (~5–10 ms random reads, ~100–200 IOPS) but read sequentially fast and cheaply — why logs and LSM trees favor sequential writes.
> - **SSDs** use flash: write pages, erase blocks; a **flash translation layer**, **garbage collection**, **write amplification**, **wear leveling**, TRIM.
> - **NVMe** over PCIe offers deep parallel queues and millions of IOPS; **io_uring** helps software use them.
> - `write()` isn't durable until **fsync**; data-center SSDs add power-loss protection.
> - **RAID** survives drive failures but **is not a backup**; clouds use replication and erasure coding.
> - Match storage to the workload: local NVMe, network block storage, object storage, archives.

> [!INTERVIEW] Know rough latencies (HDD seek ~10 ms, SSD read ~100 µs), why sequential beats random on disks, what fsync does and why databases rely on it, what write amplification is, and why RAID isn't a backup.

::quiz {"q":"Why are random reads so much slower than sequential reads on a hard disk?","options":["The disk compresses data","Each random read requires moving the arm and waiting for the platter to rotate","HDDs have no cache","Sequential reads skip error checking"],"answer":1,"explain":"Seek time plus rotational latency, ~5–10 ms per random access."}

::quiz {"q":"Why can't an SSD simply overwrite a page in place?","options":["It's too slow","Flash must be erased before rewriting, and erasing works only on whole blocks","SSDs are read-only","The OS forbids it"],"answer":1,"explain":"So the controller writes elsewhere and garbage-collects later."}

::quiz {"q":"After write() returns, is the data safe from a power failure?","options":["Yes, always","Not necessarily — it may only be in the OS page cache until fsync completes","Only on HDDs","Only on Windows"],"answer":1,"explain":"Databases call fsync on their log to make commits durable."}
