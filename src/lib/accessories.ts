// ── Accessories & Customization ───────────────────────────────────────────

export type AccessoryCategory = 'hat' | 'background' | 'effect'

export type Accessory = {
  id: string
  name: string
  emoji: string
  category: AccessoryCategory
  cost: number
  levelRequired: number
}

export const ACCESSORIES: Accessory[] = [
  // Hats (displayed above pet)
  { id: 'hat_bow',       name: 'Bow',          emoji: '🎀', category: 'hat', cost: 20,  levelRequired: 1 },
  { id: 'hat_flower',    name: 'Flower Crown', emoji: '🌺', category: 'hat', cost: 25,  levelRequired: 1 },
  { id: 'hat_party',     name: 'Party Hat',    emoji: '🥳', category: 'hat', cost: 15,  levelRequired: 1 },
  { id: 'hat_top',       name: 'Top Hat',      emoji: '🎩', category: 'hat', cost: 30,  levelRequired: 3 },
  { id: 'hat_chef',      name: 'Chef Hat',     emoji: '👨‍🍳', category: 'hat', cost: 35,  levelRequired: 5 },
  { id: 'hat_crown',     name: 'Crown',        emoji: '👑', category: 'hat', cost: 50,  levelRequired: 8 },
  { id: 'hat_halo',      name: 'Halo',         emoji: '😇', category: 'hat', cost: 40,  levelRequired: 6 },
  { id: 'hat_santa',     name: 'Santa Hat',    emoji: '🎅', category: 'hat', cost: 45,  levelRequired: 7 },

  // Backgrounds (ambient emojis behind pet)
  { id: 'bg_love',       name: 'Love',         emoji: '💕', category: 'background', cost: 30,  levelRequired: 1 },
  { id: 'bg_garden',     name: 'Garden',       emoji: '🌷', category: 'background', cost: 35,  levelRequired: 2 },
  { id: 'bg_starry',     name: 'Starry',       emoji: '⭐', category: 'background', cost: 40,  levelRequired: 3 },
  { id: 'bg_ocean',      name: 'Ocean',        emoji: '🌊', category: 'background', cost: 45,  levelRequired: 5 },
  { id: 'bg_snow',       name: 'Snow',         emoji: '❄️', category: 'background', cost: 35,  levelRequired: 4 },
  { id: 'bg_forest',     name: 'Forest',       emoji: '🌿', category: 'background', cost: 30,  levelRequired: 2 },

  // Effects (animated emojis around pet)
  { id: 'fx_sparkles',   name: 'Sparkles',     emoji: '✨', category: 'effect', cost: 25,  levelRequired: 1 },
  { id: 'fx_music',      name: 'Music',        emoji: '🎵', category: 'effect', cost: 30,  levelRequired: 3 },
  { id: 'fx_butterfly',  name: 'Butterflies',  emoji: '🦋', category: 'effect', cost: 40,  levelRequired: 4 },
  { id: 'fx_cherry',     name: 'Cherry Blossom',emoji: '🌸', category: 'effect', cost: 35,  levelRequired: 3 },
  { id: 'fx_rainbow',    name: 'Rainbow',      emoji: '🌈', category: 'effect', cost: 50,  levelRequired: 8 },
  { id: 'fx_fire',       name: 'Fire Aura',    emoji: '🔥', category: 'effect', cost: 60,  levelRequired: 10 },
]

export function getAccessory(id: string): Accessory | undefined {
  return ACCESSORIES.find(a => a.id === id)
}

export function getAccessoriesByCategory(category: AccessoryCategory): Accessory[] {
  return ACCESSORIES.filter(a => a.category === category)
}

export function canBuyAccessory(acc: Accessory, stars: number, level: number, owned: string[]): { canBuy: boolean; reason?: string } {
  if (owned.includes(acc.id)) return { canBuy: false, reason: 'Already owned' }
  if (level < acc.levelRequired) return { canBuy: false, reason: `Requires Lv${acc.levelRequired}` }
  if (stars < acc.cost) return { canBuy: false, reason: `Need ${acc.cost - stars} more ⭐` }
  return { canBuy: true }
}
