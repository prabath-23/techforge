// Axon scraper API: aggregates engineering blogs (RSS/Atom), searches Hacker News,
// and extracts clean readable article text with Mozilla Readability.
import express from 'express'
import Parser from 'rss-parser'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import createDOMPurify from 'dompurify'
const purify = createDOMPurify(new JSDOM('').window)
purify.addHook('afterSanitizeAttributes', n => { if (n.tagName === 'A') { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener noreferrer') } })
import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns/promises'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import { SOURCES } from './sources.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json())
const UA = 'Mozilla/5.0 (compatible; AxonReader/1.0)'
const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': UA } })

// ---------- tiny TTL cache persisted to disk ----------
const CACHE_FILE = path.join(__dirname, 'cache.json')
let cache = {}
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) } catch {}
let saveTimer
const cached = async (key, ttlMs, fn) => {
  const hit = cache[key]
  if (hit && Date.now() - hit.t < ttlMs) return hit.v
  const v = await fn()
  cache[key] = { t: Date.now(), v }
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => fs.writeFile(CACHE_FILE, JSON.stringify(cache), () => {}), 1000)
  return v
}

// ---------- SSRF guard: only public http(s) hosts ----------
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224
  }
  const l = ip.toLowerCase()
  return l === '::1' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:127.')
}
async function assertPublicUrl(raw) {
  const u = new URL(raw)
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only http(s) URLs are allowed')
  const addrs = await dns.lookup(u.hostname, { all: true })
  if (addrs.some(a => isPrivateIp(a.address))) throw new Error('Private/internal addresses are blocked')
  return u
}

const stripHtml = s => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const normItem = (src, it) => ({
  title: it.title?.trim() || '(untitled)',
  url: it.link,
  date: it.isoDate || it.pubDate || null,
  author: it.creator || it.author || null,
  summary: /^\s*Article URL:/.test(it.contentSnippet || '') ? '' : stripHtml(it.contentSnippet || it.summary || it.content).slice(0, 320),
  source: src.name, sourceId: src.id, topics: src.topics,
})

async function fetchSource(src) {
  return cached('feed:' + src.id, 30 * 60e3, async () => {
    const feed = await parser.parseURL(src.feed)
    return feed.items.slice(0, 25).map(it => normItem(src, it))
  })
}

// ---------- routes ----------
app.get('/api/sources', (_req, res) => res.json(SOURCES))

// Aggregate feed: ?topics=os,distributed&sources=cloudflare,lwn&q=kernel
app.get('/api/feed', async (req, res) => {
  const topics = (req.query.topics || '').split(',').filter(Boolean)
  const ids = (req.query.sources || '').split(',').filter(Boolean)
  const q = (req.query.q || '').toLowerCase()
  const chosen = SOURCES.filter(s => (!ids.length || ids.includes(s.id)) && (!topics.length || s.topics.some(t => topics.includes(t))))
  const results = await Promise.allSettled(chosen.map(fetchSource))
  const errors = []
  let items = results.flatMap((r, i) => {
    if (r.status === 'fulfilled') return r.value
    errors.push({ source: chosen[i].name, error: String(r.reason?.message || r.reason) })
    return []
  })
  if (q) items = items.filter(i => (i.title + ' ' + i.summary).toLowerCase().includes(q))
  items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  res.json({ items: items.slice(0, 300), errors })
})

// Hacker News full-text search via the public Algolia API
app.get('/api/hn', async (req, res) => {
  try {
    const q = String(req.query.q || '')
    const sort = req.query.sort === 'date' ? 'search_by_date' : 'search'
    const data = await cached(`hn:${sort}:${q}`, 15 * 60e3, async () => {
      const r = await fetch(`https://hn.algolia.com/api/v1/${sort}?tags=story&hitsPerPage=40&query=${encodeURIComponent(q)}`)
      return r.json()
    })
    res.json(data.hits.filter(h => h.url).map(h => ({
      title: h.title, url: h.url, date: h.created_at, author: h.author,
      points: h.points, comments: h.num_comments, hn: `https://news.ycombinator.com/item?id=${h.objectID}`, source: 'Hacker News',
    })))
  } catch (e) { res.status(502).json({ error: e.message }) }
})

// arXiv papers search (Atom API)
app.get('/api/arxiv', async (req, res) => {
  try {
    const q = String(req.query.q || 'large language models')
    const items = await cached('arxiv:' + q, 60 * 60e3, async () => {
      const feed = await parser.parseURL(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&sortBy=submittedDate&max_results=30`)
      return feed.items.map(it => ({ title: it.title.replace(/\s+/g, ' '), url: it.link, date: it.isoDate, author: it.author, summary: stripHtml(it.summary || it.content).slice(0, 500), source: 'arXiv' }))
    })
    res.json(items)
  } catch (e) { res.status(502).json({ error: e.message }) }
})

// Extract the readable article body from any public URL
app.get('/api/article', async (req, res) => {
  try {
    const u = await assertPublicUrl(String(req.query.url))
    const art = await cached('art:' + u.href, 24 * 3600e3, async () => {
      const r = await fetch(u.href, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(20000) })
      if (!r.ok) throw new Error(`Upstream returned ${r.status}`)
      const html = await r.text()
      const dom = new JSDOM(html, { url: r.url })
      const parsed = new Readability(dom.window.document).parse()
      if (!parsed) throw new Error('Could not extract readable content')
      return { title: parsed.title, byline: parsed.byline, siteName: parsed.siteName, content: purify.sanitize(parsed.content, { FORBID_TAGS: ['style', 'form', 'iframe'], FORBID_ATTR: ['style'] }), length: parsed.length, url: r.url }
    })
    res.json(art)
  } catch (e) { res.status(422).json({ error: e.message }) }
})

// Production: serve the built Vue app
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const PORT = process.env.API_PORT || (process.env.NODE_ENV === 'production' && process.env.PORT) || 3001
app.listen(PORT, () => console.log(`Axon API on http://localhost:${PORT}`))
