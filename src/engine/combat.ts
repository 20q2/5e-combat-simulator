import { rollAttack, rollDamage, rollD20, rollDie, type D20RollResult, type DiceRollResult } from './dice'
import { getAbilityModifier } from '@/types'
import type { Combatant, Character, Monster, Weapon, MonsterAction, Condition, Grid, Position, AbilityName } from '@/types'
import { hasLineOfSight } from '@/lib/lineOfSight'
import { getDistanceBetweenPositions } from '@/lib/distance'
import {
  checkSavageAttacks,
  rollSavageAttacksDamage,
  checkSaveAdvantage,
  checkRerollEligible,
  type SaveAdvantageContext,
} from './racialAbilities'
import {
  getDuelingBonus,
  getArcheryBonus,
  getDefenseBonus,
  canSneakAttack,
  rollSneakAttackDamage,
  getCriticalRange,
} from './classAbilities'
import {
  hasTavernBrawler,
  getTavernBrawlerDamage,
} from './originFeats'

// ============================================
// Attack Resolution
// ============================================

export interface AttackResult {
  hit: boolean
  critical: boolean
  criticalMiss: boolean
  attackRoll: D20RollResult
  targetAC: number
  damage?: DiceRollResult
  damageType?: string
  savageAttacksDamage?: { total: number; rolls: number[] }  // Bonus damage from Savage Attacks
  sneakAttackDamage?: { total: number; rolls: number[] }     // Bonus damage from Sneak Attack
  sneakAttackUsed?: boolean                                   // Whether sneak attack was applied
}

export interface MeleeAttackOptions {
  attacker: Combatant
  target: Combatant
  weapon?: Weapon
  monsterAction?: MonsterAction
  advantage?: 'normal' | 'advantage' | 'disadvantage'
  allCombatants?: Combatant[]                                // For Sneak Attack ally check
  usedSneakAttackThisTurn?: boolean                          // Track if sneak attack already used
}

/**
 * Calculate attack bonus for a character using a weapon
 */
export function getCharacterAttackBonus(character: Character, weapon: Weapon): number {
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

  return abilityMod + character.proficiencyBonus
}

/**
 * Calculate damage bonus for a character using a weapon
 */
export function getCharacterDamageBonus(character: Character, weapon: Weapon): number {
  const isFinesse = weapon.properties.includes('finesse')
  const isRanged = weapon.type === 'ranged'

  if (isFinesse) {
    return Math.max(
      getAbilityModifier(character.abilityScores.strength),
      getAbilityModifier(character.abilityScores.dexterity)
    )
  } else if (isRanged) {
    return getAbilityModifier(character.abilityScores.dexterity)
  } else {
    return getAbilityModifier(character.abilityScores.strength)
  }
}

/**
 * Get the AC of a combatant (includes Defense fighting style bonus)
 */
export function getCombatantAC(combatant: Combatant): number {
  let baseAC: number
  if (combatant.type === 'character') {
    baseAC = (combatant.data as Character).ac
  } else {
    baseAC = (combatant.data as Monster).ac
  }

  // Add Defense fighting style bonus (+1 AC when wearing armor)
  const defenseBonus = getDefenseBonus(combatant)

  return baseAC + defenseBonus
}

/**
 * Calculate distance in feet between two combatants using 5-10 diagonal rule
 */
function getDistanceFeet(a: Combatant, b: Combatant): number {
  return getDistanceBetweenPositions(a.position, b.position)
}

/**
 * Check if attacker has advantage or disadvantage
 */
