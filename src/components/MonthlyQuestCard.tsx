'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { GameState, claimMonthlyQuest, saveState } from '@/lib/gameStore'
import { getMonthlyQuest, getMonthlyProgress, isMonthlyQuestComplete } from '@/lib/monthlyQuests'
import { hapticSuccess, soundLevelUp } from '@/lib/feedback'

type Props = {
  state: GameState
  onStateChange: (s: GameState) => void
}

export default function MonthlyQuestCard({ state, onStateChange }: Props) {
  const [claiming, setClaiming] = useState(false)
  const quest = getMonthlyQuest()

  const counters = {
    tasks: state.monthlyTasksCompleted ?? 0,
    bosses: state.monthlyBossesCompleted ?? 0,
    habits: state.monthlyHabitsCompleted ?? 0,
    streak: state.streak ?? 0,
  }
  const progress = getMonthlyProgress(quest, counters)
  const complete = isMonthlyQuestComplete(quest, counters)
  const claimed = (state.claimedMonthlyQuests ?? []).includes(quest.id)
  const pct = Math.round((progress / quest.target) * 100)

  function claim() {
    if (!complete || claimed || claiming) return
    setClaiming(true)
    const next = claimMonthlyQuest(state, quest.id, quest.starReward, quest.xpReward)
    saveState(next)
    onStateChange(next)
    hapticSuccess()
    soundLevelUp()
    setTimeout(() => setClaiming(false), 800)
  }

  if (claimed) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">{quest.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-green-700">{quest.monthLabel} Quest claimed ✓</p>
          <p className="text-xs text-green-600 truncate">{quest.title}</p>
        </div>
        <span className="text-xs font-black text-green-600 shrink-0">+{quest.starReward}⭐</span>
      </div>
    )
  }

  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-2xl shadow-card border-2 ${
        complete ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 via-petal-50 to-lavender-50' : 'border-petal-200 bg-white'
      }`}
    >
      {complete && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ boxShadow: ['0 0 0px rgba(250,204,21,0)', '0 0 20px rgba(250,204,21,0.4)', '0 0 0px rgba(250,204,21,0)'] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}
      <div className="relative p-4">
        <div className="flex items-center gap-2 mb-2">
          <motion.span
            className="text-2xl"
            animate={complete ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] } : {}}
            transition={{ repeat: Infinity, duration: 2.5 }}
          >
            {quest.emoji}
          </motion.span>
          <div className="flex-1 min-w-0">
            <p className="pixel-text text-[8px] text-petal-500 uppercase tracking-wide">{quest.monthLabel} Quest</p>
            <p className="font-black text-gray-800 text-sm leading-tight">{quest.title}</p>
          </div>
          <span className="text-xs font-black text-petal-500 shrink-0">+{quest.starReward}⭐</span>
        </div>

        <p className="text-xs text-gray-500 mb-3">{quest.description}</p>

        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${complete ? 'bg-yellow-400' : 'bg-petal-400'}`}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="pixel-text text-[7px] text-gray-500 shrink-0">{progress}/{quest.target}</span>
        </div>

        <AnimatePresence>
          {complete && (
            <motion.button
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              onClick={claim}
              disabled={claiming}
              className="mt-3 w-full bg-gradient-to-r from-petal-500 to-lavender-500 text-white font-black text-sm rounded-xl py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {claiming ? '✨ Claiming...' : `🎁 Claim +${quest.starReward}⭐ +${quest.xpReward} XP`}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
