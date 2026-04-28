import { Client } from '@notionhq/client'
import { calcStars, Habit, HabitLog, HabitSchedule } from './gameStore'

export const notion = new Client({ auth: process.env.NOTION_TOKEN })

const DB = {
  sonderTasks:   process.env.NOTION_SONDER_TASKS_DB!,
  sonderContent: process.env.NOTION_SONDER_CONTENT_DB!,
  pbContent:     process.env.NOTION_PB_CONTENT_DB!,
  pbTasks:       process.env.NOTION_PB_TASKS_DB!,
  timeTracker:   process.env.NOTION_TIME_TRACKER_DB!,
  habits:        process.env.NOTION_HABITS_DB || '',
  habitLogs:     process.env.NOTION_HABIT_LOGS_DB || '',
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
  projectName: string            // from Projects relation
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

function getRelationIds(page: any, key: string): string[] {
  return (getProp(page, key)?.relation ?? []).map((r: any) => r.id)
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
function mapSonderTask(page: any, projectNames?: Map<string, string>): QuestTask {
  const taskType = getSelect(page, 'Task Type')
  const priority = getSelect(page, 'Priority ')
  const timeConsuming = getNumber(page, 'Time Consuming')
  const dueDate = getDate(page, 'Due Date')
  const projectIds = getRelationIds(page, 'Projects')
  const projectName = projectIds.length > 0 && projectNames
    ? (projectNames.get(projectIds[0]) ?? '')
    : ''
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
    projectName,
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
    projectName: '',
  }
}

// ── Fetch project names in batch ──────────────────────────────────────────
async function fetchProjectNames(pages: any[]): Promise<Map<string, string>> {
  const projectIds = new Set<string>()
  for (const page of pages) {
    for (const rel of (getProp(page, 'Projects')?.relation ?? [])) {
      projectIds.add(rel.id)
    }
  }
  if (projectIds.size === 0) return new Map()

  const names = new Map<string, string>()
  await Promise.all(
    Array.from(projectIds).map(async (id) => {
      try {
        const page = await notion.pages.retrieve({ page_id: id })
        const titleProp = Object.values((page as any).properties).find((p: any) => p.type === 'title') as any
        const name = titleProp?.title?.[0]?.plain_text ?? ''
        names.set(id, name)
      } catch { names.set(id, '') }
    })
  )
  return names
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
            { property: 'Due Date', date: { before: today } },
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
          { or: [
            { property: 'Sprint Status', select: { equals: 'Current' } },
            { property: 'Due Date', date: { before: today } },
          ]},
        ],
      },
      page_size: 20,
    }),
  ])

  // Batch fetch project names for sonder tasks
  const projectNames = await fetchProjectNames(sonderRes.results)

  const tasks = [
    ...sonderRes.results.map(p => mapSonderTask(p, projectNames)),
    ...pbRes.results.map(mapPbTask),
  ]
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

  const projectNames = await fetchProjectNames(sonderRes.results)

  const tasks = [
    ...sonderRes.results.map(p => mapSonderTask(p, projectNames)),
    ...pbRes.results.map(mapPbTask),
  ]
  return tasks.sort((a, b) => b.daysOverdue - a.daysOverdue)
}

// ── Recently completed tasks (for Notion sync) ───────────────────────────
// Uses last_edited_time so we catch tasks marked Done directly in Notion
// even when Completion Date wasn't auto-set or is from another day.
export async function getRecentlyCompletedTasks(daysBack = 7): Promise<QuestTask[]> {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
  const [sonderRes, pbRes] = await Promise.all([
    notion.databases.query({
      database_id: DB.sonderTasks,
      filter: {
        and: [
          { property: 'Status', status: { equals: 'Done' } },
          { timestamp: 'last_edited_time', last_edited_time: { on_or_after: since } },
        ],
      },
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      page_size: 50,
    }).catch(() => ({ results: [] })),
    notion.databases.query({
      database_id: DB.pbTasks,
      filter: {
        and: [
          { property: 'Status', status: { equals: 'Done' } },
          { timestamp: 'last_edited_time', last_edited_time: { on_or_after: since } },
        ],
      },
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      page_size: 30,
    }).catch(() => ({ results: [] })),
  ])
  return [
    ...sonderRes.results.map(p => mapSonderTask(p)),
    ...pbRes.results.map(mapPbTask),
  ]
}

