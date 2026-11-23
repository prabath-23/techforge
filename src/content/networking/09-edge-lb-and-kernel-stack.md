---
title: Load Balancers, CDNs and the Full Journey of a Web Request
summary: How big websites spread millions of users across thousands of servers, how CDNs put content a few kilometers from you, what happens to a packet inside the receiving server's operating system, and finally, the complete answer to the most famous systems interview question, "what happens when you type a URL and press Enter?"
---

::widget Scene {"title": "A request through the edge: CDN, load balancer, server", "sub": "from a user in Chennai to one of 40 servers", "nodes": [{"id": "u", "kind": "phone", "label": "User (Chennai)", "x": 3.72, "y": 3.72}, {"id": "cdn", "kind": "cloud", "label": "CDN edge (Chennai)", "x": 7.72, "y": -0.28, "color": "green"}, {"id": "lb", "kind": "router", "label": "Load balancer", "x": 11.72, "y": -4.28, "color": "blue"}, {"id": "s1", "kind": "server", "label": "App 1", "x": 12.0, "y": -12.0, "color": "purple"}, {"id": "s2", "kind": "server", "label": "App 2", "x": 15.72, "y": -8.28, "color": "purple"}, {"id": "s3", "kind": "server", "label": "App 3", "x": 19.44, "y": -4.56, "color": "purple"}, {"id": "org", "kind": "disk", "label": "Origin storage", "x": 5.83, "y": -10.17, "color": "teal"}], "links": [["u", "cdn"], ["cdn", "lb"], ["lb", "s1"], ["lb", "s2"], ["lb", "s3"], ["cdn", "org", {"dashed": true}]], "metrics": [["req", "Request"], ["where", "Served by"], ["lat", "Latency"]], "steps": [{"short": "DNS", "tag": "Routing", "title": "DNS (or anycast) sends the user to the nearest edge", "body": "<p>The same IP is announced from 300 cities; BGP delivers you to the closest.</p>", "show": ["u", "cdn"], "flow": [["u", "cdn", "#3b82f6", "hello"]], "metrics": {"req": ["-"], "where": ["-"], "lat": ["-"]}}, {"short": "TLS", "tag": "Edge", "title": "TLS ends at the edge, 5 ms away", "body": "<p>The handshake round trips are short. The edge keeps warm connections back to the origin.</p>", "set": {"cdn": {"badge": "TLS here"}}, "metrics": {"lat": ["5 ms RTT", "good"]}}, {"short": "Static", "tag": "Cache hit", "title": "GET /logo.png: cached at the edge", "body": "<p>Served directly. Never touches your servers.</p>", "flow": [["cdn", "u", "#22c55e", "logo.png (hit)"]], "metrics": {"req": ["/logo.png"], "where": ["edge cache", "good"], "lat": ["8 ms"]}}, {"short": "Miss", "tag": "Cache miss", "title": "GET /video-thumb-912.jpg: not cached yet", "body": "<p>The edge fetches it from origin storage once, then caches it per its Cache-Control headers.</p>", "show": ["u", "cdn", "org"], "flow": [["cdn", "org", "#f59e0b", "miss → fetch"], ["cdn", "u", "#22c55e", ""]], "metrics": {"req": ["/thumb.jpg"], "where": ["origin, then cached"]}}, {"short": "API", "tag": "Dynamic", "title": "GET /api/feed: personal, can't be cached", "body": "<p>Forwarded to the load balancer over the edge's warm connection.</p>", "show": ["u", "cdn", "org", "lb"], "flow": [["cdn", "lb", "#3b82f6", "/api/feed"]], "metrics": {"req": ["/api/feed"], "where": ["app servers"]}}, {"short": "L4L7", "tag": "LB", "title": "Layer 7 load balancer reads the HTTP request", "body": "<p>It can route by path (/api → API pool), header or cookie. A layer 4 balancer only sees IPs and ports, faster but blind.</p>", "show": ["u", "cdn", "org", "lb", "s1", "s2", "s3"], "set": {"lb": {"badge": "L7: /api → pool"}}}, {"short": "Algo", "tag": "LB", "title": "Pick a server: least outstanding requests", "body": "<p>Round robin ignores that some requests are slow. Least-connections or \"power of two choices\" spreads load better.</p>", "set": {"s1": {"badge": "12 active"}, "s2": {"badge": "3 active"}, "s3": {"badge": "9 active"}}, "flow": [["lb", "s2", "#22c55e", "to App 2"]]}, {"short": "Health", "tag": "Health", "title": "App 3 fails its health checks", "body": "<p>The LB stops sending it traffic within seconds. Users never notice.</p>", "set": {"s3": {"dim": true, "badge": "unhealthy"}}}, {"short": "Drain", "tag": "Deploys", "title": "Deploying App 1: drain first", "body": "<p>Stop new requests, let in-flight ones finish, then restart. Zero dropped requests.</p>", "set": {"s1": {"badge": "draining"}}}, {"short": "Kernel", "tag": "Host", "title": "On the server, the kernel accepts the connection", "body": "<p>NIC → interrupt → TCP stack → accept queue → your process. Under heavy load, tune backlog and use SO_REUSEPORT to spread across workers.</p>", "note": {"kind": "key", "text": "Edge: nearby TLS + caching static content. LB: L4 vs L7, smart algorithms, health checks, draining. Server: kernel queues feed your app."}}]}

