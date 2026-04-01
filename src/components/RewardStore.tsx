'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameState, Reward, spendStars, saveState, boostHappiness } from '@/lib/gameStore'

type Props = {
  state: GameState
  onStateChange: (s: GameState) => void
}

export default function RewardStore({ state, onStateChange }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [newReward, setNewReward] = useState({ title: '', cost: 30, emoji: '🎁' })
  const [celebrating, setCelebrating] = useState<string | null>(null)

  function redeem(reward: Reward) {
    if (state.stars < reward.cost) return
    setCelebrating(reward.id)
    // Redeeming rewards boosts happiness — treating yourself = happy pet 💕
    const spent = spendStars(state, reward.cost)
    const happier = boostHappiness(spent, 20)
    const next: GameState = {
      ...happier,
      rewards: state.rewards.map(r =>
        r.id === reward.id ? { ...r, redeemed: true } : r
      ),
    }
    saveState(next)
    onStateChange(next)
    setTimeout(() => setCelebrating(null), 1500)
  }

  function deleteReward(id: string) {
    const next = { ...state, rewards: state.rewards.filter(r => r.id !== id) }
    saveState(next)
    onStateChange(next)
  }

  function addReward() {
    if (!newReward.title.trim()) return
    const reward: Reward = {
      id: Date.now().toString(),
      title: newReward.title,
      cost: newReward.cost,
      emoji: newReward.emoji,
      redeemed: false,
    }
    const next = { ...state, rewards: [...state.rewards, reward] }
    saveState(next)
    onStateChange(next)
    setNewReward({ title: '', cost: 30, emoji: '🎁' })
    setShowAdd(false)
  }

  function resetReward(id: string) {
    const next = {
      ...state,
      rewards: state.rewards.map(r => r.id === id ? { ...r, redeemed: false } : r),
    }
    saveState(next)
    onStateChange(next)
  }

  const available = state.rewards.filter(r => !r.redeemed)
  const redeemed = state.rewards.filter(r => r.redeemed)

  const EMOJI_OPTIONS = ['🎁', '☕', '🍵', '🎮', '🎨', '🛍️', '🍕', '🎬', '💅', '🌸', '✈️', '👗', '📚', '🍦', '💆‍♀️']

  return (
    <div className="w-full sm:w-72 shrink-0 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-800">🏪 Reward Store</h2>
          <p className="text-xs text-gray-400">spend your stars wisely ✨</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-petal-500 text-white rounded-xl px-3 py-1.5 text-xs font-bold hover:bg-petal-600 transition-colors"
        >
          + Add
        </button>
      </div>

      {/* Stars balance */}
      <div className="bg-gradient-to-r from-petal-500 to-lavender-500 rounded-2xl p-4 text-white text-center">
        <p className="text-xs opacity-80">your balance</p>
        <p className="text-3xl font-black">⭐ {state.stars}</p>
      </div>

      {/* Available rewards */}
      <div className="flex flex-col gap-2">
        {available.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">no rewards yet — add some! 🎁</p>
        )}
        <AnimatePresence>
          {available.map(reward => (
            <motion.div
              key={reward.id}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl p-3 shadow-card relative overflow-hidden"
            >
              {celebrating === reward.id && (
                <motion.div
                  className="absolute inset-0 bg-petal-100 flex items-center justify-center z-10"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                >
                  <span className="text-3xl animate-bounce">🎉</span>
                </motion.div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-2xl">{reward.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm leading-tight truncate">
                    {reward.title}
                  </p>
                  <p className="text-xs text-petal-500 font-bold">⭐ {reward.cost} stars</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => redeem(reward)}
                    disabled={state.stars < reward.cost}
                    className={`px-2 py-1 rounded-xl text-xs font-bold transition-all ${
                      state.stars >= reward.cost
                        ? 'bg-petal-500 text-white hover:bg-petal-600'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {state.stars >= reward.cost ? '✨ Get' : '🔒'}
                  </button>
                  <button
                    onClick={() => deleteReward(reward.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Progress to unlock */}
              {state.stars < reward.cost && (
                <div className="mt-2">
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-petal-300 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (state.stars / reward.cost) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {reward.cost - state.stars} stars to go!
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Redeemed */}
      {redeemed.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 mb-2">already redeemed 🎀</p>
          {redeemed.map(r => (
            <div key={r.id} className="flex items-center gap-2 p-2 opacity-50">
              <span className="text-lg">{r.emoji}</span>
              <span className="text-xs text-gray-500 line-through flex-1">{r.title}</span>
              <button
                onClick={() => resetReward(r.id)}
                className="text-xs text-gray-400 hover:text-petal-400"
              >
                ↺
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add reward modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-black text-gray-800 mb-4 text-center">
                Add a reward 🎁
              </h3>

              {/* Emoji picker */}
              <div className="flex flex-wrap gap-2 mb-4">
                {EMOJI_OPTIONS.map(e => (
                  <button
                    key={e}
                    onClick={() => setNewReward(prev => ({ ...prev, emoji: e }))}
                    className={`text-2xl p-1.5 rounded-xl transition-all ${
                      newReward.emoji === e ? 'bg-petal-100 ring-2 ring-petal-400' : 'hover:bg-gray-50'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Reward name..."
                value={newReward.title}
                onChange={e => setNewReward(prev => ({ ...prev, title: e.target.value }))}
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-petal-300 mb-3"
              />

              <div className="flex items-center gap-3 mb-5">
                <label className="text-sm font-bold text-gray-600">⭐ Cost:</label>
                <input
                  type="range"
                  min={5} max={200} step={5}
                  value={newReward.cost}
                  onChange={e => setNewReward(prev => ({ ...prev, cost: Number(e.target.value) }))}
                  className="flex-1 accent-pink-500"
                />
                <span className="text-sm font-black text-petal-500 w-10 text-right">
                  {newReward.cost}
                </span>
              </div>

              <button
                onClick={addReward}
                className="w-full bg-petal-500 text-white font-black rounded-2xl py-3 hover:bg-petal-600 transition-colors"
              >
                Add reward ✨
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
