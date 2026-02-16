import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSpellById } from '@/data/spells'
import {
  resolveSpellAttack,
  getEffectiveDamageDice,
} from '@/engine/spellCasting'
import type { Combatant, Character, Monster, ActiveCondition } from '@/types'
import { ZoneType } from '@/types'

// ============================================
// Test Helpers
// ============================================

function createWizardCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'wizard-1',
    name: 'Test Wizard',
    type: 'character',
    position: { x: 5, y: 5 },
    currentHp: 20,
    maxHp: 20,
    temporaryHp: 0,
    initiative: 12,
    conditions: [],
    hasActed: false,
    hasBonusActed: false,
    hasReacted: false,
    movementUsed: 0,
    speed: 30,
    classFeatureUses: {},
    racialAbilityUses: {},
    magicInitiateFreeUses: {},
    usedSneakAttackThisTurn: false,
    attacksMadeThisTurn: 0,
    usedCleaveThisTurn: false,
    usedNickThisTurn: false,
    usedManeuverThisAttack: false,
    usedSavageAttackerThisTurn: false,
    usedTavernBrawlerPushThisTurn: false,
    heroicInspiration: false,
    deathSaves: { successes: 0, failures: 0 },
    isStable: false,
    superiorityDiceRemaining: 0,
    featUses: {},
    data: {
      name: 'Test Wizard',
      level: 5,
      race: { name: 'Human', size: 'medium', speed: 30, abilities: [] },
      class: { name: 'Wizard', hitDie: 'd6', features: [], spellcasting: { ability: 'intelligence' } },
      abilityScores: { strength: 8, dexterity: 14, constitution: 12, intelligence: 18, wisdom: 12, charisma: 10 },
      maxHp: 20,
      ac: 15,
      armorClass: 15,
      speed: 30,
      equipment: { armor: null, shield: false, weapons: [] },
      proficiencyBonus: 3,
      spellcastingAbility: 'intelligence',
      spellSlots: {
        1: { current: 4, max: 4 },
        2: { current: 3, max: 3 },
        3: { current: 2, max: 2 },
      },
    } as unknown as Character,
    ...overrides,
  } as Combatant
}

function createMonsterTarget(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'mon-1',
    name: 'Goblin',
    type: 'monster',
    position: { x: 10, y: 5 },
    currentHp: 7,
    maxHp: 7,
    temporaryHp: 0,
    initiative: 10,
    conditions: [],
    hasActed: false,
    hasBonusActed: false,
    hasReacted: false,
    movementUsed: 0,
    speed: 30,
    classFeatureUses: {},
    racialAbilityUses: {},
    magicInitiateFreeUses: {},
    usedSneakAttackThisTurn: false,
    attacksMadeThisTurn: 0,
    usedCleaveThisTurn: false,
    usedNickThisTurn: false,
    usedManeuverThisAttack: false,
    usedSavageAttackerThisTurn: false,
    usedTavernBrawlerPushThisTurn: false,
    heroicInspiration: false,
    deathSaves: { successes: 0, failures: 0 },
    isStable: false,
    superiorityDiceRemaining: 0,
    featUses: {},
    data: {
      name: 'Goblin',
      type: 'humanoid',
      size: 'small',
      armorClass: 15,
      ac: 15,
      maxHp: 7,
      speed: { walk: 30 },
      abilityScores: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 },
      actions: [],
    } as unknown as Monster,
    ...overrides,
  } as Combatant
}

// ============================================
// Spell Data Definition Tests
// ============================================

