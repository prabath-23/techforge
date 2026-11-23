---
title: Service Mesh and Microservice Networking
summary: How services in a cluster find and talk to each other reliably — service discovery, client-side vs proxy load balancing, timeouts, retries and circuit breakers, the sidecar and sidecar-less service mesh (Istio, Linkerd, Cilium), mutual TLS and identity, traffic splitting for canaries, and observability for free — plus when a mesh is worth its complexity.
---

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
