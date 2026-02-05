import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAttackAdvantage,
  getCharacterAttackBonus,
  getCharacterDamageBonus,
  getCombatantAC,
  resolveAttack,
} from './combat'
import type { Combatant, Character, Monster, Weapon, ActiveCondition } from '@/types'
import type { ClassFeature } from '@/types/classFeature'

// ============================================
// Test Helpers
// ============================================

function createWeapon(overrides: Partial<Weapon> = {}): Weapon {
  return {
    id: 'longsword',
    name: 'Longsword',
    category: 'martial',
    type: 'melee',
    damage: '1d8',
    damageType: 'slashing',
    properties: [],
    weight: 3,
    cost: 1500,
    ...overrides,
  } as Weapon
}

function createCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-char',
    name: 'Test Character',
    level: 5,
    race: { id: 'human', name: 'Human', abilityScoreIncrease: {}, abilities: [], size: 'medium', speed: 30 },
    class: {
      id: 'fighter',
      name: 'Fighter',
      hitDie: 10,
      primaryAbility: 'strength',
      savingThrows: ['strength', 'constitution'],
      armorProficiencies: [],
      weaponProficiencies: ['simple', 'martial'],
      skillChoices: { count: 2, options: [] },
      features: [],
      subclasses: [],
    },
    proficiencyBonus: 3,
    abilityScores: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
    equipment: { items: [] },
    ac: 16,
    hp: 44,
    ...overrides,
  } as unknown as Character
}

function createCharacterCombatant(
  charOverrides: Partial<Character> = {},
  combatantOverrides: Partial<Combatant> = {}
): Combatant {
  const character = createCharacter(charOverrides)
  return {
    id: 'combatant-1',
    type: 'character',
    data: character,
    name: character.name,
    maxHp: 44,
    currentHp: 44,
    position: { x: 5, y: 5 },
    initiative: 15,
    conditions: [],
    hasActed: false,
    hasBonusActed: false,
    hasReacted: false,
    movementUsed: 0,
    speed: 30,
    classFeatureUses: {},
    racialAbilityUses: {},
    usedSneakAttackThisTurn: false,
    attacksMadeThisTurn: 0,
    hasUsedActionSurge: false,
    usedCleaveThisTurn: false,
    usedNickThisTurn: false,
    ...combatantOverrides,
  } as Combatant
}

function createMonsterCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'monster-1',
    type: 'monster',
    data: {
      id: 'goblin',
      name: 'Goblin',
      size: 'small',
      type: 'humanoid',
      ac: 15,
      hp: 7,
      speed: { walk: 30 },
      abilityScores: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 },
      actions: [],
      savingThrowProficiencies: [],
    },
    name: 'Goblin',
    maxHp: 7,
    currentHp: 7,
    position: { x: 6, y: 5 },
    initiative: 12,
    conditions: [],
    hasActed: false,
    hasBonusActed: false,
    hasReacted: false,
    movementUsed: 0,
    speed: 30,
    classFeatureUses: {},
    racialAbilityUses: {},
    usedSneakAttackThisTurn: false,
    attacksMadeThisTurn: 0,
    hasUsedActionSurge: false,
    usedCleaveThisTurn: false,
    usedNickThisTurn: false,
    ...overrides,
  } as Combatant
}

// ============================================
// Tests
// ============================================

