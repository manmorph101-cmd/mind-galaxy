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
import type { GalaxyNode, GalaxyEdge } from '@/types'
import { initBgMusic } from '@/lib/bgMusic'

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

export default function GalaxyExperience() {
  const { setNodes, setEdges, setLoading, selectNode } = useGalaxyStore()
  const [addOpen, setAddOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)

  // 1. Initial Data Fetch & Audio Start
  useEffect(() => {
    initBgMusic()
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/nodes')
        const data = (await res.json()) as { nodes: GalaxyNode[]; edges: GalaxyEdge[] }
        setNodes(data.nodes)
        setEdges(data.edges)
      } catch (err) {
        console.error('Failed to load galaxy data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [setNodes, setEdges, setLoading])

  // 2. Camera Reset Dispatcher
  const handleResetCamera = useCallback(() => {
    selectNode(null)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mindgalaxy:resetCamera'))
    }
  }, [selectNode])

  // 3. Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
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

      {/* Cybernetic HUD Interface */}
      <HUD onAddNode={() => setAddOpen(true)} onShowList={() => setListOpen(true)} />

      {/* Holographic detail panel for selected star */}
      <NodeDetailPanel />

      {/* 2-Step Form modal to launch new nodes */}
      <AddNodeForm open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Skills & goals overview drawer */}
      <SkillsListPanel open={listOpen} onClose={() => setListOpen(false)} />

      {/* Bottom-right Space Controls (Reset view, sound, backup export/import) */}
      <SpaceControlsHUD onResetCamera={handleResetCamera} />

      {/* Synaptic Toast Notifications */}
      <ToastNotification />
    </main>
  )
}