::widget Scene {"title": "Load balancers spread traffic and route around failures", "sub": "one address, many servers", "nodes": [{"id": "u", "kind": "user", "label": "Users", "x": 3.1, "y": 3.1}, {"id": "lb", "kind": "router", "label": "Load balancer", "x": 7.1, "y": -0.9, "color": "teal"}, {"id": "s1", "kind": "server", "label": "web-1", "x": 7.38, "y": -8.62, "color": "blue"}, {"id": "s2", "kind": "server", "label": "web-2", "x": 11.1, "y": -4.9, "color": "blue"}, {"id": "s3", "kind": "server", "label": "web-3", "x": 14.82, "y": -1.18, "color": "blue"}], "links": [["u", "lb"], ["lb", "s1"], ["lb", "s2"], ["lb", "s3"]], "metrics": [["alg", "Algorithm"], ["healthy", "Healthy servers"]], "steps": [{"short": "Spread", "tag": "Balance", "title": "Requests are spread across three servers", "body": "<p>Users see one address; the balancer picks a server for each request (round robin, least connections…).</p>", "flow": [["lb", "s1", "#3b82f6", ""], ["lb", "s2", "#3b82f6", ""], ["lb", "s3", "#3b82f6", ""]], "metrics": {"alg": ["least connections"], "healthy": ["3"]}}, {"short": "Health check", "tag": "Detect", "title": "web-2 stops answering health checks", "body": "<p>The balancer pings <code>/health</code> every few seconds. After a few failures it marks web-2 down.</p>", "set": {"s2": {"dim": true, "badge": "down"}}, "metrics": {"healthy": ["2", "bad"]}}, {"short": "Route around", "tag": "Recover", "title": "Traffic flows only to healthy servers", "body": "<p>Users never notice. When web-2 recovers, it's added back. Add web-4 during a sale and capacity grows instantly.</p>", "flow": [["lb", "s1", "#3b82f6", ""], ["lb", "s3", "#3b82f6", ""]], "note": {"kind": "key", "text": "Layer-4 balancers route TCP connections; layer-7 balancers read HTTP and can route by path, header or cookie."}}]}

