import { NextRequest, NextResponse } from 'next/server'
import { readStoreData, writeStoreData } from '@/lib/serverData'
import type { BrainUser } from '@/types'

export async function GET() {
  // Do NOT expose existing users or the secret 'root' account to public network inspection
  return NextResponse.json({ users: [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawName = typeof body.name === 'string' ? body.name.trim() : ''

    if (!rawName) {
      return NextResponse.json({ error: 'Name or brain key is required' }, { status: 400 })
    }

    const data = await readStoreData()
    const normalizedInput = rawName.toLowerCase()

    // 1. Check if user already exists (case-insensitive lookup, e.g. 'root')
    const existing = data.users.find(
      (u) => u.name.toLowerCase() === normalizedInput || u.id.toLowerCase() === normalizedInput
    )

    if (existing) {
      return NextResponse.json({
        user: existing,
        isNew: false,
      })
    }

    // 2. Generate unique slug ID for new user
    let baseId = rawName
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (!baseId) {
      baseId = `user-${Date.now()}`
    }

    let finalId = baseId
    let counter = 1
    while (data.users.some((u) => u.id === finalId)) {
      finalId = `${baseId}-${counter++}`
    }

    const newUser: BrainUser = {
      id: finalId,
      name: rawName,
      createdAt: new Date().toISOString(),
      avatarColor: '#ffffff',
    }

    data.users.push(newUser)
    await writeStoreData(data)

    return NextResponse.json({ user: newUser, isNew: true })
  } catch (err) {
    console.error('Failed to authenticate brain user:', err)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