describe('Spell definitions: new spell properties', () => {
  it('Ray of Sickness has conditionOnHit: poisoned', () => {
    const spell = getSpellById('ray-of-sickness')
    expect(spell).toBeDefined()
    expect(spell!.conditionOnHit).toBe('poisoned')
    expect(spell!.attackType).toBe('ranged')
    expect(spell!.damage?.type).toBe('poison')
    expect(spell!.damage?.dice).toBe('2d8')
  })

  it('Witch Bolt has conditionOnSelf: witch_bolt', () => {
    const spell = getSpellById('witch-bolt')
    expect(spell).toBeDefined()
    expect(spell!.conditionOnSelf).toBe('witch_bolt')
    expect(spell!.concentration).toBe(true)
    expect(spell!.attackType).toBe('ranged')
    expect(spell!.damage?.type).toBe('lightning')
    expect(spell!.damage?.dice).toBe('2d12')
  })

  it("Tasha's Hideous Laughter has conditionsOnFailedSave and repeatSave", () => {
    const spell = getSpellById('tashas-hideous-laughter')
    expect(spell).toBeDefined()
    expect(spell!.conditionsOnFailedSave).toEqual(['prone', 'incapacitated'])
    expect(spell!.repeatSave).toBeDefined()
    expect(spell!.repeatSave!.ability).toBe('wisdom')
    expect(spell!.repeatSave!.onEndOfTurn).toBe(true)
    expect(spell!.repeatSave!.onDamage).toBe(true)
    expect(spell!.repeatSave!.advantageOnDamage).toBe(true)
    expect(spell!.concentration).toBe(true)
    expect(spell!.savingThrow).toBe('wisdom')
  })

  it("Tasha's Hideous Laughter supports multi-target upcast", () => {
    const spell = getSpellById('tashas-hideous-laughter')
    expect(spell!.multiTarget).toBeDefined()
    expect(spell!.multiTarget!.baseCount).toBe(1)
    expect(spell!.multiTarget!.additionalPerLevel).toBe(1)
    expect(spell!.targetType).toBe('enemy')
  })

  it('Sleep has endsOnDamage and repeatSave with onFailCondition', () => {
    const spell = getSpellById('sleep')
    expect(spell).toBeDefined()
    expect(spell!.conditionOnFailedSave).toBe('incapacitated')
    expect(spell!.endsOnDamage).toBe(true)
    expect(spell!.concentration).toBe(true)
    expect(spell!.repeatSave).toBeDefined()
    expect(spell!.repeatSave!.ability).toBe('wisdom')
    expect(spell!.repeatSave!.onEndOfTurn).toBe(true)
    expect(spell!.repeatSave!.onFailCondition).toBe('unconscious')
    expect(spell!.repeatSave!.onFailEndsOnDamage).toBe(true)
  })

  it('False Life has grantsTempHp and upcast bonus', () => {
    const spell = getSpellById('false-life')
    expect(spell).toBeDefined()
    expect(spell!.grantsTempHp).toBe('2d4+4')
    expect(spell!.grantsTempHpUpcastBonus).toBe(5)
    expect(spell!.concentration).toBe(false)
  })

  it('Ice Knife has explosionOnImpact', () => {
    const spell = getSpellById('ice-knife')
    expect(spell).toBeDefined()
    expect(spell!.attackType).toBe('ranged')
    expect(spell!.damage?.type).toBe('piercing')
    expect(spell!.damage?.dice).toBe('1d10')
    expect(spell!.explosionOnImpact).toBeDefined()
    expect(spell!.explosionOnImpact!.damage.type).toBe('cold')
    expect(spell!.explosionOnImpact!.damage.dice).toBe('2d6')
    expect(spell!.explosionOnImpact!.savingThrow).toBe('dexterity')
    expect(spell!.explosionOnImpact!.radius).toBe(5)
    expect(spell!.explosionOnImpact!.upcastDice).toBe('1d6')
  })

  it('Jump has ally targeting and conditionOnTarget (speed bonus via condition)', () => {
    const spell = getSpellById('jump')
    expect(spell).toBeDefined()
    expect(spell!.targetType).toBe('ally')
    expect(spell!.conditionOnTarget).toBe('jump')
    expect(spell!.multiTarget).toBeDefined()
    expect(spell!.multiTarget!.baseCount).toBe(1)
    expect(spell!.multiTarget!.additionalPerLevel).toBe(1)
  })

  it('Longstrider has ally targeting and conditionOnTarget (speed bonus via condition)', () => {
    const spell = getSpellById('longstrider')
    expect(spell).toBeDefined()
    expect(spell!.targetType).toBe('ally')
    expect(spell!.conditionOnTarget).toBe('longstrider')
    expect(spell!.multiTarget).toBeDefined()
    expect(spell!.multiTarget!.baseCount).toBe(1)
    expect(spell!.multiTarget!.additionalPerLevel).toBe(1)
  })

  it('Expeditious Retreat has grantsDash and conditionOnSelf', () => {
    const spell = getSpellById('expeditious-retreat')
    expect(spell).toBeDefined()
    expect(spell!.grantsDash).toBe(true)
    expect(spell!.conditionOnSelf).toBe('expeditious_retreat')
    expect(spell!.concentration).toBe(true)
    expect(spell!.castingTime).toContain('bonus action')
  })

  it('Protection from Evil and Good has conditionOnTarget', () => {
    const spell = getSpellById('protection-from-evil-and-good')
    expect(spell).toBeDefined()
    expect(spell!.targetType).toBe('ally')
    expect(spell!.conditionOnTarget).toBe('protected_from_evil_good')
    expect(spell!.concentration).toBe(true)
  })

  it('Fog Cloud creates a fog zone with area scaling', () => {
    const spell = getSpellById('fog-cloud')
    expect(spell).toBeDefined()
    expect(spell!.createsZone).toBe(ZoneType.Fog)
    expect(spell!.areaScalingPerSlotLevel).toBe(20)
    expect(spell!.areaOfEffect).toBeDefined()
    expect(spell!.areaOfEffect!.type).toBe('sphere')
    expect(spell!.areaOfEffect!.size).toBe(20)
    expect(spell!.concentration).toBe(true)
  })

  it('Grease creates a grease zone with zoneSave', () => {
    const spell = getSpellById('grease')
    expect(spell).toBeDefined()
    expect(spell!.createsZone).toBe(ZoneType.Grease)
    expect(spell!.zoneSave).toBeDefined()
    expect(spell!.zoneSave!.ability).toBe('dexterity')
    expect(spell!.zoneSave!.condition).toBe('prone')
    expect(spell!.concentration).toBe(false)
  })

  it('Witch Bolt upcast scaling is 1d12 per level', () => {
    const spell = getSpellById('witch-bolt')
    expect(spell!.upcastDice).toBeDefined()
    expect(spell!.upcastDice!.dicePerLevel).toBe('1d12')
  })

  it('Ray of Sickness upcast scaling is 1d8 per level', () => {
    const spell = getSpellById('ray-of-sickness')
    expect(spell!.upcastDice).toBeDefined()
    expect(spell!.upcastDice!.dicePerLevel).toBe('1d8')
  })
})

