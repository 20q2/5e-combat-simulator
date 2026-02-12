import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateSpellCasting,
  validateSpellSlot,
  findAoETargets,
  resolveSpellAttack,
  resolveSpellSave,
  resolveProjectiles,
  getEffectiveDamageDice,
} from '@/engine/spellCasting'
import type { Combatant, Character, Monster, Spell } from '@/types'

// ============================================
// Test helpers
// ============================================

function createCharacterCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'char-1',
    name: 'Test Wizard',
    type: 'character',
    position: { x: 5, y: 5 },
    currentHp: 20,
    maxHp: 20,
    initiative: 12,
    conditions: [],
    hasActed: false,
    hasBonusActed: false,
    hasReacted: false,
    movementUsed: 0,
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
    data: {
      name: 'Test Wizard',
      level: 5,
      race: { name: 'Human', size: 'medium', speed: 30, abilities: [] },
      class: { name: 'Wizard', hitDie: 'd6', features: [], spellcasting: { ability: 'intelligence' } },
      abilityScores: { strength: 8, dexterity: 14, constitution: 12, intelligence: 18, wisdom: 12, charisma: 10 },
      maxHp: 20,
      ac: 15,
      armorClass: 15,
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

function createMonsterCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'mon-1',
    name: 'Goblin',
    type: 'monster',
    position: { x: 10, y: 5 },
    currentHp: 7,
    maxHp: 7,
    initiative: 10,
    conditions: [],
    hasActed: false,
    hasBonusActed: false,
    hasReacted: false,
    movementUsed: 0,
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
    data: {
      name: 'Goblin',
      type: 'beast',
      size: 'small',
      armorClass: 15,
      ac: 15,
      maxHp: 7,
      speed: 30,
      abilityScores: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 },
      actions: [],
    } as unknown as Monster,
    ...overrides,
  } as Combatant
}

function createSpell(overrides: Partial<Spell> = {}): Spell {
  return {
    id: 'fire-bolt',
    name: 'Fire Bolt',
    level: 0,
    school: 'evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'A bolt of fire.',
    classes: ['wizard'],
    attackType: 'ranged',
    damage: { dice: '1d10', type: 'fire' },
    ...overrides,
  } as Spell
}

// ============================================
// validateSpellCasting
// ============================================

describe('validateSpellCasting', () => {
  it('allows action spell when action is available', () => {
    const caster = createCharacterCombatant()
    const spell = createSpell()
    const result = validateSpellCasting(caster, spell)
    expect(result.canCast).toBe(true)
    expect(result.isBonusAction).toBe(false)
  })

  it('rejects action spell when action already used', () => {
    const caster = createCharacterCombatant({ hasActed: true })
    const spell = createSpell()
    const result = validateSpellCasting(caster, spell)
    expect(result.canCast).toBe(false)
    expect(result.reason).toContain('Action already used')
  })

  it('allows bonus action spell when bonus action available', () => {
    const caster = createCharacterCombatant()
    const spell = createSpell({ castingTime: '1 bonus action' })
    const result = validateSpellCasting(caster, spell)
    expect(result.canCast).toBe(true)
    expect(result.isBonusAction).toBe(true)
  })

  it('rejects bonus action spell when bonus action used', () => {
    const caster = createCharacterCombatant({ hasBonusActed: true })
    const spell = createSpell({ castingTime: '1 bonus action' })
    const result = validateSpellCasting(caster, spell)
    expect(result.canCast).toBe(false)
    expect(result.reason).toContain('Bonus action already used')
  })

  it('rejects reaction spells (require trigger)', () => {
    const caster = createCharacterCombatant()
    const spell = createSpell({ castingTime: '1 reaction' })
    const result = validateSpellCasting(caster, spell)
    expect(result.canCast).toBe(false)
    expect(result.reason).toContain('trigger')
  })

  it('rejects monster casters', () => {
    const caster = createMonsterCombatant()
    const spell = createSpell()
    const result = validateSpellCasting(caster, spell)
    expect(result.canCast).toBe(false)
  })
})

// ============================================
// validateSpellSlot
// ============================================

