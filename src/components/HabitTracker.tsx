'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GameState, Habit, HabitSchedule, saveState,
  getTodayHabits, isHabitCompletedToday, completeHabit, uncompleteHabit,
  getHabitEnergy, getHabitCompletionsThisWeek, getHabitStreak,
} from '@/lib/gameStore'
import { hapticLight, hapticSuccess, soundHabitComplete, soundAllHabitsComplete } from '@/lib/feedback'
import { NeedFeedback, NeedFeedbackItem } from './NeedFeedback'

type Props = {
  state: GameState
  onStateChange: (s: GameState) => void
  onClose: () => void
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EMOJI_OPTIONS = ['🌙', '🏃‍♀️', '💧', '📵', '📚', '🧘', '🥗', '💊', '🎨', '🎵', '✍️', '🧹', '🌿', '🐕', '💤', '🏋️', '🚶', '📖', '🍎', '💆‍♀️']

export default function HabitTracker({ state, onStateChange, onClose }: Props) {
  const [view, setView] = useState<'checkin' | 'manage' | 'add'>('checkin')
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [needFeedbacks, setNeedFeedbacks] = useState<NeedFeedbackItem[]>([])

  const todayHabits = getTodayHabits(state.habits)
  const today = new Date().toISOString().split('T')[0]
  const completedCount = todayHabits.filter(h => isHabitCompletedToday(h.id, state.habitLogs)).length

  function toggleHabit(habitId: string, e: React.MouseEvent) {
    const isCompleted = isHabitCompletedToday(habitId, state.habitLogs)
    if (isCompleted) {
      const next = uncompleteHabit(state, habitId)
      saveState(next)
      onStateChange(next)
    } else {
      const { state: next, energyBoost, allComplete } = completeHabit(state, habitId)
      saveState(next)
      onStateChange(next)
      hapticLight()
      soundHabitComplete()

      // Energy feedback animation
      const fb: NeedFeedbackItem = { id: `energy-${Date.now()}`, type: 'energy', amount: energyBoost, x: e.clientX, y: e.clientY }
      setNeedFeedbacks(prev => [...prev, fb])
      setTimeout(() => setNeedFeedbacks(prev => prev.filter(f => f.id !== fb.id)), 1500)

      if (allComplete) {
        hapticSuccess()
        soundAllHabitsComplete()
      }

      // Fire-and-forget: sync to Notion
      const habit = state.habits.find(h => h.id === habitId)
      if (habit?.notionPageId) {
        const today = new Date().toISOString().split('T')[0]
        fetch('/api/notion/habits/log', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ habitNotionId: habit.notionPageId, date: today, completed: true }),
        }).catch(() => {})
      }
    }
  }

  function deleteHabit(habitId: string) {
    const next = { ...state, habits: state.habits.filter(h => h.id !== habitId) }
    saveState(next)
    onStateChange(next)
  }

  function saveHabit(habit: Habit) {
    const existing = state.habits.find(h => h.id === habit.id)
    let next: GameState
    if (existing) {
      next = { ...state, habits: state.habits.map(h => h.id === habit.id ? habit : h) }
      // Fire-and-forget update to Notion
      if (habit.notionPageId) {
        fetch('/api/notion/habits', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'update', pageId: habit.notionPageId, habit }),
        }).catch(() => {})
      }
    } else {
      next = { ...state, habits: [...state.habits, habit] }
      // Fire-and-forget create in Notion
      fetch('/api/notion/habits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'create', habit }),
      }).then(res => res.json()).then(data => {
        if (data.notionPageId) {
          // Update local habit with Notion page ID
          const updated = { ...habit, notionPageId: data.notionPageId }
          const updatedState = { ...next, habits: next.habits.map(h => h.id === habit.id ? updated : h) }
          saveState(updatedState)
          onStateChange(updatedState)
        }
      }).catch(() => {})
    }
    saveState(next)
    onStateChange(next)
    setView('checkin')
    setEditingHabit(null)
  }

  return (
    <motion.div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center sm:items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl max-h-[85vh] overflow-y-auto"
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {view === 'checkin' && (
          <HabitCheckin
            habits={todayHabits}
            allHabits={state.habits}
            logs={state.habitLogs}
            completedCount={completedCount}
            total={todayHabits.length}
            onToggle={toggleHabit}
            onManage={() => setView('manage')}
          />
        )}
        {view === 'manage' && (
          <HabitManager
            habits={state.habits}
            logs={state.habitLogs}
            onAdd={() => { setEditingHabit(null); setView('add') }}
            onEdit={(h) => { setEditingHabit(h); setView('add') }}
            onDelete={deleteHabit}
            onBack={() => setView('checkin')}
          />
        )}
        {view === 'add' && (
          <AddHabitModal
            habit={editingHabit}
            onSave={saveHabit}
            onBack={() => { setEditingHabit(null); setView('manage') }}
          />
        )}
      </motion.div>

      {/* Need feedback */}
      <AnimatePresence>
        {needFeedbacks.map(nf => <NeedFeedback key={nf.id} item={nf} />)}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Checkin View ──────────────────────────────────────────────────────────
function HabitCheckin({ habits, allHabits, logs, completedCount, total, onToggle, onManage }: {
  habits: Habit[]
  allHabits: Habit[]
  logs: GameState['habitLogs']
  completedCount: number
  total: number
  onToggle: (id: string, e: React.MouseEvent) => void
  onManage: () => void
}) {
  const allDone = total > 0 && completedCount === total
  const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0

  return (
    <>
      <h2 className="text-xl font-black text-gray-800 text-center mb-1">Habits</h2>
      <p className="text-xs text-gray-400 text-center mb-3">your daily routines restore ⚡ energy</p>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{completedCount}/{total} done</span>
          {allDone && <span className="text-green-500 font-bold">All complete! +10 bonus ⚡</span>}
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${allDone ? 'bg-green-400' : 'bg-petal-400'}`}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Habit list */}
      {habits.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">No habits for today. Add some!</p>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {habits.map(habit => {
            const completed = isHabitCompletedToday(habit.id, logs)
            const energy = getHabitEnergy(habit.importance)
            const streak = getHabitStreak(habit.id, logs, habit)

            return (
              <motion.button
                key={habit.id}
                layout
                onClick={(e) => onToggle(habit.id, e)}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                  completed ? 'border-green-400 bg-green-50' : 'border-gray-100 hover:border-petal-200'
                }`}
              >
                <span className="text-2xl">{habit.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${completed ? 'text-green-600 line-through' : 'text-gray-700'}`}>
                    {habit.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      habit.importance === 'high' ? 'bg-red-100 text-red-500'
                      : habit.importance === 'medium' ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-gray-100 text-gray-500'
                    }`}>
                      +{energy}⚡
                    </span>
                    {streak > 0 && <span className="text-xs text-orange-400 font-bold">{streak} day streak</span>}
                    {habit.schedule.type === 'times_per_week' && (
                      <span className="text-xs text-gray-400">
                        {getHabitCompletionsThisWeek(habit.id, logs)}/{habit.schedule.timesPerWeek}x/wk
                      </span>
                    )}
                  </div>
                </div>
                {completed && <span className="text-green-500 font-bold text-lg">✓</span>}
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Weekly view */}
      <WeeklyView habits={allHabits} logs={logs} />

      {/* Manage button */}
      <button
        onClick={onManage}
        className="w-full text-center text-xs font-bold text-petal-500 hover:text-petal-600 py-2 mt-2"
      >
        Manage habits
      </button>
    </>
  )
}

