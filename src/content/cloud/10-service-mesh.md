---
title: Service Mesh and Microservice Networking
summary: How services in a cluster find and talk to each other reliably — service discovery, client-side vs proxy load balancing, timeouts, retries and circuit breakers, the sidecar and sidecar-less service mesh (Istio, Linkerd, Cilium), mutual TLS and identity, traffic splitting for canaries, and observability for free — plus when a mesh is worth its complexity.
---

::widget Scene {"title": "A service mesh: retries, mTLS and metrics for free", "sub": "two services talking through sidecar proxies", "nodes": [{"id": "a", "kind": "server", "label": "Orders", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "pa", "kind": "cube", "label": "Sidecar proxy", "x": 7.52, "y": -0.08, "color": "orange"}, {"id": "pb", "kind": "cube", "label": "Sidecar proxy", "x": 11.92, "y": -4.48, "color": "orange"}, {"id": "bb", "kind": "server", "label": "Payments v1", "x": 12.93, "y": -11.07, "color": "purple"}, {"id": "b2", "kind": "server", "label": "Payments v2", "x": 18.82, "y": -5.18, "color": "green"}, {"id": "cp", "kind": "cube", "label": "Control plane", "x": 3.52, "y": -8.48, "color": "teal"}], "links": [["a", "pa"], ["pa", "pb", {"label": "mTLS"}], ["pb", "bb"], ["pb", "b2"], ["cp", "pa", {"dashed": true}], ["cp", "pb", {"dashed": true}]], "metrics": [["feat", "Feature"], ["code", "Code changes in services"]], "steps": [{"short": "Problem", "tag": "Problem", "title": "40 services each implementing retries, timeouts, TLS and metrics", "body": "<p>In 4 languages, inconsistently.</p>", "show": ["a", "bb"], "metrics": {"feat": ["—"], "code": ["lots, in every service", "bad"]}}, {"short": "Sidecar", "tag": "Sidecar", "title": "Put a proxy (Envoy) next to every service", "body": "<p>The app talks to localhost; iptables rules send all traffic through the proxy.</p>", "show": ["a", "pa", "pb", "bb"], "flow": [["a", "pa", "#3b82f6", "plain HTTP to localhost"]], "metrics": {"code": ["none", "good"]}}, {"short": "mTLS", "tag": "Security", "title": "Proxies encrypt and authenticate every call (mTLS)", "body": "<p>Each has a certificate for its service identity, rotated automatically. Zero-trust networking without touching app code.</p>", "flow": [["pa", "pb", "#22c55e", "mTLS"]], "metrics": {"feat": ["mTLS everywhere"]}}, {"short": "Policy", "tag": "Authorization", "title": "Policy: only Orders may call Payments", "body": "<p>The receiving proxy checks the caller's identity.</p>", "set": {"pb": {"badge": "allow: orders"}}, "metrics": {"feat": ["service-to-service authZ"]}}, {"short": "Retry", "tag": "Resilience", "title": "A call fails: the proxy retries with a timeout and budget", "body": "<p>Configured centrally, applied consistently.</p>", "flow": [["pb", "bb", "#ef4444", "fail"], ["pb", "bb", "#22c55e", "retry ok"]], "metrics": {"feat": ["retries, timeouts, circuit breaking"]}}, {"short": "Metrics", "tag": "Observability", "title": "Every proxy reports requests, errors and latency", "body": "<p>A service graph and golden signals for every pair of services — for free.</p>", "metrics": {"feat": ["uniform metrics + traces"]}}, {"short": "Split", "tag": "Traffic", "title": "Canary Payments v2 with 10% of traffic", "body": "<p>A routing rule in the control plane; no load-balancer changes.</p>", "show": ["a", "pa", "pb", "bb", "b2", "cp"], "flow": [["cp", "pb", "#14b8a6", "90/10 rule"], ["pb", "b2", "#22c55e", "10%"], ["pb", "bb", "#a855f7", "90%"]], "metrics": {"feat": ["traffic splitting"]}}, {"short": "Cost", "tag": "Trade-off", "title": "The cost", "body": "<p>An extra hop (~1 ms), CPU and memory per pod, and a complex system to operate. Worth it with many services; overkill with a few. Ambient/sidecarless meshes reduce the overhead.</p>", "note": {"kind": "key", "text": "A mesh moves networking concerns — mTLS, retries, routing, metrics — out of app code into proxies managed by a control plane."}}]}

