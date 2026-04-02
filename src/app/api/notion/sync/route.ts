import { NextResponse } from 'next/server'
import { getRecentlyCompletedTasks } from '@/lib/notion'

export async function GET() {
  try {
    const tasks = await getRecentlyCompletedTasks()
    return NextResponse.json({ tasks })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
