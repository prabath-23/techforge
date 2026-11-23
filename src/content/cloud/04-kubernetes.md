---
title: Kubernetes — Running Containers Across a Fleet of Machines
summary: Why you need an orchestrator once you have more than a handful of containers, the one big idea that makes Kubernetes work (declare what you want; controllers keep fixing reality to match), its parts, how a deployment rolls out, how traffic finds your app, health checks, resources and autoscaling — and how to debug the errors you'll actually see.
---

::widget Scene {"title": "Kubernetes heals itself: desired vs actual state", "sub": "from kubectl apply to a crashed pod being replaced", "nodes": [{"id": "dev", "kind": "laptop", "label": "kubectl apply", "x": 3.72, "y": 3.72}, {"id": "api", "kind": "server", "label": "API server", "x": 7.72, "y": -0.28, "color": "blue"}, {"id": "etcd", "kind": "db", "label": "etcd", "x": 1.83, "y": -6.17, "color": "purple"}, {"id": "ctl", "kind": "cube", "label": "Controllers", "x": 5.83, "y": -10.17, "color": "orange"}, {"id": "sch", "kind": "cube", "label": "Scheduler", "x": 11.72, "y": -4.28, "color": "orange"}, {"id": "n1", "kind": "server", "label": "Node 1 (kubelet)", "x": 12.62, "y": -11.38, "color": "green"}, {"id": "n2", "kind": "server", "label": "Node 2 (kubelet)", "x": 18.82, "y": -5.18, "color": "green"}, {"id": "svc", "kind": "router", "label": "Service", "x": 19.72, "y": -12.28, "color": "teal"}], "links": [["dev", "api"], ["api", "etcd"], ["api", "ctl"], ["api", "sch"], ["api", "n1"], ["api", "n2"], ["svc", "n1"], ["svc", "n2"]], "metrics": [["desired", "Desired"], ["actual", "Running"], ["who", "Acting"]], "steps": [{"short": "Apply", "tag": "Declare", "title": "You declare: Deployment \"api\", 3 replicas", "body": "<p>You say what you want, not how to do it.</p>", "show": ["dev", "api"], "flow": [["dev", "api", "#3b82f6", "replicas: 3"]], "metrics": {"desired": ["3"], "actual": ["0"], "who": ["you"]}}, {"short": "Store", "tag": "Store", "title": "The API server validates it and stores it in etcd", "body": "<p>etcd is the cluster's source of truth (a Raft-replicated key-value store).</p>", "show": ["dev", "api", "etcd"], "flow": [["api", "etcd", "#a855f7", "save"]], "metrics": {"who": ["API server"]}}, {"short": "Ctrl", "tag": "Reconcile", "title": "The ReplicaSet controller sees 0 pods, wants 3", "body": "<p>It creates 3 pod objects. Every controller is a loop: observe, compare, act.</p>", "show": ["dev", "api", "etcd", "ctl"], "flow": [["ctl", "api", "#f59e0b", "create 3 pods"]], "metrics": {"who": ["controller"]}}, {"short": "Sched", "tag": "Schedule", "title": "The scheduler assigns each pod to a node", "body": "<p>Based on free CPU and memory requests, affinity rules and spreading across zones.</p>", "show": ["dev", "api", "etcd", "ctl", "sch"], "flow": [["sch", "api", "#f59e0b", "pod-1 → node 1 …"]], "metrics": {"who": ["scheduler"]}}, {"short": "Kubelet", "tag": "Run", "title": "Each node's kubelet starts its containers", "body": "<p>Pulls images, starts them, reports status back.</p>", "show": ["dev", "api", "etcd", "ctl", "sch", "n1", "n2"], "flow": [["api", "n1", "#22c55e", "pods 1, 2"], ["api", "n2", "#22c55e", "pod 3"]], "set": {"n1": {"badge": "2 pods"}, "n2": {"badge": "1 pod"}}, "metrics": {"actual": ["3", "good"], "who": ["kubelets"]}}, {"short": "Ready", "tag": "Probes", "title": "Readiness probes pass; the Service adds them as endpoints", "body": "<p>Traffic only goes to pods that say they're ready.</p>", "show": ["dev", "api", "etcd", "ctl", "sch", "n1", "n2", "svc"], "flow": [["svc", "n1", "#14b8a6", ""], ["svc", "n2", "#14b8a6", ""]]}, {"short": "Crash", "tag": "Failure", "title": "Node 2 dies", "body": "<p>Its pod is gone. Actual (2) ≠ desired (3).</p>", "set": {"n2": {"dim": true, "badge": "NotReady"}, "n1": {"badge": "2 pods"}}, "metrics": {"actual": ["2", "bad"]}}, {"short": "Heal", "tag": "Self-heal", "title": "Controller notices and creates a replacement; scheduler puts it on node 1", "body": "<p>No human involved. The Service stops routing to the dead pod.</p>", "flow": [["ctl", "api", "#f59e0b", "create pod-4"], ["api", "n1", "#22c55e", "pod-4"]], "set": {"n1": {"badge": "3 pods"}}, "metrics": {"actual": ["3", "good"], "who": ["controller + scheduler"]}}, {"short": "Rollout", "tag": "Update", "title": "Change the image tag: a rolling update", "body": "<p>Start a new pod, wait until ready, stop an old one, repeat. Roll back with one command if probes fail.</p>"}, {"short": "HPA", "tag": "Scale", "title": "The autoscaler changes replicas based on CPU", "body": "<p>It edits the desired state; the same loops do the rest.</p>", "note": {"kind": "key", "text": "Kubernetes stores desired state; controllers continuously reconcile actual state toward it. That single idea gives self-healing, rollouts and scaling."}}]}