::widget Scene {"title": "CDNs: serving files from around the corner", "sub": "a video for a viewer in Chennai", "nodes": [{"id": "u", "kind": "phone", "label": "Viewer in Chennai", "x": 3.1, "y": 3.1}, {"id": "edge", "kind": "server", "label": "CDN edge in Chennai", "x": 7.1, "y": -0.9, "color": "teal"}, {"id": "o", "kind": "server", "label": "Origin in Virginia", "x": 12.1, "y": -5.9, "color": "purple"}], "links": [["u", "edge", {"both": true}], ["edge", "o", {"both": true, "dashed": true}]], "metrics": [["lat", "Round trip"], ["hit", "Cache"]], "steps": [{"short": "Far", "tag": "Problem", "title": "Virginia is ~250 ms away from Chennai", "body": "<p>Every round trip across the world adds a quarter second.</p>", "show": ["u", "o"], "metrics": {"lat": ["250 ms", "bad"], "hit": ["-"]}}, {"short": "Miss", "tag": "Miss", "title": "First viewer: the edge fetches it from the origin once", "body": "<p>The nearby edge server doesn't have the file yet, so it fetches and keeps a copy.</p>", "show": ["u", "edge", "o"], "flow": [["u", "edge", "#3b82f6", "GET"], ["edge", "o", "#a855f7", "miss → fetch"]], "metrics": {"hit": ["miss"]}}, {"short": "Hit", "tag": "Hit", "title": "Everyone else in Chennai gets it in ~10 ms", "body": "<p>Cache hits never touch the origin, which also protects it from traffic spikes.</p>", "flow": [["edge", "u", "#22c55e", "from cache"]], "set": {"o": {"dim": true}}, "metrics": {"lat": ["10 ms", "good"], "hit": ["hit", "good"]}, "note": {"kind": "key", "text": "CDNs (Cloudflare, Akamai, CloudFront) also absorb DDoS attacks and terminate TLS close to users."}}]}







## One server is never enough

A single server can handle maybe tens of thousands of requests per second. A popular website gets millions. And a single server is a single point of failure: when it reboots for an update, the site goes down.

So big websites run **many identical servers** and put something in front of them that spreads the traffic. That something is a **load balancer**. And to make the site fast worldwide, they copy content to servers close to users: a **CDN**. This chapter covers both, then puts everything from this track together.

## Load balancers

> [!ANALOGY] A load balancer is the host at the entrance of a huge restaurant with 50 waiters. Guests don't pick a waiter; the host assigns each new table to a waiter who isn't overloaded, and stops seating guests in a section whose waiter has gone home sick. Guests only ever see the front door.

Clients connect to one address (the load balancer), and it forwards each connection or request to one of many **backend** servers. It also:

- runs **health checks** ("are you OK?" every few seconds) and stops sending traffic to servers that fail them,
- lets you add or remove servers without users noticing,
- lets you **drain** a server before an update: stop sending it new requests, let current ones finish, then restart it.

### Layer 4 vs Layer 7

Load balancers come in two flavors, named after the layers in chapter 1:

| | Layer 4 (transport) | Layer 7 (application) |
|---|---|---|
| Looks at | IP addresses and ports only | The full HTTP request: URL path, headers, cookies |
| Decides | Per connection | Per request |
| Can do | Very high speeds, any protocol | Send `/api/*` to API servers and `/images/*` to image servers; add headers; retry; check logins; rate-limit |
| Examples | AWS Network Load Balancer, Google Maglev | AWS Application Load Balancer, nginx, HAProxy, Envoy |

Many systems use both: a Layer 4 balancer spreading raw traffic across a fleet of Layer 7 proxies, which then route individual requests.

### How a load balancer picks a server

- **Round robin**: take turns. Simple, but blind to load.
- **Least connections**: send to whichever server has the fewest active connections, better when some requests take much longer than others.
- **Power of two choices**: pick two servers at random and send to the less busy one. Surprisingly, this is nearly as good as checking every server, at a fraction of the cost. Envoy and many others use it.
- **Hashing**: send the same user (or the same key) to the same server every time, useful when servers keep per-user caches. **Consistent hashing** keeps most assignments the same when servers are added or removed (System Design track).

