'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, BookOpen, Flame, Target, ArrowLeft } from 'lucide-react'
import { useGalaxyStore } from '@/store/galaxyStore'
import type { GalaxyNode, GalaxyEdge, NodeType } from '@/types'
import { CELESTIAL_COLORS, getCelestialColor } from '@/lib/colors'

const NODE_TYPES: Array<{
  id: NodeType
  title: string
  subtitle: string
  tag: string
  icon: typeof BookOpen
  defaultColor: string
  placeholder: string
  detailLabel: string
  detailPlaceholder: string
}> = [
  {
    id: 'learning',
    title: 'Learning & Study',
    tag: 'Study Tree',
    subtitle: 'Languages, school courses, books, programming...',
    icon: BookOpen,
    defaultColor: '#00f0ff',
    placeholder: 'e.g. German, Calculus, Machine Learning',
    detailLabel: 'Target or Focus (Optional)',
    detailPlaceholder: 'e.g. Complete 25 lessons, B1 Level, Grammar',
  },
  {
    id: 'habit',
    title: 'Habit & Discipline',
    tag: 'Daily Habit',
    subtitle: 'Daily routines, gym, streaks, consistency...',
    icon: Flame,
    defaultColor: '#22c55e',
    placeholder: 'e.g. Morning Gym, 2L Water, Reading',
    detailLabel: 'Daily Rule (Optional)',
    detailPlaceholder: 'e.g. 45 mins every morning, 10 pages a day',
  },
  {
    id: 'project',
    title: 'Project & Goal',
    tag: 'Milestones',
    subtitle: 'Milestone objectives, apps, thesis, exams...',
    icon: Target,
    defaultColor: '#a855f7',
    placeholder: 'e.g. Mind Galaxy App, Graduation Thesis',
    detailLabel: 'Project Vision (Optional)',
    detailPlaceholder: 'e.g. Build MVP, Deploy to production, Final launch',
  },
]

interface AddNodeFormProps {
  open: boolean
  onClose: () => void
}