export function getAttackAdvantage(
  attacker: Combatant,
  target: Combatant,
  baseAdvantage: 'normal' | 'advantage' | 'disadvantage' = 'normal',
  isRangedAttack: boolean = false,
  currentRound: number = 0
): 'normal' | 'advantage' | 'disadvantage' {
  let hasAdvantage = baseAdvantage === 'advantage'
  let hasDisadvantage = baseAdvantage === 'disadvantage'

  // Check attacker conditions
  if (attacker.conditions.some((c) => c.condition === 'invisible')) {
    hasAdvantage = true
  }
  if (attacker.conditions.some((c) => c.condition === 'blinded' || c.condition === 'poisoned' || c.condition === 'restrained')) {
    hasDisadvantage = true
  }
  if (attacker.conditions.some((c) => c.condition === 'prone')) {
    // Prone attacker has disadvantage on attacks
    hasDisadvantage = true
  }
  // Check for Sapped condition (from Sap weapon mastery) - attacker has disadvantage
  if (attacker.conditions.some((c) => c.condition === 'sapped')) {
    hasDisadvantage = true
  }

  // Check target conditions
  if (target.conditions.some((c) =>
    c.condition === 'blinded' ||
    c.condition === 'paralyzed' ||
    c.condition === 'restrained' ||
    c.condition === 'stunned' ||
    c.condition === 'unconscious'
  )) {
    hasAdvantage = true
  }
  if (target.conditions.some((c) => c.condition === 'invisible')) {
    hasDisadvantage = true
  }
  if (target.conditions.some((c) => c.condition === 'prone')) {
    // D&D 5e prone rules:
    // - Melee attacks within 5ft have advantage
    // - Ranged attacks and attacks from more than 5ft have disadvantage
    const distance = getDistanceFeet(attacker, target)
    if (isRangedAttack || distance > 5) {
      hasDisadvantage = true
    } else {
      hasAdvantage = true
    }
  }

  // Check if target is dodging - gives disadvantage to attacks against them
  if (target.conditions.some((c) => c.condition === 'dodging')) {
    hasDisadvantage = true
  }

  // Check for Vex mastery advantage (attacker previously hit this target with Vex)
  if (target.vexedBy && target.vexedBy.attackerId === attacker.id && target.vexedBy.expiresOnRound >= currentRound) {
    hasAdvantage = true
  }

  // Advantage and disadvantage cancel out
  if (hasAdvantage && hasDisadvantage) {
    return 'normal'
  } else if (hasAdvantage) {
    return 'advantage'
  } else if (hasDisadvantage) {
    return 'disadvantage'
  }
  return 'normal'
}

/**
 * Resolve a melee or ranged attack
 */
