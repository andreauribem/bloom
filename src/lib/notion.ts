import { Client } from '@notionhq/client'
import { calcStars } from './gameStore'

export const notion = new Client({ auth: process.env.NOTION_TOKEN })

const DB = {
  sonderTasks:   process.env.NOTION_SONDER_TASKS_DB!,
  sonderContent: process.env.NOTION_SONDER_CONTENT_DB!,
  pbContent:     process.env.NOTION_PB_CONTENT_DB!,
  pbTasks:       process.env.NOTION_PB_TASKS_DB!,
  timeTracker:   process.env.NOTION_TIME_TRACKER_DB!,
}

export type QuestTask = {
  id: string
  title: string
  status: string
  priority: string
  taskType: string
  doDate: string | null
  dueDate: string | null
  timeConsuming: number | null   // hours from Notion
  stars: number
  hasSubtasks: boolean
  source: 'sonder' | 'personal'
  notionUrl: string
  daysOverdue: number            // 0 = not overdue, >0 = days past due
  subtasks?: QuestTask[]
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getProp(page: any, key: string): any {
  return page.properties?.[key]
}

function getTitle(page: any, ...keys: string[]): string {
  for (const key of keys) {
    const t = getProp(page, key)?.title?.[0]?.plain_text
    if (t) return t
  }
  return 'Untitled'
}

function getStatus(page: any): string {
  return getProp(page, 'Status')?.status?.name ?? 'Not started'
}

function getSelect(page: any, key: string): string {
  return getProp(page, key)?.select?.name ?? ''
}

function getDate(page: any, key: string): string | null {
  return getProp(page, key)?.date?.start ?? null
}

function getNumber(page: any, key: string): number | null {
  const v = getProp(page, key)?.number
  return v != null ? v : null
}

function getRelationCount(page: any, key: string): number {
  return getProp(page, key)?.relation?.length ?? 0
}

function calcDaysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

// ── Mappers ────────────────────────────────────────────────────────────────
function mapSonderTask(page: any): QuestTask {
  const taskType = getSelect(page, 'Task Type')
  const priority = getSelect(page, 'Priority ')
  const timeConsuming = getNumber(page, 'Time Consuming')
  const dueDate = getDate(page, 'Due Date')
  return {
    id: page.id,
    title: getTitle(page, 'Task Name', 'Name'),
    status: getStatus(page),
    priority,
    taskType,
    doDate: getDate(page, 'Do Date'),
    dueDate,
    timeConsuming,
    stars: calcStars(taskType, priority, timeConsuming),
    hasSubtasks: getRelationCount(page, 'Sub-task') > 0,
    source: 'sonder',
    notionUrl: page.url,
    daysOverdue: calcDaysOverdue(dueDate),
  }
}

function mapPbTask(page: any): QuestTask {
  const taskType = getSelect(page, 'Task Type')
  const priority = ''
  const timeConsuming = getNumber(page, 'Time Estimate (hours)')
  const dueDate = getDate(page, 'Due Date')
  return {
    id: page.id,
    title: getTitle(page, 'Name', 'Task Name'),
    status: getStatus(page),
    priority,
    taskType,
    doDate: getDate(page, 'Do Date'),
    dueDate,
    timeConsuming,
    stars: calcStars(taskType, priority, timeConsuming),
    hasSubtasks: false,
    source: 'personal',
    notionUrl: page.url,
    daysOverdue: calcDaysOverdue(dueDate),
  }
}

// ── Queries ────────────────────────────────────────────────────────────────
export async function getTodaysTasks(): Promise<QuestTask[]> {
  const today = new Date().toISOString().split('T')[0]
  const [sonderRes, pbRes] = await Promise.all([
    notion.databases.query({
      database_id: DB.sonderTasks,
      filter: {
        and: [
          { property: 'Status', status: { does_not_equal: 'Done' } },
          { or: [
            { property: 'Do Date', date: { equals: today } },
            { property: 'Sprint Status ', select: { equals: 'Current' } },
          ]},
        ],
      },
      sorts: [{ property: 'Priority ', direction: 'ascending' }],
      page_size: 30,
    }),
    notion.databases.query({
      database_id: DB.pbTasks,
      filter: {
        and: [
          { property: 'Status', status: { does_not_equal: 'Done' } },
          { property: 'Sprint Status', select: { equals: 'Current' } },
        ],
      },
      page_size: 20,
    }),
  ])
  const tasks = [
    ...sonderRes.results.map(mapSonderTask),
    ...pbRes.results.map(mapPbTask),
  ]
  // Sort: overdue first, then by priority
  return tasks.sort((a, b) => b.daysOverdue - a.daysOverdue)
}

export async function getAllTasks(): Promise<QuestTask[]> {
  const [sonderRes, pbRes] = await Promise.all([
    notion.databases.query({
      database_id: DB.sonderTasks,
      filter: { property: 'Status', status: { does_not_equal: 'Done' } },
      sorts: [{ property: 'Due Date', direction: 'ascending' }],
      page_size: 50,
    }),
    notion.databases.query({
      database_id: DB.pbTasks,
      filter: { property: 'Status', status: { does_not_equal: 'Done' } },
      page_size: 30,
    }),
  ])
  const tasks = [
    ...sonderRes.results.map(mapSonderTask),
    ...pbRes.results.map(mapPbTask),
  ]
  return tasks.sort((a, b) => b.daysOverdue - a.daysOverdue)
}

// ── Recently completed tasks (for Notion sync) ───────────────────────────
export async function getRecentlyCompletedTasks(): Promise<QuestTask[]> {
  const today = new Date().toISOString().split('T')[0]
  const [sonderRes, pbRes] = await Promise.all([
    notion.databases.query({
      database_id: DB.sonderTasks,
      filter: {
        and: [
          { property: 'Status', status: { equals: 'Done' } },
          { property: 'Completion Date', date: { equals: today } },
        ],
      },
      page_size: 30,
    }).catch(() => ({ results: [] })),
    notion.databases.query({
      database_id: DB.pbTasks,
      filter: {
        and: [
          { property: 'Status', status: { equals: 'Done' } },
          { property: 'Completion Date', date: { equals: today } },
        ],
      },
      page_size: 20,
    }).catch(() => ({ results: [] })),
  ])
  return [
    ...sonderRes.results.map(mapSonderTask),
    ...pbRes.results.map(mapPbTask),
  ]
}

// ── Subtasks ──────────────────────────────────────────────────────────────
export async function getSubtasks(parentId: string): Promise<QuestTask[]> {
  const res = await notion.databases.query({
    database_id: DB.sonderTasks,
    filter: {
      property: 'Parent task',
      relation: { contains: parentId },
    },
    page_size: 20,
  })
  return res.results.map(mapSonderTask)
}

// ── Mark done ─────────────────────────────────────────────────────────────
export async function markTaskDone(taskId: string, source: 'sonder' | 'personal') {
  await notion.pages.update({
    page_id: taskId,
    properties: {
      Status: { status: { name: 'Done' } },
      'Completion Date': { date: { start: new Date().toISOString().split('T')[0] } },
    },
  })
}

// ── Time Tracking ─────────────────────────────────────────────────────────
export async function createTimeEntry(taskId: string, taskTitle: string, source: 'sonder' | 'personal'): Promise<string> {
  const now = new Date().toISOString()
  const relationKey = source === 'sonder' ? 'Sonder' : 'Personal Brand (USA)'
  const brandValue = source === 'sonder' ? '🟡 Sonder' : '🔵 Personal Brand USA'

  const page = await notion.pages.create({
    parent: { database_id: DB.timeTracker },
    properties: {
      Name: { title: [{ text: { content: taskTitle } }] },
      Start: { date: { start: now } },
      Status: { status: { name: 'In progress' } },
      [relationKey]: { relation: [{ id: taskId }] },
      Brand: { multi_select: [{ name: brandValue }] },
    },
  })
  return page.id
}

export async function stopTimeEntry(entryId: string): Promise<void> {
  const now = new Date().toISOString()
  await notion.pages.update({
    page_id: entryId,
    properties: {
      End: { date: { start: now } },
      Status: { status: { name: 'Done' } },
    },
  })
}

// ── Subtask creation ──────────────────────────────────────────────────────
export async function createSubtask(parentId: string, title: string, source: 'sonder' | 'personal'): Promise<string> {
  const dbId = source === 'sonder' ? DB.sonderTasks : DB.pbTasks
  const titleKey = source === 'sonder' ? 'Task Name' : 'Name'
  const page = await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      [titleKey]: { title: [{ text: { content: title } }] },
      Status: { status: { name: 'Not started' } },
      ...(source === 'sonder' ? { 'Parent task': { relation: [{ id: parentId }] } } : {}),
    },
  })
  return page.id
}
