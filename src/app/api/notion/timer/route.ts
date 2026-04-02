import { NextResponse } from 'next/server'
import { createTimeEntry, stopTimeEntry } from '@/lib/notion'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, taskId, taskTitle, source, entryId } = body

    if (action === 'start') {
      const id = await createTimeEntry(taskId, taskTitle, source)
      return NextResponse.json({ entryId: id })
    }

    if (action === 'stop' && entryId) {
      await stopTimeEntry(entryId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