export function resolveAttack(options: MeleeAttackOptions): AttackResult {
  const { attacker, target, weapon, monsterAction, advantage = 'normal', allCombatants = [], usedSneakAttackThisTurn = false } = options

  // Calculate attack bonus
  let attackBonus: number
  let damageExpression: string
  let damageType: string

  if (attacker.type === 'character' && weapon) {
    const character = attacker.data as Character
    attackBonus = getCharacterAttackBonus(character, weapon)

    // Apply Fighting Style: Archery (+2 to ranged attack rolls)
    if (weapon.type === 'ranged') {
      attackBonus += getArcheryBonus(attacker)
    }

    let damageBonus = getCharacterDamageBonus(character, weapon)

    // Apply Fighting Style: Dueling (+2 damage with one-handed melee weapon)
    damageBonus += getDuelingBonus(attacker, weapon)

    // Parse weapon damage and add modifier
    const baseDamage = weapon.damage // e.g., "1d8"
    damageExpression = damageBonus >= 0 ? `${baseDamage}+${damageBonus}` : `${baseDamage}${damageBonus}`
    damageType = weapon.damageType
  } else if (attacker.type === 'monster' && monsterAction) {
    attackBonus = monsterAction.attackBonus ?? 0
    damageExpression = monsterAction.damage ?? '1d4'
    damageType = monsterAction.damageType ?? 'bludgeoning'
  } else {
    // Fallback: unarmed strike
    const strMod = attacker.type === 'character'
      ? getAbilityModifier((attacker.data as Character).abilityScores.strength)
      : getAbilityModifier((attacker.data as Monster).abilityScores.strength)
    attackBonus = strMod

    // Tavern Brawler feat: use 1d4+STR instead of 1+STR
    if (hasTavernBrawler(attacker)) {
      damageExpression = getTavernBrawlerDamage(attacker)
    } else {
      damageExpression = `1+${strMod}`
    }
    damageType = 'bludgeoning'
  }

  // Determine if this is a ranged attack for advantage calculations
  const isRangedAttack = weapon?.type === 'ranged' || (monsterAction?.range?.normal ?? 0) > 5

  // Determine advantage/disadvantage
  const finalAdvantage = getAttackAdvantage(attacker, target, advantage, isRangedAttack)

  // Roll the attack
  const targetAC = getCombatantAC(target)
  let attackRoll = rollAttack(attackBonus, finalAdvantage)

  // Check for Halfling Lucky - reroll 1s on attack rolls
  if (attackRoll.naturalRoll === 1) {
    const rerollCheck = checkRerollEligible(attacker, 'attack', 1)
    if (rerollCheck.canReroll) {
      // Reroll the d20
      const newRoll = rollDie(20)
      const newTotal = newRoll + attackBonus
      const modifierStr = attackBonus > 0 ? `+${attackBonus}` : attackBonus < 0 ? `${attackBonus}` : ''

      // Update the attack roll with the rerolled result
      attackRoll = {
        ...attackRoll,
        naturalRoll: newRoll,
        total: newTotal,
        isNatural1: newRoll === 1,
        isNatural20: newRoll === 20,
        rolls: [...attackRoll.rolls, newRoll],
        breakdown: `Lucky[${attackRoll.rolls[0]}→${newRoll}]${modifierStr} = ${newTotal}`,
      }
    }
  }

  // Check for critical miss (nat 1 always misses)
  if (attackRoll.isNatural1) {
    return {
      hit: false,
      critical: false,
      criticalMiss: true,
      attackRoll,
      targetAC,
    }
  }

  // Check for critical hit (nat 20 always hits and crits, Improved Critical extends to 19-20 or 18-20)
  const criticalRange = getCriticalRange(attacker)
  const isCrit = attackRoll.naturalRoll >= criticalRange

  if (isCrit) {
    const damage = rollDamage(damageExpression, true)

    // Check for Savage Attacks (Half-Orc racial ability)
    const savageCheck = checkSavageAttacks(attacker, true)
    let savageAttacksDamage: { total: number; rolls: number[] } | undefined

    if (savageCheck.hasBonusDamage && savageCheck.ability && weapon) {
      // Get the weapon's damage die for Savage Attacks (should be 1 of the weapon's dice)
      savageAttacksDamage = rollSavageAttacksDamage(savageCheck.ability, `1${weapon.damage.match(/d\d+/)?.[0] || 'd6'}`)
    }

    // Check for Sneak Attack (Rogue class feature)
    // On crit, the attacker has advantage by definition
    const hasAdvantage = true
    const hasDisadvantage = finalAdvantage === 'disadvantage'
    let sneakAttackDamage: { total: number; rolls: number[] } | undefined
    let sneakAttackUsed = false

    if (canSneakAttack(attacker, target, weapon, hasAdvantage, hasDisadvantage, usedSneakAttackThisTurn, allCombatants)) {
      sneakAttackDamage = rollSneakAttackDamage(attacker)
      sneakAttackUsed = true
    }

    return {
      hit: true,
      critical: true,
      criticalMiss: false,
      attackRoll,
      targetAC,
      damage,
      damageType,
      savageAttacksDamage,
      sneakAttackDamage,
      sneakAttackUsed,
    }
  }

  // Normal hit check
  const hit = attackRoll.total >= targetAC
  if (hit) {
    // Check for auto-crit against paralyzed/unconscious targets within 5ft (melee range)
    const targetIsHelpless = target.conditions.some((c) =>
      c.condition === 'paralyzed' || c.condition === 'unconscious'
    )
    const distance = getDistance(attacker, target)
    const isAutoCrit = targetIsHelpless && distance <= 5

    const damage = rollDamage(damageExpression, isAutoCrit)

    // Check for Savage Attacks on auto-crit (Half-Orc racial ability)
    let savageAttacksDamage: { total: number; rolls: number[] } | undefined
    if (isAutoCrit) {
      const savageCheck = checkSavageAttacks(attacker, true)
      if (savageCheck.hasBonusDamage && savageCheck.ability && weapon) {
        savageAttacksDamage = rollSavageAttacksDamage(savageCheck.ability, `1${weapon.damage.match(/d\d+/)?.[0] || 'd6'}`)
      }
    }

    // Check for Sneak Attack (Rogue class feature)
    const hasAdvantage = finalAdvantage === 'advantage'
    const hasDisadvantage = finalAdvantage === 'disadvantage'
    let sneakAttackDamage: { total: number; rolls: number[] } | undefined
    let sneakAttackUsed = false

    if (canSneakAttack(attacker, target, weapon, hasAdvantage, hasDisadvantage, usedSneakAttackThisTurn, allCombatants)) {
      sneakAttackDamage = rollSneakAttackDamage(attacker)
      sneakAttackUsed = true
    }

    return {
      hit: true,
      critical: isAutoCrit,
      criticalMiss: false,
      attackRoll,
      targetAC,
      damage,
      damageType,
      savageAttacksDamage,
      sneakAttackDamage,
      sneakAttackUsed,
    }
  }

  return {
    hit: false,
    critical: false,
    criticalMiss: false,
    attackRoll,
    targetAC,
  }
}

