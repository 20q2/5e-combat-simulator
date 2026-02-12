import { describe, it, expect } from 'vitest'
import {
  getTurnResetFields,
  calculateConditionExpiry,
  calculateStartOfTurnEffects,
  shouldSkipTurn,
} from '@/engine/turnManager'
import type { Combatant, Character, Monster, ActiveCondition } from '@/types'

// ============================================
// Test helpers
// ============================================

function createCharacterCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'char-1',
    name: 'Test Hero',
    type: 'character',
    position: { x: 0, y: 0 },
    currentHp: 20,
    maxHp: 20,
    initiative: 15,
    conditions: [],
    hasActed: false,
    hasBonusActed: false,
    hasReacted: false,
    movementUsed: 0,
    classFeatureUses: {},
    racialAbilityUses: {},
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
      name: 'Test Hero',
      race: { name: 'Human', size: 'medium', speed: 30, abilities: [] },
      class: { name: 'Fighter', hitDie: 'd10', features: [], subclass: undefined },
      level: 5,
      abilityScores: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
      maxHp: 20,
      armorClass: 18,
      equipment: { armor: null, shield: false, weapons: [] },
      proficiencyBonus: 3,
    } as unknown as Character,
    ...overrides,
  } as Combatant
}

function createMonsterCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'mon-1',
    name: 'Goblin',
    type: 'monster',
    position: { x: 5, y: 5 },
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
      maxHp: 7,
      speed: 30,
      abilityScores: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 },
      actions: [],
    } as unknown as Monster,
    ...overrides,
  } as Combatant
}

// ============================================
// getTurnResetFields
// ============================================

describe('getTurnResetFields', () => {
  it('returns all expected false/0/undefined reset values', () => {
    const fields = getTurnResetFields()

    expect(fields.hasActed).toBe(false)
    expect(fields.hasBonusActed).toBe(false)
    expect(fields.movementUsed).toBe(0)
    expect(fields.usedSneakAttackThisTurn).toBe(false)
    expect(fields.attacksMadeThisTurn).toBe(0)
    expect(fields.usedCleaveThisTurn).toBe(false)
    expect(fields.usedNickThisTurn).toBe(false)
    expect(fields.usedManeuverThisAttack).toBe(false)
    expect(fields.feintTarget).toBeUndefined()
    expect(fields.feintBonusDamage).toBeUndefined()
    expect(fields.lungingAttackBonus).toBeUndefined()
    expect(fields.usedSavageAttackerThisTurn).toBe(false)
    expect(fields.usedTavernBrawlerPushThisTurn).toBe(false)
  })

  it('can be spread onto a combatant to reset turn state', () => {
    const combatant = createCharacterCombatant({
      hasActed: true,
      hasBonusActed: true,
      movementUsed: 25,
      attacksMadeThisTurn: 2,
    })

    const reset = { ...combatant, ...getTurnResetFields() }

    expect(reset.hasActed).toBe(false)
    expect(reset.hasBonusActed).toBe(false)
    expect(reset.movementUsed).toBe(0)
    expect(reset.attacksMadeThisTurn).toBe(0)
    // Non-reset fields preserved
    expect(reset.currentHp).toBe(20)
    expect(reset.name).toBe('Test Hero')
  })
})

// ============================================
// calculateConditionExpiry
// ============================================

describe('calculateConditionExpiry', () => {
  it('decrements condition with duration 2 to 1', () => {
    const combatant = createCharacterCombatant({
      conditions: [{ condition: 'blinded', duration: 2 }],
    })

    const result = calculateConditionExpiry(combatant)

    expect(result.updatedConditions).toHaveLength(1)
    expect(result.updatedConditions[0].condition).toBe('blinded')
    expect(result.updatedConditions[0].duration).toBe(1)
    expect(result.expiredConditionNames).toHaveLength(0)
  })

  it('removes condition with duration 1 (expired)', () => {
    const combatant = createCharacterCombatant({
      conditions: [{ condition: 'blinded', duration: 1 }],
    })

    const result = calculateConditionExpiry(combatant)

    expect(result.updatedConditions).toHaveLength(0)
    expect(result.expiredConditionNames).toEqual(['blinded'])
  })

  it('preserves condition with duration -1 (indefinite)', () => {
    const combatant = createCharacterCombatant({
      conditions: [{ condition: 'unconscious', duration: -1 }],
    })

    const result = calculateConditionExpiry(combatant)

    expect(result.updatedConditions).toHaveLength(1)
    expect(result.updatedConditions[0].condition).toBe('unconscious')
    expect(result.updatedConditions[0].duration).toBe(-1)
    expect(result.expiredConditionNames).toHaveLength(0)
  })

  it('preserves condition with undefined duration', () => {
    const combatant = createCharacterCombatant({
      conditions: [{ condition: 'prone' } as ActiveCondition],
    })

    const result = calculateConditionExpiry(combatant)

    expect(result.updatedConditions).toHaveLength(1)
    expect(result.updatedConditions[0].condition).toBe('prone')
    expect(result.expiredConditionNames).toHaveLength(0)
  })

  it('handles mix of expiring, decrementing, and indefinite conditions', () => {
    const combatant = createCharacterCombatant({
      conditions: [
        { condition: 'poisoned', duration: 1 },       // expires
        { condition: 'blinded', duration: 3 },         // decrements to 2
        { condition: 'unconscious', duration: -1 },    // indefinite
      ],
    })

    const result = calculateConditionExpiry(combatant)

    expect(result.updatedConditions).toHaveLength(2)
    expect(result.updatedConditions[0].condition).toBe('blinded')
    expect(result.updatedConditions[0].duration).toBe(2)
    expect(result.updatedConditions[1].condition).toBe('unconscious')
    expect(result.expiredConditionNames).toEqual(['poisoned'])
  })

  it('sets evasiveExpired when evasive condition expires', () => {
    const combatant = createCharacterCombatant({
      conditions: [{ condition: 'evasive', duration: 1 }],
    })

    const result = calculateConditionExpiry(combatant)

    expect(result.evasiveExpired).toBe(true)
    expect(result.expiredConditionNames).toContain('evasive')
  })

  it('does not set evasiveExpired when evasive condition still active', () => {
    const combatant = createCharacterCombatant({
      conditions: [{ condition: 'evasive', duration: 2 }],
    })

    const result = calculateConditionExpiry(combatant)

    expect(result.evasiveExpired).toBe(false)
  })

  it('handles empty conditions array', () => {
    const combatant = createCharacterCombatant({ conditions: [] })

    const result = calculateConditionExpiry(combatant)

    expect(result.updatedConditions).toHaveLength(0)
    expect(result.expiredConditionNames).toHaveLength(0)
    expect(result.evasiveExpired).toBe(false)
  })
})

