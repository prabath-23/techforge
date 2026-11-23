# Axon

A book-length, first-principles engineering curriculum with interactive simulations and a live tech-article library.

## Run

```bash
npm install
npm run dev        # Vue app on http://localhost:5173 + scraper API on :3001
npm start          # production: build, then serve app + API from one Node process (PORT)
```

## What's inside

- **9 tracks, 68 chapters (~104k words):** Operating Systems, Networking, Data Structures, Algorithms, System Design (HLD, including 20 case studies), Low-Level Design (15 machine-coding case studies), Cloud & DevOps (including Docker and Kubernetes), AI & LLMs (including RAG and MCP), Engineering Practices.
- **25 interactive labs** (`src/components/widgets/`), embedded in chapters and collected on the Labs page.
- **Quizzes and progress tracking** (stored in the browser).
- **Tech Library** (`server/`): RSS/Atom aggregation over 24 engineering sources, Hacker News and arXiv search, and Readability-based article extraction. Extracted HTML is sanitized with DOMPurify, and requests to private network addresses are blocked to prevent SSRF.

## Adding content

Chapters are Markdown files in `src/content/<track>/NN-slug.md`, with frontmatter fields `title` and `summary`. Inside a chapter you can embed:

```text
::widget Stepper {"type":"flow","nodes":[["Label","Explanation"]]}
::widget Sequence {"actors":["A","B"],"msgs":[[0,1,"msg","explanation"]]}
::quiz {"q":"Question?","options":["a","b"],"answer":1,"explain":"Why."}
> [!INTERVIEW] / [!NOTE] / [!DEEP] / [!WARN] / [!HISTORY] callouts
```

To add a Library source, append an entry to `server/sources.js`.