// ── Weekly View ───────────────────────────────────────────────────────────
function WeeklyView({ habits, logs }: { habits: Habit[]; logs: GameState['habitLogs'] }) {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  const activeHabits = habits.filter(h => h.active)
  if (activeHabits.length === 0) return null

  return (
    <div className="bg-gray-50 rounded-2xl p-3 mt-3">
      <p className="text-xs font-bold text-gray-500 mb-2">This week</p>
      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead>
            <tr>
              <td className="text-xs text-gray-400 text-left w-20"></td>
              {days.map((d, i) => {
                const isToday = d.toISOString().split('T')[0] === today.toISOString().split('T')[0]
                return (
                  <td key={i} className={`text-xs pb-1 ${isToday ? 'text-petal-500 font-bold' : 'text-gray-400'}`}>
                    {DAY_LABELS[i]}
                  </td>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {activeHabits.slice(0, 8).map(habit => (
              <tr key={habit.id}>
                <td className="text-left">
                  <span className="text-sm" title={habit.name}>{habit.emoji}</span>
                </td>
                {days.map((d, i) => {
                  const dateStr = d.toISOString().split('T')[0]
                  const completed = logs.some(l => l.habitId === habit.id && l.date === dateStr && l.completed)
                  const isFuture = d > today
                  return (
                    <td key={i} className="py-0.5">
                      {isFuture ? (
                        <span className="text-gray-200 text-xs">-</span>
                      ) : completed ? (
                        <span className="text-green-500 text-sm">●</span>
                      ) : (
                        <span className="text-gray-300 text-sm">○</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Manage View ───────────────────────────────────────────────────────────
function HabitManager({ habits, logs, onAdd, onEdit, onDelete, onBack }: {
  habits: Habit[]
  logs: GameState['habitLogs']
  onAdd: () => void
  onEdit: (h: Habit) => void
  onDelete: (id: string) => void
  onBack: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
        <h2 className="text-lg font-black text-gray-800">Manage Habits</h2>
        <button onClick={onAdd} className="bg-petal-500 text-white rounded-xl px-3 py-1.5 text-xs font-bold hover:bg-petal-600">
          + Add
        </button>
      </div>

      {habits.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-8">No habits yet. Add your first one!</p>
      ) : (
        <div className="flex flex-col gap-2">
          {habits.map(habit => {
            const streak = getHabitStreak(habit.id, logs, habit)
            const scheduleLabel = habit.schedule.type === 'daily' ? 'Every day'
              : habit.schedule.type === 'specific_days' ? (habit.schedule.days ?? []).map(d => DAY_LABELS[d]).join(', ')
              : `${habit.schedule.timesPerWeek}x per week`

            return (
              <div key={habit.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                <span className="text-2xl">{habit.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-800 truncate">{habit.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold ${
                      habit.importance === 'high' ? 'text-red-500'
                      : habit.importance === 'medium' ? 'text-yellow-600'
                      : 'text-gray-500'
                    }`}>
                      {habit.importance}
                    </span>
                    <span className="text-xs text-gray-400">{scheduleLabel}</span>
                    {streak > 0 && <span className="text-xs text-orange-400 font-bold">{streak}d streak</span>}
                  </div>
                </div>
                <button onClick={() => onEdit(habit)} className="text-xs text-gray-400 hover:text-petal-500 px-2">Edit</button>
                <button onClick={() => onDelete(habit.id)} className="text-xs text-gray-300 hover:text-red-400 px-1">✕</button>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ── Add/Edit Habit Modal ──────────────────────────────────────────────────
function AddHabitModal({ habit, onSave, onBack }: {
  habit: Habit | null
  onSave: (h: Habit) => void
  onBack: () => void
}) {
  const [name, setName] = useState(habit?.name ?? '')
  const [emoji, setEmoji] = useState(habit?.emoji ?? '🌙')
  const [importance, setImportance] = useState<Habit['importance']>(habit?.importance ?? 'medium')
  const [scheduleType, setScheduleType] = useState<HabitSchedule['type']>(habit?.schedule.type ?? 'daily')
  const [days, setDays] = useState<number[]>(habit?.schedule.days ?? [])
  const [timesPerWeek, setTimesPerWeek] = useState(habit?.schedule.timesPerWeek ?? 3)

  function save() {
    if (!name.trim()) return
    onSave({
      id: habit?.id ?? Date.now().toString(),
      name: name.trim(),
      emoji,
      importance,
      schedule: {
        type: scheduleType,
        ...(scheduleType === 'specific_days' ? { days } : {}),
        ...(scheduleType === 'times_per_week' ? { timesPerWeek } : {}),
      },
      active: true,
      notionPageId: habit?.notionPageId,
      createdAt: habit?.createdAt ?? new Date().toISOString(),
    })
  }

  function toggleDay(day: number) {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
        <h2 className="text-lg font-black text-gray-800">{habit ? 'Edit' : 'Add'} Habit</h2>
        <div className="w-12" />
      </div>

      {/* Emoji picker */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EMOJI_OPTIONS.map(e => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`text-2xl p-1.5 rounded-xl transition-all ${
              emoji === e ? 'bg-petal-100 ring-2 ring-petal-400' : 'hover:bg-gray-50'
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Name */}
      <input
        type="text"
        placeholder="Habit name..."
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full border-2 border-gray-100 rounded-2xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-petal-300 mb-3"
      />

      {/* Importance */}
      <div className="mb-4">
        <p className="text-xs font-bold text-gray-500 mb-2">Importance (energy boost)</p>
        <div className="flex gap-2">
          {(['low', 'medium', 'high'] as const).map(imp => (
            <button
              key={imp}
              onClick={() => setImportance(imp)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                importance === imp
                  ? imp === 'high' ? 'bg-red-100 text-red-600 ring-2 ring-red-400'
                    : imp === 'medium' ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400'
                    : 'bg-gray-100 text-gray-600 ring-2 ring-gray-400'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {imp === 'high' ? '+15⚡' : imp === 'medium' ? '+10⚡' : '+5⚡'}
              <br />
              <span className="capitalize">{imp}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div className="mb-5">
        <p className="text-xs font-bold text-gray-500 mb-2">Schedule</p>
        <div className="flex gap-2 mb-3">
          {([
            { type: 'daily' as const, label: 'Every day' },
            { type: 'specific_days' as const, label: 'Specific days' },
            { type: 'times_per_week' as const, label: 'X per week' },
          ]).map(opt => (
            <button
              key={opt.type}
              onClick={() => setScheduleType(opt.type)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                scheduleType === opt.type ? 'bg-petal-100 text-petal-600 ring-2 ring-petal-400' : 'bg-gray-50 text-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Day picker */}
        {scheduleType === 'specific_days' && (
          <div className="flex gap-1.5">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  days.includes(i) ? 'bg-petal-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Times per week */}
        {scheduleType === 'times_per_week' && (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1} max={7} step={1}
              value={timesPerWeek}
              onChange={e => setTimesPerWeek(Number(e.target.value))}
              className="flex-1 accent-pink-500"
            />
            <span className="text-sm font-black text-petal-500 w-16 text-right">{timesPerWeek}x/week</span>
          </div>
        )}
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={!name.trim()}
        className="w-full bg-petal-500 text-white font-black rounded-2xl py-3 hover:bg-petal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {habit ? 'Save changes' : 'Add habit'} ✨
      </button>
    </>
  )
}