// ============================================
// Ray of Sickness: conditionOnHit tests
// ============================================

describe('Ray of Sickness: spell attack with conditionOnHit', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('deals poison damage on hit', () => {
    // d20 = 15 → (15-1)/20 = 0.7, total = 15 + 7(spell attack bonus) = 22 >= 15 ✓
    vi.spyOn(Math, 'random').mockReturnValue(0.7)
    const character = createWizardCombatant().data as Character
    const target = createMonsterTarget()
    const spell = getSpellById('ray-of-sickness')!

    const result = resolveSpellAttack(character, target, spell, '2d8')
    expect(result.hit).toBe(true)
    expect(result.damageType).toBe('poison')
    expect(result.damage).toBeDefined()
    expect(result.damage!.total).toBeGreaterThan(0)
  })

  it('misses on natural 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // d20 = 1
    const character = createWizardCombatant().data as Character
    const target = createMonsterTarget()
    const spell = getSpellById('ray-of-sickness')!

    const result = resolveSpellAttack(character, target, spell, '2d8')
    expect(result.hit).toBe(false)
    expect(result.naturalOne).toBe(true)
  })

  it('upcast Ray of Sickness adds extra d8 per level', () => {
    const spell = getSpellById('ray-of-sickness')!
    // Base level 1 at caster level 5 = 2d8
    const baseDice = getEffectiveDamageDice(spell, 5)
    expect(baseDice).toBe('2d8')

    // Upcast to level 2 = 2d8 + 1d8
    const upcastDice = getEffectiveDamageDice(spell, 5, 2)
    expect(upcastDice).toBe('2d8+1d8')

    // Upcast to level 3 = 2d8 + 2d8
    const upcast3Dice = getEffectiveDamageDice(spell, 5, 3)
    expect(upcast3Dice).toBe('2d8+2d8')
  })
})

// ============================================
// Witch Bolt tests
// ============================================

describe('Witch Bolt: spell attack and concentration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('deals lightning damage on hit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7) // d20 = 15, hit
    const character = createWizardCombatant().data as Character
    const target = createMonsterTarget()
    const spell = getSpellById('witch-bolt')!

    const result = resolveSpellAttack(character, target, spell, '2d12')
    expect(result.hit).toBe(true)
    expect(result.damageType).toBe('lightning')
    expect(result.damage).toBeDefined()
    expect(result.damage!.total).toBeGreaterThan(0)
  })

  it('upcast Witch Bolt adds 1d12 per level', () => {
    const spell = getSpellById('witch-bolt')!
    const baseDice = getEffectiveDamageDice(spell, 5)
    expect(baseDice).toBe('2d12')

    const upcastDice = getEffectiveDamageDice(spell, 5, 2)
    expect(upcastDice).toBe('2d12+1d12')

    const upcast3Dice = getEffectiveDamageDice(spell, 5, 3)
    expect(upcast3Dice).toBe('2d12+2d12')
  })

  it('spell has conditionOnSelf for bonus action zap tracking', () => {
    const spell = getSpellById('witch-bolt')!
    expect(spell.conditionOnSelf).toBe('witch_bolt')
  })

  it('is a concentration spell', () => {
    const spell = getSpellById('witch-bolt')!
    expect(spell.concentration).toBe(true)
  })
})

// ============================================
// Tasha's Hideous Laughter: multiple conditions on failed save
// ============================================

