'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QuestTask } from '@/lib/notion'
import { GameState, earnStars, saveState, getComboLabel, getComboMultiplier, xpForLevel, formatTime } from '@/lib/gameStore'
import {
  LevelUpModal, AchievementToast, ComboBanner, StarBurst, CelebEvent
} from './CelebrationModals'
import { Achievement } from '@/lib/gameStore'

type Props = {
  state: GameState
  onStateChange: (s: GameState) => void
}

export default function QuestBoard({ state, onStateChange }: Props) {
  const [tasks, setTasks] = useState<QuestTask[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'today' | 'all'>('today')
  const [completing, setCompleting] = useState<string | null>(null)
  const [breaking, setBreaking] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'sonder' | 'personal'>('all')

  // Celebration queue
  const [celebQueue, setCelebQueue] = useState<CelebEvent[]>([])
  const [starBursts, setStarBursts] = useState<{ id: string; count: number; x: number; y: number }[]>([])

  const pushCeleb = (e: CelebEvent) => setCelebQueue(q => [...q, e])
  const popCeleb = () => setCelebQueue(q => q.slice(1))
  const current = celebQueue[0] ?? null

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`/api/notion/tasks?view=${view}`)
      const data = await res.json()
      setTasks(data.tasks ?? [])
    } catch (e) { console.error(e) }
    finally { if (!silent) setLoading(false) }
  }, [view])

  // Initial load + auto-polling every 60s (double sync)
  useEffect(() => {
    fetchTasks()
    const interval = setInterval(() => fetchTasks(true), 60_000)
    return () => clearInterval(interval)
  }, [fetchTasks])

  const visibleTasks = tasks
    .filter(t => filter === 'all' ? true : filter === 'sonder' ? t.source === 'sonder' : t.source === 'personal')
    .filter(t => !state.completedTaskIds.includes(t.id))

  async function completeTask(task: QuestTask, e: React.MouseEvent) {
    if (completing) return
    setCompleting(task.id)

    const isBoss = task.priority === 'High 🚨'

    // Star burst at click position
    const burst = { id: task.id + Date.now(), count: task.stars, x: e.clientX, y: e.clientY }
    setStarBursts(prev => [...prev, burst])
    setTimeout(() => setStarBursts(prev => prev.filter(b => b.id !== burst.id)), 1200)

    try {
      await fetch('/api/notion/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, source: task.source }),
      })

      const result = earnStars(
        { ...state, completedTaskIds: [...state.completedTaskIds, task.id] },
        task.stars,
        isBoss
      )

      saveState(result.state)
      onStateChange(result.state)

      // Queue celebrations
      const comboLabel = getComboLabel(result.state.comboCount)
      if (comboLabel && result.comboMultiplier > 1) {
        pushCeleb({ type: 'combo', label: comboLabel, starsEarned: result.starsEarned })
      }
      if (result.leveledUp) {
        pushCeleb({ type: 'levelup', level: result.newLevel })
      }
      result.newAchievements.forEach(a => {
        pushCeleb({ type: 'achievement', achievement: a })
      })
    } catch (e) { console.error(e) }
    finally { setCompleting(null) }
  }

  async function breakdownTask(task: QuestTask) {
    if (breaking) return
    setBreaking(task.id)
    try {
      const res = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskTitle: task.title, taskId: task.id, source: task.source }),
      })
      if ((await res.json()).subtasks) await fetchTasks()
    } catch (e) { console.error(e) }
    finally { setBreaking(null) }
  }

  const sonderTasks = visibleTasks.filter(t => t.source === 'sonder')
  const pbTasks = visibleTasks.filter(t => t.source === 'personal')

  const today = new Date().toISOString().split('T')[0]
  const dailyXP = state.dailyXPDate === today ? state.dailyXP : 0
  const dailyProgress = Math.min(100, (dailyXP / state.dailyXPGoal) * 100)
  const xpPercent = Math.round((state.xp / xpForLevel(state.level)) * 100)
  const comboLabel = getComboLabel(state.comboCount)
  const timeSinceCombo = Date.now() - state.lastComboTime
  const comboActive = timeSinceCombo < 5 * 60 * 1000 && state.comboCount >= 2

  return (
    <div className="flex-1 flex flex-col gap-4 min-w-0">

      {/* ── Celebration Modals ── */}
      <AnimatePresence mode="wait">
        {current?.type === 'levelup' && (
          <LevelUpModal key="lvl" level={current.level} onClose={popCeleb} />
        )}
        {current?.type === 'achievement' && (
          <AchievementToast key={current.achievement.id} achievement={current.achievement} onClose={popCeleb} />
        )}
        {current?.type === 'combo' && (
          <ComboBanner key="combo" label={current.label} starsEarned={current.starsEarned} />
        )}
      </AnimatePresence>

      {/* Star bursts */}
      <AnimatePresence>
        {starBursts.map(b => <StarBurst key={b.id} count={b.count} x={b.x} y={b.y} />)}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800">🗺️ Quest Board</h1>
          <p className="text-sm text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex bg-white rounded-2xl p-1 shadow-soft border border-petal-100">
            {(['today', 'all'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${view === v ? 'bg-petal-500 text-white' : 'text-gray-500 hover:text-petal-500'}`}>
                {v === 'today' ? '⚡ Today' : '📋 All'}
              </button>
            ))}
          </div>
          <div className="flex bg-white rounded-2xl p-1 shadow-soft border border-lavender-100">
            {(['all', 'sonder', 'personal'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-lavender-400 text-white' : 'text-gray-500'}`}>
                {f === 'all' ? '✨ All' : f === 'sonder' ? '🏢' : '👑'}
              </button>
            ))}
          </div>
          <button onClick={fetchTasks}
            className="bg-white rounded-2xl px-3 py-1.5 text-xs font-bold text-gray-400 shadow-soft border border-gray-100 hover:border-petal-200 transition-colors">
            🔄
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-2">
        {/* Daily XP */}
        <div className="bg-white rounded-2xl p-3 shadow-card">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-gray-500">🎯 Daily XP</span>
            <span className="text-xs font-black text-petal-500">{dailyXP}/{state.dailyXPGoal}</span>
          </div>
          <div className="w-full h-2 bg-petal-100 rounded-full overflow-hidden">
            <motion.div className="h-full xp-bar rounded-full"
              animate={{ width: `${dailyProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {dailyProgress >= 100 && (
            <p className="text-xs text-green-500 font-bold mt-1">Goal reached! 🎉</p>
          )}
        </div>

        {/* Streak */}
        <div className="bg-white rounded-2xl p-3 shadow-card text-center">
          <p className="text-xs font-bold text-gray-500 mb-1">🔥 Streak</p>
          <p className="text-2xl font-black text-gray-800">{state.streak}</p>
          <p className="text-xs text-gray-400">days in a row</p>
        </div>

        {/* Level XP */}
        <div className="bg-white rounded-2xl p-3 shadow-card">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-gray-500">⚔️ Lv {state.level}</span>
            <span className="text-xs text-gray-400">{xpPercent}%</span>
          </div>
          <div className="w-full h-2 bg-lavender-100 rounded-full overflow-hidden">
            <motion.div className="h-full bg-lavender-400 rounded-full"
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{state.xp} / {xpForLevel(state.level)} XP</p>
        </div>
      </div>

      {/* ── Combo indicator ── */}
      <AnimatePresence>
        {comboActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-gradient-to-r from-petal-500 to-lavender-500 rounded-2xl px-4 py-2 flex items-center justify-between"
          >
            <span className="text-white font-black text-sm">{comboLabel}</span>
            <span className="text-white/80 text-xs">combo active — keep it up!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Task lists ── */}
      {loading ? <LoadingSkeleton /> : visibleTasks.length === 0 ? <EmptyState /> : (
        <div className="flex flex-col gap-5">
          {filter !== 'personal' && sonderTasks.length > 0 && (
            <TaskGroup label="🏢 Sonder" tasks={sonderTasks}
              completing={completing} breaking={breaking}
              completedIds={state.completedTaskIds}
              onComplete={completeTask} onBreakdown={breakdownTask} />
          )}
          {filter !== 'sonder' && pbTasks.length > 0 && (
            <TaskGroup label="👑 Personal Brand" tasks={pbTasks}
              completing={completing} breaking={breaking}
              completedIds={state.completedTaskIds}
              onComplete={completeTask} onBreakdown={breakdownTask} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Task Group ─────────────────────────────────────────────────────────────
function TaskGroup({ label, tasks, completing, breaking, completedIds, onComplete, onBreakdown }: {
  label: string
  tasks: QuestTask[]
  completing: string | null
  breaking: string | null
  completedIds: string[]
  onComplete: (t: QuestTask, e: React.MouseEvent) => void
  onBreakdown: (t: QuestTask) => void
}) {
  const bosses = tasks.filter(t => t.priority === 'High 🚨')
  const normal = tasks.filter(t => t.priority !== 'High 🚨')

  return (
    <div>
      <h2 className="text-sm font-black text-gray-600 mb-2 ml-1">{label}</h2>
      <div className="flex flex-col gap-2">
        {bosses.map(t => (
          <BossCard key={t.id} task={t}
            completing={completing === t.id} breaking={breaking === t.id}
            onComplete={e => onComplete(t, e)} onBreakdown={() => onBreakdown(t)} />
        ))}
        {normal.map(t => (
          <TaskCard key={t.id} task={t}
            completing={completing === t.id} breaking={breaking === t.id}
            onComplete={e => onComplete(t, e)} onBreakdown={() => onBreakdown(t)} />
        ))}
      </div>
    </div>
  )
}

// ── Boss Battle Card ───────────────────────────────────────────────────────
function BossCard({ task, completing, breaking, onComplete, onBreakdown }: {
  task: QuestTask
  completing: boolean
  breaking: boolean
  onComplete: (e: React.MouseEvent) => void
  onBreakdown: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative rounded-2xl overflow-hidden shadow-lg"
    >
      {/* Dark gradient background — boss aesthetic */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-petal-900 opacity-95" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />

      {/* Animated edge glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        animate={{ boxShadow: ['0 0 0px rgba(255,45,126,0)', '0 0 20px rgba(255,45,126,0.5)', '0 0 0px rgba(255,45,126,0)'] }}
        transition={{ repeat: Infinity, duration: 2 }}
      />

      <div className="relative p-4">
        {/* Boss header */}
        <div className="flex items-center gap-2 mb-2">
          <motion.span
            className="text-lg"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            👹
          </motion.span>
          <span className="text-xs font-black text-red-400 uppercase tracking-widest">Boss Battle</span>
          <span className="ml-auto text-xs font-black text-yellow-400">+{task.stars * 2}⭐</span>
        </div>

        <div className="flex items-start gap-3">
          <button onClick={onComplete} disabled={completing}
            className={`mt-0.5 shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
              completing ? 'border-red-500 bg-red-500' : 'border-red-400 hover:border-red-300 hover:bg-red-400/20'
            }`}>
            {completing ? <span className="text-white text-xs">✓</span> : <span className="text-red-400 text-xs">⚔️</span>}
          </button>

          <div className="flex-1">
            <p className="font-black text-white text-sm leading-snug">{task.title}</p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {task.taskType && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-semibold">
                  {task.taskType.split(' ').slice(-1)[0]}
                </span>
              )}
              {formatTime(task.timeConsuming) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-yellow-300 font-semibold">
                  ⏱ {formatTime(task.timeConsuming)}
                </span>
              )}
              {task.dueDate && (
                <span className="text-xs text-white/50">
                  📅 {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* HP bar aesthetic */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>HP</span>
            <span>defeat to earn stars!</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
              animate={{ width: completing ? '0%' : '100%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {!task.hasSubtasks && (
          <button onClick={onBreakdown} disabled={breaking}
            className="mt-2 text-xs font-bold text-petal-300 hover:text-petal-200 transition-colors">
            {breaking ? '✨ Breaking down...' : '✨ Break into 15-min tasks'}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── Regular Task Card ──────────────────────────────────────────────────────
const TASK_TYPE_ICONS: Record<string, string> = {
  'Strategic Tasks 🧠': '🧠',
  'Creative / Production Tasks 🏗️': '🏗️',
  'Operational Tasks ⚙️': '⚙️',
  'Analytical / Review Tasks 📊': '📊',
}

const STATUS_COLORS: Record<string, string> = {
  'Done': 'bg-mint-200 text-green-700',
  'In progress': 'bg-lavender-100 text-lavender-500',
  'Not started': 'bg-gray-100 text-gray-500',
  'Backlog': 'bg-gray-100 text-gray-400',
  'Capture': 'bg-yellow-50 text-yellow-600',
}

function TaskCard({ task, completing, breaking, onComplete, onBreakdown }: {
  task: QuestTask
  completing: boolean
  breaking: boolean
  onComplete: (e: React.MouseEvent) => void
  onBreakdown: () => void
}) {
  const icon = TASK_TYPE_ICONS[task.taskType] ?? '⚔️'
  const statusColor = STATUS_COLORS[task.status] ?? 'bg-gray-100 text-gray-500'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.9 }}
      className="quest-card bg-white rounded-2xl p-4 shadow-card border border-gray-50"
    >
      <div className="flex items-start gap-3">
        <button onClick={onComplete} disabled={completing}
          className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            completing ? 'border-petal-400 bg-petal-400 scale-110' : 'border-petal-300 hover:border-petal-500 hover:bg-petal-50'
          }`}>
          {completing && <span className="text-white text-xs">✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <p className="font-bold text-gray-800 text-sm leading-snug">{task.title}</p>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>
              {task.status}
            </span>
            {formatTime(task.timeConsuming) && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-400 font-semibold">
                ⏱ {formatTime(task.timeConsuming)}
              </span>
            )}
            {task.dueDate && (
              <span className="text-xs text-gray-400">
                📅 {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            <span className="text-xs font-black text-petal-500 ml-auto">+{task.stars}⭐</span>
          </div>
        </div>
      </div>

      {!task.hasSubtasks && (
        <div className="mt-3 flex justify-end">
          <button onClick={onBreakdown} disabled={breaking}
            className="text-xs font-bold text-lavender-400 hover:text-lavender-500 flex items-center gap-1 transition-colors">
            {breaking ? <><span className="animate-spin">✨</span> Breaking down...</> : <>✨ Break into 15-min tasks</>}
          </button>
        </div>
      )}
    </motion.div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-card animate-pulse h-20" />)}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-6xl mb-4 pet-float">🎉</div>
      <h3 className="text-xl font-black text-gray-700">All quests complete!</h3>
      <p className="text-gray-400 mt-2 text-sm">You crushed it today. Go redeem a reward ✨</p>
    </div>
  )
}
