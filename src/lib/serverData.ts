import fs from 'fs'
import path from 'path'
import os from 'os'
import postgres from 'postgres'
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

// Optional PostgreSQL client if a valid DATABASE_URL is provided (e.g. Supabase, Neon)
let sqlClient: ReturnType<typeof postgres> | null = null
let dbInitialized = false

function getDatabaseClient() {
  const dbUrl = process.env.DATABASE_URL
  if (
    !dbUrl ||
    dbUrl.includes('[ref]') ||
    dbUrl.includes('[password]') ||
    (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://'))
  ) {
    return null
  }
  if (!sqlClient) {
    try {
      sqlClient = postgres(dbUrl, {
        max: 1,
        idle_timeout: 10,
        connect_timeout: 5,
        ssl: 'require',
      })
    } catch (e) {
      console.warn('Failed to initialize Postgres client:', e)
      sqlClient = null
    }
  }
  return sqlClient
}

async function ensureDbTable(sql: ReturnType<typeof postgres>) {
  if (dbInitialized) return
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS galaxy_global_store (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    dbInitialized = true
  } catch (err) {
    console.warn('Failed creating galaxy_global_store table:', err)
  }
}

export async function readStoreData(): Promise<GalaxyStoreData> {
  // 1. Try PostgreSQL cloud database if available
  const sql = getDatabaseClient()
  if (sql) {
    try {
      await ensureDbTable(sql)
      const rows = await sql`SELECT data FROM galaxy_global_store WHERE id = 'main' LIMIT 1`
      if (rows && rows.length > 0 && rows[0].data) {
        const sanitized = sanitizeStoreData(rows[0].data)
        inMemoryStore = sanitized
        return sanitized
      }
    } catch (dbErr) {
      console.warn('Postgres read failed, falling back to local file store:', dbErr)
    }
  }

  // 2. Try in-memory store
  if (inMemoryStore) {
    return inMemoryStore
  }

  // 3. Try reading from target file (e.g. /tmp on serverless or local)
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

  // 4. Try reading from bundled Git data file
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

export async function writeStoreData(data: GalaxyStoreData): Promise<void> {
  inMemoryStore = data

  // 1. Persist to PostgreSQL if configured
  const sql = getDatabaseClient()
  if (sql) {
    try {
      await ensureDbTable(sql)
      const jsonData = JSON.stringify(data)
      await sql`
        INSERT INTO galaxy_global_store (id, data, updated_at)
        VALUES ('main', ${jsonData}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE
        SET data = EXCLUDED.data, updated_at = NOW()
      `
    } catch (dbErr) {
      console.warn('Postgres write failed, continuing with file store:', dbErr)
    }
  }

  // 2. Persist to target file
  const targetFile = getDataFilePath()
  try {
    fs.mkdirSync(path.dirname(targetFile), { recursive: true })
    fs.writeFileSync(targetFile, JSON.stringify(data, null, 2))
  } catch (err) {
    console.warn('Could not persist data file (in-memory store kept):', err)
  }
}
