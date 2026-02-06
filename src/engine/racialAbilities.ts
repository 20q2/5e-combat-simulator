import type {
  Combatant,
  DamageType,
  AbilityName,
  Condition,
  Character,
  Size,
} from '@/types'
import { getAbilityModifier } from '@/types'
import type {
  RacialAbility,
  ResistanceAbility,
  SaveAdvantageAbility,
  RerollAbility,
  TriggeredHealAbility,
  BonusDamageAbility,
  BreathWeaponAbility,
  NimblenessAbility,
} from '@/types/race'
import { roll } from './dice'

// ============================================
// Combatant Ability Access Helpers
// ============================================

/**
 * Get all racial abilities for a combatant (only characters have racial abilities)
 */
export function getCombatantRacialAbilities(combatant: Combatant): RacialAbility[] {
  if (combatant.type !== 'character') return []
  const character = combatant.data as Character
  // Handle legacy characters that may not have abilities array
  return character.race.abilities ?? []
}

/**
 * Get racial abilities of a specific type for a combatant
 */
export function getCombatantAbilitiesOfType<T extends RacialAbility['type']>(
  combatant: Combatant,
  type: T
): Extract<RacialAbility, { type: T }>[] {
  const abilities = getCombatantRacialAbilities(combatant)
  return abilities.filter((a): a is Extract<RacialAbility, { type: T }> => a.type === type)
}

// ============================================
// Damage Resistance
// ============================================

/**
 * Apply damage resistances/immunities to incoming damage
 * Returns the modified damage amount
 */
export function applyDamageResistance(
  combatant: Combatant,
  damage: number,
  damageType: DamageType,
  racialAbilityUses: Record<string, number>
): { damage: number; applied: ResistanceAbility | null } {
  const resistances = getCombatantAbilitiesOfType(combatant, 'resistance')

  for (const resistance of resistances) {
    if (resistance.damageTypes.includes(damageType)) {
      // Check if it has limited uses
      if (resistance.maxUses !== undefined) {
        const uses = racialAbilityUses[resistance.id] ?? resistance.maxUses
        if (uses <= 0) continue
      }

      if (resistance.level === 'immunity') {
        return { damage: 0, applied: resistance }
      } else {
        return { damage: Math.floor(damage / 2), applied: resistance }
      }
    }
  }

  return { damage, applied: null }
}

// ============================================
// Save Advantage
// ============================================

export interface SaveAdvantageContext {
  condition?: Condition
  damageType?: DamageType
  isMagic?: boolean
}

/**
 * Check if a combatant has advantage on a saving throw
 */
export function checkSaveAdvantage(
  combatant: Combatant,
  _saveAbility: AbilityName,
  context: SaveAdvantageContext
): { hasAdvantage: boolean; ability: SaveAdvantageAbility | null } {
  const saveAdvantages = getCombatantAbilitiesOfType(combatant, 'save_advantage')

  for (const ability of saveAdvantages) {
    // Check condition-based advantage (Fey Ancestry, Brave)
    if (context.condition && ability.conditions?.includes(context.condition)) {
      return { hasAdvantage: true, ability }
    }

    // Check damage type-based advantage (Dwarven Resilience vs poison)
    if (context.damageType && ability.damageTypes?.includes(context.damageType)) {
      return { hasAdvantage: true, ability }
    }

    // Check magic-based advantage (Gnome Cunning)
    if (context.isMagic && ability.magicSaves) {
      return { hasAdvantage: true, ability }
    }
  }

  return { hasAdvantage: false, ability: null }
}

// ============================================
// Reroll Abilities (Halfling Lucky)
// ============================================

export type RollType = 'attack' | 'ability_check' | 'saving_throw'

/**
 * Check if a combatant can reroll a die based on racial abilities
 */
export function checkRerollEligible(
  combatant: Combatant,
  rollType: RollType,
  diceValue: number
): { canReroll: boolean; ability: RerollAbility | null } {
  const rerollAbilities = getCombatantAbilitiesOfType(combatant, 'reroll')

  for (const ability of rerollAbilities) {
    if (ability.appliesTo.includes(rollType) && diceValue <= ability.triggerValue) {
      return { canReroll: true, ability }
    }
  }

  return { canReroll: false, ability: null }
}

