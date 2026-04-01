import { NextResponse } from 'next/server'
import { createSubtask } from '@/lib/notion'

export async function POST(req: Request) {
  try {
    const { taskTitle, taskId, source } = await req.json()

    // Call Claude API to break down the task
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `Break down this business task into 4-6 focused subtasks, each doable in 15 minutes.
Task: "${taskTitle}"

Reply ONLY with a JSON array of strings, no explanation. Example:
["Write the headline copy", "Find 3 reference examples", "Sketch layout on paper", "Build section in Canva"]

Make them specific, action-oriented, and realistic for a female founder working on her business.`,
          },
        ],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text ?? '[]'

    let subtasks: string[] = []
    try {
      subtasks = JSON.parse(text)
    } catch {
      // parse the text manually if JSON fails
      subtasks = text
        .split('\n')
        .filter((l: string) => l.trim().startsWith('"') || l.trim().startsWith('-'))
        .map((l: string) => l.replace(/^[-"*\s]+|[",\s]+$/g, '').trim())
        .filter(Boolean)
    }

    // Create subtasks in Notion
    const created = await Promise.all(
      subtasks.map((title: string) => createSubtask(taskId, title, source))
    )

    return NextResponse.json({ subtasks, createdIds: created })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
