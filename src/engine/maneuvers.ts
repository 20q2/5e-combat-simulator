// ============================================
// Battle Master Maneuver Engine
// ============================================

import type { Combatant, Character, Grid, AbilityName, DamageType } from '@/types'
import type { CombatSuperiorityFeature, RelentlessFeature } from '@/types/classFeature'
import { isCombatSuperiorityFeature, isRelentlessFeature } from '@/types/classFeature'
import type { Maneuver, ManeuverResult } from '@/types/maneuver'
import { getManeuverById } from '@/data/maneuvers'
import { getAbilityModifier, getProficiencyBonus } from '@/types'
import { roll } from './dice'

// ============================================
// Feature Detection
// ============================================

/**
 * Get the Combat Superiority feature for a combatant
 */
export function getCombatSuperiorityFeature(combatant: Combatant): CombatSuperiorityFeature | undefined {
  if (combatant.type !== 'character') return undefined
  const character = combatant.data as Character

  // Check class features
  for (const feature of character.class.features) {
    if (isCombatSuperiorityFeature(feature) && feature.level <= character.level) {
      return feature
    }
  }

  // Check subclass features
  if (character.subclass) {
    for (const feature of character.subclass.features) {
      if (isCombatSuperiorityFeature(feature) && feature.level <= character.level) {
        return feature
      }
    }
  }

  return undefined
}

/**
 * Get the Relentless feature for a combatant
 */
export function getRelentlessFeature(combatant: Combatant): RelentlessFeature | undefined {
  if (combatant.type !== 'character') return undefined
  const character = combatant.data as Character

  // Check subclass features (Relentless is a Battle Master feature)
  if (character.subclass) {
    for (const feature of character.subclass.features) {
      if (isRelentlessFeature(feature) && feature.level <= character.level) {
        return feature
      }
    }
  }

  return undefined
}

/**
 * Check if combatant has Combat Superiority
 */
export function hasCombatSuperiority(combatant: Combatant): boolean {
  return getCombatSuperiorityFeature(combatant) !== undefined
}

// ============================================
// Superiority Dice Calculations
// ============================================

/**
 * Get the superiority die size for a combatant based on level
 * Returns 8, 10, or 12 based on level progression
 */
export function getSuperiorityDieSize(combatant: Combatant): number {
  const feature = getCombatSuperiorityFeature(combatant)
  if (!feature) return 0

  const character = combatant.data as Character
  const level = character.level

  // Check for level scaling
  if (feature.superiorityDieSizeAtLevels) {
    let dieSize = feature.superiorityDieSize
    for (const [lvl, size] of Object.entries(feature.superiorityDieSizeAtLevels)) {
      if (level >= parseInt(lvl)) {
        dieSize = size
      }
    }
    return dieSize
  }

  return feature.superiorityDieSize
}

/**
 * Get the maximum number of superiority dice for a combatant
 */
export function getMaxSuperiorityDice(combatant: Combatant): number {
  const feature = getCombatSuperiorityFeature(combatant)
  if (!feature) return 0

  const character = combatant.data as Character
  const level = character.level

  // Check for level scaling
  if (feature.superiorityDiceAtLevels) {
    let diceCount = feature.superiorityDiceCount
    for (const [lvl, count] of Object.entries(feature.superiorityDiceAtLevels)) {
      if (level >= parseInt(lvl)) {
        diceCount = count
      }
    }
    return diceCount
  }

  return feature.superiorityDiceCount
}

/**
 * Get the number of maneuvers known for a combatant
 */
export function getManeuversKnownCount(combatant: Combatant): number {
  const feature = getCombatSuperiorityFeature(combatant)
  if (!feature) return 0

  const character = combatant.data as Character
  const level = character.level

  // Check for level scaling
  if (feature.maneuversKnownAtLevels) {
    let count = feature.maneuversKnown
    for (const [lvl, maneuverCount] of Object.entries(feature.maneuversKnownAtLevels)) {
      if (level >= parseInt(lvl)) {
        count = maneuverCount
      }
    }
    return count
  }

  return feature.maneuversKnown
}

/**
 * Initialize superiority dice count for combat start
 */
export function initializeSuperiorityDice(combatant: Combatant): number {
  return getMaxSuperiorityDice(combatant)
}

/**
 * Check and apply Relentless feature at initiative roll
 * Returns true if a die was regained
 */
export function checkRelentless(combatant: Combatant): boolean {
  const relentless = getRelentlessFeature(combatant)
  if (!relentless) return false

  // Relentless triggers when rolling initiative with 0 dice
  if (combatant.superiorityDiceRemaining === 0) {
    return true // Caller should set superiorityDiceRemaining to 1
  }

  return false
}

