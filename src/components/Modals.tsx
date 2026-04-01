'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PETS, GameState, ALL_ACHIEVEMENTS, saveState } from '@/lib/gameStore'

// ── Pet Picker ─────────────────────────────────────────────────────────────
export function PetPickerModal({ currentId, onSelect, onClose }: {
  currentId: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  return (
    <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
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

// ── Daily Check-in ─────────────────────────────────────────────────────────
export function DailyCheckinModal({ state, onSave, onClose }: {
  state: GameState
  onSave: (s: GameState) => void
  onClose: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const existing = state.dailyChecks.find(c => c.date === today)
  const [checks, setChecks] = useState({
    slept: existing?.slept ?? false,
    exercised: existing?.exercised ?? false,
    water: existing?.water ?? false,
    noPhone: existing?.noPhone ?? false,
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
    <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
        <h2 className="text-xl font-black text-gray-800 mb-1 text-center">Daily Check-in 📋</h2>
        <p className="text-xs text-gray-400 text-center mb-4">keep your pet happy ✨</p>
        <div className="flex flex-col gap-3 mb-5">
          {items.map(({ key, label, emoji }) => (
            <button key={key}
              onClick={() => setChecks(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                checks[key as keyof typeof checks] ? 'border-petal-400 bg-petal-50' : 'border-gray-100'
              }`}>
              <span className="text-2xl">{emoji}</span>
              <span className="font-semibold text-gray-700">{label}</span>
              {checks[key as keyof typeof checks] && <span className="ml-auto text-petal-500 font-bold text-lg">✓</span>}
            </button>
          ))}
        </div>
        <button onClick={save} className="w-full bg-petal-500 text-white font-black rounded-2xl py-4 text-base hover:bg-petal-600 transition-colors">
          Save check-in ✨
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Achievements ───────────────────────────────────────────────────────────
export function AchievementsModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  const unlocked = state.achievements.filter(a => a.unlockedAt)
  const locked = state.achievements.filter(a => !a.unlockedAt)

  return (
    <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl max-h-[85vh] overflow-y-auto"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
        <h2 className="text-xl font-black text-gray-800 mb-1 text-center">🏆 Achievements</h2>
        <p className="text-xs text-gray-400 text-center mb-4">{unlocked.length} of {ALL_ACHIEVEMENTS.length} unlocked</p>

        {unlocked.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Unlocked ✨</p>
            <div className="flex flex-col gap-2">
              {unlocked.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-petal-50 rounded-2xl border border-petal-100">
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

        <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Locked 🔒</p>
        <div className="flex flex-col gap-2">
          {locked.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl opacity-60">
              <span className="text-2xl grayscale">{a.emoji}</span>
              <div>
                <p className="font-bold text-sm text-gray-600">{a.title}</p>
                <p className="text-xs text-gray-400">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
