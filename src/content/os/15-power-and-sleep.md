---
title: Power, Sleep and Laptops — How the OS Saves Battery
summary: Why power management is a core OS job — CPU frequency and voltage scaling, idle states, big and little cores, timer coalescing and tickless kernels, how apps drain batteries (wakeups, polling, background work), sleep and hibernation, and how phones schedule background tasks to last a full day.
---

::widget Scene {"title": "Why waking up too often drains the battery", "sub": "CPU sleep states, timer wakeups and batching", "nodes": [{"id": "tl", "kind": "cells", "label": "one second on a laptop (each cell = 100 ms)", "x": 3.1, "y": 3.1, "values": ["", "", "", "", "", "", "", "", "", ""]}, {"id": "cpu", "kind": "cpu", "label": "CPU", "x": 13.3, "y": 5.3, "color": "purple"}], "metrics": [["state", "CPU state"], ["wakes", "Wakeups / s"], ["power", "Power"]], "steps": [{"short": "Idle", "tag": "Idle", "title": "Nothing to do: the CPU drops into deep sleep (C-states)", "body": "<p>Clocks stop, voltage drops, caches may be flushed. Deep sleep uses almost no power — but takes time to enter and leave.</p>", "show": ["tl", "cpu"], "set": {"cpu": {"badge": "C6 deep sleep"}}, "metrics": {"state": ["deep sleep"], "wakes": ["0"], "power": ["~0.5 W", "good"]}}, {"short": "Wake", "tag": "Wakeup", "title": "A timer interrupt wakes it to do 1 ms of work", "body": "<p>Waking costs energy: ramp up clocks, refill caches.</p>", "set": {"tl": {"marks": {"0": "orange"}, "ptr": {}}, "cpu": {"badge": "C0 active"}}, "metrics": {"state": ["active"], "wakes": ["1"]}}, {"short": "Chatty", "tag": "Problem", "title": "An app polls every 10 ms \"just in case\"", "body": "<p>100 wakeups per second. The CPU never reaches deep sleep — each pause is too short to be worth it.</p>", "set": {"tl": {"marks": {"0": "red", "1": "red", "2": "red", "3": "red", "4": "red", "5": "red", "6": "red", "7": "red", "8": "red", "9": "red"}, "ptr": {}}, "cpu": {"badge": "never sleeps deeply"}}, "metrics": {"wakes": ["100", "bad"], "power": ["~3 W", "bad"]}}, {"short": "Batch", "tag": "Fix", "title": "Timer coalescing: batch nearby wakeups together", "body": "<p>The OS lets timers fire a little late so several fire in one wake. Long idle gaps return.</p>", "set": {"tl": {"marks": {"0": "orange", "5": "orange"}, "ptr": {}}, "cpu": {"badge": "C6 between"}}, "metrics": {"wakes": ["2"], "power": ["~0.7 W", "good"]}}, {"short": "Events", "tag": "Fix", "title": "Better: wait for events instead of polling", "body": "<p>epoll, push notifications, file-change notifications. Zero wakeups when nothing happens.</p>", "set": {"tl": {"marks": {}, "ptr": {}}, "cpu": {"badge": "sleep until event"}}, "metrics": {"wakes": ["0"], "power": ["~0.5 W", "good"]}}, {"short": "Race", "tag": "Race to idle", "title": "When work is needed, finish fast and sleep", "body": "<p>Running briefly at high speed then sleeping often uses less energy than running slowly for longer.</p>", "set": {"tl": {"marks": {"0": "green"}, "ptr": {}}, "cpu": {"badge": "turbo, then sleep"}}}, {"short": "Suspend", "tag": "Suspend", "title": "Closing the lid: suspend to RAM", "body": "<p>Everything stops except RAM refresh. Drivers save device state; resume restores it in a second or two.</p>", "note": {"kind": "key", "text": "Battery life is mostly about letting the CPU stay asleep: fewer wakeups, batched timers, events instead of polling, race to idle."}}]}


## The app that drained the battery overnight

> [!STORY] Users of a popular messaging app complain that their phones lose 30% battery overnight while sitting untouched on the nightstand. The app isn't "doing" anything visible. Engineers find the cause: a background timer wakes the app every 10 seconds to check for new messages — even though push notifications already handle that. Each wakeup is tiny, but it pulls the CPU out of its deepest sleep state, spins up the radio, and keeps everything awake a little longer. Removing that timer nearly eliminates the overnight drain. Power problems are rarely about big computations; they're about **waking up too often**.