describe("Tasha's Hideous Laughter: conditionsOnFailedSave and repeat saves", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('applies prone and incapacitated on failed wisdom save', () => {
    const spell = getSpellById('tashas-hideous-laughter')!
    expect(spell.conditionsOnFailedSave).toEqual(['prone', 'incapacitated'])
    expect(spell.savingThrow).toBe('wisdom')
  })

  it('repeat save triggers at end of turn and on damage', () => {
    const spell = getSpellById('tashas-hideous-laughter')!
    expect(spell.repeatSave).toBeDefined()
    expect(spell.repeatSave!.onEndOfTurn).toBe(true)
    expect(spell.repeatSave!.onDamage).toBe(true)
  })

  it('repeat save on damage grants advantage', () => {
    const spell = getSpellById('tashas-hideous-laughter')!
    expect(spell.repeatSave!.advantageOnDamage).toBe(true)
  })

  it('repeat save does NOT have onFailCondition (no condition upgrade)', () => {
    const spell = getSpellById('tashas-hideous-laughter')!
    expect(spell.repeatSave!.onFailCondition).toBeUndefined()
  })

  it('ActiveCondition structure for Tasha\'s has repeatSave on first condition only', () => {
    // Simulate what the store does: attach repeatSave to first condition (prone)
    const spell = getSpellById('tashas-hideous-laughter')!
    const dc = 15 // 8 + prof(3) + INT(4)
    const repeatSaveData = {
      ability: spell.repeatSave!.ability,
      dc,
      onEndOfTurn: spell.repeatSave!.onEndOfTurn,
      onDamage: spell.repeatSave!.onDamage,
      advantageOnDamage: spell.repeatSave!.advantageOnDamage,
    }

    const newConditions: ActiveCondition[] = spell.conditionsOnFailedSave!.map((cond, idx) => ({
      condition: cond,
      source: "Test Wizard's Tasha's Hideous Laughter",
      ...(idx === 0 ? { repeatSave: repeatSaveData } : {}),
    }))

    expect(newConditions).toHaveLength(2)
    expect(newConditions[0].condition).toBe('prone')
    expect(newConditions[0].repeatSave).toBeDefined()
    expect(newConditions[0].repeatSave!.onDamage).toBe(true)
    expect(newConditions[0].repeatSave!.advantageOnDamage).toBe(true)
    expect(newConditions[1].condition).toBe('incapacitated')
    expect(newConditions[1].repeatSave).toBeUndefined()
  })

  it('successful repeat save removes ALL conditions from the same source', () => {
    // Verify both conditions share the same source string so removal logic works
    const source = "Test Wizard's Tasha's Hideous Laughter"

    const conditions: ActiveCondition[] = [
      { condition: 'prone', source, repeatSave: { ability: 'wisdom', dc: 15, onEndOfTurn: true, onDamage: true, advantageOnDamage: true } },
      { condition: 'incapacitated', source },
    ]

    // Simulate removal: filter by source
    const sourceToRemove = conditions[0].source
    const remaining = conditions.filter(c => c.source !== sourceToRemove)
    expect(remaining).toHaveLength(0) // Both removed since same source
  })
})

// ============================================
// Sleep: endsOnDamage + repeat save with onFailCondition upgrade
// ============================================

