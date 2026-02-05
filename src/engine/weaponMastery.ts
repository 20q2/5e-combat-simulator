import type { Combatant, Character, Weapon, WeaponMastery, Position, Grid } from '@/types'
import { isWeaponMasteryFeature, getAbilityModifier } from '@/types'
import { getDistanceBetweenPositions } from '@/lib/distance'
import { rollCombatantSavingThrow } from './combat'

// ============================================
// Mastery Effect Result Types
// ============================================

export interface MasteryEffectResult {
  mastery: WeaponMastery
  applied: boolean
  description: string
  // Specific effect results
  grazeDamage?: number                    // For graze: damage dealt on miss
  pushResult?: {                          // For push: new position
    newPosition: Position
    distance: number
  }
  cleaveTargets?: Combatant[]             // For cleave: available secondary targets
  toppleResult?: {                        // For topple: save result
    savePassed: boolean
    saveRoll?: number
    saveDC?: number
  }
  slowResult?: {                          // For slow: speed reduction
    speedReduction: number
  }
}

// ============================================
// Core Mastery Functions
// ============================================

/**
 * Check if a combatant has mastered a specific weapon
 */
export function hasMasteredWeapon(combatant: Combatant, weaponId: string): boolean {
  if (combatant.type !== 'character') return false
  const character = combatant.data as Character
  return character.masteredWeaponIds?.includes(weaponId) ?? false
}

/**
 * Get the active mastery property for a weapon if the combatant has mastered it
 */
export function getActiveMastery(combatant: Combatant, weapon: Weapon): WeaponMastery | null {
  if (!weapon.mastery) return null
  if (!hasMasteredWeapon(combatant, weapon.id)) return null
  return weapon.mastery
}

/**
 * Get the maximum number of weapons a combatant can master based on class features
 */
export function getMaxMasteredWeapons(combatant: Combatant): number {
  if (combatant.type !== 'character') return 0
  const character = combatant.data as Character

  // Check class features for weapon mastery
  const allFeatures = [
    ...character.class.features,
    ...(character.subclass?.features ?? []),
  ]

  for (const feature of allFeatures) {
    if (isWeaponMasteryFeature(feature) && feature.level <= character.level) {
      // Get base count
      let count = feature.masteredWeaponCount

      // Check for level scaling
      if (feature.masteredWeaponCountAtLevels) {
        const levels = Object.keys(feature.masteredWeaponCountAtLevels)
          .map(Number)
          .sort((a, b) => b - a) // Descending order

        for (const level of levels) {
          if (character.level >= level) {
            count = feature.masteredWeaponCountAtLevels[level]
            break
          }
        }
      }

      return count
    }
  }

  return 0
}

/**
 * Check if a combatant can use weapon mastery (has the feature)
 */
export function canUseWeaponMastery(combatant: Combatant): boolean {
  return getMaxMasteredWeapons(combatant) > 0
}

// ============================================
// On-Hit Mastery Effects
// ============================================

/**
 * Apply on-hit mastery effects (Push, Sap, Slow, Topple, Vex)
 * Called after a successful attack hit
 */
export function applyOnHitMasteryEffect(
  attacker: Combatant,
  target: Combatant,
  weapon: Weapon,
  grid: Grid,
  allCombatants: Combatant[],
  currentRound: number
): MasteryEffectResult | null {
  const mastery = getActiveMastery(attacker, weapon)
  if (!mastery) return null

  switch (mastery) {
    case 'push':
      return applyPush(attacker, target, grid, allCombatants)

    case 'sap':
      return applySap(target)

    case 'slow':
      return applySlow(target)

    case 'topple':
      return applyTopple(attacker, target)

    case 'vex':
      return applyVex(attacker, target, currentRound)

    case 'cleave':
      // Cleave is handled separately after the main attack
      return {
        mastery: 'cleave',
        applied: false,
        description: 'Cleave available after this attack',
        cleaveTargets: getCleaveTargets(attacker, target, allCombatants, weapon),
      }

    case 'nick':
      // Nick is handled as part of attack action, not on-hit
      return null

    case 'graze':
      // Graze only applies on miss, not on hit
      return null

    default:
      return null
  }
}

/**
 * Apply Push mastery: Push target 10ft away from attacker
 */
