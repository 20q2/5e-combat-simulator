import { describe, it, expect } from 'vitest'
import {
  isDead,
  checkCombatEnd,
  calculateDamageApplication,
} from '@/engine/damageResolution'
import type { Combatant, Character, Monster } from '@/types'

// ============================================
// Test Helpers
// ============================================

function createCharacterCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'char-1',
    name: 'Test Fighter',
    type: 'character',
    data: {
      id: 'char-1',
      name: 'Test Fighter',
      race: { id: 'human', name: 'Human', abilities: [], size: 'medium', speed: 30, abilityScoreIncrease: {} },
      abilityScores: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
    } as unknown as Character,
    position: { x: 5, y: 5 },
    currentHp: 30,
    maxHp: 30,
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
    deathSaves: { successes: 0, failures: 0 },
    isStable: false,
    usedCleaveThisTurn: false,
    usedNickThisTurn: false,
    usedManeuverThisAttack: false,
    heroicInspiration: false,
    magicInitiateFreeUses: {},
    usedSavageAttackerThisTurn: false,
    usedTavernBrawlerPushThisTurn: false,
    ...overrides,
  } as Combatant
}

function createMonsterCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'monster-1',
    name: 'Goblin',
    type: 'monster',
    data: {
      id: 'goblin',
      name: 'Goblin',
      ac: 15,
      hp: { average: 7, formula: '2d6' },
      speed: { walk: 30 },
      abilityScores: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 },
      actions: [],
    } as unknown as Monster,
    position: { x: 10, y: 10 },
    currentHp: 7,
    maxHp: 7,
    initiative: 12,
    conditions: [],
    hasActed: false,
    hasBonusActed: false,
    hasReacted: false,
    movementUsed: 0,
    classFeatureUses: {},
    racialAbilityUses: {},
    usedSneakAttackThisTurn: false,
    attacksMadeThisTurn: 0,
    deathSaves: { successes: 0, failures: 0 },
    isStable: false,
    usedCleaveThisTurn: false,
    usedNickThisTurn: false,
    usedManeuverThisAttack: false,
    heroicInspiration: false,
    magicInitiateFreeUses: {},
    usedSavageAttackerThisTurn: false,
    usedTavernBrawlerPushThisTurn: false,
    ...overrides,
  } as Combatant
}

function createHalfOrcCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return createCharacterCombatant({
    id: 'halforc-1',
    name: 'Test Half-Orc',
    data: {
      id: 'halforc-1',
      name: 'Test Half-Orc',
      race: {
        id: 'orc',
        name: 'Orc',
        abilities: [
          {
            id: 'orc-relentless-endurance',
            type: 'triggered_heal',
            name: 'Relentless Endurance',
            description: 'Drop to 1 HP instead of 0.',
            trigger: 'on_damage_taken',
            triggerCondition: 'drop_to_zero',
            healAmount: 1,
            maxUses: 1,
          },
        ],
        size: 'medium',
        speed: 30,
        abilityScoreIncrease: {},
      },
      abilityScores: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
    } as unknown as Character,
    racialAbilityUses: { 'orc-relentless-endurance': 1 }, // 1 use remaining (maxUses)
    ...overrides,
  })
}

// ============================================
// isDead Tests
// ============================================

describe('isDead', () => {
  it('monster at 0 HP is dead', () => {
    const monster = createMonsterCombatant({ currentHp: 0 })
    expect(isDead(monster)).toBe(true)
  })

  it('monster with HP remaining is alive', () => {
    const monster = createMonsterCombatant({ currentHp: 1 })
    expect(isDead(monster)).toBe(false)
  })

  it('character with 3 death save failures is dead', () => {
    const char = createCharacterCombatant({
      currentHp: 0,
      deathSaves: { successes: 0, failures: 3 },
    })
    expect(isDead(char)).toBe(true)
  })

  it('character at 0 HP but fewer than 3 failures is NOT dead (unconscious)', () => {
    const char = createCharacterCombatant({
      currentHp: 0,
      deathSaves: { successes: 0, failures: 2 },
    })
    expect(isDead(char)).toBe(false)
  })

  it('character with full HP is alive', () => {
    const char = createCharacterCombatant({ currentHp: 30 })
    expect(isDead(char)).toBe(false)
  })
})

// ============================================
// checkCombatEnd Tests
// ============================================

describe('checkCombatEnd', () => {
  it('returns victory when all monsters are dead', () => {
    const combatants = [
      createCharacterCombatant({ currentHp: 10 }),
      createMonsterCombatant({ currentHp: 0 }),
    ]
    expect(checkCombatEnd(combatants)).toBe('victory')
  })

  it('returns defeat when all characters have 3 death save failures', () => {
    const combatants = [
      createCharacterCombatant({
        currentHp: 0,
        deathSaves: { successes: 0, failures: 3 },
      }),
      createMonsterCombatant({ currentHp: 5 }),
    ]
    expect(checkCombatEnd(combatants)).toBe('defeat')
  })

  it('returns null when combat is still ongoing', () => {
    const combatants = [
      createCharacterCombatant({ currentHp: 10 }),
      createMonsterCombatant({ currentHp: 5 }),
    ]
    expect(checkCombatEnd(combatants)).toBeNull()
  })

  it('returns null when unconscious character but not dead', () => {
    const combatants = [
      createCharacterCombatant({
        currentHp: 0,
        deathSaves: { successes: 0, failures: 2 },
      }),
      createMonsterCombatant({ currentHp: 5 }),
    ]
    expect(checkCombatEnd(combatants)).toBeNull()
  })

  it('returns victory with multiple dead monsters', () => {
    const combatants = [
      createCharacterCombatant({ currentHp: 10 }),
      createMonsterCombatant({ id: 'm1', currentHp: 0 }),
      createMonsterCombatant({ id: 'm2', currentHp: 0 }),
    ]
    expect(checkCombatEnd(combatants)).toBe('victory')
  })
})

