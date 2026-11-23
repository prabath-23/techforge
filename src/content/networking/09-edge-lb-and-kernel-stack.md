---
title: Load Balancers, CDNs and the Full Journey of a Web Request
summary: How big websites spread millions of users across thousands of servers, how CDNs put content a few kilometers from you, what happens to a packet inside the receiving server's operating system — and finally, the complete answer to the most famous systems interview question, "what happens when you type a URL and press Enter?"
---

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
- **Least connections**: send to whichever server has the fewest active connections — better when some requests take much longer than others.
- **Power of two choices**: pick two servers at random and send to the less busy one. Surprisingly, this is nearly as good as checking every server, at a fraction of the cost. Envoy and many others use it.
- **Hashing**: send the same user (or the same key) to the same server every time — useful when servers keep per-user caches. **Consistent hashing** keeps most assignments the same when servers are added or removed (System Design track).

> [!EXAMPLE] **Google's front door.** Google's Maglev load balancers run as ordinary software on commodity servers. The network spreads incoming packets across many Maglev machines, and each uses the same consistent-hashing table, so whichever Maglev receives a packet, it sends it to the same backend. A Maglev machine can fail and the others carry on without breaking connections.

## Reverse proxies and API gateways

A **reverse proxy** sits in front of your servers and handles chores so your application doesn't have to: decrypting HTTPS (chapter 7), compressing responses, caching, protecting slow servers from slow clients, and routing by URL. nginx is the classic example.

An **API gateway** is a reverse proxy specialized for APIs: checking API keys and login tokens, enforcing rate limits and quotas, and routing to the right microservice. Inside large companies, a **service mesh** puts a small proxy next to every service, so all service-to-service traffic gets encryption, retries and monitoring automatically (Cloud track).

## CDNs: bringing content close to users

No load balancer can beat the speed of light (chapter 1). If your servers are in Virginia and your user is in Chennai, every round trip costs about 250 ms. The answer is to have copies of your content **near every user**.

A **CDN** (content delivery network) — like Cloudflare, Akamai, Amazon CloudFront or Fastly — runs servers in hundreds of cities worldwide, called **points of presence (PoPs)**. Users are sent to the nearest one, which serves cached copies of images, videos, scripts and even whole pages. Only when it doesn't have something does it fetch it from your **origin** servers.

> [!ANALOGY] A CDN is like a supermarket chain's regional warehouses. Instead of every shop ordering from the one central factory across the country, each region keeps popular items in stock nearby. Only rare items come from the factory.

How users reach the nearest PoP:

- **Anycast** (chapter 2): every PoP announces the same IP address, and internet routing naturally delivers each user to the closest one. Cloudflare works this way.
- **DNS-based** (chapter 6): the CDN's DNS answers with the address of a PoP near whoever is asking.

CDNs do far more than caching today: they end the encrypted TLS connection close to you (saving round trips), absorb huge **DDoS attacks** across their global capacity, filter malicious requests (web application firewalls), resize images on the fly, and even run your code at the edge.

> [!EXAMPLE] **Netflix** takes this to the extreme with **Open Connect**: it places its own servers, packed with popular shows, **inside internet providers' buildings** around the world, and pre-loads them overnight with what people in that area are likely to watch tomorrow. When you press play, the video often travels only a few kilometers. This is a big part of how Netflix streams to hundreds of millions of people without clogging the internet.

## Inside the receiving server

Let's follow a packet that has made it all the way to a web server, through the operating system (the OS track meets the Networking track here):

::widget Stepper {"type":"layers","title":"A packet's journey inside the receiving server","what":"Each band is one step inside the server, from the network card up to the web server program.","steps":["Press Play to follow the packet upward.","Spot where DMA, interrupts and epoll from the OS track appear.","Notice the very last step is the first time the application is involved."],"nodes":[["Network card","Checks the frame wasn't damaged, picks one of many receive queues (based on the connection, so each connection always lands on the same CPU core), and copies the packet straight into memory with DMA. Then it raises an interrupt."],["Driver","The interrupt handler does the minimum and schedules the rest. The driver then collects a batch of packets from memory — much more efficient than handling them one at a time."],["IP layer + firewall rules","Checks the packet is for this machine, applies firewall rules (and, on Kubernetes nodes, the rules that route traffic to the right container), and hands it to TCP."],["TCP","Finds the connection the packet belongs to, checks sequence numbers, puts data in order, sends acknowledgments, and adds the data to that connection's receive buffer."],["Socket","Marks the connection as readable, which wakes up the web server's event loop sleeping in epoll (OS track)."],["Web server program","Reads the bytes, parses the HTTP request, and finally your application code runs."]]}