> [!EXAMPLE] **Google's front door.** Google's Maglev load balancers run as ordinary software on commodity servers. The network spreads incoming packets across many Maglev machines, and each uses the same consistent-hashing table, so whichever Maglev receives a packet, it sends it to the same backend. A Maglev machine can fail and the others carry on without breaking connections.

## Reverse proxies and API gateways

A **reverse proxy** sits in front of your servers and handles chores so your application doesn't have to: decrypting HTTPS (chapter 7), compressing responses, caching, protecting slow servers from slow clients, and routing by URL. nginx is the classic example.

An **API gateway** is a reverse proxy specialized for APIs: checking API keys and login tokens, enforcing rate limits and quotas, and routing to the right microservice. Inside large companies, a **service mesh** puts a small proxy next to every service, so all service-to-service traffic gets encryption, retries and monitoring automatically (Cloud track).

## CDNs: bringing content close to users

No load balancer can beat the speed of light (chapter 1). If your servers are in Virginia and your user is in Chennai, every round trip costs about 250 ms. The answer is to have copies of your content **near every user**.

A **CDN** (content delivery network), like Cloudflare, Akamai, Amazon CloudFront or Fastly, runs servers in hundreds of cities worldwide, called **points of presence (PoPs)**. Users are sent to the nearest one, which serves cached copies of images, videos, scripts and even whole pages. Only when it doesn't have something does it fetch it from your **origin** servers.

> [!ANALOGY] A CDN is like a supermarket chain's regional warehouses. Instead of every shop ordering from the one central factory across the country, each region keeps popular items in stock nearby. Only rare items come from the factory.

How users reach the nearest PoP:

- **Anycast** (chapter 2): every PoP announces the same IP address, and internet routing naturally delivers each user to the closest one. Cloudflare works this way.
- **DNS-based** (chapter 6): the CDN's DNS answers with the address of a PoP near whoever is asking.

CDNs do far more than caching today: they end the encrypted TLS connection close to you (saving round trips), absorb huge **DDoS attacks** across their global capacity, filter malicious requests (web application firewalls), resize images on the fly, and even run your code at the edge.

> [!EXAMPLE] **Netflix** takes this to the extreme with **Open Connect**: it places its own servers, packed with popular shows, **inside internet providers' buildings** around the world, and pre-loads them overnight with what people in that area are likely to watch tomorrow. When you press play, the video often travels only a few kilometers. This is a big part of how Netflix streams to hundreds of millions of people without clogging the internet.

## Inside the receiving server

Let's follow a packet that has made it all the way to a web server, through the operating system (the OS track meets the Networking track here):

::widget Stepper {"type":"layers","title":"A packet's journey inside the receiving server","what":"Each band is one step inside the server, from the network card up to the web server program.","steps":["Press Play to follow the packet upward.","Spot where DMA, interrupts and epoll from the OS track appear.","Notice the very last step is the first time the application is involved."],"nodes":[["Network card","Checks the frame wasn't damaged, picks one of many receive queues (based on the connection, so each connection always lands on the same CPU core), and copies the packet straight into memory with DMA. Then it raises an interrupt."],["Driver","The interrupt handler does the minimum and schedules the rest. The driver then collects a batch of packets from memory, much more efficient than handling them one at a time."],["IP layer + firewall rules","Checks the packet is for this machine, applies firewall rules (and, on Kubernetes nodes, the rules that route traffic to the right container), and hands it to TCP."],["TCP","Finds the connection the packet belongs to, checks sequence numbers, puts data in order, sends acknowledgments, and adds the data to that connection's receive buffer."],["Socket","Marks the connection as readable, which wakes up the web server's event loop sleeping in epoll (OS track)."],["Web server program","Reads the bytes, parses the HTTP request, and finally your application code runs."]]}

