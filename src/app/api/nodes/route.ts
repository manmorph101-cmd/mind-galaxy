import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { readStoreData, writeStoreData } from '@/lib/serverData'
import type { GalaxyNode, GalaxyEdge } from '@/types'

const CreateNodeSchema = z.object({
  userId:         z.string().optional().default('root'),
  label:          z.string().optional(),
  labels:         z.array(z.string()).optional(),
  batchCount:     z.number().int().min(1).max(20).optional(),
  category:       z.string().optional().default('General'),
  type:           z.enum(['learning', 'habit', 'project', 'task', 'skill', 'goal']).default('learning'),
  color:          z.string().optional().default('#00f0ff'),
  description:    z.string().optional(),
  x:              z.number().optional(),
  y:              z.number().optional(),
  z:              z.number().optional(),
  parentId:       z.string().optional().default('origin'),
  skillId:        z.string().optional(),
  targetLessons:  z.number().optional(),
  milestones:     z.array(z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean(),
  })).optional(),
})

function distance3D(a: { x: number; y: number; z?: number }, b: { x: number; y: number; z?: number }) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = (a.z ?? 0) - (b.z ?? 0)
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function getClusterSeed(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (Math.imul(31, hash) + id.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

const MIN_SOMA_DIST = 58.0
const MIN_NODE_SEPARATION = 48.0

function findCollisionFreeSubnodePosition(
  parentNode: GalaxyNode,
  allExistingNodes: GalaxyNode[],
  taskIndex: number,
  clusterSize: number,
  basis: {
    tangentX: number; tangentY: number; tangentZ: number
    binormalX: number; binormalY: number; binormalZ: number
    outwardX: number; outwardY: number; outwardZ: number
  }
): { x: number; y: number; z: number } {
  const seed = getClusterSeed(parentNode.id)
  const { tangentX, tangentY, tangentZ, binormalX, binormalY, binormalZ, outwardX, outwardY, outwardZ } = basis

  // 1. Calculate morphology base candidate with generous clearance
  let lx = 0, ly = 0, lz = 0

  if (parentNode.type === 'habit') {
    // ── MORPHOLOGY 1: EXPANSIVE CONCENTRIC HALOS / CROWN RINGS ──
    const nodesPerRing = 4
    const ring = Math.floor(taskIndex / nodesPerRing)
    const idxInRing = taskIndex % nodesPerRing
    const r = 60.0 + ring * 36.0
    const ringAngleOffset = (seed % 100) * 0.05 + ring * 0.785
    const theta = (idxInRing * 2 * Math.PI) / nodesPerRing + ringAngleOffset
    const tilt = 0.28 * Math.sin(theta * 1.5 + ring)

    const u = Math.cos(theta)
    const v = Math.sin(theta)
    const w = tilt

    lx = (tangentX * u + binormalX * v + outwardX * w) * r
    ly = (tangentY * u + binormalY * v + outwardY * w) * r
    lz = (tangentZ * u + binormalZ * v + outwardZ * w) * r
  } else if (parentNode.type === 'project') {
    // ── MORPHOLOGY 2: DIRECTIONAL MILESTONE CONSTELLATION SPINE ──
    const forwardDist = 60.0 + taskIndex * 38.0
    const arcAngle = taskIndex * 0.85 + (seed % 50) * 0.1
    const sideWobble = Math.sin(arcAngle) * 26.0
    const upWobble = Math.cos(arcAngle * 0.8) * 22.0

    lx = outwardX * forwardDist + tangentX * sideWobble + binormalX * upWobble
    ly = outwardY * forwardDist + tangentY * sideWobble + binormalY * upWobble
    lz = outwardZ * forwardDist + tangentZ * sideWobble + binormalZ * upWobble
  } else {
    // ── LEARNING & SKILLS: VARIED PROCEDURAL MORPHOLOGIES ──
    const styleIdx = seed % 3

    if (styleIdx === 0 || styleIdx === 2) {
      // ── STYLE A: EXPANSIVE DENDRITIC ARBOR ──
      const numBranches = 3 + (seed % 2)
      const branchIndex = taskIndex % numBranches
      const stepOnBranch = Math.floor(taskIndex / numBranches)

      const baseAngle = (branchIndex * 2 * Math.PI) / numBranches + (seed % 80) * 0.08
      const wobble = Math.sin(stepOnBranch * 1.4 + branchIndex) * 0.32
      const angle = baseAngle + wobble
      const r = 62.0 + stepOnBranch * 38.0
      const zDisplace = Math.cos(stepOnBranch * 1.6 + branchIndex * 1.2) * (18.0 + stepOnBranch * 8.0)

      lx = (tangentX * Math.cos(angle) + binormalX * Math.sin(angle)) * r + outwardX * zDisplace
      ly = (tangentY * Math.cos(angle) + binormalY * Math.sin(angle)) * r + outwardY * zDisplace
      lz = (tangentZ * Math.cos(angle) + binormalZ * Math.sin(angle)) * r + outwardZ * zDisplace
    } else {
      // ── STYLE B: SPHERICAL NEURAL ROSETTE ──
      const goldenAngle = 2.39996323
      const r = 60.0 + Math.sqrt(taskIndex + 1) * 28.0
      const theta = taskIndex * goldenAngle + (seed % 60) * 0.1
      const phi = Math.acos(1 - (2 * (taskIndex + 0.5)) / Math.max(12, clusterSize + 1))

      const u = Math.sin(phi) * Math.cos(theta)
      const v = Math.sin(phi) * Math.sin(theta)
      const w = Math.cos(phi)

      lx = (tangentX * u + binormalX * v + outwardX * w) * r
      ly = (tangentY * u + binormalY * v + outwardY * w) * r
      lz = (tangentZ * u + binormalZ * v + outwardZ * w) * r
    }
  }

  const basePos = {
    x: parentNode.x + lx,
    y: parentNode.y + ly,
    z: (parentNode.z || 0) + lz,
  }

  // 2. Fast check: is base candidate completely collision-free with >= 48 units of space?
  let isFree = distance3D(basePos, parentNode) >= MIN_SOMA_DIST
  let minNeighborDist = Infinity
  for (const s of allExistingNodes) {
    if (s.id === parentNode.id) continue
    const d = distance3D(basePos, s)
    if (d < minNeighborDist) minNeighborDist = d
    if (d < MIN_NODE_SEPARATION) {
      isFree = false
      break
    }
  }

  if (isFree && (allExistingNodes.length === 0 || minNeighborDist >= MIN_NODE_SEPARATION)) {
    return basePos
  }

  // 3. SPATIAL CLEARANCE SEARCH (Collision-free wide multi-shell placement)
  let bestPos = basePos
  let bestScore = -1

  const goldenAngle = 2.39996323
  const candidateCount = 96
  const shells = [58.0, 85.0, 115.0, 148.0, 185.0]

  for (const r of shells) {
    for (let i = 0; i < candidateCount; i++) {
      const theta = (taskIndex + i) * goldenAngle + (seed % 100) * 0.1
      const phi = Math.acos(1 - (2 * (i + 0.5)) / candidateCount)

      const u = Math.sin(phi) * Math.cos(theta)
      const v = Math.sin(phi) * Math.sin(theta)
      const w = Math.cos(phi)

      const cx = parentNode.x + (tangentX * u + binormalX * v + outwardX * w) * r
      const cy = parentNode.y + (tangentY * u + binormalY * v + outwardY * w) * r
      const cz = (parentNode.z || 0) + (tangentZ * u + binormalZ * v + outwardZ * w) * r
      const cand = { x: cx, y: cy, z: cz }

      if (distance3D(cand, parentNode) < MIN_SOMA_DIST) continue

      let candMinDist = Infinity
      for (const s of allExistingNodes) {
        if (s.id === parentNode.id) continue
        const d = distance3D(cand, s)
        if (d < candMinDist) candMinDist = d
      }

      if (candMinDist >= MIN_NODE_SEPARATION) {
        const score = candMinDist <= 75 ? candMinDist : 150 - candMinDist
        if (score > bestScore) {
          bestScore = score
          bestPos = cand
        }
      } else if (bestScore < 0 && candMinDist > bestScore) {
        bestScore = candMinDist
        bestPos = cand
      }
    }

    if (bestScore >= MIN_NODE_SEPARATION) {
      break
    }
  }

  return bestPos
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId') || 'root'
  const data = readStoreData()

  const userNodes = data.nodes.filter((n) => (n.userId || 'root') === userId)
  const userEdges = data.edges.filter((e) => (e.userId || 'root') === userId)

  return NextResponse.json({
    nodes: userNodes,
    edges: userEdges,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = CreateNodeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const data = readStoreData()
    const userId = parsed.data.userId || 'root'
    const { parentId, label, category, description } = parsed.data

    let x = parsed.data.x
    let y = parsed.data.y
    let z = parsed.data.z
    let color = parsed.data.color
    let skillId = parsed.data.skillId

    const newEdges: GalaxyEdge[] = []

    if (!parentId || parentId === 'origin') {
      // ═════════════════════════════════════════════════════════════
      // ── PRIMARY SKILL NODE: SMART MAXIMUM-SEPARATION SPACING ──
      // ═════════════════════════════════════════════════════════════
      const existingSkills = data.nodes.filter(
        (n) => (n.userId || 'root') === userId && (!n.parentId || n.parentId === 'origin' || n.type !== 'task')
      )

      if (x === undefined || y === undefined) {
        const radius = 225 + (existingSkills.length % 4) * 28

        if (existingSkills.length === 0) {
          x = radius
          y = 0
          z = 0
        } else if (existingSkills.length === 1) {
          const s1 = existingSkills[0]
          const mag = Math.sqrt(s1.x * s1.x + s1.y * s1.y + (s1.z || 0) * (s1.z || 0)) || 1
          x = -(s1.x / mag) * radius
          y = -(s1.y / mag) * radius
          z = -((s1.z || 0) / mag) * radius
        } else {
          let bestPos = { x: radius, y: 0, z: 0 }
          let maxMinDist = -1

          for (let i = 0; i < 160; i++) {
            const theta = i * 2.39996323
            const phi = Math.acos(1 - (2 * (i + 0.5)) / 160)
            const cx = radius * Math.sin(phi) * Math.cos(theta)
            const cy = radius * Math.sin(phi) * Math.sin(theta) * 0.72
            const cz = radius * Math.cos(phi)

            let minDist = Infinity
            for (const s of existingSkills) {
              const d = distance3D({ x: cx, y: cy, z: cz }, s)
              if (d < minDist) minDist = d
            }

            if (minDist > maxMinDist) {
              maxMinDist = minDist
              bestPos = { x: cx, y: cy, z: cz }
            }
          }

          x = bestPos.x
          y = bestPos.y
          z = bestPos.z
        }
      }

      const nowStr = new Date().toISOString()
      const newNodeId = (parsed.data.type || 'node') + '-' + Date.now()
      const newNode: GalaxyNode = {
        id: newNodeId,
        userId,
        label: label || 'New Star',
        category,
        type: parsed.data.type || 'learning',
        color,
        description,
        x: x ?? 160,
        y: y ?? 0,
        z: z ?? 0,
        progress: 0,
        done: false,
        xp: 0,
        tasksCount: 0,
        targetLessons: parsed.data.targetLessons || (parsed.data.type === 'learning' ? 20 : undefined),
        todayLessonsCount: 0,
        streak: 0,
        bestStreak: 0,
        historyDates: [],
        milestones: parsed.data.milestones || [],
        createdAt: nowStr,
        updatedAt: nowStr,
      }

      const edgeToOrigin: GalaxyEdge = {
        id: 'edge-' + Date.now() + '-orig',
        userId,
        fromId: 'origin',
        toId: newNodeId,
        offset: Math.random(),
      }

      data.nodes.push(newNode)
      data.edges.push(edgeToOrigin)
      writeStoreData(data)

      return NextResponse.json({ node: newNode, nodes: [newNode], edge: edgeToOrigin, newEdges: [edgeToOrigin] })
    } else {
      // ═════════════════════════════════════════════════════════════
      // ── SUB-NODES / LESSONS / TASKS ──
      // ═════════════════════════════════════════════════════════════
      const parentNode = data.nodes.find((n) => n.id === parentId)
      if (!parentNode) {
        return NextResponse.json({ error: 'Parent node not found' }, { status: 404 })
      }

      skillId = parentNode.skillId || parentNode.id
      color = parentNode.color

      const clusterTasks = data.nodes.filter(
        (n) => (n.userId || 'root') === userId && (n.skillId === skillId || n.parentId === skillId) && n.id !== skillId
      )

      const pMag = Math.sqrt(parentNode.x * parentNode.x + parentNode.y * parentNode.y + (parentNode.z || 0) * (parentNode.z || 0)) || 1
      const outwardX = parentNode.x / pMag
      const outwardY = parentNode.y / pMag
      const outwardZ = (parentNode.z || 0) / pMag

      let ax = 0, ay = 1, az = 0
      if (Math.abs(outwardY) > 0.88) {
        ax = 1; ay = 0; az = 0
      }

      let tx = ay * outwardZ - az * outwardY
      let ty = az * outwardX - ax * outwardZ
      let tz = ax * outwardY - ay * outwardX
      const tMag = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1
      const tangentX = tx / tMag
      const tangentY = ty / tMag
      const tangentZ = tz / tMag

      const binormalX = outwardY * tangentZ - outwardZ * tangentY
      const binormalY = outwardZ * tangentX - outwardX * tangentZ
      const binormalZ = outwardX * tangentY - outwardY * tangentX

      const countToCreate = Math.max(1, parsed.data.batchCount || (parsed.data.labels ? parsed.data.labels.length : 1))
      const createdNodes: GalaxyNode[] = []
      const nowStr = new Date().toISOString()
      const todayDateStr = nowStr.slice(0, 10)

      const userAllNodes = data.nodes.filter((n) => (n.userId || 'root') === userId)

      for (let k = 0; k < countToCreate; k++) {
        const taskIndex = clusterTasks.length + k
        const allKnownNodes = [...userAllNodes, ...createdNodes]

        const freePos = findCollisionFreeSubnodePosition(
          parentNode,
          allKnownNodes,
          taskIndex,
          clusterTasks.length + countToCreate,
          {
            tangentX, tangentY, tangentZ,
            binormalX, binormalY, binormalZ,
            outwardX, outwardY, outwardZ,
          }
        )

        const nodeX = freePos.x
        const nodeY = freePos.y
        const nodeZ = freePos.z

        let nodeTitle = parsed.data.labels?.[k]
        if (!nodeTitle) {
          if (parsed.data.label) {
            nodeTitle = countToCreate > 1 ? `${parsed.data.label} #${clusterTasks.length + k + 1}` : parsed.data.label
          } else if (parentNode.type === 'learning') {
            nodeTitle = `Lesson ${clusterTasks.length + k + 1}`
          } else if (parentNode.type === 'habit') {
            nodeTitle = `Day ${clusterTasks.length + k + 1}`
          } else {
            nodeTitle = `Milestone ${clusterTasks.length + k + 1}`
          }
        }

        const newNodeId = `task-${Date.now()}-${k}`
        const subNode: GalaxyNode = {
          id: newNodeId,
          userId,
          label: nodeTitle,
          category: parentNode.category,
          type: 'task',
          color,
          description,
          parentId,
          skillId,
          x: nodeX,
          y: nodeY,
          z: nodeZ,
          progress: 100,
          done: true,
          xp: 25,
          createdAt: nowStr,
          updatedAt: nowStr,
        }

        const primaryEdge: GalaxyEdge = {
          id: `edge-${Date.now()}-${k}-prim`,
          userId,
          fromId: parentId,
          toId: newNodeId,
          offset: Math.random(),
        }
        newEdges.push(primaryEdge)

        const allSiblings = [...clusterTasks, ...createdNodes]
        const nearbySiblings = allSiblings
          .filter((n) => n.id !== parentId && n.id !== newNodeId)
          .map((n) => ({ node: n, dist: distance3D(subNode, n) }))
          .filter((item) => item.dist >= 35.0 && item.dist < 115.0)
          .sort((a, b) => a.dist - b.dist)

        const maxExtraEdges = Math.min(2, nearbySiblings.length)
        for (let t = 0; t < maxExtraEdges; t++) {
          const sibling = nearbySiblings[t].node
          const triangleEdge: GalaxyEdge = {
            id: `edge-${Date.now()}-${k}-tri-${t}`,
            userId,
            fromId: sibling.id,
            toId: newNodeId,
            offset: Math.random(),
          }
          newEdges.push(triangleEdge)
        }

        createdNodes.push(subNode)
      }

      let updatedParent: GalaxyNode = parentNode
      data.nodes = data.nodes.map((n) => {
        if (n.id === skillId) {
          const newCount = (n.tasksCount ?? 0) + countToCreate
          let newProg = n.progress
          let newStreak = n.streak ?? 0
          let newTodayCount = n.todayLessonsCount ?? 0

          if (n.type === 'learning') {
            const target = n.targetLessons || 20
            newProg = Math.min(100, Math.round((newCount / target) * 100))
            const lastDate = n.lastStudyDate ? n.lastStudyDate.slice(0, 10) : ''
            newTodayCount = lastDate === todayDateStr ? (n.todayLessonsCount ?? 0) + countToCreate : countToCreate
          } else if (n.type === 'habit') {
            newStreak += 1
            newProg = Math.min(100, Math.round(newStreak * 10))
          } else {
            newProg = Math.min(100, Math.round(newCount * 12.5))
          }

          updatedParent = {
            ...n,
            tasksCount: newCount,
            todayLessonsCount: newTodayCount,
            lastStudyDate: nowStr,
            streak: newStreak,
            progress: newProg,
            done: newProg >= 100,
            xp: (n.xp ?? 0) + 25 * countToCreate,
            updatedAt: nowStr,
          }
          return updatedParent
        }
        return n
      })

      data.nodes.push(...createdNodes)
      data.edges.push(...newEdges)
      writeStoreData(data)

      return NextResponse.json({
        node: createdNodes[0],
        nodes: createdNodes,
        edge: newEdges[0],
        newEdges,
        parentNode: updatedParent,
      })
    }
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create node' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    const data = readStoreData()

    let updatedNode: GalaxyNode | null = null
    const affectedNodes: GalaxyNode[] = []

    data.nodes = data.nodes.map((n) => {
      if (n.id === id) {
        const finalUpdates = { ...updates }
        if (updates.milestones && Array.isArray(updates.milestones)) {
          const totalM = updates.milestones.length
          const completedM = updates.milestones.filter((m: { completed: boolean }) => m.completed).length
          const prog = totalM > 0 ? Math.round((completedM / totalM) * 100) : 0
          finalUpdates.progress = prog
          finalUpdates.done = prog >= 100
        }
        const nextNode: GalaxyNode = { ...n, ...finalUpdates, updatedAt: new Date().toISOString() }
        updatedNode = nextNode
        affectedNodes.push(nextNode)
        return nextNode
      } else if (updates.color && (n.skillId === id || n.parentId === id)) {
        const cascaded: GalaxyNode = { ...n, color: updates.color, updatedAt: new Date().toISOString() }
        affectedNodes.push(cascaded)
        return cascaded
      }
      return n
    })

    writeStoreData(data)
    return NextResponse.json({ node: updatedNode, affectedNodes })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update node' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const data = readStoreData()

    const toDeleteIds = new Set<string>([id])
    data.nodes.forEach((n) => {
      if (n.skillId === id || n.parentId === id) {
        toDeleteIds.add(n.id)
      }
    })

    data.nodes = data.nodes.filter((n) => !toDeleteIds.has(n.id))
    data.edges = data.edges.filter((e) => !toDeleteIds.has(e.fromId) && !toDeleteIds.has(e.toId))

    writeStoreData(data)
    return NextResponse.json({ success: true, deletedIds: Array.from(toDeleteIds) })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to delete node' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = body.userId || 'root'
    const inputNodes = Array.isArray(body.nodes) ? body.nodes : []
    const inputEdges = Array.isArray(body.edges) ? body.edges : []

    const cleanNodes = inputNodes.map((n: GalaxyNode) => ({ ...n, userId }))
    const cleanEdges = inputEdges.map((e: GalaxyEdge) => ({ ...e, userId }))

    const data = readStoreData()
    data.nodes = data.nodes.filter((n) => (n.userId || 'root') !== userId).concat(cleanNodes)
    data.edges = data.edges.filter((e) => (e.userId || 'root') !== userId).concat(cleanEdges)

    writeStoreData(data)
    return NextResponse.json({ success: true, count: cleanNodes.length })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to restore galaxy' }, { status: 500 })
  }
}