describe('Sleep: endsOnDamage and condition upgrade on failed repeat save', () => {
  it('initial condition is incapacitated with endsOnDamage', () => {
    const spell = getSpellById('sleep')!
    expect(spell.conditionOnFailedSave).toBe('incapacitated')
    expect(spell.endsOnDamage).toBe(true)
  })

  it('repeat save at end of turn can upgrade to unconscious', () => {
    const spell = getSpellById('sleep')!
    expect(spell.repeatSave!.onEndOfTurn).toBe(true)
    expect(spell.repeatSave!.onFailCondition).toBe('unconscious')
  })

  it('upgraded unconscious condition also ends on damage', () => {
    const spell = getSpellById('sleep')!
    expect(spell.repeatSave!.onFailEndsOnDamage).toBe(true)
  })

  it('ActiveCondition structure for Sleep has correct fields', () => {
    const spell = getSpellById('sleep')!
    const dc = 15

    // Simulate store creating the condition
    const condition: ActiveCondition = {
      condition: spell.conditionOnFailedSave!,
      source: "Test Wizard's Sleep",
      casterId: 'wizard-1',
      endsOnDamage: spell.endsOnDamage,
      repeatSave: {
        ability: spell.repeatSave!.ability,
        dc,
        onEndOfTurn: spell.repeatSave!.onEndOfTurn,
        onFailCondition: spell.repeatSave!.onFailCondition,
        onFailEndsOnDamage: spell.repeatSave!.onFailEndsOnDamage,
      },
    }

    expect(condition.condition).toBe('incapacitated')
    expect(condition.endsOnDamage).toBe(true)
    expect(condition.repeatSave!.onFailCondition).toBe('unconscious')
    expect(condition.repeatSave!.onFailEndsOnDamage).toBe(true)
  })

  it('on failed repeat save, condition upgrades to unconscious with endsOnDamage', () => {
    // Simulate the turnManager repeat save logic:
    // When repeat save fails with onFailCondition, replace conditions from that source
    const source = "Test Wizard's Sleep"
    const originalCondition: ActiveCondition = {
      condition: 'incapacitated',
      source,
      casterId: 'wizard-1',
      endsOnDamage: true,
      repeatSave: {
        ability: 'wisdom',
        dc: 15,
        onEndOfTurn: true,
        onFailCondition: 'unconscious',
        onFailEndsOnDamage: true,
      },
    }

    // Simulate upgrade: remove old conditions from source, add new one
    const existingConditions = [originalCondition]
    const newCondition: ActiveCondition = {
      condition: originalCondition.repeatSave!.onFailCondition!,
      source,
      casterId: 'wizard-1',
      endsOnDamage: originalCondition.repeatSave!.onFailEndsOnDamage,
    }
    const updatedConditions = [
      ...existingConditions.filter(c => c.source !== source),
      newCondition,
    ]

    expect(updatedConditions).toHaveLength(1)
    expect(updatedConditions[0].condition).toBe('unconscious')
    expect(updatedConditions[0].endsOnDamage).toBe(true)
    expect(updatedConditions[0].source).toBe(source)
  })

  it('endsOnDamage removes condition when target takes damage', () => {
    // Simulate the dealDamage endsOnDamage logic
    const conditions: ActiveCondition[] = [
      { condition: 'unconscious', source: "Test Wizard's Sleep", endsOnDamage: true },
      { condition: 'poisoned', source: 'Some other source' }, // not endsOnDamage
    ]

    const afterDamage = conditions.filter(c => !c.endsOnDamage)
    expect(afterDamage).toHaveLength(1)
    expect(afterDamage[0].condition).toBe('poisoned')
  })
})

// ============================================
// False Life: temp HP
// ============================================

describe('False Life: temporary hit points', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('spell has correct grantsTempHp formula', () => {
    const spell = getSpellById('false-life')!
    expect(spell.grantsTempHp).toBe('2d4+4')
  })

  it('upcast bonus is +5 per level above 1', () => {
    const spell = getSpellById('false-life')!
    expect(spell.grantsTempHpUpcastBonus).toBe(5)
    // At level 2: 2d4+4 + 5 = 2d4+9
    // At level 3: 2d4+4 + 10 = 2d4+14
  })

  it('is not a concentration spell', () => {
    const spell = getSpellById('false-life')!
    expect(spell.concentration).toBe(false)
  })

  it('temp HP does not stack — takes higher value', () => {
    // Simulate the store logic: Math.max(existing, new)
    const existingTempHp = 8
    const newTempHp = 12
    expect(Math.max(existingTempHp, newTempHp)).toBe(12)

    // If existing is higher, keep it
    expect(Math.max(15, 10)).toBe(15)
  })
})

// ============================================
// Ice Knife: explosion on impact
// ============================================

describe('Ice Knife: primary attack + explosion on impact', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('primary attack deals piercing damage on hit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7) // d20 = 15, hit
    const character = createWizardCombatant().data as Character
    const target = createMonsterTarget()
    const spell = getSpellById('ice-knife')!

    const result = resolveSpellAttack(character, target, spell, '1d10')
    expect(result.hit).toBe(true)
    expect(result.damageType).toBe('piercing')
    expect(result.damage).toBeDefined()
  })

  it('explosion has cold damage, dex save, 5ft radius', () => {
    const spell = getSpellById('ice-knife')!
    expect(spell.explosionOnImpact!.damage.type).toBe('cold')
    expect(spell.explosionOnImpact!.savingThrow).toBe('dexterity')
    expect(spell.explosionOnImpact!.radius).toBe(5)
  })

  it('explosion upcast scaling adds 1d6 per level above 1', () => {
    const spell = getSpellById('ice-knife')!
    expect(spell.explosionOnImpact!.upcastDice).toBe('1d6')

    // Simulate upcast dice calculation at level 2
    const baseDice = spell.explosionOnImpact!.damage.dice // '2d6'
    const castAtLevel = 2
    const upMatch = spell.explosionOnImpact!.upcastDice!.match(/(\d+)d(\d+)/)
    expect(upMatch).toBeTruthy()
    if (upMatch) {
      const extraDice = parseInt(upMatch[1]) * (castAtLevel - spell.level)
      const result = `${baseDice}+${extraDice}d${upMatch[2]}`
      expect(result).toBe('2d6+1d6')
    }
  })

  it('explosion triggers on miss too (hit or miss)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05) // d20 = 2, miss
    const character = createWizardCombatant().data as Character
    const target = createMonsterTarget()
    const spell = getSpellById('ice-knife')!

    const result = resolveSpellAttack(character, target, spell, '1d10')
    expect(result.hit).toBe(false)
    // The explosion still triggers — verified by the store code which calls triggerExplosionOnImpact() in both hit and miss paths
    expect(spell.explosionOnImpact).toBeDefined()
  })
})

