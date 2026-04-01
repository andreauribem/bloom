'use client'

// ── Types ──────────────────────────────────────────────────────────────────
export type Pet = {
  id: string
  name: string
  emoji: string
  sprite: string
}

export type Reward = {
  id: string
  title: string
  cost: number
  emoji: string
  redeemed: boolean
}

export type DailyCheck = {
  date: string
  slept: boolean
  exercised: boolean
  water: boolean
  noPhone: boolean
  learned: boolean
}

export type Achievement = {
  id: string
  title: string
  description: string
  emoji: string
  unlockedAt: string | null
}

export type GameState = {
  petId: string
  petName: string
  stars: number
  xp: number
  level: number
  wellness: number       // 0–100: affected by daily check-in
  hunger: number         // 0–100: tamagotchi hunger, decreases over time
  lastHungerTick: number // timestamp: last time hunger was decremented
  rewards: Reward[]
  dailyChecks: DailyCheck[]
  completedTaskIds: string[]
  streak: number
  lastActiveDate: string
  comboCount: number
  lastComboTime: number
  dailyXP: number
  dailyXPDate: string
  dailyXPGoal: number
  achievements: Achievement[]
  petMood: 'happy' | 'excited' | 'neutral' | 'tired' | 'hungry'
  totalTasksCompleted: number
}

// ── Pets ───────────────────────────────────────────────────────────────────
export const PETS: Pet[] = [
  { id: 'bear',    name: 'Mochi',   emoji: '🐻', sprite: '🐻' },
  { id: 'raccoon', name: 'Rocky',   emoji: '🦝', sprite: '🦝' },
  { id: 'cat',     name: 'Luna',    emoji: '🐱', sprite: '🐱' },
  { id: 'fox',     name: 'Maple',   emoji: '🦊', sprite: '🦊' },
  { id: 'bunny',   name: 'Biscuit', emoji: '🐰', sprite: '🐰' },
  { id: 'frog',    name: 'Lumi',    emoji: '🐸', sprite: '🐸' },
]

// ── Default rewards ────────────────────────────────────────────────────────
const DEFAULT_REWARDS: Reward[] = [
  { id: '1', title: 'Matcha latte',      cost: 20,  emoji: '🍵', redeemed: false },
  { id: '2', title: 'TV show episode',   cost: 30,  emoji: '📺', redeemed: false },
  { id: '3', title: 'Fortnite session',  cost: 60,  emoji: '🎮', redeemed: false },
  { id: '4', title: 'Craft store trip',  cost: 100, emoji: '🎨', redeemed: false },
  { id: '5', title: 'Face mask night',   cost: 40,  emoji: '🧖‍♀️', redeemed: false },
  { id: '6', title: 'Amazon purchase',   cost: 150, emoji: '📦', redeemed: false },
]

// ── Achievements ───────────────────────────────────────────────────────────
export const ALL_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  { id: 'first_quest',   title: 'First Adventure',   description: 'Complete your first task',            emoji: '⚔️' },
  { id: 'combo_3',       title: 'Combo x3!',         description: 'Complete 3 tasks in a row',           emoji: '⚡' },
  { id: 'combo_5',       title: 'On Fire!',          description: 'Complete 5 tasks in a row',           emoji: '🔥' },
  { id: 'streak_3',      title: '3-Day Streak',      description: '3 active days in a row',              emoji: '🌟' },
  { id: 'streak_7',      title: 'Full Week',         description: '7 active days in a row',              emoji: '👑' },
  { id: 'level_5',       title: 'Adventurer',        description: 'Reach level 5',                       emoji: '🗡️' },
  { id: 'level_10',      title: 'Heroine',           description: 'Reach level 10',                      emoji: '🏆' },
  { id: 'daily_goal',    title: 'Daily Goal',        description: 'Complete your daily XP goal',         emoji: '🎯' },
  { id: 'boss_slayer',   title: 'Boss Slayer',       description: 'Complete a high priority task',       emoji: '💀' },
  { id: 'tasks_10',      title: 'Unstoppable',       description: 'Complete 10 tasks total',             emoji: '💪' },
  { id: 'tasks_50',      title: 'Legend',            description: 'Complete 50 tasks total',             emoji: '🌸' },
  { id: 'wellness_100',  title: 'Glowing',           description: 'Reach 100% wellness',                 emoji: '✨' },
  { id: 'mochi_fed',     title: 'Good Caretaker',    description: 'Feed your pet 7 times',               emoji: '🍱' },
]

// ── XP ─────────────────────────────────────────────────────────────────────
export function xpForLevel(lvl: number): number {
  return lvl * 500
}

