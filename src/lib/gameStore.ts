import { checkEvolution, getStageForLevel, PetStage } from './petEvolution'

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
  wellness: number
  hunger: number
  happiness: number       // 0–100: tamagotchi happiness
  energy: number          // 0–100: tamagotchi energy
  cleanliness: number     // 0–100: tamagotchi cleanliness
  lastHungerTick: number  // legacy name, now ticks all needs
  lastNeedsTick: number   // timestamp: last time needs were decremented
  petStage: PetStage
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
  // Overdue
  lastOverduePenaltyDate: string  // ISO date, to avoid penalizing twice same day
  overdueCount: number            // cached count for pet phrases
  // Daily challenges
  claimedChallenges: string[]  // challenge IDs claimed today
  bossesDefeatedToday: number
  tasksCompletedToday: number
  todayTasksDate: string       // reset counter on new day
  // Time tracking
  activeTimer: { timeTrackerId: string; taskId: string; taskTitle: string; startedAt: number } | null
  // Future phases
  gameTokens: number
  miniGamesPlayed: number
  ownedAccessories: string[]
  equippedHat: string | null
  equippedBackground: string | null
  equippedEffect: string | null
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
  { id: 'mochi_fed',     title: 'Good Caretaker',    description: 'Keep all needs above 80%',            emoji: '🍱' },
  // Evolution achievements
  { id: 'evolved_teen',  title: 'Growing Up',        description: 'Evolve your pet to Teen stage',       emoji: '🌱' },
  { id: 'evolved_adult', title: 'All Grown Up',      description: 'Evolve your pet to Adult stage',      emoji: '🌟' },
  { id: 'evolved_legend',title: 'Legendary',         description: 'Evolve your pet to Legendary stage',  emoji: '👑' },
  { id: 'perfect_needs', title: 'Perfect Balance',   description: 'All needs above 80% at once',         emoji: '💎' },
]

// ── XP ─────────────────────────────────────────────────────────────────────
export function xpForLevel(lvl: number): number {
  return lvl * 500
}

