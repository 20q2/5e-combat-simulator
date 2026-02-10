// ============================================
// Origin Feat Combat Engine
// ============================================
// Combat logic for origin feats: Alert, Healer, Lucky, Savage Attacker, Tavern Brawler

import type { Combatant, Character, Position, Grid, Weapon, DamageType } from '@/types'
import type { OriginFeatCombat } from '@/types/originFeat'
import type { OriginFeatId } from '@/data/originFeats'
import { getOriginFeatCombatData } from '@/data/originFeats'
import { roll, rollDamage, type DiceRollResult } from './dice'
import { getAbilityModifier } from '@/types'

// ============================================
// Generic Feat Detection Helpers
// ============================================

/**
 * Get all combat-relevant origin feats for a combatant
 */
export function getCombatantOriginFeats(combatant: Combatant): OriginFeatCombat[] {
  if (combatant.type !== 'character') return []
  const character = combatant.data as Character

  return character.originFeats
    .map(id => getOriginFeatCombatData(id))
    .filter((f): f is OriginFeatCombat => f !== null)
}

/**
 * Check if a combatant has a specific origin feat
 */
export function hasFeat(combatant: Combatant, featId: OriginFeatId): boolean {
  if (combatant.type !== 'character') return false
  const character = combatant.data as Character
  return character.originFeats.includes(featId)
}

/**
 * Get the character's proficiency bonus
 */
function getCharacterProficiency(combatant: Combatant): number {
  if (combatant.type !== 'character') return 0
  const character = combatant.data as Character
  return character.proficiencyBonus
}

// ============================================
// Alert Feat
// ============================================

/**
 * Get the Alert initiative bonus (proficiency bonus)
 */
export function getAlertInitiativeBonus(combatant: Combatant): number {
  if (!hasFeat(combatant, 'alert')) return 0
  return getCharacterProficiency(combatant)
}

/**
 * Check if combatant can swap initiative (Alert feat, not incapacitated)
 */
export function canSwapInitiative(combatant: Combatant): boolean {
  if (!hasFeat(combatant, 'alert')) return false
  // Cannot swap if incapacitated
  return !combatant.conditions.some(c => c.condition === 'incapacitated')
}

/**
 * Get eligible allies for initiative swap
 * - Same team as swapper
 * - Not incapacitated
 * - Not self
 */
export function getEligibleSwapTargets(
  swapper: Combatant,
  allCombatants: Combatant[]
): Combatant[] {
  if (!canSwapInitiative(swapper)) return []

  return allCombatants.filter(c =>
    c.id !== swapper.id &&
    c.type === swapper.type &&
    !c.conditions.some(cond => cond.condition === 'incapacitated')
  )
}

// ============================================
// Healer Feat
// ============================================

/**
 * Check if Battle Medic can be used (has feat, hasn't used action, has adjacent ally)
 */
export function canUseBattleMedic(combatant: Combatant): boolean {
  if (!hasFeat(combatant, 'healer')) return false
  if (combatant.hasActed) return false
  return true
}

/**
 * Get valid targets for Battle Medic healing
 * - Same team (or self)
 * - Within 5ft (adjacent) or self
 * - HP below max (wounded)
 * - Not unconscious
 */
export function getBattleMedicTargets(
  healer: Combatant,
  allCombatants: Combatant[]
): Combatant[] {
  if (!canUseBattleMedic(healer)) return []

  return allCombatants.filter(c => {
    // Can target self
    if (c.id === healer.id) {
      // Self must be wounded but not dying
      return c.currentHp < c.maxHp && c.currentHp > 0
    }

    // For allies: same team, wounded, not dead
    if (c.type !== healer.type) return false // Same team
    if (c.currentHp >= c.maxHp) return false // Must be wounded
    if (c.currentHp <= 0) return false // Can't heal dead/dying

    // Check adjacency (within 5ft = 1 square)
    const dx = Math.abs(c.position.x - healer.position.x)
    const dy = Math.abs(c.position.y - healer.position.y)
    return dx <= 1 && dy <= 1
  })
}

/**
 * Roll Battle Medic healing
 * Target expends one Hit Die, healer rolls it, target regains roll + proficiency
 */
