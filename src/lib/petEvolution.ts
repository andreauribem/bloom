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
  bear:    { baby: '🧸', teen: '🐻', adult: '🐻‍❄️', legendary: '🐻' },
  raccoon: { baby: '🦔', teen: '🦝', adult: '🦡',  legendary: '🦝' },
  cat:     { baby: '🐱', teen: '😺', adult: '🐈',  legendary: '🐱' },
  fox:     { baby: '🐣', teen: '🦊', adult: '🦊',  legendary: '🦊' },
  bunny:   { baby: '🐰', teen: '🐇', adult: '🐇',  legendary: '🐰' },
  frog:    { baby: '🥒', teen: '🐸', adult: '🐸',  legendary: '🐸' },
}

// Legendary aura emoji shown beside the pet
const LEGENDARY_AURA: Record<string, string> = {
  bear: '👑', raccoon: '🌟', cat: '🌙', fox: '🔥', bunny: '🌸', frog: '👑',
}

export function getStageForLevel(level: number): PetStage {
  if (level >= 15) return 'legendary'
  if (level >= 10) return 'adult'
  if (level >= 5) return 'teen'
  return 'baby'
}

export function getPetEmoji(petId: string, level: number): string {
  const stage = getStageForLevel(level)
  return EVOLUTION_SPRITES[petId]?.[stage] ?? '🐻'
}

export function getLegendaryAura(petId: string): string {
  return LEGENDARY_AURA[petId] ?? '👑'
}

export function checkEvolution(oldLevel: number, newLevel: number): boolean {
  return getStageForLevel(oldLevel) !== getStageForLevel(newLevel)
}

export function getStageLabel(stage: PetStage): string {
  switch (stage) {
    case 'baby': return '🥚 Baby'
    case 'teen': return '🌱 Teen'
    case 'adult': return '⭐ Adult'
    case 'legendary': return '👑 Legendary'
  }
}

export function getNextStageLevelReq(level: number): { stage: PetStage; levelNeeded: number } | null {
  if (level >= 15) return null
  if (level >= 10) return { stage: 'legendary', levelNeeded: 15 }
  if (level >= 5) return { stage: 'adult', levelNeeded: 10 }
  return { stage: 'teen', levelNeeded: 5 }
}
