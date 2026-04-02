import { NextResponse } from 'next/server'

const CONTENT_OS_URL = process.env.CONTENT_OS_URL || 'https://content-os-app-production.up.railway.app'

export async function GET() {
  try {
    const res = await fetch(`${CONTENT_OS_URL}/api/objectives/summary`, {
      next: { revalidate: 60 }, // cache for 60s
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