// ── Completed tasks for the Done tab (with completion metadata) ──────────
export type CompletedTask = QuestTask & {
  completedAt: string | null   // last_edited_time as ISO
  completionDate: string | null // Completion Date prop, if set
}

export async function getCompletedTasks(daysBack = 30): Promise<CompletedTask[]> {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
  const [sonderRes, pbRes] = await Promise.all([
    notion.databases.query({
      database_id: DB.sonderTasks,
      filter: {
        and: [
          { property: 'Status', status: { equals: 'Done' } },
          { timestamp: 'last_edited_time', last_edited_time: { on_or_after: since } },
        ],
      },
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      page_size: 100,
    }).catch(() => ({ results: [] })),
    notion.databases.query({
      database_id: DB.pbTasks,
      filter: {
        and: [
          { property: 'Status', status: { equals: 'Done' } },
          { timestamp: 'last_edited_time', last_edited_time: { on_or_after: since } },
        ],
      },
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      page_size: 100,
    }).catch(() => ({ results: [] })),
  ])

  const projectNames = await fetchProjectNames(sonderRes.results)

  const enrich = (page: any, base: QuestTask): CompletedTask => ({
    ...base,
    completedAt: page.last_edited_time ?? null,
    completionDate: getDate(page, 'Completion Date'),
  })

  const all: CompletedTask[] = [
    ...sonderRes.results.map((p: any) => enrich(p, mapSonderTask(p, projectNames))),
    ...pbRes.results.map((p: any) => enrich(p, mapPbTask(p))),
  ]
  // Sort by completedAt desc
  return all.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
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
  return res.results.map(p => mapSonderTask(p))
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

  // Create time entry AND set task status to "In progress"
  const [page] = await Promise.all([
    notion.pages.create({
      parent: { database_id: DB.timeTracker },
      properties: {
        Name: { title: [{ text: { content: taskTitle } }] },
        Start: { date: { start: now } },
        Status: { status: { name: 'In progress' } },
        [relationKey]: { relation: [{ id: taskId }] },
        Brand: { multi_select: [{ name: brandValue }] },
      },
    }),
    // Update task status to "In progress"
    notion.pages.update({
      page_id: taskId,
      properties: {
        Status: { status: { name: 'In progress' } },
      },
    }),
  ])
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

// ── Habits ────────────────────────────────────────────────────────────────

const DAY_NAME_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const DAY_NUM_MAP: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }

function mapNotionToHabit(page: any): Habit {
  const props = page.properties
  const titleProp = props.Name?.title?.[0]?.plain_text ?? 'Habit'
  const emojiProp = props.Emoji?.rich_text?.[0]?.plain_text ?? '📋'
  const importanceProp = (props.Importance?.select?.name?.toLowerCase() ?? 'medium') as Habit['importance']
  const scheduleTypeProp = props['Schedule Type']?.select?.name ?? 'Daily'
  const daysProp = props['Schedule Days']?.multi_select?.map((s: any) => DAY_NAME_MAP[s.name]).filter((d: number | undefined) => d !== undefined) ?? []
  const timesPerWeekProp = props['Times Per Week']?.number ?? undefined
  const activeProp = props.Active?.checkbox ?? true

  let schedType: HabitSchedule['type'] = 'daily'
  if (scheduleTypeProp === 'Specific Days') schedType = 'specific_days'
  else if (scheduleTypeProp === 'Times per Week') schedType = 'times_per_week'

  return {
    id: `notion_${page.id}`,
    name: titleProp,
    emoji: emojiProp,
    importance: importanceProp,
    schedule: {
      type: schedType,
      ...(schedType === 'specific_days' ? { days: daysProp } : {}),
      ...(schedType === 'times_per_week' ? { timesPerWeek: timesPerWeekProp } : {}),
    },
    active: activeProp,
    notionPageId: page.id,
    createdAt: page.created_time,
  }
}