function applyPush(
  attacker: Combatant,
  target: Combatant,
  grid: Grid,
  allCombatants: Combatant[]
): MasteryEffectResult {
  // Calculate push direction (away from attacker)
  const dx = target.position.x - attacker.position.x
  const dy = target.position.y - attacker.position.y

  // Normalize to get direction
  const distance = Math.max(Math.abs(dx), Math.abs(dy))
  if (distance === 0) {
    return {
      mastery: 'push',
      applied: false,
      description: 'Target is at same position, cannot push',
    }
  }

  // Push 2 squares (10ft) in the direction away from attacker
  const pushDistance = 2
  const dirX = dx === 0 ? 0 : dx / Math.abs(dx)
  const dirY = dy === 0 ? 0 : dy / Math.abs(dy)

  let newX = target.position.x
  let newY = target.position.y

  // Try to push the full distance, stopping if blocked
  for (let i = 0; i < pushDistance; i++) {
    const testX = newX + dirX
    const testY = newY + dirY

    // Check bounds
    if (testX < 0 || testX >= grid.width || testY < 0 || testY >= grid.height) {
      break
    }

    // Check if cell is blocked by obstacle
    const cell = grid.cells[testY][testX]
    if (cell.obstacle?.blocksMovement) {
      break
    }

    // Check if cell is occupied by another combatant
    const isOccupied = allCombatants.some(
      c => c.id !== target.id && c.currentHp > 0 && c.position.x === testX && c.position.y === testY
    )
    if (isOccupied) {
      break
    }

    newX = testX
    newY = testY
  }

  const actualDistance = getDistanceBetweenPositions(target.position, { x: newX, y: newY })

  if (actualDistance === 0) {
    return {
      mastery: 'push',
      applied: false,
      description: 'Target could not be pushed (blocked)',
    }
  }

  return {
    mastery: 'push',
    applied: true,
    description: `Pushed ${target.name} ${actualDistance}ft`,
    pushResult: {
      newPosition: { x: newX, y: newY },
      distance: actualDistance,
    },
  }
}

/**
 * Apply Sap mastery: Target has disadvantage on next attack roll
 */
function applySap(target: Combatant): MasteryEffectResult {
  // The 'sapped' condition will be added to the target
  return {
    mastery: 'sap',
    applied: true,
    description: `${target.name} is sapped (disadvantage on next attack)`,
  }
}

/**
 * Apply Slow mastery: Reduce target's speed by 10ft until start of attacker's next turn
 */
function applySlow(target: Combatant): MasteryEffectResult {
  return {
    mastery: 'slow',
    applied: true,
    description: `${target.name}'s speed is reduced by 10ft`,
    slowResult: {
      speedReduction: 10,
    },
  }
}

/**
 * Apply Topple mastery: Target makes CON save or falls prone
 * DC = 8 + proficiency + Str/Dex mod (whichever is used for the attack)
 */
function applyTopple(attacker: Combatant, target: Combatant): MasteryEffectResult {
  // Calculate save DC (8 + proficiency + ability modifier)
  let dc = 8
  if (attacker.type === 'character') {
    const character = attacker.data as Character
    dc += character.proficiencyBonus
    // Use the higher of STR or DEX for the DC (weapon mastery uses attack stat)
    dc += Math.max(
      getAbilityModifier(character.abilityScores.strength),
      getAbilityModifier(character.abilityScores.dexterity)
    )
  } else {
    // Monsters don't typically use weapon mastery, but fallback
    dc = 13
  }

  // Target makes Constitution save
  const saveResult = rollCombatantSavingThrow(target, 'constitution', dc)

  return {
    mastery: 'topple',
    applied: !saveResult.success,
    description: saveResult.success
      ? `${target.name} resisted being toppled (CON save: ${saveResult.roll.total} vs DC ${dc})`
      : `${target.name} is knocked prone (failed CON save: ${saveResult.roll.total} vs DC ${dc})`,
    toppleResult: {
      savePassed: saveResult.success,
      saveRoll: saveResult.roll.total,
      saveDC: dc,
    },
  }
}

/**
 * Apply Vex mastery: Attacker gains advantage on next attack against same target
 * Note: currentRound is used by the caller to set the vexedBy expiration
 */
function applyVex(attacker: Combatant, target: Combatant, _currentRound: number): MasteryEffectResult {
  // The vex effect lasts until the end of the attacker's next turn
  // The caller (combatStore) will set target.vexedBy with the attacker ID and expiration round
  return {
    mastery: 'vex',
    applied: true,
    description: `${attacker.name} has advantage on next attack against ${target.name}`,
  }
}

// ============================================
// Cleave Mastery
// ============================================

/**
 * Get valid targets for Cleave (creatures within 5ft of original target)
 */