// ============================================
// calculateDamageApplication Tests
// ============================================

describe('calculateDamageApplication', () => {
  describe('basic damage', () => {
    it('reduces HP by damage amount', () => {
      const target = createCharacterCombatant({ currentHp: 20 })
      const result = calculateDamageApplication(target, 5)

      expect(result.newHp).toBe(15)
      expect(result.wasConscious).toBe(true)
      expect(result.fellUnconscious).toBe(false)
      expect(result.monsterDied).toBe(false)
    })

    it('HP never goes below 0', () => {
      const target = createCharacterCombatant({ currentHp: 5 })
      const result = calculateDamageApplication(target, 100)

      expect(result.newHp).toBe(0)
    })

    it('zero damage changes nothing', () => {
      const target = createCharacterCombatant({ currentHp: 20 })
      const result = calculateDamageApplication(target, 0)

      expect(result.newHp).toBe(20)
      expect(result.fellUnconscious).toBe(false)
    })
  })

  describe('character falling unconscious', () => {
    it('character drops to 0 HP → falls unconscious', () => {
      const target = createCharacterCombatant({ currentHp: 10 })
      const result = calculateDamageApplication(target, 10)

      expect(result.newHp).toBe(0)
      expect(result.fellUnconscious).toBe(true)
      expect(result.monsterDied).toBe(false)
      expect(result.newConditions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ condition: 'unconscious', duration: -1 }),
        ])
      )
      expect(result.deferredLogEntries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'death', message: expect.stringContaining('falls unconscious') }),
        ])
      )
    })
  })

  describe('monster death', () => {
    it('monster drops to 0 HP → dies', () => {
      const target = createMonsterCombatant({ currentHp: 7 })
      const result = calculateDamageApplication(target, 7)

      expect(result.newHp).toBe(0)
      expect(result.monsterDied).toBe(true)
      expect(result.fellUnconscious).toBe(false)
      expect(result.newConditions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ condition: 'prone', duration: -1 }),
        ])
      )
      expect(result.deferredLogEntries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'death', message: expect.stringContaining('has been slain') }),
        ])
      )
    })
  })

  describe('already-unconscious character taking damage', () => {
    it('adds a death save failure', () => {
      const target = createCharacterCombatant({
        currentHp: 0,
        deathSaves: { successes: 1, failures: 1 },
      })
      const result = calculateDamageApplication(target, 5)

      expect(result.deathSaveFailureAdded).toBe(true)
      expect(result.newDeathSaveFailures).toBe(2)
      expect(result.characterDied).toBe(false)
      expect(result.deferredLogEntries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('death save failure! (2/3)') }),
        ])
      )
    })

    it('3rd failure → character dies', () => {
      const target = createCharacterCombatant({
        currentHp: 0,
        deathSaves: { successes: 0, failures: 2 },
      })
      const result = calculateDamageApplication(target, 5)

      expect(result.deathSaveFailureAdded).toBe(true)
      expect(result.newDeathSaveFailures).toBe(3)
      expect(result.characterDied).toBe(true)
      expect(result.newConditions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ condition: 'prone', duration: -1 }),
        ])
      )
      expect(result.deferredLogEntries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'death', message: expect.stringContaining('has died from damage while unconscious') }),
        ])
      )
    })

    it('stable character does NOT gain death save failure', () => {
      const target = createCharacterCombatant({
        currentHp: 0,
        isStable: true,
        deathSaves: { successes: 0, failures: 1 },
      })
      const result = calculateDamageApplication(target, 5)

      expect(result.deathSaveFailureAdded).toBe(false)
      expect(result.newDeathSaveFailures).toBe(1) // Unchanged
    })
  })

  describe('Relentless Endurance', () => {
    it('half-orc drops to 0 HP → uses Relentless Endurance → 1 HP', () => {
      const target = createHalfOrcCombatant({ currentHp: 10 })
      const result = calculateDamageApplication(target, 10)

      expect(result.newHp).toBe(1)
      expect(result.relentlessEnduranceUsed).toBe(true)
      expect(result.fellUnconscious).toBe(false)
      expect(result.monsterDied).toBe(false)
      // Should NOT have unconscious condition
      expect(result.newConditions).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ condition: 'unconscious' }),
        ])
      )
      expect(result.deferredLogEntries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('Relentless Endurance') }),
        ])
      )
    })

    it('does not trigger if already used', () => {
      const target = createHalfOrcCombatant({
        currentHp: 10,
        racialAbilityUses: { 'orc-relentless-endurance': 0 }, // 0 uses remaining (already used)
      })
      const result = calculateDamageApplication(target, 10)

      expect(result.newHp).toBe(0)
      expect(result.relentlessEnduranceUsed).toBe(false)
      expect(result.fellUnconscious).toBe(true)
    })

    it('does not trigger when damage does not reduce to 0', () => {
      const target = createHalfOrcCombatant({ currentHp: 20 })
      const result = calculateDamageApplication(target, 5)

      expect(result.newHp).toBe(15)
      expect(result.relentlessEnduranceUsed).toBe(false)
    })
  })

  describe('preserves existing conditions', () => {
    it('unconscious condition is added alongside existing conditions', () => {
      const target = createCharacterCombatant({
        currentHp: 5,
        conditions: [{ condition: 'poisoned' as const, duration: 3 }],
      })
      const result = calculateDamageApplication(target, 5)

      expect(result.newConditions).toHaveLength(2)
      expect(result.newConditions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ condition: 'poisoned' }),
          expect.objectContaining({ condition: 'unconscious' }),
        ])
      )
    })
  })
})
