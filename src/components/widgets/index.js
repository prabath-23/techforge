// Registry: chapters embed these by name with  ::widget Name {props}
const mods = import.meta.glob('./*.vue', { eager: true })
export const WIDGETS = Object.fromEntries(Object.entries(mods).map(([p, m]) => [p.match(/\.\/(\w+)\.vue$/)[1], m.default]))

// Standalone labs shown on the Labs page
export const LAB_INDEX = [
  { name: 'SchedulerSim', track: 'OS', title: 'CPU scheduler' },
  { name: 'AddressSpace', track: 'OS', title: 'Process address space' },
  { name: 'PageTableWalk', track: 'OS', title: 'Page table walk + TLB' },
  { name: 'BuddyAllocator', track: 'OS', title: 'Buddy allocator' },
  { name: 'RaceCondition', track: 'OS', title: 'Race conditions & mutex' },
  { name: 'SubnetCalc', track: 'Net', title: 'Subnetting & routing' },
  { name: 'CongestionControl', track: 'Net', title: 'TCP congestion control' },
  { name: 'BigOChart', track: 'DSA', title: 'Growth rates' },
  { name: 'HashTableViz', track: 'DSA', title: 'Hash table' },
  { name: 'BstViz', track: 'DSA', title: 'BST vs AVL' },
  { name: 'HeapViz', track: 'DSA', title: 'Binary heap' },
  { name: 'LruCache', track: 'DSA', title: 'LRU cache' },
  { name: 'SortingViz', track: 'Algo', title: 'Sorting' },
  { name: 'BinarySearch', track: 'Algo', title: 'Binary search' },
  { name: 'GraphSearch', track: 'Algo', title: 'BFS / DFS / Dijkstra / A*' },
  { name: 'DpTable', track: 'Algo', title: 'Dynamic programming' },
  { name: 'HashRing', track: 'SD', title: 'Consistent hashing' },
  { name: 'LsmTree', track: 'SD', title: 'LSM-tree storage' },
  { name: 'RaftSim', track: 'SD', title: 'Raft consensus' },
  { name: 'TokenBucket', track: 'SD', title: 'Rate limiter' },
  { name: 'K8sReconcile', track: 'Cloud', title: 'Kubernetes control loop' },
  { name: 'GradientDescent', track: 'AI', title: 'Gradient descent' },
  { name: 'NeuralNet', track: 'AI', title: 'Neural net learns XOR' },
  { name: 'AttentionViz', track: 'AI', title: 'Self-attention' },
  { name: 'EmbeddingSpace', track: 'AI', title: 'Embeddings & retrieval' },
]
