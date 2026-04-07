import { NextResponse } from 'next/server'
import { getHabits, createHabitInNotion, updateHabitInNotion } from '@/lib/notion'

export async function GET() {
  try {
    const habits = await getHabits()
    return NextResponse.json({ habits })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, habits: [] }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { action, habit, pageId } = await req.json()

    if (action === 'create') {
      const notionPageId = await createHabitInNotion(habit)
      return NextResponse.json({ notionPageId })
    }

    if (action === 'update' && pageId) {
      await updateHabitInNotion(pageId, habit)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