export function rollBattleMedicHealing(
  healer: Combatant,
  targetHitDie: number  // d6, d8, d10, d12
): { total: number; rolls: number[]; rerolled: boolean; breakdown: string } {
  const profBonus = getCharacterProficiency(healer)

  // Roll the hit die
  let result = roll(`1d${targetHitDie}`)
  let rerolled = false

  // Healing Rerolls benefit: reroll 1s
  if (result.rolls[0] === 1) {
    result = roll(`1d${targetHitDie}`)
    rerolled = true
  }

  const total = result.total + profBonus
  const breakdown = rerolled
    ? `[${result.rolls[0]}] (rerolled 1) + ${profBonus} = ${total}`
    : `[${result.rolls[0]}] + ${profBonus} = ${total}`

  return {
    total,
    rolls: result.rolls,
    rerolled,
    breakdown,
  }
}

/**
 * Apply healing reroll to any healing dice (for spells with Healer feat)
 * Rerolls 1s on healing dice
 */
export function applyHealingReroll(
  rolls: number[],
  dieSize: number
): { newRolls: number[]; rerolled: boolean } {
  let rerolled = false
  const newRolls = rolls.map(r => {
    if (r === 1) {
      rerolled = true
      return roll(`1d${dieSize}`).rolls[0]
    }
    return r
  })
  return { newRolls, rerolled }
}

// ============================================
// Lucky Feat
// ============================================

/**
 * Get max luck points for a combatant (equals proficiency bonus)
 */
export function getLuckPoints(combatant: Combatant): number {
  if (!hasFeat(combatant, 'lucky')) return 0
  return getCharacterProficiency(combatant)
}

/**
 * Get remaining luck points
 */
export function getLuckPointsRemaining(
  combatant: Combatant,
  featUses: Record<string, number>
): number {
  const maxPoints = getLuckPoints(combatant)
  if (maxPoints === 0) return 0
  return featUses['lucky'] ?? maxPoints
}

/**
 * Check if a luck point can be spent
 */
export function canUseLuckPoint(
  combatant: Combatant,
  featUses: Record<string, number>
): boolean {
  return getLuckPointsRemaining(combatant, featUses) > 0
}

// ============================================
// Savage Attacker Feat
// ============================================

/**
 * Check if Savage Attacker can be used (has feat, not used this turn)
 */
export function canUseSavageAttacker(combatant: Combatant): boolean {
  if (!hasFeat(combatant, 'savage-attacker')) return false
  return !combatant.usedSavageAttackerThisTurn
}

/**
 * Roll weapon damage twice for Savage Attacker
 * Returns both rolls so player can choose
 */
export function rollSavageAttackerDamage(
  damageExpression: string,
  isCritical: boolean = false
): {
  roll1: DiceRollResult
  roll2: DiceRollResult
  better: 'roll1' | 'roll2'
} {
  const roll1 = rollDamage(damageExpression, isCritical)
  const roll2 = rollDamage(damageExpression, isCritical)

  return {
    roll1,
    roll2,
    better: roll1.total >= roll2.total ? 'roll1' : 'roll2',
  }
}

// ============================================
// Tavern Brawler Feat
// ============================================

/**
 * Check if a weapon is an unarmed strike
 */
export function isUnarmedStrike(weapon: Weapon | undefined): boolean {
  return weapon === undefined || weapon.id === 'unarmed'
}

/**
 * Check if combatant has Tavern Brawler feat
 */
export function hasTavernBrawler(combatant: Combatant): boolean {
  return hasFeat(combatant, 'tavern-brawler')
}

/**
 * Get Tavern Brawler unarmed damage expression (1d4 + STR)
 */
export function getTavernBrawlerDamage(combatant: Combatant): string {
  if (!hasTavernBrawler(combatant)) return '1'
  if (combatant.type !== 'character') return '1'
  const character = combatant.data as Character
  const strMod = getAbilityModifier(character.abilityScores.strength)
  const modStr = strMod >= 0 ? `+${strMod}` : `${strMod}`
  return `1d4${modStr}`
}

/**
 * Roll Tavern Brawler unarmed damage with reroll 1s
 */
