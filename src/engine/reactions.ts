import type { Combatant, Character, Spell } from '@/types'

// ============================================
// Reaction Spell Availability
// ============================================

/**
 * Get available reaction spells for a combatant that match a given trigger.
 * Pure function — checks known/prepared spells, reaction status, and spell slots.
 */
export function getAvailableReactionSpells(
  combatant: Combatant,
  trigger: 'on_hit' | 'on_magic_missile' | 'enemy_casts_spell' | 'take_damage'
): Spell[] {
  if (combatant.type !== 'character') return []
  if (combatant.hasReacted) return []

  const character = combatant.data as Character
  const knownSpells = character.knownSpells || []
  const preparedSpells = character.preparedSpells || []
  const allSpells = [...knownSpells, ...preparedSpells]

  // Filter for reaction spells matching the trigger
  return allSpells.filter(spell => {
    if (!spell.reaction) return false
    if (spell.reaction.trigger !== trigger) return false

    // Check if character has spell slots available (for leveled spells)
    if (spell.level > 0 && character.spellSlots) {
      const slotLevel = spell.level as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
      const slots = character.spellSlots[slotLevel]
      if (!slots || slots.current <= 0) return false
    }

    return true
  })
}

// ============================================
// Shield Reaction Calculation
// ============================================

export interface ShieldReactionResult {
  newAC: number
  acBonus: number
  attackBlocked: boolean
}

/**
 * Calculate the result of casting Shield as a reaction.
 * Returns whether the attack is now blocked with the new AC.
 */
export function calculateShieldReaction(
  attackRoll: number,
  currentAC: number,
  acBonus: number = 5,
): ShieldReactionResult {
  const newAC = currentAC + acBonus
  return {
    newAC,
    acBonus,
    attackBlocked: attackRoll < newAC,
  }
}