## From one container to ten thousand

Running one container with Docker is easy. Now imagine running **2,000 containers of 150 different services on 300 machines**:

- Which machine should each container go on, so none is overloaded?
- A machine dies at 3 am. Who restarts its 40 containers somewhere else?
- How do you roll out version 2 without downtime, and roll back if it's broken?
- Containers come and go with new IP addresses. How does service A find service B?
- Traffic triples on a sale day. Who adds more copies?

Doing this by hand is impossible. An **orchestrator** does it for you, and **Kubernetes** (often written **K8s**) is the industry standard. It grew out of **Borg**, the system Google used internally for over a decade to run everything from Search to Gmail.

## The one big idea: declare what you want


> [!ANALOGY] A thermostat. You don't tell the heater "run for 12 minutes". You set **what you want** — 22°C — and the thermostat keeps checking the room and switching the heater on and off to keep it there, forever. If someone opens a window, it notices and compensates. You never give step-by-step instructions.

Kubernetes works exactly like that. You **declare the desired state** — "I want 3 copies of `web:v2` running" — and a set of **controllers** continuously compare it with **what's actually running**, and act to close the gap. Not once: forever, in a loop. This loop is called **reconciliation**.

Try it. Crash pods, take a machine down, change the number of copies, roll out a new version — and watch the system fix itself:

::widget K8sReconcile {}

That's why Kubernetes is called **self-healing**: a crashed container, a dead machine or someone accidentally deleting a pod is simply a difference between "desired" and "actual", and the controllers fix it like any other.

## The parts of a cluster

::widget Stepper {"type":"hub","title":"Inside a Kubernetes cluster — click each part","what":"The center is the API server, which every other part talks to. The surrounding boxes are the cluster's other components.","steps":["Click each component.","Notice that nothing talks to the database (etcd) except the API server.","Find which component decides WHERE a new pod runs, and which one actually starts it."],"nodes":[["API server","The front door of the cluster. Every request — from kubectl, from controllers, from machines — goes through it. It checks who you are and what you're allowed to do, validates the request, and stores it."],["etcd","The cluster's database: a small, strongly consistent key-value store using the Raft consensus algorithm (System Design track). It holds the desired and actual state of everything. Back it up!"],["Scheduler","Watches for new pods that don't have a machine yet. Filters out machines that can't fit them (not enough free memory, wrong type of machine), scores the rest, and assigns each pod to the best one."],["Controller manager","Runs the reconciliation loops: one makes sure each Deployment has the right number of pods, another notices dead machines and replaces their pods, and so on."],["Kubelet (on every machine)","The agent on each worker machine. It sees which pods have been assigned to its machine, asks the container runtime to start them, runs their health checks, and reports their status."],["Networking (on every machine)","Gives every pod its own IP address, and makes 'Services' (stable addresses for a group of pods) route traffic to the right pods."]]}