::widget Scene {"title": "A service mesh: retries, mTLS and canaries without code changes", "sub": "sidecar proxies beside every service", "nodes": [{"id": "a", "kind": "server", "label": "Product service", "x": 3.1, "y": 3.1, "color": "blue"}, {"id": "pa", "kind": "router", "label": "Sidecar proxy", "x": 6.7, "y": -0.5, "color": "teal"}, {"id": "pb", "kind": "router", "label": "Sidecar proxy", "x": 10.3, "y": -4.1, "color": "teal"}, {"id": "b", "kind": "server", "label": "Pricing service", "x": 13.9, "y": -7.7, "color": "purple"}, {"id": "cp", "kind": "cpu", "label": "Control plane", "x": 2.92, "y": -7.88, "color": "orange"}], "links": [["a", "pa"], ["pa", "pb", {"label": "mTLS"}], ["pb", "b"], ["cp", "pa", {"dashed": true}], ["cp", "pb", {"dashed": true}]], "metrics": [["feat", "Handled by the mesh"]], "steps": [{"short": "Intercept", "tag": "Sidecar", "title": "Each service talks only to its local proxy", "body": "<p>The app just calls <code>http://pricing</code>; the proxy does the rest.</p>", "flow": [["a", "pa", "#3b82f6", "call pricing"]], "metrics": {"feat": ["—"]}}, {"short": "Secure", "tag": "mTLS", "title": "Proxies encrypt and authenticate every hop", "body": "<p>Each service has a certificate-based identity; policies say who may call whom.</p>", "flow": [["pa", "pb", "#22c55e", "🔒 mTLS"]], "metrics": {"feat": ["mTLS, authorization"]}}, {"short": "Control", "tag": "Policy", "title": "The control plane pushes retries, timeouts and traffic splits", "body": "<p>\"Send 5% to pricing v2\" — without touching application code.</p>", "flow": [["cp", "pa", "#f59e0b", "config"]], "metrics": {"feat": ["retries, timeouts, canaries, metrics"]}, "note": {"kind": "key", "text": "A mesh pays off with many services and teams; small systems can use a good client library instead."}}]}

## Every team reinventing the same plumbing

