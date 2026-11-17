import fs from 'fs'
import path from 'path'
import os from 'os'
import type { GalaxyNode, GalaxyEdge, BrainUser } from '@/types'

export interface GalaxyStoreData {
  users: BrainUser[]
  nodes: GalaxyNode[]
  edges: GalaxyEdge[]
}

const BUNDLED_DATA_FILE = path.join(process.cwd(), 'data', 'galaxy_store.json')
const IS_SERVERLESS = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined

export function getDataFilePath(): string {
  if (IS_SERVERLESS) {
    return path.join(os.tmpdir(), 'galaxy_store.json')
  }
  return BUNDLED_DATA_FILE
}

let inMemoryStore: GalaxyStoreData | null = null

export const DEFAULT_ROOT_USER: BrainUser = {
  id: 'root',
  name: 'root',
  createdAt: '2026-11-17T00:00:00.000Z',
  avatarColor: '#00f0ff',
}

export function getInitialData(): GalaxyStoreData {
  return {
    users: [DEFAULT_ROOT_USER],
    nodes: [],
    edges: [],
  }
}

function sanitizeStoreData(parsed: any): GalaxyStoreData {
  const users: BrainUser[] = Array.isArray(parsed?.users) && parsed.users.length > 0
    ? parsed.users
    : [DEFAULT_ROOT_USER]

  if (!users.some((u) => u.id === 'root')) {
    users.unshift(DEFAULT_ROOT_USER)
  }

  const rawNodes: GalaxyNode[] = Array.isArray(parsed?.nodes) ? parsed.nodes : []
  const rawEdges: GalaxyEdge[] = Array.isArray(parsed?.edges) ? parsed.edges : []

  const nodes = rawNodes.map((n) => ({
    ...n,
    userId: (!n.userId || n.userId === 'local-user') ? 'root' : n.userId,
  }))

  const edges = rawEdges.map((e) => ({
    ...e,
    userId: (!e.userId || e.userId === 'local-user') ? 'root' : e.userId,
  }))

  return { users, nodes, edges }
}

export function readStoreData(): GalaxyStoreData {
  if (inMemoryStore) {
    return inMemoryStore
  }

  const targetFile = getDataFilePath()

  try {
    if (fs.existsSync(targetFile)) {
      const content = fs.readFileSync(targetFile, 'utf-8')
      const parsed = JSON.parse(content)
      inMemoryStore = sanitizeStoreData(parsed)
      return inMemoryStore
    }
  } catch (err) {
    console.warn('Failed reading from target file, falling back to bundle:', err)
  }

  try {
    if (fs.existsSync(BUNDLED_DATA_FILE)) {
      const content = fs.readFileSync(BUNDLED_DATA_FILE, 'utf-8')
      const parsed = JSON.parse(content)
      const data = sanitizeStoreData(parsed)
      inMemoryStore = data

      if (IS_SERVERLESS) {
        try {
          fs.mkdirSync(path.dirname(targetFile), { recursive: true })
          fs.writeFileSync(targetFile, JSON.stringify(data, null, 2))
        } catch {
          // ignore
        }
      }
      return data
    }
  } catch (err) {
    console.warn('Failed reading bundled data:', err)
  }

  inMemoryStore = getInitialData()
  return inMemoryStore
}

export function writeStoreData(data: GalaxyStoreData) {
  inMemoryStore = data
  const targetFile = getDataFilePath()
  try {
    fs.mkdirSync(path.dirname(targetFile), { recursive: true })
    fs.writeFileSync(targetFile, JSON.stringify(data, null, 2))
  } catch (err) {
    console.warn('Could not persist data file (in-memory store kept):', err)
  }
}
