'use client'

import { useState, useEffect, useRef } from 'react'
import { loadState, GameState, PETS, xpForLevel, saveState, tickHunger } from '@/lib/gameStore'
import MobileHeader from '@/components/MobileHeader'
import QuestBoard from '@/components/QuestBoard'
import RewardStore from '@/components/RewardStore'
import PetSidebar from '@/components/PetSidebar'

type Tab = 'quests' | 'rewards' | 'pet'

export default function Home() {
  const [state, setState] = useState<GameState | null>(null)
  const [tab, setTab] = useState<Tab>('quests')
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load: server state first, fallback to localStorage
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/state')
        const serverState = await res.json()
        if (serverState) {
          const ticked = tickHunger(serverState)
          saveState(ticked)
          setState(ticked)
          return
        }
      } catch {}
      const loaded = loadState()
      const ticked = tickHunger(loaded)
      saveState(ticked)
      setState(ticked)
    }
    init()
  }, [])

  // Sync to server 1s after any state change
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

  return (
    <>
      {/* ════════════════════════════════
          DESKTOP layout (sm+)
      ════════════════════════════════ */}
      <div className="hidden sm:flex min-h-screen flex-col bg-cream">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-petal-100 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌸</span>
              <span className="font-black text-gray-800 text-lg">Bloom</span>
              <span className="text-xs text-gray-400">✦ your cozy lil' biz adventure ✦</span>
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

      {/* ════════════════════════════════
          MOBILE layout (< sm)
      ════════════════════════════════ */}
      <div className="flex sm:hidden flex-col bg-cream" style={{ height: '100dvh' }}>

        {/* Sticky compact header */}
        <div className="shrink-0">
          <MobileHeader state={state} onStateChange={setState} />
        </div>

        {/* Scrollable content — fills remaining space */}
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
              <PetDetails state={state} onStateChange={setState} pet={pet} />
            </div>
          )}
        </div>

        {/* Bottom tab bar */}
        <div className="shrink-0 bg-white border-t border-gray-100 px-2 pb-safe">
          <div className="flex">
            {([
              { id: 'quests',  label: 'Quests',  emoji: '⚔️' },
              { id: 'rewards', label: 'Rewards', emoji: '🏪' },
              { id: 'pet',     label: 'Pet',     emoji: pet.sprite },
            ] as { id: Tab; label: string; emoji: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all ${
                  tab === t.id ? 'text-petal-500' : 'text-gray-400'
                }`}
              >
                <span className="text-xl">{t.emoji}</span>
                <span className={`text-xs font-bold ${tab === t.id ? 'text-petal-500' : 'text-gray-400'}`}>
                  {t.label}
                </span>
                {tab === t.id && (
                  <div className="w-4 h-0.5 bg-petal-500 rounded-full" />
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
function PetDetails({ state, onStateChange, pet }: {
  state: GameState
  onStateChange: (s: GameState) => void
  pet: { sprite: string; name: string }
}) {
  const xpPercent = Math.round((state.xp / xpForLevel(state.level)) * 100)
  const today = new Date().toISOString().split('T')[0]
  const dailyXP = state.dailyXPDate === today ? state.dailyXP : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Big pet display */}
      <div className="bg-white rounded-3xl p-6 shadow-card flex flex-col items-center gap-3">
        <div className="text-8xl pet-float">{pet.sprite}</div>
        <p className="text-2xl font-black text-gray-800">{state.petName}</p>
        <p className="text-sm text-gray-400 italic">
          {state.petMood === 'excited' ? '~so proud of you!~'
          : state.petMood === 'happy' ? '~keep going!~'
          : state.petMood === 'hungry' ? '~I\'m so hungry... feed me!~'
          : state.petMood === 'tired' ? '~please take care of me~'
          : '~let\'s do this!~'}
        </p>

        <div className="w-full space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>⭐ XP — Level {state.level}</span>
              <span>{state.xp} / {xpForLevel(state.level)}</span>
            </div>
            <div className="w-full h-3 bg-petal-100 rounded-full overflow-hidden">
              <div className="h-full xp-bar rounded-full transition-all" style={{ width: `${xpPercent}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>💗 Wellness</span>
              <span>{state.wellness}%</span>
            </div>
            <div className="w-full h-3 bg-lavender-100 rounded-full overflow-hidden">
              <div className="h-full bg-lavender-400 rounded-full transition-all" style={{ width: `${state.wellness}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>🍱 Hunger</span>
              <span>{Math.round(state.hunger)}%</span>
            </div>
            <div className="w-full h-3 bg-orange-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${state.hunger < 20 ? 'bg-red-400' : state.hunger < 50 ? 'bg-orange-400' : 'bg-green-400'}`}
                style={{ width: `${state.hunger}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="⭐ Stars" value={String(state.stars)} sub="to redeem" />
        <StatCard label={state.streak >= 3 ? '🔥 Streak' : '📅 Streak'} value={`${state.streak} days`} sub={state.streak >= 7 ? 'full week!' : state.streak >= 3 ? 'doing great!' : 'stay consistent'} />
        <StatCard label="🎯 Daily XP" value={`${dailyXP}/${state.dailyXPGoal}`} sub="daily goal" />
        <StatCard label="🗡️ Quests" value={String(state.totalTasksCompleted)} sub="completed" />
      </div>

      {/* Achievements summary */}
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

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-card">
      <p className="text-xs font-bold text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-black text-gray-800">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  )
}
