'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useGalaxyStore } from '@/store/galaxyStore'
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
  } = useGalaxyStore()

  const [addOpen, setAddOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)

  // 1. Load Nodes & Edges for a specific Brain
  const loadGalaxyForUser = useCallback(
    async (userId: string) => {
      setLoading(true)
      try {
        const res = await fetch(`/api/nodes?userId=${encodeURIComponent(userId)}`)
        const data = (await res.json()) as { nodes: GalaxyNode[]; edges: GalaxyEdge[] }
        setNodes(data.nodes || [])
        setEdges(data.edges || [])
      } catch (err) {
        console.error('Failed to load galaxy data for user:', err)
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

  // 3. Initial Boot: Load Users list & Restore Last Active Brain or default to root
  useEffect(() => {
    initBgMusic()
    const initApp = async () => {
      try {
        const res = await fetch('/api/users')
        const data = (await res.json()) as { users: BrainUser[] }
        const users = data.users || []
        setAllUsers(users)

        // Check localStorage for previously selected brain
        let savedUser: BrainUser | null = null
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(ACTIVE_USER_STORAGE_KEY)
          if (raw) {
            try {
              savedUser = JSON.parse(raw)
            } catch {
              savedUser = null
            }
          }
        }

        // If saved user exists in current users list, reconnect to it
        if (savedUser && users.some((u) => u.id === savedUser?.id)) {
          setCurrentUser(savedUser)
          loadGalaxyForUser(savedUser.id)
        } else {
          // If no saved user, default to 'root' (which has all existing data!)
          const rootUser = users.find((u) => u.id === 'root') || users[0]
          if (rootUser) {
            setCurrentUser(rootUser)
            loadGalaxyForUser(rootUser.id)
            if (typeof window !== 'undefined') {
              localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(rootUser))
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize app users:', err)
      }
    }

    initApp()
  }, [setAllUsers, setCurrentUser, loadGalaxyForUser])

  // 4. Camera Reset Dispatcher
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

      {/* Bottom-right Space Controls (Reset view, backup export/import) */}
      <SpaceControlsHUD onResetCamera={handleResetCamera} />

      {/* "Create Your Brain" Landing Screen / Profile Switcher Modal */}
      <CreateBrainModal onSelectUser={handleSelectUser} />

      {/* Synaptic Toast Notifications */}
      <ToastNotification />
    </main>
  )
}