// ============================================
// calculateStartOfTurnEffects
// ============================================

describe('calculateStartOfTurnEffects', () => {
  function createChampionFighter(level: number, overrides: Partial<Combatant> = {}): Combatant {
    // Build subclass features based on level
    const subclassFeatures: Record<string, unknown>[] = []
    if (level >= 10) {
      subclassFeatures.push({
        id: 'heroic-warrior', name: 'Heroic Warrior',
        description: 'Gain Heroic Inspiration at start of turn',
        level: 10, type: 'heroic_warrior', trigger: 'passive',
      })
    }
    if (level >= 18) {
      subclassFeatures.push({
        id: 'survivor', name: 'Survivor',
        description: 'Defy Death + Heroic Rally',
        level: 18, type: 'survivor', trigger: 'passive',
      })
    }

    const classData = {
      id: 'fighter', name: 'Fighter', hitDie: 10,
      primaryAbility: 'strength', savingThrows: ['strength', 'constitution'],
      armorProficiencies: [], weaponProficiencies: ['simple', 'martial'],
      skillChoices: { count: 2, options: [] }, features: [], subclasses: [],
    }
    const subclassData = {
      id: 'champion', name: 'Champion',
      description: 'Critical hit specialist',
      features: subclassFeatures,
    }

    return createCharacterCombatant({
      data: {
        name: 'Champion',
        race: { name: 'Human', size: 'medium', speed: 30, abilities: [] },
        class: classData,
        subclass: subclassData,
        classes: [{ classId: 'fighter', classData, subclass: subclassData, level }],
        level,
        abilityScores: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
        maxHp: 100,
        armorClass: 18,
        equipment: { armor: null, shield: false, weapons: [] },
        proficiencyBonus: 4,
      } as unknown as Character,
      maxHp: 100,
      ...overrides,
    })
  }

  describe('Heroic Warrior', () => {
    it('grants Heroic Inspiration to Champion Fighter 10+ without it', () => {
      const combatant = createChampionFighter(10, { heroicInspiration: false })

      const effects = calculateStartOfTurnEffects(combatant)

      expect(effects).toHaveLength(1)
      expect(effects[0].type).toBe('heroic_warrior')
      expect(effects[0].grantHeroicInspiration).toBe(true)
      expect(effects[0].logType).toBe('other')
    })

    it('does not grant if combatant already has Heroic Inspiration', () => {
      const combatant = createChampionFighter(10, { heroicInspiration: true })

      const effects = calculateStartOfTurnEffects(combatant)

      const heroicWarriorEffects = effects.filter(e => e.type === 'heroic_warrior')
      expect(heroicWarriorEffects).toHaveLength(0)
    })

    it('does not grant to non-Champion Fighter', () => {
      const combatant = createCharacterCombatant({ heroicInspiration: false })

      const effects = calculateStartOfTurnEffects(combatant)

      const heroicWarriorEffects = effects.filter(e => e.type === 'heroic_warrior')
      expect(heroicWarriorEffects).toHaveLength(0)
    })

    it('does not grant to Champion Fighter below level 10', () => {
      const combatant = createChampionFighter(9, { heroicInspiration: false })

      const effects = calculateStartOfTurnEffects(combatant)

      const heroicWarriorEffects = effects.filter(e => e.type === 'heroic_warrior')
      expect(heroicWarriorEffects).toHaveLength(0)
    })
  })

  describe('Heroic Rally (Survivor)', () => {
    it('heals bloodied Champion Fighter 18+ at start of turn', () => {
      const combatant = createChampionFighter(18, {
        currentHp: 40,
        maxHp: 100,
      })

      const effects = calculateStartOfTurnEffects(combatant)

      const rallyEffects = effects.filter(e => e.type === 'heroic_rally')
      expect(rallyEffects).toHaveLength(1)
      expect(rallyEffects[0].logType).toBe('heal')
      // 5 + CON mod (14 → +2) = 7
      expect(rallyEffects[0].healAmount).toBe(7)
      expect(rallyEffects[0].newHp).toBe(47)
    })

    it('does not heal when above half HP', () => {
      const combatant = createChampionFighter(18, {
        currentHp: 60,
        maxHp: 100,
      })

      const effects = calculateStartOfTurnEffects(combatant)

      const rallyEffects = effects.filter(e => e.type === 'heroic_rally')
      expect(rallyEffects).toHaveLength(0)
    })

    it('does not heal when at 0 HP', () => {
      const combatant = createChampionFighter(18, { currentHp: 0 })

      const effects = calculateStartOfTurnEffects(combatant)

      const rallyEffects = effects.filter(e => e.type === 'heroic_rally')
      expect(rallyEffects).toHaveLength(0)
    })

    it('heals at exactly half HP', () => {
      const combatant = createChampionFighter(18, {
        currentHp: 50,
        maxHp: 100,
      })

      const effects = calculateStartOfTurnEffects(combatant)

      const rallyEffects = effects.filter(e => e.type === 'heroic_rally')
      expect(rallyEffects).toHaveLength(1)
    })

    it('caps healing at maxHp', () => {
      // currentHp 23 <= floor(30/2)=15? No, need currentHp <= 15
      // Use maxHp 30, currentHp 14 → bloodied (14 <= 15), heal 7 → 21, capped at 30? No, 21 < 30
      // Use maxHp 20, currentHp 9 → bloodied (9 <= 10), heal 7 → 16, capped at 20? No, 16 < 20
      // Need: currentHp + heal > maxHp. heal = 5 + CON(2) = 7
      // Use maxHp 20, currentHp 10 → bloodied (10 <= 10), heal 7 → 17, under 20
      // Use maxHp 14, currentHp 7 → bloodied (7 <= 7), heal 7 → 14, exact cap
      // Use maxHp 12, currentHp 6 → bloodied (6 <= 6), heal 7 → 13 → capped at 12
      const combatant = createChampionFighter(18, {
        currentHp: 6,
        maxHp: 12,
      })

      const effects = calculateStartOfTurnEffects(combatant)

      const rallyEffects = effects.filter(e => e.type === 'heroic_rally')
      expect(rallyEffects).toHaveLength(1)
      // Would heal 7 (5 + CON mod 2) but capped at maxHp 12
      expect(rallyEffects[0].newHp).toBe(12)
      expect(rallyEffects[0].healAmount).toBe(6)
    })

    it('does not trigger for Champion Fighter below level 18', () => {
      const combatant = createChampionFighter(17, {
        currentHp: 40,
        maxHp: 100,
      })

      const effects = calculateStartOfTurnEffects(combatant)

      const rallyEffects = effects.filter(e => e.type === 'heroic_rally')
      expect(rallyEffects).toHaveLength(0)
    })

    it('can produce both Heroic Warrior and Heroic Rally effects', () => {
      const combatant = createChampionFighter(18, {
        heroicInspiration: false,
        currentHp: 40,
        maxHp: 100,
      })

      const effects = calculateStartOfTurnEffects(combatant)

      expect(effects).toHaveLength(2)
      expect(effects[0].type).toBe('heroic_warrior')
      expect(effects[1].type).toBe('heroic_rally')
    })
  })
})

// ============================================
// shouldSkipTurn
// ============================================

describe('shouldSkipTurn', () => {
  it('returns true for dead monster (0 HP)', () => {
    const monster = createMonsterCombatant({ currentHp: 0 })
    expect(shouldSkipTurn(monster)).toBe(true)
  })

  it('returns true for dead character (3 death save failures)', () => {
    const character = createCharacterCombatant({
      currentHp: 0,
      deathSaves: { successes: 0, failures: 3 },
    })
    expect(shouldSkipTurn(character)).toBe(true)
  })

  it('returns false for unconscious character (0 HP, < 3 failures)', () => {
    const character = createCharacterCombatant({
      currentHp: 0,
      deathSaves: { successes: 0, failures: 2 },
    })
    expect(shouldSkipTurn(character)).toBe(false)
  })

  it('returns false for alive monster', () => {
    const monster = createMonsterCombatant({ currentHp: 5 })
    expect(shouldSkipTurn(monster)).toBe(false)
  })

  it('returns false for alive character', () => {
    const character = createCharacterCombatant({ currentHp: 10 })
    expect(shouldSkipTurn(character)).toBe(false)
  })
})
