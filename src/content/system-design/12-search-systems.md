---
title: Search Systems — From Inverted Indexes to Ranking
summary: How search engines find and order results in milliseconds — tokenizing text, the inverted index, BM25 relevance scoring, sharding and replicating an index across machines, keeping it fresh, typo tolerance and autocomplete, combining keyword and semantic (vector) search, learning-to-rank, and measuring search quality.
---

::widget Scene {"title": "Inverted indexes: how search finds documents", "sub": "index three product titles, then answer \"red running shoes\"", "nodes": [{"id": "d", "kind": "doc", "label": "Docs: 1 Red running shoes · 2 Blue running jacket · 3 Red wool shoes", "x": 3.72, "y": 3.72}, {"id": "an", "kind": "cpu", "label": "Analyzer", "x": 8.22, "y": -0.78, "color": "teal"}, {"id": "idx", "kind": "cells", "label": "inverted index (term → doc IDs)", "x": 8.5, "y": -8.5, "values": ["red:1,3", "run:1,2", "shoe:1,3", "blue:2", "wool:3"]}, {"id": "q", "kind": "laptop", "label": "Query", "x": 14.42, "y": 5.42}, {"id": "rank", "kind": "cube", "label": "Ranker (BM25)", "x": 19.92, "y": -0.08, "color": "orange"}], "links": [["d", "an"], ["an", "idx"], ["q", "idx", {"dashed": true}], ["idx", "rank", {"dashed": true}]], "metrics": [["stage", "Stage"], ["out", "Result"]], "steps": [{"short": "Scan?", "tag": "Problem", "title": "Why not just scan every document for the words?", "body": "<p>At 100 million products, a full scan per query takes minutes. We need the answer in milliseconds.</p>", "show": ["d"], "metrics": {"stage": ["—"], "out": ["—"]}}, {"short": "Tokenize", "tag": "Analyze", "title": "Split text into tokens", "body": "<p>\"Red running shoes\" → [Red] [running] [shoes].</p>", "show": ["d", "an"], "flow": [["d", "an", "#14b8a6", "text"]], "metrics": {"stage": ["tokenize"]}}, {"short": "Normalize", "tag": "Analyze", "title": "Lowercase, remove stop words, stem", "body": "<p>[red] [run] [shoe]. Now \"Running Shoe\" and \"runs shoes\" match the same terms.</p>", "set": {"an": {"badge": "running → run"}}, "metrics": {"stage": ["normalize + stem"]}}, {"short": "Index", "tag": "Index", "title": "Build posting lists: each term → the docs that contain it", "body": "<p>Like the index at the back of a book. Lists are sorted by doc ID and compressed.</p>", "show": ["d", "an", "idx"], "flow": [["an", "idx", "#14b8a6", "terms"]], "set": {"idx": {"marks": {"0": "blue", "1": "blue", "2": "blue", "3": "blue", "4": "blue"}, "ptr": {}}}, "metrics": {"stage": ["posting lists"]}}, {"short": "Query", "tag": "Query", "title": "Query \"red running shoes\" goes through the same analyzer", "body": "<p>→ [red] [run] [shoe]. Query and documents must be analysed identically, or nothing matches.</p>", "show": ["d", "an", "idx", "q"], "flow": [["q", "idx", "#3b82f6", "red run shoe"]], "metrics": {"stage": ["analyze query"]}}, {"short": "Lookup", "tag": "Lookup", "title": "Fetch the three posting lists", "body": "<p>red: {1, 3} · run: {1, 2} · shoe: {1, 3}. Each is a fast lookup, no scanning.</p>", "set": {"idx": {"marks": {"0": "orange", "1": "orange", "2": "orange"}, "ptr": {}}}, "metrics": {"stage": ["lookup"]}}, {"short": "Intersect", "tag": "Combine", "title": "AND = intersect the lists; OR = union", "body": "<p>Intersection: {1}. Sorted lists intersect with a two-pointer walk.</p>", "set": {"idx": {"marks": {"0": "green", "1": "green", "2": "green"}, "ptr": {}}}, "metrics": {"out": ["AND → doc 1; OR → 1, 2, 3"]}}, {"short": "Rank", "tag": "Rank", "title": "Rank OR results with BM25", "body": "<p>Rare terms count more than common ones (IDF); more occurrences help with diminishing returns; long docs are normalised. Doc 1 (all three) > doc 3 (two) > doc 2 (one).</p>", "show": ["d", "an", "idx", "q", "rank"], "flow": [["idx", "rank", "#f59e0b", "1, 2, 3"]], "metrics": {"stage": ["score"], "out": ["1 > 3 > 2", "good"]}}, {"short": "Shard", "tag": "Scale", "title": "Shard the index by document; query every shard", "body": "<p>Scatter the query to all shards, each returns its top 10, then gather and merge the global top 10.</p>", "set": {"rank": {"badge": "merge top-k"}}}, {"short": "Fresh", "tag": "Freshness", "title": "New products appear within ~1 s", "body": "<p>New docs go into small in-memory segments that are refreshed periodically and merged later — the same idea as LSM trees.</p>", "note": {"kind": "key", "text": "Analyze → inverted index → lookup posting lists → intersect/union → rank (BM25, then ML re-ranking) → shard with scatter-gather. Elasticsearch, OpenSearch and Lucene work this way."}}]}