What happens when you run `kubectl apply -f deployment.yaml`:

1. The **API server** checks your permissions, validates the file, and stores the desired state in **etcd**.
2. The **Deployment controller** notices: "3 pods wanted, 0 exist" → creates 3 pod records.
3. The **scheduler** notices 3 pods without a machine → picks a machine for each.
4. The **kubelet** on each chosen machine notices a new pod for it → pulls the image and starts the container.
5. Each kubelet reports "running"; health checks pass; traffic starts flowing to the new pods.

Notice that no component tells another what to do directly. Each one **watches** the shared state and does its own part.

## The main objects

- **Pod** — the smallest unit: one or more containers that always run together on the same machine, sharing an IP address and storage. Usually one main container, sometimes with a helper "sidecar" (for example, a log shipper). Pods are **disposable** and get replaced, never repaired.
- **Deployment** — "keep N identical copies of this pod running, and roll out new versions gradually". Used for stateless apps (most web services).
- **StatefulSet** — for things like databases, where each copy needs a stable name (`db-0`, `db-1`) and its own permanent disk.
- **DaemonSet** — exactly one pod on every machine (log collectors, monitoring agents).
- **Job / CronJob** — run something to completion, once or on a schedule.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3                              # desired state: 3 copies
  selector: { matchLabels: { app: web } }
  template:
    metadata: { labels: { app: web } }
    spec:
      containers:
        - name: web
          image: ghcr.io/acme/web:2.4.1
          ports: [{ containerPort: 8080 }]
          resources:
            requests: { cpu: 250m, memory: 256Mi }   # reserved for scheduling
            limits:   { memory: 512Mi }              # hard cap: exceed it → OOMKilled
          readinessProbe:                            # "ready to receive traffic?"
            httpGet: { path: /ready, port: 8080 }
          livenessProbe:                             # "still alive, or stuck?"
            httpGet: { path: /healthz, port: 8080 }
```

## Rolling out a new version

Change the image to `web:2.5.0` and apply. The Deployment does a **rolling update**: start one new pod, wait until it's ready, remove one old pod, and repeat. Users never see downtime, and if new pods fail their health checks, the rollout stops. `kubectl rollout undo deployment/web` brings back the previous version.

## Health checks: ready vs alive

Two different questions, and mixing them up causes real outages:

- **Readiness probe — "should I receive traffic right now?"** If it fails, the pod is taken out of rotation but **not restarted**. Use it while starting up, warming caches, or when temporarily overloaded.
- **Liveness probe — "are you stuck?"** If it fails, the container is **restarted**. Use it only to detect a truly frozen process.

> [!WARN] **Never make a liveness probe depend on your database.** If the database has a brief hiccup, every pod's liveness check fails at once, Kubernetes restarts **all** your pods simultaneously, and a 10-second database blip becomes a full outage while everything restarts.

**Shutting down gracefully:** when a pod is being removed, Kubernetes sends the app a **SIGTERM** signal and waits up to 30 seconds before killing it (OS track, chapter 3). Apps should stop accepting new requests, finish the ones in progress, then exit.

## How traffic finds your pods: Services

Pods come and go, each with a new IP address. A **Service** gives a group of pods a **stable name and address**: `http://web` (or `web.prod.svc.cluster.local`) always reaches one of the currently healthy `web` pods, whichever they are right now. Kubernetes' built-in DNS resolves the name, and rules on every machine spread connections across the ready pods.

- **ClusterIP** (default): reachable only inside the cluster.
- **LoadBalancer**: asks the cloud for an external load balancer.
- **Ingress / Gateway API**: routes outside HTTP traffic by domain and path — `shop.com/api` to the API service, `shop.com/` to the web service.

> [!ANALOGY] A Service is like a company's main phone number. Employees join and leave and move desks, but customers always call the same number, and the switchboard routes the call to someone currently available.

## Resources: requests and limits

