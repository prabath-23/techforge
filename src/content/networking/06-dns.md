---
title: DNS: The Internet's Phone Book
summary: How typing "google.com" turns into a numeric address in a few milliseconds, the hierarchy of name servers, the step-by-step lookup, caching and why changes take time to spread, the different record types, how companies use DNS to send you to the nearest server, and why "it's always DNS" is an engineering joke.
---

::widget Scene {"title": "A DNS lookup for www.example.com", "sub": "reading the name from right to left", "nodes": [{"id": "pc", "kind": "laptop", "label": "Your laptop", "x": 4.65, "y": 4.65}, {"id": "res", "kind": "server", "label": "Recursive resolver", "x": 8.25, "y": 1.05, "color": "blue"}, {"id": "root", "kind": "server", "label": "Root server", "x": 7.6, "y": -7.6, "color": "dark"}, {"id": "tld", "kind": "server", "label": ".com server", "x": 13.36, "y": -3.44, "color": "purple"}, {"id": "auth", "kind": "server", "label": "example.com NS", "x": 17.52, "y": 2.32, "color": "green"}], "links": [["pc", "res", {"both": true}], ["res", "root", {"both": true, "dashed": true}], ["res", "tld", {"both": true, "dashed": true}], ["res", "auth", {"both": true, "dashed": true}]], "metrics": [["ask", "Question"], ["ans", "Answer"], ["cache", "Resolver cache"]], "steps": [{"short": "Ask resolver", "tag": "Query", "title": "Your laptop asks its resolver", "body": "<p>Your laptop doesn't know the internet's directory. It asks one <b>recursive resolver</b> (your ISP's, or 1.1.1.1 / 8.8.8.8) to do all the work: \"What is the IP of <code>www.example.com</code>?\"</p>", "show": ["pc", "res"], "flow": [["pc", "res", "#3b82f6", "A? www.example.com"]], "metrics": {"ask": ["www.example.com"], "ans": ["?"], "cache": ["empty"]}}, {"short": "Root", "tag": "Iterate", "title": "Resolver → root: \"who handles .com?\"", "body": "<p>The resolver starts at the top. There are 13 named root server addresses (served by hundreds of machines via anycast). The root doesn't know the answer, but it knows who runs <code>.com</code>.</p>", "show": ["pc", "res", "root"], "flow": [["res", "root", "#3b82f6", "www.example.com?"], ["root", "res", "#a855f7", "ask .com servers"]]}, {"short": ".com", "tag": "Iterate", "title": "Resolver → .com: \"who handles example.com?\"", "body": "<p>The <code>.com</code> servers (run by Verisign) also don't know the address, but they know which name servers are <b>authoritative</b> for example.com.</p>", "show": ["pc", "res", "root", "tld"], "flow": [["res", "tld", "#3b82f6", "www.example.com?"], ["tld", "res", "#a855f7", "ask ns1.example.com"]]}, {"short": "Authoritative", "tag": "Answer", "title": "Resolver → example.com's server: the real answer", "body": "<p>The authoritative server owns the records for this domain and answers definitively: <code>www.example.com A 93.184.215.14, TTL 3600</code>.</p>", "show": ["pc", "res", "root", "tld", "auth"], "flow": [["res", "auth", "#3b82f6", "www.example.com?"], ["auth", "res", "#22c55e", "A 93.184.215.14"]], "metrics": {"ans": ["93.184.215.14", "good"]}}, {"short": "Reply + cache", "tag": "Cache", "title": "The resolver replies and caches everything", "body": "<p>The resolver hands the answer to your laptop and <b>caches</b> it, and the root and .com referrals, for their TTLs.</p>", "flow": [["res", "pc", "#22c55e", "A 93.184.215.14"]], "set": {"res": {"badge": "cached 1h"}}, "metrics": {"cache": ["3 entries", "good"]}}, {"short": "Next visitor", "tag": "Fast path", "title": "The next person gets the answer instantly", "body": "<p>When anyone else using this resolver asks within the hour, it answers from cache in about a millisecond, no root, no .com, no authoritative server.</p>", "note": {"kind": "key", "text": "Caching is why DNS scales to the whole internet, and why DNS changes \"take time to propagate\": old answers live until their TTL expires."}, "set": {"root": {"dim": true}, "tld": {"dim": true}, "auth": {"dim": true}}, "flow": [["pc", "res", "#3b82f6", "A? (again)"], ["res", "pc", "#22c55e", "from cache"]]}]}

