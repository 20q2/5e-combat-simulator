/**
 * Attack Replacement Engine
 *
 * Handles abilities that can replace a weapon attack as part of the Attack action.
 * Per D&D 2024 rules, these count as one attack toward Extra Attack.
 */

import type {
  Combatant,
  AttackReplacement,
  AoEAttackReplacement,
  Character,
} from '@/types'
import {
  getBreathWeapon,
  calculateBreathWeaponDC,
  getBreathWeaponDamage,
} from './racialAbilities'
import { getMaxAttacksPerAction } from './classAbilities'

/**
 * Get all available attack replacements for a combatant
 * This checks racial abilities, class features, and items
 */
export function getAvailableAttackReplacements(combatant: Combatant): AttackReplacement[] {
  const replacements: AttackReplacement[] = []

  // Check for breath weapon (racial ability)
  const breathWeaponReplacement = getBreathWeaponReplacement(combatant)
  if (breathWeaponReplacement) {
    replacements.push(breathWeaponReplacement)
  }

  // Future: Check class features (Tavern Brawler, etc.)
  // Future: Check items (magic items with attack replacement effects)

  return replacements
}

/**
 * Build a breath weapon attack replacement from the combatant's racial ability
 */
export function getBreathWeaponReplacement(combatant: Combatant): AoEAttackReplacement | null {
  const { available, ability, usesRemaining } = getBreathWeapon(
    combatant,
    combatant.racialAbilityUses
  )

  if (!ability) return null

  const dc = calculateBreathWeaponDC(combatant, ability)
  const damageDice = getBreathWeaponDamage(combatant, ability)

  return {
    id: `breath-weapon-${ability.id}`,
    name: `Breath Weapon (${capitalize(ability.damageType)})`,
    source: 'racial',
    sourceId: ability.id,
    targetingType: 'aoe',
    aoeType: ability.shape,
    aoeSize: ability.size,
    damageType: ability.damageType,
    damageDice,
    savingThrow: ability.savingThrow,
    dcAbility: ability.dcAbility,
    dc,
    usesRemaining: available ? usesRemaining : 0,
    maxUses: ability.maxUses ?? null,
  }
}

/**
 * Check if an attack replacement can be used
 */
export function canUseAttackReplacement(
  combatant: Combatant,
  replacement: AttackReplacement
): boolean {
  // Check uses remaining
  if (replacement.usesRemaining !== null && replacement.usesRemaining <= 0) {
    return false
  }

  // Check if combatant has attacks remaining
  const maxAttacks = getMaxAttacksPerAction(combatant)
  if (combatant.attacksMadeThisTurn >= maxAttacks) {
    return false
  }

  // Check action economy - must not have used action for something else
  // (unless already in an attack sequence)
  if (combatant.hasActed && combatant.attacksMadeThisTurn === 0) {
    return false
  }

  return true
}

/**
 * Get an attack replacement by ID
 */
export function getAttackReplacementById(
  combatant: Combatant,
  replacementId: string
): AttackReplacement | null {
  const replacements = getAvailableAttackReplacements(combatant)
  return replacements.find(r => r.id === replacementId) ?? null
}

/**
 * Get the source ability ID from an attack replacement
 * Used to decrement uses
 */
export function getReplacementSourceId(replacement: AttackReplacement): string {
  return replacement.sourceId
}

/**
 * Helper to capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Check if a combatant has any usable attack replacements
 */
export function hasUsableAttackReplacements(combatant: Combatant): boolean {
  const replacements = getAvailableAttackReplacements(combatant)
  return replacements.some(r => canUseAttackReplacement(combatant, r))
}

/**
 * Get character level for scaling purposes
 */
export function getCharacterLevel(combatant: Combatant): number {
  if (combatant.type !== 'character') return 1
  return (combatant.data as Character).level
}
