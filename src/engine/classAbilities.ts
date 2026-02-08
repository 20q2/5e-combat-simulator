import type { Combatant, Character, Weapon, Position } from '@/types'
import type {
  ClassFeature,
  SecondWindFeature,
  FightingStyleFeature,
  SneakAttackFeature,
  ActionSurgeFeature,
  CunningActionFeature,
  ExtraAttackFeature,
  ImprovedCriticalFeature,
  IndomitableFeature,
  TacticalMasterFeature,
  StudiedAttacksFeature,
  FightingStyle,
} from '@/types/classFeature'
import {
  isSecondWindFeature,
  isFightingStyleFeature,
  isSneakAttackFeature,
  isActionSurgeFeature,
  isCunningActionFeature,
  isExtraAttackFeature,
  isImprovedCriticalFeature,
  isIndomitableFeature,
  isTacticalMasterFeature,
  isStudiedAttacksFeature,
} from '@/types/classFeature'
import { roll } from './dice'

// ============================================
// Combatant Feature Access Helpers
// ============================================

/**
 * Get all class features for a combatant (only characters have class features)
 */
export function getCombatantClassFeatures(combatant: Combatant): ClassFeature[] {
  if (combatant.type !== 'character') return []
  const character = combatant.data as Character
  // Handle legacy characters that may not have typed features
  const features = character.class.features ?? []
  // Filter features by level and cast to ClassFeature
  return features.filter(f => f.level <= character.level) as ClassFeature[]
}

/**
 * Get a specific feature type for a combatant
 */
export function getFeatureOfType<T extends ClassFeature>(
  combatant: Combatant,
  typeGuard: (f: ClassFeature) => f is T
): T | undefined {
  const features = getCombatantClassFeatures(combatant)
  return features.find(typeGuard)
}

// ============================================
// Second Wind
// ============================================

/**
 * Get the Second Wind feature for a combatant
 */
export function getSecondWindFeature(combatant: Combatant): SecondWindFeature | undefined {
  return getFeatureOfType(combatant, isSecondWindFeature)
}

/**
 * Get the effective max uses for Second Wind based on character level
 */
export function getSecondWindMaxUses(combatant: Combatant): number {
  const feature = getSecondWindFeature(combatant)
  if (!feature) return 0
  if (feature.maxUses === undefined) return -1 // Unlimited

  // If no level scaling, use base maxUses
  if (!feature.maxUsesAtLevels) return feature.maxUses

  // Get character level
  if (combatant.type !== 'character') return feature.maxUses
  const character = combatant.data as Character
  const level = character.level

  // Find the highest threshold that applies
  let effectiveMax = feature.maxUses
  const thresholds = Object.keys(feature.maxUsesAtLevels)
    .map(Number)
    .sort((a, b) => a - b)

  for (const threshold of thresholds) {
    if (level >= threshold) {
      effectiveMax = feature.maxUsesAtLevels[threshold]
    }
  }

  return effectiveMax
}

/**
 * Check if Second Wind can be used (has uses remaining and hasn't used bonus action)
 */
export function canUseSecondWind(
  combatant: Combatant,
  classFeatureUses: Record<string, number>
): boolean {
  const feature = getSecondWindFeature(combatant)
  if (!feature) return false
  if (combatant.hasBonusActed) return false

  // Check uses remaining
  const maxUses = getSecondWindMaxUses(combatant)
  if (maxUses !== -1) {
    const uses = classFeatureUses[feature.id] ?? maxUses
    if (uses <= 0) return false
  }

  return true
}

/**
 * Roll Second Wind healing
 */
export function rollSecondWind(combatant: Combatant): { total: number; rolls: number[] } {
  const feature = getSecondWindFeature(combatant)
  if (!feature) return { total: 0, rolls: [] }

  const result = roll(feature.healDice)
  let total = result.total

  // Add class level if specified
  if (feature.healBonusPerLevel && combatant.type === 'character') {
    const character = combatant.data as Character
    total += character.level
  }

  return { total, rolls: result.rolls }
}

/**
 * Get remaining Second Wind uses
 */
