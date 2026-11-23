// Picks an illustrative icon for a diagram node from its label (or an explicit icon name).
import {
  Cpu, MemoryStick, HardDrive, Network, Wifi, Globe, Server, Database, Zap, Layers, Lock, Unlock, KeyRound, ShieldCheck, Clock, Timer,
  FileText, Folder, User, Users, Smartphone, Monitor, Laptop, Cloud, Box, Boxes, Package, MessageSquare, Mail, Send, Inbox, Search,
  Workflow, GitBranch, Settings, Power, Terminal, Code, Bug, AlertTriangle, CheckCircle2, XCircle, RefreshCw, ArrowLeftRight, Shuffle,
  ListOrdered, Gauge, Activity, BarChart3, Brain, Sparkles, Image, Video, Music, ShoppingCart, CreditCard, Wallet, MapPin, Car, Bell,
  Calendar, Ticket, Building2, Router, Cable, Radio, Repeat, Scale, Filter, Eye, PlayCircle, PauseCircle, Rocket, Wrench, Archive,
  BookOpen, Puzzle, Fingerprint, Shield, Hourglass, Split, Merge, Link, Webhook, Container, Ship, Truck, Coffee, Recycle,
} from 'lucide-vue-next'

const RULES = [
  [/\b(cpu|core|processor|register|alu|instruction)/i, Cpu], [/\b(ram|memory|heap|stack|page|frame|tlb|cache line|address)/i, MemoryStick],
  [/\b(disk|ssd|hdd|nvme|storage|block|sector|swap|journal|wal|log\b)/i, HardDrive], [/\b(database|db\b|sql|postgres|mysql|table|row|index|ledger|sstable|memtable)/i, Database],
  [/\b(cache|redis|memcache|cdn)/i, Zap], [/\b(queue|kafka|topic|stream|broker|event|pub\/?sub|outbox)/i, Inbox],
  [/\b(lock|mutex|semaphore|critical)/i, Lock], [/\b(key|token|secret|certificate|cert\b|tls|ssl|crypto|signature|sign)/i, KeyRound],
  [/\b(secure|security|auth|permission|firewall|guard|protect|privilege|ring 0|kernel mode)/i, ShieldCheck], [/\b(timer|time|clock|deadline|ttl|timeout|tick)/i, Timer],
  [/\b(file|document|doc\b|pdf|chunk|text)/i, FileText], [/\b(folder|directory|inode|filesystem|file system|vfs)/i, Folder],
  [/\b(user|customer|person|member|human|driver|rider|player)/i, User], [/\b(users|team|group|clients)/i, Users],
  [/\b(phone|mobile|app\b|android|ios)/i, Smartphone], [/\b(browser|client|screen|display|ui\b|frontend|monitor)/i, Monitor],
  [/\b(router|gateway|switch|nat\b|hub\b)/i, Router], [/\b(wi-?fi|radio|wireless|5g|lte)/i, Wifi], [/\b(internet|dns|web|http|url|domain|global|region)/i, Globe],
  [/\b(network|packet|socket|tcp|udp|ip\b|ethernet|link|nic\b|frame)/i, Network], [/\b(cable|fiber|wire|physical)/i, Cable],
  [/\b(load balancer|balanc|lb\b|proxy|ingress)/i, Scale], [/\b(server|service|api|backend|host|node|worker|instance)/i, Server],
  [/\b(cloud|aws|gcp|azure|s3|bucket|object)/i, Cloud], [/\b(container|docker|image|pod)/i, Container], [/\b(kubernetes|k8s|cluster|orchestr)/i, Ship],
  [/\b(package|artifact|build|bundle|module)/i, Package], [/\b(message|chat|reply|comment)/i, MessageSquare], [/\b(email|mail|smtp)/i, Mail], [/\b(notif|alert|push)/i, Bell],
  [/\b(search|lookup|find|retriev|query)/i, Search], [/\b(model|llm|neural|ai\b|transformer|embedding|attention|ml\b|predict)/i, Brain],
  [/\b(gpu|accelerat|tensor)/i, Sparkles], [/\b(video|stream|camera)/i, Video], [/\b(audio|music|sound)/i, Music], [/\b(photo|picture|thumbnail)/i, Image],
  [/\b(payment|charge|card|pay\b|refund|money|billing)/i, CreditCard], [/\b(wallet|balance)/i, Wallet], [/\b(cart|order|checkout|shop)/i, ShoppingCart],
  [/\b(location|map|geo|nearby|gps)/i, MapPin], [/\b(car|vehicle|ride|trip|parking)/i, Car], [/\b(ticket|booking|seat|show)/i, Ticket], [/\b(calendar|schedule|cron|job)/i, Calendar],
  [/\b(boot|power|reset|start|firmware|bios|uefi)/i, Power], [/\b(terminal|shell|command|syscall|system call)/i, Terminal], [/\b(code|program|function|compile|source)/i, Code],
  [/\b(error|fault|crash|fail|panic|exception|segfault|attack|injection)/i, AlertTriangle], [/\b(success|done|commit|confirm|ok\b|accept|valid)/i, CheckCircle2],
  [/\b(reject|deny|drop|lost|abort|kill)/i, XCircle], [/\b(retry|repeat|loop|cycle|again|recur)/i, RefreshCw], [/\b(replica|replicat|copy|sync|mirror)/i, Repeat],
  [/\b(shard|partition|split|divide)/i, Split], [/\b(merge|combine|join|aggregate|compact)/i, Merge], [/\b(rate|limit|throttl|bucket|budget)/i, Gauge],
  [/\b(metric|monitor|observ|trace|dashboard|stat)/i, Activity], [/\b(test|eval|check|verify|inspect)/i, Eye], [/\b(deploy|release|ship|launch|canary|rollout)/i, Rocket],
  [/\b(config|setting|setup|init|configure)/i, Settings], [/\b(sort|order|rank|priority|heap)/i, ListOrdered], [/\b(hash|random|shuffle)/i, Shuffle],
  [/\b(graph|tree|branch|dag|git)/i, GitBranch], [/\b(learn|train|gradient|backprop)/i, Brain], [/\b(wait|block|sleep|idle|pending)/i, Hourglass],
  [/\b(run|running|execute|play)/i, PlayCircle], [/\b(pause|stop)/i, PauseCircle], [/\b(webhook|callback)/i, Webhook], [/\b(send|publish|emit|request)/i, Send],
  [/\b(receive|consume|subscri)/i, Inbox], [/\b(design|pattern|class|interface|object)/i, Puzzle], [/\b(identity|login|passkey|biometric)/i, Fingerprint],
  [/\b(archive|backup|snapshot)/i, Archive], [/\b(library|book|read)/i, BookOpen], [/\b(building|datacenter|office)/i, Building2], [/\b(bug|debug)/i, Bug],
  [/\b(tool|fix|repair|maintenance)/i, Wrench], [/\b(garbage|gc\b|reclaim|free\b|evict)/i, Recycle], [/\b(delivery|shipping|courier)/i, Truck],
]
const NAMED = { cpu: Cpu, memory: MemoryStick, disk: HardDrive, database: Database, cache: Zap, queue: Inbox, lock: Lock, key: KeyRound, shield: ShieldCheck,
  timer: Timer, file: FileText, folder: Folder, user: User, users: Users, phone: Smartphone, monitor: Monitor, laptop: Laptop, router: Router, globe: Globe,
  network: Network, server: Server, cloud: Cloud, container: Container, box: Box, boxes: Boxes, brain: Brain, search: Search, alert: AlertTriangle, check: CheckCircle2,
  x: XCircle, refresh: RefreshCw, power: Power, terminal: Terminal, code: Code, layers: Layers, scale: Scale, gauge: Gauge, activity: Activity, send: Send,
  inbox: Inbox, split: Split, merge: Merge, link: Link, workflow: Workflow, rocket: Rocket, coffee: Coffee, unlock: Unlock, filter: Filter, chart: BarChart3 }

export function iconFor(label = '', explicit) {
  if (explicit && NAMED[explicit]) return NAMED[explicit]
  for (const [re, ic] of RULES) if (re.test(label)) return ic
  return Box
}
export const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444', '#84cc16', '#06b6d4']
export const KIND_ICON = { client: Monitor, cdn: Globe, lb: Scale, gateway: ShieldCheck, service: Server, worker: Workflow, cache: Zap, db: Database,
  queue: Inbox, storage: Cloud, search: Search, external: Link, ml: Brain }
