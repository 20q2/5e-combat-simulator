import type { Combatant, Character, Monster, Spell, Position, DamageType } from '@/types'
import { getSpellAttackBonus, getSpellSaveDC, rollCombatantSavingThrow, getScaledCantripDice } from '@/engine/combat'
import { rollAttack, rollDamage, rollDie } from '@/engine/dice'
import { canUseIndomitable } from '@/engine/classAbilities'
import { canUseHeroicInspiration } from '@/engine/originFeats'
import { getAoEAffectedCells } from '@/lib/aoeShapes'

// ============================================
// Types
// ============================================

export interface SpellCastValidation {
  canCast: boolean
  isBonusAction: boolean
  reason?: string
}

export interface SpellSlotValidation {
  canCast: boolean
  useMagicInitiateFreeUse: boolean
  slotLevel?: number
  slotsRemaining?: number
  reason?: string
}

export interface SpellAttackResult {
  hit: boolean
  critical: boolean
  naturalOne: boolean
  attackRoll: { total: number; breakdown: string; isNatural1: boolean; isNatural20: boolean }
  targetAC: number
  damage?: { total: number; breakdown: string }
  damageType: DamageType
}

export interface SpellSaveResult {
  saved: boolean
  saveRoll: { total: number; breakdown: string; naturalRoll: number }
  modifier: number
  dc: number
  damage: { total: number; breakdown: string }
  halfDamage: number
  damageType: DamageType
  effectiveDice: string
  // Reroll availability
  canUseIndomitable: boolean
  canUseHeroicInspiration: boolean
}

export interface ProjectileTargetResult {
  targetId: string
  targetName: string
  totalDamage: number
  perProjectileDamages: number[]
  damageType: DamageType
  count: number
}

// ============================================
// Functions
// ============================================

/**
 * Validate whether a caster can cast a spell based on action economy.
 * Does NOT check spell slots — see validateSpellSlot for that.
 */
export function validateSpellCasting(caster: Combatant, spell: Spell): SpellCastValidation {
  if (caster.type !== 'character') {
    return { canCast: false, isBonusAction: false, reason: 'Only characters can cast spells' }
  }

  const isBonusAction = spell.castingTime.toLowerCase().includes('bonus action')
  const isReaction = spell.castingTime.toLowerCase().includes('reaction')

  if (isReaction) {
    return { canCast: false, isBonusAction: false, reason: 'Reaction spells require a trigger' }
  }

  if (isBonusAction && caster.hasBonusActed) {
    return { canCast: false, isBonusAction, reason: 'Bonus action already used' }
  }

  if (!isBonusAction && caster.hasActed) {
    return { canCast: false, isBonusAction, reason: 'Action already used' }
  }

  return { canCast: true, isBonusAction }
}

/**
 * Validate spell slot availability for leveled spells.
 * Cantrips (level 0) always pass. Returns whether Magic Initiate free use is available.
 */
export function validateSpellSlot(caster: Combatant, spell: Spell, castAtLevel?: number): SpellSlotValidation {
  // Cantrips don't need slots
  if (spell.level === 0) {
    return { canCast: true, useMagicInitiateFreeUse: false }
  }

  // Check Magic Initiate free use (only at base level)
  if (!castAtLevel && caster.magicInitiateFreeUses[spell.id] === true) {
    return { canCast: true, useMagicInitiateFreeUse: true }
  }

  // Check spell slots at the effective level (upcast or base)
  const effectiveLevel = (castAtLevel && castAtLevel >= spell.level) ? castAtLevel : spell.level
  const character = caster.data as Character
  const spellSlots = character.spellSlots
  if (!spellSlots) {
    return { canCast: false, useMagicInitiateFreeUse: false, reason: 'No spell slots' }
  }

  const slotLevel = effectiveLevel as keyof typeof spellSlots
  const slot = spellSlots[slotLevel]
  if (!slot || slot.current <= 0) {
    return {
      canCast: false,
      useMagicInitiateFreeUse: false,
      slotLevel: effectiveLevel,
      reason: `No level ${effectiveLevel} spell slots remaining`,
    }
  }

  return {
    canCast: true,
    useMagicInitiateFreeUse: false,
    slotLevel: effectiveLevel,
    slotsRemaining: slot.current,
  }
}

/**
 * Find targets in an AoE spell's area of effect.
 * Returns living enemy combatants within the affected cells.
 */
export function findAoETargets(
  caster: Combatant,
  spell: Spell,
  targetPosition: Position | undefined,
  targetId: string | undefined,
  combatants: Combatant[],
): Combatant[] {
  if (!spell.areaOfEffect) return []

  // Resolve target position
  let aoeTargetPosition = targetPosition
  if (!aoeTargetPosition && targetId) {
    const targetCombatant = combatants.find((c) => c.id === targetId)
    aoeTargetPosition = targetCombatant?.position
  }
  if (!aoeTargetPosition) return []

  const aoeConfig = {
    type: spell.areaOfEffect.type,
    size: spell.areaOfEffect.size,
    origin: caster.position,
    target: aoeTargetPosition,
    originType: spell.areaOfEffect.origin,
  }
  const affectedCells = getAoEAffectedCells(aoeConfig)

  const isPlayerCaster = caster.type === 'character'
  return combatants.filter((c) => {
    if (c.currentHp <= 0) return false
    if (c.id === caster.id) return false
    const cellKey = `${c.position.x},${c.position.y}`
    if (!affectedCells.has(cellKey)) return false
    if (isPlayerCaster && c.type === 'character') return false
    if (!isPlayerCaster && c.type === 'monster') return false
    return true
  })
}

