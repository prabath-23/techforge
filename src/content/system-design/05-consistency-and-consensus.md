---
title: Consistency and Consensus — Getting Many Machines to Agree
summary: Why distributed systems are so much harder than single machines (you can never tell "dead" from "slow"), why clocks can't be trusted, what "strong" and "eventual" consistency mean in practice, the CAP theorem without the myths, how the Raft algorithm lets a cluster agree on one truth, why distributed locks need fencing, and how to coordinate work across services (two-phase commit, sagas, the outbox pattern).
---

## The problem: you can't tell dead from slow

On one computer, things either work or crash. Across many computers connected by a network, a third, much nastier thing happens: **partial failure**. Some parts work, some don't, and you often **can't tell which**.

You send a request to another server and get no answer. Possibilities:

- the request was lost on the way;
- the server crashed before handling it;
- the server is alive but paused for 30 seconds (a garbage collection pause, an overloaded machine);
- the server handled it perfectly, and the **reply** was lost.

From the sender's side, all four look identical: silence. The only tool is a **timeout**, and a timeout can't distinguish "dead" from "slow".

> [!ANALOGY] You text a friend "Did you book the restaurant?" and hear nothing. Did they not see it? Did they book it and their reply didn't send? Are they busy? Are they asleep? If you book it yourself, you might end up with two reservations. If you don't, maybe nobody books. Distributed systems face this dilemma millions of times a second.

Engineers have a famous list of assumptions that quietly break real systems — the **fallacies of distributed computing**: the network is reliable; latency is zero; bandwidth is infinite; the network is secure; the topology doesn't change; there is one administrator; transport costs nothing; the network is uniform. Every one of them is false, and good designs plan for that.

## Clocks lie

You might hope to order events across machines by their timestamps. You can't trust them.

- Each machine's clock drifts and is corrected over the network (via NTP), typically within a few milliseconds — sometimes much worse.
- Clocks can **jump backwards** when corrected.

So if server A logs an event at 10:00:00.005 and server B logs one at 10:00:00.003, you **cannot** be sure B's happened first.

> [!EXAMPLE] **"Last write wins" can silently lose data.** If two servers resolve conflicts by keeping the write with the later timestamp, and one server's clock runs 50 ms fast, its writes win even when they actually happened earlier. Real bugs like this lose customer data quietly.

Solutions:

- **Logical clocks** (Lamport clocks, vector clocks): instead of wall-clock time, count events and pass the counter along with messages. They capture **cause and effect** ("this happened because of that") without trusting clocks. Vector clocks can even tell when two updates happened **concurrently** — so a conflict can be detected and resolved instead of silently overwriting.
- **Google's TrueTime:** Google put GPS receivers and atomic clocks in every data center, so Spanner knows the current time within a few milliseconds of **guaranteed** uncertainty. When committing a transaction, Spanner simply **waits out** that uncertainty, which guarantees global ordering. An engineering solution with hardware to match.

## What does "consistent" mean?

When data has copies on several machines, "consistency" describes what a reader can see. From strongest to weakest:

- **Strong consistency (linearizability):** the system behaves as if there's only **one copy**. Once a write is confirmed, every later read anywhere sees it. Needed for bank balances, inventory counts, usernames ("is this name taken?"), leader election and locks.
- **Causal consistency:** if one event caused another (a reply to a comment), everyone sees them in that order; unrelated events may appear in different orders to different people.
- **Read-your-writes:** you always see your own changes (chapter 4).
- **Eventual consistency:** if updates stop, all copies **eventually** agree — but meanwhile, different readers may see different, slightly old values.

> [!EXAMPLE] **Picking per feature, not per company.** On Instagram, a like count that's a few seconds behind is fine — eventual consistency, very fast and highly available. When you change your username, the system must make sure two people can't claim the same name at the same instant — that needs strong consistency. Most real systems mix both.

## The CAP theorem, without the myths