// ============================================
// Distance Calculation
// ============================================

/**
 * Calculate distance between two combatants in feet (using grid)
 */
export function getDistance(a: Combatant, b: Combatant): number {
  const dx = Math.abs(a.position.x - b.position.x)
  const dy = Math.abs(a.position.y - b.position.y)
  // Using Chebyshev distance (diagonal = 1 square = 5ft)
  return Math.max(dx, dy) * 5
}

/**
 * Check if target is within weapon range (distance only, no LOS check)
 */
export function isInRange(attacker: Combatant, target: Combatant, weapon?: Weapon, monsterAction?: MonsterAction): boolean {
  const distance = getDistance(attacker, target)

  if (weapon) {
    if (weapon.type === 'melee') {
      const reach = weapon.properties.includes('reach') ? 10 : 5
      return distance <= reach
    } else {
      // Ranged weapon
      const normalRange = weapon.range?.normal ?? 30
      return distance <= normalRange
    }
  }

  if (monsterAction) {
    if (monsterAction.reach) {
      return distance <= monsterAction.reach
    }
    if (monsterAction.range) {
      return distance <= monsterAction.range.normal
    }
  }

  // Default: melee range (5ft)
  return distance <= 5
}

/**
 * Check if an attack is a ranged attack
 */
export function isRangedAttack(weapon?: Weapon, monsterAction?: MonsterAction): boolean {
  if (weapon) {
    return weapon.type === 'ranged'
  }
  if (monsterAction) {
    return monsterAction.range !== undefined && monsterAction.reach === undefined
  }
  return false
}

export interface CanAttackResult {
  canAttack: boolean
  reason?: 'out_of_range' | 'no_line_of_sight'
  blockedByPosition?: Position
}

/**
 * Check if attacker can attack target (includes range AND line of sight for ranged attacks)
 */
