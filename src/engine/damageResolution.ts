import type { Combatant, ActiveCondition } from '@/types'
import {
  checkRelentlessEndurance,
  applyRelentlessEndurance,
  useRacialAbility as decrementRacialAbilityUse,
} from '@/engine/racialAbilities'

// ============================================
// Types
// ============================================

/** Payload for a deferred log entry (id/timestamp/round are added by the store) */
export interface DeferredLogEntry {
  type: 'initiative' | 'movement' | 'attack' | 'damage' | 'heal' | 'spell' | 'condition' | 'death' | 'other'
  actorId?: string
  actorName: string
  targetId?: string
  targetName?: string
  message: string
  details?: string
}

export interface DamageApplicationResult {
  newHp: number
  wasConscious: boolean
  // Relentless Endurance
  relentlessEnduranceUsed: boolean
  updatedRacialAbilityUses: Record<string, number>
  // Death/unconscious
  fellUnconscious: boolean
  monsterDied: boolean
  // Already-unconscious damage
  deathSaveFailureAdded: boolean
  newDeathSaveFailures: number
  characterDied: boolean
  // Conditions to set
  newConditions: ActiveCondition[]
  // Log entries to defer (so damage log from caller appears first)
  deferredLogEntries: DeferredLogEntry[]
}

// ============================================
// Functions
// ============================================

/**
 * Check if a combatant is dead (not just unconscious).
 * Monsters die at 0 HP, characters die at 3 death save failures.
 */
export function isDead(combatant: Combatant): boolean {
  if (combatant.type === 'monster') {
    return combatant.currentHp <= 0
  }
  return combatant.deathSaves.failures >= 3
}

/**
 * Check if combat has ended after damage.
 * Returns 'victory' if all monsters are dead, 'defeat' if all characters are dead, null otherwise.
 */
export function checkCombatEnd(combatants: Combatant[]): 'victory' | 'defeat' | null {
  const characters = combatants.filter(c => c.type === 'character')
  const monsters = combatants.filter(c => c.type === 'monster')

  const allMonstersDead = monsters.length > 0 && monsters.every(m => m.currentHp <= 0)
  const allCharactersDead = characters.length > 0 && characters.every(c =>
    c.deathSaves.failures >= 3
  )

  if (allMonstersDead) return 'victory'
  if (allCharactersDead) return 'defeat'
  return null
}

/**
 * Calculate the result of applying damage to a combatant.
 * Pure function — does NOT mutate state. Returns all info needed
 * for the store to apply the update and generate log entries.
 */
export function calculateDamageApplication(
  target: Combatant,
  amount: number,
): DamageApplicationResult {
  const deferredLogEntries: DeferredLogEntry[] = []
  let newHp = Math.max(0, target.currentHp - amount)
  let updatedRacialAbilityUses = target.racialAbilityUses
  const wasConscious = target.currentHp > 0

  let relentlessEnduranceUsed = false
  let fellUnconscious = false
  let monsterDied = false
  let deathSaveFailureAdded = false
  let newDeathSaveFailures = target.deathSaves.failures
  let characterDied = false

  // Check for Relentless Endurance when dropping to 0 HP (characters only)
  if (newHp === 0 && wasConscious && target.type === 'character') {
    const relentlessCheck = checkRelentlessEndurance(target, target.racialAbilityUses)
    if (relentlessCheck.canUse && relentlessCheck.ability) {
      newHp = applyRelentlessEndurance(relentlessCheck.ability)
      const result = decrementRacialAbilityUse(
        target,
        relentlessCheck.ability.id,
        target.racialAbilityUses
      )
      updatedRacialAbilityUses = result.newUses
      relentlessEnduranceUsed = true

      deferredLogEntries.push({
        type: 'other',
        actorId: target.id,
        actorName: target.name,
        message: `${target.name} uses Relentless Endurance and drops to ${newHp} HP instead of falling unconscious!`,
      })
    }
  }

  // Check for falling unconscious (characters) or dying (monsters)
  if (newHp === 0 && wasConscious) {
    if (target.type === 'monster') {
      deferredLogEntries.push({
        type: 'death',
        actorId: target.id,
        actorName: target.name,
        message: `${target.name} has been slain!`,
      })
      monsterDied = true
    } else if (!relentlessEnduranceUsed) {
      deferredLogEntries.push({
        type: 'death',
        actorId: target.id,
        actorName: target.name,
        message: `${target.name} falls unconscious!`,
      })
      fellUnconscious = true
    }
  }

  // If already unconscious and takes damage, add death save failure
  if (target.currentHp === 0 && !target.isStable && target.type === 'character') {
    newDeathSaveFailures = target.deathSaves.failures + 1
    deathSaveFailureAdded = true
    characterDied = newDeathSaveFailures >= 3

    if (characterDied) {
      deferredLogEntries.push({
        type: 'death',
        actorId: target.id,
        actorName: target.name,
        message: `${target.name} has died from damage while unconscious!`,
      })
    } else {
      deferredLogEntries.push({
        type: 'other',
        actorId: target.id,
        actorName: target.name,
        message: `${target.name} takes damage while unconscious - death save failure! (${newDeathSaveFailures}/3)`,
      })
    }
  }

  // Build conditions array
  let newConditions = target.conditions
  if (newHp === 0 && wasConscious) {
    if (target.type === 'character' && fellUnconscious) {
      newConditions = [...newConditions, { condition: 'unconscious' as const, duration: -1 }]
    } else if (monsterDied) {
      newConditions = [...newConditions.filter(c => c.condition !== 'prone'), { condition: 'prone' as const, duration: -1 }]
    }
  }
  if (deathSaveFailureAdded && characterDied) {
    newConditions = [...newConditions.filter(c => c.condition !== 'prone'), { condition: 'prone' as const, duration: -1 }]
  }

  return {
    newHp,
    wasConscious,
    relentlessEnduranceUsed,
    updatedRacialAbilityUses,
    fellUnconscious,
    monsterDied,
    deathSaveFailureAdded,
    newDeathSaveFailures,
    characterDied,
    newConditions,
    deferredLogEntries,
  }
}
