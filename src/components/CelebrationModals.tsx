'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Achievement } from '@/lib/gameStore'

// ── Level Up Modal ─────────────────────────────────────────────────────────
export function LevelUpModal({ level, onClose }: { level: number; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* Confetti burst */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            background: ['#ff2d7e', '#8b4fff', '#ff94c2', '#ffd700', '#00e5ff'][i % 5],
            left: '50%', top: '50%',
          }}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
          animate={{
            x: (Math.random() - 0.5) * 600,
            y: (Math.random() - 0.5) * 500,
            scale: [0, 1.5, 0],
            rotate: Math.random() * 720,
          }}
          transition={{ duration: 1.2, delay: i * 0.03, ease: 'easeOut' }}
        />
      ))}

      <motion.div
        className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-xs mx-4 pointer-events-auto border-4 border-petal-300"
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.5 }}
      >
        <motion.div
          className="text-6xl mb-3"
          animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          👑
        </motion.div>
        <p className="text-xs font-bold text-petal-400 uppercase tracking-widest mb-1">¡Subiste de nivel!</p>
        <p className="text-5xl font-black text-gray-800 mb-2">Lvl {level}</p>
        <p className="text-sm text-gray-500">Tu mascota está súper orgullosa 🌸</p>
        <motion.div
          className="mt-4 text-2xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          ✨⭐✨
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

// ── Achievement Toast ──────────────────────────────────────────────────────
export function AchievementToast({
  achievement,
  onClose,
}: {
  achievement: Achievement
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <motion.div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90]"
      initial={{ y: 100, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', bounce: 0.4 }}
    >
      <div className="bg-gray-900 text-white rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl min-w-[280px]">
        <span className="text-3xl">{achievement.emoji}</span>
        <div>
          <p className="text-xs text-yellow-400 font-bold uppercase tracking-wide">¡Logro desbloqueado!</p>
          <p className="font-black text-sm">{achievement.title}</p>
          <p className="text-xs text-gray-400">{achievement.description}</p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Combo Banner ───────────────────────────────────────────────────────────
export function ComboBanner({ label, starsEarned }: { label: string; starsEarned: number }) {
  return (
    <motion.div
      className="fixed top-20 right-4 z-[80]"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ type: 'spring', bounce: 0.5 }}
    >
      <div className="bg-gradient-to-r from-petal-500 to-lavender-500 text-white rounded-2xl px-4 py-2 shadow-glow text-right">
        <p className="font-black text-lg leading-none">{label}</p>
        <p className="text-xs opacity-80">+{starsEarned} ⭐ earned!</p>
      </div>
    </motion.div>
  )
}

// ── Star Burst (floating stars) ────────────────────────────────────────────
export function StarBurst({ count, x, y }: { count: number; x: number; y: number }) {
  return (
    <>
      {Array.from({ length: Math.min(count + 2, 8) }).map((_, i) => (
        <motion.div
          key={i}
          className="fixed z-[70] pointer-events-none text-xl select-none"
          style={{ left: x, top: y }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: (Math.random() - 0.5) * 120,
            y: -80 - Math.random() * 80,
            opacity: 0,
            scale: [1, 1.5, 0],
          }}
          transition={{ duration: 0.9, delay: i * 0.05, ease: 'easeOut' }}
        >
          ⭐
        </motion.div>
      ))}
    </>
  )
}

// ── Orchestrator: manages queue of celebrations ────────────────────────────
type CelebEvent =
  | { type: 'levelup'; level: number }
  | { type: 'achievement'; achievement: Achievement }
  | { type: 'combo'; label: string; starsEarned: number }

export type { CelebEvent }
