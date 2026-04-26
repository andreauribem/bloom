'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { loadState, GameState, PETS, xpForLevel, saveState, tickNeeds, getOverallHealth, getHealthLabel, getPetPhrase, getHealthPenalties, checkDeathTimer, updateDeathTimestamp, getDefaultHabits, migrateToFoxy } from '@/lib/gameStore'
import { soundSadMusic, soundDeath } from '@/lib/feedback'
import { getPetEmoji, getStageForLevel, getStageLabel, getNextStageLevelReq, isFoxy, getFoxyImage, getFoxyMood, getLegendaryAura } from '@/lib/petEvolution'
import { getAccessory } from '@/lib/accessories'
import MobileHeader from '@/components/MobileHeader'
import QuestBoard from '@/components/QuestBoard'
import RewardStore from '@/components/RewardStore'
import PetSidebar from '@/components/PetSidebar'
import ContentGoals from '@/components/ContentGoals'

type Tab = 'quests' | 'goals' | 'rewards' | 'pet'

export default function Home() {
  const [state, setState] = useState<GameState | null>(null)
  const [tab, setTab] = useState<Tab>('quests')
  const [healthAlert, setHealthAlert] = useState<string | null>(null)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function init() {
      // Check for ?reset=1 in URL — full fresh start
      const params = new URLSearchParams(window.location.search)
      const isReset = params.get('reset') === '1'
      if (isReset) {
        // Clear everything — current and legacy keys
        localStorage.removeItem('bloom_state_v4')
        localStorage.removeItem('bloom_state_v3')
        localStorage.removeItem('bloom_state_v2')
        localStorage.removeItem('bloom_state_v1')
        localStorage.removeItem('questapp_state_v2')
        localStorage.removeItem('questapp_state')
        await fetch('/api/state', { method: 'DELETE' }).catch(() => {})
        // Remove ?reset from URL without reload
        window.history.replaceState({}, '', window.location.pathname)
      }

      let base: GameState
      if (isReset) {
        base = loadState()
      } else {
        try {
          const res = await fetch('/api/state')
          const serverState = await res.json()
          base = serverState ? { ...loadState(), ...serverState } : loadState()
        } catch {
          base = loadState()
        }
      }

      // Auto-create default habits for new/migrated users
      if (!base.habits || base.habits.length === 0) {
        base = { ...base, habits: getDefaultHabits() }
      }

      base = migrateToFoxy(base)

      let ticked = tickNeeds(base)
      ticked = updateDeathTimestamp(ticked)
      ticked = checkDeathTimer(ticked)

      // Health alerts on load
      const health = getOverallHealth(ticked)
      const penalties = getHealthPenalties(health)
      if (penalties.petFainted) {
        soundDeath()
        setHealthAlert('Your pet has FAINTED! Complete tasks to revive before the countdown ends!')
      } else if (penalties.petSick) {
        soundSadMusic()
        setHealthAlert('Your pet is very sick... Stars reduced by 50%. Take action now!')
      } else if (penalties.starsReduced25) {
        setHealthAlert('Your pet is struggling. Stars reduced by 25%.')
      }

      if (healthAlert) setTimeout(() => setHealthAlert(null), 5000)

      saveState(ticked)
      setState(ticked)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!state) return
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state),
      }).catch(() => {})
    }, 1000)
  }, [state])

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="text-6xl mb-4 pet-float">✨</div>
          <p className="text-gray-400 font-bold">Loading your adventure...</p>
        </div>
      </div>
    )
  }

  const pet = PETS.find(p => p.id === state.petId) ?? PETS[0]
  const petEmoji = getPetEmoji(state.petId, state.level)

  // Check if any need is critical for notification dot
  const anyCritical = [state.hunger, state.happiness ?? 70, state.energy ?? 70, state.cleanliness ?? 70].some(n => n < 30)

  return (
    <>
      {/* Health alert toast — positioned below mobile header */}
      {healthAlert && (
        <motion.div
          className="fixed top-16 sm:top-4 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-[100]"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
        >
          <div className="bg-red-600 text-white rounded-2xl px-4 py-3 shadow-2xl text-center">
            <p className="font-black text-xs sm:text-sm">⚠️ {healthAlert}</p>
          </div>
        </motion.div>
      )}

      {/* DESKTOP */}
      <div className="hidden sm:flex min-h-screen flex-col bg-cream">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-petal-100 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌸</span>
              <span className="font-black text-gray-800 text-lg">Bloom</span>
              <span className="pixel-text text-[7px] text-petal-300 hidden md:inline">~ your cozy lil adventure ~</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="pixel-text text-[8px] text-petal-400">LV{state.level}</span>
              <span className="pixel-text text-[9px] text-petal-500">
                {state.stars}<span className="text-yellow-400 ml-0.5">*</span>
              </span>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto w-full p-6 flex gap-5 items-start">
          <PetSidebar state={state} onStateChange={setState} />
          <div className="flex-1 flex flex-col gap-5 min-w-0">
            <QuestBoard state={state} onStateChange={setState} />
            <ContentGoals state={state} onStateChange={setState} />
          </div>
          <RewardStore state={state} onStateChange={setState} />
        </main>
      </div>

      {/* MOBILE */}
      <div className="flex sm:hidden flex-col bg-cream" style={{ height: '100dvh' }}>
        <div className="shrink-0">
          <MobileHeader state={state} onStateChange={setState} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'quests' && (
            <div className="p-4">
              <QuestBoard state={state} onStateChange={setState} />
            </div>
          )}
          {tab === 'goals' && (
            <div className="p-4">
              <ContentGoals state={state} onStateChange={setState} />
            </div>
          )}
          {tab === 'rewards' && (
            <div className="p-4">
              <RewardStore state={state} onStateChange={setState} />
            </div>
          )}
          {tab === 'pet' && (
            <div className="p-4">
              <PetDetails state={state} onStateChange={setState} />
            </div>
          )}
        </div>

        {/* Bottom tab bar */}
        <div className="shrink-0 bg-white border-t border-gray-100 px-2 pb-safe">
          <div className="flex">
            {([
              { id: 'quests',  label: 'Quests',  emoji: '⚔️' },
              { id: 'goals',   label: 'Goals',   emoji: '📊' },
              { id: 'rewards', label: 'Rewards', emoji: '🏪' },
              { id: 'pet',     label: 'Pet',     emoji: isFoxy(state.petId) ? '__foxy__' : petEmoji },
            ] as { id: Tab; label: string; emoji: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all relative ${
                  tab === t.id ? 'text-petal-500' : 'text-gray-400'
                }`}
              >
                {t.emoji === '__foxy__' ? (
                  <img
                    src={getFoxyImage(state.level, 'happy', state.stars)}
                    alt="Foxy"
                    className="w-6 h-6 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                    draggable={false}
                  />
                ) : (
                  <span className="text-xl">{t.emoji}</span>
                )}
                <span className={`pixel-text text-[6px] leading-tight ${tab === t.id ? 'text-petal-500' : 'text-gray-400'}`}>
                  {t.label}
                </span>
                {tab === t.id && <div className="w-6 h-1 bg-petal-400 mt-0.5" style={{ imageRendering: 'pixelated' }} />}
                {/* Notification dot for pet tab */}
                {t.id === 'pet' && anyCritical && tab !== 'pet' && (
                  <span className="absolute top-2 right-1/4 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Pet tab content (mobile) ───────────────────────────────────────────────
function PetDetails({ state, onStateChange }: {
  state: GameState
  onStateChange: (s: GameState) => void
}) {
  const petEmoji = getPetEmoji(state.petId, state.level)
  const xpPercent = Math.round((state.xp / xpForLevel(state.level)) * 100)
  const today = new Date().toISOString().split('T')[0]
  const dailyXP = state.dailyXPDate === today ? state.dailyXP : 0
  const stage = getStageForLevel(state.level)
  const nextStage = getNextStageLevelReq(state.level)
  const overallHealth = getOverallHealth(state)
  const healthInfo = getHealthLabel(overallHealth)
  const penalties = getHealthPenalties(overallHealth)

  return (
    <div className="flex flex-col gap-4">
      {/* Big pet display */}
      <div className="bg-white rounded-3xl p-6 shadow-card flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="pixel-text text-[7px] bg-lavender-100 text-lavender-500 rounded-md px-2 py-1">
            {getStageLabel(stage)}
          </span>
          <span className="pixel-text text-[8px] bg-petal-400 text-white rounded-md px-2 py-1">
            LV{state.level}
          </span>
        </div>
        {/* Pet sprite with accessories */}
        <div className="relative flex items-center justify-center pt-6">
          {/* Background accessory */}
          {state.equippedBackground && (() => {
            const bg = getAccessory(state.equippedBackground!)
            return bg ? (
              <>
                <motion.span className="absolute -top-4 -left-8 text-3xl opacity-40" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3 }}>{bg.emoji}</motion.span>
                <motion.span className="absolute -bottom-2 -right-6 text-3xl opacity-40" animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 4 }}>{bg.emoji}</motion.span>
                <motion.span className="absolute top-1/3 -left-10 text-2xl opacity-30" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 3.5 }}>{bg.emoji}</motion.span>
              </>
            ) : null
          })()}

          {/* Hat accessory */}
          {state.equippedHat && (() => {
            const hat = getAccessory(state.equippedHat!)
            return hat ? (
              <motion.div
                className="absolute top-0 left-1/2 -translate-x-1/2 text-4xl z-10"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
              >
                {hat.emoji}
              </motion.div>
            ) : null
          })()}

          {/* Legendary aura (only if no hat) */}
          {stage === 'legendary' && !state.equippedHat && (
            <motion.div
              className="absolute top-0 left-1/2 -translate-x-1/2 text-4xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {getLegendaryAura(state.petId)}
            </motion.div>
          )}

          {isFoxy(state.petId) ? (
            <img
              src={getFoxyImage(
                state.level,
                getFoxyMood(state.petMood, penalties.petFainted, penalties.petSick),
                state.stars,
              )}
              alt={state.petName}
              className="w-40 h-40 object-contain pet-float"
              style={{ imageRendering: 'pixelated' }}
              draggable={false}
            />
          ) : (
            <div className="text-8xl pet-float">{petEmoji}</div>
          )}

          {/* Effect accessory */}
          {state.equippedEffect && (() => {
            const fx = getAccessory(state.equippedEffect!)
            return fx ? (
              <>
                <motion.span
                  className="absolute -right-4 top-2 text-2xl"
                  animate={{ rotate: [0, 360], opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                >{fx.emoji}</motion.span>
                <motion.span
                  className="absolute -left-4 bottom-4 text-2xl"
                  animate={{ rotate: [360, 0], opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                >{fx.emoji}</motion.span>
              </>
            ) : null
          })()}
        </div>
        <p className="text-2xl font-black text-gray-800">{state.petName}</p>
        <p className="text-xs text-gray-400 italic">{getPetPhrase(state)}</p>

        {/* Overall health */}
        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{healthInfo.emoji} Overall Health</span>
            <span className={`font-bold ${healthInfo.color}`}>{healthInfo.label} · {overallHealth}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${overallHealth >= 60 ? 'bg-green-400' : overallHealth >= 30 ? 'bg-yellow-400' : 'bg-red-400'}`}
              animate={{ width: `${overallHealth}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>

        {/* 4 Need bars */}
        <div className="w-full space-y-2">
          <MobileNeedBar label="🍔 Hunger" value={state.hunger} hint="complete tasks" />
          <MobileNeedBar label="💕 Happiness" value={state.happiness ?? 70} hint="redeem a reward" />
          <MobileNeedBar label="⚡ Energy" value={state.energy ?? 70} hint="do daily check-in" />
          <MobileNeedBar label="🫧 Cleanliness" value={state.cleanliness ?? 70} hint="keep your streak" />
        </div>

        {/* XP bar */}
        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>⭐ XP — Level {state.level}</span>
            <span>{state.xp} / {xpForLevel(state.level)}</span>
          </div>
          <div className="w-full h-3 bg-petal-100 rounded-full overflow-hidden">
            <div className="h-full xp-bar rounded-full transition-all" style={{ width: `${xpPercent}%` }} />
          </div>
          {nextStage && (
            <p className="text-xs text-gray-400 mt-1">
              Next evolution: {getStageLabel(nextStage.stage)} at Lv{nextStage.levelNeeded}
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="⭐ Stars" value={String(state.stars)} sub="to redeem" />
        <StatCard label={state.streak >= 3 ? '🔥 Streak' : '📅 Streak'} value={`${state.streak} days`} sub={state.streak >= 7 ? 'full week!' : state.streak >= 3 ? 'doing great!' : 'stay consistent'} />
        <StatCard label="🎯 Daily XP" value={`${dailyXP}/${state.dailyXPGoal}`} sub="daily goal" />
        <StatCard label="🗡️ Quests" value={String(state.totalTasksCompleted)} sub="completed" />
        {(state.gameTokens ?? 0) > 0 && (
          <StatCard label="🎮 Tokens" value={`${state.gameTokens}/3`} sub="for mini-games" />
        )}
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-3xl p-4 shadow-card">
        <p className="font-black text-gray-800 mb-3">🏆 Achievements</p>
        <div className="flex flex-wrap gap-2">
          {state.achievements.map(a => (
            <div key={a.id} title={a.title}
              className={`text-2xl transition-all ${a.unlockedAt ? '' : 'grayscale opacity-30'}`}>
              {a.emoji}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {state.achievements.filter(a => a.unlockedAt).length} of {state.achievements.length} unlocked
        </p>
      </div>
    </div>
  )
}

function MobileNeedBar({ label, value, hint }: { label: string; value: number; hint: string }) {
  const safeVal = Number.isFinite(value) ? value : 70
  const color = safeVal >= 50 ? 'bg-green-400' : safeVal >= 20 ? 'bg-orange-400' : 'bg-red-400'
  const isCritical = safeVal < 20

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span className={isCritical ? 'text-red-500 font-bold' : ''}>{label}</span>
        <span className={isCritical ? 'text-red-500 font-bold' : ''}>{Math.round(safeVal)}%</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div className={`h-full rounded-full ${color}`} animate={{ width: `${safeVal}%` }} transition={{ duration: 0.6 }} />
      </div>
      {isCritical && <p className="text-xs text-red-400 font-bold mt-0.5">Low! {hint} to restore</p>}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-card cozy-card">
      <p className="text-xs font-bold text-gray-500 mb-1">{label}</p>
      <p className="pixel-text text-sm text-gray-800 leading-relaxed">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}