describe('combat', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCharacterAttackBonus', () => {
    it('uses strength for melee weapons', () => {
      const character = createCharacter({
        abilityScores: { strength: 16, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
        proficiencyBonus: 3,
      })
      const weapon = createWeapon({ type: 'melee', properties: [] })

      // STR 16 = +3, proficiency = +3, total = +6
      expect(getCharacterAttackBonus(character, weapon)).toBe(6)
    })

    it('uses dexterity for ranged weapons', () => {
      const character = createCharacter({
        abilityScores: { strength: 10, dexterity: 18, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
        proficiencyBonus: 3,
      })
      const weapon = createWeapon({ type: 'ranged', properties: [] })

      // DEX 18 = +4, proficiency = +3, total = +7
      expect(getCharacterAttackBonus(character, weapon)).toBe(7)
    })

    it('uses higher of STR/DEX for finesse weapons', () => {
      const character = createCharacter({
        abilityScores: { strength: 10, dexterity: 18, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
        proficiencyBonus: 3,
      })
      const weapon = createWeapon({ type: 'melee', properties: ['finesse'] })

      // DEX 18 = +4 (higher than STR 10 = +0), proficiency = +3, total = +7
      expect(getCharacterAttackBonus(character, weapon)).toBe(7)
    })

    it('scales with proficiency bonus', () => {
      const lowLevel = createCharacter({ proficiencyBonus: 2 })
      const highLevel = createCharacter({ proficiencyBonus: 6 })
      const weapon = createWeapon()

      // STR 16 = +3 for both
      expect(getCharacterAttackBonus(lowLevel, weapon)).toBe(5) // +3 + +2
      expect(getCharacterAttackBonus(highLevel, weapon)).toBe(9) // +3 + +6
    })
  })

  describe('getCharacterDamageBonus', () => {
    it('uses strength for melee weapons', () => {
      const character = createCharacter({
        abilityScores: { strength: 18, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
      })
      const weapon = createWeapon({ type: 'melee', properties: [] })

      // STR 18 = +4
      expect(getCharacterDamageBonus(character, weapon)).toBe(4)
    })

    it('uses dexterity for ranged weapons', () => {
      const character = createCharacter({
        abilityScores: { strength: 10, dexterity: 16, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
      })
      const weapon = createWeapon({ type: 'ranged', properties: [] })

      // DEX 16 = +3
      expect(getCharacterDamageBonus(character, weapon)).toBe(3)
    })

    it('uses higher of STR/DEX for finesse weapons', () => {
      const character = createCharacter({
        abilityScores: { strength: 12, dexterity: 18, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
      })
      const weapon = createWeapon({ type: 'melee', properties: ['finesse'] })

      // DEX 18 = +4 (higher than STR 12 = +1)
      expect(getCharacterDamageBonus(character, weapon)).toBe(4)
    })

    it('returns negative values for low ability scores', () => {
      const character = createCharacter({
        abilityScores: { strength: 6, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
      })
      const weapon = createWeapon({ type: 'melee', properties: [] })

      // STR 6 = -2
      expect(getCharacterDamageBonus(character, weapon)).toBe(-2)
    })
  })

  describe('getCombatantAC', () => {
    it('returns AC for character combatants', () => {
      const combatant = createCharacterCombatant({ ac: 18 })
      expect(getCombatantAC(combatant)).toBe(18)
    })

    it('returns AC for monster combatants', () => {
      const combatant = createMonsterCombatant()
      // Goblin has AC 15
      expect(getCombatantAC(combatant)).toBe(15)
    })
  })

  describe('getAttackAdvantage', () => {
    describe('base advantage/disadvantage', () => {
      it('returns normal when no modifiers apply', () => {
        const attacker = createCharacterCombatant()
        const target = createMonsterCombatant()
        expect(getAttackAdvantage(attacker, target)).toBe('normal')
      })

      it('respects base advantage parameter', () => {
        const attacker = createCharacterCombatant()
        const target = createMonsterCombatant()
        expect(getAttackAdvantage(attacker, target, 'advantage')).toBe('advantage')
        expect(getAttackAdvantage(attacker, target, 'disadvantage')).toBe('disadvantage')
      })
    })

    describe('attacker conditions', () => {
      it('grants advantage when attacker is invisible', () => {
        const attacker = createCharacterCombatant({}, {
          conditions: [{ condition: 'invisible', duration: 10 }],
        })
        const target = createMonsterCombatant()
        expect(getAttackAdvantage(attacker, target)).toBe('advantage')
      })

      it('grants disadvantage when attacker is blinded', () => {
        const attacker = createCharacterCombatant({}, {
          conditions: [{ condition: 'blinded', duration: 1 }],
        })
        const target = createMonsterCombatant()
        expect(getAttackAdvantage(attacker, target)).toBe('disadvantage')
      })

      it('grants disadvantage when attacker is poisoned', () => {
        const attacker = createCharacterCombatant({}, {
          conditions: [{ condition: 'poisoned', duration: 1 }],
        })
        const target = createMonsterCombatant()
        expect(getAttackAdvantage(attacker, target)).toBe('disadvantage')
      })

      it('grants disadvantage when attacker is restrained', () => {
        const attacker = createCharacterCombatant({}, {
          conditions: [{ condition: 'restrained', duration: 1 }],
        })
        const target = createMonsterCombatant()
        expect(getAttackAdvantage(attacker, target)).toBe('disadvantage')
      })

      it('grants disadvantage when attacker is prone', () => {
        const attacker = createCharacterCombatant({}, {
          conditions: [{ condition: 'prone', duration: -1 }],
        })
        const target = createMonsterCombatant()
        expect(getAttackAdvantage(attacker, target)).toBe('disadvantage')
      })

      it('grants disadvantage when attacker is sapped (weapon mastery)', () => {
        const attacker = createCharacterCombatant({}, {
          conditions: [{ condition: 'sapped', duration: 1 }],
        })
        const target = createMonsterCombatant()
        expect(getAttackAdvantage(attacker, target)).toBe('disadvantage')
      })
    })

    describe('target conditions', () => {
      it('grants advantage when target is blinded', () => {
        const attacker = createCharacterCombatant()
        const target = createMonsterCombatant({
          conditions: [{ condition: 'blinded', duration: 1 }],
        })
        expect(getAttackAdvantage(attacker, target)).toBe('advantage')
      })

      it('grants advantage when target is paralyzed', () => {
        const attacker = createCharacterCombatant()
        const target = createMonsterCombatant({
          conditions: [{ condition: 'paralyzed', duration: 1 }],
        })
        expect(getAttackAdvantage(attacker, target)).toBe('advantage')
      })

      it('grants advantage when target is restrained', () => {
        const attacker = createCharacterCombatant()
        const target = createMonsterCombatant({
          conditions: [{ condition: 'restrained', duration: 1 }],
        })
        expect(getAttackAdvantage(attacker, target)).toBe('advantage')
      })

      it('grants advantage when target is stunned', () => {
        const attacker = createCharacterCombatant()
        const target = createMonsterCombatant({
          conditions: [{ condition: 'stunned', duration: 1 }],
        })
        expect(getAttackAdvantage(attacker, target)).toBe('advantage')
      })

      it('grants advantage when target is unconscious', () => {
        const attacker = createCharacterCombatant()
        const target = createMonsterCombatant({
          conditions: [{ condition: 'unconscious', duration: -1 }],
        })
        expect(getAttackAdvantage(attacker, target)).toBe('advantage')
      })

      it('grants disadvantage when target is invisible', () => {
        const attacker = createCharacterCombatant()
        const target = createMonsterCombatant({
          conditions: [{ condition: 'invisible', duration: 10 }],
        })
        expect(getAttackAdvantage(attacker, target)).toBe('disadvantage')
      })

      it('grants disadvantage when target is dodging', () => {
        const attacker = createCharacterCombatant()
        const target = createMonsterCombatant({
          conditions: [{ condition: 'dodging', duration: 1 }],
        })
        expect(getAttackAdvantage(attacker, target)).toBe('disadvantage')
      })
    })

    describe('prone target rules', () => {
      it('grants advantage for melee attacks within 5ft against prone target', () => {
        const attacker = createCharacterCombatant({}, { position: { x: 5, y: 5 } })
        const target = createMonsterCombatant({
          position: { x: 6, y: 5 }, // 5ft away
          conditions: [{ condition: 'prone', duration: -1 }],
        })
        expect(getAttackAdvantage(attacker, target, 'normal', false)).toBe('advantage')
      })

      it('grants disadvantage for ranged attacks against prone target', () => {
        const attacker = createCharacterCombatant({}, { position: { x: 5, y: 5 } })
        const target = createMonsterCombatant({
          position: { x: 6, y: 5 },
          conditions: [{ condition: 'prone', duration: -1 }],
        })
        expect(getAttackAdvantage(attacker, target, 'normal', true)).toBe('disadvantage')
      })

      it('grants disadvantage for melee attacks from more than 5ft against prone target', () => {
        const attacker = createCharacterCombatant({}, { position: { x: 5, y: 5 } })
        const target = createMonsterCombatant({
          position: { x: 8, y: 5 }, // 15ft away (3 squares)
          conditions: [{ condition: 'prone', duration: -1 }],
        })
        expect(getAttackAdvantage(attacker, target, 'normal', false)).toBe('disadvantage')
      })
    })

    describe('Vex weapon mastery', () => {
      it('grants advantage when attacker has active vex on target', () => {
        const attacker = createCharacterCombatant()
        const target = createMonsterCombatant()
        target.vexedBy = { attackerId: attacker.id, expiresOnRound: 2 }

        expect(getAttackAdvantage(attacker, target, 'normal', false, 1)).toBe('advantage')
        expect(getAttackAdvantage(attacker, target, 'normal', false, 2)).toBe('advantage')
      })

      it('does not grant advantage when vex has expired', () => {
        const attacker = createCharacterCombatant()
        const target = createMonsterCombatant()
        target.vexedBy = { attackerId: attacker.id, expiresOnRound: 1 }

        expect(getAttackAdvantage(attacker, target, 'normal', false, 2)).toBe('normal')
      })

      it('does not grant advantage when vexed by different attacker', () => {
        const attacker = createCharacterCombatant()
        const target = createMonsterCombatant()
        target.vexedBy = { attackerId: 'different-attacker', expiresOnRound: 5 }

        expect(getAttackAdvantage(attacker, target, 'normal', false, 1)).toBe('normal')
      })
    })

    describe('advantage/disadvantage cancellation', () => {
      it('cancels advantage and disadvantage to normal', () => {
        const attacker = createCharacterCombatant({}, {
          conditions: [{ condition: 'invisible', duration: 10 }], // advantage
        })
        const target = createMonsterCombatant({
          conditions: [{ condition: 'invisible', duration: 10 }], // disadvantage for attacker
        })

        expect(getAttackAdvantage(attacker, target)).toBe('normal')
      })

      it('cancels multiple sources of advantage with one disadvantage', () => {
        const attacker = createCharacterCombatant({}, {
          conditions: [{ condition: 'invisible', duration: 10 }], // advantage
        })
        const target = createMonsterCombatant({
          conditions: [
            { condition: 'blinded', duration: 1 }, // advantage for attacker
            { condition: 'invisible', duration: 10 }, // disadvantage for attacker
          ],
        })

        // Multiple advantages + 1 disadvantage still cancels to normal
        expect(getAttackAdvantage(attacker, target)).toBe('normal')
      })

      it('vex advantage cancels with disadvantage', () => {
        const attacker = createCharacterCombatant({}, {
          conditions: [{ condition: 'poisoned', duration: 1 }], // disadvantage
        })
        const target = createMonsterCombatant()
        target.vexedBy = { attackerId: attacker.id, expiresOnRound: 2 } // advantage

        expect(getAttackAdvantage(attacker, target, 'normal', false, 1)).toBe('normal')
      })

      it('sapped disadvantage cancels with advantage', () => {
        const attacker = createCharacterCombatant({}, {
          conditions: [
            { condition: 'sapped', duration: 1 }, // disadvantage
            { condition: 'invisible', duration: 10 }, // advantage
          ],
        })
        const target = createMonsterCombatant()

        expect(getAttackAdvantage(attacker, target)).toBe('normal')
      })
    })
  })

  describe('resolveAttack', () => {
    it('resolves a hit when roll beats AC', () => {
      // Mock high roll
      vi.spyOn(Math, 'random').mockReturnValue(0.9) // d20 = 19

      const attacker = createCharacterCombatant()
      const target = createMonsterCombatant() // AC 15
      const weapon = createWeapon()

      const result = resolveAttack({ attacker, target, weapon })

      expect(result.hit).toBe(true)
      expect(result.attackRoll.total).toBeGreaterThanOrEqual(15)
    })

    it('resolves a miss when roll is below AC', () => {
      // Mock low roll
      vi.spyOn(Math, 'random').mockReturnValue(0.05) // d20 = 2

      const attacker = createCharacterCombatant({
        abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
        proficiencyBonus: 2,
      })
      const target = createMonsterCombatant() // AC 15
      const weapon = createWeapon()

      const result = resolveAttack({ attacker, target, weapon })

      // d20 = 2 + 0 (STR) + 2 (prof) = 4, which is less than AC 15
      expect(result.hit).toBe(false)
    })

    it('natural 20 always hits and is critical', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.95) // d20 = 20

      const attacker = createCharacterCombatant()
      const target = createMonsterCombatant()
      target.data = { ...(target.data as Monster), ac: 30 } // Very high AC
      const weapon = createWeapon()

      const result = resolveAttack({ attacker, target, weapon })

      expect(result.hit).toBe(true)
      expect(result.critical).toBe(true)
      expect(result.attackRoll.naturalRoll).toBe(20)
    })

    it('natural 1 always misses', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // d20 = 1

      const attacker = createCharacterCombatant()
      const target = createMonsterCombatant()
      target.data = { ...(target.data as Monster), ac: 5 } // Very low AC
      const weapon = createWeapon()

      const result = resolveAttack({ attacker, target, weapon })

      expect(result.hit).toBe(false)
      expect(result.criticalMiss).toBe(true)
      expect(result.attackRoll.naturalRoll).toBe(1)
    })

    it('calculates damage on hit', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9) // High roll for hit

      const attacker = createCharacterCombatant()
      const target = createMonsterCombatant()
      const weapon = createWeapon({ damage: '1d8' })

      const result = resolveAttack({ attacker, target, weapon })

      expect(result.hit).toBe(true)
      expect(result.damage).toBeDefined()
      expect(result.damage!.total).toBeGreaterThan(0)
      expect(result.damageType).toBe('slashing')
    })

    it('doubles damage dice on critical hit', () => {
      // First roll is d20 = 20 (crit), subsequent rolls are damage
      let rollIndex = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        const rolls = [0.95, 0.5, 0.5] // d20 = 20, then damage rolls
        return rolls[rollIndex++ % rolls.length]
      })

      const attacker = createCharacterCombatant()
      const target = createMonsterCombatant()
      const weapon = createWeapon({ damage: '1d8' })

      const result = resolveAttack({ attacker, target, weapon })

      expect(result.critical).toBe(true)
      // On crit, damage dice are doubled (2d8 instead of 1d8)
      expect(result.damage).toBeDefined()
    })

    it('applies advantage correctly', () => {
      // Two rolls: 5 and 15, should take 15 with advantage
      let rollCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        rollCount++
        if (rollCount === 1) return 0.2 // d20 = 5
        if (rollCount === 2) return 0.7 // d20 = 15
        return 0.5 // damage rolls
      })

      const attacker = createCharacterCombatant()
      const target = createMonsterCombatant()
      const weapon = createWeapon()

      const result = resolveAttack({ attacker, target, weapon, advantage: 'advantage' })

      expect(result.attackRoll.naturalRoll).toBe(15)
    })

    it('applies disadvantage correctly', () => {
      // Two rolls: 5 and 15, should take 5 with disadvantage
      let rollCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        rollCount++
        if (rollCount === 1) return 0.2 // d20 = 5
        if (rollCount === 2) return 0.7 // d20 = 15
        return 0.5
      })

      const attacker = createCharacterCombatant()
      const target = createMonsterCombatant()
      const weapon = createWeapon()

      const result = resolveAttack({ attacker, target, weapon, advantage: 'disadvantage' })

      expect(result.attackRoll.naturalRoll).toBe(5)
    })
  })
})