// ============================================
// Maneuver Save DC
// ============================================

/**
 * Calculate maneuver save DC
 * DC = 8 + proficiency bonus + Strength or Dexterity modifier (whichever is higher)
 */
export function getManeuverSaveDC(combatant: Combatant): number {
  if (combatant.type !== 'character') return 10
  const character = combatant.data as Character

  const strMod = getAbilityModifier(character.abilityScores.strength)
  const dexMod = getAbilityModifier(character.abilityScores.dexterity)
  const profBonus = getProficiencyBonus(character.level)

  return 8 + profBonus + Math.max(strMod, dexMod)
}

// ============================================
// Superiority Die Rolling
// ============================================

/**
 * Roll a superiority die for a combatant
 */
export function rollSuperiorityDie(combatant: Combatant): { total: number; rolls: number[]; dieSize: number } {
  const dieSize = getSuperiorityDieSize(combatant)
  if (dieSize === 0) {
    return { total: 0, rolls: [], dieSize: 0 }
  }

  const result = roll(`1d${dieSize}`)
  return {
    total: result.total,
    rolls: result.rolls,
    dieSize,
  }
}

// ============================================
// Maneuver Availability
// ============================================

/**
 * Check if a combatant can use a specific maneuver
 */
export function canUseManeuver(
  combatant: Combatant,
  maneuverId: string
): { canUse: boolean; reason?: string } {
  // Must have Combat Superiority
  if (!hasCombatSuperiority(combatant)) {
    return { canUse: false, reason: 'No Combat Superiority feature' }
  }

  // Must have superiority dice remaining
  if (combatant.superiorityDiceRemaining <= 0) {
    return { canUse: false, reason: 'No superiority dice remaining' }
  }

  // Must know the maneuver
  const character = combatant.data as Character
  if (!character.knownManeuverIds?.includes(maneuverId)) {
    return { canUse: false, reason: 'Maneuver not known' }
  }

  // Check reaction availability for reaction maneuvers
  const maneuver = getManeuverById(maneuverId)
  if (!maneuver) {
    return { canUse: false, reason: 'Maneuver not found' }
  }

  if (maneuver.trigger === 'reaction' && combatant.hasReacted) {
    return { canUse: false, reason: 'Reaction already used' }
  }

  return { canUse: true }
}

/**
 * Get all maneuvers available to a combatant for a specific trigger type
 */
export function getAvailableManeuvers(
  combatant: Combatant,
  trigger: Maneuver['trigger']
): Maneuver[] {
  if (combatant.type !== 'character') return []
  const character = combatant.data as Character

  if (!character.knownManeuverIds || character.knownManeuverIds.length === 0) {
    return []
  }

  const maneuvers: Maneuver[] = []
  for (const id of character.knownManeuverIds) {
    const maneuver = getManeuverById(id)
    if (maneuver && maneuver.trigger === trigger) {
      const { canUse } = canUseManeuver(combatant, id)
      if (canUse) {
        maneuvers.push(maneuver)
      }
    }
  }

  return maneuvers
}

// ============================================
// Saving Throw Resolution
// ============================================

/**
 * Make a saving throw for a maneuver effect
 */
export function makeManeuverSavingThrow(
  target: Combatant,
  saveDC: number,
  ability: AbilityName
): { success: boolean; roll: number; total: number } {
  // Get target's ability modifier
  let abilityScore: number
  if (target.type === 'character') {
    const char = target.data as Character
    abilityScore = char.abilityScores[ability]
  } else {
    const monster = target.data
    abilityScore = (monster as { abilityScores: Record<AbilityName, number> }).abilityScores[ability]
  }

  const abilityMod = getAbilityModifier(abilityScore)

  // Roll the save
  const saveRoll = roll('1d20')
  const total = saveRoll.total + abilityMod

  return {
    success: total >= saveDC,
    roll: saveRoll.rolls[0],
    total,
  }
}

// ============================================
// Maneuver Application
// ============================================

/**
 * Apply an on-hit maneuver effect
 * Returns the result including damage bonus and any effects
 */
