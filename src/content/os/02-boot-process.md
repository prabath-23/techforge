---
title: The Boot Process — From Power Button to Login Screen
summary: What happens in the ten seconds after you press the power button — told as a relay race where each runner is smarter than the last, from a few bytes of firmware all the way to the full operating system.
---

## The chicken-and-egg problem

You press the power button. About ten seconds later you see a login screen. It feels like nothing happened in between, but those seconds contain one of the cleverest relay races in computing.

Here's the puzzle. To run Windows or Linux, the computer needs to **load the operating system from the SSD into memory**. But loading files from an SSD requires… code that understands SSDs and file systems. And that code is part of the operating system, which is on the SSD. To load the OS, you need the OS.

The solution is **bootstrapping** — named after the old phrase "pulling yourself up by your own bootstraps". The computer starts with a tiny, dumb program that's *physically built in*. That program's only job is to load a slightly smarter program, which loads a smarter one, until the full operating system is running.

> [!ANALOGY] It's a relay race. The first runner is a toddler who can only walk a few steps and hand over a baton. The second runner is a teenager who can find the stadium. The third is an athlete who knows the whole course. Each runner is more capable than the last, and each one's only goal is to get the next runner started. Nobody runs the whole race.

Here's the whole race at a glance — then we'll slow down and follow each runner.

::widget Stepper {"type":"flow","cols":3,"title":"The boot relay race on a modern PC","what":"Each box is one stage of booting, in the order it happens. Each stage loads and starts the next, then disappears or steps back.","steps":["Press Play and read each step's explanation.","For each stage, notice what it knows that the previous one didn't.","Spot the moment the computer first understands files (stage 4)."],"nodes":[["1. Power on","The power supply stabilizes and signals 'power good'. Every CPU core resets to a fixed, known starting state. Memory is full of random garbage."],["2. The very first instruction","The CPU always starts by reading an instruction from one hard-wired address. The motherboard routes that address to a small flash memory chip holding the firmware."],["3. Firmware wakes the hardware (UEFI)","The firmware figures out how much RAM there is and how to talk to it, finds the graphics card, keyboard, USB and SSDs, and runs a quick self-test."],["4. Firmware finds the bootloader","It reads its saved settings ('boot from this SSD first'), finds a small special partition on the SSD, and loads a program from it: the bootloader. This is the first time the computer reads a file."],["5. The bootloader loads the OS kernel","GRUB (Linux) or Windows Boot Manager shows the boot menu if there is one, then loads the kernel file and a small starter file system into memory, and jumps into the kernel."],["6. The kernel sets itself up","The kernel takes over the hardware: memory management, interrupts, the scheduler, other CPU cores, and drivers for the devices it finds."],["7. Mount the real disk","Using a tiny in-memory file system (the initramfs), the kernel loads whatever drivers it needs to reach the real disk (for example, to unlock an encrypted drive), then switches to it."],["8. The first program: PID 1","The kernel starts the very first user program — systemd on most Linux systems — which starts every other service in parallel."],["9. Login screen","Services are up: networking, sound, the display server and the login window. You type your password. The race is over."]]}

Now let's follow each runner more closely.

## Runner 1: The CPU wakes up knowing almost nothing

When power arrives, every CPU core resets to a **fixed, known state**. Registers are set to predetermined values, and the program counter (the "next instruction" pointer from chapter 1) is set to one specific, hard-wired address. On Intel and AMD processors, the first instruction always comes from address `0xFFFFFFF0` — sixteen bytes below the 4 GB mark.

But at this moment **RAM is full of random noise** — memory doesn't remember anything from before the power was off. So what's at that address? The motherboard plays a trick: it routes that particular address not to RAM but to a small **flash memory chip** soldered onto the motherboard (roughly 16–32 MB). That chip holds the **firmware** — the first runner. The instruction there is usually just "jump to the rest of the firmware".

> [!NOTE] Even more surprising: modern Intel and AMD CPUs start in a mode that imitates the original 1978 Intel 8086 processor — 16-bit mode, with access to only 1 MB of memory. Every PC still boots this way, for backward compatibility with software from the 1980s. The firmware and the OS then climb up to the modern 64-bit mode step by step.

On computers with many cores, only one core — called the **bootstrap processor** — runs the boot code. The others wait, asleep, until the operating system wakes them much later.

## Runner 2: The firmware (BIOS and UEFI)

The firmware is the computer's built-in starter program. You've probably seen it: it's what appears when you press F2, F12 or Del during startup — the screen with the boot order and the system clock.

There are two generations of it:

- **BIOS** (Basic Input/Output System), from the original 1981 IBM PC. It was simple and limited. It looked at the first 512 bytes of the boot disk, called the **Master Boot Record**, and ran whatever code was there. 512 bytes is tiny — about the size of this paragraph — so that code could do little more than load something bigger.
- **UEFI** (Unified Extensible Firmware Interface), used by virtually every PC and Mac made in the last ten-plus years. It's a much smarter runner: it understands disk partitions and simple file systems, can run proper programs from the disk, has drivers for USB and networking, and supports **Secure Boot** (more below).