// ============================================
// Triggered Heal (Relentless Endurance)
// ============================================

/**
 * Check if a combatant can use a triggered heal ability when dropping to 0 HP
 * Returns the ability if available and has uses remaining
 */
export function checkRelentlessEndurance(
  combatant: Combatant,
  racialAbilityUses: Record<string, number>
): { canUse: boolean; ability: TriggeredHealAbility | null } {
  const healAbilities = getCombatantAbilitiesOfType(combatant, 'triggered_heal')

  for (const ability of healAbilities) {
    if (ability.triggerCondition === 'drop_to_zero') {
      // Check uses remaining
      if (ability.maxUses !== undefined) {
        const uses = racialAbilityUses[ability.id] ?? ability.maxUses
        if (uses <= 0) continue
      }
      return { canUse: true, ability }
    }
  }

  return { canUse: false, ability: null }
}

/**
 * Apply relentless endurance effect
 */
export function applyRelentlessEndurance(
  ability: TriggeredHealAbility
): number {
  return ability.healAmount
}

// ============================================
// Bonus Damage (Savage Attacks)
// ============================================

/**
 * Check if a combatant has bonus damage on critical hits
 */
export function checkSavageAttacks(
  combatant: Combatant,
  isCritical: boolean
): { hasBonusDamage: boolean; ability: BonusDamageAbility | null } {
  if (!isCritical) return { hasBonusDamage: false, ability: null }

  const bonusDamageAbilities = getCombatantAbilitiesOfType(combatant, 'bonus_damage')

  for (const ability of bonusDamageAbilities) {
    if (ability.triggerCondition === 'critical_hit') {
      return { hasBonusDamage: true, ability }
    }
  }

  return { hasBonusDamage: false, ability: null }
}

/**
 * Roll bonus damage for Savage Attacks
 */
export function rollSavageAttacksDamage(
  ability: BonusDamageAbility,
  weaponDamageDie?: string
): { total: number; rolls: number[] } {
  // Use the weapon's damage die if available, otherwise use the ability's bonus dice
  const diceToRoll = weaponDamageDie || ability.bonusDice
  const result = roll(diceToRoll)
  return { total: result.total, rolls: result.rolls }
}

// ============================================
// Breath Weapon
// ============================================

/**
 * Get breath weapon ability for a combatant
 */
export function getBreathWeapon(
  combatant: Combatant,
  racialAbilityUses: Record<string, number>
): { available: boolean; ability: BreathWeaponAbility | null; usesRemaining: number } {
  const breathWeapons = getCombatantAbilitiesOfType(combatant, 'breath_weapon')

  for (const ability of breathWeapons) {
    const usesRemaining = racialAbilityUses[ability.id] ?? ability.maxUses ?? 1
    return {
      available: usesRemaining > 0,
      ability,
      usesRemaining
    }
  }

  return { available: false, ability: null, usesRemaining: 0 }
}

/**
 * Calculate breath weapon DC
 */
export function calculateBreathWeaponDC(
  combatant: Combatant,
  ability: BreathWeaponAbility
): number {
  if (combatant.type !== 'character') return 10

  const character = combatant.data as Character
  const abilityMod = getAbilityModifier(character.abilityScores[ability.dcAbility])
  return 8 + abilityMod + character.proficiencyBonus
}

/**
 * Get breath weapon damage dice based on character level
 */
export function getBreathWeaponDamage(
  combatant: Combatant,
  ability: BreathWeaponAbility
): string {
  if (combatant.type !== 'character') return ability.damageDice

  const character = combatant.data as Character
  const level = character.level

  if (ability.damageScaling) {
    // Find the highest level threshold that's <= character level
    let damageDice = ability.damageDice
    for (const [lvl, dice] of Object.entries(ability.damageScaling)) {
      if (level >= parseInt(lvl)) {
        damageDice = dice
      }
    }
    return damageDice
  }

  return ability.damageDice
}

/**
 * Roll breath weapon damage
 */
export function rollBreathWeaponDamage(
  combatant: Combatant,
  ability: BreathWeaponAbility
): { total: number; rolls: number[] } {
  const damageDice = getBreathWeaponDamage(combatant, ability)
  const result = roll(damageDice)
  return { total: result.total, rolls: result.rolls }
}

// ============================================
// Ability Usage Tracking
// ============================================

