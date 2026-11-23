// Loads every chapter markdown file at build time and exposes tracks + chapters.
import { TRACKS } from '../content/tracks.js'

const files = import.meta.glob('../content/**/*.md', { query: '?raw', import: 'default', eager: true })

function parseFront(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/)
  const meta = {}
  if (m) for (const line of m[1].split('\n')) { const i = line.indexOf(':'); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, '$1') }
  return { meta, body: m ? raw.slice(m[0].length) : raw }
}

export const CHAPTERS = {}
for (const [p, raw] of Object.entries(files)) {
  const [, track, file] = p.match(/content\/([^/]+)\/(.+)\.md$/)
  const slug = file.replace(/^\d+-/, '')
  const { meta, body } = parseFront(raw)
  ;(CHAPTERS[track] ||= []).push({ track, slug, file, title: meta.title || slug, summary: meta.summary || '', minutes: Math.max(3, Math.round(body.split(/\s+/).length / 220)), body })
}
for (const t in CHAPTERS) CHAPTERS[t].sort((a, b) => a.file.localeCompare(b.file))

export const tracks = TRACKS.map(t => ({ ...t, chapters: CHAPTERS[t.id] || [] }))
export const getTrack = id => tracks.find(t => t.id === id)
export const getChapter = (track, slug) => (CHAPTERS[track] || []).find(c => c.slug === slug)
export const allChapters = () => tracks.flatMap(t => t.chapters.map(c => ({ ...c, trackName: t.name, icon: t.icon })))