export function getSecondWindUses(
  combatant: Combatant,
  classFeatureUses: Record<string, number>
): number {
  const feature = getSecondWindFeature(combatant)
  if (!feature) return 0
  const maxUses = getSecondWindMaxUses(combatant)
  if (maxUses === -1) return -1 // Unlimited
  return classFeatureUses[feature.id] ?? maxUses
}

// ============================================
// Fighting Style
// ============================================

/**
 * Get the Fighting Style feature for a combatant
 */
export function getFightingStyleFeature(combatant: Combatant): FightingStyleFeature | undefined {
  return getFeatureOfType(combatant, isFightingStyleFeature)
}

/**
 * Get the active fighting style for a combatant
 * Reads from Character.fightingStyles (player-selected) first, falls back to feature.style
 */
export function getFightingStyle(combatant: Combatant): FightingStyle | undefined {
  if (combatant.type !== 'character') return undefined
  const character = combatant.data as Character

  // Read from the character's selected fighting styles (primary)
  if (character.fightingStyles && character.fightingStyles.length > 0) {
    return character.fightingStyles[0]
  }

  // Fallback to feature's hardcoded style (for backwards compatibility)
  const feature = getFightingStyleFeature(combatant)
  return feature?.style
}

/**
 * Get all fighting styles for a combatant (for Champion with additional style)
 */
export function getAllFightingStyles(combatant: Combatant): FightingStyle[] {
  if (combatant.type !== 'character') return []
  const character = combatant.data as Character
  return character.fightingStyles ?? []
}

/**
 * Check if combatant has a specific fighting style
 */
export function hasFightingStyle(combatant: Combatant, style: FightingStyle): boolean {
  return getAllFightingStyles(combatant).includes(style)
}

/**
 * Get Archery bonus (+2 to ranged attack rolls)
 */
export function getArcheryBonus(combatant: Combatant): number {
  const style = getFightingStyle(combatant)
  return style === 'archery' ? 2 : 0
}

/**
 * Get Dueling damage bonus (+2 damage with one-handed melee weapon, no two-handed)
 */
export function getDuelingBonus(combatant: Combatant, weapon: Weapon | undefined): number {
  const style = getFightingStyle(combatant)
  if (style !== 'dueling') return 0
  if (!weapon) return 0

  // Check if weapon is melee and one-handed (not two-handed or versatile used two-handed)
  if (weapon.type !== 'melee') return 0
  if (weapon.properties.includes('two-handed')) return 0

  // Dueling applies when using one hand - we assume one-handed if not two-handed
  return 2
}

/**
 * Get Defense AC bonus (+1 AC when wearing armor)
 */
export function getDefenseBonus(combatant: Combatant): number {
  const style = getFightingStyle(combatant)
  if (style !== 'defense') return 0

  // Check if wearing armor
  if (combatant.type === 'character') {
    const character = combatant.data as Character
    if (character.equipment?.armor) {
      return 1
    }
  }

  return 0
}

// ============================================
// Sneak Attack
// ============================================

/**
 * Get the Sneak Attack feature for a combatant
 */
export function getSneakAttackFeature(combatant: Combatant): SneakAttackFeature | undefined {
  return getFeatureOfType(combatant, isSneakAttackFeature)
}

/**
 * Get the Sneak Attack dice for the combatant's level
 */
export function getSneakAttackDice(combatant: Combatant): string {
  const feature = getSneakAttackFeature(combatant)
  if (!feature) return '0'

  if (combatant.type !== 'character') return feature.baseDice

  const character = combatant.data as Character
  const level = character.level

  // Find highest scaling threshold that's <= character level
  let dice = feature.baseDice
  if (feature.diceScaling) {
    for (const [lvl, diceStr] of Object.entries(feature.diceScaling)) {
      if (level >= parseInt(lvl)) {
        dice = diceStr
      }
    }
  }

  return dice
}

/**
 * Check if a weapon can be used for Sneak Attack (finesse or ranged)
 */
export function isWeaponValidForSneakAttack(weapon: Weapon | undefined): boolean {
  if (!weapon) return false
  // Finesse or ranged weapons qualify
  return weapon.properties.includes('finesse') || weapon.type === 'ranged'
}

/**
 * Calculate distance between two positions
 */
