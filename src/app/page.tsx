'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { loadState, GameState, PETS, xpForLevel, saveState, tickNeeds, getOverallHealth, getHealthLabel, getPetPhrase } from '@/lib/gameStore'
import { getPetEmoji, getStageForLevel, getStageLabel, getNextStageLevelReq } from '@/lib/petEvolution'
import MobileHeader from '@/components/MobileHeader'
import QuestBoard from '@/components/QuestBoard'
import RewardStore from '@/components/RewardStore'
import PetSidebar from '@/components/PetSidebar'

type Tab = 'quests' | 'rewards' | 'pet'

export default function Home() {
  const [state, setState] = useState<GameState | null>(null)
  const [tab, setTab] = useState<Tab>('quests')
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/state')
        const serverState = await res.json()
        if (serverState) {
          const ticked = tickNeeds({ ...loadState(), ...serverState })
          saveState(ticked)
          setState(ticked)
          return
        }
      } catch {}
      const loaded = loadState()
      const ticked = tickNeeds(loaded)
      saveState(ticked)
      setState(ticked)
    }
    init()
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
      {/* DESKTOP */}
      <div className="hidden sm:flex min-h-screen flex-col bg-cream">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-petal-100 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌸</span>
              <span className="font-black text-gray-800 text-lg">Bloom</span>
              <span className="text-xs text-gray-400">✦ your cozy lil&apos; biz adventure ✦</span>
            </div>
            <span className="text-sm font-bold text-petal-500">⭐ {state.stars} stars</span>
          </div>
        </header>
        <main className="max-w-6xl mx-auto w-full p-6 flex gap-5 items-start">
          <PetSidebar state={state} onStateChange={setState} />
          <QuestBoard state={state} onStateChange={setState} />
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
          {tab === 'rewards' && (
            <div className="p-4">
              <RewardStore state={state} onStateChange={setState} />
            </div>
          )}
          {tab === 'pet' && (
            <div className="p-4">
              <PetDetails state={state} onStateChange={setState} petEmoji={petEmoji} />
            </div>
          )}
        </div>

        {/* Bottom tab bar */}
        <div className="shrink-0 bg-white border-t border-gray-100 px-2 pb-safe">
          <div className="flex">
            {([
              { id: 'quests',  label: 'Quests',  emoji: '⚔️' },
              { id: 'rewards', label: 'Rewards', emoji: '🏪' },
              { id: 'pet',     label: 'Pet',     emoji: petEmoji },
            ] as { id: Tab; label: string; emoji: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all relative ${
                  tab === t.id ? 'text-petal-500' : 'text-gray-400'
                }`}
              >
                <span className="text-xl">{t.emoji}</span>
                <span className={`text-xs font-bold ${tab === t.id ? 'text-petal-500' : 'text-gray-400'}`}>
                  {t.label}
                </span>
                {tab === t.id && <div className="w-4 h-0.5 bg-petal-500 rounded-full" />}
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
function PetDetails({ state, onStateChange, petEmoji }: {
  state: GameState
  onStateChange: (s: GameState) => void
  petEmoji: string
}) {
  const xpPercent = Math.round((state.xp / xpForLevel(state.level)) * 100)
  const today = new Date().toISOString().split('T')[0]
  const dailyXP = state.dailyXPDate === today ? state.dailyXP : 0
  const stage = getStageForLevel(state.level)
  const nextStage = getNextStageLevelReq(state.level)
  const overallHealth = getOverallHealth(state)
  const healthInfo = getHealthLabel(overallHealth)

  return (
    <div className="flex flex-col gap-4">
      {/* Big pet display */}
      <div className="bg-white rounded-3xl p-6 shadow-card flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-lavender-100 text-lavender-600 rounded-full px-2 py-0.5 font-bold">
            {getStageLabel(stage)}
          </span>
          <span className="text-xs bg-petal-400 text-white rounded-full px-2 py-0.5 font-black">
            Lv{state.level}
          </span>
        </div>
        <div className="text-8xl pet-float">{petEmoji}</div>
        <p className="text-2xl font-black text-gray-800">{state.petName}</p>
        <p className="text-sm text-gray-400 italic">{getPetPhrase(state)}</p>

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
          <MobileNeedBar label="💕 Happiness" value={state.happiness ?? 70} hint="complete tasks" />
          <MobileNeedBar label="⚡ Energy" value={state.energy ?? 70} hint="complete tasks" />
          <MobileNeedBar label="🫧 Cleanliness" value={state.cleanliness ?? 70} hint="do check-in" />
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
    <div className="bg-white rounded-2xl p-4 shadow-card">
      <p className="text-xs font-bold text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-black text-gray-800">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  )
}
