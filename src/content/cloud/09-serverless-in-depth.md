---
title: Serverless in Depth
summary: What "serverless" really means and how it works under the hood — functions as a service, events and triggers, cold starts and how to reduce them, concurrency and scaling limits, state and connections, the cost model and when it beats or loses to containers, event-driven architectures, workflows (Step Functions), and the pitfalls teams hit in production.
---

## A server bill of zero

> [!STORY] A small team builds a tool that resizes images when customers upload them. Traffic is spiky: nearly nothing at night, thousands of uploads in a burst when a big customer imports a catalog. With servers, they'd pay for enough machines to handle the bursts all day long, and someone would be on call for them. Instead, they write one function that runs **only when an image is uploaded**. On quiet days their compute bill is a few rupees; during a burst, the platform runs a thousand copies in parallel within seconds; and there are no servers to patch. That's the promise of **serverless** — and, as they discover later, it comes with its own set of trade-offs.

**Serverless** doesn't mean there are no servers; it means **you don't manage them**. The platform provisions, scales (including down to zero), patches and bills per use. The best-known form is **functions as a service** (AWS Lambda, Google Cloud Run functions, Azure Functions, Cloudflare Workers), but serverless also includes managed databases (DynamoDB, Firestore, Aurora Serverless), queues (SQS), storage (S3) and serverless containers (Cloud Run, Fargate).

## How a function runs

You upload code and say which **event** triggers it: an HTTP request, a file landing in storage, a message on a queue, a database change, a schedule.

::widget Stepper {"type":"flow","cols":3,"title":"What happens when a function is invoked","what":"The lifecycle of a function invocation on a platform like AWS Lambda, including the difference between a cold start and a warm start.","steps":["Press Play and follow the first (cold) invocation.","Notice which steps are skipped when an instance is already warm.","Find what happens when 1,000 events arrive at once."],"nodes":[["Event arrives","An HTTP request, an S3 upload, an SQS message or a schedule triggers the function."],["Find a warm instance?","If an idle, already-initialized instance of this function exists, the event goes straight to it — a warm start, adding only milliseconds."],["Cold start: create a sandbox","Otherwise the platform starts a new lightweight VM (Firecracker microVMs on Lambda — OS track, chapter 13) and loads your code package or container image."],["Cold start: initialize","The runtime starts (Node, Python, JVM…) and your initialization code runs: importing libraries, creating database clients. Can take from ~100 ms to several seconds."],["Run the handler","Your function processes this one event. Each instance handles one event at a time (on Lambda); more concurrent events → more instances."],["Freeze and reuse","After returning, the instance is kept warm for a while for future events, then eventually discarded. You can't rely on it staying around."]]}

```python
# A Lambda function triggered by S3 uploads
import boto3
s3 = boto3.client("s3")              # created once per instance, reused across warm invocations

def handler(event, context):
    for record in event["Records"]:
        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]
        image = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
        thumb = make_thumbnail(image)
        s3.put_object(Bucket=bucket, Key=f"thumbs/{key}", Body=thumb)
```

> [!ANALOGY] A taxi rank versus owning a car. With servers, you own a fleet of cars sitting in the car park whether or not anyone needs a ride. With serverless, you call a taxi only when needed and pay per trip. If no taxi is waiting at the rank, there's a short wait while one arrives — that's the **cold start**.

## Cold starts and how to tame them

Cold-start latency depends on the runtime, package size and initialization work:

- **Keep packages small** and import only what you need; lazy-load rarely used libraries.
- **Choose fast-starting runtimes** (Node, Python, Go, Rust start fast; JVM and .NET are slower — use SnapStart / AOT compilation / native images).
- Do expensive setup (clients, config) **outside** the handler so warm invocations reuse it.
- **Provisioned concurrency** (Lambda) or **minimum instances** (Cloud Run) keep some instances warm — at a cost.
- For user-facing latency-critical paths, consider edge functions (Cloudflare Workers use V8 isolates that start in milliseconds) or containers.

## Scaling and concurrency limits

Serverless scales out automatically, but not infinitely:

- Accounts have **concurrency limits** (e.g. 1,000 concurrent Lambda executions by default per region, raisable), and burst rates for how fast new instances can start.
- A function scaling to 1,000 instances can **overwhelm downstream systems**: 1,000 instances each opening database connections can exhaust PostgreSQL's connection limit. Use connection poolers (RDS Proxy, PgBouncer), HTTP-based databases, or reserved concurrency to cap a function.
- **Timeouts:** functions have maximum durations (15 minutes on Lambda). Long jobs need splitting, queues or workflows.

## State: functions should be stateless

Instances come and go, and two consecutive requests from one user may hit different instances. Keep state outside:

- Durable data in databases and object storage.
- Sessions and caches in Redis/DynamoDB.
- Temporary local disk (`/tmp`) and memory only as a per-instance cache.

## Event-driven architecture

Serverless shines when systems are built from **events**: "an order was placed" triggers billing, emails, analytics and inventory updates independently.

