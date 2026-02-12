import type { Combatant, ActiveCondition, Character, Monster } from '@/types'
import { getAbilityModifier } from '@/types'
import { hasHeroicWarrior, hasSurvivor } from '@/engine/classAbilities'

// ============================================
// Types
// ============================================

/** Fields to reset on the outgoing combatant at end of turn */
export interface TurnResetFields {
  hasActed: false
  hasBonusActed: false
  movementUsed: 0
  usedSneakAttackThisTurn: false
  attacksMadeThisTurn: 0
  usedCleaveThisTurn: false
  usedNickThisTurn: false
  usedManeuverThisAttack: false
  feintTarget: undefined
  feintBonusDamage: undefined
  lungingAttackBonus: undefined
  usedSavageAttackerThisTurn: false
  usedTavernBrawlerPushThisTurn: false
}

export interface ConditionExpiryResult {
  updatedConditions: ActiveCondition[]
  expiredConditionNames: string[]
  evasiveExpired: boolean
}

export interface StartOfTurnEffect {
  type: 'heroic_warrior' | 'heroic_rally'
  combatantId: string
  combatantName: string
  logType: 'other' | 'heal'
  message: string
  // For heroic_warrior:
  grantHeroicInspiration?: boolean
  // For heroic_rally:
  healAmount?: number
  newHp?: number
}

// ============================================
// Functions
// ============================================

/**
 * Returns the set of fields to reset on the outgoing combatant at end of turn.
 * Spread this onto the combatant object.
 */
export function getTurnResetFields(): TurnResetFields {
  return {
    hasActed: false,
    hasBonusActed: false,
    movementUsed: 0,
    usedSneakAttackThisTurn: false,
    attacksMadeThisTurn: 0,
    usedCleaveThisTurn: false,
    usedNickThisTurn: false,
    usedManeuverThisAttack: false,
    feintTarget: undefined,
    feintBonusDamage: undefined,
    lungingAttackBonus: undefined,
    usedSavageAttackerThisTurn: false,
    usedTavernBrawlerPushThisTurn: false,
  }
}

/**
 * Calculate condition expiry for a combatant at the start of their turn.
 * Decrements durations, removes expired conditions, flags evasive expiry.
 */
export function calculateConditionExpiry(combatant: Combatant): ConditionExpiryResult {
  const expiredConditionNames: string[] = []

  const updatedConditions = combatant.conditions
    .map((cond) => {
      if (cond.duration === undefined || cond.duration === -1) return cond // Indefinite
      const newDuration = cond.duration - 1
      if (newDuration <= 0) {
        expiredConditionNames.push(cond.condition)
        return null
      }
      return { ...cond, duration: newDuration }
    })
    .filter((cond): cond is NonNullable<typeof cond> => cond !== null)

  const evasiveExpired = expiredConditionNames.includes('evasive')

  return {
    updatedConditions,
    expiredConditionNames,
    evasiveExpired,
  }
}

/**
 * Calculate start-of-turn effects for a combatant (Heroic Warrior, Heroic Rally).
 * Returns an array of effects to apply — may be empty.
 */
export function calculateStartOfTurnEffects(combatant: Combatant): StartOfTurnEffect[] {
  const effects: StartOfTurnEffect[] = []

  // Heroic Warrior: Champion Fighter level 10 — grant Heroic Inspiration if missing
  if (!combatant.heroicInspiration && hasHeroicWarrior(combatant)) {
    effects.push({
      type: 'heroic_warrior',
      combatantId: combatant.id,
      combatantName: combatant.name,
      logType: 'other',
      message: `Heroic Warrior: ${combatant.name} gains Heroic Inspiration`,
      grantHeroicInspiration: true,
    })
  }

  // Survivor - Heroic Rally: Champion Fighter level 18
  // Heal 5 + CON mod at start of turn when bloodied (HP <= half max, but > 0)
  if (combatant.currentHp > 0 && hasSurvivor(combatant)) {
    if (combatant.currentHp <= Math.floor(combatant.maxHp / 2)) {
      const character = combatant.type === 'character' ? combatant.data as Character : null
      const monster = combatant.type === 'monster' ? combatant.data as Monster : null
      const conScore = character?.abilityScores.constitution ?? monster?.abilityScores.constitution ?? 10
      const conMod = getAbilityModifier(conScore)
      const healing = 5 + conMod
      const newHp = Math.min(combatant.currentHp + healing, combatant.maxHp)
      const actualHealing = newHp - combatant.currentHp

      effects.push({
        type: 'heroic_rally',
        combatantId: combatant.id,
        combatantName: combatant.name,
        logType: 'heal',
        message: `Heroic Rally: ${combatant.name} regains ${actualHealing} HP (${combatant.currentHp} → ${newHp})`,
        healAmount: actualHealing,
        newHp,
      })
    }
  }

  return effects
}

/**
 * Check if a combatant's turn should be auto-skipped (they are dead).
 */
export function shouldSkipTurn(combatant: Combatant): boolean {
  return combatant.currentHp <= 0 && (
    combatant.type === 'monster' || // Monsters are dead at 0 HP
    combatant.deathSaves.failures >= 3 // Characters are dead at 3 failures
  )
}
