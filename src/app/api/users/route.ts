import { NextRequest, NextResponse } from 'next/server'
import { readStoreData, writeStoreData } from '@/lib/serverData'
import type { BrainUser } from '@/types'

const CELESTIAL_AVATAR_COLORS = [
  '#00f0ff', // Cyan
  '#a855f7', // Purple
  '#f43f5e', // Rose
  '#38bdf8', // Sky
  '#10b981', // Emerald
  '#fbbf24', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
]

export async function GET() {
  try {
    const data = readStoreData()
    const usersWithStats: BrainUser[] = data.users.map((u) => {
      const count = data.nodes.filter((n) => (n.userId || 'root') === u.id).length
      return {
        ...u,
        nodesCount: count,
      }
    })
    return NextResponse.json({ users: usersWithStats })
  } catch (err) {
    console.error('Failed to get users:', err)
    return NextResponse.json({ error: 'Failed to retrieve brain users' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawName = typeof body.name === 'string' ? body.name.trim() : ''

    if (!rawName) {
      return NextResponse.json({ error: 'Brain name is required' }, { status: 400 })
    }

    const data = readStoreData()

    // 1. Check if user already exists (case-insensitive)
    const existing = data.users.find(
      (u) => u.name.toLowerCase() === rawName.toLowerCase() || u.id.toLowerCase() === rawName.toLowerCase()
    )

    if (existing) {
      const count = data.nodes.filter((n) => (n.userId || 'root') === existing.id).length
      return NextResponse.json({
        user: { ...existing, nodesCount: count },
        isNew: false,
      })
    }

    // 2. Generate unique slug ID
    let baseId = rawName
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (!baseId) {
      baseId = `brain-${Date.now()}`
    }

    let finalId = baseId
    let counter = 1
    while (data.users.some((u) => u.id === finalId)) {
      finalId = `${baseId}-${counter++}`
    }

    const colorIndex = data.users.length % CELESTIAL_AVATAR_COLORS.length
    const newUser: BrainUser = {
      id: finalId,
      name: rawName,
      createdAt: new Date().toISOString(),
      avatarColor: CELESTIAL_AVATAR_COLORS[colorIndex],
      nodesCount: 0,
    }

    data.users.push(newUser)
    writeStoreData(data)

    return NextResponse.json({ user: newUser, isNew: true })
  } catch (err) {
    console.error('Failed to create user:', err)
    return NextResponse.json({ error: 'Failed to create brain user' }, { status: 500 })
  }
}
