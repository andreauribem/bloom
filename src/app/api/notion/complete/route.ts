import { NextResponse } from 'next/server'
import { markTaskDone } from '@/lib/notion'

export async function POST(req: Request) {
  try {
    const { taskId, source } = await req.json()
    await markTaskDone(taskId, source)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