The **CAP theorem** says: when the network between your machines breaks (**P**artition), you must choose between

- **C**onsistency — refuse to answer (or block) rather than risk giving an out-of-date answer, or
- **A**vailability — keep answering, even if the answer might be stale or conflict with other copies.

Networks **do** break, so the real choice is what to do **during** a break:

- **CP systems** (ZooKeeper, etcd, Google Spanner, most banking systems) — the side that can't confirm it has the latest data stops accepting requests.
- **AP systems** (Cassandra, DynamoDB in its default mode, DNS) — keep answering on both sides and reconcile afterwards.

> [!ANALOGY] Two bank branches lose their phone connection to each other. A customer at branch A asks to withdraw their whole balance. A **CP** branch says "sorry, our system is down, please come back later" — no risk of the same money being withdrawn at both branches. An **AP** branch says "sure" and sorts it out when the line comes back — great service, but possibly an overdrawn account.

A useful extension is **PACELC**: even when the network is **fine**, strong consistency costs **latency** (copies must talk to each other before answering). So systems trade latency against consistency all the time, not just during failures.

## Consensus: getting a group to agree

Many critical problems boil down to getting several machines to **agree on one thing** despite failures:

- Which machine is the **leader** right now?
- What's the **order** of these operations?
- Is this lock held, and by whom?

This is the **consensus** problem. It's solved by requiring a **majority**: a cluster of 3 machines can lose 1, a cluster of 5 can lose 2 (in general, 2f + 1 machines tolerate f failures). Any two majorities share at least one member, so two conflicting decisions can never both win.

### Raft, the understandable consensus algorithm

Raft (2014) was designed specifically to be easy to understand. It runs inside etcd (the brain of every Kubernetes cluster), Consul, CockroachDB, TiDB and Kafka's newer controller. Watch five servers run it — crash the leader and see a new election:

::widget RaftSim {}

How it works, in plain words:

1. **Everyone starts as a follower.** Followers expect regular "heartbeat" messages from a leader.
2. **Elections.** If a follower hears nothing for a random amount of time (say 150–300 ms), it assumes the leader is gone, becomes a **candidate** for a new **term** (an election round number), votes for itself and asks the others for votes. Each server votes at most once per term, and only for candidates whose log is at least as up to date as its own. A candidate with a **majority** becomes **leader**. (The random waiting time makes it unlikely that two followers start elections at the same moment.)
3. **Replicating changes.** Clients send changes to the leader. The leader appends each change to its log and sends it to the followers. Once a **majority** has stored it, the change is **committed** and applied, and the client gets its answer.
4. **Safety.** Because a new leader needs a majority's votes and must have an up-to-date log, it's guaranteed to already have every committed change. Nothing confirmed is ever lost.

> [!ANALOGY] A committee that keeps official minutes. One member is chair and proposes each entry; an entry becomes official once most members have written it in their own copy. If the chair stops responding, after a while someone proposes themselves as the new chair, and a member only supports a candidate whose minutes are at least as complete as their own.

The older and more famous algorithm is **Paxos** (Leslie Lamport), which runs inside Google's internal systems; Raft solves the same problem in a more teachable way.

Most engineers never implement consensus themselves. They use a **coordination service** built on it — **etcd**, **ZooKeeper** or **Consul** — for leader election, service discovery, configuration and locks.

## Distributed locks and the "paused process" trap

Suppose only one worker at a time may process a customer's monthly invoice, so you take a lock in a coordination service with a 30-second lease.

Here's the trap: worker A takes the lock, then **freezes for 40 seconds** (a long garbage collection pause, or the machine is overloaded). The lease expires. Worker B takes the lock and starts processing. Then A wakes up, still believing it holds the lock, and writes too. Two workers, one invoice, corrupted data.

The fix is a **fencing token**: every time the lock is granted, the lock service hands out an **increasing number**. Workers include it with every write, and the storage **rejects any write with a lower number than one it has already seen**. A's old token loses to B's newer one.

