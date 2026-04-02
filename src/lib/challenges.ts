// ── Daily Challenges ──────────────────────────────────────────────────────
// Random daily challenges that give bonus XP and stars

export type Challenge = {
  id: string
  title: string
  description: string
  emoji: string
  type: 'tasks' | 'streak' | 'checkin' | 'combo' | 'time' | 'boss'
  target: number
  xpReward: number
  starReward: number
}

// Pool of possible challenges
const CHALLENGE_POOL: Omit<Challenge, 'id'>[] = [
  // Task-based
  { title: 'Speed Runner', description: 'Complete 3 tasks in 1 hour', emoji: '⚡', type: 'tasks', target: 3, xpReward: 50, starReward: 5 },
  { title: 'Momentum', description: 'Complete 5 tasks today', emoji: '🚀', type: 'tasks', target: 5, xpReward: 80, starReward: 8 },
  { title: 'First Blood', description: 'Complete a task before 10am', emoji: '🌅', type: 'time', target: 10, xpReward: 30, starReward: 3 },
  { title: 'Night Owl', description: 'Complete a task after 8pm', emoji: '🦉', type: 'time', target: 20, xpReward: 30, starReward: 3 },
  { title: 'Triple Threat', description: 'Complete 3 tasks in a row (combo)', emoji: '🔥', type: 'combo', target: 3, xpReward: 60, starReward: 6 },

  // Streak & consistency
  { title: 'Consistency', description: 'Keep your streak alive today', emoji: '📅', type: 'streak', target: 1, xpReward: 20, starReward: 2 },
  { title: 'Week Warrior', description: 'Reach a 7-day streak', emoji: '🏆', type: 'streak', target: 7, xpReward: 100, starReward: 15 },

  // Self-care
  { title: 'Self-Care Day', description: 'Complete all 5 check-in items', emoji: '💆', type: 'checkin', target: 5, xpReward: 40, starReward: 5 },
  { title: 'Hydrated', description: 'Log water in your check-in', emoji: '💧', type: 'checkin', target: 1, xpReward: 15, starReward: 2 },

  // Boss
  { title: 'Boss Hunter', description: 'Defeat a boss task (high priority)', emoji: '👹', type: 'boss', target: 1, xpReward: 70, starReward: 10 },
  { title: 'Double Boss', description: 'Defeat 2 boss tasks today', emoji: '💀', type: 'boss', target: 2, xpReward: 120, starReward: 15 },
]

// Pick 3 random challenges for today (deterministic per date)
export function getDailyChallenges(dateStr: string): Challenge[] {
  // Simple hash from date string for deterministic randomness
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i)
    hash |= 0
  }

  const shuffled = [...CHALLENGE_POOL]
  // Fisher-Yates with seeded random
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff
    const j = hash % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled.slice(0, 3).map((c, i) => ({
    ...c,
    id: `${dateStr}-${i}`,
  }))
}

// Check if a challenge is completed based on current state
export function isChallengeComplete(
  challenge: Challenge,
  tasksCompletedToday: number,
  streak: number,
  comboCount: number,
  checkinScore: number,
  bossesDefeatedToday: number,
  currentHour: number,
): boolean {
  switch (challenge.type) {
    case 'tasks': return tasksCompletedToday >= challenge.target
    case 'streak': return streak >= challenge.target
    case 'combo': return comboCount >= challenge.target
    case 'checkin': return checkinScore >= challenge.target
    case 'boss': return bossesDefeatedToday >= challenge.target
    case 'time':
      if (challenge.target <= 12) return currentHour < challenge.target && tasksCompletedToday > 0  // morning challenge
      return currentHour >= challenge.target && tasksCompletedToday > 0  // evening challenge
    default: return false
  }
}
