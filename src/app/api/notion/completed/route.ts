import { NextResponse } from 'next/server'
import { getCompletedTasks } from '@/lib/notion'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const days = Math.max(1, Math.min(90, parseInt(searchParams.get('days') ?? '30', 10)))
  try {
    const tasks = await getCompletedTasks(days)
    return NextResponse.json({ tasks })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
