'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useGalaxyStore } from '@/store/galaxyStore'
import type { BrainUser } from '@/types'

interface CreateBrainModalProps {
  onSelectUser: (user: BrainUser) => void
}

export default function CreateBrainModal({ onSelectUser }: CreateBrainModalProps) {
  const { currentUser, addToast } = useGalaxyStore()
  const [inputName, setInputName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Only visible when user is NOT logged in
  const isVisible = !currentUser

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputName.trim()
    if (!trimmed) {
      setError('Please enter your name or key')
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
        throw new Error(data.error || 'Failed to authenticate')
      }

      const user: BrainUser = data.user
      setInputName('')
      onSelectUser(user)
      addToast(`Connected: ${user.name}`, 'info')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black select-none"
        >
          {/* Pure Minimalist Black & White Card */}
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-sm flex flex-col gap-6 text-white text-center"
          >
            {/* Header */}
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-sm font-mono tracking-[0.35em] uppercase text-white font-bold">
                M I N D &nbsp; G A L A X Y
              </h1>
              <p className="text-[11px] font-mono tracking-widest uppercase text-white/40">
                Enter your name or brain key
              </p>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => {
                    setInputName(e.target.value)
                    setError('')
                  }}
                  placeholder="Enter name..."
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-4 py-3.5 bg-black border border-white/20 focus:border-white text-white font-mono text-sm text-center placeholder:text-white/25 focus:outline-none transition-colors"
                />
              </div>

              {error && (
                <p className="text-[11px] font-mono text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !inputName.trim()}
                className="w-full py-3.5 bg-white text-black font-mono font-bold text-xs uppercase tracking-[0.2em] hover:bg-white/90 active:scale-[0.99] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{loading ? 'CONNECTING...' : 'ENTER'}</span>
                <ArrowRight size={13} className="stroke-[2.5]" />
              </button>
            </form>

            {/* Minimal footer */}
            <p className="text-[10px] font-mono tracking-widest uppercase text-white/20">
              Isolated Neural Space
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
