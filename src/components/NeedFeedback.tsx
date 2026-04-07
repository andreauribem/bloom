'use client'

import { motion } from 'framer-motion'

export type NeedType = 'hunger' | 'happiness' | 'energy' | 'cleanliness'

export type NeedFeedbackItem = {
  id: string
  type: NeedType
  amount: number
  x: number
  y: number
}

const NEED_EMOJIS: Record<NeedType, string[]> = {
  hunger: ['🍔', '🍕', '🌮', '🍜', '🍣'],
  happiness: ['💕', '💖', '✨', '🎀', '💗'],
  energy: ['⚡', '🔋', '💡', '🌟', '✨'],
  cleanliness: ['🫧', '🧼', '✨', '💎', '🌊'],
}

const NEED_COLORS: Record<NeedType, string> = {
  hunger: 'text-orange-500',
  happiness: 'text-pink-500',
  energy: 'text-yellow-500',
  cleanliness: 'text-blue-400',
}

const NEED_LABELS: Record<NeedType, string> = {
  hunger: '🍔 Hunger',
  happiness: '💕 Happiness',
  energy: '⚡ Energy',
  cleanliness: '🫧 Clean',
}

export function NeedFeedback({ item }: { item: NeedFeedbackItem }) {
  const emojis = NEED_EMOJIS[item.type]
  const color = NEED_COLORS[item.type]

  return (
    <>
      {/* Floating emojis */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={`${item.id}-e-${i}`}
          className="fixed z-[75] pointer-events-none text-xl select-none"
          style={{ left: item.x, top: item.y }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
          animate={{
            x: (Math.random() - 0.5) * 100,
            y: -60 - Math.random() * 80,
            opacity: [1, 1, 0],
            scale: [0.5, 1.3, 0.8],
          }}
          transition={{ duration: 1.1, delay: i * 0.06, ease: 'easeOut' }}
        >
          {emojis[i % emojis.length]}
        </motion.div>
      ))}

      {/* "+N" indicator */}
      <motion.div
        className={`fixed z-[76] pointer-events-none select-none font-black text-lg ${color}`}
        style={{ left: item.x + 10, top: item.y - 10 }}
        initial={{ y: 0, opacity: 1, scale: 0.8 }}
        animate={{ y: -50, opacity: [1, 1, 0], scale: [0.8, 1.2, 1] }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        +{item.amount}
      </motion.div>

      {/* Need label */}
      <motion.div
        className="fixed z-[76] pointer-events-none select-none text-xs font-bold text-gray-500"
        style={{ left: item.x - 15, top: item.y + 15 }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.8] }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      >
        {NEED_LABELS[item.type]}
      </motion.div>
    </>
  )
}
