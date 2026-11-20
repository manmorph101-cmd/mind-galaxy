'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  useGalaxyStore,
  loadGalaxyFromLocalStorage,
  saveGalaxyToLocalStorage,
} from '@/store/galaxyStore'
import HUD from '@/components/galaxy/HUD'
import NodeDetailPanel from '@/components/panels/NodeDetailPanel'
import AddNodeForm from '@/components/panels/AddNodeForm'
import SkillsListPanel from '@/components/panels/SkillsListPanel'
import ToastNotification from '@/components/ui/ToastNotification'
import SpaceControlsHUD from '@/components/galaxy/SpaceControlsHUD'
import CreateBrainModal from '@/components/galaxy/CreateBrainModal'
import { initBgMusic } from '@/lib/bgMusic'
import type { GalaxyNode, GalaxyEdge, BrainUser } from '@/types'

// Dynamic import with SSR off for WebGL Three.js canvas
const CosmicSpace3D = dynamic(() => import('@/components/galaxy/CosmicSpace3D'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-black text-white">
      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin mb-4" />
      <p className="text-xs tracking-[0.25em] uppercase text-white/40 font-mono animate-pulse">
        ✦ Awakening Consciousness Space...
      </p>
    </div>
  ),
})

const ACTIVE_USER_STORAGE_KEY = 'mind_galaxy_active_user'

export default function GalaxyExperience() {
  const {
    currentUser,
    setCurrentUser,
    setAllUsers,
    setNodes,
    setEdges,
    setLoading,
    selectNode,
    clearGalaxyState,
  } = useGalaxyStore()

  const [addOpen, setAddOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)

  // 1. Load Nodes & Edges for a specific Brain
  const loadGalaxyForUser = useCallback(
    async (userId: string) => {
      // Step A: Immediately load from LocalStorage (0ms latency, zero data loss)
      const cached = loadGalaxyFromLocalStorage(userId)
      if (cached && cached.nodes.length > 0) {
        setNodes(cached.nodes)
        setEdges(cached.edges)
        setLoading(false)
      } else {
        setLoading(true)
      }

      // Step B: Query server to sync
      try {
        const res = await fetch(`/api/nodes?userId=${encodeURIComponent(userId)}`)
        if (res.ok) {
          const serverData = (await res.json()) as { nodes: GalaxyNode[]; edges: GalaxyEdge[] }
          const serverNodes = serverData.nodes || []
          const serverEdges = serverData.edges || []

          // SCENARIO 1: Server container cold restart wiped /tmp (0 nodes returned),
          // but client HAS cached nodes! Re-seed server immediately to heal it.
          if (cached && cached.nodes.length > 0 && serverNodes.length === 0) {
            console.log('Server cold start detected. Re-seeding server from client local storage...')
            await fetch('/api/nodes', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, nodes: cached.nodes, edges: cached.edges }),
            })
            return
          }

          // SCENARIO 2: Local cache has MORE nodes than server (offline additions)
          if (cached && cached.nodes.length > serverNodes.length) {
            console.log('Local client has newer nodes. Syncing to server...')
            await fetch('/api/nodes', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, nodes: cached.nodes, edges: cached.edges }),
            })
            return
          }

          // SCENARIO 3: Server has newer/more nodes, or local cache was empty
          if (serverNodes.length > 0 || !cached || cached.nodes.length === 0) {
            setNodes(serverNodes)
            setEdges(serverEdges)
            saveGalaxyToLocalStorage(userId, serverNodes, serverEdges)
          }
        }
      } catch (err) {
        console.warn('Server sync failed, running in offline/local mode:', err)
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setNodes, setEdges]
  )

  // 2. Select / Switch User
  const handleSelectUser = useCallback(
    (user: BrainUser) => {
      setCurrentUser(user)
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(user))
      }
      loadGalaxyForUser(user.id)
      selectNode(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mindgalaxy:resetCamera'))
      }
    },
    [setCurrentUser, loadGalaxyForUser, selectNode]
  )

  // 3. Initial Boot: Restore Last Active Brain from LocalStorage
  useEffect(() => {
    initBgMusic()
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(ACTIVE_USER_STORAGE_KEY)
      if (raw) {
        try {
          const savedUser: BrainUser = JSON.parse(raw)
          if (savedUser && savedUser.id) {
            setCurrentUser(savedUser)
            loadGalaxyForUser(savedUser.id)
            return
          }
        } catch {
          // ignore invalid json
        }
      }
      // If no saved user, stay in login state (pure black screen)
      setCurrentUser(null)
    }
  }, [setCurrentUser, loadGalaxyForUser])

  // 4. Logout / Exit User handler
  const handleLogout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY)
    }
    setCurrentUser(null)
    clearGalaxyState()
  }, [setCurrentUser, clearGalaxyState])

  // 5. Camera Reset Dispatcher
  const handleResetCamera = useCallback(() => {
    selectNode(null)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mindgalaxy:resetCamera'))
    }
  }, [selectNode])

  // 5. Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      if (isInput) return

      if (e.key === 'Escape') {
        setAddOpen(false)
        setListOpen(false)
        selectNode(null)
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setAddOpen(true)
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        setListOpen((prev) => !prev)
      } else if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        handleResetCamera()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleResetCamera, selectNode])

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D Cosmic Space with Starfield, Origin Core, and Synaptic Neurons */}
      <CosmicSpace3D />

      {/* Cybernetic HUD Interface with Active Brain Capsule */}
      <HUD onAddNode={() => setAddOpen(true)} onShowList={() => setListOpen(true)} />

      {/* Holographic detail panel for selected star */}
      <NodeDetailPanel />

      {/* 2-Step Form modal to launch new nodes */}
      <AddNodeForm open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Skills & goals overview drawer */}
      <SkillsListPanel open={listOpen} onClose={() => setListOpen(false)} />

      {/* Bottom-right Space Controls (Reset view, sound, backup export/import, exit) */}
      <SpaceControlsHUD onResetCamera={handleResetCamera} onLogout={handleLogout} />

      {/* "Create Your Brain" Landing Screen / Profile Switcher Modal */}
      <CreateBrainModal onSelectUser={handleSelectUser} />

      {/* Synaptic Toast Notifications */}
      <ToastNotification />
    </main>
  )
}