function getDistance(a: Position, b: Position): number {
  const dx = Math.abs(a.x - b.x)
  const dy = Math.abs(a.y - b.y)
  // D&D diagonal movement: max(dx, dy) * 5
  return Math.max(dx, dy) * 5
}

/**
 * Check if Sneak Attack can be applied
 * Requires: finesse/ranged weapon, AND (advantage OR ally adjacent to target)
 */
export function canSneakAttack(
  attacker: Combatant,
  target: Combatant,
  weapon: Weapon | undefined,
  hasAdvantage: boolean,
  hasDisadvantage: boolean,
  usedSneakAttackThisTurn: boolean,
  combatants: Combatant[]
): boolean {
  // Must have the Sneak Attack feature
  const feature = getSneakAttackFeature(attacker)
  if (!feature) return false

  // Can only use once per turn
  if (usedSneakAttackThisTurn) return false

  // Weapon must be finesse or ranged
  if (!isWeaponValidForSneakAttack(weapon)) return false

  // If we have disadvantage, can't sneak attack
  if (hasDisadvantage) return false

  // Check condition 1: Have advantage
  if (hasAdvantage) return true

  // Check condition 2: Ally within 5ft of target
  const attackerTeam = attacker.type // 'character' or 'monster'
  const hasAllyAdjacent = combatants.some(c => {
    // Must be same team as attacker
    if (c.type !== attackerTeam) return false
    // Can't be the attacker
    if (c.id === attacker.id) return false
    // Must be alive
    if (c.currentHp <= 0) return false
    // Must be within 5ft of target
    const distance = getDistance(c.position, target.position)
    return distance <= 5
  })

  return hasAllyAdjacent
}

/**
 * Roll Sneak Attack damage
 */
export function rollSneakAttackDamage(combatant: Combatant): { total: number; rolls: number[] } {
  const dice = getSneakAttackDice(combatant)
  return roll(dice)
}

// ============================================
// Action Surge
// ============================================

/**
 * Get the Action Surge feature for a combatant
 */
export function getActionSurgeFeature(combatant: Combatant): ActionSurgeFeature | undefined {
  return getFeatureOfType(combatant, isActionSurgeFeature)
}

/**
 * Get max uses for Action Surge (handles level scaling)
 */
export function getActionSurgeMaxUses(combatant: Combatant): number {
  const feature = getActionSurgeFeature(combatant)
  if (!feature) return 0
  if (feature.maxUses === undefined) return 0

  // If no level scaling, use base maxUses
  if (!feature.maxUsesAtLevels) return feature.maxUses

  // Get character level
  if (combatant.type !== 'character') return feature.maxUses
  const character = combatant.data as Character
  const level = character.level

  // Find the highest threshold that applies
  let effectiveMax = feature.maxUses
  const thresholds = Object.keys(feature.maxUsesAtLevels)
    .map(Number)
    .sort((a, b) => a - b)

  for (const threshold of thresholds) {
    if (level >= threshold) {
      effectiveMax = feature.maxUsesAtLevels[threshold]
    }
  }

  return effectiveMax
}

/**
 * Check if Action Surge can be used (has uses remaining and has already used action)
 */
export function canUseActionSurge(
  combatant: Combatant,
  classFeatureUses: Record<string, number>
): boolean {
  const feature = getActionSurgeFeature(combatant)
  if (!feature) return false

  // Check uses remaining
  const maxUses = getActionSurgeMaxUses(combatant)
  if (maxUses <= 0) return false

  const uses = classFeatureUses[feature.id] ?? maxUses
  return uses > 0
}

/**
 * Get remaining Action Surge uses
 */
export function getActionSurgeUses(
  combatant: Combatant,
  classFeatureUses: Record<string, number>
): number {
  const feature = getActionSurgeFeature(combatant)
  if (!feature) return 0
  const maxUses = getActionSurgeMaxUses(combatant)
  if (maxUses <= 0) return 0
  return classFeatureUses[feature.id] ?? maxUses
}

// ============================================
// Cunning Action
// ============================================

/**
 * Get the Cunning Action feature for a combatant
 */
export function getCunningActionFeature(combatant: Combatant): CunningActionFeature | undefined {
  return getFeatureOfType(combatant, isCunningActionFeature)
}

/**
 * Check if combatant has Cunning Action
 */