On laptops and phones, battery life is a headline feature. In data centers, electricity and cooling are among the largest costs. So deciding **when hardware can rest** is one of the operating system's most important jobs.

## Where power goes

A chip uses power in two ways:

- **Dynamic power** when transistors switch — roughly proportional to **frequency × voltage²**. Halving the frequency lets you lower the voltage too, cutting power far more than in half.
- **Static (leakage) power** just from being switched on — eliminated only by turning parts of the chip **off**.

> [!ANALOGY] A car. Driving at 120 km/h uses far more fuel per kilometer than 80 km/h (dynamic power grows faster than speed). And even idling at a red light burns fuel (leakage). The most efficient drivers go a moderate speed and switch the engine off at long stops — which is exactly what an OS tries to do with the CPU.

## Running: frequency and voltage scaling

**DVFS (dynamic voltage and frequency scaling)** lets the OS change each core's speed many times a second. On Linux, the **cpufreq** subsystem and its **governors** decide:

- `performance` — always run fast.
- `powersave` / `schedutil` — follow the load; the scheduler (chapter 5) tells it how busy each core is.

Modern CPUs largely manage this in hardware (Intel's Speed Shift, AMD's CPPC), with the OS providing hints about whether to favor performance or efficiency.

### Race to idle

Is it better to run slowly for a long time or quickly and then sleep? Often, **finishing quickly and going to deep sleep** saves the most energy, because once the work is done, large parts of the chip (and the rest of the system: memory, screen controller, radios) can switch off. This principle, **race to idle**, shapes how phones batch work.

### Big and little cores

