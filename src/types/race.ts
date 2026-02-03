import type { AbilityName, AbilityScores, Condition, DamageType, Size } from './index'

// ============================================
// Racial Ability Trigger Types
// ============================================

export type RacialAbilityTrigger =
  | 'passive'           // Always active (resistances, darkvision)
  | 'on_damage_taken'   // When taking damage (Relentless Endurance)
  | 'on_attack_roll'    // When making attack rolls (Savage Attacks on crit)
  | 'on_ability_check'  // When making ability checks (Lucky)
  | 'on_saving_throw'   // When making saves (Fey Ancestry, Brave)
  | 'action'            // Requires action to use (Breath Weapon)
  | 'bonus_action'      // Requires bonus action
  | 'reaction'          // Requires reaction

// ============================================
// Base Racial Ability Interface
// ============================================

export interface RacialAbilityBase {
  id: string
  name: string
  description: string
  trigger: RacialAbilityTrigger
  maxUses?: number  // Per combat, undefined = unlimited
}

// ============================================
// Specific Ability Type Interfaces
// ============================================

export interface ResistanceAbility extends RacialAbilityBase {
  type: 'resistance'
  damageTypes: DamageType[]
  level: 'resistance' | 'immunity'
}

export interface DarkvisionAbility extends RacialAbilityBase {
  type: 'darkvision'
  range: number // feet
}

export interface ProficiencyAbility extends RacialAbilityBase {
  type: 'proficiency'
  proficiencies: {
    weapons?: string[]
    armor?: string[]
    skills?: string[]
    tools?: string[]
    savingThrows?: AbilityName[]
  }
}

export interface SaveAdvantageAbility extends RacialAbilityBase {
  type: 'save_advantage'
  conditions?: Condition[]        // Advantage vs specific conditions (charmed, frightened)
  damageTypes?: DamageType[]      // Advantage vs specific damage saves (poison)
  magicSaves?: boolean            // Advantage vs magic (Gnome Cunning)
}

export interface RerollAbility extends RacialAbilityBase {
  type: 'reroll'
  appliesTo: ('attack' | 'ability_check' | 'saving_throw')[]
  triggerValue: number  // Reroll when d20 shows this or lower (1 for Halfling Lucky)
}

export interface TriggeredHealAbility extends RacialAbilityBase {
  type: 'triggered_heal'
  triggerCondition: 'drop_to_zero'
  healAmount: number  // HP restored (1 for Relentless Endurance)
}

export interface BonusDamageAbility extends RacialAbilityBase {
  type: 'bonus_damage'
  triggerCondition: 'critical_hit'
  bonusDice: string  // e.g., "1d6" for Savage Attacks extra die
}

export interface BreathWeaponAbility extends RacialAbilityBase {
  type: 'breath_weapon'
  damageType: DamageType
  damageDice: string
  damageScaling?: { [level: number]: string }  // Damage at different levels
  shape: 'line' | 'cone'
  size: number  // feet
  savingThrow: AbilityName
  dcAbility: AbilityName
}

export interface BonusCantripAbility extends RacialAbilityBase {
  type: 'bonus_cantrip'
  spellId: string
  spellcastingAbility: AbilityName
}

export interface BonusSpellAbility extends RacialAbilityBase {
  type: 'bonus_spell'
  spellId: string
  spellcastingAbility: AbilityName
  minLevel: number  // Character level required
  usesPerCombat?: number
}

// Nimbleness - move through larger creatures
export interface NimblenessAbility extends RacialAbilityBase {
  type: 'nimbleness'
  canMoveThrough: Size[]  // Sizes you can move through
}

// Trance - don't need full sleep
export interface TraitAbility extends RacialAbilityBase {
  type: 'trait'
  // Generic trait with just description, no mechanical effect in combat
}

// ============================================
// Union Type for All Racial Abilities
// ============================================

export type RacialAbility =
  | ResistanceAbility
  | DarkvisionAbility
  | ProficiencyAbility
  | SaveAdvantageAbility
  | RerollAbility
  | TriggeredHealAbility
  | BonusDamageAbility
  | BreathWeaponAbility
  | BonusCantripAbility
  | BonusSpellAbility
  | NimblenessAbility
  | TraitAbility

// ============================================
// Updated Race Interface
// ============================================

export interface Race {
  id: string
  name: string
  size: Size
  speed: number
  abilityScoreIncrease: Partial<AbilityScores>
  abilities: RacialAbility[]
  languages: string[]
}

// ============================================
// Helper Type Guards
// ============================================

export function isResistanceAbility(ability: RacialAbility): ability is ResistanceAbility {
  return ability.type === 'resistance'
}

export function isDarkvisionAbility(ability: RacialAbility): ability is DarkvisionAbility {
  return ability.type === 'darkvision'
}

export function isProficiencyAbility(ability: RacialAbility): ability is ProficiencyAbility {
  return ability.type === 'proficiency'
}

export function isSaveAdvantageAbility(ability: RacialAbility): ability is SaveAdvantageAbility {
  return ability.type === 'save_advantage'
}

export function isRerollAbility(ability: RacialAbility): ability is RerollAbility {
  return ability.type === 'reroll'
}

export function isTriggeredHealAbility(ability: RacialAbility): ability is TriggeredHealAbility {
  return ability.type === 'triggered_heal'
}

export function isBonusDamageAbility(ability: RacialAbility): ability is BonusDamageAbility {
  return ability.type === 'bonus_damage'
}

export function isBreathWeaponAbility(ability: RacialAbility): ability is BreathWeaponAbility {
  return ability.type === 'breath_weapon'
}

export function isBonusCantripAbility(ability: RacialAbility): ability is BonusCantripAbility {
  return ability.type === 'bonus_cantrip'
}

export function isBonusSpellAbility(ability: RacialAbility): ability is BonusSpellAbility {
  return ability.type === 'bonus_spell'
}

// ============================================
// Dragonborn Ancestry Types
// ============================================

export type DragonAncestry =
  | 'black' | 'blue' | 'brass' | 'bronze' | 'copper'
  | 'gold' | 'green' | 'red' | 'silver' | 'white'

export interface DragonAncestryInfo {
  ancestry: DragonAncestry
  damageType: DamageType
  breathShape: 'line' | 'cone'
  breathSize: number
}

export const DRAGON_ANCESTRIES: DragonAncestryInfo[] = [
  { ancestry: 'black', damageType: 'acid', breathShape: 'line', breathSize: 30 },
  { ancestry: 'blue', damageType: 'lightning', breathShape: 'line', breathSize: 30 },
  { ancestry: 'brass', damageType: 'fire', breathShape: 'line', breathSize: 30 },
  { ancestry: 'bronze', damageType: 'lightning', breathShape: 'line', breathSize: 30 },
  { ancestry: 'copper', damageType: 'acid', breathShape: 'line', breathSize: 30 },
  { ancestry: 'gold', damageType: 'fire', breathShape: 'cone', breathSize: 15 },
  { ancestry: 'green', damageType: 'poison', breathShape: 'cone', breathSize: 15 },
  { ancestry: 'red', damageType: 'fire', breathShape: 'cone', breathSize: 15 },
  { ancestry: 'silver', damageType: 'cold', breathShape: 'cone', breathSize: 15 },
  { ancestry: 'white', damageType: 'cold', breathShape: 'cone', breathSize: 15 },
]
