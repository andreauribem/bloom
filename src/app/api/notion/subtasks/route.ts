import { NextResponse } from 'next/server'
import { getSubtasks } from '@/lib/notion'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const parentId = searchParams.get('parentId')
  if (!parentId) return NextResponse.json({ error: 'parentId required' }, { status: 400 })
  try {
    const subtasks = await getSubtasks(parentId)
    return NextResponse.json({ subtasks })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
