// Markdown → segments. Lines of the form  ::widget Name {"json":"props"}  or  ::quiz {...}
// become interactive Vue components; everything else is rendered as HTML.
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/common'

const md = new MarkdownIt({
  html: true, linkify: true, typographer: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang }).value}</code></pre>`
    return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`
  },
})

md.linkify.set({ fuzzyLink: false })

export const slugify = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')

// heading ids for the in-chapter table of contents
md.renderer.rules.heading_open = (tokens, i, opts, env, self) => {
  const text = tokens[i + 1].content
  tokens[i].attrSet('id', slugify(text))
  return self.renderToken(tokens, i, opts)
}

const svg = d => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const ICONS = {
  NOTE: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
  INTERVIEW: svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  WARN: svg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>'),
  DEEP: svg('<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>'),
  STORY: svg('<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'),
  ANALOGY: svg('<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>'),
  EXAMPLE: svg('<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/>'),
  TRY: svg('<path d="M9 3h6M10 9V3M14 9V3"/><path d="M6.5 21h11a2 2 0 0 0 1.7-3L14 9h-4l-5.2 9a2 2 0 0 0 1.7 3z"/>'),
  RECAP: svg('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
  TERM: svg('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>'),
  HISTORY: svg('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>'),
}
// > [!NOTE] / [!INTERVIEW] / [!DEEP] callouts
const CALLOUT = /^<blockquote>\s*<p>\[!(\w+)\]\s*/
function callouts(html) {
  return html.replace(/<blockquote>\s*<p>\[!(\w+)\]\s*([\s\S]*?)<\/blockquote>/g, (_, kind, rest) =>
    `<div class="callout ${kind.toLowerCase()}"><span class="callout-ico">${ICONS[kind] || ICONS.NOTE}</span><div class="callout-k">${{ NOTE: 'Note', INTERVIEW: 'Interview angle', DEEP: 'Going deeper', WARN: 'Common mistake', HISTORY: 'A bit of history', STORY: 'Story', ANALOGY: 'Think of it like this', EXAMPLE: 'Real-world example', TRY: 'Try it yourself', RECAP: 'In one minute', TERM: 'Key term' }[kind] || kind}</div><p>${rest}</div>`)
}

export function renderChapter(body) {
  const segs = []
  let buf = []
  const flush = () => { if (buf.length) { segs.push({ type: 'html', html: callouts(md.render(buf.join('\n'))) }); buf = [] } }
  let inFence = false
  for (const line of body.split('\n')) {
    if (line.startsWith('```')) inFence = !inFence
    const m = !inFence && line.match(/^::(widget|quiz)\s+(\w+)?\s*(\{.*\})?\s*$/)
    if (m) {
      flush()
      let props = {}
      try { props = m[3] ? JSON.parse(m[3]) : {} } catch (e) { props = { error: 'bad JSON: ' + e.message } }
      segs.push(m[1] === 'quiz' ? { type: 'quiz', props } : { type: 'widget', name: m[2], props })
    } else buf.push(line)
  }
  flush()
  const toc = [...body.matchAll(/^(##|###) (.+)$/gm)].map(([, h, t]) => ({ level: h.length, text: t.replace(/[*`]/g, ''), id: slugify(t.replace(/[*`]/g, '')) }))
  return { segs, toc }
}

// ---- cheat sheets: distilled from each chapter's own recap, lesson key ideas, tables, quizzes ----
export function cheatsheet(body) {
  const lines = body.split('\n')
  const out = { recap: [], interview: '', tables: [], keys: [], quiz: [], terms: [] }
  let section = '', inFence = false
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (l.startsWith('```')) { inFence = !inFence; continue }
    if (inFence) continue
    const h = l.match(/^##\s+(.+)/); if (h) section = h[1].replace(/[*`]/g, '')
    if (/^> \[!RECAP\]/.test(l)) { let j = i + 1; while (j < lines.length && lines[j].startsWith('>')) { const b = lines[j].replace(/^>\s?-?\s?/, '').trim(); if (b) out.recap.push(b); j++ } i = j - 1; continue }
    if (/^> \[!INTERVIEW\]/.test(l)) { out.interview = l.replace(/^> \[!INTERVIEW\]\s*/, ''); continue }
    if (l.startsWith('|') && !(lines[i - 1] || '').startsWith('|')) {
      let j = i; const rows = []; while (j < lines.length && lines[j].startsWith('|')) rows.push(lines[j++])
      const html = md.render(rows.join('\n'))
      if (/glossary|term/i.test(section) || /\|\s*Term\s*\|/i.test(rows[0])) out.terms.push(html); else out.tables.push({ section, html })
      i = j - 1; continue
    }
    const w = l.match(/^::widget Scene (\{.*\})\s*$/)
    if (w) { try { const p = JSON.parse(w[1]); for (const s of p.steps || []) if (s.note?.kind === 'key') out.keys.push({ lesson: p.title, text: s.note.text }) } catch {} }
    const q = l.match(/^::quiz (\{.*\})\s*$/)
    if (q) { try { const p = JSON.parse(q[1]); out.quiz.push({ q: p.q, a: p.options[p.answer], why: p.explain }) } catch {} }
  }
  const inline = s => md.renderInline(s)
  out.recap = out.recap.map(inline); out.interview = out.interview && inline(out.interview)
  return out
}