> [!STORY] A company has 120 microservices written in Java, Go, Python and Node. Each team implements its own retries (some retry forever, some never), its own timeouts (some none at all), its own TLS setup (some don't bother inside the cluster), and its own metrics (in five different formats). When the recommendations service slows down, the product page's retries pile on until checkout falls over too — a **cascading failure**. The platform team asks: what if all of this network behaviour lived in one shared layer, configured centrally, identical for every language? That layer is a **service mesh**.

## The problems every microservice system must solve

When services call each other over the network (System Design track, chapter 11), every call needs:

- **Discovery:** where are the healthy instances of `pricing` right now?
- **Load balancing** across those instances.
- **Resilience:** timeouts, retries with backoff, circuit breaking, rate limits.
- **Security:** encryption, and proof of which service is calling (identity) and whether it's allowed.
- **Observability:** request rates, errors, latencies and traces for every hop.
- **Traffic control:** send 5% to the new version; mirror traffic; inject faults for testing.

## Service discovery and load balancing

In Kubernetes, a **Service** gives a stable name (`pricing.shop.svc.cluster.local`) and virtual IP for a changing set of pods; DNS resolves the name, and kube-proxy (iptables/IPVS) or eBPF spreads connections across healthy pods (chapter 4).

That basic approach balances **connections**, not requests. With long-lived HTTP/2 or gRPC connections — which carry many requests over one connection — one pod can end up receiving all the traffic from a client. Proper **request-level (L7) load balancing** needs something that understands HTTP: a client library or a proxy. Smart balancers also use better algorithms than round-robin, like least outstanding requests or the power of two choices (Algorithms track, chapter 10).

## Resilience patterns

::widget Stepper {"type":"hub","title":"Resilience patterns for service-to-service calls","what":"The center is the problem — one slow or failing dependency. Each box is a pattern that stops it spreading, with sensible defaults.","steps":["Click the center first.","Click each pattern and think about what goes wrong without it.","Find the pattern that stops retries from making an outage worse."],"nodes":[["One slow dependency","Recommendations starts responding in 10 s instead of 50 ms. Without protection, callers' threads and connections fill up waiting, they slow down too, and the failure cascades up to the user-facing services."],["Timeouts","Every call has a deadline (e.g. 300 ms for a non-critical call). Better: propagate a request-wide deadline, so downstream services stop working on requests the user has already given up on."],["Retries with backoff and budgets","Retry only safe (idempotent) requests, only on transient errors, with exponential backoff and jitter — and cap retries to e.g. 10% of traffic (a retry budget) so retries can't multiply load during an outage."],["Circuit breaker","After many failures, stop calling the dependency for a while and fail fast (or use a fallback). Periodically let a test request through; close the circuit when it succeeds again. Like a household fuse."],["Bulkheads","Separate connection pools or concurrency limits per dependency, so a slow recommendations service can't use up the resources needed to call payments. Named after a ship's watertight compartments."],["Fallbacks and graceful degradation","If recommendations fail, show bestsellers or hide the widget — the product page still works. Decide in advance which features are optional."],["Outlier ejection","Temporarily remove an individual instance that's returning errors from the load-balancing pool, while healthy instances keep serving."]]}

> [!WARN] Retries at **every** layer multiply: if the gateway, the product service and the pricing client each retry 3 times, one user request can become 27 calls to a struggling service. Retry in one place (usually closest to the caller), with budgets.

## What a service mesh is

A **service mesh** moves all of this out of application code into the infrastructure. Two parts:

- The **data plane:** proxies that every request passes through. Traditionally a **sidecar** proxy (usually **Envoy**) in each pod, intercepting all inbound and outbound traffic transparently.
- The **control plane:** pushes configuration (routes, policies, certificates) to all the proxies (Istio's istiod, Linkerd's control plane).

::widget Architecture {"title":"A sidecar service mesh","what":"Each service pod runs a proxy beside the application. Services talk to their local proxy; proxies talk to each other over mutual TLS, applying routing, retries and policy; the control plane configures them all and issues identities.","steps":["Follow a call from the product service to the pricing service through both proxies.","Click the control plane to see what it distributes.","Find where 5% of traffic is sent to the new version of pricing."],"nodes":[{"id":"prodapp","label":"Product service (app)","kind":"service","col":0,"row":1,"desc":"Calls http://pricing as if it were local; knows nothing about TLS, retries or routing."},{"id":"prodproxy","label":"Sidecar proxy (Envoy)","kind":"gateway","col":1,"row":1,"desc":"Intercepts the outbound call: picks a pricing instance, applies timeouts/retries/circuit breaking, encrypts with mTLS, records metrics and trace spans."},{"id":"pv1proxy","label":"Sidecar proxy","kind":"gateway","col":2,"row":0,"desc":"Terminates mTLS, checks the caller's identity against authorization policy (product → pricing allowed), records metrics, forwards to the app."},{"id":"pv1","label":"Pricing v1 (95%)","kind":"service","col":3,"row":0,"desc":"The current version, receiving most traffic."},{"id":"pv2proxy","label":"Sidecar proxy","kind":"gateway","col":2,"row":2,"desc":"Same as above, in front of the new version."},{"id":"pv2","label":"Pricing v2 (5% canary)","kind":"service","col":3,"row":2,"desc":"The new version receiving a small, controlled share of requests while its error rate and latency are compared with v1."},{"id":"cp","label":"Control plane (istiod)","kind":"service","col":1,"row":0,"desc":"Distributes routing rules (95/5 split), resilience settings and authorization policies to every proxy, and acts as a certificate authority issuing short-lived workload certificates."},{"id":"obs","label":"Metrics & traces","kind":"storage","col":1,"row":2,"desc":"Every proxy reports golden signals and trace spans automatically — uniform observability without code changes."}],"edges":[["prodapp","prodproxy","localhost"],["prodproxy","pv1proxy","mTLS 95%"],["prodproxy","pv2proxy","mTLS 5%"],["pv1proxy","pv1","local"],["pv2proxy","pv2","local"],["cp","prodproxy","config + certs",true],["prodproxy","obs","telemetry",true]]}

What you get, configured centrally and identically for every language:

- **mTLS everywhere** with automatic certificate rotation and **workload identity** (SPIFFE IDs) — the foundation of zero trust (Security track, chapter 6).
- **Authorization policies:** "only the orders service may call payments, and only POST /charges".
- **Traffic management:** canary splits, header-based routing ("send employees to v2"), mirroring, fault injection.
- **Resilience:** timeouts, retries, circuit breaking, outlier detection.
- **Observability:** golden-signal metrics for every service pair, access logs and distributed tracing spans.

```yaml
# Istio: send 5% of pricing traffic to v2, with timeouts and limited retries
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata: { name: pricing }
spec:
  hosts: [pricing]
  http:
  - timeout: 300ms
    retries: { attempts: 2, perTryTimeout: 100ms, retryOn: "5xx,reset,connect-failure" }
    route:
    - destination: { host: pricing, subset: v1 }
      weight: 95
    - destination: { host: pricing, subset: v2 }
      weight: 5
```

> [!ANALOGY] A service mesh is like a building's shared utilities. Instead of every apartment installing its own wiring, plumbing and security cameras to different standards, the building provides them centrally — consistent, maintained by specialists, and upgraded once for everyone.

## Sidecar-less meshes

Sidecars cost memory and CPU in every pod and add a little latency to every hop. Newer designs reduce that:

- **Istio ambient mode:** a per-node proxy (ztunnel) handles mTLS and L4 features; optional shared "waypoint" proxies handle L7 features only for services that need them.
- **Cilium service mesh:** uses **eBPF** in the kernel (OS track, chapter 14) for networking, policy and observability, with Envoy only where L7 processing is needed.
- **Proxyless gRPC:** gRPC libraries receive mesh configuration directly (xDS) and do it in-process.

## Is a mesh worth it?

**Benefits** grow with the number of services, languages and teams, and with security requirements (mTLS and service-level authorization everywhere).

**Costs:** another complex distributed system to run and upgrade; resource overhead; extra latency (typically sub-millisecond per hop); more things that can break; debugging through proxies.

Simpler alternatives for smaller systems:

- A good **shared client library** (if you're mostly one language) — e.g. gRPC with built-in retries and deadlines.
- Kubernetes **NetworkPolicies** for basic segmentation; cert-manager for TLS.
- An **API gateway** at the edge for north-south traffic, without a mesh for east-west traffic.

**Rule of thumb:** adopt a mesh when you need uniform mTLS/zero-trust and traffic control across many services and teams — not because you have microservices.

> [!RECAP]
> - Service-to-service calls need **discovery, L7 load balancing, resilience, security, observability and traffic control**.
> - Resilience: **timeouts and deadlines**, **retries with backoff and budgets**, **circuit breakers**, **bulkheads**, fallbacks, outlier ejection. Beware retry multiplication.
> - A **service mesh** = data-plane proxies (Envoy sidecars, or node/eBPF-based) + a control plane, giving mTLS, identity, authorization policies, canaries and uniform telemetry without code changes.
> - Sidecar-less designs (Istio ambient, Cilium) reduce overhead.
> - Adopt a mesh when its benefits outweigh its operational cost; smaller systems can use libraries, network policies and a gateway.

> [!INTERVIEW] Explain how one slow service can cause a cascading failure and how timeouts, retry budgets, circuit breakers and bulkheads prevent it; what a sidecar does; and when you would (or wouldn't) adopt a service mesh.

::quiz {"q":"What does a circuit breaker do?","options":["Encrypts traffic","After repeated failures, stops calling a dependency for a while and fails fast, then tests recovery","Balances load","Restarts pods"],"answer":1,"explain":"It stops a struggling service being hammered and protects callers' resources."}

::quiz {"q":"Why can Kubernetes' basic Service load balancing be uneven for gRPC traffic?","options":["gRPC is unsupported","It balances connections, and gRPC multiplexes many requests over a few long-lived connections","It uses DNS only","gRPC is too fast"],"answer":1,"explain":"Request-level (L7) balancing needs a proxy or a smart client."}

::quiz {"q":"What is the main job of a service mesh's control plane?","options":["Serving user traffic","Distributing routing, policy and certificates to all the data-plane proxies","Storing application data","Building images"],"answer":1,"explain":"The proxies (data plane) carry the traffic."}
