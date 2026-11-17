'use client'

import { useState } from 'react'
import { useGalaxyStore } from '@/store/galaxyStore'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Target, Flame, BookOpen, ChevronRight, CheckCircle2, Search } from 'lucide-react'
import { getCelestialColor } from '@/lib/colors'

interface SkillsListPanelProps {
  open: boolean
  onClose: () => void
}

export default function SkillsListPanel({ open, onClose }: SkillsListPanelProps) {
  const { nodes, selectNode } = useGalaxyStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'learning' | 'habit' | 'project'>('all')

  // Filter primary nodes (clusters/skills/habits/projects)
  const primaryNodes = nodes.filter(n => !n.parentId || n.parentId === 'origin' || n.type !== 'task')

  const filteredNodes = primaryNodes.filter(n => {
    const matchesSearch = n.label.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (n.category && n.category.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    const matchesFilter = activeFilter === 'all' || n.type === activeFilter
    return matchesSearch && matchesFilter
  })

  const totalSynapses = nodes.filter(n => n.type === 'task').length

  const handleSelect = (id: string) => {
    selectNode(id)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 z-20 backdrop-blur-sm"
            onClick={onClose}
          />
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
                <Target size={14} className="text-white/60" />
                <h2 className="text-xs font-bold tracking-widest uppercase text-white/90">
                  Constellations ({primaryNodes.length})
                </h2>
                {totalSynapses > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.08] text-white/50 font-mono">
                    {totalSynapses} synapses
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-white/30 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="p-3 border-b border-white/[0.06] flex flex-col gap-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search constellations..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-white/30 transition-colors"
                />
              </div>

              {/* Type Filter Pills */}
              <div className="flex gap-1">
                {(['all', 'learning', 'habit', 'project'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveFilter(tab)}
                    className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-semibold capitalize transition-all cursor-pointer ${
                      activeFilter === tab
                        ? 'bg-white text-black shadow-sm'
                        : 'bg-white/[0.04] text-white/40 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {filteredNodes.length === 0 ? (
                <div className="text-center py-16 text-white/30 text-xs">
                  {searchQuery || activeFilter !== 'all' ? (
                    'No constellations match your filter.'
                  ) : (
                    <>
                      No neural clusters in space yet.<br />
                      Click <span className="text-white font-medium">+ Add Node</span> to begin.
                    </>
                  )}
                </div>
              ) : (
                filteredNodes.map((node) => {
                  const subNodesCount = nodes.filter(n => n.parentId === node.id || n.skillId === node.id).length
                  const celestial = getCelestialColor(node.color)

                  return (
                    <div
                      key={node.id}
                      onClick={() => handleSelect(node.id)}
                      className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Gradient Dot (Light to Dark) */}
                        <div
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm border border-white/20"
                          style={{
                            background: celestial.gradient,
                            boxShadow: `0 0 10px ${node.color}88`,
                          }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white group-hover:text-white transition-colors flex items-center gap-1.5 truncate">
                            <span className="truncate">{node.label}</span>
                            {node.done && <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />}
                          </div>
                          <div className="text-[10px] text-white/40 flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1">
                              {node.type === 'learning' && <BookOpen size={10} className="text-cyan-400" />}
                              {node.type === 'habit' && <Flame size={10} className="text-emerald-400" />}
                              {node.type === 'project' && <Target size={10} className="text-purple-400" />}
                              {node.type === 'learning' && 'Learning'}
                              {node.type === 'habit' && `${node.streak ?? 0}d streak`}
                              {node.type === 'project' && 'Project'}
                            </span>
                            {subNodesCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-white/50">{subNodesCount} synapses</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-[10px] font-mono font-bold text-white/60">{node.progress}%</span>
                        <ChevronRight size={13} className="text-white/20 group-hover:text-white/60 transition-colors" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