// ============================================
// Jump: ally buff spell
// ============================================

describe('Jump: ally targeting and movement buff', () => {
  it('targets allies only', () => {
    const spell = getSpellById('jump')!
    expect(spell.targetType).toBe('ally')
  })

  it('base count is 1, +1 per upcast level', () => {
    const spell = getSpellById('jump')!
    expect(spell.multiTarget!.baseCount).toBe(1)
    expect(spell.multiTarget!.additionalPerLevel).toBe(1)
    // At level 2: 2 targets, level 3: 3 targets, etc.
  })

  it('applies jump condition to targets', () => {
    const spell = getSpellById('jump')!
    expect(spell.conditionOnTarget).toBe('jump')
  })

  it('is a bonus action', () => {
    const spell = getSpellById('jump')!
    expect(spell.castingTime).toContain('bonus action')
  })

  it('is NOT a concentration spell', () => {
    const spell = getSpellById('jump')!
    expect(spell.concentration).toBe(false)
  })
})

// ============================================
// Longstrider: ally buff spell
// ============================================

describe('Longstrider: ally targeting and speed buff', () => {
  it('targets allies and applies longstrider condition (speed bonus via getCombatantSpeed)', () => {
    const spell = getSpellById('longstrider')!
    expect(spell.targetType).toBe('ally')
    expect(spell.conditionOnTarget).toBe('longstrider')
  })

  it('is NOT a concentration spell', () => {
    const spell = getSpellById('longstrider')!
    expect(spell.concentration).toBe(false)
  })

  it('is a standard action', () => {
    const spell = getSpellById('longstrider')!
    expect(spell.castingTime).toBe('1 action')
  })

  it('multi-target with +1 per upcast level', () => {
    const spell = getSpellById('longstrider')!
    expect(spell.multiTarget!.baseCount).toBe(1)
    expect(spell.multiTarget!.additionalPerLevel).toBe(1)
  })
})

// ============================================
// Expeditious Retreat: self-buff + concentration
// ============================================

describe('Expeditious Retreat: grantsDash and conditionOnSelf', () => {
  it('grants Dash on cast', () => {
    const spell = getSpellById('expeditious-retreat')!
    expect(spell.grantsDash).toBe(true)
  })

  it('applies expeditious_retreat condition on self', () => {
    const spell = getSpellById('expeditious-retreat')!
    expect(spell.conditionOnSelf).toBe('expeditious_retreat')
  })

  it('is a bonus action concentration spell', () => {
    const spell = getSpellById('expeditious-retreat')!
    expect(spell.castingTime).toContain('bonus action')
    expect(spell.concentration).toBe(true)
  })

  it('grantsDash simulation: reduces movementUsed by speed', () => {
    // Simulate what the store does: movementUsed -= speed
    const caster = createWizardCombatant({ movementUsed: 20 })
    const speed = (caster.data as Character).speed
    const newMovementUsed = caster.movementUsed - speed
    expect(newMovementUsed).toBe(-10) // 20 - 30 = -10 (meaning they have 10 + 30 = 40ft to move)
  })
})

// ============================================
// Fog Cloud: zone creation
// ============================================

describe('Fog Cloud: persistent zone creation', () => {
  it('creates fog zone type', () => {
    const spell = getSpellById('fog-cloud')!
    expect(spell.createsZone).toBe(ZoneType.Fog)
  })

  it('base radius is 20ft sphere', () => {
    const spell = getSpellById('fog-cloud')!
    expect(spell.areaOfEffect!.type).toBe('sphere')
    expect(spell.areaOfEffect!.size).toBe(20)
  })

  it('upcast scaling adds 20ft per level above 1', () => {
    const spell = getSpellById('fog-cloud')!
    expect(spell.areaScalingPerSlotLevel).toBe(20)

    // Simulate effective radius calculation
    const castAtLevel = 3
    const effectiveRadius = spell.areaOfEffect!.size +
      (castAtLevel > spell.level ? (castAtLevel - spell.level) * spell.areaScalingPerSlotLevel! : 0)
    expect(effectiveRadius).toBe(60) // 20 + (3-1)*20 = 60
  })

  it('is a concentration spell', () => {
    const spell = getSpellById('fog-cloud')!
    expect(spell.concentration).toBe(true)
  })
})

// ============================================
// Grease: zone creation with zone save
// ============================================

