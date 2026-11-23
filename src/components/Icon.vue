<script setup>
// Single entry point for icons (Lucide). Only imported icons are bundled.
import {
  Cpu, Network, Boxes, Workflow, Server, Puzzle, Cloud, BrainCircuit, ShieldCheck, Home, Rss, FlaskConical, Search, Sun, Moon,
  Menu, ChevronRight, ChevronLeft, Check, X, BookOpen, Clock, Bookmark, BookmarkCheck, ExternalLink, RefreshCw, Newspaper,
  FileText, Link2, Flame, Layers, Sparkles, ArrowRight, Info, Star, AlertTriangle, Zap, History, CircleCheck, Hammer, Library, Filter, Target, Database, CircuitBoard, Lock, SquareTerminal, CalendarClock, PanelLeftClose, PanelLeftOpen, Maximize2,
} from 'lucide-vue-next'
const MAP = { cpu: Cpu, network: Network, boxes: Boxes, workflow: Workflow, server: Server, puzzle: Puzzle, cloud: Cloud, brain: BrainCircuit,
  shield: ShieldCheck, home: Home, rss: Rss, flask: FlaskConical, search: Search, sun: Sun, moon: Moon, menu: Menu, right: ChevronRight, left: ChevronLeft,
  check: Check, x: X, book: BookOpen, clock: Clock, bookmark: Bookmark, bookmarked: BookmarkCheck, external: ExternalLink, refresh: RefreshCw,
  news: Newspaper, file: FileText, link: Link2, flame: Flame, layers: Layers, sparkles: Sparkles, arrow: ArrowRight, info: Info, star: Star,
  alert: AlertTriangle, zap: Zap, history: History, done: CircleCheck, hammer: Hammer, library: Library, filter: Filter, target: Target, database: Database, chip: CircuitBoard, lock: Lock, terminal: SquareTerminal, planned: CalendarClock, panelClose: PanelLeftClose, panelOpen: PanelLeftOpen, maximize: Maximize2 }
defineProps({ name: { type: String, required: true }, size: { type: [Number, String], default: 18 }, stroke: { type: [Number, String], default: 2 } })
</script>

<template>
  <component :is="MAP[name] || Sparkles" :size="size" :stroke-width="stroke" aria-hidden="true" class="ico" />
</template>