export function canAttackTarget(
  attacker: Combatant,
  target: Combatant,
  grid: Grid,
  weapon?: Weapon,
  monsterAction?: MonsterAction
): CanAttackResult {
  // First check range
  if (!isInRange(attacker, target, weapon, monsterAction)) {
    return { canAttack: false, reason: 'out_of_range' }
  }

  // For ranged attacks, check line of sight
  if (isRangedAttack(weapon, monsterAction)) {
    const hasLOS = hasLineOfSight(grid, attacker.position, target.position)
    if (!hasLOS) {
      return { canAttack: false, reason: 'no_line_of_sight' }
    }
  }

  return { canAttack: true }
}

/**
 * Get the melee range of a weapon (considering reach property)
 */
export function getMeleeRange(weapon?: Weapon, monsterAction?: MonsterAction): number {
  if (weapon && weapon.type === 'melee') {
    return weapon.properties.includes('reach') ? 10 : 5
  }
  if (monsterAction?.reach) {
    return monsterAction.reach
  }
  return 5 // Default melee range
}

/**
 * Select the best weapon for attacking a target based on distance
 * Returns the weapon to use, prioritizing melee when in range
 */
export function selectWeaponForTarget(
  attacker: Combatant,
  target: Combatant,
  grid: Grid,
  meleeWeapon?: Weapon,
  rangedWeapon?: Weapon
): Weapon | undefined {
  const distance = getDistance(attacker, target)

  // Check if melee weapon can reach
  if (meleeWeapon) {
    const meleeRange = getMeleeRange(meleeWeapon)
    if (distance <= meleeRange) {
      return meleeWeapon
    }
  }

  // Check if ranged weapon can reach (and has line of sight)
  if (rangedWeapon) {
    const normalRange = rangedWeapon.range?.normal ?? 30
    if (distance <= normalRange && hasLineOfSight(grid, attacker.position, target.position)) {
      return rangedWeapon
    }
  }

  // If only melee weapon and out of range, still return it (attack will fail with range check)
  if (meleeWeapon && !rangedWeapon) {
    return meleeWeapon
  }

  // If only ranged weapon and can't reach, still return it
  if (rangedWeapon && !meleeWeapon) {
    return rangedWeapon
  }

  return undefined
}

/**
 * Check if ranged attack is at disadvantage (within 5ft of enemy or at long range)
 */
export function hasRangedDisadvantage(attacker: Combatant, target: Combatant, allCombatants: Combatant[], weapon?: Weapon): boolean {
  const distance = getDistance(attacker, target)

  // Check if any hostile combatant is within 5ft
  const isHostileNearby = allCombatants.some((c) => {
    if (c.id === attacker.id) return false
    if (c.type === attacker.type) return false // Same team
    if (c.currentHp <= 0) return false // Dead/unconscious
    return getDistance(attacker, c) <= 5
  })

  if (isHostileNearby) return true

  // Check if at long range
  if (weapon?.range) {
    return distance > weapon.range.normal && distance <= weapon.range.long
  }

  return false
}

// ============================================
// Saving Throws
// ============================================

export interface SavingThrowResult {
  roll: D20RollResult
  success: boolean
  dc: number
  modifier: number
}

/**
 * Get a combatant's saving throw modifier for an ability
 */
export function getSavingThrowModifier(combatant: Combatant, ability: keyof Character['abilityScores']): number {
  const abilityScore = combatant.type === 'character'
    ? (combatant.data as Character).abilityScores[ability]
    : (combatant.data as Monster).abilityScores[ability]

  const baseMod = getAbilityModifier(abilityScore)

  // Check for proficiency (characters) or special saves (monsters)
  if (combatant.type === 'character') {
    const character = combatant.data as Character
    if (character.savingThrowProficiencies.includes(ability)) {
      return baseMod + character.proficiencyBonus
    }
  } else {
    const monster = combatant.data as Monster
    if (monster.savingThrows?.[ability]) {
      return monster.savingThrows[ability]!
    }
  }

  return baseMod
}

/**
 * Roll a saving throw for a combatant
 * Automatically checks for racial save advantages (Fey Ancestry, Brave, Gnome Cunning, etc.)
 */
