// ============================================
// Battle Master Maneuver Types
// ============================================

import type { AbilityName, Condition } from './index'

// When a maneuver can be used
export type ManeuverTrigger =
  | 'on_hit'       // After a successful weapon attack hit (Trip Attack, Menacing Attack)
  | 'pre_attack'   // Before making an attack roll (Precision Attack)
  | 'bonus_action' // Uses bonus action (Rally, Quick Toss)
  | 'reaction'     // Uses reaction (Riposte, Parry, Brace)

// Base maneuver interface
export interface Maneuver {
  id: string
  name: string
  description: string
  trigger: ManeuverTrigger
  addsDamageDie: boolean  // Whether superiority die is added to damage
  addsToAttackRoll?: boolean  // For Precision Attack
  requiresWeaponAttack: boolean  // Most do, but some don't (Rally)
  requiresMeleeWeapon?: boolean  // Riposte, Parry require melee
  savingThrow?: {
    ability: AbilityName
    effect: string  // What happens on failed save
  }
  condition?: Condition  // Condition applied on effect (or failed save)
  conditionDuration?: number  // Duration in rounds (-1 = until removed manually like prone)
  pushDistance?: number  // For Pushing Attack (15 feet)
  damageReduction?: boolean  // For Parry - reduces damage instead of adding
  sweepDamage?: boolean  // For Sweeping Attack - deals die damage to adjacent enemy
}

// Result of using a maneuver
export interface ManeuverResult {
  success: boolean
  maneuverId: string
  maneuverName: string
  superiorityDieRoll: number
  superiorityDieSize: number
  bonusDamage?: number  // Damage added from superiority die
  attackBonus?: number  // Attack roll bonus (Precision Attack)
  damageReduced?: number  // Damage reduced (Parry)
  savingThrowMade?: boolean  // Did target pass the save
  conditionApplied?: Condition  // Condition applied to target
  pushApplied?: boolean  // Was target pushed
  message: string  // Log message
}

// Context for checking if a maneuver can be used
export interface ManeuverContext {
  hasHitThisTurn: boolean  // For on_hit maneuvers
  isBeingAttacked: boolean  // For Parry
  wasJustMissed: boolean  // For Riposte
  attackerIsMelee: boolean  // Riposte/Parry require melee
  targetId?: string
}
