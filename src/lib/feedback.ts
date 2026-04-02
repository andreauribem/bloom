// ── Haptic Feedback + Sound Effects ───────────────────────────────────────
// Uses Web Vibration API (mobile) and Web Audio API for lightweight sounds

// ── Haptics ──
export function hapticLight() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10)
  }
}

export function hapticMedium() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(25)
  }
}

export function hapticHeavy() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([30, 10, 30])
  }
}

export function hapticSuccess() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([10, 50, 20, 50, 30])
  }
}

// ── Sounds (Web Audio API — no files needed) ──
let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)() } catch { return null }
  }
  return audioCtx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  const ctx = getAudioCtx()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.value = volume
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

// ── Sound Effects ──

export function soundCoin() {
  // Mario-style coin: two quick ascending tones
  playTone(988, 0.08, 'square', 0.1)
  setTimeout(() => playTone(1319, 0.15, 'square', 0.1), 60)
}

export function soundLevelUp() {
  // Ascending arpeggio
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.15, 'sine', 0.12), i * 100)
  })
}

export function soundCombo() {
  // Quick power-up
  playTone(440, 0.05, 'square', 0.08)
  setTimeout(() => playTone(660, 0.05, 'square', 0.08), 50)
  setTimeout(() => playTone(880, 0.1, 'square', 0.08), 100)
}

export function soundComplete() {
  // Soft chime
  playTone(880, 0.12, 'sine', 0.1)
  setTimeout(() => playTone(1100, 0.2, 'sine', 0.08), 80)
}

export function soundEvolution() {
  // Magical ascending
  const notes = [392, 494, 587, 698, 784, 988, 1175]
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'sine', 0.1), i * 80)
  })
}

export function soundAchievement() {
  // Fanfare
  playTone(523, 0.1, 'triangle', 0.12)
  setTimeout(() => playTone(659, 0.1, 'triangle', 0.12), 100)
  setTimeout(() => playTone(784, 0.1, 'triangle', 0.12), 200)
  setTimeout(() => playTone(1047, 0.3, 'triangle', 0.12), 300)
}

export function soundClick() {
  playTone(600, 0.03, 'sine', 0.06)
}

export function soundError() {
  playTone(200, 0.15, 'sawtooth', 0.08)
  setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.08), 100)
}