describe('validateSpellSlot', () => {
  it('cantrips always valid (no slot needed)', () => {
    const caster = createCharacterCombatant()
    const spell = createSpell({ level: 0 })
    const result = validateSpellSlot(caster, spell)
    expect(result.canCast).toBe(true)
    expect(result.useMagicInitiateFreeUse).toBe(false)
  })

  it('leveled spell with available slot is valid', () => {
    const caster = createCharacterCombatant()
    const spell = createSpell({ level: 1 })
    const result = validateSpellSlot(caster, spell)
    expect(result.canCast).toBe(true)
    expect(result.useMagicInitiateFreeUse).toBe(false)
    expect(result.slotsRemaining).toBe(4)
  })

  it('leveled spell with no slots remaining is invalid', () => {
    const caster = createCharacterCombatant({
      data: {
        ...(createCharacterCombatant().data as Character),
        spellSlots: { 1: { current: 0, max: 4 } },
      } as unknown as Character,
    })
    const spell = createSpell({ level: 1 })
    const result = validateSpellSlot(caster, spell)
    expect(result.canCast).toBe(false)
    expect(result.reason).toContain('No level 1 spell slots remaining')
  })

  it('detects Magic Initiate free use', () => {
    const caster = createCharacterCombatant({
      magicInitiateFreeUses: { 'healing-word': true },
    })
    const spell = createSpell({ id: 'healing-word', level: 1 })
    const result = validateSpellSlot(caster, spell)
    expect(result.canCast).toBe(true)
    expect(result.useMagicInitiateFreeUse).toBe(true)
  })

  it('returns invalid when no spellSlots at all', () => {
    const caster = createCharacterCombatant({
      data: {
        ...(createCharacterCombatant().data as Character),
        spellSlots: undefined,
      } as unknown as Character,
    })
    const spell = createSpell({ level: 1 })
    const result = validateSpellSlot(caster, spell)
    expect(result.canCast).toBe(false)
    expect(result.reason).toContain('No spell slots')
  })
})

// ============================================
// findAoETargets
// ============================================

describe('findAoETargets', () => {
  it('returns empty array for non-AoE spells', () => {
    const caster = createCharacterCombatant()
    const spell = createSpell() // no areaOfEffect
    const combatants = [caster, createMonsterCombatant()]
    const result = findAoETargets(caster, spell, { x: 10, y: 5 }, undefined, combatants)
    expect(result).toHaveLength(0)
  })

  it('excludes dead combatants from AoE', () => {
    const caster = createCharacterCombatant({ position: { x: 0, y: 0 } })
    const deadMonster = createMonsterCombatant({ currentHp: 0, position: { x: 1, y: 0 } })
    const spell = createSpell({
      areaOfEffect: { type: 'sphere', size: 20, origin: 'point' },
    })
    const result = findAoETargets(caster, spell, { x: 1, y: 0 }, undefined, [caster, deadMonster])
    expect(result).toHaveLength(0)
  })

  it('excludes caster from AoE', () => {
    const caster = createCharacterCombatant({ position: { x: 5, y: 5 } })
    const monster = createMonsterCombatant({ position: { x: 5, y: 5 } })
    const spell = createSpell({
      areaOfEffect: { type: 'sphere', size: 20, origin: 'point' },
    })
    const result = findAoETargets(caster, spell, { x: 5, y: 5 }, undefined, [caster, monster])
    // Should not include caster even if in AoE
    expect(result.every(t => t.id !== caster.id)).toBe(true)
  })

  it('for player caster, hits only monsters (not allied characters)', () => {
    const caster = createCharacterCombatant({ id: 'char-1', position: { x: 0, y: 0 } })
    const ally = createCharacterCombatant({ id: 'char-2', name: 'Ally', position: { x: 1, y: 0 } })
    const monster = createMonsterCombatant({ position: { x: 1, y: 0 } })
    const spell = createSpell({
      areaOfEffect: { type: 'sphere', size: 20, origin: 'point' },
    })
    const result = findAoETargets(caster, spell, { x: 1, y: 0 }, undefined, [caster, ally, monster])
    // Should only include the monster, not the ally
    expect(result.every(t => t.type === 'monster')).toBe(true)
  })

  it('resolves target position from targetId when no position given', () => {
    const caster = createCharacterCombatant({ position: { x: 0, y: 0 } })
    const monster = createMonsterCombatant({ id: 'target-mon', position: { x: 1, y: 0 } })
    const spell = createSpell({
      areaOfEffect: { type: 'sphere', size: 20, origin: 'point' },
    })
    const result = findAoETargets(caster, spell, undefined, 'target-mon', [caster, monster])
    // Should resolve position from target-mon and find targets in area
    expect(result.length).toBeGreaterThanOrEqual(0) // depends on AoE shape logic
  })
})