Phones and modern laptops (Apple M-series, Intel's hybrid chips, ARM big.LITTLE) mix **performance cores** with **efficiency cores**. Efficiency cores are slower but use a fraction of the power. The scheduler places background tasks and light work on efficiency cores and moves demanding, user-visible work to performance cores — guided by hints like Apple's quality-of-service classes or Linux's energy-aware scheduling.

## Idle: sleep states

When a core has nothing to run, the OS puts it into an **idle state (C-state)**:

| State | What happens | Wake-up time |
|---|---|---|
| C0 | Running | — |
| C1 | Clock stopped | ~1 µs |
| C3/C6 | Caches flushed, core powered down, state saved | tens to hundreds of µs |
| Package C-states | Whole chip, including shared caches, mostly off | longer |

Deeper states save more power but take longer to wake and cost energy to enter and exit — so they only pay off if the core stays idle long enough. The OS's **idle governor** predicts how long the core will stay idle and picks a state accordingly.

That's why **frequent wakeups** are so costly: they keep cores from ever reaching the deep states.

## Fewer wakeups: tickless kernels and timer coalescing

Older kernels woke every core on a fixed **timer tick** (e.g. 1,000 times per second) to do bookkeeping, even when idle. Modern kernels are **tickless**: an idle core sleeps until the next timer actually due.

But apps set timers too. **Timer coalescing** lets the OS shift timers slightly so that many fire **together**, giving one wakeup instead of ten. macOS and Windows do this aggressively for background apps; Linux offers "timer slack".

> [!EXAMPLE] **Measuring wakeups.** On Linux, `powertop` lists which processes and devices wake the CPU most often per second. On macOS, Activity Monitor's Energy tab shows "Idle Wake Ups". An app showing 100 wakeups per second while idle is almost always polling something it shouldn't.

## How apps waste power — and how to fix it

- **Polling:** checking every few seconds whether something changed. Use **push notifications**, long-lived connections, file-system watch APIs (`inotify`) or event-driven I/O (chapter 10) so the OS wakes you only when something happens.
- **Busy-waiting:** spinning in a loop waiting for a flag. Block on a proper synchronization primitive (chapter 8).
- **Keeping the radio awake:** a phone's cellular radio stays in a high-power state for several seconds after each transfer. Ten small requests spread over a minute keep it awake the whole time; batching them into one burst lets it sleep. (This "radio tail" effect is a major mobile battery drain.)
- **Wake locks and keep-awake flags** held longer than needed.
- **Animations and rendering** when nothing is visible.
- **Hot loops and inefficient code** — every unnecessary CPU cycle is energy.

## Phones: the OS takes control of background work

Because apps can't be trusted to be frugal, mobile OSes **decide when background work runs**:

::widget Stepper {"type":"flow","cols":3,"title":"How Android and iOS limit background battery drain","what":"The mechanisms phone operating systems use so that apps in the background can't keep the device awake. Each box is one mechanism.","steps":["Press Play and read each mechanism.","For the messaging app in the story, find which mechanism makes its 10-second timer useless anyway.","Notice how apps are asked to describe their work so the OS can schedule it."],"nodes":[["App lifecycle limits","When an app leaves the screen, it gets only seconds to finish up, then it's suspended — frozen, using no CPU."],["Push notifications","One shared, OS-managed connection to Apple's or Google's servers receives messages for ALL apps, waking only the app that has a message. No app needs to poll."],["Scheduled background jobs","Apps describe deferrable work ('sync photos, needs Wi-Fi and charging') via WorkManager (Android) or BGTaskScheduler (iOS). The OS runs it at a good time, batched with other apps' work."],["Doze and standby buckets","When the phone sits still with the screen off, Android enters Doze: network access and jobs are deferred to short periodic maintenance windows. Rarely used apps get fewer chances to run."],["Batching the radio","The OS groups apps' network activity together so the cellular radio wakes once rather than many times."],["Attribution and shaming","Battery settings show which apps used the most energy — a strong incentive for developers to behave."]]}

## Sleep and hibernation

When you close a laptop:

- **Suspend to RAM (sleep, S3):** everything except memory is powered off; memory is kept refreshed with a trickle of power. Wakes in a second or two.
- **Modern standby (S0ix):** the system stays technically "on" in a very low-power state, like a phone, so it can fetch email and wake instantly. Convenient, but badly behaving software can drain the battery in a bag.
- **Hibernate (suspend to disk):** memory contents are written to disk and the machine powers off completely. Uses no power; wakes slowly.

To suspend, the OS freezes processes, tells every device driver to save its state and power down, and stores the CPU's state; resume reverses it. A single driver that doesn't handle this properly is the classic cause of "my laptop won't wake up".

> [!NOTE] **Data centers care too.** At scale, idle servers still use a large fraction of their peak power, so cloud providers pack workloads densely, use deep idle states, power-cap racks, and choose efficient ARM servers (Architecture track). Writing efficient code is, quite literally, saving electricity.

> [!RECAP]
> - Power = **dynamic** (switching, ∝ frequency × voltage²) + **static** (leakage, removed only by turning parts off).
> - **DVFS** scales frequency and voltage with load; **race to idle** often saves the most; schedulers use **big/little cores**.
> - **C-states** power down idle cores; deeper states need longer idle periods — so **wakeups are expensive**.
> - **Tickless kernels** and **timer coalescing** reduce wakeups; apps should avoid polling and busy-waiting and batch network use.
> - Phones control background work with suspension, **push notifications**, scheduled jobs and **Doze**.
> - **Sleep** keeps RAM powered; **hibernate** saves it to disk; drivers must cooperate.

> [!INTERVIEW] Mobile and systems interviews ask why polling is bad for battery, how push notifications save power, what race to idle means, and how you'd investigate an app that drains the battery.

::quiz {"q":"Why does a small timer firing every 10 seconds drain a phone's battery?","options":["Timers use a lot of memory","Each wakeup prevents the CPU and radio from staying in deep low-power states","Timers are slow","It overheats the screen"],"answer":1,"explain":"Waking up too often is the classic battery drain."}

::quiz {"q":"What does 'race to idle' mean?","options":["Running background tasks forever","Finishing work quickly so the system can enter deep sleep sooner, often saving energy overall","Lowering the clock speed permanently","Racing two threads"],"answer":1,"explain":"Deep sleep turns off much more of the system than running slowly."}

::quiz {"q":"How do push notifications save battery compared with polling?","options":["They compress data","One shared OS-managed connection wakes only the app with a message, so apps don't need to wake up to check","They use Wi-Fi only","They disable the radio"],"answer":1,"explain":"No polling; the OS handles one connection for all apps."}
