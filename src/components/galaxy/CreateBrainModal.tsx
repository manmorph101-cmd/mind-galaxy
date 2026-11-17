'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, UserCheck, X, Plus, Shield } from 'lucide-react'
import { useGalaxyStore } from '@/store/galaxyStore'
import type { BrainUser, GalaxyNode, GalaxyEdge } from '@/types'

interface CreateBrainModalProps {
  onSelectUser: (user: BrainUser) => void
}

export default function CreateBrainModal({ onSelectUser }: CreateBrainModalProps) {
  const {
    currentUser,
    allUsers,
    showBrainSwitcher,
    setShowBrainSwitcher,
    setAllUsers,
    addToast,
  } = useGalaxyStore()

  const [inputName, setInputName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If user is already logged in and switcher was not triggered, don't show
  const isVisible = !currentUser || showBrainSwitcher

  const handleCreateOrLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputName.trim()
    if (!trimmed) {
      setError('Please enter a brain or profile name')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize brain')
      }

      const user: BrainUser = data.user
      // Update users list in store
      if (data.isNew) {
        setAllUsers([...allUsers, user])
        addToast(`✦ Brain "${user.name}" initialized into the cosmos!`, 'success')
      } else {
        addToast(`✦ Welcomed back to "${user.name}" consciousness!`, 'info')
      }

      setInputName('')
      setShowBrainSwitcher(false)
      onSelectUser(user)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect brain'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectExisting = (user: BrainUser) => {
    setShowBrainSwitcher(false)
    onSelectUser(user)
    addToast(`✦ Connected to "${user.name}" neural galaxy!`, 'info')
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl select-none"
        >
          {/* Subtle cosmic glow aura */}
          <div className="absolute w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute w-[450px] h-[450px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none translate-x-20 translate-y-20" />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-black/90 p-6 md:p-8 text-white shadow-[0_0_80px_rgba(0,240,255,0.12)] flex flex-col gap-6 backdrop-blur-2xl"
          >
            {/* Close button if user already has an active brain */}
            {currentUser && (
              <button
                onClick={() => setShowBrainSwitcher(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Back to Galaxy"
              >
                <X size={18} />
              </button>
            )}

            {/* Header Badge & Title */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 shadow-[0_0_25px_rgba(0,240,255,0.25)] mb-1">
                <span className="text-2xl animate-pulse">🧠</span>
              </div>

              <h2 className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] bg-gradient-to-r from-cyan-300 via-white to-purple-300 bg-clip-text text-transparent">
                {currentUser ? 'Switch Brain Consciousness' : 'Create Your Brain'}
              </h2>

              <p className="text-xs text-white/50 max-w-sm leading-relaxed">
                Enter your brain profile name to initialize a dedicated, isolated neural universe with its own stars, habits & milestones.
              </p>
            </div>

            {/* Create / Access Form */}
            <form onSubmit={handleCreateOrLogin} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-cyan-400/80 pl-1">
                  Brain / Profile Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => {
                      setInputName(e.target.value)
                      setError('')
                    }}
                    placeholder="e.g. root, Alex, Nexus, StudyMind..."
                    autoFocus
                    className="w-full px-4 py-3.5 rounded-xl border border-white/15 bg-white/[0.04] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-400 focus:bg-white/[0.07] transition-all font-mono shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputName.trim()}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer"
                  >
                    <span>{loading ? 'Launching...' : 'Enter'}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-[11px] text-red-400 font-mono pl-1">{error}</p>
              )}
            </form>

            {/* Existing Brains Section */}
            {allUsers.length > 0 && (
              <div className="flex flex-col gap-2.5 pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                    ✦ Existing Conscious Brains
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400/60">
                    {allUsers.length} available
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {allUsers.map((user) => {
                    const isCurrent = currentUser?.id === user.id
                    const isRoot = user.id === 'root'

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectExisting(user)}
                        className={`group p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isCurrent
                            ? 'border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                            : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-sm"
                            style={{
                              backgroundColor: `${user.avatarColor || '#00f0ff'}25`,
                              color: user.avatarColor || '#00f0ff',
                              border: `1px solid ${user.avatarColor || '#00f0ff'}50`,
                            }}
                          >
                            {isRoot ? '👑' : user.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold truncate text-white/90 group-hover:text-white flex items-center gap-1">
                              {user.name}
                              {isRoot && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                                  Default
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-white/40 font-mono">
                              {user.nodesCount ?? 0} stars
                            </span>
                          </div>
                        </div>

                        {isCurrent ? (
                          <UserCheck size={14} className="text-cyan-400 shrink-0" />
                        ) : (
                          <ArrowRight size={13} className="text-white/20 group-hover:text-cyan-400 transition-colors shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Security & Isolation Note */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[10px] text-white/40">
              <Shield size={12} className="text-cyan-400/60 shrink-0" />
              <span>
                Each brain maintains fully isolated stars, habit streaks, XP progress, and neural links.
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
