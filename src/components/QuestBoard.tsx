'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QuestTask } from '@/lib/notion'
import { GameState, earnStars, saveState, getComboLabel, getComboMultiplier, xpForLevel, formatTime, applyOverduePenalty, getOverallHealth, getHealthPenalties } from '@/lib/gameStore'
import {
  LevelUpModal, AchievementToast, ComboBanner, StarBurst, EvolutionModal, CelebEvent
} from './CelebrationModals'
import { Achievement } from '@/lib/gameStore'
import { getPetEmoji, getLegendaryAura, getStageForLevel, getStageLabel } from '@/lib/petEvolution'
import { hapticMedium, hapticSuccess, hapticHeavy, soundCoin, soundComplete, soundLevelUp, soundCombo, soundEvolution, soundAchievement, soundWarning } from '@/lib/feedback'
import DailyChallenges from './DailyChallenges'
import { NeedFeedback, NeedFeedbackItem } from './NeedFeedback'

type Props = {
  state: GameState
  onStateChange: (s: GameState) => void
}

export default function QuestBoard({ state, onStateChange }: Props) {
  const [tasks, setTasks] = useState<QuestTask[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'today' | 'week' | 'month' | 'all'>('today')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [breaking, setBreaking] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'sonder' | 'personal'>('all')
  const [groupBy, setGroupBy] = useState<'source' | 'project' | 'priority' | 'type'>('source')
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [subtasksMap, setSubtasksMap] = useState<Record<string, QuestTask[]>>({})
  const [loadingSubtasks, setLoadingSubtasks] = useState<string | null>(null)
  const [syncToast, setSyncToast] = useState<{ count: number; stars: number } | null>(null)

  // Use refs to avoid dependency loops
  const stateRef = useRef(state)
  const onStateChangeRef = useRef(onStateChange)
  stateRef.current = state
  onStateChangeRef.current = onStateChange

  // Celebration queue
  const [celebQueue, setCelebQueue] = useState<CelebEvent[]>([])
  const [starBursts, setStarBursts] = useState<{ id: string; count: number; x: number; y: number }[]>([])
  const [needFeedbacks, setNeedFeedbacks] = useState<NeedFeedbackItem[]>([])

  const pushCeleb = (e: CelebEvent) => setCelebQueue(q => [...q, e])
  const popCeleb = () => setCelebQueue(q => q.slice(1))
  const current = celebQueue[0] ?? null

  const hasSynced = useRef(false)

  // ── Fetch tasks — sync only on first load for speed ──
  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      // Only sync on first load, skip on subsequent fetches/polls
      const shouldSync = !hasSynced.current
      // Always fetch all tasks, filter client-side by date
      const fetches: Promise<Response>[] = [fetch(`/api/notion/tasks?view=${view === 'today' ? 'today' : 'all'}`)]
      if (shouldSync) fetches.push(fetch('/api/notion/sync'))

      const responses = await Promise.all(fetches)
      const tasksData = await responses[0].json()
      const currentState = stateRef.current

      // Debug: log if API returned error or no tasks
      if (tasksData.error) console.warn('Task fetch error:', tasksData.error)

      const fetchedTasks = tasksData.tasks ?? []
      setTasks(fetchedTasks)

      // Prune completedTaskIds: only keep last 200 entries to prevent bloat
      if (currentState.completedTaskIds.length > 200) {
        const pruned = currentState.completedTaskIds.slice(-200)
        const next = { ...currentState, completedTaskIds: pruned }
        saveState(next)
        onStateChangeRef.current(next)
      }

      let updatedState = currentState

      // Sync: detect tasks completed in Notion (first load only)
      if (shouldSync && responses[1]) {
        hasSynced.current = true
        const syncData = await responses[1].json()
        const completedInNotion = (syncData.tasks ?? []) as QuestTask[]
        const newlyCompleted = completedInNotion.filter(
          t => !currentState.completedTaskIds.includes(t.id)
        )

        if (newlyCompleted.length > 0) {
          let totalStarsEarned = 0
          for (const task of newlyCompleted) {
            const result = earnStars(
              { ...updatedState, completedTaskIds: [...updatedState.completedTaskIds, task.id] },
              task.stars,
              task.priority === 'High 🚨'
            )
            updatedState = result.state
            totalStarsEarned += result.starsEarned
          }
          setSyncToast({ count: newlyCompleted.length, stars: totalStarsEarned })
          setTimeout(() => setSyncToast(null), 3500)
        }
      }

      // Overdue penalty
      const activeTasks = tasksData.tasks ?? []
      const overdueCount = activeTasks.filter((t: QuestTask) => t.daysOverdue > 0).length
      updatedState = applyOverduePenalty(updatedState, overdueCount)

      if (updatedState !== currentState) {
        saveState(updatedState)
        onStateChangeRef.current(updatedState)
      }
    } catch (e) { console.error(e) }
    finally { if (!silent) setLoading(false) }
  }, [view])

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(() => fetchTasks(true), 60_000)
    return () => clearInterval(interval)
  }, [fetchTasks])

  // ── Visible tasks with date + source filtering ──
  const today = new Date().toISOString().split('T')[0]

  function getDateRange(): { from: string; to: string } | null {
    if (view === 'today') return null // server already filters
    if (view === 'week') {
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      return { from: startOfWeek.toISOString().split('T')[0], to: endOfWeek.toISOString().split('T')[0] }
    }
    if (view === 'month') {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { from: startOfMonth.toISOString().split('T')[0], to: endOfMonth.toISOString().split('T')[0] }
    }
    if (dateFrom || dateTo) {
      return { from: dateFrom || '2000-01-01', to: dateTo || '2099-12-31' }
    }
    return null // 'all' — show everything
  }

  function isInDateRange(task: QuestTask): boolean {
    const range = getDateRange()
    if (!range) return true
    const taskDate = task.doDate || task.dueDate
    if (!taskDate) return true // tasks without dates always show
    return taskDate >= range.from && taskDate <= range.to
  }

  const filteredBySource = tasks
    .filter(t => filter === 'all' ? true : filter === 'sonder' ? t.source === 'sonder' : t.source === 'personal')
    .filter(t => !state.completedTaskIds.includes(t.id))
    .filter(isInDateRange)

  const overdueTasks = filteredBySource.filter(t => t.daysOverdue > 0)
  const nonOverdueTasks = filteredBySource.filter(t => t.daysOverdue === 0)
  const visibleTasks = filteredBySource

  // Group tasks by selected criteria
  function groupTasks(taskList: QuestTask[]): { label: string; emoji: string; tasks: QuestTask[] }[] {
    switch (groupBy) {
      case 'project': {
        const groups = new Map<string, QuestTask[]>()
        for (const t of taskList) {
          const key = t.projectName || 'No project'
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key)!.push(t)
        }
        return Array.from(groups.entries()).map(([label, tasks]) => ({
          label, emoji: label === 'No project' ? '📌' : '📁', tasks,
        }))
      }
      case 'priority': {
        const order = ['High 🚨', 'Medium', 'Low', '']
        const groups = new Map<string, QuestTask[]>()
        for (const t of taskList) {
          const key = t.priority || 'No priority'
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key)!.push(t)
        }
        return order
          .map(p => p || 'No priority')
          .filter(p => groups.has(p))
          .map(label => ({
            label, emoji: label.includes('High') ? '🚨' : label.includes('Medium') ? '🟡' : label.includes('Low') ? '🔵' : '⚪', tasks: groups.get(label)!,
          }))
      }
      case 'type': {
        const groups = new Map<string, QuestTask[]>()
        for (const t of taskList) {
          const key = t.taskType || 'Other'
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key)!.push(t)
        }
        return Array.from(groups.entries()).map(([label, tasks]) => ({
          label: label.split(' ').slice(0, -1).join(' ') || label,
          emoji: label.includes('🧠') ? '🧠' : label.includes('🏗') ? '🏗️' : label.includes('⚙') ? '⚙️' : label.includes('📊') ? '📊' : '⚔️',
          tasks,
        }))
      }
      default: { // source
        const sonder = taskList.filter(t => t.source === 'sonder')
        const pb = taskList.filter(t => t.source === 'personal')
        const groups: { label: string; emoji: string; tasks: QuestTask[] }[] = []
        if (sonder.length > 0) groups.push({ label: 'Sonder', emoji: '🏢', tasks: sonder })
        if (pb.length > 0) groups.push({ label: 'Personal Brand', emoji: '👑', tasks: pb })
        return groups
      }
    }
  }

  // ── Toggle subtasks ──
  async function toggleSubtasks(taskId: string) {
    if (expandedTasks.has(taskId)) {
      setExpandedTasks(prev => { const n = new Set(prev); n.delete(taskId); return n })
      return
    }
    if (!subtasksMap[taskId]) {
      setLoadingSubtasks(taskId)
      try {
        const res = await fetch(`/api/notion/subtasks?parentId=${taskId}`)
        const data = await res.json()
        setSubtasksMap(prev => ({ ...prev, [taskId]: data.subtasks ?? [] }))
      } catch (e) { console.error(e) }
      finally { setLoadingSubtasks(null) }
    }
    setExpandedTasks(prev => new Set(prev).add(taskId))
  }

  // ── Complete task ──
  async function completeTask(task: QuestTask, e: React.MouseEvent) {
    if (completing) return
    setCompleting(task.id)

    const isBoss = task.priority === 'High 🚨'

    const burst = { id: task.id + Date.now(), count: task.stars, x: e.clientX, y: e.clientY }
    setStarBursts(prev => [...prev, burst])
    setTimeout(() => setStarBursts(prev => prev.filter(b => b.id !== burst.id)), 1200)

    try {
      await fetch('/api/notion/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, source: task.source }),
      })

      const currentState = stateRef.current

      // If timer was running for this task, stop it
      if (currentState.activeTimer?.taskId === task.id) {
        await fetch('/api/notion/timer', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'stop', entryId: currentState.activeTimer.timeTrackerId }),
        })
      }

      const result = earnStars(
        { ...currentState, completedTaskIds: [...currentState.completedTaskIds, task.id], activeTimer: currentState.activeTimer?.taskId === task.id ? null : currentState.activeTimer },
        task.stars,
        isBoss
      )

      // Time bonus
      let finalState = result.state
      if (currentState.activeTimer?.taskId === task.id && task.timeConsuming) {
        const elapsed = (Date.now() - currentState.activeTimer.startedAt) / (1000 * 60 * 60)
        if (elapsed <= task.timeConsuming) {
          const bonus = Math.round(result.starsEarned * 0.5)
          finalState = { ...finalState, stars: finalState.stars + bonus }
          pushCeleb({ type: 'combo', label: '⏱️ On time bonus!', starsEarned: bonus })
        }
      }

      saveState(finalState)
      onStateChange(finalState)

      // Sound + haptic feedback
      soundComplete()
      hapticMedium()

      // Need feedback animations
      const feedbacks: NeedFeedbackItem[] = []
      if (result.needsChanged.hunger > 0) {
        feedbacks.push({ id: `hunger-${Date.now()}`, type: 'hunger', amount: result.needsChanged.hunger, x: e.clientX - 40, y: e.clientY })
      }
      if (result.needsChanged.cleanliness > 0) {
        feedbacks.push({ id: `clean-${Date.now()}`, type: 'cleanliness', amount: result.needsChanged.cleanliness, x: e.clientX + 40, y: e.clientY })
      }
      if (feedbacks.length > 0) {
        setNeedFeedbacks(prev => [...prev, ...feedbacks])
        setTimeout(() => setNeedFeedbacks(prev => prev.filter(f => !feedbacks.some(nf => nf.id === f.id))), 1500)
      }

      // Star penalty warning
      if (result.starsPenalty > 0) {
        soundWarning()
      }

      const currentPenalties = getHealthPenalties(getOverallHealth(finalState))

      // Queue celebrations (disabled when pet is asleep)
      if (!currentPenalties.celebrationsDisabled) {
        const comboLbl = getComboLabel(result.state.comboCount)
        if (comboLbl && result.comboMultiplier > 1 && !currentPenalties.comboDisabled) {
          soundCombo()
          pushCeleb({ type: 'combo', label: comboLbl, starsEarned: result.starsEarned })
        }
      if (result.evolved) {
        soundEvolution()
        hapticHeavy()
        const newStage = getStageForLevel(result.newLevel)
        pushCeleb({
          type: 'evolution',
          petEmoji: getPetEmoji(currentState.petId, result.newLevel),
          aura: getLegendaryAura(currentState.petId),
          stageName: getStageLabel(newStage),
        })
      }
      if (result.leveledUp) {
        soundLevelUp()
        hapticSuccess()
        pushCeleb({ type: 'levelup', level: result.newLevel })
      }
      result.newAchievements.forEach(a => {
        soundAchievement()
        pushCeleb({ type: 'achievement', achievement: a })
      })
      } // end celebrations disabled check
    } catch (e) { console.error(e) }
    finally { setCompleting(null) }
  }

  // ── Timer ──
  async function startTimer(task: QuestTask) {
    try {
      const res = await fetch('/api/notion/timer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'start', taskId: task.id, taskTitle: task.title, source: task.source }),
      })
      const data = await res.json()
      if (data.entryId) {
        const next = { ...stateRef.current, activeTimer: { timeTrackerId: data.entryId, taskId: task.id, taskTitle: task.title, startedAt: Date.now() } }
        saveState(next)
        onStateChange(next)
      }
    } catch (e) { console.error(e) }
  }

  async function stopTimer() {
    const currentState = stateRef.current
    if (!currentState.activeTimer) return
    try {
      await fetch('/api/notion/timer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'stop', entryId: currentState.activeTimer.timeTrackerId }),
      })
      const next = { ...currentState, activeTimer: null }
      saveState(next)
      onStateChange(next)
    } catch (e) { console.error(e) }
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

  const dailyXP = state.dailyXPDate === today ? state.dailyXP : 0
  const dailyProgress = Math.min(100, (dailyXP / state.dailyXPGoal) * 100)
  const xpPercent = Math.round((state.xp / xpForLevel(state.level)) * 100)
  const health = getOverallHealth(state)
  const penalties = getHealthPenalties(health)

  const comboLabel = getComboLabel(state.comboCount)
  const timeSinceCombo = Date.now() - state.lastComboTime
  const comboActive = !penalties.comboDisabled && timeSinceCombo < 5 * 60 * 1000 && state.comboCount >= 2

  return (
    <div className="flex-1 flex flex-col gap-4 min-w-0">

      {/* Health warning banners — escalating severity */}
      {penalties.petFainted && (
        <motion.div
          className="bg-gray-900 rounded-2xl px-4 py-4 text-center border-2 border-red-500"
          animate={{ borderColor: ['#ef4444', '#dc2626', '#ef4444'] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <p className="text-3xl mb-1">💀</p>
          <p className="text-white font-black text-sm">Your pet has FAINTED!</p>
          <p className="text-red-400 text-xs mt-1">Everything is locked. Complete tasks NOW to revive.</p>
          <p className="text-gray-500 text-xs mt-1">Stars earned are reduced by 50%. No combos, no rewards, no celebrations.</p>
        </motion.div>
      )}
      {penalties.petSick && !penalties.petFainted && (
        <motion.div
          className="bg-red-50 border-2 border-red-300 rounded-2xl px-4 py-3 text-center"
          animate={{ scale: [1, 1.01, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <p className="text-red-600 font-black text-sm">🤒 Your pet is DYING!</p>
          <p className="text-red-400 text-xs">Stars reduced by 50%. No combos. Reward store locked.</p>
        </motion.div>
      )}
      {penalties.starsReduced25 && !penalties.petSick && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-center">
          <p className="text-orange-600 font-black text-sm">😟 Your pet is struggling!</p>
          <p className="text-orange-400 text-xs">Stars reduced by 25%. Reward store locked. Take care of your pet!</p>
        </div>
      )}
      {penalties.dangerZone && !penalties.starsReduced25 && !penalties.petSick && !penalties.petFainted && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-2 text-center">
          <p className="text-yellow-600 text-xs font-bold">⚠️ Pet health below 50% — entering danger zone!</p>
        </div>
      )}

      {/* Celebrations */}
      <AnimatePresence mode="wait">
        {current?.type === 'levelup' && <LevelUpModal key="lvl" level={current.level} onClose={popCeleb} />}
        {current?.type === 'achievement' && <AchievementToast key={current.achievement.id} achievement={current.achievement} onClose={popCeleb} />}
        {current?.type === 'combo' && <ComboBanner key="combo" label={current.label} starsEarned={current.starsEarned} />}
        {current?.type === 'evolution' && <EvolutionModal key="evo" petEmoji={current.petEmoji} aura={current.aura} stageName={current.stageName} onClose={popCeleb} />}
      </AnimatePresence>

      <AnimatePresence>
        {starBursts.map(b => <StarBurst key={b.id} count={b.count} x={b.x} y={b.y} />)}
      </AnimatePresence>

      {/* Need feedback animations */}
      <AnimatePresence>
        {needFeedbacks.map(nf => <NeedFeedback key={nf.id} item={nf} />)}
      </AnimatePresence>

      {/* Sync Toast */}
      <AnimatePresence>
        {syncToast && (
          <motion.div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80]"
            initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}>
            <div className="bg-green-600 text-white rounded-2xl px-5 py-3 shadow-2xl text-center">
              <p className="font-black text-sm">🔄 Synced from Notion!</p>
              <p className="text-xs opacity-80">{syncToast.count} task{syncToast.count > 1 ? 's' : ''} completed · +{syncToast.stars}⭐</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Timer Banner */}
      {state.activeTimer && <ActiveTimerBanner timer={state.activeTimer} onStop={stopTimer} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800">
            <span className="pixel-text text-[10px] text-petal-400 mr-1">*</span>
            Quest Board
            <span className="pixel-text text-[10px] text-lavender-300 ml-1">*</span>
          </h1>
          <p className="text-sm text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex bg-white rounded-2xl p-1 shadow-soft border border-petal-100">
            {([
              { id: 'today', label: '⚡ Today' },
              { id: 'week', label: '📅 Week' },
              { id: 'month', label: '📆 Month' },
              { id: 'all', label: '📋 All' },
            ] as { id: typeof view; label: string }[]).map(v => (
              <button key={v.id} onClick={() => { setView(v.id); setShowDatePicker(false) }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${view === v.id && !showDatePicker ? 'bg-petal-500 text-white' : 'text-gray-500 hover:text-petal-500'}`}>
                {v.label}
              </button>
            ))}
            <button onClick={() => setShowDatePicker(!showDatePicker)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${showDatePicker ? 'bg-petal-500 text-white' : 'text-gray-500'}`}>
              🔍
            </button>
          </div>
          <div className="flex bg-white rounded-2xl p-1 shadow-soft border border-lavender-100">
            {(['all', 'sonder', 'personal'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-lavender-400 text-white' : 'text-gray-500'}`}>
                {f === 'all' ? '✨' : f === 'sonder' ? '🏢' : '👑'}
              </button>
            ))}
          </div>
          <button onClick={() => fetchTasks()}
            className="bg-white rounded-2xl px-3 py-1.5 text-xs font-bold text-gray-400 shadow-soft border border-gray-100 hover:border-petal-200 transition-colors">
            🔄
          </button>
        </div>
      </div>

      {/* Date range picker */}
      <AnimatePresence>
        {showDatePicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl p-3 shadow-card flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-500">From</span>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setView('all') }}
                className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:border-petal-300" />
              <span className="text-xs font-bold text-gray-500">To</span>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setView('all') }}
                className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:border-petal-300" />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo('') }}
                  className="text-xs text-red-400 font-bold hover:text-red-500">Clear</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group by selector */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        <span className="text-xs text-gray-400 font-bold shrink-0 py-1">Group:</span>
        {([
          { id: 'source', label: '📂 Source' },
          { id: 'project', label: '📁 Project' },
          { id: 'priority', label: '🎯 Priority' },
          { id: 'type', label: '🏷️ Type' },
        ] as { id: typeof groupBy; label: string }[]).map(g => (
          <button key={g.id} onClick={() => setGroupBy(g.id)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${groupBy === g.id ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border border-gray-100'}`}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 shadow-card cozy-card">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-gray-500">🎯 Daily XP</span>
            <span className="pixel-text text-[7px] text-petal-500">{dailyXP}/{state.dailyXPGoal}</span>
          </div>
          <div className="w-full h-2.5 bg-petal-100 rounded-sm overflow-hidden">
            <motion.div className="h-full xp-bar rounded-sm pixel-bar" animate={{ width: `${dailyProgress}%` }} transition={{ duration: 0.5 }} />
          </div>
          {dailyProgress >= 100 && <p className="pixel-text text-[6px] text-green-500 mt-1">COMPLETE!</p>}
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-card text-center cozy-card">
          <p className="text-xs font-bold text-gray-500 mb-1">🔥 Streak</p>
          <p className="pixel-text text-base text-gray-800">{state.streak}</p>
          <p className="text-xs text-gray-400">days</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-card cozy-card">
          <div className="flex justify-between items-center mb-1">
            <span className="pixel-text text-[7px] text-gray-500">LV{state.level}</span>
            <span className="pixel-text text-[7px] text-lavender-400">{xpPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-lavender-100 rounded-sm overflow-hidden">
            <motion.div className="h-full bg-lavender-400 rounded-sm pixel-bar" animate={{ width: `${xpPercent}%` }} transition={{ duration: 0.5 }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{state.xp}/{xpForLevel(state.level)} XP</p>
        </div>
      </div>

      {/* Combo indicator */}
      <AnimatePresence>
        {comboActive && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            className="bg-gradient-to-r from-petal-500 to-lavender-500 rounded-2xl px-4 py-2 flex items-center justify-between">
            <span className="text-white font-black text-sm">{comboLabel}</span>
            <span className="text-white/80 text-xs">combo active — keep it up!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Challenges */}
      <DailyChallenges state={state} onStateChange={onStateChange} />

      {/* Task lists */}
      {loading ? <LoadingSkeleton /> : visibleTasks.length === 0 ? <EmptyState tasksFromApi={tasks.length} /> : (
        <div className="flex flex-col gap-5">
          {/* ── OVERDUE SECTION (always on top) ── */}
          {overdueTasks.length > 0 && (
            <div>
              <h2 className="text-sm font-black text-red-500 mb-2 ml-1 flex items-center gap-1">
                ⏰ Overdue <span className="bg-red-100 text-red-600 rounded-full px-2 py-0.5 text-xs">{overdueTasks.length}</span>
              </h2>
              <div className="flex flex-col gap-2">
                {overdueTasks.map(t => (
                  <TaskCardWrapper key={t.id} task={t} {...cardProps(t)} />
                ))}
              </div>
            </div>
          )}

          {/* ── GROUPED TASKS ── */}
          {groupTasks(nonOverdueTasks).map(group => (
            <div key={group.label}>
              <h2 className="text-sm font-black text-gray-600 mb-2 ml-1">
                {group.emoji} {group.label} <span className="text-gray-400 font-normal">({group.tasks.length})</span>
              </h2>
              <div className="flex flex-col gap-2">
                {group.tasks.map(t => (
                  <TaskCardWrapper key={t.id} task={t} {...cardProps(t)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Helper to build card props
  function cardProps(t: QuestTask) {
    return {
      completing: completing === t.id,
      breaking: breaking === t.id,
      isTimerActive: state.activeTimer?.taskId === t.id,
      hasAnyTimer: !!state.activeTimer,
      onComplete: (e: React.MouseEvent) => completeTask(t, e),
      onBreakdown: () => breakdownTask(t),
      onStartTimer: () => startTimer(t),
      onStopTimer: stopTimer,
      expanded: expandedTasks.has(t.id),
      onToggleSubtasks: () => toggleSubtasks(t.id),
      subtasks: subtasksMap[t.id],
      loadingSubtasks: loadingSubtasks === t.id,
      completedIds: state.completedTaskIds,
      completingId: completing,
      onCompleteSubtask: completeTask,
    }
  }
}

// ── Task Card Wrapper (decides Boss vs Regular + subtasks) ─────────────────
function TaskCardWrapper({ task, completing, breaking, isTimerActive, hasAnyTimer, onComplete, onBreakdown, onStartTimer, onStopTimer, expanded, onToggleSubtasks, subtasks, loadingSubtasks, completedIds, completingId, onCompleteSubtask }: {
  task: QuestTask; completing: boolean; breaking: boolean
  isTimerActive: boolean; hasAnyTimer: boolean
  onComplete: (e: React.MouseEvent) => void; onBreakdown: () => void
  onStartTimer: () => void; onStopTimer: () => void
  expanded: boolean; onToggleSubtasks: () => void
  subtasks?: QuestTask[]; loadingSubtasks: boolean
  completedIds: string[]; completingId: string | null
  onCompleteSubtask: (t: QuestTask, e: React.MouseEvent) => void
}) {
  const isBoss = task.priority === 'High 🚨'
  const Card = isBoss ? BossCard : TaskCard

  return (
    <div>
      <Card task={task} completing={completing} breaking={breaking}
        isTimerActive={isTimerActive} hasAnyTimer={hasAnyTimer}
        onComplete={onComplete} onBreakdown={onBreakdown}
        onStartTimer={onStartTimer} onStopTimer={onStopTimer}
        hasSubtasks={task.hasSubtasks} expanded={expanded}
        onToggleSubtasks={onToggleSubtasks} />
      {expanded && (
        <SubtaskList subtasks={subtasks} loading={loadingSubtasks}
          completedIds={completedIds} completing={completingId}
          onComplete={onCompleteSubtask} />
      )}
    </div>
  )
}

// ── Active Timer Banner ───────────────────────────────────────────────────
function ActiveTimerBanner({ timer, onStop }: { timer: NonNullable<GameState['activeTimer']>; onStop: () => void }) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    function update() {
      const diff = Date.now() - timer.startedAt
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setElapsed(`${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    update()
    const i = setInterval(update, 1000)
    return () => clearInterval(i)
  }, [timer.startedAt])

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl px-4 py-3 flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-white text-xs font-bold opacity-80">⏱️ Timer active</p>
        <p className="text-white font-black text-sm truncate">{timer.taskTitle}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-white font-mono font-black text-lg">{elapsed}</span>
        <button onClick={onStop}
          className="bg-white/20 text-white rounded-xl px-3 py-1.5 text-xs font-bold hover:bg-white/30 transition-colors">
          ⏹️ Stop
        </button>
      </div>
    </motion.div>
  )
}

// ── Subtask List ──────────────────────────────────────────────────────────
function SubtaskList({ subtasks, loading, completedIds, completing, onComplete }: {
  subtasks?: QuestTask[]; loading: boolean; completedIds: string[]; completing: string | null
  onComplete: (t: QuestTask, e: React.MouseEvent) => void
}) {
  if (loading) return <div className="ml-8 py-2"><span className="text-xs text-gray-400 animate-pulse">Loading subtasks...</span></div>
  if (!subtasks || subtasks.length === 0) return <div className="ml-8 py-2"><span className="text-xs text-gray-400">No subtasks</span></div>

  const active = subtasks.filter(s => !completedIds.includes(s.id) && s.status !== 'Done')
  const done = subtasks.filter(s => completedIds.includes(s.id) || s.status === 'Done')

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
      className="ml-6 border-l-2 border-petal-200 pl-3 py-1">
      {active.map(sub => (
        <div key={sub.id} className="flex items-center gap-2 py-1.5">
          <button onClick={e => onComplete(sub, e)} disabled={completing === sub.id}
            className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              completing === sub.id ? 'border-petal-400 bg-petal-400 scale-110' : 'border-petal-300 hover:border-petal-500'
            }`}>
            {completing === sub.id && <span className="text-white text-xs">✓</span>}
          </button>
          <span className="text-sm text-gray-700">{sub.title}</span>
          <span className="text-xs text-petal-400 font-bold ml-auto">+{sub.stars}⭐</span>
        </div>
      ))}
      {done.map(sub => (
        <div key={sub.id} className="flex items-center gap-2 py-1 opacity-40">
          <span className="shrink-0 w-5 h-5 rounded-full bg-green-400 flex items-center justify-center text-white text-xs">✓</span>
          <span className="text-sm text-gray-500 line-through">{sub.title}</span>
        </div>
      ))}
    </motion.div>
  )
}

// ── Overdue Badge ─────────────────────────────────────────────────────────
function OverdueBadge({ days }: { days: number }) {
  if (days <= 0) return null
  return (
    <motion.span animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}
      className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">
      ⏰ {days}d overdue
    </motion.span>
  )
}

// ── Boss Card ─────────────────────────────────────────────────────────────
function BossCard({ task, completing, breaking, isTimerActive, hasAnyTimer, onComplete, onBreakdown, onStartTimer, onStopTimer, hasSubtasks, expanded, onToggleSubtasks }: {
  task: QuestTask; completing: boolean; breaking: boolean
  isTimerActive: boolean; hasAnyTimer: boolean
  onComplete: (e: React.MouseEvent) => void; onBreakdown: () => void
  onStartTimer: () => void; onStopTimer: () => void
  hasSubtasks: boolean; expanded: boolean; onToggleSubtasks: () => void
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
      className={`relative rounded-2xl overflow-hidden shadow-lg ${task.daysOverdue > 0 ? 'ring-2 ring-petal-400' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-petal-50 via-white to-lavender-50" />
      <div className="absolute inset-0 border-2 border-petal-200 rounded-2xl" />
      <motion.div className="absolute inset-0 rounded-2xl"
        animate={{ boxShadow: ['0 0 0px rgba(255,92,160,0)', '0 0 15px rgba(255,92,160,0.2)', '0 0 0px rgba(255,92,160,0)'] }}
        transition={{ repeat: Infinity, duration: 2.5 }} />

      <div className="relative p-4">
        <div className="flex items-center gap-2 mb-2">
          <motion.span className="text-lg" animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>🌟</motion.span>
          <span className="pixel-text text-[7px] text-petal-500 uppercase">Boss Quest</span>
          <OverdueBadge days={task.daysOverdue} />
          <span className="pixel-text text-[7px] text-petal-500 ml-auto">+{task.stars * 2}*</span>
        </div>

        <div className="flex items-start gap-3">
          <button onClick={onComplete} disabled={completing}
            className={`mt-0.5 shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
              completing ? 'border-petal-500 bg-petal-500' : 'border-petal-300 hover:border-petal-500 hover:bg-petal-50'
            }`}>
            {completing ? <span className="text-white text-xs">✓</span> : <span className="text-petal-400 text-xs">⚔️</span>}
          </button>
          <div className="flex-1">
            <p className="font-black text-gray-800 text-sm leading-snug">{task.title}</p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {task.taskType && <span className="text-xs px-2 py-0.5 rounded-full bg-petal-100 text-petal-500 font-semibold">{task.taskType.split(' ').slice(-1)[0]}</span>}
              {formatTime(task.timeConsuming) && <span className="text-xs px-2 py-0.5 rounded-full bg-lavender-100 text-lavender-500 font-semibold">⏱ {formatTime(task.timeConsuming)}</span>}
              {task.dueDate && <span className="text-xs text-gray-400">📅 {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
            </div>
          </div>
        </div>

        <div className="pixel-divider my-3" />

        <div className="flex gap-3 flex-wrap">
          {isTimerActive ? (
            <button onClick={onStopTimer} className="text-xs font-bold text-red-400 hover:text-red-500">⏹️ Stop timer</button>
          ) : (
            <button onClick={onStartTimer} disabled={hasAnyTimer} className="text-xs font-bold text-green-500 hover:text-green-600 disabled:opacity-30">▶️ Start timer</button>
          )}
          {hasSubtasks && (
            <button onClick={onToggleSubtasks} className="text-xs font-bold text-lavender-400 hover:text-lavender-500">
              {expanded ? '▾ Hide subtasks' : '▸ Show subtasks'}
            </button>
          )}
          {!hasSubtasks && (
            <button onClick={onBreakdown} disabled={breaking} className="text-xs font-bold text-petal-400 hover:text-petal-500">
              {breaking ? '✨ Breaking down...' : '✨ Break into 15-min tasks'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Task Card ─────────────────────────────────────────────────────────────
const TASK_TYPE_ICONS: Record<string, string> = {
  'Strategic Tasks 🧠': '🧠', 'Creative / Production Tasks 🏗️': '🏗️',
  'Operational Tasks ⚙️': '⚙️', 'Analytical / Review Tasks 📊': '📊',
}
const STATUS_COLORS: Record<string, string> = {
  'Done': 'bg-mint-200 text-green-700', 'In progress': 'bg-lavender-100 text-lavender-500',
  'Not started': 'bg-gray-100 text-gray-500', 'Backlog': 'bg-gray-100 text-gray-400',
  'Capture': 'bg-yellow-50 text-yellow-600',
}

function TaskCard({ task, completing, breaking, isTimerActive, hasAnyTimer, onComplete, onBreakdown, onStartTimer, onStopTimer, hasSubtasks, expanded, onToggleSubtasks }: {
  task: QuestTask; completing: boolean; breaking: boolean
  isTimerActive: boolean; hasAnyTimer: boolean
  onComplete: (e: React.MouseEvent) => void; onBreakdown: () => void
  onStartTimer: () => void; onStopTimer: () => void
  hasSubtasks: boolean; expanded: boolean; onToggleSubtasks: () => void
}) {
  const icon = TASK_TYPE_ICONS[task.taskType] ?? '⚔️'
  const statusColor = STATUS_COLORS[task.status] ?? 'bg-gray-100 text-gray-500'

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20, scale: 0.9 }}
      className={`quest-card bg-white rounded-2xl p-4 shadow-card border ${task.daysOverdue > 0 ? 'border-red-300 bg-red-50/30' : 'border-gray-50'}`}>
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
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>{task.status}</span>
            <OverdueBadge days={task.daysOverdue} />
            {formatTime(task.timeConsuming) && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-400 font-semibold">⏱ {formatTime(task.timeConsuming)}</span>}
            {task.dueDate && <span className="text-xs text-gray-400">📅 {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
            <span className="pixel-text text-[7px] text-petal-500 ml-auto">+{task.stars}*</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-between items-center">
        <div className="flex gap-3">
          {isTimerActive ? (
            <button onClick={onStopTimer} className="text-xs font-bold text-red-500 hover:text-red-600">⏹️ Stop timer</button>
          ) : (
            <button onClick={onStartTimer} disabled={hasAnyTimer} className="text-xs font-bold text-green-500 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed">▶️ Start</button>
          )}
          {hasSubtasks && (
            <button onClick={onToggleSubtasks} className="text-xs font-bold text-lavender-400 hover:text-lavender-500">
              {expanded ? '▾ Subtasks' : '▸ Subtasks'}
            </button>
          )}
        </div>
        {!hasSubtasks && (
          <button onClick={onBreakdown} disabled={breaking}
            className="text-xs font-bold text-lavender-400 hover:text-lavender-500 flex items-center gap-1 transition-colors">
            {breaking ? <><span className="animate-spin">✨</span> Breaking down...</> : <>✨ Break into 15-min tasks</>}
          </button>
        )}
      </div>
    </motion.div>
  )
}

function LoadingSkeleton() {
  return <div className="flex flex-col gap-2">{[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-card animate-pulse h-20" />)}</div>
}

function EmptyState({ tasksFromApi }: { tasksFromApi: number }) {
  if (tasksFromApi === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="pixel-text text-xs text-gray-600 mb-2">NO QUESTS FOUND</h3>
        <p className="text-gray-400 text-sm">No tasks matched the current view filter.</p>
        <p className="text-gray-400 text-xs mt-1">Check that your Notion tasks have a Do Date = today, Sprint Status = Current, or are overdue.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-6xl mb-4 pet-float">🎉</div>
      <h3 className="pixel-text text-xs text-gray-600 mb-2">ALL QUESTS COMPLETE!</h3>
      <p className="text-gray-400 text-sm">You crushed it today. Go redeem a reward ~</p>
      <div className="pixel-divider w-16 mx-auto mt-3" />
    </div>
  )
}
