'use client'

import { useGalaxyStore } from '@/store/galaxyStore'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  Plus,
  Trash2,
  GitBranch,
  CheckCircle2,
  Flame,
  BookOpen,
  Target,
  Sparkles,
  ArrowUpRight,
  Check,
  Edit3,
  Palette,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import type { GalaxyNode, GalaxyEdge, ProjectMilestone, NodeType } from '@/types'
import { playIgniteSound, playAchievementSound, playSelectSound } from '@/lib/sound'
import { CELESTIAL_COLORS, getCelestialColor } from '@/lib/colors'

export default function NodeDetailPanel() {
  const {
    selectedNodeId,
    getSelectedNode,
    addNode,
    addNodes,
    addEdges,
    removeNode,
    selectNode,
    updateNode,
    nodes,
    addToast,
    currentUser,
  } = useGalaxyStore()

  const node = getSelectedNode()
  const [loading, setLoading] = useState(false)
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [editLabelText, setEditLabelText] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)

  // Learning inputs
  const [customLessonInput, setCustomLessonInput] = useState('')

  // Project inputs
  const [newMilestoneInput, setNewMilestoneInput] = useState('')

  useEffect(() => {
    if (node) {
      setEditLabelText(node.label)
      setIsEditingLabel(false)
    }
  }, [node?.id])

  if (!node) return null

  const isPrimary = !node.parentId || node.parentId === 'origin'
  const todayStr = new Date().toISOString().slice(0, 10)
  const isHabitCheckedToday =
    node.type === 'habit' &&
    (node.lastCheckedDate === todayStr || node.historyDates?.includes(todayStr))

  // ── INLINE RENAME NODE ──
  const handleSaveLabel = async () => {
    if (!editLabelText.trim() || editLabelText.trim() === node.label) {
      setIsEditingLabel(false)
      return
    }
    const newTitle = editLabelText.trim()
    updateNode(node.id, { label: newTitle })
    setIsEditingLabel(false)
    addToast(`✦ Star renamed to "${newTitle}"`, 'info')

    try {
      await fetch('/api/nodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: node.id, label: newTitle }),
      })
    } catch (err) {
      console.error('Failed to rename node:', err)
    }
  }

  // ── CELESTIAL COLOR CHANGE (CASCADE TO SUB-NODES) ──
  const handleColorChange = async (newColor: string) => {
    updateNode(node.id, { color: newColor })

    // Cascade in local store if primary skill
    if (isPrimary) {
      nodes.forEach(n => {
        if (n.parentId === node.id || n.skillId === node.id) {
          updateNode(n.id, { color: newColor })
        }
      })
    }

    playSelectSound(800)
    const colorInfo = getCelestialColor(newColor)
    addToast(`✦ Shade updated to ${colorInfo.name} (${colorInfo.arabicName})`, 'info')

    try {
      await fetch('/api/nodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: node.id, color: newColor }),
      })
    } catch (err) {
      console.error('Failed to change color:', err)
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 1. LEARNING: ADD LESSON(S) (SINGLE OR BATCH OF 1..4)
  // ═════════════════════════════════════════════════════════════
  const handleAddLessons = async (count: number, customTitle?: string) => {
    if (loading) return
    setLoading(true)

    try {
      const payload: {
        parentId: string
        batchCount?: number
        label?: string
        type?: NodeType
        userId?: string
      } = { parentId: node.id, type: 'task', userId: currentUser?.id || 'root' }

      if (customTitle && customTitle.trim()) {
        payload.label = customTitle.trim()
        payload.batchCount = 1
      } else {
        payload.batchCount = count
      }

      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json() as {
        node: GalaxyNode
        nodes?: GalaxyNode[]
        newEdges?: GalaxyEdge[]
        parentNode?: GalaxyNode
      }

      if (data.nodes && data.nodes.length > 0) {
        addNodes(data.nodes)
      } else if (data.node) {
        addNode(data.node)
      }

      if (data.newEdges && data.newEdges.length > 0) {
        addEdges(data.newEdges)
      }

      if (data.parentNode) {
        updateNode(node.id, data.parentNode)
      } else {
        const added = count
        const newCount = (node.tasksCount ?? 0) + added
        const target = node.targetLessons || 20
        const newProg = Math.min(100, Math.round((newCount / target) * 100))
        updateNode(node.id, {
          tasksCount: newCount,
          todayLessonsCount: (node.todayLessonsCount ?? 0) + added,
          lastStudyDate: new Date().toISOString(),
          progress: newProg,
          done: newProg >= 100,
          xp: node.xp + 25 * added,
        })
      }

      setCustomLessonInput('')
      playIgniteSound()
      addToast(
        `+${count} ${count > 1 ? 'Lessons' : 'Lesson'} logged · Neural synapses formed! 🌟`,
        'success'
      )
    } catch (err) {
      console.error('Failed to log lessons:', err)
    } finally {
      setLoading(false)
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 2. HABIT: CHECK-IN FOR TODAY
  // ═════════════════════════════════════════════════════════════
  const handleHabitCheckIn = async () => {
    if (loading || isHabitCheckedToday) return
    setLoading(true)

    try {
      // 1. Create a streak micro-node in 3D
      const newStreakCount = (node.streak ?? 0) + 1
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'root',
          parentId: node.id,
          label: `Day ${newStreakCount} Streak`,
          type: 'task',
        }),
      })

      const data = await res.json() as {
        node: GalaxyNode
        newEdges?: GalaxyEdge[]
        parentNode?: GalaxyNode
      }

      if (data.node) addNode(data.node)
      if (data.newEdges && data.newEdges.length > 0) addEdges(data.newEdges)

      // 2. Update habit node state
      const history = node.historyDates ? [...node.historyDates] : []
      if (!history.includes(todayStr)) history.push(todayStr)

      const best = Math.max(node.bestStreak ?? 0, newStreakCount)
      const updates = {
        streak: newStreakCount,
        bestStreak: best,
        lastCheckedDate: todayStr,
        historyDates: history,
        tasksCount: (node.tasksCount ?? 0) + 1,
        progress: Math.min(100, Math.round(newStreakCount * 10)),
        done: newStreakCount >= 30,
        xp: node.xp + 35,
      }

      updateNode(node.id, updates)
      playAchievementSound()
      addToast(`🔥 Day ${newStreakCount} Streak active! Keep the fire burning.`, 'streak')

      // Persist to backend
      await fetch('/api/nodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: node.id, ...updates }),
      })
    } catch (err) {
      console.error('Failed to check in habit:', err)
    } finally {
      setLoading(false)
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 3. PROJECT: ADD & TOGGLE MILESTONES
  // ═════════════════════════════════════════════════════════════
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMilestoneInput.trim() || loading) return

    const newM: ProjectMilestone = {
      id: 'm-' + Date.now(),
      title: newMilestoneInput.trim(),
      completed: false,
    }

    const currentMilestones = node.milestones ? [...node.milestones, newM] : [newM]
    const completedCount = currentMilestones.filter(m => m.completed).length
    const prog = Math.round((completedCount / currentMilestones.length) * 100)

    const updates = {
      milestones: currentMilestones,
      progress: prog,
      done: prog >= 100,
    }

    updateNode(node.id, updates)
    setNewMilestoneInput('')
    playSelectSound(600)
    addToast('Roadmap milestone added!', 'info')

    try {
      await fetch('/api/nodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: node.id, ...updates }),
      })
    } catch (err) {
      console.error('Failed to save milestone:', err)
    }
  }

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!node.milestones) return

    const targetMilestone = node.milestones.find(m => m.id === milestoneId)
    const willBeCompleted = targetMilestone ? !targetMilestone.completed : true

    const updatedMilestones = node.milestones.map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          completed: willBeCompleted,
          completedAt: willBeCompleted ? new Date().toISOString() : undefined,
        }
      }
      return m
    })

    const completedCount = updatedMilestones.filter(m => m.completed).length
    const prog = Math.round((completedCount / updatedMilestones.length) * 100)

    const updates = {
      milestones: updatedMilestones,
      progress: prog,
      done: prog >= 100,
      tasksCount: completedCount,
    }

    updateNode(node.id, updates)

    // If milestone was just completed, spawn a milestone dot in 3D!
    if (willBeCompleted && targetMilestone) {
      try {
        const res = await fetch('/api/nodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser?.id || 'root',
            parentId: node.id,
            label: targetMilestone.title,
            type: 'task',
          }),
        })
        const data = await res.json() as { node: GalaxyNode; newEdges?: GalaxyEdge[] }
        if (data.node) addNode(data.node)
        if (data.newEdges && data.newEdges.length > 0) addEdges(data.newEdges)
        playAchievementSound()
        addToast(`🎯 Milestone "${targetMilestone.title}" reached! Progress at ${prog}%`, 'success')
      } catch (err) {
        console.error('Failed to spawn milestone dot:', err)
      }
    }

    // Persist milestone status
    try {
      await fetch('/api/nodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: node.id, ...updates }),
      })
    } catch (err) {
      console.error('Failed to update milestone:', err)
    }
  }

  // ═════════════════════════════════════════════════════════════
  // DELETE NODE
  // ═════════════════════════════════════════════════════════════
  const handleDelete = async () => {
    removeNode(node.id)
    addToast('Node removed from cosmos.', 'info')
    await fetch('/api/nodes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: node.id }),
    })
  }

  // Sub-node parent lookup
  const parentCluster = !isPrimary && node.parentId
    ? nodes.find(n => n.id === node.parentId || n.id === node.skillId)
    : null

  return (
    <AnimatePresence>
      {selectedNodeId && (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, x: -20, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="absolute left-6 bottom-10 w-80 max-h-[82vh] z-20 flex flex-col pointer-events-auto"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-black/90 backdrop-blur-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex flex-col">
            {/* Top Glowing Neon Line */}
            <div
              className="h-[2px] w-full shrink-0"
              style={{ background: node.color, boxShadow: `0 0 12px ${node.color}` }}
            />

            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: node.color, boxShadow: `0 0 8px ${node.color}` }}
                    />
                    <span
                      className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1"
                      style={{ color: node.color }}
                    >
                      {node.type === 'learning' && <BookOpen size={11} />}
                      {node.type === 'habit' && <Flame size={11} />}
                      {node.type === 'project' && <Target size={11} />}
                      {!isPrimary && <GitBranch size={11} />}
                      {node.type === 'learning' && 'Learning & Study'}
                      {node.type === 'habit' && 'Habit & Discipline'}
                      {node.type === 'project' && 'Project & Goal'}
                      {!isPrimary && 'Synapse Dot'}
                    </span>
                  </div>

                  {/* Title / Inline Rename */}
                  {isEditingLabel ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <input
                        type="text"
                        autoFocus
                        value={editLabelText}
                        onChange={(e) => setEditLabelText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveLabel()
                          if (e.key === 'Escape') setIsEditingLabel(false)
                        }}
                        className="flex-1 bg-white/[0.08] border border-white/30 rounded px-2 py-0.5 text-xs text-white outline-none focus:border-white/60"
                      />
                      <button
                        type="button"
                        onClick={handleSaveLabel}
                        className="p-1 rounded bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                        title="Save rename"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingLabel(false)}
                        className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white cursor-pointer"
                        title="Cancel"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 group/rename">
                      <h3 className="text-sm font-bold text-white truncate">{node.label}</h3>
                      <button
                        type="button"
                        onClick={() => setIsEditingLabel(true)}
                        className="opacity-0 group-hover/rename:opacity-100 p-0.5 text-white/40 hover:text-white transition-opacity cursor-pointer"
                        title="Rename star"
                      >
                        <Edit3 size={11} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      showColorPicker ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
                    }`}
                    title="Change celestial shade"
                  >
                    <Palette size={14} />
                  </button>
                  <button
                    onClick={() => selectNode(null)}
                    className="text-white/30 hover:text-white transition-colors cursor-pointer p-1"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Celestial Light-to-Dark Gradient Depth & Color Picker */}
              <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="cursor-pointer flex items-center justify-between text-[10px]"
                >
                  <span className="text-white/40 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: node.color, boxShadow: `0 0 6px ${node.color}` }}
                    />
                    <span>{getCelestialColor(node.color).name}</span>
                    <span className="text-white/30">({getCelestialColor(node.color).descriptor})</span>
                  </span>
                  <span className="text-[9px] text-white/30 hover:text-white">
                    {showColorPicker ? 'Hide ▲' : 'Change Hue ▼'}
                  </span>
                </div>

                {/* Light-to-Dark Depth Bar */}
                <div
                  className="h-3 w-full rounded-full border border-white/[0.1] relative overflow-hidden flex items-center justify-between px-2 text-[8px] font-mono tracking-wider"
                  style={{ background: getCelestialColor(node.color).gradient }}
                >
                  <span className="text-black/80 font-bold drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                    Luminous Core
                  </span>
                  <span className="text-white/90 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    Deep Corona
                  </span>
                </div>

                {/* 20 Celestial Swatches Grid when open */}
                {showColorPicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-10 gap-1.5 pt-2 border-t border-white/[0.06] mt-1"
                  >
                    {CELESTIAL_COLORS.map((c) => {
                      const isSel = node.color.toLowerCase() === c.hex.toLowerCase()
                      return (
                        <button
                          key={c.id}
                          type="button"
                          title={`${c.name} (${c.descriptor})`}
                          onClick={() => handleColorChange(c.hex)}
                          className="w-5 h-5 rounded-full transition-all cursor-pointer relative flex items-center justify-center"
                          style={{
                            background: c.gradient,
                            outline: isSel ? '2px solid white' : 'none',
                            outlineOffset: '2px',
                            transform: isSel ? 'scale(1.2)' : 'scale(1)',
                            boxShadow: isSel ? `0 0 12px ${c.hex}` : 'none',
                          }}
                        >
                          {isSel && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </div>

              {node.description && (
                <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">
                  {node.description}
                </p>
              )}

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── ARCHETYPE 1: LEARNING & STUDY ── */}
              {/* ══════════════════════════════════════════════════════════ */}
              {isPrimary && node.type === 'learning' && (
                <div className="flex flex-col gap-3">
                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-white/30 block">Lessons</span>
                      <span className="text-xs font-bold text-white mt-0.5 block font-mono">
                        {node.tasksCount ?? 0}
                      </span>
                    </div>
                    <div className="border-x border-white/[0.06]">
                      <span className="text-[9px] uppercase tracking-wider text-white/30 block">Today</span>
                      <span className="text-xs font-bold text-cyan-400 mt-0.5 block font-mono">
                        +{node.todayLessonsCount ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-white/30 block">Mastery</span>
                      <span className="text-xs font-bold text-white mt-0.5 block font-mono">
                        {node.progress}%
                      </span>
                    </div>
                  </div>

                  {/* Quick Multi-Lesson Logger (User can study 1, 2, 3, 4 lessons at once!) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold flex items-center justify-between">
                      <span>Log Lessons Studied Today:</span>
                      <span className="text-[9px] text-white/30 font-normal">Daily Study Log</span>
                    </label>

                    {/* Fast Presets: [+1], [+2], [+3], [+4] */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map(num => (
                        <button
                          key={num}
                          type="button"
                          disabled={loading}
                          onClick={() => handleAddLessons(num)}
                          className="py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.12] hover:border-white/30 text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1 active:scale-95"
                          title={`Log ${num} lesson${num > 1 ? 's' : ''} studied today`}
                        >
                          <Plus size={11} className="text-cyan-400" />
                          <span>{num} {num === 1 ? 'Lesson' : 'Lessons'}</span>
                        </button>
                      ))}
                    </div>

                    {/* Or Custom Specific Lesson Title */}
                    <div className="flex gap-1.5 mt-1">
                      <input
                        type="text"
                        value={customLessonInput}
                        onChange={(e) => setCustomLessonInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddLessons(1, customLessonInput)
                          }
                        }}
                        placeholder="or custom: e.g. Chapter 4 Grammar..."
                        className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-white/30 transition-colors"
                      />
                      <button
                        type="button"
                        disabled={loading || !customLessonInput.trim()}
                        onClick={() => handleAddLessons(1, customLessonInput)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-black bg-white hover:bg-white/90 disabled:opacity-30 transition-all cursor-pointer shrink-0 shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── ARCHETYPE 2: HABIT & DISCIPLINE ── */}
              {/* ══════════════════════════════════════════════════════════ */}
              {isPrimary && node.type === 'habit' && (
                <div className="flex flex-col gap-3">
                  {/* Streak Metrics */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <Flame size={17} />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-white/40 block">Current Streak</span>
                        <span className="text-sm font-bold text-white flex items-center gap-1">
                          {node.streak ?? 0} <span className="text-[10px] text-white/50 font-normal">Days</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase tracking-wider text-white/40 block">Best</span>
                      <span className="text-xs font-bold text-white/80 font-mono">
                        {node.bestStreak ?? node.streak ?? 0} d
                      </span>
                    </div>
                  </div>

                  {/* Daily Check-In Action Button */}
                  {isHabitCheckedToday ? (
                    <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 size={15} />
                      <span>Completed Today · Synapse Active</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleHabitCheckIn}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)] active:scale-98"
                    >
                      <Sparkles size={14} />
                      <span>Check In for Today</span>
                    </button>
                  )}

                  {/* 7-Day Consistency Dots */}
                  <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[9px] uppercase tracking-wider text-white/30 block">Consistency Log</span>
                    <div className="flex justify-between items-center px-1">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                        const isDone = isHabitCheckedToday && idx === 6
                        return (
                          <div key={idx} className="flex flex-col items-center gap-1">
                            <span className="text-[9px] text-white/30">{day}</span>
                            <div
                              className="w-2.5 h-2.5 rounded-full border transition-all"
                              style={{
                                borderColor: isDone ? node.color : 'rgba(255,255,255,0.15)',
                                background: isDone ? node.color : 'transparent',
                                boxShadow: isDone ? `0 0 8px ${node.color}` : 'none',
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── ARCHETYPE 3: PROJECT & GOAL ── */}
              {/* ══════════════════════════════════════════════════════════ */}
              {isPrimary && node.type === 'project' && (
                <div className="flex flex-col gap-3">
                  {/* Milestones Progress Bar */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">Roadmap Progress</span>
                      <span className="font-bold text-purple-400 font-mono">{node.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${node.progress}%`, boxShadow: '0 0 10px #a855f7' }}
                      />
                    </div>
                  </div>

                  {/* Milestone Checklist */}
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                    {node.milestones && node.milestones.length > 0 ? (
                      node.milestones.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => handleToggleMilestone(m.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                            m.completed
                              ? 'bg-purple-500/10 border-purple-500/30 text-white/90'
                              : 'bg-white/[0.02] border-white/[0.06] text-white/60 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                            m.completed ? 'bg-purple-500 border-purple-400 text-black' : 'border-white/30'
                          }`}>
                            {m.completed && <Check size={11} strokeWidth={3} />}
                          </div>
                          <span className={`text-xs truncate ${m.completed ? 'line-through text-white/50' : 'text-white'}`}>
                            {m.title}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-white/30 text-center py-2">
                        No milestones added yet. Define your roadmap below:
                      </span>
                    )}
                  </div>

                  {/* Add Milestone Input */}
                  <form onSubmit={handleAddMilestone} className="flex gap-1.5">
                    <input
                      type="text"
                      value={newMilestoneInput}
                      onChange={(e) => setNewMilestoneInput(e.target.value)}
                      placeholder="+ Add Next Milestone..."
                      className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-white/30 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={loading || !newMilestoneInput.trim()}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-black bg-white hover:bg-white/90 disabled:opacity-30 transition-all cursor-pointer shrink-0"
                    >
                      <Plus size={13} />
                    </button>
                  </form>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════ */}
              {/* ── SUB-NODE / SYNAPSE DOT (LESSON OR TASK) ── */}
              {/* ══════════════════════════════════════════════════════════ */}
              {!isPrimary && (
                <div className="flex flex-col gap-2.5">
                  <div className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-white/30 block">Parent Cluster</span>
                      <span className="text-xs font-bold text-white">
                        {parentCluster ? parentCluster.label : 'Origin'}
                      </span>
                    </div>
                    {parentCluster && (
                      <button
                        type="button"
                        onClick={() => selectNode(parentCluster.id)}
                        className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                      >
                        <span>Focus</span>
                        <ArrowUpRight size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                    <CheckCircle2 size={13} />
                    <span>Active Synapse · Connected into constellation</span>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex justify-between items-center pt-2 border-t border-white/[0.06] mt-auto">
                <span className="text-[9px] text-white/20">Click space to dismiss</span>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 text-[10px] text-white/30 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}