// ── Star calc: TIME is primary driver ─────────────────────────────────────
export function calcStars(
  taskType: string,
  priority: string,
  timeConsuming: number | null   // hours (e.g. 0.25 = 15min, 1 = 1h)
): number {
  // Base from time
  let base: number
  if (timeConsuming == null || timeConsuming <= 0) {
    // Fallback: type-based only
    const typeBase: Record<string, number> = {
      'Strategic Tasks 🧠': 5,
      'Creative / Production Tasks 🏗️': 4,
      'Analytical / Review Tasks 📊': 3,
      'Operational Tasks ⚙️': 2,
    }
    base = typeBase[taskType] ?? 2
  } else if (timeConsuming < 0.25)  { base = 1 }
  else if (timeConsuming < 0.5)     { base = 2 }
  else if (timeConsuming < 1)       { base = 3 }
  else if (timeConsuming < 2)       { base = 5 }
  else if (timeConsuming < 4)       { base = 8 }
  else                              { base = 12 }

  // Task type multiplier
  const typeMulti: Record<string, number> = {
    'Strategic Tasks 🧠': 1.5,
    'Creative / Production Tasks 🏗️': 1.3,
    'Analytical / Review Tasks 📊': 1.2,
    'Operational Tasks ⚙️': 1.0,
  }
  const tMult = typeMulti[taskType] ?? 1.0

  // Priority multiplier
  const pMult = priority?.includes('High') ? 2
    : priority?.includes('Medium') ? 1.5
    : 1

  return Math.max(1, Math.round(base * tMult * pMult))
}