// ── Star calc: TIME is primary driver ─────────────────────────────────────
export function calcStars(
  taskType: string,
  priority: string,
  timeConsuming: number | null
): number {
  let base: number
  if (timeConsuming == null || timeConsuming <= 0) {
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

  const typeMulti: Record<string, number> = {
    'Strategic Tasks 🧠': 1.5,
    'Creative / Production Tasks 🏗️': 1.3,
    'Analytical / Review Tasks 📊': 1.2,
    'Operational Tasks ⚙️': 1.0,
  }
  const tMult = typeMulti[taskType] ?? 1.0
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

// ── Tamagotchi: needs system ──────────────────────────────────────────────
// Decay rates per hour
const NEEDS_DECAY = {
  hunger: 8,
  happiness: 5,
  energy: 6,
  cleanliness: 4,
}

function clampNeed(v: number): number {
  return Math.max(0, Math.min(100, v))
}

export function tickNeeds(state: GameState): GameState {
  const now = Date.now()
  const lastTick = state.lastNeedsTick || state.lastHungerTick || now
  const hoursElapsed = (now - lastTick) / (1000 * 60 * 60)
  if (hoursElapsed < 0.05) {
    // Normalize fields for old state
    return {
      ...state,
      hunger: Number.isFinite(state.hunger) ? state.hunger : 80,
      happiness: Number.isFinite(state.happiness) ? state.happiness : 70,
      energy: Number.isFinite(state.energy) ? state.energy : 70,
      cleanliness: Number.isFinite(state.cleanliness) ? state.cleanliness : 70,
      petStage: getStageForLevel(state.level),
    }
  }

  const hunger = clampNeed((Number.isFinite(state.hunger) ? state.hunger : 80) - hoursElapsed * NEEDS_DECAY.hunger)
  const happiness = clampNeed((Number.isFinite(state.happiness) ? state.happiness : 70) - hoursElapsed * NEEDS_DECAY.happiness)
  const energy = clampNeed((Number.isFinite(state.energy) ? state.energy : 70) - hoursElapsed * NEEDS_DECAY.energy)
  const cleanliness = clampNeed((Number.isFinite(state.cleanliness) ? state.cleanliness : 70) - hoursElapsed * NEEDS_DECAY.cleanliness)

  const next = { ...state, hunger, happiness, energy, cleanliness, lastNeedsTick: now, lastHungerTick: now, petStage: getStageForLevel(state.level) }
  return { ...next, petMood: deriveMood(next) }
}

// Backward compat: tickHunger now calls tickNeeds
export function tickHunger(state: GameState): GameState {
  return tickNeeds(state)
}

export function feedPet(state: GameState, amount = 20): GameState {
  const hunger = clampNeed(state.hunger + amount)
  const petMood = deriveMood({ ...state, hunger })
  return { ...state, hunger, petMood }
}

// ── Overall pet health ────────────────────────────────────────────────────
export function getOverallHealth(state: GameState): number {
  const h = Number.isFinite(state.hunger) ? state.hunger : 80
  const ha = Number.isFinite(state.happiness) ? state.happiness : 70
  const e = Number.isFinite(state.energy) ? state.energy : 70
  const c = Number.isFinite(state.cleanliness) ? state.cleanliness : 70
  return Math.round(h * 0.3 + ha * 0.3 + e * 0.2 + c * 0.2)
}

export function getHealthLabel(health: number): { label: string; emoji: string; color: string } {
  if (health >= 80) return { label: 'Thriving', emoji: '💖', color: 'text-green-500' }
  if (health >= 60) return { label: 'Good', emoji: '😊', color: 'text-green-400' }
  if (health >= 40) return { label: 'Okay', emoji: '😐', color: 'text-yellow-500' }
  if (health >= 20) return { label: 'Struggling', emoji: '😟', color: 'text-orange-500' }
  return { label: 'Critical!', emoji: '😰', color: 'text-red-500' }
}

// ── Mood: reflects lowest need ────────────────────────────────────────────
function deriveMood(state: GameState): GameState['petMood'] {
  const h = Number.isFinite(state.hunger) ? state.hunger : 80
  const ha = Number.isFinite(state.happiness) ? state.happiness : 70
  const e = Number.isFinite(state.energy) ? state.energy : 70
  const c = Number.isFinite(state.cleanliness) ? state.cleanliness : 70
  const lowest = Math.min(h, ha, e, c)

  if (lowest < 20) return 'hungry'  // critical need
  if (state.comboCount >= 5) return 'excited'
  if (state.comboCount >= 2) return 'happy'
  if (lowest < 35) return 'tired'
  return 'neutral'
}

// ── Pet mood phrases based on lowest need ─────────────────────────────────
export function getPetPhrase(state: GameState): string {
  // Overdue tasks take priority in phrases
  const overdue = state.overdueCount ?? 0
  if (overdue > 0) {
    if (overdue >= 3) return `~${overdue} overdue tasks... I'm worried~`
    return `~you have ${overdue} overdue task${overdue > 1 ? 's' : ''}... let's fix that~`
  }

  const h = Number.isFinite(state.hunger) ? state.hunger : 80
  const ha = Number.isFinite(state.happiness) ? state.happiness : 70
  const e = Number.isFinite(state.energy) ? state.energy : 70
  const c = Number.isFinite(state.cleanliness) ? state.cleanliness : 70

  if (state.petMood === 'excited') return '~so proud of you!~'
  if (state.petMood === 'happy') return '~keep going!~'

  const lowest = Math.min(h, ha, e, c)
  if (lowest < 20) {
    if (h === lowest) return '~I\'m so hungry... complete a task!~'
    if (ha === lowest) return '~I\'m feeling sad... treat yourself!~'
    if (e === lowest) return '~I\'m so tired... do your check-in!~'
    if (c === lowest) return '~I need a bath... keep your streak!~'
  }
  if (lowest < 35) {
    if (h === lowest) return '~getting hungry... work time?~'
    if (ha === lowest) return '~redeem a reward to cheer me up~'
    if (e === lowest) return '~running low on energy... self-care?~'
    if (c === lowest) return '~keep showing up daily for me~'
  }
  return '~let\'s do this!~'
}

// ── Overdue penalty ───────────────────────────────────────────────────────
export function applyOverduePenalty(state: GameState, overdueCount: number): GameState {
  const today = new Date().toISOString().split('T')[0]
  if (overdueCount === 0) return { ...state, overdueCount: 0 }
  if (state.lastOverduePenaltyDate === today) return { ...state, overdueCount }

  // -3 hunger per overdue task, applied once per day
  const penalty = overdueCount * 3
  const hunger = Math.max(0, (state.hunger ?? 80) - penalty)
  const next = { ...state, hunger, overdueCount, lastOverduePenaltyDate: today }
  return { ...next, petMood: deriveMood(next) }
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
    happiness: 70,
    energy: 70,
    cleanliness: 70,
    lastHungerTick: Date.now(),
    lastNeedsTick: Date.now(),
    petStage: 'baby',
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
    lastOverduePenaltyDate: '',
    overdueCount: 0,
    claimedChallenges: [],
    bossesDefeatedToday: 0,
    tasksCompletedToday: 0,
    todayTasksDate: today,
    activeTimer: null,
    gameTokens: 0,
    miniGamesPlayed: 0,
    ownedAccessories: [],
    equippedHat: null,
    equippedBackground: null,
    equippedEffect: null,
  }
}

// ── Achievements check ─────────────────────────────────────────────────────
function checkAchievements(state: GameState): { state: GameState; newAchievements: Achievement[] } {
  const today = new Date().toISOString().split('T')[0]
  const newAchievements: Achievement[] = []
  const allNeeds = [state.hunger, state.happiness, state.energy, state.cleanliness]

  const updated = state.achievements.map(a => {
    if (a.unlockedAt) return a
    let unlock = false
    switch (a.id) {
      case 'first_quest':   unlock = state.totalTasksCompleted >= 1; break
      case 'combo_3':       unlock = state.comboCount >= 3; break
      case 'combo_5':       unlock = state.comboCount >= 5; break
      case 'streak_3':      unlock = state.streak >= 3; break
      case 'streak_7':      unlock = state.streak >= 7; break
      case 'level_5':       unlock = state.level >= 5; break
      case 'level_10':      unlock = state.level >= 10; break
      case 'daily_goal':    unlock = state.dailyXP >= state.dailyXPGoal; break
      case 'tasks_10':      unlock = state.totalTasksCompleted >= 10; break
      case 'tasks_50':      unlock = state.totalTasksCompleted >= 50; break
      case 'wellness_100':  unlock = state.wellness >= 100; break
      case 'perfect_needs': unlock = allNeeds.every(n => n >= 80); break
      case 'evolved_teen':  unlock = state.petStage === 'teen' || state.petStage === 'adult' || state.petStage === 'legendary'; break
      case 'evolved_adult': unlock = state.petStage === 'adult' || state.petStage === 'legendary'; break
      case 'evolved_legend':unlock = state.petStage === 'legendary'; break
      case 'mochi_fed':     unlock = allNeeds.every(n => n >= 80); break
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
  oldLevel: number
  newAchievements: Achievement[]
  starsEarned: number
  comboMultiplier: number
  evolved: boolean
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

  // Tasks ONLY feed hunger — the PRIMARY loop
  const hunger = clampNeed(state.hunger + 15)

  // Streak maintenance feeds cleanliness — consistency = order
  const streakChanged = state.lastActiveDate !== today
  const cleanlinessBoost = streakChanged ? (newStreak >= 7 ? 25 : newStreak >= 3 ? 15 : 10) : 0
  const cleanliness = clampNeed((state.cleanliness ?? 70) + cleanlinessBoost)

  const evolved = checkEvolution(oldLevel, newLevel)
  const newStage = getStageForLevel(newLevel)

  // Earn a game token (max 3) — for future mini-games
  const gameTokens = Math.min(3, (state.gameTokens ?? 0) + 1)

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
    cleanliness,
    lastHungerTick: now,
    lastNeedsTick: now,
    totalTasksCompleted: state.totalTasksCompleted + 1,
    completedTaskIds: state.completedTaskIds,
    petStage: newStage,
    gameTokens,
    // Daily challenge counters
    tasksCompletedToday: (state.todayTasksDate === today ? (state.tasksCompletedToday ?? 0) : 0) + 1,
    bossesDefeatedToday: (state.todayTasksDate === today ? (state.bossesDefeatedToday ?? 0) : 0) + (isBoss ? 1 : 0),
    todayTasksDate: today,
    claimedChallenges: state.todayTasksDate === today ? (state.claimedChallenges ?? []) : [],
  }
  next.petMood = deriveMood(next)

  if (isBoss) {
    next = { ...next, achievements: next.achievements.map(a =>
      a.id === 'boss_slayer' && !a.unlockedAt ? { ...a, unlockedAt: today } : a
    )}
  }

  const { state: withAchievements, newAchievements } = checkAchievements(next)
  return { state: withAchievements, leveledUp: newLevel > oldLevel, newLevel, oldLevel, newAchievements, starsEarned, comboMultiplier: multiplier, evolved }
}

export function spendStars(state: GameState, amount: number): GameState {
  return { ...state, stars: Math.max(0, state.stars - amount) }
}

export function updateWellness(state: GameState, checks: DailyCheck): GameState {
  const score = [checks.slept, checks.exercised, checks.water, checks.noPhone, checks.learned].filter(Boolean).length
  const delta = score * 12 - 15
  const wellness = Math.min(100, Math.max(0, state.wellness + delta))
  // Check-ins ONLY feed energy — taking care of yourself = energy for your pet
  const energy = clampNeed((state.energy ?? 70) + score * 10)
  const next = { ...state, wellness, energy }
  return { ...next, petMood: deriveMood(next) }
}

// Redeeming rewards feeds happiness — treating yourself = happy pet
export function boostHappiness(state: GameState, amount = 20): GameState {
  const happiness = clampNeed((state.happiness ?? 70) + amount)
  const next = { ...state, happiness }
  return { ...next, petMood: deriveMood(next) }
}

// Maintaining streak feeds cleanliness — consistency = order
export function updateCleanliness(state: GameState): GameState {
  // Called when streak is maintained (new day with activity)
  const boost = state.streak >= 7 ? 25 : state.streak >= 3 ? 15 : 10
  const cleanliness = clampNeed((state.cleanliness ?? 70) + boost)
  const next = { ...state, cleanliness }
  return { ...next, petMood: deriveMood(next) }
}

export function getTodayCheck(state: GameState): DailyCheck | null {
  const today = new Date().toISOString().split('T')[0]
  return state.dailyChecks.find(c => c.date === today) ?? null
}

// ── Accessories ───────────────────────────────────────────────────────────
export function buyAccessory(state: GameState, accessoryId: string, cost: number): GameState {
  return {
    ...state,
    stars: Math.max(0, state.stars - cost),
    ownedAccessories: [...(state.ownedAccessories ?? []), accessoryId],
  }
}

export function equipAccessory(state: GameState, slot: 'equippedHat' | 'equippedBackground' | 'equippedEffect', accessoryId: string | null): GameState {
  return { ...state, [slot]: accessoryId }
}

// ── Claim daily challenge ─────────────────────────────────────────────────
export function claimChallenge(state: GameState, challengeId: string, xpReward: number, starReward: number): GameState {
  const today = new Date().toISOString().split('T')[0]
  const claimed = state.todayTasksDate === today ? [...(state.claimedChallenges ?? []), challengeId] : [challengeId]
  return {
    ...state,
    stars: state.stars + starReward,
    xp: state.xp + xpReward,
    claimedChallenges: claimed,
  }
}