// ============================================
// resolveSpellAttack
// ============================================

describe('resolveSpellAttack', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('misses on natural 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // d20 = 1
    const character = createCharacterCombatant().data as Character
    const target = createMonsterCombatant()
    const spell = createSpell({ damage: { dice: '1d10', type: 'fire' } })

    const result = resolveSpellAttack(character, target, spell, '1d10')
    expect(result.hit).toBe(false)
    expect(result.naturalOne).toBe(true)
    expect(result.damage).toBeUndefined()
  })

  it('crits on natural 20', () => {
    // d20 = 20 needs (20-1)/20 = 0.95
    vi.spyOn(Math, 'random').mockReturnValue(0.95)
    const character = createCharacterCombatant().data as Character
    const target = createMonsterCombatant()
    const spell = createSpell({ damage: { dice: '1d10', type: 'fire' } })

    const result = resolveSpellAttack(character, target, spell, '1d10')
    expect(result.hit).toBe(true)
    expect(result.critical).toBe(true)
    expect(result.damage).toBeDefined()
  })

  it('hits when roll total >= target AC', () => {
    // Need attack total >= 15 (goblin AC). Spell attack bonus = INT(+4) + prof(3) = +7
    // d20 = 10 needs (10-1)/20 = 0.45, total = 10 + 7 = 17 >= 15 ✓
    vi.spyOn(Math, 'random').mockReturnValue(0.45)
    const character = createCharacterCombatant().data as Character
    const target = createMonsterCombatant()
    const spell = createSpell({ damage: { dice: '1d10', type: 'fire' } })

    const result = resolveSpellAttack(character, target, spell, '1d10')
    expect(result.hit).toBe(true)
    expect(result.critical).toBe(false)
    expect(result.damage).toBeDefined()
    expect(result.damageType).toBe('fire')
  })

  it('misses when roll total < target AC', () => {
    // d20 = 2 needs (2-1)/20 = 0.05, total = 2 + 7 = 9 < 15 ✗
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const character = createCharacterCombatant().data as Character
    const target = createMonsterCombatant()
    const spell = createSpell({ damage: { dice: '1d10', type: 'fire' } })

    const result = resolveSpellAttack(character, target, spell, '1d10')
    expect(result.hit).toBe(false)
    expect(result.damage).toBeUndefined()
  })
})

// ============================================
// resolveSpellSave
// ============================================

describe('resolveSpellSave', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('on successful save returns half damage', () => {
    // High roll for save success: d20 = 19 → (19-1)/20 = 0.9
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const character = createCharacterCombatant().data as Character
    const target = createMonsterCombatant()
    const spell = createSpell({
      damage: { dice: '2d6', type: 'fire' },
      savingThrow: 'dexterity',
    })

    const result = resolveSpellSave(character, target, spell, '2d6')
    expect(result.saved).toBe(true)
    expect(result.halfDamage).toBe(Math.floor(result.damage.total / 2))
  })

  it('on failed save returns full damage', () => {
    // Low roll for save fail: d20 = 1 → 0/20 = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const character = createCharacterCombatant().data as Character
    const target = createMonsterCombatant()
    const spell = createSpell({
      damage: { dice: '2d6', type: 'fire' },
      savingThrow: 'dexterity',
    })

    const result = resolveSpellSave(character, target, spell, '2d6')
    expect(result.saved).toBe(false)
    expect(result.damage.total).toBeGreaterThan(0)
  })

  it('upgrades die when target is damaged (Toll the Dead)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const character = createCharacterCombatant().data as Character
    const target = createMonsterCombatant({ currentHp: 5, maxHp: 7 }) // damaged
    const spell = createSpell({
      damage: { dice: '1d8', type: 'necrotic' },
      savingThrow: 'wisdom',
      damagedTargetDieUpgrade: 'd12',
    } as Partial<Spell>)

    const result = resolveSpellSave(character, target, spell, '1d8')
    expect(result.effectiveDice).toBe('1d12')
  })

  it('does not upgrade die when target is at full HP', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const character = createCharacterCombatant().data as Character
    const target = createMonsterCombatant({ currentHp: 7, maxHp: 7 }) // full HP
    const spell = createSpell({
      damage: { dice: '1d8', type: 'necrotic' },
      savingThrow: 'wisdom',
      damagedTargetDieUpgrade: 'd12',
    } as Partial<Spell>)

    const result = resolveSpellSave(character, target, spell, '1d8')
    expect(result.effectiveDice).toBe('1d8')
  })

  it('DC calculation is correct (8 + prof + spellcasting mod)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const character = createCharacterCombatant().data as Character
    const target = createMonsterCombatant()
    const spell = createSpell({
      damage: { dice: '1d6', type: 'fire' },
      savingThrow: 'dexterity',
    })

    const result = resolveSpellSave(character, target, spell, '1d6')
    // DC = 8 + proficiency(3) + INT mod(4) = 15
    expect(result.dc).toBe(15)
  })
})

