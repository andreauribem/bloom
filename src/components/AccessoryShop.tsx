'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameState, saveState, buyAccessory, equipAccessory, spendStars } from '@/lib/gameStore'
import { ACCESSORIES, Accessory, AccessoryCategory, canBuyAccessory, getAccessoriesByCategory } from '@/lib/accessories'
import { hapticMedium, hapticSuccess, soundCoin, soundClick } from '@/lib/feedback'

type Props = {
  state: GameState
  onStateChange: (s: GameState) => void
}

export default function AccessoryShop({ state, onStateChange }: Props) {
  const [tab, setTab] = useState<AccessoryCategory>('hat')
  const [celebrating, setCelebrating] = useState<string | null>(null)

  const owned = state.ownedAccessories ?? []
  const items = getAccessoriesByCategory(tab)

  function buy(acc: Accessory) {
    const { canBuy } = canBuyAccessory(acc, state.stars, state.level, owned)
    if (!canBuy) return
    hapticSuccess()
    soundCoin()
    setCelebrating(acc.id)
    const next = buyAccessory(state, acc.id, acc.cost)
    saveState(next)
    onStateChange(next)
    setTimeout(() => setCelebrating(null), 1200)
  }

  function equip(acc: Accessory) {
    soundClick()
    hapticMedium()
    const slot = acc.category === 'hat' ? 'equippedHat' as const
      : acc.category === 'background' ? 'equippedBackground' as const
      : 'equippedEffect' as const
    const isEquipped = state[slot] === acc.id
    const next = equipAccessory(state, slot, isEquipped ? null : acc.id)
    saveState(next)
    onStateChange(next)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-black text-gray-800 text-sm">👗 Accessories</h3>
          <p className="text-xs text-gray-400">dress up your pet</p>
        </div>
        <span className="text-xs text-gray-400">{owned.length}/{ACCESSORIES.length} owned</span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-3">
        {([
          { id: 'hat' as const, label: '🎩 Hats' },
          { id: 'background' as const, label: '🎨 Bg' },
          { id: 'effect' as const, label: '✨ Effects' },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 px-2 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tab === t.id ? 'bg-lavender-400 text-white' : 'bg-gray-50 text-gray-500'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 gap-2">
        {items.map(acc => {
          const isOwned = owned.includes(acc.id)
          const slot = acc.category === 'hat' ? 'equippedHat' as const
            : acc.category === 'background' ? 'equippedBackground' as const
            : 'equippedEffect' as const
          const isEquipped = state[slot] === acc.id
          const { canBuy, reason } = canBuyAccessory(acc, state.stars, state.level, owned)

          return (
            <motion.div
              key={acc.id}
              layout
              className={`relative rounded-2xl p-3 text-center border-2 transition-all ${
                isEquipped ? 'border-petal-400 bg-petal-50'
                : isOwned ? 'border-lavender-200 bg-lavender-50'
                : canBuy ? 'border-gray-100 bg-white'
                : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
            >
              {celebrating === acc.id && (
                <motion.div
                  className="absolute inset-0 bg-petal-100 rounded-2xl flex items-center justify-center z-10"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                >
                  <span className="text-2xl animate-bounce">🎉</span>
                </motion.div>
              )}

              <span className="text-3xl">{acc.emoji}</span>
              <p className="text-xs font-bold text-gray-700 mt-1">{acc.name}</p>

              {isOwned ? (
                <button
                  onClick={() => equip(acc)}
                  className={`mt-2 w-full text-xs font-bold rounded-xl py-1.5 transition-all ${
                    isEquipped
                      ? 'bg-petal-500 text-white'
                      : 'bg-lavender-100 text-lavender-600 hover:bg-lavender-200'
                  }`}
                >
                  {isEquipped ? '✓ Equipped' : 'Equip'}
                </button>
              ) : canBuy ? (
                <button
                  onClick={() => buy(acc)}
                  className="mt-2 w-full text-xs font-bold rounded-xl py-1.5 bg-petal-500 text-white hover:bg-petal-600 transition-all"
                >
                  ⭐ {acc.cost}
                </button>
              ) : (
                <p className="mt-2 text-xs text-gray-400">{reason}</p>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
