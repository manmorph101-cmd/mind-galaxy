'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass,
  Volume2,
  VolumeX,
  Music,
  Download,
  Upload,
  RotateCcw,
  HelpCircle,
  X,
  Trash2,
  Sparkles,
} from 'lucide-react'
import { useGalaxyStore } from '@/store/galaxyStore'
import { playSelectSound, getSoundVolume, setSoundVolume } from '@/lib/sound'
import { isBgMusicEnabled, toggleBgMusic, getBgMusicVolume, setBgMusicVolume } from '@/lib/bgMusic'

interface SpaceControlsHUDProps {
  onResetCamera: () => void
}

export default function SpaceControlsHUD({ onResetCamera }: SpaceControlsHUDProps) {
  const { nodes, edges, soundMuted, toggleSound, addToast, setNodes, setEdges } = useGalaxyStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [volume, setVolume] = useState(() => (typeof window !== 'undefined' ? Math.round(getSoundVolume() * 100) : 14))
  const [bgMusicOn, setBgMusicOn] = useState(() => (typeof window !== 'undefined' ? isBgMusicEnabled() : true))
  const [bgVolume, setBgVolume] = useState(() => (typeof window !== 'undefined' ? Math.round(getBgMusicVolume() * 100) : 10))

  // 1. EXPORT BACKUP JSON
  const handleExport = () => {
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        version: '2.0',
        nodes,
        edges,
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mind-galaxy-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      addToast('Galaxy backup downloaded successfully!', 'success')
      playSelectSound(640)
    } catch {
      addToast('Failed to export backup.', 'info')
    }
  }

  // 2. IMPORT BACKUP JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string
        const parsed = JSON.parse(content)
        if (parsed.nodes && Array.isArray(parsed.nodes)) {
          // Sync with backend
          await fetch('/api/nodes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes: parsed.nodes, edges: parsed.edges || [] }),
          })
          setNodes(parsed.nodes)
          setEdges(parsed.edges || [])
          addToast('Galaxy restored successfully from backup!', 'success')
          setModalOpen(false)
          playSelectSound(780)
        } else {
          addToast('Invalid backup file format.', 'info')
        }
      } catch {
        addToast('Failed to read backup file.', 'info')
      }
    }
    reader.readAsText(file)
  }

  // 3. RESET GALAXY / FRESH START
  const handleCleanReset = async () => {
    try {
      await fetch('/api/nodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: [], edges: [] }),
      })
      setNodes([])
      setEdges([])
      setResetConfirmOpen(false)
      setModalOpen(false)
      addToast('Cosmos cleaned. Ready for your personal constellations!', 'success')
      onResetCamera()
    } catch {
      addToast('Failed to reset galaxy.', 'info')
    }
  }

  return (
    <>
      {/* Bottom-Right Minimalist Control Pills */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-1.5 pointer-events-auto select-none">
        {/* Reset Camera to Origin */}
        <button
          onClick={() => {
            onResetCamera()
            playSelectSound(440)
          }}
          className="p-2 rounded-xl border border-white/[0.08] bg-black/80 hover:bg-white/[0.1] hover:border-white/20 text-white/60 hover:text-white transition-all cursor-pointer backdrop-blur-md"
          title="Reset Camera to Center (Space / R)"
        >
          <Compass size={14} />
        </button>

        {/* Ambient Cosmic Music Toggle */}
        <button
          onClick={() => {
            const next = toggleBgMusic()
            setBgMusicOn(next)
            addToast(next ? 'Ambient music enabled' : 'Ambient music paused', 'info')
          }}
          className="p-2 rounded-xl border border-white/[0.08] bg-black/80 hover:bg-white/[0.1] hover:border-white/20 text-white/60 hover:text-white transition-all cursor-pointer backdrop-blur-md relative"
          title={bgMusicOn ? 'Pause Ambient Cosmic Music' : 'Play Ambient Cosmic Music'}
        >
          <Music size={14} className={bgMusicOn ? 'text-cyan-400' : 'text-white/30'} />
          {bgMusicOn && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          )}
        </button>

        {/* Sound FX Toggle */}
        <button
          onClick={() => {
            toggleSound()
            if (soundMuted) playSelectSound(580)
          }}
          className="p-2 rounded-xl border border-white/[0.08] bg-black/80 hover:bg-white/[0.1] hover:border-white/20 text-white/60 hover:text-white transition-all cursor-pointer backdrop-blur-md"
          title={soundMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
        >
          {soundMuted ? <VolumeX size={14} /> : <Volume2 size={14} className="text-cyan-400" />}
        </button>

        {/* Quick Export Backup */}
        <button
          onClick={handleExport}
          className="p-2 rounded-xl border border-white/[0.08] bg-black/80 hover:bg-white/[0.1] hover:border-white/20 text-white/60 hover:text-white transition-all cursor-pointer backdrop-blur-md"
          title="Export / Download Backup JSON"
        >
          <Download size={14} />
        </button>

        {/* Help & Settings */}
        <button
          onClick={() => {
            setModalOpen(true)
            playSelectSound(480)
          }}
          className="p-2 rounded-xl border border-white/[0.08] bg-black/80 hover:bg-white/[0.1] hover:border-white/20 text-white/60 hover:text-white transition-all cursor-pointer backdrop-blur-md"
          title="Controls & Data Management"
        >
          <HelpCircle size={14} />
        </button>
      </div>

      {/* Settings / Controls Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 max-w-[92vw] z-50 rounded-2xl border border-white/[0.1] bg-black/95 backdrop-blur-2xl p-5 text-white shadow-2xl flex flex-col gap-4 select-none"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-white/70" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/90">
                    System Controls & Data
                  </h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-white/30 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Keyboard Shortcuts */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-2 font-semibold">
                  Keyboard Shortcuts
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-white/50">Add Node</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] font-mono text-[10px] text-white">N</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-white/50">Constellations</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] font-mono text-[10px] text-white">S</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-white/50">Reset View</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] font-mono text-[10px] text-white">R / Space</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-white/50">Deselect / Close</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] font-mono text-[10px] text-white">ESC</kbd>
                  </div>
                </div>
              </div>

              {/* Audio Controls (Ambient Music & Sound FX) */}
              <div className="flex flex-col gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[10px] uppercase tracking-wider text-white/40 block font-semibold">
                  Audio System
                </span>

                {/* 1. Ambient Cosmic Music */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                      <Music size={12} className={bgMusicOn ? 'text-cyan-400' : 'text-white/40'} />
                      <span>Ambient Cosmic Music</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">{bgVolume}%</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = toggleBgMusic()
                          setBgMusicOn(next)
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase transition-colors cursor-pointer ${
                          bgMusicOn ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/10 text-white/40'
                        }`}
                      >
                        {bgMusicOn ? 'Playing' : 'Paused'}
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="35"
                    value={bgVolume}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      setBgVolume(val)
                      setBgMusicVolume(val / 100)
                    }}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[9px] text-white/30">
                    <span>Subtle Whisper</span>
                    <span>Gentle Ambient (Default)</span>
                    <span>Max</span>
                  </div>
                </div>

                {/* 2. Sound Effects (SFX) */}
                <div className="flex flex-col gap-1.5 pt-2.5 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                      <Volume2 size={12} className={!soundMuted ? 'text-cyan-400' : 'text-white/40'} />
                      <span>UI Sound Effects</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">{volume}%</span>
                      <button
                        type="button"
                        onClick={toggleSound}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase transition-colors cursor-pointer ${
                          !soundMuted ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/10 text-white/40'
                        }`}
                      >
                        {!soundMuted ? 'Active' : 'Muted'}
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="35"
                    value={volume}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      setVolume(val)
                      setSoundVolume(val / 100)
                    }}
                    onMouseUp={() => playSelectSound(520)}
                    onTouchEnd={() => playSelectSound(520)}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                  />
                </div>
              </div>

              {/* Data Backup & Restore */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-2 font-semibold">
                  Backup & Restore (Full Data Safety)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
                    className="flex-1 py-2 px-3 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.1] text-xs font-medium text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} /> Export JSON
                  </button>
                  <label className="flex-1 py-2 px-3 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.1] text-xs font-medium text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <Upload size={13} /> Import JSON
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Danger Zone: Clean Reset */}
              <div className="pt-2 border-t border-white/[0.06]">
                {!resetConfirmOpen ? (
                  <button
                    onClick={() => setResetConfirmOpen(true)}
                    className="w-full py-2 px-3 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={13} /> Reset Galaxy / Start Fresh
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-center">
                    <p className="text-[11px] text-red-300">Are you sure? This cleans all test nodes.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCleanReset}
                        className="flex-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-black text-xs font-bold cursor-pointer"
                      >
                        Yes, Clear All
                      </button>
                      <button
                        onClick={() => setResetConfirmOpen(false)}
                        className="flex-1 py-1.5 rounded-lg bg-white/[0.1] hover:bg-white/[0.2] text-white text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