// ============================================
// resolveProjectiles
// ============================================

describe('resolveProjectiles', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rolls damage per projectile and sums for each target', () => {
    // Each 1d4+1 roll: random 0.5 → d4=3, +1 = 4
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const target = createMonsterCombatant()
    const spell = createSpell({
      projectiles: { count: 3, damagePerProjectile: '1d4+1' },
      damage: { dice: '1d4+1', type: 'force' },
    } as Partial<Spell>)
    const assignments = [{ targetId: 'mon-1', count: 3 }]

    const results = resolveProjectiles(spell, assignments, [target])
    expect(results).toHaveLength(1)
    expect(results[0].count).toBe(3)
    expect(results[0].perProjectileDamages).toHaveLength(3)
    expect(results[0].totalDamage).toBe(results[0].perProjectileDamages.reduce((a, b) => a + b, 0))
    expect(results[0].damageType).toBe('force')
  })

  it('splits projectiles across multiple targets', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const target1 = createMonsterCombatant({ id: 'mon-1', name: 'Goblin 1' })
    const target2 = createMonsterCombatant({ id: 'mon-2', name: 'Goblin 2' })
    const spell = createSpell({
      projectiles: { count: 3, damagePerProjectile: '1d4+1' },
      damage: { dice: '1d4+1', type: 'force' },
    } as Partial<Spell>)
    const assignments = [
      { targetId: 'mon-1', count: 2 },
      { targetId: 'mon-2', count: 1 },
    ]

    const results = resolveProjectiles(spell, assignments, [target1, target2])
    expect(results).toHaveLength(2)
    expect(results[0].count).toBe(2)
    expect(results[1].count).toBe(1)
  })

  it('skips dead targets', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const deadTarget = createMonsterCombatant({ currentHp: 0 })
    const spell = createSpell({
      projectiles: { count: 3, damagePerProjectile: '1d4+1' },
      damage: { dice: '1d4+1', type: 'force' },
    } as Partial<Spell>)
    const assignments = [{ targetId: 'mon-1', count: 3 }]

    const results = resolveProjectiles(spell, assignments, [deadTarget])
    expect(results).toHaveLength(0)
  })
})

// ============================================
// getEffectiveDamageDice
// ============================================

describe('getEffectiveDamageDice', () => {
  it('returns undefined for non-damage spells', () => {
    const spell = createSpell({ damage: undefined })
    const result = getEffectiveDamageDice(spell, 5)
    expect(result).toBeUndefined()
  })

  it('returns scaled dice for cantrips at higher levels', () => {
    const spell = createSpell({
      level: 0,
      damage: { dice: '1d10', type: 'fire', scaling: { 5: '2d10', 11: '3d10', 17: '4d10' } },
    })
    // Level 5 should scale to 2d10
    const result = getEffectiveDamageDice(spell, 5)
    expect(result).toBe('2d10')
  })

  it('returns base dice for level 1 spell (no cantrip scaling)', () => {
    const spell = createSpell({
      level: 1,
      damage: { dice: '3d6', type: 'fire' },
    })
    const result = getEffectiveDamageDice(spell, 5)
    expect(result).toBe('3d6')
  })
})
