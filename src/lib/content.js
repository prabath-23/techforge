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
  // every Scene embedded in a chapter is one interactive lesson of that module
  const lessons = [...body.matchAll(/^::widget Scene (.+)$/gm)].map(m => { try { const j = JSON.parse(m[1]); return { title: j.title, steps: j.steps.length } } catch { return null } }).filter(Boolean)
  // study time = reading (prose only, ~220 wpm) + interactive steps (~25 s each) + quiz questions (~40 s each)
  const prose = body.split('\n').filter(l => !l.startsWith('::')).join(' ')
  const readMin = Math.max(2, Math.round(prose.split(/\s+/).length / 220))
  const lessonMin = Math.round(lessons.reduce((n, l) => n + l.steps, 0) * 25 / 60)
  const quizMin = Math.round((body.match(/^::quiz /gm) || []).length * 40 / 60)
  ;(CHAPTERS[track] ||= []).push({ track, slug, file, title: meta.title || slug, summary: meta.summary || '', minutes: readMin + lessonMin + quizMin, readMin, lessonMin, quizMin, body, lessons })
}
for (const t in CHAPTERS) CHAPTERS[t].sort((a, b) => a.file.localeCompare(b.file))

export const tracks = TRACKS.map(t => ({ ...t, chapters: CHAPTERS[t.id] || [] }))
export const getTrack = id => tracks.find(t => t.id === id)
export const getChapter = (track, slug) => (CHAPTERS[track] || []).find(c => c.slug === slug)
export const allChapters = () => tracks.flatMap(t => t.chapters.map(c => ({ ...c, trackName: t.name, icon: t.icon })))

// 204 → "3h 24m", 45 → "45m", 120 → "2h"
export const fmtTime = min => { min = Math.round(min); if (min < 60) return `${min}m`; const h = Math.floor(min / 60), m = min % 60; return m ? `${h}h ${m}m` : `${h}h` }
export const trackMinutes = t => t.chapters.reduce((n, c) => n + c.minutes, 0)