> [!ANALOGY] A concert wristband with a number. If the security staff remember that wristband #48 already went in, anyone showing up later with an older #47 band is turned away, even if it looks valid.

## Coordinating work across services

### Two-phase commit (2PC)

To update two different databases **atomically**, a coordinator asks both "can you commit?" (phase 1: **prepare**). If both say yes, it tells both "commit" (phase 2). If either says no, it tells both "abort".

The weakness: if the coordinator crashes after the participants said yes, they're **stuck** — they promised to commit if told to, so they can't decide on their own, and they hold their locks until the coordinator comes back. 2PC is used inside distributed databases (Spanner, CockroachDB) where the coordinator itself is replicated with consensus, but it's rarely a good idea between independent microservices.

### Sagas: undo instead of lock

For business processes spanning many services — book a flight, then a hotel, then charge the card — locking everything across services is impractical. A **saga** runs each step as its own local transaction, and if a later step fails, runs **compensating actions** to undo the earlier ones: cancel the hotel, refund the card.

> [!EXAMPLE] **Booking a holiday package.** Flight booked ✓, hotel booked ✓, car rental fails ✗ → the saga cancels the hotel and the flight. During that brief window, someone could see the hotel as booked, so sagas give up full isolation in exchange for not locking anything. Workflow engines like **Temporal** and AWS Step Functions exist largely to run sagas reliably.

### The outbox pattern: "save and announce" without losing either

A service often needs to **update its database** and **publish an event** ("OrderPlaced") for other services. If it does these as two separate steps, a crash between them leaves the database updated but nobody told — or the reverse.

The **outbox pattern**: write the event into an "outbox" table **in the same database transaction** as the data change. A separate process reads the outbox and publishes the events, retrying until each succeeds. Either both the change and the event happen, or neither does. Combined with consumers that safely ignore duplicates (chapter 6), this gives reliable event-driven systems without distributed transactions.

> [!RECAP]
> - Distributed systems suffer **partial failure**: you can't tell dead from slow; timeouts are the only tool.
> - **Clocks can't be trusted** for ordering; use logical/vector clocks (or Google-style TrueTime).
> - **Strong consistency** acts like one copy; **eventual consistency** converges later. Choose per feature.
> - **CAP**: during a network partition, choose consistency (refuse) or availability (answer, reconcile later).
> - **Consensus** (Raft, Paxos) uses majorities so 2f + 1 machines tolerate f failures; use etcd/ZooKeeper rather than building your own.
> - Distributed locks need **fencing tokens**; coordinate services with **sagas** and the **outbox pattern** rather than two-phase commit.

> [!INTERVIEW] Expect: the CAP theorem (as a choice during partitions), strong vs eventual consistency with concrete examples, how Raft elects a leader and commits entries, why clusters have 3 or 5 members, why locks need fencing tokens, the weakness of two-phase commit, and sagas plus the outbox pattern.

::quiz {"q":"How many failed machines can a 5-member Raft cluster survive and keep working?","options":["1","2","3","4"],"answer":1,"explain":"A majority (3 of 5) must remain: 2f + 1 = 5 means f = 2."}

::quiz {"q":"A worker freezes for 40 seconds and its lock's 30-second lease expires. What prevents it from corrupting data when it wakes up?","options":["A longer lease","A fencing token: storage rejects writes carrying an older token than one already seen","Retrying the write","Synchronizing clocks"],"answer":1,"explain":"Only the resource being protected can enforce ordering; leases alone can't handle pauses."}

::quiz {"q":"A service must update its database AND publish an event, and must never do just one. What's the standard solution?","options":["Publish first, then write","The outbox pattern: write the event to an outbox table in the same transaction, and publish it from there","Two-phase commit across the database and the message broker","Retry until both succeed"],"answer":1,"explain":"One local transaction covers both; a relay publishes reliably afterwards."}