::widget Scene {"title": "DNS over HTTPS and DNSSEC: private and trustworthy answers", "sub": "two different problems, two different fixes", "nodes": [{"id": "pc", "kind": "laptop", "label": "Laptop", "x": 3.1, "y": 3.1}, {"id": "wifi", "kind": "user", "label": "Café Wi-Fi snoop", "x": 11.13, "y": 3.13}, {"id": "res", "kind": "server", "label": "Resolver", "x": 11.1, "y": -4.9, "color": "blue"}, {"id": "auth", "kind": "server", "label": "example.com NS", "x": 15.1, "y": -8.9, "color": "green"}], "links": [["pc", "res", {"both": true}], ["res", "auth", {"both": true}]], "metrics": [["priv", "Can the café see the name?"], ["trust", "Can the answer be forged?"]], "steps": [{"short": "Plain DNS", "tag": "Problem", "title": "Classic DNS is plain text over UDP", "body": "<p>Anyone on the network sees every name you look up, and could send a fake reply first.</p>", "flow": [["pc", "res", "#ef4444", "bank.example?"]], "focus": ["wifi"], "metrics": {"priv": ["yes", "bad"], "trust": ["yes", "bad"]}}, {"short": "DoH", "tag": "Privacy", "title": "DNS over HTTPS (or TLS) encrypts the question", "body": "<p>The query travels inside an HTTPS connection to the resolver. The café sees only \"talking to 1.1.1.1\".</p>", "flow": [["pc", "res", "#22c55e", "🔒 encrypted query"]], "set": {"wifi": {"dim": true}}, "metrics": {"priv": ["no", "good"]}}, {"short": "DNSSEC", "tag": "Integrity", "title": "DNSSEC signs the answers", "body": "<p>The domain owner signs its records; resolvers check the signature chain back to the root. A forged answer fails the check.</p>", "flow": [["auth", "res", "#22c55e", "record + signature ✓"]], "metrics": {"trust": ["no (signed)", "good"]}, "note": {"kind": "key", "text": "DoH/DoT protect privacy in transit. DNSSEC protects authenticity of the data. They solve different problems and work together."}}]}

## Names for people, numbers for machines

You type `youtube.com`. Your computer needs an IP address like `142.250.183.14` to send anything (chapter 2). Something has to translate the name into the number. That something is the **Domain Name System (DNS)**.

> [!ANALOGY] DNS is the phone contacts app of the internet. You remember "Mom", not her number. When you tap "Mom", the phone looks up the number and dials it. DNS lets you remember `youtube.com` while your computer dials `142.250.183.14`, and if YouTube changes its numbers, you never notice.

In the early days of the internet, every computer downloaded one file, `HOSTS.TXT`, listing every machine's name and address. By the early 1980s it was changing faster than people could download it. In 1983, Paul Mockapetris designed DNS: a **distributed** **hierarchical** **heavily cached** database that now answers trillions of questions a day.

## The hierarchy: reading a name from right to left

A domain name is read **right to left** from the most general part to the most specific:

```text
           www . example . com .
           ↑       ↑       ↑   ↑
     subdomain  domain   TLD  root (the invisible final dot)
```

- **The root** (`.`): the top of the tree. Its job is only to know who runs each top-level domain.
- **Top-level domains (TLDs)**: `.com`, `.org`, `.in`, `.io`, `.uk`… Each is run by a registry; Verisign runs `.com`.
- **Domains**: `example.com`, registered by whoever owns it. They point to their own **authoritative name servers** the servers that hold the real answers for that domain.
- **Subdomains**: `www.example.com`, `api.example.com`, `mail.example.com`, managed by the domain's owner.

No single server knows everything. Each level only knows **who to ask next**. That's how DNS scales to hundreds of millions of domains.

> [!NOTE] There are "13 root servers" (named a.root-servers.net to m.root-servers.net), but each name is actually served by many machines around the world using **anycast** (chapter 2), over 1,700 physical servers in total.

## A lookup, step by step





Suppose nobody nearby has looked up `www.example.com` recently. Here's what happens:

::widget Sequence {"title":"Looking up www.example.com from scratch","what":"Your computer asks a 'resolver' to find the answer. The resolver walks down the hierarchy, root, then .com, then example.com's own servers, and remembers every answer for next time.","steps":["Step through each message.","Notice the root and .com servers don't know the answer, they only say who to ask next.","Notice the final answer comes with a TTL: how long it may be cached."],"actors":["Your computer","Resolver (e.g. 1.1.1.1)","Root server",".com server","example.com's server"],"msgs":[[0,0,"Check local caches first","The browser and the operating system remember recent answers. If found, we're done in microseconds. Not this time."],[0,1,"What's the address of www.example.com?","Your computer asks its configured resolver, usually your internet provider's, or a public one like Google's 8.8.8.8 or Cloudflare's 1.1.1.1. It's asking: 'please find the final answer for me'."],[1,2,"Where's www.example.com?","The resolver starts at the top. It knows the root servers' addresses from a built-in list."],[2,1,"I don't know, ask the .com servers, here they are","The root only knows who runs each top-level domain. This is a referral, not an answer."],[1,3,"Where's www.example.com?","The resolver asks a .com server."],[3,1,"Ask example.com's name servers, here they are","The .com registry knows which name servers each .com domain uses. Another referral."],[1,4,"Where's www.example.com?","Now it asks the domain's own authoritative server, the one that actually holds the records."],[4,1,"93.184.215.14 (valid for 300 seconds)","The real answer, with a TTL: 'you may reuse this for 5 minutes'."],[1,1,"Remember everything","The resolver caches the answer AND the referrals, so the next lookup of any .com name skips the root, and the next lookup of this name is instant."],[1,0,"93.184.215.14","Your browser can now connect. A cold lookup takes 20–120 ms; a cached one well under 1 ms."]]}

Two kinds of questions are involved:

- Your computer asks the resolver a **recursive** question: "do whatever it takes and give me the final answer".
- The resolver asks the other servers **iterative** questions: "give me the answer, or tell me who to ask next".

> [!TRY] Run `dig +trace www.example.com` (Mac/Linux) to watch your computer do the whole walk itself: root → .com → example.com, step by step. On Windows, `nslookup www.example.com` shows the final answer.

## Caching and TTL: why DNS changes "take time to propagate"

Every DNS answer comes with a **TTL** (time to live) in seconds, how long anyone may reuse it before asking again. Browsers, operating systems and resolvers all cache answers for that long.

Caching is what makes DNS fast and able to handle enormous traffic: the vast majority of lookups are answered from a cache close to you. But it has a side effect you've probably seen:

> [!EXAMPLE] **"DNS changes can take up to 48 hours to propagate."** When you move a website to a new server and update its DNS record, every resolver that cached the old address keeps using it until its copy's TTL expires. If the TTL was 24 hours, some visitors keep hitting the old server for up to a day. Experienced engineers **lower the TTL** (say to 60 seconds) a day *before* a migration, make the change, then raise the TTL again afterwards.

Choosing a TTL is a trade-off:

- **Short TTL** (30–300 s): changes and failovers take effect quickly, but there are more lookups, which cost a little time and load.
- **Long TTL** (hours): fewer lookups, more resilient if your DNS provider has an outage, but slow to change.

## Record types

A domain can hold several kinds of records:

| Type | What it says | Example |
|---|---|---|
| **A** | Name → IPv4 address | `example.com → 93.184.215.14` |
| **AAAA** | Name → IPv6 address | `example.com → 2606:2800:21f::1` |
| **CNAME** | "This name is an alias for that name" | `www.example.com → example.com` |
| **MX** | Which servers receive email for this domain | `example.com → mail.example.com (priority 10)` |
| **TXT** | Free text, used for verification and email security | Proving you own a domain to Google; SPF and DKIM records that stop email spoofing |
| **NS** | Which name servers are in charge of this domain | `example.com → ns1.provider.net` |
| **PTR** | Reverse lookup: address → name | Used by email servers to check senders |

> [!EXAMPLE] When you set up Google Workspace or Microsoft 365 email for a company domain, the instructions ask you to add **MX** records (so email for `you@company.com` goes to Google's or Microsoft's servers) and **TXT** records (to prove you own the domain and to stop spammers sending email that pretends to be from you).

## DNS as a traffic controller