::widget Scene {"title": "Inverted indexes: how search finds documents instantly", "sub": "\"red shoes\"", "nodes": [{"id": "red", "kind": "cells", "label": "red →", "x": 0.93, "y": 0.93, "values": [1, 3, 8]}, {"id": "shoe", "kind": "cells", "label": "shoe →", "x": 5.27, "y": 5.27, "values": [1, 3, 5, 9]}, {"id": "res", "kind": "cells", "label": "both", "x": 9.61, "y": 9.61, "values": [1, 3]}], "metrics": [["q", "Query"], ["docs", "Matching documents"]], "steps": [{"short": "Index", "tag": "Build", "title": "For each word, a sorted list of documents containing it", "body": "<p>Like the index at the back of a book. Built once; queries never scan documents.</p>", "show": ["red", "shoe"], "metrics": {"q": ["red shoes"], "docs": ["—"]}}, {"short": "Intersect", "tag": "Query", "title": "Intersect the two lists: documents 1 and 3", "body": "<p>Sorted lists merge in one pass, even with millions of entries.</p>", "set": {"red": {"marks": {"0": "green", "1": "green"}, "ptr": {}}, "shoe": {"marks": {"0": "green", "1": "green"}, "ptr": {}}}, "metrics": {"docs": ["1, 3", "good"]}}, {"short": "Rank", "tag": "Rank", "title": "Rank by relevance (BM25), popularity and freshness", "body": "<p>Rare words count more; title matches beat body matches; then business signals and ML re-ranking.</p>", "note": {"kind": "key", "text": "Elasticsearch/OpenSearch shard the index across machines and query all shards in parallel (scatter-gather)."}}]}

## 40 milliseconds to search everything

> [!STORY] You type "red running shoes size 9" into an online store with 50 million products. In about 40 milliseconds, you see the most relevant results, in stock, in your size, with typos forgiven and filters counted ("Nike (1,204)"). Scanning 50 million product descriptions for those words would take minutes. Instead, the store looks the words up in a structure prepared in advance — exactly like the index at the back of a book — then scores and sorts a few thousand candidates. Search is one of the most common features to design, and one of the most interesting.

## Step 1: turn text into terms

Before indexing, text goes through an **analysis** pipeline:

1. **Tokenize:** split into words — "Running-Shoes, Size 9!" → `Running`, `Shoes`, `Size`, `9`.
2. **Normalize:** lowercase, remove accents ("café" → "cafe").
3. **Remove stop words** (sometimes): "the", "a", "of".
4. **Stem or lemmatize:** "running", "runs", "ran" → `run`; "shoes" → `shoe`.
5. **Synonyms** (optional): "sneakers" ↔ "trainers" ↔ "running shoes".

The **same** analysis must be applied to queries, so "Running Shoes" matches a document that said "run shoe".

## Step 2: the inverted index

An **inverted index** maps each term to the list of documents containing it (a **postings list**), usually with positions and frequencies:

::widget Stepper {"type":"flow","cols":3,"title":"From documents to an inverted index to a query","what":"Three tiny product descriptions are indexed, then the query 'red shoe' is answered by intersecting postings lists instead of scanning documents.","steps":["Press Play to follow indexing, then the query.","Notice that each term points to the documents containing it.","Find how the engine gets candidate documents without reading any document text."],"nodes":[["Documents","1: 'Red running shoes'. 2: 'Blue running jacket'. 3: 'Red leather shoe polish'."],["After analysis","1: red, run, shoe. 2: blue, run, jacket. 3: red, leather, shoe, polish."],["Inverted index","red → [1, 3]. run → [1, 2]. shoe → [1, 3]. blue → [2]. jacket → [2]. leather → [3]. polish → [3]."],["Query 'red shoes'","Analysis gives: red, shoe. Look up both postings lists: red → [1, 3], shoe → [1, 3]."],["Combine","Intersect for AND: [1, 3]. (Union for OR.) Postings lists are sorted by document ID, so intersection is a fast merge — like merging sorted arrays."],["Score and sort","Both match, but which is more relevant? Document 1 is about shoes; document 3 is about shoe polish. Ranking decides (next section)."]]}

> [!ANALOGY] The index at the back of a textbook: "deadlock — pages 212, 340, 341". You never read the whole book to find a topic; you look it up and jump straight there. Search engines keep such an index for every word in every document.

Postings lists are **compressed** (storing gaps between sorted IDs as small variable-length numbers) and paired with skip pointers, so even terms appearing in millions of documents are fast to scan and intersect. Phrase queries ("running shoes" as a phrase) use the stored **positions**.

**Lucene** — the library inside **Elasticsearch, OpenSearch and Solr** — writes indexes as immutable **segments** (much like LSM trees — try the LSM figure earlier in this track): new documents go to a small new segment; deletes are marked; background merging combines segments.

## Step 3: ranking by relevance

Matching gives candidates; **ranking** orders them. The classic text-relevance score is **BM25**, built on three intuitions:

- **Term frequency:** a document mentioning "shoe" several times is more likely about shoes — but with **diminishing returns** (the tenth mention adds little).
- **Inverse document frequency:** rare terms matter more. Matching "leather" (in few documents) says more than matching "red" (in many).
- **Length normalization:** a match in a short title counts more than the same match in a 5,000-word page.

Real systems combine text relevance with many other signals: **field boosts** (a title match beats a description match), **popularity** (sales, clicks, ratings), **freshness** (news, listings), **personalization** (your size, past purchases, location), **business rules** (in stock first, sponsored placements).

### Learning to rank

Large search systems use a **two-stage** approach:

1. **Retrieval:** quickly fetch a few hundred to a few thousand candidates with cheap scoring (BM25, filters, maybe vector search).
2. **Re-ranking:** a machine-learning model (often gradient-boosted trees, or a neural **cross-encoder**) scores each candidate using dozens to hundreds of features — trained on click and purchase data to predict what users actually want.

## Semantic search: meaning, not just words

Keyword search misses synonyms and intent ("something to keep my feet dry while hiking" → waterproof hiking boots). **Embeddings** (AI track, chapter 5) capture meaning; **vector search** finds documents with similar meaning.

Best practice is **hybrid search**: run keyword (BM25) and vector retrieval in parallel, fuse the results (e.g. reciprocal rank fusion), then re-rank. Keywords catch exact terms, product codes and names; vectors catch meaning. This is also the retrieval layer of RAG systems (AI track, chapter 6).

## Distributing the index

One machine can't hold or serve an index of billions of documents. Two strategies:

- **Document-partitioned (sharded by document):** each shard holds a complete index for a subset of documents. A query goes to **every** shard (scatter), each returns its top results, and a coordinator merges them (gather). Simple and the most common (Elasticsearch shards).
- **Term-partitioned:** each shard holds the full postings for a subset of terms. A query touches only shards for its terms, but multi-term queries need cross-shard intersection — rarer in practice.

**Replicas** of each shard serve more queries and survive machine failures. Because a scatter-gather query is only as fast as its **slowest shard**, tail latency matters: hedge slow requests, keep shards balanced, and avoid huge numbers of tiny shards.