## The big one: what happens when you type a URL and press Enter?

This is the most famous systems interview question, and you now know enough to answer it end to end. Say you type `https://www.example.com` and press Enter:

1. **The browser checks itself first.** Is this a search or a URL? Is the site on the built-in list that must always use HTTPS? Is a fresh copy of the page in the browser's cache?
2. **DNS (chapter 6).** Find the IP address: browser cache → operating system cache → your resolver → root → `.com` → `example.com`'s own name servers. The answer might be the address of a nearby CDN location.
3. **Getting off your local network (chapters 1–2).** The address isn't on your local network, so your computer sends the packet to your router, using ARP to learn the router's MAC address. Your router's NAT swaps your private address for its public one.
4. **Connecting (chapters 4–5).** A TCP three-way handshake, or, if the browser knows the site supports HTTP/3, a QUIC handshake that combines steps 4 and 5.
5. **Encryption (chapter 7).** The TLS handshake: exchange key values, receive and verify the certificate, derive the shared secret. Everything after this is encrypted.
6. **Across the internet (chapters 2–3).** Packets hop router to router along paths chosen by BGP, MAC addresses changing at every hop, IP addresses staying the same, very likely arriving at a CDN location in your own city.
7. **At the CDN (this chapter).** If it has a fresh copy of what you asked for, it answers right away. If not, it forwards the request to the website's origin.
8. **At the origin.** A Layer 4 load balancer, then a Layer 7 proxy, picks a healthy application server. Inside that server, the packet climbs through the network card, driver, IP, TCP and socket, and the event loop wakes up.
9. **The application does its work.** It checks a cache (like Redis), queries a database, maybe calls other internal services, and builds the HTML or JSON response.
10. **The response travels back** getting cached by the CDN if the headers allow it.
11. **The browser renders the page.** It parses the HTML, discovers CSS, JavaScript, images and fonts, requests them (over the same HTTP/2 or HTTP/3 connection), lays out the page and paints it on screen.
12. **Afterwards** the connection stays open for the next click, and the TLS session can be resumed quickly next time.

> [!INTERVIEW] This question can fill an entire interview. Interviewers let you give the overview, then dive into whichever step they care about: DNS caching, certificate verification, TCP congestion control, how the load balancer chooses a server, or how the browser renders. Being able to explain the whole path, and zoom into any step, is exactly what "technically strong" looks like.

> [!RECAP]
> - **Load balancers** spread traffic across many servers, run health checks and allow zero-downtime updates; **Layer 4** works on connections, **Layer 7** understands HTTP requests.
> - Selection strategies: round robin, least connections, **power of two choices** (consistent) hashing.
> - **Reverse proxies** **API gateways** and **service meshes** handle encryption, routing, limits and retries.
> - **CDNs** cache content in hundreds of cities, reached by **anycast** or DNS; Netflix even places servers inside internet providers.
> - Inside a server, a packet climbs NIC → driver → IP → TCP → socket → application.
> - You can now answer "what happens when you type a URL?" from start to finish.

::quiz {"q":"Which kind of load balancer can send /api/* and /images/* to different server groups?","options":["Layer 4","Layer 7","DNS round robin","ARP"],"answer":1,"explain":"Only a Layer 7 balancer reads the HTTP request path."}

::quiz {"q":"How does an anycast CDN send you to its nearest location?","options":["Your browser measures every location","The same IP address is announced from many locations, and internet routing picks the closest","It redirects with HTTP 302","It asks your router"],"answer":1,"explain":"BGP path selection naturally chooses the nearest announcement."}

::quiz {"q":"Why does Netflix place its own servers inside internet providers' buildings?","options":["To avoid paying for electricity","So videos travel only a short distance, making playback faster and reducing traffic across the wider internet","For legal reasons","To store user passwords"],"answer":1,"explain":"Content close to users means lower latency and far less long-distance traffic."}