Big companies use DNS for much more than simple lookups, the answer can **depend on who's asking**:

- **Geographic routing.** Ask for `netflix.com` from Mumbai and you get the address of a nearby server; ask from London and you get a different one. The authoritative server looks at where the question came from and answers accordingly.
- **Load spreading.** Return several addresses, so different users go to different servers.
- **Failover.** Health-check the servers, and stop handing out the addresses of any that are down. (Users with the old answer cached will still try the dead server until the TTL expires, another reason TTLs matter.)
- **Gradual rollouts.** Send 5% of users to a new data center by answering with its address 5% of the time.

## Security and privacy

DNS was designed in a more trusting era, and it shows:

- **It's unencrypted by default.** Your internet provider (and anyone on the same café Wi-Fi) can see every domain you look up. **DNS over HTTPS (DoH)** and **DNS over TLS (DoT)** encrypt your questions to the resolver; modern browsers increasingly enable this by default.
- **Answers aren't authenticated by default.** An attacker who can forge answers can send you to a fake bank website, **cache poisoning**. In 2008, security researcher Dan Kaminsky showed how practical this was, and the whole industry patched resolvers in a secret coordinated effort. **DNSSEC** adds digital signatures to DNS records so resolvers can verify answers are genuine, though it's still only partly adopted.

## "It's always DNS"

There's a running joke among engineers: when something mysteriously breaks, the answer is "It's always DNS". Because everything depends on DNS, when DNS fails, everything fails, in confusing ways.

> [!STORY] **The day half the internet went dark (October 2016).** Hackers had infected hundreds of thousands of cheap internet-connected cameras and video recorders with malware called **Mirai**. They pointed all of them at **Dyn** a company that provided DNS for many major websites. Overwhelmed, Dyn's servers couldn't answer. Twitter, GitHub, Netflix, Reddit, Spotify and others were perfectly healthy, but for millions of people, their **names** couldn't be turned into addresses, so they seemed to vanish. The lesson many companies took: use more than one DNS provider.

> [!EXAMPLE] The 2021 Facebook outage from chapter 2 was ultimately a DNS failure too: once BGP routes to Facebook's DNS servers disappeared, every resolver in the world got no answer for `facebook.com`. And in October 2025, a bug in the automation managing DNS records for one of AWS's database services in its biggest region briefly left a critical name with an empty answer, causing a cascade of failures across many services.

> [!RECAP]
> - **DNS** translates names into IP addresses using a **hierarchy**: root → top-level domain → the domain's own authoritative servers.
> - Your computer asks a **resolver** to do the work; the resolver walks the hierarchy and **caches** everything.
> - Every answer has a **TTL**; that's why changes "take time to propagate". Lower TTLs before migrations.
> - Record types include **A/AAAA** (addresses), **CNAME** (aliases), **MX** (email) and **TXT** (verification, anti-spoofing).
> - Companies use DNS for **geographic routing, load spreading and failover**.
> - DNS is unencrypted and unauthenticated by default (DoH and DNSSEC help), and DNS failures make healthy services look dead.

> [!INTERVIEW] Be ready to walk through a full lookup (resolver, root, TLD, authoritative), explain recursive vs iterative queries, name the common record types, and discuss TTL trade-offs. In system design interviews, mention GeoDNS for sending users to the nearest region, and that DNS-based failover is only as fast as your TTL.

::quiz {"q":"Which server gives the final, definitive answer for www.example.com?","options":["The root server","The .com server","example.com's authoritative name server","Your laptop"],"answer":2,"explain":"Root and TLD servers only refer you onward; the resolver relays and caches."}

::quiz {"q":"You're moving your website to a new server tomorrow. What should you do with its DNS TTL today?","options":["Raise it to a week","Lower it (for example to 60 seconds) so caches pick up the change quickly","Delete the record","Nothing, TTLs don't matter"],"answer":1,"explain":"Resolvers may keep the old address for up to the old TTL."}

::quiz {"q":"During the 2016 Dyn attack, why did healthy websites like Twitter appear to be down?","options":["Their servers were hacked","Their DNS provider couldn't answer, so people's computers couldn't find their IP addresses","Their certificates expired","BGP routes were withdrawn"],"answer":1,"explain":"Without DNS, a working server is unreachable by name."}