export function getCleaveTargets(
  attacker: Combatant,
  originalTarget: Combatant,
  allCombatants: Combatant[],
  weapon: Weapon
): Combatant[] {
  return allCombatants.filter(c => {
    // Must be alive
    if (c.currentHp <= 0) return false
    // Can't be the attacker
    if (c.id === attacker.id) return false
    // Can't be the original target
    if (c.id === originalTarget.id) return false
    // Must be hostile to attacker (different type)
    if (c.type === attacker.type) return false
    // Must be within 5ft of the original target
    const distance = getDistanceBetweenPositions(c.position, originalTarget.position)
    if (distance > 5) return false
    // Must be within weapon reach of attacker
    const attackerDistance = getDistanceBetweenPositions(c.position, attacker.position)
    const reach = weapon.properties.includes('reach') ? 10 : 5
    if (attackerDistance > reach) return false

    return true
  })
}

/**
 * Calculate cleave damage (weapon damage without ability modifier)
 */
export function getCleaveWeaponDamage(weapon: Weapon): string {
  // Cleave damage is weapon damage dice only, no ability modifier
  return weapon.damage
}

// ============================================
// Graze Mastery (On Miss)
// ============================================

/**
 * Calculate Graze damage (ability modifier, minimum 0)
 */
export function getGrazeDamage(attacker: Combatant, weapon: Weapon): number {
  if (attacker.type !== 'character') return 0

  const character = attacker.data as Character
  const isFinesse = weapon.properties.includes('finesse')
  const isRanged = weapon.type === 'ranged'

  let abilityMod: number
  if (isFinesse) {
    abilityMod = Math.max(
      getAbilityModifier(character.abilityScores.strength),
      getAbilityModifier(character.abilityScores.dexterity)
    )
  } else if (isRanged) {
    abilityMod = getAbilityModifier(character.abilityScores.dexterity)
  } else {
    abilityMod = getAbilityModifier(character.abilityScores.strength)
  }

  // Minimum 0 damage
  return Math.max(0, abilityMod)
}

/**
 * Apply Graze mastery effect on a miss
 */
export function applyGrazeOnMiss(
  attacker: Combatant,
  target: Combatant,
  weapon: Weapon
): MasteryEffectResult | null {
  const mastery = getActiveMastery(attacker, weapon)
  if (mastery !== 'graze') return null

  const damage = getGrazeDamage(attacker, weapon)

  return {
    mastery: 'graze',
    applied: damage > 0,
    description: damage > 0
      ? `Graze: ${attacker.name} deals ${damage} ${weapon.damageType} damage to ${target.name}`
      : `Graze: No damage (ability modifier is 0 or negative)`,
    grazeDamage: damage,
  }
}

// ============================================
// Nick Mastery
// ============================================

/**
 * Check if Nick bonus attack is available
 * Nick allows an extra light weapon attack as part of the Attack action
 */
export function canUseNickAttack(
  attacker: Combatant,
  weapon: Weapon
): boolean {
  // Must have Nick mastery on this weapon
  const mastery = getActiveMastery(attacker, weapon)
  if (mastery !== 'nick') return false

  // Must not have used Nick this turn
  if (attacker.usedNickThisTurn) return false

  // Weapon must be light
  if (!weapon.properties.includes('light')) return false

  return true
}

// ============================================
// Vex Mastery - Advantage Check
// ============================================

/**
 * Check if attacker has advantage from Vex mastery against a target
 */
export function hasVexAdvantage(
  attacker: Combatant,
  target: Combatant,
  currentRound: number
): boolean {
  if (!target.vexedBy) return false
  if (target.vexedBy.attackerId !== attacker.id) return false
  if (target.vexedBy.expiresOnRound < currentRound) return false
  return true
}

// ============================================
// Sapped Condition Check
// ============================================

/**
 * Check if a combatant has the sapped condition (disadvantage on next attack)
 */
export function isSapped(combatant: Combatant): boolean {
  return combatant.conditions.some(c => c.condition === 'sapped')
}

/**
 * Get mastery description for UI display
 */
export function getMasteryDescription(mastery: WeaponMastery): string {
  switch (mastery) {
    case 'cleave':
      return 'On hit, make a second attack against another creature within 5ft (no ability modifier to damage). Once per turn.'
    case 'graze':
      return 'On miss, deal damage equal to your ability modifier (minimum 0).'
    case 'nick':
      return 'Make an extra light weapon attack as part of your Attack action. Once per turn.'
    case 'push':
      return 'On hit, push the target 10ft away from you.'
    case 'sap':
      return 'On hit, the target has disadvantage on its next attack roll.'
    case 'slow':
      return "On hit, reduce the target's speed by 10ft until your next turn."
    case 'topple':
      return 'On hit, the target must make a CON save or fall prone.'
    case 'vex':
      return 'On hit, you have advantage on your next attack against that target.'
    default:
      return ''
  }
}