::widget Architecture {"title":"A product search system","what":"The components of a typical e-commerce search system: an indexing pipeline keeping the index fresh, and a query path that retrieves, ranks and returns results.","steps":["Follow the indexing path from the product database to the search cluster.","Then follow a query from the app through to ranked results.","Click the ranking service to see what it adds beyond the search engine's own score."],"nodes":[{"id":"app","label":"Web / mobile app","kind":"client","col":0,"row":1,"desc":"Sends the query, filters, page cursor and user context."},{"id":"api","label":"Search API","kind":"service","col":1,"row":1,"desc":"Understands the query: spelling correction, synonyms, detecting filters like 'size 9' or a brand name. Calls retrieval and ranking."},{"id":"es","label":"Search cluster (shards + replicas)","kind":"search","col":2,"row":1,"desc":"Inverted index (BM25) and vector index. Scatter-gather across shards returns top candidates and facet counts."},{"id":"rank","label":"Ranking service","kind":"ml","col":2,"row":2,"desc":"Re-ranks the top few hundred candidates with a learning-to-rank model using popularity, personalization, stock and price features."},{"id":"db","label":"Product database","kind":"db","col":0,"row":0,"desc":"The source of truth for products, prices and stock."},{"id":"cdc","label":"Change stream (CDC / Kafka)","kind":"queue","col":1,"row":0,"desc":"Every product, price or stock change is published as an event."},{"id":"idx","label":"Indexer","kind":"worker","col":2,"row":0,"desc":"Builds search documents (joining product, category, reviews), computes embeddings, and updates the index within seconds."},{"id":"logs","label":"Click & purchase logs","kind":"storage","col":3,"row":2,"desc":"What users clicked and bought — training data for the ranking model and the basis for quality metrics."}],"edges":[["app","api","query"],["api","es","retrieve"],["api","rank","re-rank"],["db","cdc","changes",true],["cdc","idx","events",true],["idx","es","index"],["app","logs","clicks",true],["logs","rank","training",true]]}

## Keeping the index fresh

- **Near-real-time indexing:** stream database changes (change data capture) through a queue to an indexer; new documents become searchable within about a second (Elasticsearch's refresh interval).
- **Full rebuilds** when the schema or analysis changes: build a new index in the background, then switch an **alias** to it atomically (zero downtime).
- The search index is a **derived copy**: the database stays the source of truth, so the index can always be rebuilt.

## Making search feel smart

- **Typo tolerance:** fuzzy matching by edit distance (Algorithms track — "shoos" → "shoes"), usually limited to 1–2 edits and not on the first letters.
- **Autocomplete:** prefix matching with tries or n-gram indexes, ranked by popularity (System Design case study: typeahead).
- **Spelling correction** ("did you mean…") from query logs.
- **Facets** (filter counts like "Size 9 (342)") computed alongside results.
- **Query understanding:** detecting that "nike" is a brand filter and "under 3000" is a price range.

## Measuring quality

- **Offline:** human-judged relevance on a set of queries; metrics like **precision@k**, **recall@k**, **NDCG** (rewards relevant results appearing near the top) and **MRR**.
- **Online:** click-through rate, conversion, "zero-result" rate, query reformulation rate (people retyping means they didn't find it) — and **A/B tests** for every ranking change.

> [!RECAP]
> - Text is **analyzed** into terms (tokenize, normalize, stem, synonyms) identically at index and query time.
> - The **inverted index** maps terms → sorted, compressed postings lists; queries intersect or union them.
> - **BM25** scores relevance (term frequency with diminishing returns, rare-term weight, length normalization); production systems add business signals and **learning-to-rank** re-ranking.
> - **Hybrid** keyword + vector retrieval catches both exact terms and meaning.
> - Scale with **document-sharded** indexes, scatter-gather and replicas; watch tail latency.
> - Keep fresh with **CDC streaming** and alias-swapped rebuilds; measure with NDCG, CTR, zero-result rate and A/B tests.

> [!INTERVIEW] "Design search for an e-commerce site / Twitter / a document store" — cover indexing pipeline, inverted index, ranking (BM25 + signals + re-ranking), sharding and replication, freshness, autocomplete and typo tolerance, and how you'd measure quality.

::quiz {"q":"What does an inverted index map?","options":["Documents to their words","Each term to the list of documents containing it","Users to queries","Shards to replicas"],"answer":1,"explain":"Like the index at the back of a book."}

::quiz {"q":"Why does BM25 weight the term 'leather' more than 'red' in a product catalog?","options":["It's longer","It appears in fewer documents, so matching it is more informative (inverse document frequency)","Alphabetical order","It's a material"],"answer":1,"explain":"Rare terms distinguish documents better."}

::quiz {"q":"In a document-sharded search cluster, what limits query latency?","options":["The fastest shard","The slowest shard the query must wait for","The number of terms","The coordinator's disk"],"answer":1,"explain":"Scatter-gather waits for all shards, so tail latency dominates."}
