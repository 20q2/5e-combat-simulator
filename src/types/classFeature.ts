// ============================================
// Class Feature Types
// ============================================

// Class feature trigger types
export type ClassFeatureTrigger =
  | 'passive'           // Always active (Fighting Style bonuses)
  | 'on_attack_roll'    // When making attacks (Sneak Attack conditions)
  | 'on_damage_roll'    // When rolling damage (Great Weapon Fighting)
  | 'bonus_action'      // Requires bonus action (Second Wind)
  | 'action'            // Requires action (Action Surge)
  | 'reaction'          // Requires reaction (Uncanny Dodge)

// Base class feature interface
export interface ClassFeatureBase {
  id: string
  name: string
  level: number
  description: string
  trigger: ClassFeatureTrigger
  maxUses?: number  // Per combat, undefined = unlimited
}

// ============================================
// Specific Feature Types
// ============================================

// Second Wind - Fighter bonus action heal
export interface SecondWindFeature extends ClassFeatureBase {
  type: 'second_wind'
  healDice: string  // "1d10"
  healBonusPerLevel: boolean  // Add class level to heal
  maxUsesAtLevels?: Record<number, number>  // Level scaling (e.g., {1: 2, 4: 3, 10: 4})
}

// Fighting Style - passive combat bonuses
export type FightingStyle =
  | 'archery'       // +2 to ranged attack rolls
  | 'defense'       // +1 AC when wearing armor
  | 'dueling'       // +2 damage with one-handed melee weapon
  | 'great_weapon'  // Reroll 1s and 2s on damage dice with two-handed weapons
  | 'protection'    // Reaction to impose disadvantage on attack vs adjacent ally
  | 'two_weapon'    // Add ability modifier to off-hand damage

export interface FightingStyleFeature extends ClassFeatureBase {
  type: 'fighting_style'
  style?: FightingStyle  // Optional - selected by player during character creation
  availableStyles?: FightingStyle[]  // Styles available to choose from (if selectable)
}

// Additional Fighting Style - Champion subclass level 10 feature
export interface AdditionalFightingStyleFeature extends ClassFeatureBase {
  type: 'additional_fighting_style'
}

// Sneak Attack - Rogue conditional bonus damage
export interface SneakAttackFeature extends ClassFeatureBase {
  type: 'sneak_attack'
  baseDice: string  // "1d6"
  diceScaling: Record<number, string>  // Level -> dice (e.g., {3: "2d6", 5: "3d6"})
}

// Action Surge - Fighter extra action (level 2)
export interface ActionSurgeFeature extends ClassFeatureBase {
  type: 'action_surge'
}

// Cunning Action - Rogue bonus action Dash/Disengage/Hide (level 2)
export interface CunningActionFeature extends ClassFeatureBase {
  type: 'cunning_action'
  allowedActions: ('dash' | 'disengage' | 'hide')[]
}

// Extra Attack - Multiple attacks per Attack action (level 5+)
export interface ExtraAttackFeature extends ClassFeatureBase {
  type: 'extra_attack'
  attackCount: number  // Total number of attacks (e.g., 2 at level 5, 3 at level 11 for Fighter)
}

// Improved Critical - Expanded critical hit range (Champion Fighter)
export interface ImprovedCriticalFeature extends ClassFeatureBase {
  type: 'improved_critical'
  criticalRange: number  // Minimum roll for critical hit (19 for Improved Critical, 18 for Superior Critical)
}

// Generic feature (non-mechanical, text-only)
export interface GenericClassFeature extends ClassFeatureBase {
  type: 'generic'
}

// D&D 2024 Weapon Mastery - martial class weapon specialization
export interface WeaponMasteryFeature extends ClassFeatureBase {
  type: 'weapon_mastery'
  masteredWeaponCount: number  // Base number of weapons that can be mastered
  masteredWeaponCountAtLevels?: Record<number, number>  // Level scaling (e.g., Fighter gets more at 4, 10, 16)
}

// Combat Superiority - Battle Master maneuvers and superiority dice
export interface CombatSuperiorityFeature extends ClassFeatureBase {
  type: 'combat_superiority'
  superiorityDiceCount: number  // Base number of superiority dice (4 at level 3)
  superiorityDieSize: number  // Die size: 8, 10, or 12
  maneuversKnown: number  // Base number of maneuvers known (3 at level 3)
  superiorityDiceAtLevels?: Record<number, number>  // Level scaling for dice count
  superiorityDieSizeAtLevels?: Record<number, number>  // Level scaling for die size
  maneuversKnownAtLevels?: Record<number, number>  // Level scaling for maneuvers known
}

// Relentless - Battle Master level 15 feature (regain 1 die on initiative if empty)
export interface RelentlessFeature extends ClassFeatureBase {
  type: 'relentless'
}

// ============================================
// Union Type
// ============================================

export type ClassFeature =
  | SecondWindFeature
  | FightingStyleFeature
  | AdditionalFightingStyleFeature
  | SneakAttackFeature
  | ActionSurgeFeature
  | CunningActionFeature
  | ExtraAttackFeature
  | ImprovedCriticalFeature
  | WeaponMasteryFeature
  | CombatSuperiorityFeature
  | RelentlessFeature
  | GenericClassFeature

// ============================================
// Type Guards
// ============================================

export function isSecondWindFeature(f: ClassFeature): f is SecondWindFeature {
  return f.type === 'second_wind'
}

export function isFightingStyleFeature(f: ClassFeature): f is FightingStyleFeature {
  return f.type === 'fighting_style'
}

export function isAdditionalFightingStyleFeature(f: ClassFeature): f is AdditionalFightingStyleFeature {
  return f.type === 'additional_fighting_style'
}

export function isSneakAttackFeature(f: ClassFeature): f is SneakAttackFeature {
  return f.type === 'sneak_attack'
}

export function isActionSurgeFeature(f: ClassFeature): f is ActionSurgeFeature {
  return f.type === 'action_surge'
}

export function isCunningActionFeature(f: ClassFeature): f is CunningActionFeature {
  return f.type === 'cunning_action'
}

export function isExtraAttackFeature(f: ClassFeature): f is ExtraAttackFeature {
  return f.type === 'extra_attack'
}

export function isImprovedCriticalFeature(f: ClassFeature): f is ImprovedCriticalFeature {
  return f.type === 'improved_critical'
}

export function isGenericClassFeature(f: ClassFeature): f is GenericClassFeature {
  return f.type === 'generic'
}

export function isWeaponMasteryFeature(f: ClassFeature): f is WeaponMasteryFeature {
  return f.type === 'weapon_mastery'
}

export function isCombatSuperiorityFeature(f: ClassFeature): f is CombatSuperiorityFeature {
  return f.type === 'combat_superiority'
}

export function isRelentlessFeature(f: ClassFeature): f is RelentlessFeature {
  return f.type === 'relentless'
}
