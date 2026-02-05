import type { Character, AbilityScores, TerrainDefinition } from '@/types'
import type { FightingStyle } from '@/types/classFeature'
import { getRaceById, getClassById, getWeaponById, getArmorById, getSpellById, getClassFeaturesByLevel } from './index'
import encounterData from './encounters.json'

// Helper to create a preset character
function createPresetCharacter(config: {
  id: string
  name: string
  raceId: string
  classId: string
  level: number
  abilityScores: AbilityScores
  meleeWeaponId?: string
  rangedWeaponId?: string
  offhandWeaponId?: string
  armorId?: string
  shieldId?: string
  spellIds?: string[]
  masteredWeaponIds?: string[]
  fightingStyles?: FightingStyle[]
}): Character | null {
  const race = getRaceById(config.raceId)
  const charClass = getClassById(config.classId)
  const meleeWeapon = config.meleeWeaponId ? getWeaponById(config.meleeWeaponId) : undefined
  const rangedWeapon = config.rangedWeaponId ? getWeaponById(config.rangedWeaponId) : undefined
  const offhandWeapon = config.offhandWeaponId ? getWeaponById(config.offhandWeaponId) : undefined
  const armor = config.armorId ? getArmorById(config.armorId) : undefined
  const shield = config.shieldId ? getArmorById(config.shieldId) : undefined

  if (!race || !charClass) return null

  // Apply racial ability score bonuses
  const finalScores: AbilityScores = {
    strength: config.abilityScores.strength + (race.abilityScoreIncrease.strength || 0),
    dexterity: config.abilityScores.dexterity + (race.abilityScoreIncrease.dexterity || 0),
    constitution: config.abilityScores.constitution + (race.abilityScoreIncrease.constitution || 0),
    intelligence: config.abilityScores.intelligence + (race.abilityScoreIncrease.intelligence || 0),
    wisdom: config.abilityScores.wisdom + (race.abilityScoreIncrease.wisdom || 0),
    charisma: config.abilityScores.charisma + (race.abilityScoreIncrease.charisma || 0),
  }

  // Calculate modifiers
  const getMod = (score: number) => Math.floor((score - 10) / 2)
  const conMod = getMod(finalScores.constitution)
  const dexMod = getMod(finalScores.dexterity)

  // Calculate HP
  const hpPerLevel = Math.floor(charClass.hitDie / 2) + 1
  const maxHp = charClass.hitDie + conMod + (config.level - 1) * (hpPerLevel + conMod)

  // Calculate AC
  let ac = 10 + dexMod
  if (armor) {
    if (armor.category === 'heavy') {
      ac = armor.baseAC
    } else if (armor.category === 'medium') {
      ac = armor.baseAC + Math.min(dexMod, 2)
    } else {
      ac = armor.baseAC + dexMod
    }
  }
  if (shield) {
    ac += shield.baseAC
  }

  // Get proficiency bonus
  const proficiencyBonus = Math.ceil(config.level / 4) + 1

  // Get class features
  const features = getClassFeaturesByLevel(charClass, config.level)

  // Get spells if provided
  const knownSpells = config.spellIds
    ?.map(id => getSpellById(id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined) || []

  // Calculate spell slots if caster
  let spellSlots = undefined
  if (charClass.spellcasting && config.level >= 1) {
    const slotProgression = charClass.spellcasting.spellSlotProgression[config.level] || []
    spellSlots = {
      1: { max: slotProgression[0] || 0, current: slotProgression[0] || 0 },
      2: { max: slotProgression[1] || 0, current: slotProgression[1] || 0 },
      3: { max: slotProgression[2] || 0, current: slotProgression[2] || 0 },
      4: { max: slotProgression[3] || 0, current: slotProgression[3] || 0 },
      5: { max: slotProgression[4] || 0, current: slotProgression[4] || 0 },
      6: { max: slotProgression[5] || 0, current: slotProgression[5] || 0 },
      7: { max: slotProgression[6] || 0, current: slotProgression[6] || 0 },
      8: { max: slotProgression[7] || 0, current: slotProgression[7] || 0 },
      9: { max: slotProgression[8] || 0, current: slotProgression[8] || 0 },
    }
  }

  return {
    id: config.id,
    name: config.name,
    race,
    class: charClass,
    level: config.level,
    abilityScores: finalScores,
    originFeats: [], // Preset characters don't have origin feats defined
    maxHp,
    currentHp: maxHp,
    temporaryHp: 0,
    ac,
    speed: race.speed,
    proficiencyBonus,
    skillProficiencies: [],
    savingThrowProficiencies: charClass.savingThrowProficiencies,
    equipment: {
      meleeWeapon,
      rangedWeapon,
      offhandWeapon,
      armor,
      shield,
      items: [],
    },
    spellSlots,
    knownSpells: knownSpells.length > 0 ? knownSpells : undefined,
    features,
    conditions: [],
    deathSaves: { successes: 0, failures: 0 },
    masteredWeaponIds: config.masteredWeaponIds,
    fightingStyles: config.fightingStyles,
  }
}

// Preset characters
export const presetCharacters = [
  // Human Fighter - Classic melee warrior
  createPresetCharacter({
    id: 'preset-fighter',
    name: 'Aldric the Bold',
    raceId: 'human',
    classId: 'fighter',
    level: 3,
    abilityScores: { strength: 16, dexterity: 14, constitution: 15, intelligence: 10, wisdom: 12, charisma: 8 },
    meleeWeaponId: 'longsword',
    rangedWeaponId: 'longbow',
    armorId: 'chain-mail',
    shieldId: 'shield',
  }),

  // Human Fighter Level 5 - Extra Attack & Weapon Mastery
  createPresetCharacter({
    id: 'preset-fighter-5',
    name: 'Kira Steelstrike',
    raceId: 'human',
    classId: 'fighter',
    level: 5,
    abilityScores: { strength: 16, dexterity: 14, constitution: 16, intelligence: 10, wisdom: 12, charisma: 8 },
    meleeWeaponId: 'greatsword',
    rangedWeaponId: 'longbow',
    armorId: 'chain-mail',
    masteredWeaponIds: ['greatsword', 'longbow', 'halberd'],
    fightingStyles: ['great_weapon'],
  }),

  // Elf Rogue - Sneaky striker
  createPresetCharacter({
    id: 'preset-rogue',
    name: 'Lyra Shadowstep',
    raceId: 'elf',
    classId: 'rogue',
    level: 3,
    abilityScores: { strength: 10, dexterity: 16, constitution: 14, intelligence: 12, wisdom: 13, charisma: 8 },
    meleeWeaponId: 'shortsword',
    rangedWeaponId: 'shortbow',
    armorId: 'leather',
  }),

  // Human Wizard - Powerful spellcaster
  createPresetCharacter({
    id: 'preset-wizard',
    name: 'Magnus Spellweaver',
    raceId: 'human',
    classId: 'wizard',
    level: 3,
    abilityScores: { strength: 8, dexterity: 14, constitution: 14, intelligence: 16, wisdom: 12, charisma: 10 },
    meleeWeaponId: 'quarterstaff',
    rangedWeaponId: 'light-crossbow',
    spellIds: ['fire-bolt', 'ray-of-frost', 'magic-missile', 'shield', 'burning-hands'],
  }),

  // Dwarf Cleric - Sturdy healer
  createPresetCharacter({
    id: 'preset-cleric',
    name: 'Thorin Ironforge',
    raceId: 'dwarf',
    classId: 'cleric',
    level: 3,
    abilityScores: { strength: 14, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 16, charisma: 12 },
    meleeWeaponId: 'mace',
    rangedWeaponId: 'light-crossbow',
    armorId: 'chain-mail',
    shieldId: 'shield',
    spellIds: ['sacred-flame', 'cure-wounds', 'guiding-bolt', 'healing-word'],
  }),
].filter((c): c is Character => c !== null)

// Encounter presets
export interface EncounterPreset {
  id: string
  name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard' | 'deadly'
  monsters: { id: string; count: number }[]
  gridWidth?: number
  gridHeight?: number
  terrain?: TerrainDefinition[]
  backgroundImage?: string // Filename (without extension) of the map background image
}

// Load encounters from JSON file - cast to correct type
export const encounterPresets: EncounterPreset[] = encounterData.encounters as EncounterPreset[]

export function getPresetCharacterById(id: string): Character | undefined {
  return presetCharacters.find(c => c.id === id)
}

export function getEncounterPresetById(id: string): EncounterPreset | undefined {
  return encounterPresets.find(e => e.id === id)
}
