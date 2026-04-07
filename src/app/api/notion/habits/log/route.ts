import { NextResponse } from 'next/server'
import { logHabitCompletion } from '@/lib/notion'

export async function POST(req: Request) {
  try {
    const { habitNotionId, date, completed } = await req.json()
    if (!habitNotionId || !date) {
      return NextResponse.json({ error: 'Missing habitNotionId or date' }, { status: 400 })
    }
    const id = await logHabitCompletion(habitNotionId, date, completed)
    return NextResponse.json({ id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
