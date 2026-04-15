// ── Pet Evolution System ──────────────────────────────────────────────────
// Pets evolve visually as the player levels up through productivity

export type PetStage = 'baby' | 'teen' | 'adult' | 'legendary'

const STAGE_LEVELS: Record<PetStage, [number, number]> = {
  baby:      [1, 4],
  teen:      [5, 9],
  adult:     [10, 14],
  legendary: [15, Infinity],
}

// Each pet has different emojis per evolution stage
const EVOLUTION_SPRITES: Record<string, Record<PetStage, string>> = {
  bear:    { baby: '🧸', teen: '🐻', adult: '🐻‍❄️', legendary: '🧸' },
  raccoon: { baby: '🦔', teen: '🦝', adult: '🦡',  legendary: '🦝' },
  cat:     { baby: '🐱', teen: '😺', adult: '😸',   legendary: '😻' },
  fox:     { baby: '🐣', teen: '🦊', adult: '🦊',  legendary: '🦊' },
  bunny:   { baby: '🐰', teen: '🐇', adult: '🐇',  legendary: '🐰' },
  frog:    { baby: '🥒', teen: '🐸', adult: '🐸',  legendary: '🐸' },
}

// Legendary aura emoji shown beside the pet
const LEGENDARY_AURA: Record<string, string> = {
  bear: '👑', raccoon: '🌟', cat: '🌙', fox: '🔥', bunny: '🌸', frog: '👑',
  foxy: '✨',
}

export function getStageForLevel(level: number): PetStage {
  if (level >= 15) return 'legendary'
  if (level >= 10) return 'adult'
  if (level >= 5) return 'teen'
  return 'baby'
}

export function getPetEmoji(petId: string, level: number): string {
  const stage = getStageForLevel(level)
  return EVOLUTION_SPRITES[petId]?.[stage] ?? '🦊'
}

export function getLegendaryAura(petId: string): string {
  return LEGENDARY_AURA[petId] ?? '👑'
}

export function checkEvolution(oldLevel: number, newLevel: number): boolean {
  return getStageForLevel(oldLevel) !== getStageForLevel(newLevel)
}

export function getStageLabel(stage: PetStage): string {
  switch (stage) {
    case 'baby': return 'Baby'
    case 'teen': return 'Teen'
    case 'adult': return 'Adult'
    case 'legendary': return 'Legend'
  }
}

export function getNextStageLevelReq(level: number): { stage: PetStage; levelNeeded: number } | null {
  if (level >= 15) return null
  if (level >= 10) return { stage: 'legendary', levelNeeded: 15 }
  if (level >= 5) return { stage: 'adult', levelNeeded: 10 }
  return { stage: 'teen', levelNeeded: 5 }
}

// ── Foxy: image-based pet ─────────────────────────────────────────────────
// Foxy uses hand-drawn pixel art instead of emoji.
// Each life stage (baby/teen/elder) has multiple "happy" variants that
// rotate based on stars collected, plus mood-specific images.

export type FoxyMood = 'happy' | 'sad' | 'sick' | 'fainted'

const FOXY_FOLDER: Record<PetStage, string> = {
  baby:      'baby',
  teen:      'teen',
  adult:     'elder',
  legendary: 'elder',
}

const FOXY_VARIANTS: Record<PetStage, Record<FoxyMood, string[]>> = {
  baby: {
    happy:   ['feliz.png', 'feliz2.png', 'feliz-corazon.png', 'feliz-jugando.png'],
    sad:     ['triste.png'],
    sick:    ['enfermo.png'],
    fainted: ['desmayado.png'],
  },
  teen: {
    happy:   ['feliz-bailando.png', 'feliz-corazon.png', 'feliz-helado.png'],
    sad:     ['triste.png'],
    sick:    ['enfermo.png'],
    fainted: ['desmayado.png'],
  },
  adult: {
    happy:   ['feliz.png', 'feliz-bailando.png', 'feliz-leyendo.png'],
    sad:     ['llorando.png'],
    sick:    ['enfermo.png'],
    fainted: ['enfermo.png'], // no desmayado for elder; reuse sick as worst
  },
  legendary: {
    happy:   ['feliz-bailando.png', 'feliz-leyendo.png', 'feliz.png'],
    sad:     ['llorando.png'],
    sick:    ['enfermo.png'],
    fainted: ['enfermo.png'],
  },
}

export function isFoxy(petId: string): boolean {
  return petId === 'foxy'
}

export function getFoxyMood(
  petMood: 'happy' | 'excited' | 'neutral' | 'tired' | 'hungry',
  fainted: boolean,
  sick: boolean,
): FoxyMood {
  if (fainted) return 'fainted'
  if (sick) return 'sick'
  if (petMood === 'hungry' || petMood === 'tired') return 'sad'
  return 'happy'
}

export function getFoxyImage(
  level: number,
  mood: FoxyMood,
  variantSeed: number,
): string {
  const stage = getStageForLevel(level)
  const variants = FOXY_VARIANTS[stage][mood]
  const variant = variants[Math.abs(variantSeed) % variants.length]
  return `/foxy/${FOXY_FOLDER[stage]}/${variant}`
}

// Get all happy images for a stage so callers can preload them.
export function getFoxyHappyImages(level: number): string[] {
  const stage = getStageForLevel(level)
  const folder = FOXY_FOLDER[stage]
  return FOXY_VARIANTS[stage].happy.map(v => `/foxy/${folder}/${v}`)
}