export function rollCombatantSavingThrow(
  combatant: Combatant,
  ability: AbilityName,
  dc: number,
  advantage: 'normal' | 'advantage' | 'disadvantage' = 'normal',
  context?: SaveAdvantageContext
): SavingThrowResult {
  const modifier = getSavingThrowModifier(combatant, ability)

  // Check for racial save advantage
  let finalAdvantage = advantage
  if (context) {
    const saveAdvantageCheck = checkSaveAdvantage(combatant, ability, context)
    if (saveAdvantageCheck.hasAdvantage) {
      // Racial advantage combines with existing advantage/disadvantage
      if (finalAdvantage === 'disadvantage') {
        finalAdvantage = 'normal' // Advantage and disadvantage cancel
      } else {
        finalAdvantage = 'advantage'
      }
    }
  }

  let rollResult = rollD20(modifier, finalAdvantage)

  // Check for Halfling Lucky - reroll 1s on saving throws
  if (rollResult.naturalRoll === 1) {
    const rerollCheck = checkRerollEligible(combatant, 'saving_throw', 1)
    if (rerollCheck.canReroll) {
      // Reroll the d20
      const newRoll = rollDie(20)
      const newTotal = newRoll + modifier
      const modifierStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : ''

      // Update the roll result with the rerolled value
      rollResult = {
        ...rollResult,
        naturalRoll: newRoll,
        total: newTotal,
        isNatural1: newRoll === 1,
        isNatural20: newRoll === 20,
        rolls: [...rollResult.rolls, newRoll],
        breakdown: `Lucky[${rollResult.rolls[0]}→${newRoll}]${modifierStr} = ${newTotal}`,
      }
    }
  }

  return {
    roll: rollResult,
    success: rollResult.total >= dc,
    dc,
    modifier,
  }
}

// ============================================
// Conditions
// ============================================

/**
 * Check if a combatant can take actions
 */
export function canTakeActions(combatant: Combatant): boolean {
  const incapacitatingConditions: Condition[] = ['incapacitated', 'paralyzed', 'petrified', 'stunned', 'unconscious']
  return !combatant.conditions.some((c) => incapacitatingConditions.includes(c.condition))
}

/**
 * Check if a combatant can move
 */
export function canMove(combatant: Combatant): boolean {
  const immobilizingConditions: Condition[] = ['grappled', 'paralyzed', 'petrified', 'restrained', 'stunned', 'unconscious']
  return !combatant.conditions.some((c) => immobilizingConditions.includes(c.condition))
}

// ============================================
// Death Saves
// ============================================

export interface DeathSaveResult {
  roll: D20RollResult
  success: boolean
  criticalSuccess: boolean // Nat 20 - regain 1 HP
  criticalFailure: boolean // Nat 1 - counts as 2 failures
}

/**
 * Roll a death saving throw
 */
export function rollDeathSave(): DeathSaveResult {
  const rollResult = rollD20(0, 'normal')

  return {
    roll: rollResult,
    success: rollResult.total >= 10,
    criticalSuccess: rollResult.isNatural20,
    criticalFailure: rollResult.isNatural1,
  }
}

// ============================================
// Spell Helpers
// ============================================

/**
 * Calculate spell save DC for a character
 */
export function getSpellSaveDC(character: Character): number {
  if (!character.class.spellcasting) return 10

  const spellcastingAbility = character.class.spellcasting.ability
  const abilityMod = getAbilityModifier(character.abilityScores[spellcastingAbility])

  return 8 + character.proficiencyBonus + abilityMod
}

/**
 * Calculate spell attack bonus for a character
 */
export function getSpellAttackBonus(character: Character): number {
  if (!character.class.spellcasting) return 0

  const spellcastingAbility = character.class.spellcasting.ability
  const abilityMod = getAbilityModifier(character.abilityScores[spellcastingAbility])

  return character.proficiencyBonus + abilityMod
}
