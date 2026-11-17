export type NodeType = 'learning' | 'habit' | 'project' | 'task' | 'skill' | 'goal'

export interface BrainUser {
  id: string
  name: string
  createdAt: string
  avatarColor?: string
  nodesCount?: number
}

export interface ProjectMilestone {
  id: string
  title: string
  completed: boolean
  completedAt?: string
}

export interface GalaxyNode {
  id: string
  userId: string
  label: string
  category: string
  type: NodeType
  color: string
  description?: string
  parentId?: string // parent skill/cluster or origin
  skillId?: string  // root skill cluster it belongs to
  x: number
  y: number
  z?: number
  progress: number
  done: boolean
  xp: number
  tasksCount?: number
  // Learning archetype properties
  targetLessons?: number
  todayLessonsCount?: number
  lastStudyDate?: string
  // Habit archetype properties
  streak?: number
  bestStreak?: number
  lastCheckedDate?: string
  historyDates?: string[] // e.g. ["2026-11-17", ...]
  // Project archetype properties
  milestones?: ProjectMilestone[]
  targetDate?: string
  createdAt: string
  updatedAt: string
}

export interface GalaxyEdge {
  id: string
  userId: string
  fromId: string
  toId: string
  offset: number
}

export interface ProgressLog {
  id: string
  userId: string
  nodeId: string
  xpGained: number
  note?: string
  createdAt: string
}

export interface CreateNodeInput {
  userId?: string
  label?: string
  labels?: string[]
  batchCount?: number
  category?: string
  type?: NodeType
  color?: string
  description?: string
  x?: number
  y?: number
  z?: number
  parentId?: string
  skillId?: string
  targetLessons?: number
  milestones?: ProjectMilestone[]
}