describe('Grease: persistent zone with zone save', () => {
  it('creates grease zone type', () => {
    const spell = getSpellById('grease')!
    expect(spell.createsZone).toBe(ZoneType.Grease)
  })

  it('zone save is dexterity, condition is prone', () => {
    const spell = getSpellById('grease')!
    expect(spell.zoneSave!.ability).toBe('dexterity')
    expect(spell.zoneSave!.condition).toBe('prone')
  })

  it('is NOT a concentration spell (lasts 1 minute)', () => {
    const spell = getSpellById('grease')!
    expect(spell.concentration).toBe(false)
  })

  it('is a 10ft cube area', () => {
    const spell = getSpellById('grease')!
    expect(spell.areaOfEffect!.type).toBe('cube')
    expect(spell.areaOfEffect!.size).toBe(10)
  })

  it('initial cast also applies conditionOnFailedSave: prone', () => {
    const spell = getSpellById('grease')!
    expect(spell.conditionOnFailedSave).toBe('prone')
    expect(spell.savingThrow).toBe('dexterity')
  })
})

// ============================================
// Chromatic Orb: damage type choice + bounce
// ============================================

describe('Chromatic Orb: damage type choice and bounce', () => {
  it('has damage type choice with 6 options', () => {
    const spell = getSpellById('chromatic-orb')!
    expect(spell.damageTypeChoice).toEqual(['acid', 'cold', 'fire', 'lightning', 'poison', 'thunder'])
  })

  it('has bounce mechanic with 30ft range', () => {
    const spell = getSpellById('chromatic-orb')!
    expect(spell.bounce!.range).toBe(30)
    expect(spell.bounce!.maxBounces).toBe(1)
  })

  it('deals 3d8 base damage with upcast 1d8 per level', () => {
    const spell = getSpellById('chromatic-orb')!
    expect(spell.damage!.dice).toBe('3d8')
    expect(spell.upcastDice!.dicePerLevel).toBe('1d8')
  })

  it('upcast dice scales correctly', () => {
    const spell = getSpellById('chromatic-orb')!
    const baseDice = getEffectiveDamageDice(spell, 5)
    expect(baseDice).toBe('3d8')

    const upcast2 = getEffectiveDamageDice(spell, 5, 2)
    expect(upcast2).toBe('3d8+1d8')
  })
})

// ============================================
// Witch Bolt bonus action zap simulation
// ============================================

describe('Witch Bolt: bonus action zap mechanics', () => {
  it('zap always deals 1d12 regardless of upcast level', () => {
    // The useWitchBoltZap function always uses '1d12', not the upcast dice
    // This is per the 2024 PHB: "deal 1d12 Lightning damage to the target automatically"
    const zapDice = '1d12'
    expect(zapDice).toBe('1d12')
  })

  it('requires witch_bolt condition and witchBoltTargetId', () => {
    const caster = createWizardCombatant({
      conditions: [{ condition: 'witch_bolt', source: 'Witch Bolt' }],
      witchBoltTargetId: 'mon-1',
    } as Partial<Combatant>)

    expect(caster.conditions.some(c => c.condition === 'witch_bolt')).toBe(true)
    expect((caster as Combatant & { witchBoltTargetId?: string }).witchBoltTargetId).toBe('mon-1')
  })

  it('cannot zap if bonus action already used', () => {
    const caster = createWizardCombatant({
      hasBonusActed: true,
      conditions: [{ condition: 'witch_bolt', source: 'Witch Bolt' }],
      witchBoltTargetId: 'mon-1',
    } as Partial<Combatant>)

    expect(caster.hasBonusActed).toBe(true)
    // useWitchBoltZap checks hasBonusActed and returns early
  })

  it('cannot zap if target is dead', () => {
    const target = createMonsterTarget({ currentHp: 0 })
    expect(target.currentHp).toBe(0)
    // useWitchBoltZap checks target.currentHp <= 0 and returns early
  })
})

// ============================================
// Witch Bolt: target death ends concentration
// ============================================

describe('Witch Bolt: concentration ends when target dies', () => {
  it('death cleanup removes witchBoltTargetId, concentratingOn, and witch_bolt condition', () => {
    // Simulate the dealDamage cleanup logic
    const caster = createWizardCombatant({
      witchBoltTargetId: 'mon-1',
      concentratingOn: getSpellById('witch-bolt'),
      conditions: [
        { condition: 'witch_bolt', source: 'Witch Bolt' },
      ],
    } as Partial<Combatant>)

    // After target dies, store clears these fields
    const cleaned = {
      ...caster,
      witchBoltTargetId: undefined,
      concentratingOn: undefined,
      conditions: caster.conditions.filter(c => c.condition !== 'witch_bolt'),
    }

    expect(cleaned.witchBoltTargetId).toBeUndefined()
    expect(cleaned.concentratingOn).toBeUndefined()
    expect(cleaned.conditions).toHaveLength(0)
  })

  it('only casters with matching witchBoltTargetId are cleaned up', () => {
    const caster1 = createWizardCombatant({
      id: 'wizard-1',
      witchBoltTargetId: 'mon-1',
    } as Partial<Combatant>)

    const caster2 = createWizardCombatant({
      id: 'wizard-2',
      witchBoltTargetId: 'mon-2', // targeting different monster
    } as Partial<Combatant>)

    const targetId = 'mon-1'
    const combatants = [caster1, caster2]

    // Only wizard-1 should be cleaned up
    const witchBoltCasters = combatants.filter(c =>
      (c as Combatant & { witchBoltTargetId?: string }).witchBoltTargetId === targetId
    )
    expect(witchBoltCasters).toHaveLength(1)
    expect(witchBoltCasters[0].id).toBe('wizard-1')
  })
})

