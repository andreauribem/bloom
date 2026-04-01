'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PETS, GameState, xpForLevel, saveState, ALL_ACHIEVEMENTS } from '@/lib/gameStore'

type Props = {
  state: GameState
  onStateChange: (s: GameState) => void
}

export default function PetSidebar({ state, onStateChange }: Props) {
  const [showPetPicker, setShowPetPicker] = useState(false)
  const [showCheckin, setShowCheckin] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [petReaction, setPetReaction] = useState<string | null>(null)
  const [prevCompleted, setPrevCompleted] = useState(state.totalTasksCompleted)

  const pet = PETS.find(p => p.id === state.petId) ?? PETS[0]
  const xpPercent = Math.round((state.xp / xpForLevel(state.level)) * 100)
  const wellnessMood = state.wellness >= 70 ? '😊' : state.wellness >= 40 ? '😐' : '😢'
  const unlockedCount = state.achievements.filter(a => a.unlockedAt).length

  // Pet reacts when a task is completed
  useEffect(() => {
    if (state.totalTasksCompleted > prevCompleted) {
      setPrevCompleted(state.totalTasksCompleted)
      const reactions = state.petMood === 'excited'
        ? ['🎉', '🔥', '⭐', '💫']
        : state.petMood === 'happy'
        ? ['😄', '✨', '🌸', '💕']
        : ['👏', '✓', '😊']
      setPetReaction(reactions[Math.floor(Math.random() * reactions.length)])
      setTimeout(() => setPetReaction(null), 1500)
    }
  }, [state.totalTasksCompleted, prevCompleted, state.petMood])

  const petAnimVariant = state.petMood === 'excited'
    ? { scale: [1, 1.2, 0.9, 1.15, 1], rotate: [0, -10, 10, -5, 0] }
    : state.petMood === 'happy'
    ? { y: [0, -10, 0, -6, 0] }
    : state.petMood === 'tired'
    ? { rotate: [0, 5, 0] }
    : { y: [0, -6, 0] }

  function selectPet(petId: string) {
    const p = PETS.find(x => x.id === petId)!
    const next = { ...state, petId, petName: p.name }
    saveState(next); onStateChange(next); setShowPetPicker(false)
  }

  const streakColor = state.streak >= 7 ? 'text-yellow-500'
    : state.streak >= 3 ? 'text-orange-500'
    : 'text-gray-500'

  return (
    <aside className="w-64 shrink-0 flex flex-col gap-3 p-4">
      {/* ── Pet card ── */}
      <div
        className="bg-white rounded-3xl p-4 shadow-card flex flex-col items-center gap-2 cursor-pointer relative overflow-hidden"
        onClick={() => setShowPetPicker(true)}
      >
        {/* Mood background glow */}
        <div className={`absolute inset-0 opacity-10 ${
          state.petMood === 'excited' ? 'bg-petal-400'
          : state.petMood === 'happy' ? 'bg-lavender-400'
          : state.petMood === 'tired' ? 'bg-gray-400'
          : 'bg-transparent'
        }`} />

        {/* Level badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <span className="text-xs bg-petal-400 text-white rounded-full px-2 py-0.5 font-black">
            Lv{state.level}
          </span>
        </div>

        {/* Pet sprite with mood animation */}
        <div className="relative">
          <motion.div
            className="text-7xl select-none"
            animate={petAnimVariant}
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
          >
            {pet.sprite}
          </motion.div>

          {/* Reaction bubble */}
          <AnimatePresence>
            {petReaction && (
              <motion.div
                className="absolute -top-4 -right-4 text-2xl"
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, y: -10, opacity: 0 }}
              >
                {petReaction}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tired Zzz */}
          {state.petMood === 'tired' && (
            <motion.div
              className="absolute -top-2 right-0 text-sm text-gray-400"
              animate={{ opacity: [0.5, 1, 0.5], y: [-2, -6, -2] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              💤
            </motion.div>
          )}
        </div>

        <p className="font-black text-gray-800 text-lg leading-none relative">{state.petName}</p>
        <p className="text-xs text-gray-400 italic relative">
          {state.petMood === 'excited' ? '~so proud of you!~'
          : state.petMood === 'happy' ? '~keep going!~'
          : state.petMood === 'hungry' ? '~I\'m so hungry... feed me!~'
          : state.petMood === 'tired' ? '~please take care of me~'
          : '~let\'s do this!~'}
        </p>

        {/* XP bar */}
        <div className="w-full relative">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>⭐ {state.xp} XP</span>
            <span>{xpForLevel(state.level)} XP</span>
          </div>
          <div className="w-full h-2.5 bg-petal-100 rounded-full overflow-hidden">
            <motion.div className="h-full xp-bar rounded-full"
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Wellness */}
        <div className="w-full relative">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>💗 Wellness {wellnessMood}</span>
            <span>{state.wellness}%</span>
          </div>
          <div className="w-full h-2 bg-lavender-100 rounded-full overflow-hidden">
            <motion.div className="h-full bg-lavender-400 rounded-full"
              animate={{ width: `${state.wellness}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>

        {/* Hunger */}
        <div className="w-full relative">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>🍱 Hunger {state.hunger < 20 ? '😣' : state.hunger < 50 ? '🙂' : '😋'}</span>
            <span>{Math.round(state.hunger)}%</span>
          </div>
          <div className="w-full h-2 bg-orange-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${state.hunger < 20 ? 'bg-red-400' : state.hunger < 50 ? 'bg-orange-400' : 'bg-green-400'}`}
              animate={{ width: `${state.hunger}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          {state.hunger < 20 && (
            <p className="text-xs text-red-400 font-bold mt-0.5">{state.petName} is hungry! Complete a task 🍱</p>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-0.5 relative">tap to change pet ✨</p>
      </div>

      {/* ── Stars + Streak row ── */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-2xl p-3 shadow-card text-center">
          <p className="text-xs text-gray-400 mb-0.5">stars</p>
          <p className="text-2xl font-black text-petal-500">⭐ {state.stars}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-card text-center">
          <p className="text-xs text-gray-400 mb-0.5">streak</p>
          <p className={`text-2xl font-black ${streakColor}`}>
            {state.streak >= 3 ? '🔥' : '📅'} {state.streak}
          </p>
          <p className="text-xs text-gray-400">days</p>
        </div>
      </div>

      {/* ── Achievements ── */}
      <button
        onClick={() => setShowAchievements(true)}
        className="bg-white rounded-2xl p-3 shadow-card flex items-center gap-3 hover:border-petal-200 border-2 border-transparent transition-colors"
      >
        <span className="text-2xl">🏆</span>
        <div className="text-left">
          <p className="text-sm font-black text-gray-800">Achievements</p>
          <p className="text-xs text-gray-400">{unlockedCount}/{ALL_ACHIEVEMENTS.length} unlocked</p>
        </div>
        <div className="ml-auto bg-petal-100 rounded-full px-2 py-0.5">
          <span className="text-xs font-bold text-petal-600">{unlockedCount}</span>
        </div>
      </button>

      {/* ── Daily check-in ── */}
      <button
        onClick={() => setShowCheckin(true)}
        className="bg-white rounded-2xl p-3 shadow-card text-left border-2 border-dashed border-petal-200 hover:border-petal-400 transition-colors"
      >
        <p className="text-xs font-bold text-gray-700">📋 Daily Check-in</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {state.dailyChecks.length > 0 ? 'keep your pet happy ✨' : 'log sleep & exercise →'}
        </p>
      </button>

      {/* Tasks completed today */}
      <div className="bg-gradient-to-r from-petal-50 to-lavender-50 rounded-2xl p-3 border border-petal-100">
        <p className="text-xs font-bold text-gray-500 mb-1">🗡️ Total quests</p>
        <p className="text-xl font-black text-gray-800">{state.totalTasksCompleted}</p>
        <p className="text-xs text-gray-400">completed</p>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showPetPicker && <PetPicker currentId={state.petId} onSelect={selectPet} onClose={() => setShowPetPicker(false)} />}
        {showCheckin && <DailyCheckin state={state} onSave={next => { saveState(next); onStateChange(next); setShowCheckin(false) }} onClose={() => setShowCheckin(false)} />}
        {showAchievements && <AchievementsPanel state={state} onClose={() => setShowAchievements(false)} />}
      </AnimatePresence>
    </aside>
  )
}

// ── Pet Picker ─────────────────────────────────────────────────────────────
function PetPicker({ currentId, onSelect, onClose }: { currentId: string; onSelect: (id: string) => void; onClose: () => void }) {
  return (
    <motion.div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
        onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-black text-gray-800 mb-1 text-center">Choose your companion ✨</h2>
        <p className="text-xs text-gray-400 text-center mb-4">your little motivator</p>
        <div className="grid grid-cols-3 gap-3">
          {PETS.map(pet => (
            <button key={pet.id} onClick={() => onSelect(pet.id)}
              className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${
                currentId === pet.id ? 'border-petal-400 bg-petal-50' : 'border-gray-100 hover:border-petal-200'
              }`}>
              <span className="text-4xl mb-1">{pet.sprite}</span>
              <span className="text-xs font-bold text-gray-700">{pet.name}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Achievements Panel ─────────────────────────────────────────────────────
function AchievementsPanel({ state, onClose }: { state: GameState; onClose: () => void }) {
  const unlocked = state.achievements.filter(a => a.unlockedAt)
  const locked = state.achievements.filter(a => !a.unlockedAt)

  return (
    <motion.div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl max-h-[80vh] overflow-y-auto"
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
        onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-black text-gray-800 mb-1 text-center">🏆 Achievements</h2>
        <p className="text-xs text-gray-400 text-center mb-4">{unlocked.length} of {ALL_ACHIEVEMENTS.length} unlocked</p>

        {unlocked.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Unlocked ✨</p>
            <div className="flex flex-col gap-2">
              {unlocked.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-2 bg-petal-50 rounded-2xl border border-petal-100">
                  <span className="text-2xl">{a.emoji}</span>
                  <div>
                    <p className="font-bold text-sm text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-400">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Locked 🔒</p>
          <div className="flex flex-col gap-2">
            {locked.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-2xl opacity-60">
                <span className="text-2xl grayscale">{a.emoji}</span>
                <div>
                  <p className="font-bold text-sm text-gray-600">{a.title}</p>
                  <p className="text-xs text-gray-400">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Daily Check-in ─────────────────────────────────────────────────────────
function DailyCheckin({ state, onSave, onClose }: { state: GameState; onSave: (s: GameState) => void; onClose: () => void }) {
  const today = new Date().toISOString().split('T')[0]
  const existing = state.dailyChecks.find(c => c.date === today)
  const [checks, setChecks] = useState({
    slept: existing?.slept ?? false, exercised: existing?.exercised ?? false,
    water: existing?.water ?? false, noPhone: existing?.noPhone ?? false,
    learned: existing?.learned ?? false,
  })

  const items = [
    { key: 'slept',     label: 'Slept well', emoji: '🌙' },
    { key: 'exercised', label: 'Exercised', emoji: '🏃‍♀️' },
    { key: 'water',     label: 'Drank enough water', emoji: '💧' },
    { key: 'noPhone',   label: 'No phone 1h', emoji: '📵' },
    { key: 'learned',   label: 'Did my learning session', emoji: '📚' },
  ]

  function save() {
    const check = { date: today, ...checks }
    const otherChecks = state.dailyChecks.filter(c => c.date !== today)
    const score = Object.values(checks).filter(Boolean).length
    const delta = score * 12 - 15
    const wellness = Math.min(100, Math.max(0, state.wellness + delta))
    const petMood: GameState['petMood'] = wellness >= 80 ? 'excited' : wellness >= 50 ? 'happy' : wellness >= 30 ? 'neutral' : 'tired'
    onSave({ ...state, wellness, petMood, dailyChecks: [...otherChecks, check] })
  }

  return (
    <motion.div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
        onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-black text-gray-800 mb-1 text-center">Daily Check-in 📋</h2>
        <p className="text-xs text-gray-400 text-center mb-4">keep your pet happy ✨</p>
        <div className="flex flex-col gap-3 mb-5">
          {items.map(({ key, label, emoji }) => (
            <button key={key}
              onClick={() => setChecks(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
              className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                checks[key as keyof typeof checks] ? 'border-petal-400 bg-petal-50' : 'border-gray-100 hover:border-lavender-200'
              }`}>
              <span className="text-2xl">{emoji}</span>
              <span className="font-semibold text-gray-700 text-sm">{label}</span>
              {checks[key as keyof typeof checks] && <span className="ml-auto text-petal-500 font-bold">✓</span>}
            </button>
          ))}
        </div>
        <button onClick={save} className="w-full bg-petal-500 text-white font-black rounded-2xl py-3 hover:bg-petal-600 transition-colors">
          Save check-in ✨
        </button>
      </motion.div>
    </motion.div>
  )
}
