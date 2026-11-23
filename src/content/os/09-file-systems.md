---
title: File Systems — How Files Are Stored and Kept Safe
summary: How a drive that only understands numbered blocks becomes folders and files with names, what an "inode" is and why it explains so many strange behaviors, why saving a file doesn't mean it's on disk yet, and how file systems survive a power cut in the middle of writing.
---

## A drive only knows numbered boxes

Open your SSD in your imagination. There are no files, no folders, no names. There's just a very long row of numbered boxes called **blocks**, each typically 4 KB. The drive understands exactly two commands: "read block number 8,203,411" and "write this data into block number 8,203,411".

Everything else — `Documents/resume.pdf`, folders inside folders, file sizes, who owns what, when it was last changed — is invented by a piece of the operating system called the **file system** (examples: NTFS on Windows, APFS on Macs, ext4 and XFS on Linux).

> [!ANALOGY] A file system is like a librarian in charge of an enormous warehouse full of numbered shelves. You ask for "the book called *Resume*, in the *Documents* section". You don't know or care which shelves it's on. The librarian keeps a **catalog** that maps titles to shelf numbers, keeps track of which shelves are empty, and makes sure a book's pages stay together even if they're spread over shelves all around the warehouse.

## First, the hardware: hard disks and SSDs

The design of file systems was shaped by the drives they run on:

- **Hard disk drives (HDDs)** have spinning platters and a moving arm, like a record player. Reading a random block means waiting for the arm to move and the platter to rotate — about **10 milliseconds**. But once positioned, reading consecutive blocks is fast. So for decades, file systems worked hard to keep each file's blocks **next to each other**.
- **SSDs** have no moving parts. A random read takes about **0.05–0.1 milliseconds** — around 100 times faster. But flash memory has a quirk: it can only be erased in large chunks, and each cell wears out after a few thousand writes. The SSD hides this with clever internal software, and the OS helps by telling the SSD which blocks are no longer in use (the **TRIM** command).

> [!EXAMPLE] This is why replacing an old laptop's hard disk with an SSD feels like getting a new computer. Booting and launching apps involve thousands of small reads scattered across the disk — each one 100 times faster on an SSD.

## What a program sees: files and file descriptors

To a program, a file is a named sequence of bytes it can read and write:

```python
with open("notes.txt", "a") as f:     # open → the OS returns a small number, a "file descriptor"
    f.write("buy milk\n")            # write → a system call, write(fd, data)
# leaving the block → close(fd)
```

When you open a file, the OS gives your program a small integer called a **file descriptor** — a ticket number. Every later read or write uses that ticket. Descriptors 0, 1 and 2 are always open from the start: **standard input** (keyboard), **standard output** (screen) and **standard error** (screen, for errors). That's why `print` goes to your terminal by default, and why `2> errors.log` in a shell redirects only the errors.

## The inode: the secret behind files

Here's the most important idea in this chapter. In Unix-like file systems (Linux, macOS), every file is described by a record called an **inode** (index node). An inode stores **everything about the file except its name**:

- its size,
- who owns it and its permissions (who may read, write or run it),
- when it was created, last changed and last read,
- **where its data lives** — the list of block numbers holding the file's contents.

So where's the name? Names live in **directories**. A directory is simply a special file containing a list of **name → inode number** pairs. The folder `Documents` might contain `resume.pdf → inode 5321`, `notes.txt → inode 8870`.

> [!ANALOGY] An inode is a person; a name is an entry in a phone book. The phone book maps names to people. The same person can appear in several phone books under different names, and removing their entry from one phone book doesn't make the person disappear.

That one design decision explains several behaviors you've probably run into:

- **Moving a file within the same drive is instant**, even for a 50 GB video. The data doesn't move — only the directory entry changes from one folder's list to another's.
- **Hard links**: two different names in two folders can point to the **same inode** — the same file, not a copy. Change it through one name and the other sees the change.
- **Deleting a file just removes a name.** The data is only freed when the **last** name is removed **and** no program still has the file open.

