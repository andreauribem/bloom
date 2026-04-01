import { NextResponse } from 'next/server'
import { getTodaysTasks, getAllTasks } from '@/lib/notion'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view') ?? 'today'
  try {
    const tasks = view === 'all' ? await getAllTasks() : await getTodaysTasks()
    return NextResponse.json({ tasks })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