## The big one: what happens when you type a URL and press Enter?

This is the most famous systems interview question, and you now know enough to answer it end to end. Say you type `https://www.example.com` and press Enter:

1. **The browser checks itself first.** Is this a search or a URL? Is the site on the built-in list that must always use HTTPS? Is a fresh copy of the page in the browser's cache?
2. **DNS (chapter 6).** Find the IP address: browser cache → operating system cache → your resolver → root → `.com` → `example.com`'s own name servers. The answer might be the address of a nearby CDN location.
3. **Getting off your local network (chapters 1–2).** The address isn't on your local network, so your computer sends the packet to your router, using ARP to learn the router's MAC address. Your router's NAT swaps your private address for its public one.
4. **Connecting (chapters 4–5).** A TCP three-way handshake — or, if the browser knows the site supports HTTP/3, a QUIC handshake that combines steps 4 and 5.
5. **Encryption (chapter 7).** The TLS handshake: exchange key values, receive and verify the certificate, derive the shared secret. Everything after this is encrypted.
6. **Across the internet (chapters 2–3).** Packets hop router to router along paths chosen by BGP — MAC addresses changing at every hop, IP addresses staying the same — very likely arriving at a CDN location in your own city.
7. **At the CDN (this chapter).** If it has a fresh copy of what you asked for, it answers right away. If not, it forwards the request to the website's origin.
8. **At the origin.** A Layer 4 load balancer, then a Layer 7 proxy, picks a healthy application server. Inside that server, the packet climbs through the network card, driver, IP, TCP and socket, and the event loop wakes up.
9. **The application does its work.** It checks a cache (like Redis), queries a database, maybe calls other internal services, and builds the HTML or JSON response.
10. **The response travels back**, getting cached by the CDN if the headers allow it.
11. **The browser renders the page.** It parses the HTML, discovers CSS, JavaScript, images and fonts, requests them (over the same HTTP/2 or HTTP/3 connection), lays out the page and paints it on screen.
12. **Afterwards**, the connection stays open for the next click, and the TLS session can be resumed quickly next time.

> [!INTERVIEW] This question can fill an entire interview. Interviewers let you give the overview, then dive into whichever step they care about: DNS caching, certificate verification, TCP congestion control, how the load balancer chooses a server, or how the browser renders. Being able to explain the whole path, and zoom into any step, is exactly what "technically strong" looks like.

> [!RECAP]
> - **Load balancers** spread traffic across many servers, run health checks and allow zero-downtime updates; **Layer 4** works on connections, **Layer 7** understands HTTP requests.
> - Selection strategies: round robin, least connections, **power of two choices**, (consistent) hashing.
> - **Reverse proxies**, **API gateways** and **service meshes** handle encryption, routing, limits and retries.
> - **CDNs** cache content in hundreds of cities, reached by **anycast** or DNS; Netflix even places servers inside internet providers.
> - Inside a server, a packet climbs NIC → driver → IP → TCP → socket → application.
> - You can now answer "what happens when you type a URL?" from start to finish.

::quiz {"q":"Which kind of load balancer can send /api/* and /images/* to different server groups?","options":["Layer 4","Layer 7","DNS round robin","ARP"],"answer":1,"explain":"Only a Layer 7 balancer reads the HTTP request path."}

::quiz {"q":"How does an anycast CDN send you to its nearest location?","options":["Your browser measures every location","The same IP address is announced from many locations, and internet routing picks the closest","It redirects with HTTP 302","It asks your router"],"answer":1,"explain":"BGP path selection naturally chooses the nearest announcement."}

::quiz {"q":"Why does Netflix place its own servers inside internet providers' buildings?","options":["To avoid paying for electricity","So videos travel only a short distance, making playback faster and reducing traffic across the wider internet","For legal reasons","To store user passwords"],"answer":1,"explain":"Content close to users means lower latency and far less long-distance traffic."}
