'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PETS, GameState, xpForLevel, saveState, ALL_ACHIEVEMENTS, getOverallHealth, getHealthLabel } from '@/lib/gameStore'
import { getPetEmoji } from '@/lib/petEvolution'
import { PetPickerModal, AchievementsModal } from './Modals'
import HabitTracker from './HabitTracker'

type Props = {
  state: GameState
  onStateChange: (s: GameState) => void
}

export default function MobileHeader({ state, onStateChange }: Props) {
  const [showPetPicker, setShowPetPicker] = useState(false)
  const [showCheckin, setShowCheckin] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const pet = PETS.find(p => p.id === state.petId) ?? PETS[0]
  const petEmoji = getPetEmoji(state.petId, state.level)
  const xpPercent = Math.round((state.xp / xpForLevel(state.level)) * 100)
  const unlockedCount = state.achievements.filter(a => a.unlockedAt).length
  const today = new Date().toISOString().split('T')[0]
  const dailyXP = state.dailyXPDate === today ? state.dailyXP : 0
  const dailyProgress = Math.min(100, (dailyXP / state.dailyXPGoal) * 100)
  const overallHealth = getOverallHealth(state)
  const healthInfo = getHealthLabel(overallHealth)

  const moodEmoji = state.petMood === 'excited' ? '🤩'
    : state.petMood === 'happy' ? '😊'
    : state.petMood === 'hungry' ? '😣'
    : state.petMood === 'tired' ? '😴'
    : '🙂'

  return (
    <>
      {/* ── Compact sticky bar ── */}
      <div className="bg-white border-b border-petal-100 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Pet avatar — tap to pick */}
          <button
            onClick={() => setShowPetPicker(true)}
            className="relative shrink-0"
          >
            <div className="w-12 h-12 rounded-2xl bg-petal-50 flex items-center justify-center text-2xl border-2 border-petal-200">
              {petEmoji}
            </div>
            <span className="absolute -top-1 -right-1 pixel-text text-[6px] bg-petal-500 text-white rounded-md px-1 py-0.5 leading-none">
              {state.level}
            </span>
            <span className="absolute -bottom-1 -right-1 text-xs">
              {moodEmoji}
            </span>
          </button>

          {/* Center: XP bar + name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black text-gray-700">{state.petName}</span>
              <span className="pixel-text text-[7px] text-petal-500">* {state.stars}</span>
            </div>
            <div className="w-full h-2.5 bg-petal-100 rounded-sm overflow-hidden">
              <motion.div
                className="h-full xp-bar rounded-sm pixel-bar"
                animate={{ width: `${xpPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="pixel-text text-[6px] text-gray-400">LV{state.level} · {state.xp}xp</span>
              {state.streak > 0 && (
                <span className={`pixel-text text-[6px] ${state.streak >= 3 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {state.streak >= 3 ? '🔥' : ''} {state.streak}d
                </span>
              )}
            </div>
          </div>

          {/* Expand stats button */}
          <button
            onClick={() => setShowStats(!showStats)}
            className="shrink-0 w-8 h-8 rounded-xl bg-lavender-50 flex items-center justify-center text-lavender-400 font-bold"
          >
            {showStats ? '▲' : '▼'}
          </button>
        </div>

        {/* Expandable stats panel */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 grid grid-cols-4 gap-2">
                {/* Daily XP */}
                <div className="col-span-2 bg-petal-50 rounded-2xl p-2.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500 font-bold">🎯 Daily XP</span>
                    <span className="text-xs text-petal-500 font-black">{dailyXP}/{state.dailyXPGoal}</span>
                  </div>
                  <div className="w-full h-1.5 bg-petal-200 rounded-full overflow-hidden">
                    <div className="h-full xp-bar rounded-full transition-all" style={{ width: `${dailyProgress}%` }} />
                  </div>
                </div>

                {/* Pet Health */}
                <div className="col-span-2 bg-lavender-50 rounded-2xl p-2.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500 font-bold">{healthInfo.emoji} Pet Health</span>
                    <span className={`text-xs font-black ${healthInfo.color}`}>{overallHealth}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-lavender-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${overallHealth >= 60 ? 'bg-green-400' : overallHealth >= 30 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${overallHealth}%` }} />
                  </div>
                </div>

                {/* Quick actions */}
                <button onClick={() => setShowCheckin(true)}
                  className="col-span-2 bg-white border-2 border-dashed border-petal-300 rounded-2xl p-2.5 text-center">
                  <span className="text-xs font-bold text-gray-600">📋 Habits</span>
                </button>

                <button onClick={() => setShowAchievements(true)}
                  className="col-span-2 bg-white border border-gray-100 rounded-2xl p-2.5 text-center flex items-center justify-center gap-1">
                  <span className="text-xs font-bold text-gray-600">🏆 Achievements</span>
                  <span className="text-xs bg-petal-100 text-petal-600 rounded-full px-1.5 font-bold">{unlockedCount}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showPetPicker && (
          <PetPickerModal
            currentId={state.petId}
            onSelect={(id) => {
              const p = PETS.find(x => x.id === id)!
              const next = { ...state, petId: id, petName: p.name }
              saveState(next); onStateChange(next); setShowPetPicker(false)
            }}
            onClose={() => setShowPetPicker(false)}
          />
        )}
        {showCheckin && (
          <HabitTracker
            state={state}
            onStateChange={(next) => { saveState(next); onStateChange(next) }}
            onClose={() => setShowCheckin(false)}
          />
        )}
        {showAchievements && (
          <AchievementsModal state={state} onClose={() => setShowAchievements(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
