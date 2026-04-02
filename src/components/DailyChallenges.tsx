'use client'

import { motion } from 'framer-motion'
import { GameState, saveState, claimChallenge } from '@/lib/gameStore'
import { getDailyChallenges, isChallengeComplete, Challenge } from '@/lib/challenges'
import { hapticSuccess, soundCoin } from '@/lib/feedback'

type Props = {
  state: GameState
  onStateChange: (s: GameState) => void
}

export default function DailyChallenges({ state, onStateChange }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const challenges = getDailyChallenges(today)
  const currentHour = new Date().getHours()

  const checkinScore = (() => {
    const check = state.dailyChecks.find(c => c.date === today)
    if (!check) return 0
    return [check.slept, check.exercised, check.water, check.noPhone, check.learned].filter(Boolean).length
  })()

  const tasksToday = state.todayTasksDate === today ? (state.tasksCompletedToday ?? 0) : 0
  const bossesToday = state.todayTasksDate === today ? (state.bossesDefeatedToday ?? 0) : 0
  const claimed = state.todayTasksDate === today ? (state.claimedChallenges ?? []) : []

  function claim(challenge: Challenge) {
    hapticSuccess()
    soundCoin()
    const next = claimChallenge(state, challenge.id, challenge.xpReward, challenge.starReward)
    saveState(next)
    onStateChange(next)
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-black text-gray-800 text-sm">🎲 Daily Challenges</p>
          <p className="text-xs text-gray-400">resets every day</p>
        </div>
        <span className="text-xs bg-petal-100 text-petal-600 rounded-full px-2 py-0.5 font-bold">
          {challenges.filter(c => claimed.includes(c.id)).length}/{challenges.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {challenges.map(challenge => {
          const complete = isChallengeComplete(
            challenge, tasksToday, state.streak, state.comboCount,
            checkinScore, bossesToday, currentHour
          )
          const isClaimed = claimed.includes(challenge.id)

          return (
            <motion.div
              key={challenge.id}
              layout
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                isClaimed
                  ? 'bg-green-50 border-green-200 opacity-60'
                  : complete
                  ? 'bg-petal-50 border-petal-300 ring-1 ring-petal-200'
                  : 'border-gray-100'
              }`}
            >
              <span className="text-xl shrink-0">{challenge.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${isClaimed ? 'text-green-600 line-through' : 'text-gray-800'}`}>
                  {challenge.title}
                </p>
                <p className="text-xs text-gray-400">{challenge.description}</p>
              </div>
              <div className="shrink-0">
                {isClaimed ? (
                  <span className="text-green-500 text-sm font-bold">✓</span>
                ) : complete ? (
                  <motion.button
                    onClick={() => claim(challenge)}
                    className="bg-petal-500 text-white rounded-xl px-2.5 py-1 text-xs font-bold hover:bg-petal-600"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    +{challenge.starReward}⭐
                  </motion.button>
                ) : (
                  <span className="text-xs text-gray-300 font-bold">
                    +{challenge.starReward}⭐
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
