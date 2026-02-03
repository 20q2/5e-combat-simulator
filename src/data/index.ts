// Re-export all data and utility functions

// Races
export { races, getRaceById, getAllRaces } from './races'

// Classes
export {
  classes,
  getClassById,
  getAllClasses,
  getClassFeaturesByLevel,
  getSubclassFeaturesByLevel,
} from './classes'

// Equipment
export {
  weapons,
  armors,
  getWeaponById,
  getArmorById,
  getAllWeapons,
  getAllArmors,
  getWeaponsByCategory,
  getWeaponsByType,
  getArmorsByCategory,
} from './equipment'

// Spells
export {
  spells,
  getSpellById,
  getAllSpells,
  getSpellsByLevel,
  getSpellsByClass,
  getSpellsBySchool,
  getCantrips,
  getSpellsForClassAtLevel,
} from './spells'

// Monsters
export {
  monsters,
  getMonsterById,
  getAllMonsters,
  getMonstersByCR,
  getMonstersByType,
  getMonstersUpToCR,
} from './monsters'

// Presets
export {
  presetCharacters,
  encounterPresets,
  getPresetCharacterById,
  getEncounterPresetById,
  type EncounterPreset,
} from './presets'
