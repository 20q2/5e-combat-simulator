import type { DamageType, AbilityName } from './index'

/**
 * Attack Replacement System
 *
 * Attack replacements are abilities that can be used in place of a weapon attack.
 * Per D&D 2024 rules, they count as one attack toward the Attack action.
 *
 * Examples:
 * - Dragonborn Breath Weapon (AoE, save-based)
 * - Future: Unarmed strike improvements, Tavern Brawler, etc.
 */

export interface AttackReplacementBase {
  id: string
  name: string
  source: 'racial' | 'class' | 'item'
  sourceId: string  // The ability ID this comes from (e.g., 'dragonborn-breath-weapon')
  usesRemaining: number | null  // null = unlimited
  maxUses: number | null
}

/**
 * AoE attack replacement (breath weapons, etc.)
 * Uses saving throws instead of attack rolls
 */
export interface AoEAttackReplacement extends AttackReplacementBase {
  targetingType: 'aoe'
  aoeType: 'cone' | 'line' | 'sphere' | 'cube'
  aoeSize: number  // in feet
  damageType: DamageType
  damageDice: string
  savingThrow: AbilityName
  dcAbility: AbilityName
  dc: number  // Pre-calculated DC
}

/**
 * Single-target attack replacement (unarmed improvements, etc.)
 * May use attack rolls or auto-hit
 */
export interface SingleTargetAttackReplacement extends AttackReplacementBase {
  targetingType: 'single'
  range: number
  damage: string
  damageType: DamageType
  usesAttackRoll: boolean
  attackAbility?: AbilityName | 'finesse'
}

export type AttackReplacement = AoEAttackReplacement | SingleTargetAttackReplacement

// Type guards
export function isAoEAttackReplacement(r: AttackReplacement): r is AoEAttackReplacement {
  return r.targetingType === 'aoe'
}

export function isSingleTargetAttackReplacement(r: AttackReplacement): r is SingleTargetAttackReplacement {
  return r.targetingType === 'single'
}

/**
 * Result of executing an AoE attack replacement
 */
export interface AoEAttackResult {
  attackerId: string
  replacementId: string
  replacementName: string
  damageRolled: number
  damageType: DamageType
  dc: number
  savingThrow: AbilityName
  targets: AoETargetResult[]
}

export interface AoETargetResult {
  targetId: string
  targetName: string
  saveRoll: number
  saveTotal: number
  saved: boolean
  damageDealt: number
  resistanceApplied: boolean
}
