import type { Character, Monster } from '@/types'

// Map race IDs to simplified token race names
const raceToTokenRace: Record<string, string> = {
  'human': 'human',
  'elf-high': 'elf',
  'dwarf-hill': 'dwarf',
  'dwarf-mountain': 'dwarf',
  'halfling-lightfoot': 'halfling',
  'halfling-stout': 'halfling',
  'dragonborn': 'dragonborn',
  'gnome-rock': 'gnome',
  'half-elf': 'elf',
  'half-orc': 'human',
  'tiefling': 'tiefling',
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

// Available enemy tokens
const availableEnemyTokens = new Set([
  'bandit',
  'goblin',
  'orc',
  'skeleton',
  'wolf',
  'zombie',
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

  return `/src/assets/player_classes/${classId}/${classId}_${tokenRace}.png`
}

export function getMonsterTokenImage(monster: Monster): string | null {
  const monsterId = monster.id

  // Check if we have a token for this monster
  if (!availableEnemyTokens.has(monsterId)) {
    return null
  }

  return `/src/assets/enemies/${monsterId}.png`
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