// ── Format time for display ────────────────────────────────────────────────
export function formatTime(hours: number | null): string | null {
  if (hours == null || hours <= 0) return null
  if (hours < 1) return `~${Math.round(hours * 60)} min`
  if (hours === 1) return '~1h'
  if (Number.isInteger(hours)) return `~${hours}h`
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`
}

// ── Tamagotchi: hunger tick ────────────────────────────────────────────────
const HUNGER_DECAY_PER_HOUR = 8  // loses 8% hunger per hour

export function tickHunger(state: GameState): GameState {
  const now = Date.now()
  const currentHunger = Number.isFinite(state.hunger) ? state.hunger : 80
  const lastTick = state.lastHungerTick || now
  const hoursElapsed = (now - lastTick) / (1000 * 60 * 60)
  if (hoursElapsed < 0.05) return { ...state, hunger: currentHunger }  // less than 3 min, just normalize
  const decay = hoursElapsed * HUNGER_DECAY_PER_HOUR
  const hunger = Math.max(0, currentHunger - decay)
  const petMood = deriveMood({ ...state, hunger })
  return { ...state, hunger, lastHungerTick: now, petMood }
}

export function feedPet(state: GameState, amount = 20): GameState {
  const hunger = Math.min(100, state.hunger + amount)
  const petMood = deriveMood({ ...state, hunger })
  return { ...state, hunger, petMood }
}

function deriveMood(state: GameState): GameState['petMood'] {
  if (state.hunger < 20) return 'hungry'
  if (state.comboCount >= 5) return 'excited'
  if (state.comboCount >= 2) return 'happy'
  if (state.wellness < 30) return 'tired'
  return 'neutral'
}

// ── Combo ──────────────────────────────────────────────────────────────────
const COMBO_WINDOW_MS = 5 * 60 * 1000

export function getComboMultiplier(comboCount: number): number {
  if (comboCount >= 5) return 3
  if (comboCount >= 3) return 2
  if (comboCount >= 2) return 1.5
  return 1
}

export function getComboLabel(comboCount: number): string {
  if (comboCount >= 5) return '🔥 ON FIRE! x3'
  if (comboCount >= 3) return '⚡ COMBO! x2'
  if (comboCount >= 2) return '✨ Nice! x1.5'
  return ''
}

// ── LocalStorage ───────────────────────────────────────────────────────────
const KEY = 'bloom_state_v1'

export function loadState(): GameState {
  if (typeof window === 'undefined') return defaultState()
  try {
    const raw = localStorage.getItem(KEY)
    // migrate old key
    const oldRaw = localStorage.getItem('questapp_state_v2') || localStorage.getItem('questapp_state')
    if (raw) return { ...defaultState(), ...JSON.parse(raw) }
    if (oldRaw) {
      const migrated = { ...defaultState(), ...JSON.parse(oldRaw) }
      localStorage.setItem(KEY, JSON.stringify(migrated))
      return migrated
    }
  } catch {}
  return defaultState()
}

export function saveState(state: GameState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(state))
}

function defaultState(): GameState {
  const today = new Date().toISOString().split('T')[0]
  return {
    petId: 'bear',
    petName: 'Mochi',
    stars: 0,
    xp: 0,
    level: 1,
    wellness: 50,
    hunger: 80,
    lastHungerTick: Date.now(),
    rewards: DEFAULT_REWARDS,
    dailyChecks: [],
    completedTaskIds: [],
    streak: 0,
    lastActiveDate: '',
    comboCount: 0,
    lastComboTime: 0,
    dailyXP: 0,
    dailyXPDate: today,
    dailyXPGoal: 100,
    achievements: ALL_ACHIEVEMENTS.map(a => ({ ...a, unlockedAt: null })),
    petMood: 'neutral',
    totalTasksCompleted: 0,
  }
}

// ── Achievements check ─────────────────────────────────────────────────────
function checkAchievements(state: GameState): { state: GameState; newAchievements: Achievement[] } {
  const today = new Date().toISOString().split('T')[0]
  const newAchievements: Achievement[] = []
  const updated = state.achievements.map(a => {
    if (a.unlockedAt) return a
    let unlock = false
    switch (a.id) {
      case 'first_quest':  unlock = state.totalTasksCompleted >= 1; break
      case 'combo_3':      unlock = state.comboCount >= 3; break
      case 'combo_5':      unlock = state.comboCount >= 5; break
      case 'streak_3':     unlock = state.streak >= 3; break
      case 'streak_7':     unlock = state.streak >= 7; break
      case 'level_5':      unlock = state.level >= 5; break
      case 'level_10':     unlock = state.level >= 10; break
      case 'daily_goal':   unlock = state.dailyXP >= state.dailyXPGoal; break
      case 'tasks_10':     unlock = state.totalTasksCompleted >= 10; break
      case 'tasks_50':     unlock = state.totalTasksCompleted >= 50; break
      case 'wellness_100': unlock = state.wellness >= 100; break
    }
    if (unlock) { const u = { ...a, unlockedAt: today }; newAchievements.push(u); return u }
    return a
  })
  return { state: { ...state, achievements: updated }, newAchievements }
}

// ── Earn stars ─────────────────────────────────────────────────────────────
export type EarnResult = {
  state: GameState
  leveledUp: boolean
  newLevel: number
  newAchievements: Achievement[]
  starsEarned: number
  comboMultiplier: number
}

export function earnStars(state: GameState, baseAmount: number, isBoss = false): EarnResult {
  const today = new Date().toISOString().split('T')[0]
  const now = Date.now()

  const timeSinceCombo = now - state.lastComboTime
  const newComboCount = timeSinceCombo < COMBO_WINDOW_MS ? state.comboCount + 1 : 1
  const multiplier = getComboMultiplier(newComboCount)
  const starsEarned = Math.round(baseAmount * multiplier)
  const xpGain = starsEarned * 10

  let newStreak = state.streak
  if (state.lastActiveDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    newStreak = state.lastActiveDate === yesterday ? state.streak + 1 : 1
  }

  const dailyXP = state.dailyXPDate === today ? state.dailyXP + xpGain : xpGain

  let newXp = state.xp + xpGain
  const oldLevel = state.level
  let newLevel = state.level
  while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++ }

  // Completing a task feeds the pet
  const hunger = Math.min(100, state.hunger + 15)

  let next: GameState = {
    ...state,
    stars: state.stars + starsEarned,
    xp: newXp,
    level: newLevel,
    streak: newStreak,
    lastActiveDate: today,
    comboCount: newComboCount,
    lastComboTime: now,
    dailyXP,
    dailyXPDate: today,
    hunger,
    lastHungerTick: now,
    totalTasksCompleted: state.totalTasksCompleted + 1,
    completedTaskIds: state.completedTaskIds,
  }
  next.petMood = deriveMood(next)

  if (isBoss) {
    next = { ...next, achievements: next.achievements.map(a =>
      a.id === 'boss_slayer' && !a.unlockedAt ? { ...a, unlockedAt: today } : a
    )}
  }

  const { state: withAchievements, newAchievements } = checkAchievements(next)
  return { state: withAchievements, leveledUp: newLevel > oldLevel, newLevel, newAchievements, starsEarned, comboMultiplier: multiplier }
}

export function spendStars(state: GameState, amount: number): GameState {
  return { ...state, stars: Math.max(0, state.stars - amount) }
}

export function updateWellness(state: GameState, checks: DailyCheck): GameState {
  const score = [checks.slept, checks.exercised, checks.water, checks.noPhone, checks.learned].filter(Boolean).length
  const delta = score * 12 - 15
  const wellness = Math.min(100, Math.max(0, state.wellness + delta))
  // wellness check also feeds pet
  const hunger = Math.min(100, state.hunger + score * 5)
  const next = { ...state, wellness, hunger }
  return { ...next, petMood: deriveMood(next) }
}

export function getTodayCheck(state: GameState): DailyCheck | null {
  const today = new Date().toISOString().split('T')[0]
  return state.dailyChecks.find(c => c.date === today) ?? null
}