> [!EXAMPLE] **"I deleted a 20 GB log file but my disk is still full!"** A classic server mystery. The application that writes the log still has the file open. Deleting it removed the *name*, but the inode and its 20 GB live on until the program closes the file. The fix is to restart the app, or tell it to reopen its log files. Find such files with `lsof +L1`. Log-rotation tools exist largely because of this.

> [!TRY] On Linux or macOS, run `ls -i` to see inode numbers next to file names, and `stat somefile` to see everything stored in an inode. Run `df -i` to see inode usage: it's possible to run out of inodes (by creating millions of tiny files) while gigabytes of space are still free.

### Finding a file's blocks

How does an inode list where a 5 GB file lives? Modern file systems (ext4, XFS, APFS, NTFS) use **extents**: compact entries like "starting at block 1,000,000, the next 30,000 blocks". A big file that's stored contiguously needs only a handful of extents.

### Following a path

When you open `/home/ana/notes.txt`, the kernel walks the path one piece at a time:

1. Start at the **root directory** `/` (its inode number is known).
2. Look up `home` in the root's list → get its inode → check you're allowed to enter it.
3. Look up `ana` in `home` → inode → check permission.
4. Look up `notes.txt` in `ana` → the file's inode. Done.

Doing all that from disk every time would be slow, so the kernel caches recently used directory entries (the **dentry cache**). Most path lookups never touch the disk at all.

## One interface, many file systems: the VFS

Linux supports dozens of file systems: ext4, XFS, btrfs, FAT on USB sticks, NFS network drives, and special ones like `/proc` (which isn't on any disk — reading `/proc/cpuinfo` makes the kernel generate the text on the fly). Programs don't care which is which; `open`, `read` and `write` work the same everywhere.

This works because of the **virtual file system (VFS)** layer: a common interface that every file system implements, a bit like an electrical socket standard that any appliance can plug into. It's also why Unix people say **"everything is a file"**: disks, terminals, random-number generators, process information and even network connections are all accessed through file descriptors.

## Why saving a file doesn't mean it's on the disk

Reading from even a fast SSD is far slower than reading from RAM. So the OS keeps recently used file data in spare RAM: the **page cache**.

- **Reads**: if the data is already in the page cache, it's returned straight from memory. The OS also notices when you read a file from start to end and **reads ahead**, fetching the next parts before you ask.
- **Writes**: when a program writes, the data goes into the page cache and the write returns **immediately**. The OS writes it to disk **later**, typically within 30 seconds, in efficient batches.

> [!ANALOGY] It's like a chef who writes orders on a notepad and only updates the official order book at the end of each hour. Very efficient — until the notepad is lost. If the power fails before the OS writes its cache to disk, those "saved" changes are gone.

When data **must** be safe — a database committing a payment, a text editor saving your document — the program calls **`fsync`**, which means "don't return until this file's data is really on stable storage". It's slow (milliseconds), which is exactly why databases batch many transactions into one `fsync`.

> [!WARN] Saving a file correctly is harder than it looks. If you overwrite `config.json` directly and the power fails halfway, you're left with half a file. The safe recipe: write to a temporary file, `fsync` it, then **rename** it over the original (a rename is atomic — it either fully happens or doesn't), then `fsync` the directory. Many editors and databases do exactly this.

> [!EXAMPLE] `free -h` on Linux shows much of your RAM as "buff/cache". That's the page cache. It isn't wasted — the OS fills spare RAM with file data so the next read is fast, and gives that memory back instantly when a program needs it.

## Surviving a power cut: crash consistency

Even a tiny change to a file can involve **several separate disk writes**. Appending one block to a file needs:

1. Write the new **data block**.
2. Update the file's **inode** (new size, new block in its list).
3. Update the **free-space map** (that block is now in use).

If the power fails after some but not all of these, the file system is inconsistent. The inode might point to a block full of garbage, or a block might be marked "used" but belong to nobody.

In the old days, the fix was to scan the **entire disk** after a crash (a tool called `fsck` on Unix, `chkdsk` on Windows) and repair whatever looked wrong. On a large disk that took hours.

### Journaling: write down what you're about to do

