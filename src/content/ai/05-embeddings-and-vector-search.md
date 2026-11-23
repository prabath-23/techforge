---
title: Embeddings and Vector Search — Finding Things by Meaning
summary: How text, images and products are turned into points in space where "close" means "similar" (explore it interactively), how similarity is measured, how vector databases search billions of points in milliseconds using clever indexes like HNSW, and why the best search systems combine meaning with plain old keywords.
---

## Keyword search's blind spot

> [!STORY] A customer types "my phone won't charge" into a help center. The perfect article is titled "Troubleshooting battery and power issues". A keyword search finds nothing — not one word matches. A human would see the connection instantly. **Embeddings** let a computer see it too: they turn text into points in space where texts with similar **meaning** land near each other, whatever words they use.

## What an embedding is

An **embedding model** turns a piece of text (or an image, a song, a product) into a list of numbers — typically 384 to 3,072 of them. Each list is a **point** in a high-dimensional space. The model is trained so that similar things end up close together: pairs like (question, its answer) are pulled together, and unrelated pairs are pushed apart.

> [!ANALOGY] A map of a city where shops are placed by **what they sell** rather than by street. Bakeries cluster together, next to cafés; hardware stores are far away, near garden centers. To find "somewhere to get a croissant", you go to the right neighborhood and look at what's closest.

Here's a simplified two-dimensional map. Type a query and see which points are nearest:

::widget EmbeddingSpace {}

Real embeddings have hundreds of dimensions, which lets them capture many kinds of similarity at once — topic, tone, language, formality.

### Measuring "close"

- **Cosine similarity:** the angle between two vectors (1 = same direction, 0 = unrelated). The most common choice for text.
- **Dot product:** like cosine but also affected by length; equivalent to cosine when vectors are normalized to length 1 (most models do this).
- **Euclidean distance:** the straight-line distance.

Use whatever your embedding model was trained with.

> [!WARN] Vectors from **different** embedding models are not comparable — they live in different "maps". If you change your embedding model, you must re-embed every document. Plan for it.

## Where embeddings are used

- **Semantic search** and help centers ("phone won't charge" → battery article).
- **RAG** — finding the right documents to give an LLM (next chapter).
- **Recommendations:** "users who liked this also liked…" — items and users are embedded in the same space.
- **Deduplication:** finding near-duplicate questions, products or images.
- **Clustering and classification:** grouping support tickets by topic.
- **Image search:** models like CLIP embed images and text in the **same** space, so "a dog on a beach" finds photos.

## Searching billions of points quickly

Comparing a query with every stored vector (brute force) is exact but slow: a billion vectors × 1,000 numbers each is a trillion multiplications per search. Instead, vector databases use **approximate nearest neighbor (ANN)** indexes that find almost all of the true nearest neighbors in milliseconds.

### HNSW: a highway system for vectors

> [!ANALOGY] Driving to a friend's house in another city. You take the motorway to the right region, then main roads to the right neighborhood, then local streets to the exact house. You never examine every street in the country.

**HNSW** (Hierarchical Navigable Small World) builds layers of graphs: the top layer has few points with long-distance links (the motorway); each lower layer has more points and shorter links; the bottom has every point. A search starts at the top, greedily moves toward the query, drops a layer, and repeats. It's the most popular index — fast and accurate, but memory-hungry.

### Other approaches

- **IVF (inverted file):** cluster vectors into, say, 10,000 groups; at query time, only search the few groups closest to the query.
- **Product quantization (PQ):** compress each vector into a few bytes so billions fit in memory, at some accuracy cost.
- **DiskANN:** graph indexes designed to live mostly on SSD.

You tune the trade-off between **recall** (how many true neighbors you find), speed and memory.

**Tools:** pgvector (inside PostgreSQL — often the simplest choice), Pinecone, Weaviate, Qdrant, Milvus, Elasticsearch/OpenSearch, and FAISS (a library).

## The best search combines meaning and keywords

Embeddings are great at meaning but bad at exact matches: product codes ("SKU-88123"), error messages, names, rare terms. Classic **keyword search** (BM25, the algorithm behind Elasticsearch) is great at exactly those.

::widget Stepper {"type":"flow","cols":4,"title":"A production search pipeline","what":"How modern search systems combine meaning-based and keyword-based search, then rerank the best results.","steps":["Press Play and follow a query from left to right.","Notice that two searches run in parallel.","Find the step that is slowest per result but most accurate (reranking)."],"nodes":[["Query","Optionally rewritten by an LLM, e.g. turning a vague follow-up into a full question. Embedded with the same model as the documents."],["Two searches in parallel","Vector search (top 100 by meaning) and keyword search (top 100 by words), both filtered by metadata and permissions."],["Fusion","Merge the two lists — a simple, robust method called reciprocal rank fusion rewards items ranked high in either."],["Rerank","A more powerful 'cross-encoder' model reads the query and each candidate together and scores how well it answers. Keep the top 5–10."],["Results","Show them to the user, or pass them to an LLM as context (RAG)."]]}

> [!NOTE] **Filtering matters.** Real queries come with conditions: "only this customer's documents", "only English", "published after 2024". Filtering after the vector search may return almost nothing; good vector databases apply filters during the search.

> [!RECAP]
> - An **embedding** turns content into a vector where **closeness = similarity of meaning**; measure with cosine similarity.
> - Vectors from different models aren't comparable — changing models means re-embedding everything.
> - **ANN indexes** (HNSW, IVF, PQ) find near neighbors among billions in milliseconds, trading a little recall.
> - **Hybrid search** (vectors + keywords) plus a **reranker** beats either alone.

> [!INTERVIEW] Explain embeddings and cosine similarity; why ANN instead of brute force; how HNSW works at a high level; the recall/latency/memory trade-off; why hybrid search and reranking help; how to handle permission filters.

::quiz {"q":"Why add keyword (BM25) search alongside vector search?","options":["Vectors are too slow","Embeddings handle meaning well but can miss exact matches like product codes and error messages","BM25 understands synonyms better","It's required by vector databases"],"answer":1,"explain":"Hybrid search covers both meaning and exact terms."}

::quiz {"q":"You switch to a new embedding model. What must you do?","options":["Nothing","Re-embed all documents — vectors from different models aren't comparable","Only embed new documents","Change the distance metric"],"answer":1,"explain":"Each model creates its own space."}

::quiz {"q":"What does an ANN index trade away to search billions of vectors fast?","options":["Security","A small amount of recall — it may miss some of the true nearest neighbors","All accuracy","The ability to update data"],"answer":1,"explain":"Tuning parameters move you along the recall/speed curve."}
