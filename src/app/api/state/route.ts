import { NextResponse } from 'next/server'

const STATE_KEY = 'bloom_state'

// Use Redis if env vars are set, otherwise fall back to in-memory (local dev)
async function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  const { Redis } = await import('@upstash/redis')
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

// Local dev fallback: file-based storage
async function getFileState() {
  try {
    const { readFileSync, existsSync } = await import('fs')
    const { join } = await import('path')
    const file = join(process.cwd(), 'data', 'state.json')
    if (!existsSync(file)) return null
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch { return null }
}

async function saveFileState(state: unknown) {
  try {
    const { writeFileSync, existsSync, mkdirSync } = await import('fs')
    const { join } = await import('path')
    const dir = join(process.cwd(), 'data')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'state.json'), JSON.stringify(state))
  } catch {}
}

export async function GET() {
  try {
    const redis = await getRedis()
    if (redis) {
      const data = await redis.get(STATE_KEY)
      return NextResponse.json(data ?? null)
    }
    return NextResponse.json(await getFileState())
  } catch {
    return NextResponse.json(null)
  }
}

export async function DELETE() {
  try {
    const redis = await getRedis()
    if (redis) {
      await redis.del(STATE_KEY)
    } else {
      const { existsSync, unlinkSync } = await import('fs')
      const { join } = await import('path')
      const file = join(process.cwd(), 'data', 'state.json')
      if (existsSync(file)) unlinkSync(file)
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const state = await req.json()
    const redis = await getRedis()
    if (redis) {
      await redis.set(STATE_KEY, state)
    } else {
      await saveFileState(state)
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
