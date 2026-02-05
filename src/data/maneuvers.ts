// ============================================
// Battle Master Maneuvers Data
// ============================================

import type { Maneuver } from '@/types/maneuver'

/**
 * All available Battle Master maneuvers
 * MVP: 8 priority maneuvers covering all trigger types
 */
export const MANEUVERS: Maneuver[] = [
  // ============================================
  // Pre-Attack Maneuvers
  // ============================================
  {
    id: 'precision-attack',
    name: 'Precision Attack',
    description: 'When you make a weapon attack roll against a creature, you can expend one superiority die to add it to the roll. You can use this maneuver before or after making the attack roll, but before any effects of the attack are applied.',
    trigger: 'pre_attack',
    addsDamageDie: false,
    addsToAttackRoll: true,
    requiresWeaponAttack: true,
  },

  // ============================================
  // On-Hit Maneuvers
  // ============================================
  {
    id: 'trip-attack',
    name: 'Trip Attack',
    description: 'When you hit a creature with a weapon attack, you can expend one superiority die to add it to the attack\'s damage roll, and if the target is Large or smaller, it must make a Strength saving throw. On a failed save, you knock the target prone.',
    trigger: 'on_hit',
    addsDamageDie: true,
    requiresWeaponAttack: true,
    savingThrow: {
      ability: 'strength',
      effect: 'Knocked prone',
    },
    condition: 'prone',
    conditionDuration: -1, // Permanent until target uses movement to stand
  },
  {
    id: 'menacing-attack',
    name: 'Menacing Attack',
    description: 'When you hit a creature with a weapon attack, you can expend one superiority die to add it to the attack\'s damage roll. The target must make a Wisdom saving throw. On a failed save, it is frightened of you until the end of your next turn.',
    trigger: 'on_hit',
    addsDamageDie: true,
    requiresWeaponAttack: true,
    savingThrow: {
      ability: 'wisdom',
      effect: 'Frightened until end of your next turn',
    },
    condition: 'frightened',
    conditionDuration: 1, // Until end of next turn
  },
  {
    id: 'pushing-attack',
    name: 'Pushing Attack',
    description: 'When you hit a creature with a weapon attack, you can expend one superiority die to add it to the attack\'s damage roll. If the target is Large or smaller, it must make a Strength saving throw. On a failed save, you push the target up to 15 feet away from you.',
    trigger: 'on_hit',
    addsDamageDie: true,
    requiresWeaponAttack: true,
    savingThrow: {
      ability: 'strength',
      effect: 'Pushed up to 15 feet',
    },
    pushDistance: 15,
  },
  {
    id: 'disarming-attack',
    name: 'Disarming Attack',
    description: 'When you hit a creature with a weapon attack, you can expend one superiority die to add it to the attack\'s damage roll, and you attempt to disarm the target. The target must make a Strength saving throw. On a failed save, it drops one object of your choice that it\'s holding.',
    trigger: 'on_hit',
    addsDamageDie: true,
    requiresWeaponAttack: true,
    savingThrow: {
      ability: 'strength',
      effect: 'Drops held object',
    },
  },
  {
    id: 'goading-attack',
    name: 'Goading Attack',
    description: 'When you hit a creature with a weapon attack, you can expend one superiority die to add it to the attack\'s damage roll. The target must make a Wisdom saving throw. On a failed save, the target has disadvantage on all attack rolls against targets other than you until the end of your next turn.',
    trigger: 'on_hit',
    addsDamageDie: true,
    requiresWeaponAttack: true,
    savingThrow: {
      ability: 'wisdom',
      effect: 'Disadvantage on attacks against others',
    },
    condition: 'goaded',
    conditionDuration: 1, // Until end of next turn
  },

  // ============================================
  // Reaction Maneuvers
  // ============================================
  {
    id: 'riposte',
    name: 'Riposte',
    description: 'When a creature misses you with a melee attack, you can use your reaction and expend one superiority die to make a melee weapon attack against the creature. If you hit, you add the superiority die to the attack\'s damage roll.',
    trigger: 'reaction',
    addsDamageDie: true,
    requiresWeaponAttack: true,
    requiresMeleeWeapon: true,
  },
  {
    id: 'parry',
    name: 'Parry',
    description: 'When another creature damages you with a melee attack, you can use your reaction and expend one superiority die to reduce the damage by the number you roll on your superiority die plus your Dexterity modifier.',
    trigger: 'reaction',
    addsDamageDie: false,
    damageReduction: true,
    requiresWeaponAttack: false,
    requiresMeleeWeapon: true, // Must be wielding melee weapon
  },
]

// ============================================
// Helper Functions
// ============================================

/**
 * Get a maneuver by its ID
 */
export function getManeuverById(id: string): Maneuver | undefined {
  return MANEUVERS.find((m) => m.id === id)
}

/**
 * Get all available maneuvers
 */
export function getAllManeuvers(): Maneuver[] {
  return MANEUVERS
}

/**
 * Get maneuvers filtered by trigger type
 */
export function getManeuversByTrigger(trigger: Maneuver['trigger']): Maneuver[] {
  return MANEUVERS.filter((m) => m.trigger === trigger)
}

/**
 * Get maneuvers by their IDs
 */
export function getManeuversByIds(ids: string[]): Maneuver[] {
  return ids.map((id) => getManeuverById(id)).filter((m): m is Maneuver => m !== undefined)
}