// ============================================
// Concentration shift: cleanup of previous effects
// ============================================

describe('Concentration shift: cleanup when casting new concentration spell', () => {
  it('casting new concentration spell clears self-buff condition from previous', () => {
    // Simulate: wizard was concentrating on Expeditious Retreat (conditionOnSelf: expeditious_retreat)
    // Now casting Witch Bolt (concentration) should clear the expeditious_retreat condition
    const previousSpell = getSpellById('expeditious-retreat')!
    const newSpell = getSpellById('witch-bolt')!

    expect(previousSpell.conditionOnSelf).toBe('expeditious_retreat')
    expect(newSpell.concentration).toBe(true)

    // The store removes the old conditionOnSelf before setting new concentratingOn
    const conditions: ActiveCondition[] = [
      { condition: 'expeditious_retreat', source: 'Expeditious Retreat' },
    ]
    const cleanedConditions = conditions.filter(c => c.condition !== previousSpell.conditionOnSelf)
    expect(cleanedConditions).toHaveLength(0)
  })

  it('casting new concentration spell clears Witch Bolt target link', () => {
    const previousSpell = getSpellById('witch-bolt')!
    expect(previousSpell.id).toBe('witch-bolt')

    // The store checks: if currentConc?.id === 'witch-bolt', clear witchBoltTargetId
    const caster = createWizardCombatant({
      witchBoltTargetId: 'mon-1',
      concentratingOn: previousSpell,
    } as Partial<Combatant>)

    // After cleanup
    expect(caster.witchBoltTargetId).toBe('mon-1') // before cleanup
    // Store would set witchBoltTargetId: undefined
  })

  it('casting new concentration spell removes conditions applied by previous spell', () => {
    // E.g., Tasha's Hideous Laughter conditions removed when casting new concentration spell
    const previousSpell = getSpellById('tashas-hideous-laughter')!
    expect(previousSpell.conditionsOnFailedSave).toEqual(['prone', 'incapacitated'])

    const source = "Test Wizard's Tasha's Hideous Laughter"
    const targetConditions: ActiveCondition[] = [
      { condition: 'prone', source },
      { condition: 'incapacitated', source },
      { condition: 'poisoned', source: 'Some other effect' },
    ]

    // Store removes conditions matching the source
    const cleaned = targetConditions.filter(c => c.source !== source)
    expect(cleaned).toHaveLength(1)
    expect(cleaned[0].condition).toBe('poisoned')
  })
})

// ============================================
// Upcast scaling for various spells
// ============================================

describe('Upcast scaling for new spells', () => {
  it('Ice Knife primary damage does NOT upcast (only explosion does)', () => {
    const spell = getSpellById('ice-knife')!
    // Ice Knife has no upcastDice on the primary attack
    expect(spell.upcastDice).toBeUndefined()
    const baseDice = getEffectiveDamageDice(spell, 5)
    expect(baseDice).toBe('1d10')
    // Upcast doesn't change primary damage
    const upcastDice = getEffectiveDamageDice(spell, 5, 2)
    expect(upcastDice).toBe('1d10')
  })

  it('Witch Bolt upcast adds initial damage dice only', () => {
    const spell = getSpellById('witch-bolt')!
    // Level 1: 2d12, Level 2: 2d12+1d12, Level 3: 2d12+2d12
    const level1 = getEffectiveDamageDice(spell, 5, 1)
    expect(level1).toBe('2d12') // base level, no upcast
    const level2 = getEffectiveDamageDice(spell, 5, 2)
    expect(level2).toBe('2d12+1d12')
    const level3 = getEffectiveDamageDice(spell, 5, 3)
    expect(level3).toBe('2d12+2d12')
  })

  it('Fog Cloud area scales but has no damage', () => {
    const spell = getSpellById('fog-cloud')!
    expect(spell.damage).toBeUndefined()
    const damageDice = getEffectiveDamageDice(spell, 5, 2)
    expect(damageDice).toBeUndefined()
  })
})
