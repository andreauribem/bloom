// ── Monthly Quests ────────────────────────────────────────────────────────
// One thematic challenge per month. Persists pet/streak/stars; just adds rhythm.

export type MonthlyQuestType = 'tasks' | 'bosses' | 'streak' | 'habits' | 'evolution'

export type MonthlyQuest = {
  id: string            // YYYY-MM
  monthLabel: string    // 'April'
  title: string
  description: string
  emoji: string
  type: MonthlyQuestType
  target: number
  starReward: number
  xpReward: number
}

type Theme = Omit<MonthlyQuest, 'id' | 'monthLabel'>

const THEMES: Theme[] = [
  // Jan — fresh start
  { title: 'Fresh Start',     description: 'Complete 30 quests this month',           emoji: '❄️', type: 'tasks',    target: 30, starReward: 150, xpReward: 500 },
  // Feb — heart / consistency
  { title: 'Heart of Habit',  description: 'Reach a 14-day streak',                   emoji: '💗', type: 'streak',   target: 14, starReward: 200, xpReward: 600 },
  // Mar — bloom
  { title: 'Spring Bloom',    description: 'Complete 5 boss quests',                  emoji: '🌷', type: 'bosses',   target: 5,  starReward: 175, xpReward: 550 },
  // Apr — habits
  { title: 'Routine Builder', description: 'Log 50 habit completions',                emoji: '🌱', type: 'habits',   target: 50, starReward: 175, xpReward: 550 },
  // May — output
  { title: 'In Full Bloom',   description: 'Complete 40 quests this month',           emoji: '🌸', type: 'tasks',    target: 40, starReward: 200, xpReward: 650 },
  // Jun — heat
  { title: 'Summer Heat',     description: 'Complete 8 boss quests',                  emoji: '☀️', type: 'bosses',   target: 8,  starReward: 225, xpReward: 700 },
  // Jul — pace
  { title: 'Vacation Mode',   description: 'Reach a 21-day streak',                   emoji: '🏖️', type: 'streak',   target: 21, starReward: 250, xpReward: 750 },
  // Aug — momentum
  { title: 'Late Summer',     description: 'Log 60 habit completions',                emoji: '🌻', type: 'habits',   target: 60, starReward: 225, xpReward: 700 },
  // Sep — back to school
  { title: 'Sharp Mind',      description: 'Complete 35 quests this month',           emoji: '📚', type: 'tasks',    target: 35, starReward: 200, xpReward: 650 },
  // Oct — focus
  { title: 'Cozy Focus',      description: 'Complete 6 boss quests',                  emoji: '🍂', type: 'bosses',   target: 6,  starReward: 200, xpReward: 650 },
  // Nov — gratitude / consistency
  { title: 'Hearth & Home',   description: 'Log 70 habit completions',                emoji: '🕯️', type: 'habits',   target: 70, starReward: 250, xpReward: 750 },
  // Dec — close strong
  { title: 'Year-End Glow',   description: 'Reach a 28-day streak',                   emoji: '✨', type: 'streak',   target: 28, starReward: 300, xpReward: 900 },
]

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function getMonthKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function getMonthlyQuest(date = new Date()): MonthlyQuest {
  const theme = THEMES[date.getMonth()]
  return {
    id: getMonthKey(date),
    monthLabel: MONTH_NAMES[date.getMonth()],
    ...theme,
  }
}

export function getMonthlyProgress(
  quest: MonthlyQuest,
  counters: { tasks: number; bosses: number; habits: number; streak: number },
): number {
  switch (quest.type) {
    case 'tasks':  return Math.min(counters.tasks, quest.target)
    case 'bosses': return Math.min(counters.bosses, quest.target)
    case 'habits': return Math.min(counters.habits, quest.target)
    case 'streak': return Math.min(counters.streak, quest.target)
    // evolution: unused for now; would check petStage
    default: return 0
  }
}

export function isMonthlyQuestComplete(
  quest: MonthlyQuest,
  counters: { tasks: number; bosses: number; habits: number; streak: number },
): boolean {
  return getMonthlyProgress(quest, counters) >= quest.target
}