Here's what the firmware actually does, in order:

1. **Bring RAM to life.** This sounds trivial but isn't. Memory chips have to be "trained": the firmware measures the precise electrical timing for your exact RAM sticks before memory can be used reliably. Until then, the firmware runs using the CPU's own cache as a tiny scratch memory. (This is why a computer with brand-new RAM sometimes takes much longer to boot the first time — it's doing the training.)
2. **Discover the hardware.** Find the graphics card, the SSDs, the USB controllers and the keyboard, and set up each one enough to use it.
3. **Self-test** (called **POST**, Power-On Self Test). If something essential is missing or broken — no RAM, no graphics card — you'll hear the famous beep codes or see an error light, because there's no way to show text on screen yet.
4. **Choose what to boot.** UEFI keeps a small settings list (stored in flash memory) saying "try this SSD first, then USB, then network". This is the boot order you can change in the firmware menu.

> [!EXAMPLE] When you press F12 at startup and pick "Boot from USB" to install Windows or Linux, you're telling the firmware to hand the baton to a bootloader on the USB stick instead of the one on your SSD. That's the whole trick behind installing an operating system.

### How the firmware finds the next runner

With UEFI, every bootable disk has a small, specially marked partition called the **EFI System Partition** — a few hundred megabytes formatted with the simple FAT32 file system (the same one used on USB sticks, chosen because every firmware can read it). Inside are ordinary files, such as `\EFI\BOOT\BOOTX64.EFI` or `\EFI\ubuntu\grubx64.efi`. The firmware reads one of those files into memory and runs it.

That file is the **bootloader**, and this is the first time in the whole process that the computer has read a *file*.

### Secure Boot: making sure no runner is an impostor

What if malware replaced the bootloader file? It would run before the operating system — before any antivirus — and could hide from everything. That kind of malware is called a **bootkit**.

**Secure Boot** stops this with digital signatures. The firmware ships with a list of trusted keys (from Microsoft and the PC maker). Before running the bootloader, the firmware checks that the file is **signed** by one of those keys. The bootloader then checks the kernel's signature, and so on. Each runner verifies the next before handing over the baton. This is called a **chain of trust**.

> [!ANALOGY] It's like airport security where each checkpoint verifies your passport before letting you through to the next. A forged passport (an unsigned bootloader) is stopped at the first checkpoint, so nothing fake ever reaches the plane (the running OS).

## Runner 3: The bootloader

The bootloader's job is narrow but important: **find the operating system kernel, load it into memory, and start it**. On Linux the usual bootloader is **GRUB**; Windows uses **Windows Boot Manager**; Macs use Apple's own.

If you dual-boot Windows and Linux, the menu that asks "Ubuntu or Windows?" is the bootloader. After you choose (or the timeout expires), it:

1. Reads the **kernel file** from disk (on Linux, something like `/boot/vmlinuz-6.8.0`; the `z` means it's compressed).
2. Reads a second file, the **initramfs** — a small starter file system we'll explain shortly.
3. Prepares a note for the kernel with useful information: how much memory there is and where, where the initramfs is, and the **kernel command line** — settings like "the real system lives on the disk with this ID" or "boot quietly without showing messages".
4. Jumps into the kernel. The bootloader's job is done; its memory is reused.

> [!TRY] On Linux, run `cat /proc/cmdline` to see the settings your bootloader passed to the kernel this morning. Run `systemd-analyze` to see how long each boot stage took on your machine, and `systemd-analyze blame` to see which services were slowest.

## Runner 4: The kernel takes control of the hardware

The kernel file starts by **decompressing itself** (it's stored compressed to save disk space and load faster). Then it sets up everything chapter 1 described — this is where the operating system truly begins:

- **Memory management.** The kernel reads the firmware's map of which RAM is usable and sets up the structures it will use to hand memory out (chapters 6 and 7). It also switches on **virtual memory**, so every program can later get its own private address space.
- **Interrupt handling.** It fills in a table telling the CPU which kernel function to run for each kind of interrupt and error (chapter 3). From now on, a keypress, a network packet or the timer can reach the kernel.
- **The timer and the scheduler.** It starts the timer that will interrupt every few milliseconds and creates the scheduler's data structures (chapter 5).
- **The other CPU cores.** Until now, only one core has been running. The kernel sends a special wake-up signal to each sleeping core; each one goes through its own mini-boot and joins in.
- **Device drivers.** The kernel scans the hardware buses and loads a driver for each device it recognizes: storage, network, graphics, USB.

Each step prints a line of text. Those are the scrolling messages you sometimes see on Linux, and you can read them afterwards with `dmesg`.

> [!NOTE] To make attacks harder, the kernel usually places itself at a **random location** in memory each boot. This is called **KASLR** (Kernel Address Space Layout Randomization). An attacker who knows a bug in the kernel then can't easily predict where the code they want to abuse is located.

## Runner 5: The initramfs — solving the last chicken-and-egg problem

Now the kernel needs to mount (open) the real disk where the rest of the operating system lives. But what if:

- the disk is **encrypted** and needs your password or a key from the security chip to unlock?
- the disk is part of a **RAID** array or a **logical volume** spread across several drives?
- the driver for this particular storage controller isn't built into the kernel, but stored as a separate file… **on that very disk**?

The kernel can't open the disk without the tools, and the tools are on the disk. So the bootloader also loaded a **tiny starter file system** into memory: the **initramfs** (initial RAM file system). It contains just enough tools and drivers to reach the real disk.

The kernel unpacks it into memory and runs the program inside it. That program loads the needed drivers, asks you for the disk password if necessary (that's the password prompt you see on an encrypted Linux laptop), unlocks and opens the real disk, and then **switches over** to it — throwing away the temporary starter file system to free memory.

> [!ANALOGY] The initramfs is like the small toolbox packed *outside* a locked toolshed. It contains only the key and a crowbar — just what's needed to get into the shed where all the real tools are.

## Runner 6: The first program, PID 1

With the real disk open, the kernel starts the **very first user-mode program**. It gets process ID 1, so it's called **PID 1**, and it's special:

- It's the **ancestor of every other program** on the system. Everything you ever run descends from it.
- If any program's parent dies, PID 1 adopts the orphan and cleans up after it when it finishes.
- If PID 1 itself ever exits, the kernel panics — there's no system left to run.

On most Linux systems today, PID 1 is **systemd**. It reads a set of configuration files describing every service — networking, sound, logging, Bluetooth, the login screen, the database — and **what each one depends on**. Then it starts them **in parallel**, as fast as their dependencies allow. Older systems started services one by one, which was much slower.

On macOS, PID 1 is **launchd**; on Windows, the equivalent roles are played by `smss.exe`, `wininit.exe` and the Service Control Manager.

When the services are up, the **login screen** appears. Booting is finished.

> [!EXAMPLE] Containers (like Docker, covered in the Cloud track) also have a PID 1: the first process started inside the container. If you write a container that starts your app as PID 1 and your app never cleans up its finished child processes, "zombie" processes pile up — because nothing is doing PID 1's adoption job. That's why tools like `tini` exist: a tiny program that plays PID 1 properly.

## The same race on your phone

Phones and small devices boot the same way with different runners. A **boot ROM** permanently built into the chip loads a small first-stage loader, which sets up RAM, which loads a bootloader (often **U-Boot** on embedded boards), which loads the Linux kernel (Android is built on Linux). Phones verify every stage with signatures — Android calls it **Verified Boot** — so a stolen phone can't easily be loaded with modified software.

> [!RECAP]
> - Booting is a **relay race**: each stage is a little smarter and loads the next.
> - The CPU starts from a **fixed address** wired to the **firmware** chip, because RAM is empty at power-on.
> - **UEFI firmware** trains RAM, finds hardware, picks a boot disk, and runs the **bootloader** — the first file read.
> - **Secure Boot** verifies each stage's signature, forming a **chain of trust**.
> - The **bootloader** loads the **kernel** and the **initramfs**; the kernel sets up memory, interrupts, the scheduler, other cores and drivers.
> - The **initramfs** provides the tools to open the real disk (encryption, RAID).
> - The kernel starts **PID 1** (systemd), which starts every service and finally the login screen.

> [!INTERVIEW] "What happens when you turn on a computer?" is a real interview question for systems, infrastructure and SRE roles. Tell it as this relay race: fixed start address → firmware (RAM training, hardware discovery, self-test) → bootloader from the EFI partition → kernel decompresses and initializes → initramfs unlocks the real disk → PID 1 starts services. Add Secure Boot and "why does initramfs exist?" for bonus points.

::quiz {"q":"Why does the CPU fetch its first instruction from the firmware chip rather than from RAM?","options":["The firmware is faster than RAM","RAM is empty (random noise) at power-on, so the first code must come from storage that keeps its contents without power","RAM is reserved for the kernel","It's required by Secure Boot"],"answer":1,"explain":"Memory forgets everything without power; the firmware lives on a flash chip that keeps its contents."}

::quiz {"q":"Why does Linux need an initramfs?","options":["To make the kernel smaller to download","The tools needed to open the real disk (drivers, decryption) may themselves be stored on that disk","Because UEFI cannot load large files","To store user passwords"],"answer":1,"explain":"It's the toolbox outside the locked shed — just enough to unlock and mount the real root file system."}

::quiz {"q":"With Secure Boot enabled, what stops malware from replacing the bootloader?","options":["The bootloader is stored in read-only memory","The firmware checks the bootloader's digital signature against its trusted keys and refuses unsigned code","The disk is encrypted","The bootloader is hidden"],"answer":1,"explain":"Each stage verifies the next before running it — the chain of trust."}
