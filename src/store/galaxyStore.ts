import { create } from 'zustand'
import type { GalaxyNode, GalaxyEdge, BrainUser } from '@/types'
import { CELESTIAL_COLORS } from '@/lib/colors'
import { isAudioMuted, setAudioMuted } from '@/lib/sound'

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

// ── BULLETPROOF LOCALSTORAGE CACHING & OFFLINE-FIRST PERSISTENCE ──
const ACTIVE_USER_KEY = 'mind_galaxy_active_user'

export function getActiveUserId(): string {
  if (typeof window === 'undefined') return 'root'
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY)
    if (raw) {
      const u = JSON.parse(raw)
      if (u && u.id) return u.id
    }
  } catch {}
  return 'root'
}

export function saveGalaxyToLocalStorage(
  userId: string,
  nodes: GalaxyNode[],
  edges: GalaxyEdge[]
) {
  if (typeof window === 'undefined' || !userId) return
  try {
    const payload = {
      userId,
      nodes,
      edges,
      updatedAt: Date.now(),
    }
    const serialized = JSON.stringify(payload)
    localStorage.setItem(`mind_galaxy_data_${userId}`, serialized)
    localStorage.setItem(`mind_galaxy_snapshot_${userId}`, serialized)
  } catch (err) {
    console.warn('LocalStorage save error:', err)
  }
}

export function loadGalaxyFromLocalStorage(
  userId: string
): { nodes: GalaxyNode[]; edges: GalaxyEdge[]; updatedAt: number } | null {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const raw = localStorage.getItem(`mind_galaxy_data_${userId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.nodes)) {
        return {
          nodes: parsed.nodes,
          edges: Array.isArray(parsed.edges) ? parsed.edges : [],
          updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
        }
      }
    }
    const rawSnap = localStorage.getItem(`mind_galaxy_snapshot_${userId}`)
    if (rawSnap) {
      const parsedSnap = JSON.parse(rawSnap)
      if (parsedSnap && Array.isArray(parsedSnap.nodes)) {
        return {
          nodes: parsedSnap.nodes,
          edges: Array.isArray(parsedSnap.edges) ? parsedSnap.edges : [],
          updatedAt: typeof parsedSnap.updatedAt === 'number' ? parsedSnap.updatedAt : 0,
        }
      }
    }
  } catch (err) {
    console.warn('LocalStorage load error:', err)
  }
  return null
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
  soundMuted: boolean

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
  clearGalaxyState: () => void
  setCamera: (camera: Partial<Camera>) => void
  selectNode: (id: string | null) => void
  setLoading: (loading: boolean) => void
  getSelectedNode: () => GalaxyNode | null
  addToast: (message: string, type?: 'success' | 'info' | 'streak') => void
  removeToast: (id: string) => void
  toggleSound: () => void
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
  soundMuted: typeof window !== 'undefined' ? isAudioMuted() : false,

  setCurrentUser: (currentUser) => set({ currentUser }),
  setAllUsers: (allUsers) => set({ allUsers }),
  setShowBrainSwitcher: (showBrainSwitcher) => set({ showBrainSwitcher }),

  setNodes: (nodes) => {
    set({ nodes })
    const user = get().currentUser
    if (user?.id) {
      saveGalaxyToLocalStorage(user.id, nodes, get().edges)
    }
  },

  setEdges: (edges) => {
    set({ edges })
    const user = get().currentUser
    if (user?.id) {
      saveGalaxyToLocalStorage(user.id, get().nodes, edges)
    }
  },

  addNode: (node) =>
    set((s) => {
      const nextNodes = [...s.nodes, node]
      const user = s.currentUser
      if (user?.id) {
        saveGalaxyToLocalStorage(user.id, nextNodes, s.edges)
      }
      return { nodes: nextNodes }
    }),

  addNodes: (newNodes) =>
    set((s) => {
      const nextNodes = [...s.nodes, ...newNodes]
      const user = s.currentUser
      if (user?.id) {
        saveGalaxyToLocalStorage(user.id, nextNodes, s.edges)
      }
      return { nodes: nextNodes }
    }),

  addEdge: (edge) =>
    set((s) => {
      const nextEdges = [...s.edges, edge]
      const user = s.currentUser
      if (user?.id) {
        saveGalaxyToLocalStorage(user.id, s.nodes, nextEdges)
      }
      return { edges: nextEdges }
    }),

  addEdges: (newEdges) =>
    set((s) => {
      const nextEdges = [...s.edges, ...newEdges]
      const user = s.currentUser
      if (user?.id) {
        saveGalaxyToLocalStorage(user.id, s.nodes, nextEdges)
      }
      return { edges: nextEdges }
    }),

  updateNode: (id, updates) =>
    set((s) => {
      const nextNodes = s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n))
      const user = s.currentUser
      if (user?.id) {
        saveGalaxyToLocalStorage(user.id, nextNodes, s.edges)
      }
      return { nodes: nextNodes }
    }),

  removeNode: (id) =>
    set((s) => {
      const toDeleteIds = new Set<string>([id])
      s.nodes.forEach((n) => {
        if (n.parentId === id || n.skillId === id) toDeleteIds.add(n.id)
      })
      const nextNodes = s.nodes.filter((n) => !toDeleteIds.has(n.id))
      const nextEdges = s.edges.filter((e) => !toDeleteIds.has(e.fromId) && !toDeleteIds.has(e.toId))
      const user = s.currentUser
      if (user?.id) {
        saveGalaxyToLocalStorage(user.id, nextNodes, nextEdges)
      }
      return {
        nodes: nextNodes,
        edges: nextEdges,
        selectedNodeId: toDeleteIds.has(s.selectedNodeId ?? '') ? null : s.selectedNodeId,
      }
    }),

  clearGalaxyState: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
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

  toggleSound: () => {
    const next = !get().soundMuted
    setAudioMuted(next)
    set({ soundMuted: next })
  },
}))