/**
 * Resolve a spell attack roll against a target.
 * Rolls attack, compares to AC, rolls damage on hit/crit.
 */
export function resolveSpellAttack(
  character: Character,
  target: Combatant,
  spell: Spell,
  scaledDamageDice: string,
): SpellAttackResult {
  const spellAttackBonus = getSpellAttackBonus(character)
  let attackRoll = rollAttack(spellAttackBonus)
  const targetAC = target.type === 'character'
    ? (target.data as Character).ac
    : (target.data as Monster).ac
  const damageType = spell.damage!.type

  if (attackRoll.isNatural1) {
    return { hit: false, critical: false, naturalOne: true, attackRoll, targetAC, damageType }
  }

  // Blade Ward: target's attacker subtracts 1d4 from the attack roll
  if (target.conditions.some(c => c.condition === 'blade_ward')) {
    const penalty = rollDie(4)
    attackRoll = {
      ...attackRoll,
      total: attackRoll.total - penalty,
      breakdown: `${attackRoll.breakdown} - ${penalty} [Blade Ward]`,
    }
  }

  if (attackRoll.isNatural20 || attackRoll.total >= targetAC) {
    const isCrit = attackRoll.isNatural20
    const damage = rollDamage(scaledDamageDice, isCrit)
    return { hit: true, critical: isCrit, naturalOne: false, attackRoll, targetAC, damage, damageType }
  }

  return { hit: false, critical: false, naturalOne: false, attackRoll, targetAC, damageType }
}

/**
 * Resolve a saving throw spell against a target.
 * Rolls save, computes full/half damage, checks reroll availability.
 */
export function resolveSpellSave(
  character: Character,
  target: Combatant,
  spell: Spell,
  scaledDamageDice: string,
): SpellSaveResult {
  const dc = getSpellSaveDC(character)

  // Upgrade die type when target is damaged (e.g., Toll the Dead d8→d12)
  let effectiveDice = scaledDamageDice
  if (spell.damagedTargetDieUpgrade && target.currentHp < target.maxHp) {
    const baseDie = effectiveDice.match(/d\d+/)?.[0]
    if (baseDie) {
      effectiveDice = effectiveDice.replace(new RegExp(baseDie, 'g'), spell.damagedTargetDieUpgrade)
    }
  }

  const saveResult = rollCombatantSavingThrow(target, spell.savingThrow!, dc)
  const damage = rollDamage(effectiveDice, false)
  const halfDamage = Math.floor(damage.total / 2)
  const damageType = spell.damage!.type

  return {
    saved: saveResult.success,
    saveRoll: {
      total: saveResult.roll.total,
      breakdown: saveResult.roll.breakdown,
      naturalRoll: saveResult.roll.naturalRoll,
    },
    modifier: saveResult.modifier,
    dc,
    damage,
    halfDamage,
    damageType,
    effectiveDice,
    canUseIndomitable: !saveResult.success && target.type === 'character' && canUseIndomitable(target, target.classFeatureUses),
    canUseHeroicInspiration: !saveResult.success && target.type === 'character' && canUseHeroicInspiration(target),
  }
}

/**
 * Resolve multi-projectile spell damage (Magic Missile, Scorching Ray, etc.).
 * Rolls damage per projectile for each target assignment.
 */
export function resolveProjectiles(
  spell: Spell,
  assignments: { targetId: string; count: number }[],
  combatants: Combatant[],
): ProjectileTargetResult[] {
  const damageType = (spell.damage?.type || 'force') as DamageType
  const damagePerProjectile = spell.projectiles!.damagePerProjectile

  const results: ProjectileTargetResult[] = []

  for (const assignment of assignments) {
    const target = combatants.find((c) => c.id === assignment.targetId)
    if (!target || target.currentHp <= 0) continue

    let totalDamage = 0
    const perProjectileDamages: number[] = []

    for (let i = 0; i < assignment.count; i++) {
      const damageResult = rollDamage(damagePerProjectile, false)
      perProjectileDamages.push(damageResult.total)
      totalDamage += damageResult.total
    }

    results.push({
      targetId: assignment.targetId,
      targetName: target.name,
      totalDamage,
      perProjectileDamages,
      damageType,
      count: assignment.count,
    })
  }

  return results
}

/**
 * Get the effective (scaled) damage dice for a spell, accounting for cantrip scaling and upcasting.
 */
export function getEffectiveDamageDice(spell: Spell, casterLevel: number, castAtLevel?: number): string | undefined {
  if (!spell.damage) return undefined
  const baseDice = getScaledCantripDice(spell, casterLevel)
  // Upcast scaling for leveled spells
  if (castAtLevel && castAtLevel > spell.level && spell.upcastDice) {
    const levelsAbove = castAtLevel - spell.level
    const perLevels = spell.upcastDice.perLevels ?? 1
    const bonusTimes = Math.floor(levelsAbove / perLevels)
    if (bonusTimes > 0) {
      const match = spell.upcastDice.dicePerLevel.match(/^(\d+)d(\d+)$/)
      if (match) {
        const extraCount = parseInt(match[1]) * bonusTimes
        return `${baseDice}+${extraCount}d${match[2]}`
      }
    }
  }
  return baseDice
}