export function rollTavernBrawlerDamage(
  combatant: Combatant,
  isCritical: boolean = false
): { total: number; rolls: number[]; rerolled: boolean; breakdown: string } {
  if (combatant.type !== 'character') return { total: 0, rolls: [], rerolled: false, breakdown: '0' }
  const character = combatant.data as Character
  const strMod = getAbilityModifier(character.abilityScores.strength)

  // Roll 1d4 (or 2d4 on crit)
  const diceCount = isCritical ? 2 : 1
  let result = roll(`${diceCount}d4`)
  let rerolled = false

  // Reroll 1s
  const newRolls = result.rolls.map(r => {
    if (r === 1) {
      rerolled = true
      return roll('1d4').rolls[0]
    }
    return r
  })

  const rollTotal = newRolls.reduce((sum, r) => sum + r, 0)
  const total = rollTotal + strMod

  const modStr = strMod >= 0 ? `+${strMod}` : `${strMod}`
  const critPrefix = isCritical ? 'CRIT! ' : ''
  const rerollNote = rerolled ? ' (rerolled 1s)' : ''
  const breakdown = `${critPrefix}[${newRolls.join(', ')}]${modStr}${rerollNote} = ${total}`

  return {
    total,
    rolls: newRolls,
    rerolled,
    breakdown,
  }
}

/**
 * Check if Tavern Brawler push can be used (once per turn)
 */
export function canTavernBrawlerPush(combatant: Combatant): boolean {
  if (!hasTavernBrawler(combatant)) return false
  return !combatant.usedTavernBrawlerPushThisTurn
}

/**
 * Calculate push position (5ft away from attacker)
 */
export function calculatePushPosition(
  attacker: Combatant,
  target: Combatant,
  grid: Grid
): Position | null {
  // Calculate direction from attacker to target
  const dx = target.position.x - attacker.position.x
  const dy = target.position.y - attacker.position.y

  // Normalize to unit direction
  const length = Math.sqrt(dx * dx + dy * dy)
  if (length === 0) return null

  const dirX = Math.round(dx / length)
  const dirY = Math.round(dy / length)

  // Push 5ft = 1 square
  const newX = target.position.x + dirX
  const newY = target.position.y + dirY

  // Check bounds
  if (newX < 0 || newX >= grid.width || newY < 0 || newY >= grid.height) {
    return null  // Cannot push off map
  }

  // Check cell is valid
  const cell = grid.cells[newY]?.[newX]
  if (!cell) return null

  // Check for obstacles
  if (cell.obstacle?.blocksMovement) {
    return null  // Cannot push into blocking obstacle
  }

  // Check if occupied
  if (cell.occupiedBy) {
    return null  // Cannot push into occupied space
  }

  return { x: newX, y: newY }
}

// ============================================
// Feat Usage Tracking
// ============================================

/**
 * Initialize feat uses for a combatant at combat start
 */
export function initializeFeatUses(combatant: Combatant): Record<string, number> {
  const uses: Record<string, number> = {}

  // Lucky: starts with proficiency bonus luck points
  if (hasFeat(combatant, 'lucky')) {
    uses['lucky'] = getLuckPoints(combatant)
  }

  return uses
}

/**
 * Use a feat charge (decrement uses)
 */
export function useFeatCharge(
  featId: string,
  featUses: Record<string, number>,
  maxUses: number
): Record<string, number> {
  const current = featUses[featId] ?? maxUses
  return {
    ...featUses,
    [featId]: Math.max(0, current - 1),
  }
}

/**
 * Get combatant's damage type for unarmed strike
 */
export function getUnarmedDamageType(): DamageType {
  return 'bludgeoning'
}

// ============================================
// Musician Feat (Heroic Inspiration)
// ============================================

/**
 * Check if combatant has the Musician feat
 */
export function hasMusician(combatant: Combatant): boolean {
  return hasFeat(combatant, 'musician')
}

/**
 * Check if a combatant starts combat with Heroic Inspiration
 * (Musician feat grants this)
 */
export function startsWithHeroicInspiration(combatant: Combatant): boolean {
  // Musician feat or being a human grants Heroic Inspiration at combat start
  if (hasMusician(combatant)) return true
  if (combatant.type === 'character') {
    const character = combatant.data as Character
    if (character.race.id === 'human') return true
  }
  return false
}

/**
 * Check if combatant can use Heroic Inspiration
 * (has it and hasn't used it yet)
 */
export function canUseHeroicInspiration(combatant: Combatant): boolean {
  return combatant.heroicInspiration === true
}
