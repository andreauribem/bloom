'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameState, saveState, boostHappiness } from '@/lib/gameStore'

type Objective = {
  id: string
  platform: string
  period: string
  target: number
  actual: number
  progress: number
  remaining: number
  periodStart: string
  periodEnd: string
  profile?: { id: string; name: string }
}

type Props = {
  state: GameState
  onStateChange: (s: GameState) => void
}

const PLATFORM_EMOJI: Record<string, string> = {
  tiktok: '🎵', instagram: '📸', youtube: '🎬', linkedin: '💼',
  substack: '✍️', podcast: '🎙️', pinterest: '📌', twitter: '🐦',
}

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'from-pink-500 to-purple-500',
  instagram: 'from-orange-400 to-pink-500',
  youtube: 'from-red-500 to-red-600',
  linkedin: 'from-blue-600 to-blue-700',
  substack: 'from-orange-500 to-orange-600',
  podcast: 'from-purple-500 to-indigo-600',
  pinterest: 'from-red-400 to-red-500',
  twitter: 'from-blue-400 to-blue-500',
}

export default function ContentGoals({ state, onStateChange }: Props) {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)
  const [celebrated, setCelebrated] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetch_objectives() {
      try {
        const res = await fetch('/api/content/objectives')
        const data = await res.json()
        if (Array.isArray(data)) {
          setObjectives(data)

          // Content goals affect happiness: behind on goals = happiness drops
          if (data.length > 0) {
            const avgProgress = data.reduce((s: number, o: Objective) => s + o.progress, 0) / data.length
            // If overall progress is > 70%, boost happiness a bit
            if (avgProgress >= 70 && state.happiness < 80) {
              const happier = boostHappiness(state, 5)
              saveState(happier)
              onStateChange(happier)
            }
          }
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetch_objectives()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reward when objective is completed (100%)
  function claimReward(obj: Objective) {
    if (celebrated.has(obj.id)) return
    setCelebrated(prev => new Set(prev).add(obj.id))

    // Boost happiness + bonus stars
    const bonusStars = obj.target * 2
    const happier = boostHappiness(state, 25)
    const next = { ...happier, stars: happier.stars + bonusStars }
    saveState(next)
    onStateChange(next)
  }

  const completed = objectives.filter(o => o.progress >= 100)
  const inProgress = objectives.filter(o => o.progress < 100)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-black text-gray-800">📊 Content Goals</h2>
        <p className="text-xs text-gray-400">track your publishing inputs</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl p-4 shadow-card animate-pulse h-20" />)}
        </div>
      ) : objectives.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 shadow-card text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-black text-gray-700 mb-2">No objectives yet</h3>
          <p className="text-sm text-gray-400 mb-4">
            Set publishing goals in Content OS to track your inputs here
          </p>
          <a
            href="https://content-os-app-production.up.railway.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-petal-500 text-white font-bold rounded-2xl px-5 py-2.5 text-sm hover:bg-petal-600 transition-colors"
          >
            Open Content OS →
          </a>
        </div>
      ) : (
        <>
          {/* In progress objectives */}
          <div className="flex flex-col gap-3">
            {inProgress.map(obj => (
              <ObjectiveCard key={obj.id} objective={obj} />
            ))}
          </div>

          {/* Completed objectives */}
          {completed.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Completed 🎉</p>
              <div className="flex flex-col gap-2">
                {completed.map(obj => (
                  <motion.div
                    key={obj.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{PLATFORM_EMOJI[obj.platform] ?? '📱'}</span>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 text-sm capitalize">{obj.platform}</p>
                        <p className="text-xs text-green-600 font-bold">{obj.actual}/{obj.target} — Goal reached!</p>
                      </div>
                      {!celebrated.has(obj.id) ? (
                        <button
                          onClick={() => claimReward(obj)}
                          className="bg-green-500 text-white rounded-xl px-3 py-1.5 text-xs font-bold hover:bg-green-600 transition-colors animate-pulse"
                        >
                          Claim +{obj.target * 2}⭐
                        </button>
                      ) : (
                        <span className="text-green-500 font-bold text-sm">✓ Claimed</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-gradient-to-r from-petal-50 to-lavender-50 rounded-2xl p-4 border border-petal-100">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-gray-500">Overall progress</p>
                <p className="text-2xl font-black text-gray-800">
                  {Math.round(objectives.reduce((sum, o) => sum + o.progress, 0) / objectives.length)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{completed.length}/{objectives.length} goals met</p>
                <p className="text-xs text-gray-400">{objectives.reduce((s, o) => s + o.remaining, 0)} pieces to go</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ObjectiveCard({ objective }: { objective: Objective }) {
  const emoji = PLATFORM_EMOJI[objective.platform] ?? '📱'
  const gradientClass = PLATFORM_COLORS[objective.platform] ?? 'from-gray-400 to-gray-500'
  const progressClamped = Math.min(100, objective.progress)

  // Calculate days remaining in period
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(objective.periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ))

  // Pace check: are we on track?
  const totalDays = Math.max(1, Math.ceil(
    (new Date(objective.periodEnd).getTime() - new Date(objective.periodStart).getTime()) / (1000 * 60 * 60 * 24)
  ))
  const daysElapsed = totalDays - daysLeft
  const expectedProgress = Math.round((daysElapsed / totalDays) * 100)
  const onTrack = objective.progress >= expectedProgress - 10

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 shadow-card"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center text-lg`}>
          {emoji}
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-800 text-sm capitalize">{objective.platform}</p>
          <p className="text-xs text-gray-400">
            {objective.profile?.name ?? ''} · {daysLeft}d left
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-gray-800">{objective.actual}<span className="text-gray-400 text-sm">/{objective.target}</span></p>
          <p className={`text-xs font-bold ${onTrack ? 'text-green-500' : 'text-orange-500'}`}>
            {onTrack ? '✅ on track' : '⚠️ behind'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradientClass}`}
          animate={{ width: `${progressClamped}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">{progressClamped}%</span>
        <span className="text-xs text-gray-400">{objective.remaining} to go</span>
      </div>
    </motion.div>
  )
}