- **Requests** are what the scheduler **reserves** for the pod. A machine only accepts pods whose total requests fit.
- **Limits** are hard caps enforced by cgroups (previous chapter). Over the memory limit → **OOMKilled**. Over the CPU limit → **throttled** (slowed down).

Setting accurate requests is what lets Kubernetes pack machines efficiently. Many teams set memory limits but leave out CPU limits to avoid surprise throttling.

## Autoscaling

- **Horizontal Pod Autoscaler:** add or remove pods based on CPU, memory or custom metrics like requests per second or queue length.
- **Cluster Autoscaler / Karpenter:** add whole machines when pods can't fit anywhere, and remove machines that are mostly idle.

> [!EXAMPLE] On a sale day, traffic rises; the Horizontal Pod Autoscaler grows `web` from 10 to 40 pods; there's no room for 30 more pods, so Karpenter adds 8 machines in about a minute; after the sale, both shrink back, and you stop paying for the extra machines.

## Configuration and secrets

- **ConfigMaps** hold settings (feature flags, URLs), given to pods as environment variables or files.
- **Secrets** hold passwords and API keys. By default they're only base64-**encoded**, not encrypted — turn on encryption at rest, restrict who can read them, or connect an external secrets manager like Vault or AWS Secrets Manager.

## Debugging: the errors you'll actually see

```bash
kubectl get pods                            # status, restart counts
kubectl describe pod web-7d9c-x2            # the "Events" section explains most problems
kubectl logs web-7d9c-x2 --previous         # logs from the container that just crashed
kubectl exec -it web-7d9c-x2 -- sh          # a shell inside a running container
kubectl rollout undo deployment/web         # emergency rollback
```

| Status | What it usually means | What to do |
|---|---|---|
| **Pending** | No machine has enough free (requested) resources, or placement rules forbid it | Check `describe` events; reduce requests or add machines |
| **ImagePullBackOff** | Wrong image name/tag, or no permission to pull from the registry | Fix the image reference or registry credentials |
| **CrashLoopBackOff** | The app keeps crashing right after starting | `kubectl logs --previous` — usually a missing config value or a bug |
| **OOMKilled** | Exceeded its memory limit | Raise the limit or fix the leak |
| **Running but 0/1 Ready** | Readiness probe failing | Check the probe path and the app's dependencies |

> [!RECAP]
> - Kubernetes runs containers across a fleet: placement, restarts, rollouts, discovery and scaling.
> - The core idea: **declare the desired state**; **controllers reconcile** reality to it, forever (a thermostat).
> - Parts: **API server**, **etcd**, **scheduler**, **controllers**, and a **kubelet** on every machine.
> - Objects: **Pod**, **Deployment** (rolling updates), **StatefulSet**, **DaemonSet**, **Job**.
> - **Readiness** gates traffic; **liveness** restarts stuck containers (never tie it to the database).
> - **Services** give stable names; **requests/limits** drive scheduling, throttling and OOMKills; autoscalers add pods and machines.

> [!INTERVIEW] Expect: what happens on `kubectl apply`; Deployment vs StatefulSet vs DaemonSet; readiness vs liveness; requests vs limits; how a Service routes traffic; how a rolling update works; and how you'd debug CrashLoopBackOff. Mention reconciliation explicitly — it's the idea everything else follows from.

::quiz {"q":"A pod's readiness probe fails but its liveness probe passes. What happens?","options":["The container restarts","It's removed from the Service's traffic rotation but keeps running","The machine is drained","Nothing"],"answer":1,"explain":"Readiness controls traffic; liveness triggers restarts."}

::quiz {"q":"Which component decides which machine a new pod runs on?","options":["kubelet","The scheduler","etcd","The Service"],"answer":1,"explain":"The scheduler filters and scores machines, then assigns the pod."}

::quiz {"q":"Why is it dangerous for a liveness probe to check the database?","options":["It's slow","A brief database hiccup makes every pod fail liveness at once, so Kubernetes restarts all of them — turning a blip into an outage","Databases don't support probes","It leaks passwords"],"answer":1,"explain":"Liveness should only detect a stuck process, not dependency problems."}