::widget Architecture {"title":"An event-driven serverless order pipeline","what":"An order flows through managed services and functions connected by events. No servers are managed; each piece scales independently and failed events land in a dead-letter queue.","steps":["Follow an order from the API to the event bus.","Click each function to see what it reacts to.","Find where failed events go, and why idempotency matters."],"nodes":[{"id":"client","label":"Web / mobile app","kind":"client","col":0,"row":1,"desc":"Calls the HTTP API."},{"id":"api","label":"API Gateway","kind":"gateway","col":1,"row":1,"desc":"Managed HTTP front door: auth, throttling, routing to functions."},{"id":"create","label":"createOrder function","kind":"worker","col":2,"row":1,"desc":"Validates and writes the order to DynamoDB with an idempotency key, then returns 201 immediately."},{"id":"db","label":"DynamoDB (orders)","kind":"db","col":3,"row":1,"desc":"Serverless key-value database. Its change stream emits an event for every new order."},{"id":"bus","label":"Event bus (EventBridge)","kind":"queue","col":3,"row":0,"desc":"Routes 'OrderPlaced' events to every interested consumer by rules."},{"id":"email","label":"sendConfirmation function","kind":"worker","col":4,"row":0,"desc":"Sends the confirmation email. Must be idempotent: events can be delivered more than once."},{"id":"wf","label":"Fulfilment workflow (Step Functions)","kind":"service","col":4,"row":1,"desc":"Orchestrates payment capture, inventory reservation and shipping with retries, timeouts and compensation (a saga — System Design chapter 11)."},{"id":"dlq","label":"Dead-letter queue","kind":"queue","col":4,"row":2,"desc":"Events that keep failing after retries end up here for inspection and replay, instead of being lost."},{"id":"s3","label":"Analytics (S3 + Athena)","kind":"storage","col":3,"row":2,"desc":"Events archived to object storage and queried with serverless SQL."}],"edges":[["client","api","POST /orders"],["api","create","invoke"],["create","db","put"],["db","bus","stream",true],["bus","email","OrderPlaced",true],["bus","wf","OrderPlaced",true],["bus","s3","archive",true],["email","dlq","failures",true]]}

Principles:

- **At-least-once delivery** is the norm: functions may receive the same event twice. Make handlers **idempotent** (dedupe by event ID).
- Configure **retries and dead-letter queues** so poison messages don't block or vanish.
- Use **workflows** (AWS Step Functions, Google Workflows, Temporal) for multi-step processes with retries, waits and compensation, rather than chaining functions that call functions.

## The cost model

You pay per request and per unit of compute time (memory × duration), often with a free tier.

- **Spiky or low traffic:** serverless is usually far cheaper — you pay nothing when idle.
- **Steady high traffic:** a busy function running constantly can cost several times more than containers or VMs doing the same work, especially with commitments or spot pricing (chapter 12).
- Watch hidden costs: API gateway per-request fees, NAT gateways for functions in a VPC, logging volume, and data transfer.

> [!EXAMPLE] **Prime Video's monitoring service (2023).** Amazon's Prime Video team described a video-quality monitoring tool built from serverless functions and Step Functions that passed large amounts of data between steps through S3. At their scale, the per-step orchestration and data transfer costs dominated. Moving it into a single long-running container service cut the cost by about 90%. It's not a story against serverless — it's a reminder to match the model to the workload's shape.

## When to use serverless

**Great fits:** event processing (uploads, webhooks, queue consumers), scheduled jobs, glue between managed services, APIs with spiky or low traffic, prototypes, and per-tenant or per-request isolation.

**Poor fits:** long-running or steady high-throughput workloads, very latency-sensitive paths that can't tolerate cold starts, workloads needing special hardware or long-lived connections, and applications whose many tiny functions become hard to test and trace.

**Middle ground:** **serverless containers** (Cloud Run, AWS Fargate, Azure Container Apps) — run any container, scale to zero, handle many concurrent requests per instance, fewer limits.

## Developing and operating serverless

- **Infrastructure as code** is essential (SAM, Serverless Framework, CDK, Terraform) — dozens of functions, triggers and permissions can't be managed by clicking.
- **Least-privilege IAM role per function.**
- **Observability:** structured logs, tracing across functions and queues (X-Ray / OpenTelemetry), and metrics on errors, throttles, duration and concurrency.
- **Local testing** with emulators is imperfect; test against real cloud resources in isolated environments too.

> [!RECAP]
> - Serverless = the platform manages servers, scaling (to zero) and patching; you pay per use. Functions run on **events**.
> - **Cold starts** happen when a new instance must start; reduce with small packages, fast runtimes, init outside the handler, provisioned concurrency.
> - Mind **concurrency limits**, **downstream connection exhaustion** and **timeouts**; keep functions **stateless**.
> - Build **event-driven** systems with idempotent handlers, retries, dead-letter queues and **workflows** for multi-step processes.
> - Cheap for spiky/low traffic, expensive for steady high load; serverless containers are a flexible middle ground.

> [!INTERVIEW] Expect "serverless vs containers for this workload?", how to handle cold starts, how a burst of function instances can overload a database, why handlers must be idempotent, and how to design an event-driven pipeline with retries and dead-letter queues.

::quiz {"q":"What causes a cold start?","options":["A slow database","No warm instance is available, so the platform must create a sandbox, load code and run initialization","Low memory settings only","Network congestion"],"answer":1,"explain":"Warm instances skip all of that."}

::quiz {"q":"A function scales to 1,000 instances and the database starts refusing connections. Best fix?","options":["Increase function memory","Use a connection pooler/proxy or cap the function's concurrency","Add more indexes","Use a bigger region"],"answer":1,"explain":"Each instance opening its own connections exhausts the database."}

::quiz {"q":"Why must serverless event handlers be idempotent?","options":["For performance","Events are typically delivered at least once, so the same event may be processed twice","It's required syntax","To reduce cold starts"],"answer":1,"explain":"Deduplicate by event ID."}
