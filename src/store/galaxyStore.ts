import { create } from 'zustand'
import type { GalaxyNode, GalaxyEdge, BrainUser } from '@/types'
import { CELESTIAL_COLORS } from '@/lib/colors'

export const COLORS = CELESTIAL_COLORS.map((c) => c.hex)

const categoryColorMap: Record<string, string> = {}

export function getCategoryColor(cat: string): string {
  const key = cat.trim().toLowerCase()
  if (!categoryColorMap[key]) {
    const used = Object.values(categoryColorMap)
    const avail = COLORS.filter((c) => !used.includes(c))
    categoryColorMap[key] = avail.length
      ? avail[0]
      : COLORS[Math.floor(Math.random() * COLORS.length)]
  }
  return categoryColorMap[key]
}

export interface ToastItem {
  id: string
  message: string
  type?: 'success' | 'info' | 'streak'
}

interface Camera {
  x: number
  y: number
  zoom: number
}

interface GalaxyStore {
  // Multi-user / Brain profile
  currentUser: BrainUser | null
  allUsers: BrainUser[]
  showBrainSwitcher: boolean

  // Constellation data
  nodes: GalaxyNode[]
  edges: GalaxyEdge[]
  camera: Camera
  selectedNodeId: string | null
  isLoading: boolean
  toasts: ToastItem[]

  // Actions
  setCurrentUser: (user: BrainUser | null) => void
  setAllUsers: (users: BrainUser[]) => void
  setShowBrainSwitcher: (show: boolean) => void
  setNodes: (nodes: GalaxyNode[]) => void
  setEdges: (edges: GalaxyEdge[]) => void
  addNode: (node: GalaxyNode) => void
  addNodes: (nodes: GalaxyNode[]) => void
  addEdge: (edge: GalaxyEdge) => void
  addEdges: (edges: GalaxyEdge[]) => void
  updateNode: (id: string, updates: Partial<GalaxyNode>) => void
  removeNode: (id: string) => void
  setCamera: (camera: Partial<Camera>) => void
  selectNode: (id: string | null) => void
  setLoading: (loading: boolean) => void
  getSelectedNode: () => GalaxyNode | null
  addToast: (message: string, type?: 'success' | 'info' | 'streak') => void
  removeToast: (id: string) => void
}

export const useGalaxyStore = create<GalaxyStore>((set, get) => ({
  currentUser: null,
  allUsers: [],
  showBrainSwitcher: false,

  nodes: [],
  edges: [],
  camera: { x: 0, y: 0, zoom: 1 },
  selectedNodeId: null,
  isLoading: false,
  toasts: [],

  setCurrentUser: (currentUser) => set({ currentUser }),
  setAllUsers: (allUsers) => set({ allUsers }),
  setShowBrainSwitcher: (showBrainSwitcher) => set({ showBrainSwitcher }),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) =>
    set((s) => ({ nodes: [...s.nodes, node] })),

  addNodes: (newNodes) =>
    set((s) => ({ nodes: [...s.nodes, ...newNodes] })),

  addEdge: (edge) =>
    set((s) => ({ edges: [...s.edges, edge] })),

  addEdges: (newEdges) =>
    set((s) => ({ edges: [...s.edges, ...newEdges] })),

  updateNode: (id, updates) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),

  removeNode: (id) =>
    set((s) => {
      const toDeleteIds = new Set<string>([id])
      s.nodes.forEach((n) => {
        if (n.parentId === id || n.skillId === id) toDeleteIds.add(n.id)
      })
      return {
        nodes: s.nodes.filter((n) => !toDeleteIds.has(n.id)),
        edges: s.edges.filter((e) => !toDeleteIds.has(e.fromId) && !toDeleteIds.has(e.toId)),
        selectedNodeId: toDeleteIds.has(s.selectedNodeId ?? '') ? null : s.selectedNodeId,
      }
    }),

  setCamera: (camera) =>
    set((s) => ({ camera: { ...s.camera, ...camera } })),

  selectNode: (id) => set({ selectedNodeId: id }),

  setLoading: (isLoading) => set({ isLoading }),

  getSelectedNode: () => {
    const { nodes, selectedNodeId } = get()
    return nodes.find((n) => n.id === selectedNodeId) ?? null
  },

  addToast: (message, type = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      get().removeToast(id)
    }, 3800)
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))