Modern file systems (ext4, XFS, NTFS) use a **journal**, also called a **write-ahead log**:

1. **First**, write a description of all the changes you're about to make into a special log area: "I'm going to write data block X, update inode Y, mark block X as used".
2. Write a final **"done"** record. Once that record is safely on disk, the change counts as committed.
3. **Then** make the actual changes in their real locations.
4. Later, clear the journal entry.

After a crash, the file system just reads the journal. Changes with a "done" record are replayed (redone); changes without one are ignored, as if they never started. Recovery takes **seconds** instead of hours.

> [!ANALOGY] A surgeon announces each step before doing it, and an assistant writes it in a notebook. If the power goes out mid-operation, the next surgeon reads the notebook to know exactly what was finished and what wasn't — no need to examine the whole patient from scratch.

The same "write the intention to a log first" idea powers databases (PostgreSQL's WAL), message queues (Kafka), and distributed systems (Raft). You'll meet it again and again in this book.

### Copy-on-write file systems: never overwrite

Newer file systems — **APFS** (every Mac and iPhone), **btrfs**, **ZFS** — take a different approach: **never overwrite data in place**. Every change writes new blocks somewhere else, then updates the pointers leading to them, and finally flips one single "root pointer" to the new version. The old version stays intact until the flip, so the disk is always consistent.

This design gives some superpowers almost for free:

- **Instant snapshots**: keep the old root pointer around and you have a complete, read-only copy of the whole file system at that moment, using almost no extra space. That's how macOS Time Machine local snapshots work.
- **Checksums**: ZFS and btrfs store a checksum for every block and detect silent corruption ("bit rot") that other file systems would never notice.
- **Instant file copies** on APFS: duplicating a file just shares the same blocks until one copy changes.

## Files you use every day that aren't on a disk

- **`/proc`** and **`/sys`** on Linux: live views of processes and the kernel. `cat /proc/meminfo` shows memory statistics generated the moment you read them.
- **`tmpfs`**: a file system that lives entirely in RAM, often used for `/tmp`. Very fast, gone on reboot.
- **Overlay file systems**: stack a writable layer on top of read-only layers. **This is how Docker images work** (Cloud track).
- **Network file systems** (NFS, SMB, cloud drives): the "disk" is on another computer.

> [!RECAP]
> - A drive only stores **numbered blocks**; the **file system** invents files, folders and names.
> - An **inode** holds everything about a file except its name; **directories** map names to inode numbers. This is why moves are instant and why deleting an open file doesn't free space.
> - The **VFS** gives every file system the same interface — "everything is a file".
> - Writes go to the **page cache** first; only **`fsync`** guarantees data is on disk. Save files safely with write-temp → fsync → rename.
> - **Journaling** (write intentions to a log first) and **copy-on-write** (never overwrite in place) keep the file system consistent through crashes; copy-on-write also gives cheap **snapshots**.

> [!INTERVIEW] Know: what an inode contains (and doesn't — the name); hard vs symbolic links; why a successful `write()` doesn't mean the data survives a power failure; what `fsync` does; how journaling provides crash consistency; and the classic "disk full after deleting a big file" puzzle (an open file descriptor).

::quiz {"q":"Where is a file's name stored in a Unix file system?","options":["In its inode","In the directory entry that points to the inode","In the first data block","In the superblock"],"answer":1,"explain":"Inodes have no names — that's what makes hard links possible."}

::quiz {"q":"write() returned successfully, then the power failed. Is the data guaranteed to be on disk?","options":["Yes, write is always synchronous","No — it may only be in the page cache until it's written back or fsync'd","Only on SSDs","Only for small files"],"answer":1,"explain":"Durability requires fsync."}

::quiz {"q":"You deleted a 20 GB log file, but disk usage didn't drop. Most likely cause?","options":["The trash isn't emptied on Linux","A running program still has the file open, so its inode and data survive until it's closed","The file system is corrupted","Deletion takes 24 hours"],"answer":1,"explain":"Deletion removes the name; space is freed when the last name and the last open descriptor are gone."}