export default function AddNodeForm({ open, onClose }: AddNodeFormProps) {
  const { addNode, addEdges, selectNode, addToast, currentUser } = useGalaxyStore()

  // 2-Step Flow: 'type' -> 'details'
  const [step, setStep] = useState<'type' | 'details'>('type')
  const [selectedType, setSelectedType] = useState<NodeType>('learning')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState(CELESTIAL_COLORS[0].hex)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Always reset to step 1 ('type') whenever modal opens
  useEffect(() => {
    if (open) {
      setStep('type')
      setName('')
      setDescription('')
      setError('')
    }
  }, [open])

  const activeTypeInfo = NODE_TYPES.find(t => t.id === selectedType) || NODE_TYPES[0]

  const handleSelectType = (typeId: NodeType, defaultCol: string) => {
    setSelectedType(typeId)
    setSelectedColor(defaultCol)
    setStep('details')
    setError('')
  }

  const handleReset = () => {
    setStep('type')
    setName('')
    setDescription('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter a name for this node')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'root',
          label: name.trim(),
          category: activeTypeInfo.title,
          type: selectedType,
          color: selectedColor,
          description: description.trim() || undefined,
          parentId: 'origin',
        }),
      })

      const result = await res.json() as { node: GalaxyNode; edge?: GalaxyEdge; newEdges?: GalaxyEdge[] }
      if (result.node) {
        addNode(result.node)
        const edgesToAdd = result.newEdges || (result.edge ? [result.edge] : [])
        if (edgesToAdd.length > 0) {
          addEdges(edgesToAdd)
        }
        // Smoothly fly camera to new node
        selectNode(result.node.id)
        addToast(`✦ Constellation "${result.node.label}" ignited in deep space!`, 'success')
      }
      handleReset()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Failed to create node. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 z-20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute right-0 top-0 bottom-0 w-84 z-30 flex flex-col border-l border-white/[0.08] bg-black/95 backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                {step === 'details' && (
                  <button
                    onClick={() => setStep('type')}
                    className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer mr-1"
                    title="Back to type selection"
                  >
                    <ArrowLeft size={15} />
                  </button>
                )}
                <h2 className="text-xs font-bold tracking-widest uppercase text-white/90">
                  {step === 'type' ? 'Select Node Nature' : `New ${activeTypeInfo.title}`}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-white/30 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content: Step 1 vs Step 2 */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              {step === 'type' ? (
                /* ── STEP 1: SELECT NODE TYPE ── */
                <div className="flex flex-col gap-3 my-auto">
                  <p className="text-[11px] text-white/40 mb-1 leading-relaxed">
                    Choose the nature of your node to define its growth pattern and neural structure:
                  </p>

                  {NODE_TYPES.map((t) => {
                    const IconComponent = t.icon
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectType(t.id, t.defaultColor)}
                        className="group relative p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 transition-all cursor-pointer flex items-start gap-3.5"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-110"
                          style={{
                            background: `${t.defaultColor}18`,
                            color: t.defaultColor,
                            boxShadow: `0 0 16px ${t.defaultColor}22`,
                          }}
                        >
                          <IconComponent size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white group-hover:text-white transition-colors">
                              {t.title}
                            </span>
                            <span className="text-[10px] text-white/40 font-medium">{t.tag}</span>
                          </div>
                          <p className="text-[10px] text-white/40 mt-1 leading-relaxed line-clamp-2">
                            {t.subtitle}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* ── STEP 2: DETAILS (Name, Details, Color) ── */
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 my-auto">
                  {/* Selected Type Badge */}
                  <div
                    className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]"
                    style={{ borderColor: `${selectedColor}44` }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: selectedColor, boxShadow: `0 0 8px ${selectedColor}` }}
                    />
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                      {activeTypeInfo.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep('type')}
                      className="text-[10px] text-white/30 hover:text-white ml-auto underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1.5 font-semibold">
                      Node Name *
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        setError('')
                      }}
                      placeholder={activeTypeInfo.placeholder}
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-white/40 transition-colors"
                    />
                    {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
                  </div>

                  {/* Notes / Details */}
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-1.5 font-semibold">
                      {activeTypeInfo.detailLabel}
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={activeTypeInfo.detailPlaceholder}
                      rows={2}
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-white/40 transition-colors resize-none"
                    />
                  </div>

                  {/* Celestial Color System (20 rich cosmic shades from light to deep) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                        Celestial Shade
                      </label>
                      {(() => {
                        const active = getCelestialColor(selectedColor)
                        return (
                          <span className="text-[10px] text-white/70 font-medium">
                            {active.name} · <span className="text-white/40">{active.descriptor}</span>
                          </span>
                        )
                      })()}
                    </div>

                    {/* Gradient Depth Preview */}
                    {(() => {
                      const active = getCelestialColor(selectedColor)
                      return (
                        <div
                          className="h-4 w-full rounded-md mb-2.5 border border-white/[0.1] relative overflow-hidden flex items-center justify-between px-2 text-[9px] font-mono tracking-wider"
                          style={{ background: active.gradient }}
                        >
                          <span className="text-black/80 font-bold drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                            Core (Luminous)
                          </span>
                          <span className="text-white/90 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                            Deep Corona
                          </span>
                        </div>
                      )
                    })()}

                    {/* 20 Celestial Color Swatches */}
                    <div className="grid grid-cols-10 gap-1.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      {CELESTIAL_COLORS.map((c) => {
                        const isSelected = selectedColor.toLowerCase() === c.hex.toLowerCase()
                        return (
                          <button
                            key={c.id}
                            type="button"
                            title={`${c.name} (${c.descriptor})`}
                            onClick={() => setSelectedColor(c.hex)}
                            className="w-5 h-5 rounded-full transition-all cursor-pointer relative group/swatch flex items-center justify-center"
                            style={{
                              background: c.gradient,
                              outline: isSelected ? '2px solid white' : 'none',
                              outlineOffset: '2px',
                              transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                              boxShadow: isSelected ? `0 0 14px ${c.hex}` : 'none',
                            }}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold text-black bg-white hover:bg-white/90 disabled:opacity-40 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                  >
                    <Sparkles size={13} />
                    {loading ? 'Igniting…' : 'Add Node'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