export function hasCunningAction(combatant: Combatant): boolean {
  return getCunningActionFeature(combatant) !== undefined
}

/**
 * Check if a specific Cunning Action option is available
 */
export function canUseCunningAction(
  combatant: Combatant,
  action: 'dash' | 'disengage' | 'hide'
): boolean {
  const feature = getCunningActionFeature(combatant)
  if (!feature) return false
  if (combatant.hasBonusActed) return false
  return feature.allowedActions.includes(action)
}

// ============================================
// Extra Attack
// ============================================

/**
 * Get the Extra Attack feature for a combatant
 */
export function getExtraAttackFeature(combatant: Combatant): ExtraAttackFeature | undefined {
  return getFeatureOfType(combatant, isExtraAttackFeature)
}

/**
 * Get the maximum number of attacks per Attack action for a combatant
 * Returns 1 for characters without Extra Attack
 * Finds the highest attackCount from all available Extra Attack features
 */
export function getMaxAttacksPerAction(combatant: Combatant): number {
  const features = getCombatantClassFeatures(combatant)
  const extraAttackFeatures = features.filter(isExtraAttackFeature)

  if (extraAttackFeatures.length === 0) return 1

  // Return the highest attackCount
  return Math.max(...extraAttackFeatures.map(f => f.attackCount))
}

/**
 * Check if combatant can make another attack this turn
 */
export function canMakeAnotherAttack(combatant: Combatant): boolean {
  const maxAttacks = getMaxAttacksPerAction(combatant)
  return combatant.attacksMadeThisTurn < maxAttacks
}

/**
 * Check if combatant has used all their attacks (for determining hasActed)
 */
export function hasUsedAllAttacks(combatant: Combatant): boolean {
  const maxAttacks = getMaxAttacksPerAction(combatant)
  return combatant.attacksMadeThisTurn >= maxAttacks
}

// ============================================
// Improved Critical
// ============================================

/**
 * Get the Improved Critical feature for a combatant
 */
export function getImprovedCriticalFeature(combatant: Combatant): ImprovedCriticalFeature | undefined {
  return getFeatureOfType(combatant, isImprovedCriticalFeature)
}

/**
 * Get the critical hit range for a combatant
 * Returns the minimum d20 roll needed for a critical hit
 * Default is 20, Champion Fighter at level 3 has 19, at level 15 has 18
 */
export function getCriticalRange(combatant: Combatant): number {
  const features = getCombatantClassFeatures(combatant)
  const criticalFeatures = features.filter(isImprovedCriticalFeature)

  if (criticalFeatures.length === 0) return 20

  // Return the lowest critical range (best)
  return Math.min(...criticalFeatures.map(f => f.criticalRange))
}

/**
 * Check if a roll is a critical hit for this combatant
 */
export function isCriticalHit(combatant: Combatant, roll: number): boolean {
  const critRange = getCriticalRange(combatant)
  return roll >= critRange
}

// ============================================
// Feature Usage Tracking
// ============================================

/**
 * Initialize class feature uses for a combatant at the start of combat
 */
export function initializeClassFeatureUses(combatant: Combatant): Record<string, number> {
  const uses: Record<string, number> = {}
  const features = getCombatantClassFeatures(combatant)

  for (const feature of features) {
    if (feature.maxUses !== undefined) {
      // Handle Second Wind level scaling
      if (isSecondWindFeature(feature)) {
        uses[feature.id] = getSecondWindMaxUses(combatant)
      } else if (isIndomitableFeature(feature)) {
        // Handle Indomitable level scaling
        uses[feature.id] = getIndomitableMaxUses(combatant)
      } else if (isActionSurgeFeature(feature)) {
        // Handle Action Surge level scaling
        uses[feature.id] = getActionSurgeMaxUses(combatant)
      } else {
        uses[feature.id] = feature.maxUses
      }
    }
  }

  return uses
}

/**
 * Use a class feature (decrement uses)
 */