export function applyOnHitManeuver(
  attacker: Combatant,
  target: Combatant,
  maneuver: Maneuver,
  _grid: Grid,
  _allCombatants: Combatant[]
): ManeuverResult {
  // Roll superiority die
  const dieRoll = rollSuperiorityDie(attacker)

  const result: ManeuverResult = {
    success: true,
    maneuverId: maneuver.id,
    maneuverName: maneuver.name,
    superiorityDieRoll: dieRoll.total,
    superiorityDieSize: dieRoll.dieSize,
    message: '',
  }

  // Add damage bonus if applicable
  if (maneuver.addsDamageDie) {
    result.bonusDamage = dieRoll.total
  }

  // Handle saving throw if required
  if (maneuver.savingThrow) {
    const saveDC = getManeuverSaveDC(attacker)
    const saveResult = makeManeuverSavingThrow(target, saveDC, maneuver.savingThrow.ability)

    result.savingThrowMade = saveResult.success

    if (!saveResult.success) {
      // Apply condition if there is one
      if (maneuver.condition) {
        result.conditionApplied = maneuver.condition
      }

      // Apply push if applicable
      if (maneuver.pushDistance) {
        result.pushApplied = true
      }
    }

    result.message = `${attacker.name} uses ${maneuver.name}! ` +
      `${result.bonusDamage ? `+${result.bonusDamage} damage. ` : ''}` +
      `${target.name} ${saveResult.success ? 'succeeds' : 'fails'} the ${maneuver.savingThrow.ability.toUpperCase()} save (${saveResult.total} vs DC ${saveDC}).` +
      `${!saveResult.success && result.conditionApplied ? ` ${target.name} is ${result.conditionApplied}!` : ''}` +
      `${!saveResult.success && result.pushApplied ? ` ${target.name} is pushed ${maneuver.pushDistance} feet!` : ''}`
  } else {
    result.message = `${attacker.name} uses ${maneuver.name}!` +
      `${result.bonusDamage ? ` +${result.bonusDamage} damage.` : ''}`
  }

  return result
}

/**
 * Apply Parry reaction (damage reduction)
 */
export function applyParry(
  defender: Combatant,
  incomingDamage: number
): ManeuverResult {
  // Roll superiority die
  const dieRoll = rollSuperiorityDie(defender)

  // Get Dexterity modifier
  let dexMod = 0
  if (defender.type === 'character') {
    const char = defender.data as Character
    dexMod = getAbilityModifier(char.abilityScores.dexterity)
  }

  const damageReduction = dieRoll.total + dexMod
  const actualReduction = Math.min(damageReduction, incomingDamage)

  return {
    success: true,
    maneuverId: 'parry',
    maneuverName: 'Parry',
    superiorityDieRoll: dieRoll.total,
    superiorityDieSize: dieRoll.dieSize,
    damageReduced: actualReduction,
    message: `${defender.name} uses Parry! Reduces damage by ${actualReduction} (${dieRoll.total} + ${dexMod} DEX).`,
  }
}

/**
 * Apply Precision Attack (attack bonus)
 */
export function applyPrecisionAttack(attacker: Combatant): ManeuverResult {
  const dieRoll = rollSuperiorityDie(attacker)

  return {
    success: true,
    maneuverId: 'precision-attack',
    maneuverName: 'Precision Attack',
    superiorityDieRoll: dieRoll.total,
    superiorityDieSize: dieRoll.dieSize,
    attackBonus: dieRoll.total,
    message: `${attacker.name} uses Precision Attack! +${dieRoll.total} to attack roll.`,
  }
}

/**
 * Apply Riposte reaction (counter-attack)
 * Note: The actual attack is resolved separately; this just handles the superiority die bonus
 */
export function prepareRiposte(attacker: Combatant): ManeuverResult {
  const dieRoll = rollSuperiorityDie(attacker)

  return {
    success: true,
    maneuverId: 'riposte',
    maneuverName: 'Riposte',
    superiorityDieRoll: dieRoll.total,
    superiorityDieSize: dieRoll.dieSize,
    bonusDamage: dieRoll.total,
    message: `${attacker.name} uses Riposte! +${dieRoll.total} damage if the attack hits.`,
  }
}

// ============================================
// Sweeping Attack
// ============================================

/**
 * Find a valid sweep target for Sweeping Attack
 * Must be within 5ft of original target, a different enemy, alive, and within attacker's reach
 */
export function findSweepTarget(
  attacker: Combatant,
  originalTarget: Combatant,
  allCombatants: Combatant[]
): Combatant | undefined {
  return allCombatants.find((c) => {
    if (c.id === originalTarget.id || c.id === attacker.id) return false
    if (c.currentHp <= 0) return false
    if (c.type === attacker.type) return false // Must be enemy

    // Must be within 5ft of original target
    const dx = Math.abs(c.position.x - originalTarget.position.x)
    const dy = Math.abs(c.position.y - originalTarget.position.y)
    if (dx > 1 || dy > 1) return false

    // Must be within attacker's reach (adjacent)
    const adx = Math.abs(c.position.x - attacker.position.x)
    const ady = Math.abs(c.position.y - attacker.position.y)
    if (adx > 1 || ady > 1) return false

    return true
  })
}

