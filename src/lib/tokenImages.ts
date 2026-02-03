import type { Character, Monster } from '@/types'

// Use Vite's glob import to load all player class images
const playerClassImages = import.meta.glob<{ default: string }>(
  '@/assets/player_classes/**/*.png',
  { eager: true }
)

// Use Vite's glob import to load all enemy images
const enemyImages = import.meta.glob<{ default: string }>(
  '@/assets/enemies/*.png',
  { eager: true }
)

// Map race IDs to simplified token race names
const raceToTokenRace: Record<string, string> = {
  'human': 'human',
  'elf': 'elf',
  'dwarf': 'dwarf',
  'halfling': 'halfling',
  'gnome': 'gnome',
  'orc': 'human', // Use human tokens for orc
  'tiefling': 'tiefling',
  'aasimar': 'human', // Use human tokens for aasimar
  'goliath': 'human', // Use human tokens for goliath
  'dragonborn': 'dragonborn',
}

// Available class tokens (classes that have image assets)
const availableClassTokens = new Set([
  'barbarian',
  'bard',
  'cleric',
  'druid',
  'fighter',
  'monk',
  'paladin',
  'ranger',
  'rogue',
  'sorcerer',
  'warlock',
  'wizard',
])

export function getCharacterTokenImage(character: Character): string | null {
  const classId = character.class.id
  const raceId = character.race.id

  // Check if we have tokens for this class
  if (!availableClassTokens.has(classId)) {
    return null
  }

  // Map the race to the token race name
  const tokenRace = raceToTokenRace[raceId]
  if (!tokenRace) {
    return null
  }

  // Find the image in the glob imports
  const imagePath = `/src/assets/player_classes/${classId}/${classId}_${tokenRace}.png`
  const imageModule = playerClassImages[imagePath]

  return imageModule?.default ?? null
}

export function getMonsterTokenImage(monster: Monster): string | null {
  const monsterId = monster.id

  // Try to find the image in the glob imports
  // First try exact match
  let imagePath = `/src/assets/enemies/${monsterId}.png`
  let imageModule = enemyImages[imagePath]

  if (imageModule) {
    return imageModule.default
  }

  // Try with underscores replaced by hyphens and vice versa
  const altId = monsterId.includes('-')
    ? monsterId.replace(/-/g, '_')
    : monsterId.replace(/_/g, '-')
  imagePath = `/src/assets/enemies/${altId}.png`
  imageModule = enemyImages[imagePath]

  return imageModule?.default ?? null
}

export function getCombatantTokenImage(
  type: 'character' | 'monster',
  data: Character | Monster
): string | null {
  if (type === 'character') {
    return getCharacterTokenImage(data as Character)
  } else {
    return getMonsterTokenImage(data as Monster)
  }
}