/**
 * Initialize ability uses for a combatant at the start of combat
 */
export function initializeRacialAbilityUses(combatant: Combatant): Record<string, number> {
  const uses: Record<string, number> = {}
  const abilities = getCombatantRacialAbilities(combatant)

  for (const ability of abilities) {
    if (ability.maxUses !== undefined) {
      uses[ability.id] = ability.maxUses
    }
  }

  return uses
}

/**
 * Check if a racial ability can be used (has uses remaining)
 */
export function canUseRacialAbility(
  combatant: Combatant,
  abilityId: string,
  racialAbilityUses: Record<string, number>
): boolean {
  const abilities = getCombatantRacialAbilities(combatant)
  const ability = abilities.find(a => a.id === abilityId)

  if (!ability) return false

  // If no max uses, it's unlimited
  if (ability.maxUses === undefined) return true

  const uses = racialAbilityUses[abilityId] ?? ability.maxUses
  return uses > 0
}

/**
 * Use a racial ability (decrement uses)
 * Returns the new uses remaining
 */
export function useRacialAbility(
  combatant: Combatant,
  abilityId: string,
  racialAbilityUses: Record<string, number>
): { newUses: Record<string, number>; usesRemaining: number } {
  const abilities = getCombatantRacialAbilities(combatant)
  const ability = abilities.find(a => a.id === abilityId)

  if (!ability || ability.maxUses === undefined) {
    return { newUses: racialAbilityUses, usesRemaining: -1 }
  }

  const currentUses = racialAbilityUses[abilityId] ?? ability.maxUses
  const usesRemaining = Math.max(0, currentUses - 1)

  return {
    newUses: {
      ...racialAbilityUses,
      [abilityId]: usesRemaining
    },
    usesRemaining
  }
}

// ============================================
// Nimbleness (Halfling, Gnome)
// ============================================

const SIZE_ORDER: Size[] = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']

/**
 * Compare two sizes - returns negative if a < b, 0 if equal, positive if a > b
 */
export function compareSizes(a: Size, b: Size): number {
  return SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)
}

/**
 * Check if a combatant has the Nimbleness ability
 */
export function hasNimbleness(combatant: Combatant): boolean {
  const abilities = getCombatantAbilitiesOfType(combatant, 'nimbleness')
  return abilities.length > 0
}

/**
 * Get the Nimbleness ability for a combatant
 */
export function getNimblenessAbility(combatant: Combatant): NimblenessAbility | null {
  const abilities = getCombatantAbilitiesOfType(combatant, 'nimbleness')
  return abilities[0] ?? null
}

/**
 * Check if a combatant with Nimbleness can move through a creature of a given size
 * @param mover The combatant trying to move through
 * @param blockerSize The size of the creature in the way
 */
export function canMoveThrough(mover: Combatant, blockerSize: Size): boolean {
  const nimbleness = getNimblenessAbility(mover)
  if (!nimbleness) return false
  return nimbleness.canMoveThrough.includes(blockerSize)
}

/**
 * Get all sizes that a combatant can move through with Nimbleness
 */
export function getPassableSizes(combatant: Combatant): Size[] {
  const nimbleness = getNimblenessAbility(combatant)
  if (!nimbleness) return []
  return nimbleness.canMoveThrough
}

// ============================================
// Get Active Abilities for UI
// ============================================

export interface ActiveRacialAbility {
  ability: RacialAbility
  usesRemaining: number | null // null = unlimited
  canUse: boolean
}

/**
 * Get all activatable racial abilities for a combatant (action, bonus action, reaction)
 */
export function getActivatableAbilities(
  combatant: Combatant,
  racialAbilityUses: Record<string, number>
): ActiveRacialAbility[] {
  const abilities = getCombatantRacialAbilities(combatant)
  const activatable: ActiveRacialAbility[] = []

  for (const ability of abilities) {
    if (ability.trigger === 'action' || ability.trigger === 'bonus_action' || ability.trigger === 'reaction') {
      const usesRemaining = ability.maxUses !== undefined
        ? (racialAbilityUses[ability.id] ?? ability.maxUses)
        : null

      activatable.push({
        ability,
        usesRemaining,
        canUse: usesRemaining === null || usesRemaining > 0
      })
    }
  }

  return activatable
}