/**
 * Apply Sweeping Attack - deals superiority die damage to an adjacent enemy
 * if the original attack roll would hit them
 */
export function applySweepingAttack(
  attacker: Combatant,
  originalTarget: Combatant,
  originalAttackTotal: number,
  allCombatants: Combatant[],
  getDamageType: () => DamageType
): ManeuverResult & { sweepTargetId?: string; sweepDamage?: number; sweepDamageType?: DamageType } {
  const dieRoll = rollSuperiorityDie(attacker)
  const sweepTarget = findSweepTarget(attacker, originalTarget, allCombatants)

  if (!sweepTarget) {
    return {
      success: false,
      maneuverId: 'sweeping-attack',
      maneuverName: 'Sweeping Attack',
      superiorityDieRoll: dieRoll.total,
      superiorityDieSize: dieRoll.dieSize,
      message: `${attacker.name} uses Sweeping Attack but there are no valid targets nearby!`,
    }
  }

  // Check if original attack roll would hit sweep target
  const sweepTargetAC = getCombatantACForSweep(sweepTarget)
  if (originalAttackTotal >= sweepTargetAC) {
    const damageType = getDamageType()
    return {
      success: true,
      maneuverId: 'sweeping-attack',
      maneuverName: 'Sweeping Attack',
      superiorityDieRoll: dieRoll.total,
      superiorityDieSize: dieRoll.dieSize,
      sweepTargetId: sweepTarget.id,
      sweepDamage: dieRoll.total,
      sweepDamageType: damageType,
      message: `${attacker.name} uses Sweeping Attack! ${sweepTarget.name} takes ${dieRoll.total} damage!`,
    }
  }

  return {
    success: false,
    maneuverId: 'sweeping-attack',
    maneuverName: 'Sweeping Attack',
    superiorityDieRoll: dieRoll.total,
    superiorityDieSize: dieRoll.dieSize,
    message: `${attacker.name} uses Sweeping Attack but the attack would miss ${sweepTarget.name} (AC ${sweepTargetAC})!`,
  }
}

/** Get AC for sweep target check (reuse getCombatantAC logic) */
function getCombatantACForSweep(combatant: Combatant): number {
  if (combatant.type === 'character') {
    return (combatant.data as Character).ac + (combatant.evasiveFootworkBonus ?? 0)
  }
  return (combatant.data as { ac: number }).ac + (combatant.evasiveFootworkBonus ?? 0)
}

// ============================================
// Bonus Action Maneuvers
// ============================================

/**
 * Apply Evasive Footwork - rolls superiority die for AC bonus
 */
export function applyEvasiveFootwork(combatant: Combatant): ManeuverResult & { acBonus: number } {
  const dieRoll = rollSuperiorityDie(combatant)

  return {
    success: true,
    maneuverId: 'evasive-footwork',
    maneuverName: 'Evasive Footwork',
    superiorityDieRoll: dieRoll.total,
    superiorityDieSize: dieRoll.dieSize,
    acBonus: dieRoll.total,
    message: `${combatant.name} uses Evasive Footwork! +${dieRoll.total} AC and Disengage.`,
  }
}

/**
 * Apply Feinting Attack - rolls superiority die for bonus damage
 */
export function applyFeintingAttack(combatant: Combatant, targetName: string): ManeuverResult {
  const dieRoll = rollSuperiorityDie(combatant)

  return {
    success: true,
    maneuverId: 'feinting-attack',
    maneuverName: 'Feinting Attack',
    superiorityDieRoll: dieRoll.total,
    superiorityDieSize: dieRoll.dieSize,
    bonusDamage: dieRoll.total,
    message: `${combatant.name} feints against ${targetName}! Advantage on next attack with +${dieRoll.total} damage on hit.`,
  }
}

/**
 * Apply Lunging Attack - rolls superiority die for bonus damage
 */
export function applyLungingAttack(combatant: Combatant): ManeuverResult {
  const dieRoll = rollSuperiorityDie(combatant)

  return {
    success: true,
    maneuverId: 'lunging-attack',
    maneuverName: 'Lunging Attack',
    superiorityDieRoll: dieRoll.total,
    superiorityDieSize: dieRoll.dieSize,
    bonusDamage: dieRoll.total,
    message: `${combatant.name} uses Lunging Attack! Dash and +${dieRoll.total} damage if moved 5ft before melee hit.`,
  }
}