export async function getHabits(): Promise<Habit[]> {
  if (!DB.habits) return []
  try {
    const res = await notion.databases.query({
      database_id: DB.habits,
      filter: { property: 'Active', checkbox: { equals: true } },
    })
    return res.results.map(mapNotionToHabit)
  } catch (e) {
    console.error('Failed to fetch habits from Notion:', e)
    return []
  }
}

export async function createHabitInNotion(habit: Habit): Promise<string> {
  if (!DB.habits) return ''
  const schedTypeName = habit.schedule.type === 'specific_days' ? 'Specific Days'
    : habit.schedule.type === 'times_per_week' ? 'Times per Week'
    : 'Daily'

  const page = await notion.pages.create({
    parent: { database_id: DB.habits },
    properties: {
      Name: { title: [{ text: { content: habit.name } }] },
      Emoji: { rich_text: [{ text: { content: habit.emoji } }] },
      Importance: { select: { name: habit.importance.charAt(0).toUpperCase() + habit.importance.slice(1) } },
      'Schedule Type': { select: { name: schedTypeName } },
      ...(habit.schedule.type === 'specific_days' && habit.schedule.days ? {
        'Schedule Days': { multi_select: habit.schedule.days.map(d => ({ name: DAY_NUM_MAP[d] })) },
      } : {}),
      ...(habit.schedule.type === 'times_per_week' && habit.schedule.timesPerWeek ? {
        'Times Per Week': { number: habit.schedule.timesPerWeek },
      } : {}),
      Active: { checkbox: true },
    },
  })
  return page.id
}

export async function updateHabitInNotion(pageId: string, habit: Partial<Habit>): Promise<void> {
  if (!DB.habits) return
  const properties: Record<string, any> = {}
  if (habit.name) properties.Name = { title: [{ text: { content: habit.name } }] }
  if (habit.emoji) properties.Emoji = { rich_text: [{ text: { content: habit.emoji } }] }
  if (habit.importance) properties.Importance = { select: { name: habit.importance.charAt(0).toUpperCase() + habit.importance.slice(1) } }
  if (habit.active !== undefined) properties.Active = { checkbox: habit.active }

  await notion.pages.update({ page_id: pageId, properties })
}

export async function logHabitCompletion(habitNotionId: string, date: string, completed: boolean): Promise<string> {
  if (!DB.habitLogs) return ''
  const page = await notion.pages.create({
    parent: { database_id: DB.habitLogs },
    properties: {
      Name: { title: [{ text: { content: `${date}` } }] },
      Habit: { relation: [{ id: habitNotionId }] },
      Date: { date: { start: date } },
      Completed: { checkbox: completed },
    },
  })
  return page.id
}

export async function getHabitLogs(from: string, to: string): Promise<HabitLog[]> {
  if (!DB.habitLogs) return []
  try {
    const res = await notion.databases.query({
      database_id: DB.habitLogs,
      filter: {
        and: [
          { property: 'Date', date: { on_or_after: from } },
          { property: 'Date', date: { on_or_before: to } },
        ],
      },
      page_size: 100,
    })
    return res.results.map((p: any) => ({
      date: p.properties.Date?.date?.start ?? '',
      habitId: `notion_${p.properties.Habit?.relation?.[0]?.id ?? ''}`,
      completed: p.properties.Completed?.checkbox ?? false,
    }))
  } catch (e) {
    console.error('Failed to fetch habit logs from Notion:', e)
    return []
  }
}
