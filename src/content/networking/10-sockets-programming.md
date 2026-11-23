---
title: Sockets Programming — Writing a Client and Server
summary: How programs actually talk over a network — the socket API step by step (socket, bind, listen, accept, connect, send, recv), a working TCP echo server and client, why TCP is a byte stream and how to frame messages, UDP sockets, handling many clients (threads vs event loops), timeouts, and the bugs everyone hits once.
---

## Under every HTTP library

> [!STORY] A developer's chat app works perfectly in testing. In production, users occasionally see two messages glued together ("hi therehow are you?"), or half a message followed later by the rest. The developer assumes the network is "losing data". It isn't. They'd treated TCP like a series of separate messages, when it's actually a continuous **stream of bytes** — like water through a pipe, with no built-in boundaries. Every HTTP client, database driver and message queue is built on the same few **socket** calls; understanding them makes bugs like this obvious.

A **socket** is the operating system's handle for one end of a network conversation — just a file descriptor (OS track, chapter 10) that you can read from and write to, with an IP address and port attached.

## The TCP conversation, step by step

::widget Sequence {"title":"A TCP client and server using the socket API","what":"The system calls a server and a client make, in order, to set up a connection, exchange data and close. Each arrow is a call or a message between them.","steps":["Step through each message from the top.","Notice that the server prepares (socket, bind, listen) before any client arrives.","Find where the TCP three-way handshake happens, and which call returns a NEW socket."],"actors":["Server program","Server kernel","Client kernel","Client program"],"msgs":[[0,1,"socket() → bind(:9000) → listen()","Create a socket, attach it to port 9000, and mark it as willing to accept connections. The kernel will now queue incoming connections."],[0,1,"accept() — waits","The server blocks until a client connects."],[3,2,"socket() → connect(server:9000)","The client creates its own socket and asks to connect. The kernel picks a random local port."],[2,1,"SYN → SYN-ACK → ACK","The TCP three-way handshake is done by the two kernels (Networking chapter 5)."],[1,0,"accept() returns a NEW socket","A dedicated socket for this one client. The original listening socket keeps waiting for others."],[3,2,"send(\"hello\")","Bytes are copied into the kernel's send buffer and sent when TCP decides."],[1,0,"recv() → \"hello\"","The server reads whatever bytes have arrived — maybe all, maybe part, maybe more than one message."],[0,3,"send(reply) … close()","Reply, then close. Closing sends FIN; the other side's recv() returns 0 bytes, meaning 'the other side finished'."]]}

## A working echo server and client (Python)

```python
# server.py — handles one client at a time, echoing everything back
import socket

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:   # IPv4, TCP
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)    # allow quick restarts
    srv.bind(("0.0.0.0", 9000))                                    # all interfaces, port 9000
    srv.listen(128)                                                # queue up to 128 pending
    while True:
        conn, addr = srv.accept()                                  # blocks; new socket per client
        with conn:
            while data := conn.recv(4096):                         # b"" means the client closed
                conn.sendall(data)                                 # sendall loops until all sent
```

```python
# client.py
import socket
with socket.create_connection(("127.0.0.1", 9000), timeout=5) as s:
    s.sendall(b"hello\n")
    print(s.recv(4096))
```

> [!NOTE] `SO_REUSEADDR` matters: after a server stops, its old connections sit in `TIME_WAIT` for a minute or two (Networking chapter 5). Without this option, restarting the server fails with "Address already in use".

## TCP is a stream: framing your messages

TCP guarantees bytes arrive **in order and without gaps** — but not in the same chunks you sent. One `send()` of 100 bytes might arrive as two `recv()`s of 60 and 40; two quick `send()`s might arrive in one `recv()`.

> [!ANALOGY] Pouring two glasses of juice into the same pipe. At the other end, juice comes out continuously — there's no gap marking where the first glass ended. If you want to know, you have to add markers yourself: "the next glass is 250 ml".

So every protocol built on TCP defines **framing**:

- **Delimiter:** end each message with a newline (Redis's protocol, SMTP, line-based chat). Read until you find it.
- **Length prefix:** send a 4-byte length, then that many bytes (most binary protocols, Kafka, gRPC over HTTP/2 frames).
- **Self-describing headers:** HTTP/1.1 uses a blank line to end headers, then `Content-Length` to know how big the body is.

```python
import struct

def send_msg(sock, payload: bytes):
    sock.sendall(struct.pack("!I", len(payload)) + payload)       # 4-byte big-endian length

def recv_exact(sock, n):
    buf = b""
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk: raise ConnectionError("peer closed")
        buf += chunk
    return buf

def recv_msg(sock) -> bytes:
    (length,) = struct.unpack("!I", recv_exact(sock, 4))
    return recv_exact(sock, length)
```

That fixes the chat app: messages can never glue together or split.

## UDP sockets

UDP (`SOCK_DGRAM`) keeps message boundaries — each `sendto()` arrives as exactly one datagram — but with **no** guarantee of delivery, order or no duplicates (Networking chapter 5). No `listen`/`accept`; just send and receive packets with addresses.

```python
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.sendto(b"ping", ("10.0.0.5", 9999))
data, addr = sock.recvfrom(2048)
```

Used for DNS, games, voice and video, and as the base for QUIC — where the application adds whatever reliability it needs.

## Handling many clients at once

The echo server above serves one client at a time: while it's talking to one, others wait. Real servers use one of these models (OS track, chapter 10):

| Model | How | Trade-off |
|---|---|---|
| **Thread (or process) per connection** | `accept()`, then hand the socket to a new thread | Simple code; thousands of threads use lots of memory and context switches |
| **Thread pool** | A fixed number of worker threads take connections from a queue | Bounded resources; slow clients can tie up workers |
| **Event loop** (epoll/kqueue/io_uring) | One thread watches thousands of non-blocking sockets and handles whichever is ready | Scales to huge numbers of connections (nginx, Node.js, Redis); code must never block |
| **Async/await, green threads** | Code that looks sequential, running on an event loop (Python asyncio, Go goroutines, Rust tokio, Java virtual threads) | Best of both, with runtime support |

```python
# The same echo server with asyncio — thousands of clients on one thread
import asyncio

async def handle(reader, writer):
    while data := await reader.read(4096):
        writer.write(data)
        await writer.drain()
    writer.close()

async def main():
    server = await asyncio.start_server(handle, "0.0.0.0", 9000)
    async with server: await server.serve_forever()

asyncio.run(main())
```

## The bugs everyone hits once

- **No timeouts:** a `connect()` or `recv()` to a dead peer can block for minutes or forever. Always set connect and read timeouts (and deadlines across retries).
- **Assuming `send()` sends everything:** it may send only part; use `sendall()` or loop.
- **Assuming one `recv()` = one message:** frame your messages.
- **Ignoring `recv()` returning 0:** that means the peer closed; continuing in a loop spins the CPU at 100%.
- **Not closing sockets:** leaked file descriptors pile up until "Too many open files", and on the server side connections sit in `CLOSE_WAIT` forever (Linux track, chapter 6).
- **Nagle's algorithm delays:** TCP may hold small writes briefly to combine them, adding latency to chatty request-response protocols. Set `TCP_NODELAY` for latency-sensitive apps (most HTTP and RPC libraries do).
- **Binding to 127.0.0.1** when you meant all interfaces (`0.0.0.0`) — unreachable from other machines or containers.

> [!RECAP]
> - A **socket** is a file descriptor for one end of a connection. Server: `socket → bind → listen → accept` (returns a new socket per client). Client: `socket → connect`. Then `send`/`recv`, and `close`.
> - **TCP is a byte stream**: messages can split or merge, so add **framing** (delimiters or length prefixes).
> - **UDP** preserves datagram boundaries but not delivery or order.
> - Serve many clients with **threads, pools, event loops or async**; event loops scale to huge connection counts.
> - Always set **timeouts**, handle partial sends and `recv() == 0`, close sockets, and consider `TCP_NODELAY`.

> [!INTERVIEW] Low-level networking questions: walk through the socket calls for a TCP server, explain why TCP needs message framing, threads vs event loops for 10,000 connections (the "C10K problem"), and what happens when a client disappears without closing.

::quiz {"q":"What does accept() return?","options":["The client's IP address only","A new socket dedicated to that one client connection","The listening socket","The number of bytes received"],"answer":1,"explain":"The listening socket keeps accepting other clients."}

::quiz {"q":"A client sends two 50-byte messages quickly. The server's single recv() returns 100 bytes. Is something broken?","options":["Yes, TCP merged packets incorrectly","No — TCP is a byte stream with no message boundaries; the protocol must frame messages","Yes, the buffer is too large","Only on Windows"],"answer":1,"explain":"Use delimiters or length prefixes."}

::quiz {"q":"recv() returns 0 bytes on a TCP socket. What does it mean?","options":["No data yet; try again","The peer closed the connection","An error","The buffer is full"],"answer":1,"explain":"Stop reading and close your side."}
