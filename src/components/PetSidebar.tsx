'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PETS, GameState, xpForLevel, saveState, ALL_ACHIEVEMENTS, getOverallHealth, getHealthLabel, getPetPhrase } from '@/lib/gameStore'
import { getPetEmoji, getLegendaryAura, getStageForLevel, getStageLabel, getNextStageLevelReq } from '@/lib/petEvolution'
import { getAccessory } from '@/lib/accessories'

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
  const petEmoji = getPetEmoji(state.petId, state.level)
  const stage = getStageForLevel(state.level)
  const isLegendary = stage === 'legendary'
  const xpPercent = Math.round((state.xp / xpForLevel(state.level)) * 100)
  const unlockedCount = state.achievements.filter(a => a.unlockedAt).length
  const overallHealth = getOverallHealth(state)
  const healthInfo = getHealthLabel(overallHealth)
  const nextStage = getNextStageLevelReq(state.level)

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
    : state.petMood === 'hungry'
    ? { y: [0, -3, 0], scale: [1, 0.95, 1] }
    : { y: [0, -6, 0] }

  function selectPet(petId: string) {
    const p = PETS.find(x => x.id === petId)!
    const next = { ...state, petId, petName: p.name }
    saveState(next); onStateChange(next); setShowPetPicker(false)
  }

  const streakColor = state.streak >= 7 ? 'text-yellow-500'
    : state.streak >= 3 ? 'text-orange-500'
    : 'text-gray-500'

  // Check if any need is critical
  const anyCritical = [state.hunger, state.happiness ?? 70, state.energy ?? 70, state.cleanliness ?? 70].some(n => n < 20)

  return (
    <aside className="w-64 shrink-0 flex flex-col gap-3 p-4">
      {/* ── Pet card ── */}
      <div
        className={`bg-white rounded-3xl p-4 shadow-card flex flex-col items-center gap-2 cursor-pointer relative overflow-hidden ${anyCritical ? 'ring-2 ring-red-300 ring-opacity-50' : ''}`}
        onClick={() => setShowPetPicker(true)}
      >
        {/* Mood background glow */}
        <div className={`absolute inset-0 opacity-10 ${
          state.petMood === 'excited' ? 'bg-petal-400'
          : state.petMood === 'happy' ? 'bg-lavender-400'
          : state.petMood === 'hungry' ? 'bg-red-300'
          : state.petMood === 'tired' ? 'bg-gray-400'
          : 'bg-transparent'
        }`} />

        {/* Level + Stage badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <span className="text-xs bg-petal-400 text-white rounded-full px-2 py-0.5 font-black">
            Lv{state.level}
          </span>
        </div>
        <div className="absolute top-3 left-3">
          <span className="text-xs bg-lavender-100 text-lavender-600 rounded-full px-2 py-0.5 font-bold">
            {getStageLabel(stage)}
          </span>
        </div>

        {/* Pet sprite with accessories */}
        <div className="relative mt-2">
          {/* Background accessory */}
          {state.equippedBackground && (() => {
            const bg = getAccessory(state.equippedBackground!)
            return bg ? (
              <>
                <motion.span className="absolute -top-2 -left-4 text-lg opacity-30" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 3 }}>{bg.emoji}</motion.span>
                <motion.span className="absolute -bottom-1 -right-3 text-lg opacity-30" animate={{ y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 4 }}>{bg.emoji}</motion.span>
                <motion.span className="absolute top-1/2 -left-5 text-sm opacity-20" animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 3.5 }}>{bg.emoji}</motion.span>
              </>
            ) : null
          })()}

          {/* Hat accessory */}
          {state.equippedHat && (() => {
            const hat = getAccessory(state.equippedHat!)
            return hat ? (
              <motion.div
                className="absolute -top-5 left-1/2 -translate-x-1/2 text-2xl z-10"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
              >
                {hat.emoji}
              </motion.div>
            ) : null
          })()}

          {/* Legendary aura (only if no hat) */}
          {isLegendary && !state.equippedHat && (
            <motion.div
              className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {getLegendaryAura(state.petId)}
            </motion.div>
          )}

          <motion.div
            className="text-7xl select-none"
            animate={petAnimVariant}
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
          >
            {petEmoji}
          </motion.div>

          {/* Effect accessory */}
          {state.equippedEffect && (() => {
            const fx = getAccessory(state.equippedEffect!)
            return fx ? (
              <>
                <motion.span
                  className="absolute -right-3 top-0 text-base"
                  animate={{ rotate: [0, 360], opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                >{fx.emoji}</motion.span>
                <motion.span
                  className="absolute -left-3 bottom-2 text-base"
                  animate={{ rotate: [360, 0], opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                >{fx.emoji}</motion.span>
              </>
            ) : null
          })()}

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

          {/* Critical warning */}
          {state.petMood === 'hungry' && (
            <motion.div
              className="absolute -top-2 -left-2 text-sm"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            >
              ❗
            </motion.div>
          )}
        </div>

        <p className="font-black text-gray-800 text-lg leading-none relative">{state.petName}</p>
        <p className="text-xs text-gray-400 italic relative">
          {getPetPhrase(state)}
        </p>

        {/* Overall health */}
        <div className="w-full relative">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{healthInfo.emoji} Health</span>
            <span className={`font-bold ${healthInfo.color}`}>{healthInfo.label} · {overallHealth}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${overallHealth >= 60 ? 'bg-green-400' : overallHealth >= 30 ? 'bg-yellow-400' : 'bg-red-400'}`}
              animate={{ width: `${overallHealth}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>

        {/* XP bar */}
        <div className="w-full relative">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>⭐ {state.xp} XP</span>
            <span>{xpForLevel(state.level)} XP</span>
          </div>
          <div className="w-full h-2 bg-petal-100 rounded-full overflow-hidden">
            <motion.div className="h-full xp-bar rounded-full"
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          {nextStage && (
            <p className="text-xs text-gray-300 mt-0.5">
              {getStageLabel(nextStage.stage)} at Lv{nextStage.levelNeeded}
            </p>
          )}
        </div>

        {/* 4 Need bars */}
        <div className="w-full space-y-1.5 relative">
          <NeedBar label="🍔" name="Hunger" value={state.hunger} />
          <NeedBar label="💕" name="Happy" value={state.happiness ?? 70} />
          <NeedBar label="⚡" name="Energy" value={state.energy ?? 70} />
          <NeedBar label="🫧" name="Clean" value={state.cleanliness ?? 70} />
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

      {/* ── Game tokens (preview for phase 2) ── */}
      {(state.gameTokens ?? 0) > 0 && (
        <div className="bg-gradient-to-r from-petal-50 to-lavender-50 rounded-2xl p-3 border border-petal-100 text-center">
          <p className="text-xs font-bold text-gray-500 mb-0.5">🎮 Game Tokens</p>
          <p className="text-lg font-black text-petal-500">{state.gameTokens}/3</p>
          <p className="text-xs text-gray-400">earn by completing tasks</p>
        </div>
      )}

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
          restores energy ⚡
        </p>
      </button>

      {/* Tasks completed */}
      <div className="bg-gradient-to-r from-petal-50 to-lavender-50 rounded-2xl p-3 border border-petal-100">
        <p className="text-xs font-bold text-gray-500 mb-1">🗡️ Total quests</p>
        <p className="text-xl font-black text-gray-800">{state.totalTasksCompleted}</p>
        <p className="text-xs text-gray-400">completed</p>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showPetPicker && <PetPicker currentId={state.petId} level={state.level} onSelect={selectPet} onClose={() => setShowPetPicker(false)} />}
        {showCheckin && <DailyCheckin state={state} onSave={next => { saveState(next); onStateChange(next); setShowCheckin(false) }} onClose={() => setShowCheckin(false)} />}
        {showAchievements && <AchievementsPanel state={state} onClose={() => setShowAchievements(false)} />}
      </AnimatePresence>
    </aside>
  )
}

// ── Need Bar (compact) ────────────────────────────────────────────────────
function NeedBar({ label, name, value }: { label: string; name: string; value: number }) {
  const safeVal = Number.isFinite(value) ? value : 70
  const color = safeVal >= 50 ? 'bg-green-400' : safeVal >= 20 ? 'bg-orange-400' : 'bg-red-400'
  const isCritical = safeVal < 20

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs w-5 ${isCritical ? 'animate-pulse' : ''}`}>{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          animate={{ width: `${safeVal}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <span className={`text-xs w-8 text-right font-bold ${isCritical ? 'text-red-500' : 'text-gray-400'}`}>
        {Math.round(safeVal)}
      </span>
    </div>
  )
}

// ── Pet Picker ─────────────────────────────────────────────────────────────
function PetPicker({ currentId, level, onSelect, onClose }: { currentId: string; level: number; onSelect: (id: string) => void; onClose: () => void }) {
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
              <span className="text-4xl mb-1">{getPetEmoji(pet.id, level)}</span>
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
    // Check-in ONLY boosts energy — self-care = energy for your pet
    const energy = Math.min(100, (state.energy ?? 70) + score * 10)
    const next = { ...state, wellness, energy, dailyChecks: [...otherChecks, check] }
    const petMood: GameState['petMood'] = wellness >= 80 ? 'excited' : wellness >= 50 ? 'happy' : wellness >= 30 ? 'neutral' : 'tired'
    onSave({ ...next, petMood })
  }

  return (
    <motion.div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
        onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-black text-gray-800 mb-1 text-center">Daily Check-in 📋</h2>
        <p className="text-xs text-gray-400 text-center mb-4">taking care of yourself restores ⚡ energy</p>
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