export function useClassFeature(
  combatant: Combatant,
  featureId: string,
  classFeatureUses: Record<string, number>
): { newUses: Record<string, number>; usesRemaining: number } {
  const features = getCombatantClassFeatures(combatant)
  const feature = features.find(f => f.id === featureId)

  if (!feature || feature.maxUses === undefined) {
    return { newUses: classFeatureUses, usesRemaining: -1 }
  }

  const currentUses = classFeatureUses[featureId] ?? feature.maxUses
  const usesRemaining = Math.max(0, currentUses - 1)

  return {
    newUses: {
      ...classFeatureUses,
      [featureId]: usesRemaining
    },
    usesRemaining
  }
}

// ============================================
// Indomitable
// ============================================

/**
 * Get the Indomitable feature for a combatant
 */
export function getIndomitableFeature(combatant: Combatant): IndomitableFeature | undefined {
  return getFeatureOfType(combatant, isIndomitableFeature)
}

/**
 * Get the effective max uses for Indomitable based on character level
 * Level 9: 1 use, Level 13: 2 uses, Level 17: 3 uses
 */
export function getIndomitableMaxUses(combatant: Combatant): number {
  const feature = getIndomitableFeature(combatant)
  if (!feature) return 0
  if (feature.maxUses === undefined) return 0

  // If no level scaling, use base maxUses
  if (!feature.maxUsesAtLevels) return feature.maxUses

  // Get character level
  if (combatant.type !== 'character') return feature.maxUses
  const character = combatant.data as Character
  const level = character.level

  // Find the highest threshold that applies
  let effectiveMax = feature.maxUses
  const thresholds = Object.keys(feature.maxUsesAtLevels)
    .map(Number)
    .sort((a, b) => a - b)

  for (const threshold of thresholds) {
    if (level >= threshold) {
      effectiveMax = feature.maxUsesAtLevels[threshold]
    }
  }

  return effectiveMax
}

/**
 * Check if Indomitable can be used (has uses remaining and hasn't used reaction)
 */
export function canUseIndomitable(
  combatant: Combatant,
  classFeatureUses: Record<string, number>
): boolean {
  const feature = getIndomitableFeature(combatant)
  if (!feature) return false

  // Indomitable doesn't require reaction to not be used, but we track uses
  const maxUses = getIndomitableMaxUses(combatant)
  if (maxUses <= 0) return false

  const uses = classFeatureUses[feature.id] ?? maxUses
  return uses > 0
}

/**
 * Get remaining Indomitable uses
 */
export function getIndomitableUses(
  combatant: Combatant,
  classFeatureUses: Record<string, number>
): number {
  const feature = getIndomitableFeature(combatant)
  if (!feature) return 0
  const maxUses = getIndomitableMaxUses(combatant)
  if (maxUses <= 0) return 0
  return classFeatureUses[feature.id] ?? maxUses
}

/**
 * Get the Fighter level for Indomitable bonus
 */
export function getIndomitableBonus(combatant: Combatant): number {
  if (combatant.type !== 'character') return 0
  const character = combatant.data as Character
  // Only Fighters get this bonus, check class
  if (character.class.id !== 'fighter') return 0
  return character.level
}

// ============================================
// Tactical Master
// ============================================

/**
 * Get the Tactical Master feature for a combatant
 */
export function getTacticalMasterFeature(combatant: Combatant): TacticalMasterFeature | undefined {
  return getFeatureOfType(combatant, isTacticalMasterFeature)
}

/**
 * Check if combatant has Tactical Master (Fighter level 9+)
 */
export function hasTacticalMaster(combatant: Combatant): boolean {
  return getTacticalMasterFeature(combatant) !== undefined
}

/**
 * Get available replacement masteries for Tactical Master
 */
export function getTacticalMasterMasteries(combatant: Combatant): ('push' | 'sap' | 'slow')[] {
  const feature = getTacticalMasterFeature(combatant)
  return feature?.allowedMasteries ?? []
}

// ============================================
// Studied Attacks (Fighter Level 13)
// ============================================

/**
 * Get the Studied Attacks feature for a combatant
 */
export function getStudiedAttacksFeature(combatant: Combatant): StudiedAttacksFeature | undefined {
  return getFeatureOfType(combatant, isStudiedAttacksFeature)
}

/**
 * Check if combatant has Studied Attacks (Fighter level 13+)
 */
export function hasStudiedAttacks(combatant: Combatant): boolean {
  return getStudiedAttacksFeature(combatant) !== undefined
}
