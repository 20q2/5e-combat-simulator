import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  hasMasteredWeapon,
  getActiveMastery,
  getMaxMasteredWeapons,
  canUseWeaponMastery,
  applyOnHitMasteryEffect,
  applyGrazeOnMiss,
  getCleaveTargets,
  getGrazeDamage,
  canUseNickAttack,
  hasVexAdvantage,
  isSapped,
  getMasteryDescription,
} from './weaponMastery'
import type { Combatant, Character, Weapon, Grid, WeaponMastery } from '@/types'
import type { WeaponMasteryFeature, ClassFeature } from '@/types/classFeature'

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
    mastery: 'sap',
    ...overrides,
  } as Weapon
}

function createCharacterCombatant(
  overrides: Partial<Character> = {},
  features: ClassFeature[] = [],
  masteredWeaponIds: string[] = []
): Combatant {
  const character = {
    id: 'test-char',
    name: 'Test Fighter',
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
      features: features,
      subclasses: [],
    },
    subclass: undefined,
    proficiencyBonus: 3,
    abilityScores: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
    equipment: { items: [] },
    masteredWeaponIds: masteredWeaponIds,
    ...overrides,
  } as unknown as Character

  return {
    id: 'combatant-1',
    type: 'character',
    data: character,
    name: character.name,
    maxHp: 44,
    currentHp: 44,
    temporaryHp: 0,
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
    deathSaves: { successes: 0, failures: 0 },
    isStable: false,
    magicInitiateFreeUses: {},
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
    temporaryHp: 0,
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
    deathSaves: { successes: 0, failures: 0 },
    isStable: false,
    magicInitiateFreeUses: {},
    ...overrides,
  } as Combatant
}

function createWeaponMasteryFeature(count: number = 3, scaling?: Record<number, number>): WeaponMasteryFeature {
  return {
    id: 'weapon-mastery',
    name: 'Weapon Mastery',
    description: 'Master weapons',
    level: 1,
    type: 'weapon_mastery',
    trigger: 'passive',
    masteredWeaponCount: count,
    masteredWeaponCountAtLevels: scaling,
  }
}

function createGrid(): Grid {
  const cells = Array(10).fill(null).map((_, y) =>
    Array(10).fill(null).map((_, x) => ({
      x,
      y,
      position: { x, y },
      terrain: undefined,
      obstacle: undefined,
      occupiedBy: undefined,
      elevation: 0,
    }))
  )
  return { width: 10, height: 10, cells }
}

// ============================================
// Tests
// ============================================

describe('weaponMastery', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('hasMasteredWeapon', () => {
    it('returns false for monsters', () => {
      const monster = createMonsterCombatant()
      expect(hasMasteredWeapon(monster, 'longsword')).toBe(false)
    })

    it('returns false when character has no mastered weapons', () => {
      const combatant = createCharacterCombatant({}, [], [])
      expect(hasMasteredWeapon(combatant, 'longsword')).toBe(false)
    })

    it('returns true when character has mastered the weapon', () => {
      const combatant = createCharacterCombatant({}, [], ['longsword', 'greataxe'])
      expect(hasMasteredWeapon(combatant, 'longsword')).toBe(true)
      expect(hasMasteredWeapon(combatant, 'greataxe')).toBe(true)
    })

    it('returns false when character has mastered different weapons', () => {
      const combatant = createCharacterCombatant({}, [], ['greataxe', 'rapier'])
      expect(hasMasteredWeapon(combatant, 'longsword')).toBe(false)
    })
  })

  describe('getActiveMastery', () => {
    it('returns null when weapon has no mastery property', () => {
      const combatant = createCharacterCombatant({}, [], ['longsword'])
      const weapon = createWeapon({ mastery: undefined })
      expect(getActiveMastery(combatant, weapon)).toBeNull()
    })

    it('returns null when character has not mastered the weapon', () => {
      const combatant = createCharacterCombatant({}, [], ['greataxe'])
      const weapon = createWeapon({ id: 'longsword', mastery: 'sap' })
      expect(getActiveMastery(combatant, weapon)).toBeNull()
    })

    it('returns mastery when character has mastered the weapon', () => {
      const combatant = createCharacterCombatant({}, [], ['longsword'])
      const weapon = createWeapon({ id: 'longsword', mastery: 'sap' })
      expect(getActiveMastery(combatant, weapon)).toBe('sap')
    })

    it('returns different masteries for different weapons', () => {
      const combatant = createCharacterCombatant({}, [], ['greataxe', 'rapier', 'greatsword'])

      const greataxe = createWeapon({ id: 'greataxe', mastery: 'cleave' })
      const rapier = createWeapon({ id: 'rapier', mastery: 'vex' })
      const greatsword = createWeapon({ id: 'greatsword', mastery: 'graze' })

      expect(getActiveMastery(combatant, greataxe)).toBe('cleave')
      expect(getActiveMastery(combatant, rapier)).toBe('vex')
      expect(getActiveMastery(combatant, greatsword)).toBe('graze')
    })
  })

  describe('getMaxMasteredWeapons', () => {
    it('returns 0 for monsters', () => {
      const monster = createMonsterCombatant()
      expect(getMaxMasteredWeapons(monster)).toBe(0)
    })

    it('returns 0 when character has no weapon mastery feature', () => {
      const combatant = createCharacterCombatant({}, [], [])
      expect(getMaxMasteredWeapons(combatant)).toBe(0)
    })

    it('returns base count from weapon mastery feature', () => {
      const feature = createWeaponMasteryFeature(3)
      const combatant = createCharacterCombatant({ level: 1 }, [feature], [])
      expect(getMaxMasteredWeapons(combatant)).toBe(3)
    })

    it('returns scaled count based on level', () => {
      const feature = createWeaponMasteryFeature(3, { 4: 4, 10: 5, 16: 6 })

      // Level 1: base count
      const level1 = createCharacterCombatant({ level: 1 }, [feature], [])
      expect(getMaxMasteredWeapons(level1)).toBe(3)

      // Level 4: first scaling
      const level4 = createCharacterCombatant({ level: 4 }, [feature], [])
      expect(getMaxMasteredWeapons(level4)).toBe(4)

      // Level 7: still at level 4 scaling
      const level7 = createCharacterCombatant({ level: 7 }, [feature], [])
      expect(getMaxMasteredWeapons(level7)).toBe(4)

      // Level 10: second scaling
      const level10 = createCharacterCombatant({ level: 10 }, [feature], [])
      expect(getMaxMasteredWeapons(level10)).toBe(5)

      // Level 16: max scaling
      const level16 = createCharacterCombatant({ level: 16 }, [feature], [])
      expect(getMaxMasteredWeapons(level16)).toBe(6)

      // Level 20: still at max scaling
      const level20 = createCharacterCombatant({ level: 20 }, [feature], [])
      expect(getMaxMasteredWeapons(level20)).toBe(6)
    })

    it('returns Ranger count (2 weapons, no scaling)', () => {
      const rangerFeature = createWeaponMasteryFeature(2)
      const ranger = createCharacterCombatant({ level: 10 }, [rangerFeature], [])
      expect(getMaxMasteredWeapons(ranger)).toBe(2)
    })
  })

  describe('canUseWeaponMastery', () => {
    it('returns false for monsters', () => {
      const monster = createMonsterCombatant()
      expect(canUseWeaponMastery(monster)).toBe(false)
    })

    it('returns false for characters without weapon mastery feature', () => {
      const combatant = createCharacterCombatant({}, [], [])
      expect(canUseWeaponMastery(combatant)).toBe(false)
    })

    it('returns true for characters with weapon mastery feature', () => {
      const feature = createWeaponMasteryFeature(3)
      const combatant = createCharacterCombatant({ level: 1 }, [feature], [])
      expect(canUseWeaponMastery(combatant)).toBe(true)
    })
  })

  describe('getGrazeDamage', () => {
    it('returns 0 for monsters', () => {
      const monster = createMonsterCombatant()
      const weapon = createWeapon({ mastery: 'graze' })
      expect(getGrazeDamage(monster, weapon)).toBe(0)
    })

    it('returns strength modifier for melee weapons', () => {
      // STR 16 = +3 modifier
      const combatant = createCharacterCombatant({
        abilityScores: { strength: 16, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 }
      }, [], [])
      const weapon = createWeapon({ type: 'melee', properties: [] })
      expect(getGrazeDamage(combatant, weapon)).toBe(3)
    })

    it('returns dexterity modifier for ranged weapons', () => {
      // DEX 18 = +4 modifier
      const combatant = createCharacterCombatant({
        abilityScores: { strength: 10, dexterity: 18, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 }
      }, [], [])
      const weapon = createWeapon({ type: 'ranged', properties: [] })
      expect(getGrazeDamage(combatant, weapon)).toBe(4)
    })

    it('returns higher of STR/DEX for finesse weapons', () => {
      // STR 10 = +0, DEX 18 = +4
      const combatant = createCharacterCombatant({
        abilityScores: { strength: 10, dexterity: 18, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 }
      }, [], [])
      const weapon = createWeapon({ type: 'melee', properties: ['finesse'] })
      expect(getGrazeDamage(combatant, weapon)).toBe(4)
    })

    it('returns 0 for negative ability modifiers', () => {
      // STR 8 = -1 modifier, should return 0
      const combatant = createCharacterCombatant({
        abilityScores: { strength: 8, dexterity: 8, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 }
      }, [], [])
      const weapon = createWeapon({ type: 'melee', properties: [] })
      expect(getGrazeDamage(combatant, weapon)).toBe(0)
    })
  })

  describe('applyGrazeOnMiss', () => {
    it('returns null when weapon does not have graze mastery', () => {
      const attacker = createCharacterCombatant({}, [], ['longsword'])
      const target = createMonsterCombatant()
      const weapon = createWeapon({ id: 'longsword', mastery: 'sap' })

      expect(applyGrazeOnMiss(attacker, target, weapon)).toBeNull()
    })

    it('returns null when attacker has not mastered the weapon', () => {
      const attacker = createCharacterCombatant({}, [], ['longsword'])
      const target = createMonsterCombatant()
      const weapon = createWeapon({ id: 'greatsword', mastery: 'graze' })

      expect(applyGrazeOnMiss(attacker, target, weapon)).toBeNull()
    })

    it('returns graze damage when attacker has mastered graze weapon', () => {
      const attacker = createCharacterCombatant({
        abilityScores: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 }
      }, [], ['greatsword'])
      const target = createMonsterCombatant()
      const weapon = createWeapon({ id: 'greatsword', mastery: 'graze', type: 'melee' })

      const result = applyGrazeOnMiss(attacker, target, weapon)

      expect(result).not.toBeNull()
      expect(result!.mastery).toBe('graze')
      expect(result!.applied).toBe(true)
      expect(result!.grazeDamage).toBe(3) // STR 16 = +3
    })

    it('returns applied=false when graze damage would be 0', () => {
      const attacker = createCharacterCombatant({
        abilityScores: { strength: 8, dexterity: 8, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 }
      }, [], ['greatsword'])
      const target = createMonsterCombatant()
      const weapon = createWeapon({ id: 'greatsword', mastery: 'graze', type: 'melee' })

      const result = applyGrazeOnMiss(attacker, target, weapon)

      expect(result).not.toBeNull()
      expect(result!.applied).toBe(false)
      expect(result!.grazeDamage).toBe(0)
    })
  })

  describe('canUseNickAttack', () => {
    it('returns false when weapon does not have nick mastery', () => {
      const attacker = createCharacterCombatant({}, [], ['longsword'])
      const weapon = createWeapon({ id: 'longsword', mastery: 'sap', properties: ['light'] })
      expect(canUseNickAttack(attacker, weapon)).toBe(false)
    })

    it('returns false when attacker has not mastered the weapon', () => {
      const attacker = createCharacterCombatant({}, [], ['longsword'])
      const weapon = createWeapon({ id: 'dagger', mastery: 'nick', properties: ['light', 'finesse'] })
      expect(canUseNickAttack(attacker, weapon)).toBe(false)
    })

    it('returns false when attacker has already used nick this turn', () => {
      const attacker = createCharacterCombatant({}, [], ['dagger']) as Combatant
      attacker.usedNickThisTurn = true
      const weapon = createWeapon({ id: 'dagger', mastery: 'nick', properties: ['light', 'finesse'] })
      expect(canUseNickAttack(attacker, weapon)).toBe(false)
    })

    it('returns false when weapon is not light', () => {
      const attacker = createCharacterCombatant({}, [], ['scimitar'])
      const weapon = createWeapon({ id: 'scimitar', mastery: 'nick', properties: ['finesse'] }) // missing light
      expect(canUseNickAttack(attacker, weapon)).toBe(false)
    })

    it('returns true when all conditions are met', () => {
      const attacker = createCharacterCombatant({}, [], ['dagger'])
      const weapon = createWeapon({ id: 'dagger', mastery: 'nick', properties: ['light', 'finesse'] })
      expect(canUseNickAttack(attacker, weapon)).toBe(true)
    })
  })

  describe('hasVexAdvantage', () => {
    it('returns false when target has no vexedBy', () => {
      const attacker = createCharacterCombatant({}, [], [])
      const target = createMonsterCombatant()
      expect(hasVexAdvantage(attacker, target, 1)).toBe(false)
    })

    it('returns false when vexed by different attacker', () => {
      const attacker = createCharacterCombatant({}, [], [])
      const target = createMonsterCombatant()
      target.vexedBy = { attackerId: 'different-attacker', expiresOnRound: 2 }
      expect(hasVexAdvantage(attacker, target, 1)).toBe(false)
    })

    it('returns false when vex has expired', () => {
      const attacker = createCharacterCombatant({}, [], [])
      const target = createMonsterCombatant()
      target.vexedBy = { attackerId: attacker.id, expiresOnRound: 1 }
      expect(hasVexAdvantage(attacker, target, 2)).toBe(false)
    })

    it('returns true when attacker has active vex on target', () => {
      const attacker = createCharacterCombatant({}, [], [])
      const target = createMonsterCombatant()
      target.vexedBy = { attackerId: attacker.id, expiresOnRound: 2 }
      expect(hasVexAdvantage(attacker, target, 1)).toBe(true)
      expect(hasVexAdvantage(attacker, target, 2)).toBe(true)
    })
  })

  describe('isSapped', () => {
    it('returns false when combatant has no conditions', () => {
      const combatant = createCharacterCombatant({}, [], [])
      expect(isSapped(combatant)).toBe(false)
    })

    it('returns false when combatant has other conditions', () => {
      const combatant = createCharacterCombatant({}, [], [])
      combatant.conditions = [{ condition: 'prone', duration: -1 }]
      expect(isSapped(combatant)).toBe(false)
    })

    it('returns true when combatant has sapped condition', () => {
      const combatant = createCharacterCombatant({}, [], [])
      combatant.conditions = [{ condition: 'sapped', duration: 1 }]
      expect(isSapped(combatant)).toBe(true)
    })
  })

  describe('getCleaveTargets', () => {
    it('returns empty array when no valid targets', () => {
      const attacker = createCharacterCombatant({}, [], ['greataxe'])
      const originalTarget = createMonsterCombatant({ position: { x: 6, y: 5 } })
      const weapon = createWeapon({ id: 'greataxe', mastery: 'cleave' })

      const targets = getCleaveTargets(attacker, originalTarget, [attacker, originalTarget], weapon)
      expect(targets).toHaveLength(0)
    })

    it('returns targets within 5ft of original target and attacker reach', () => {
      const attacker = createCharacterCombatant({}, [], ['greataxe'])
      attacker.position = { x: 5, y: 5 }
      const originalTarget = createMonsterCombatant({ id: 'monster-1', position: { x: 6, y: 5 } })
      // nearbyEnemy must be within 5ft of original target AND within attacker's weapon reach (5ft for greataxe)
      // Position (6,6) is diagonally adjacent to both attacker (5,5) and target (6,5)
      const nearbyEnemy = createMonsterCombatant({ id: 'monster-2', position: { x: 6, y: 6 } })
      const farEnemy = createMonsterCombatant({ id: 'monster-3', position: { x: 9, y: 5 } }) // Too far from attacker

      const weapon = createWeapon({ id: 'greataxe', mastery: 'cleave' })

      const targets = getCleaveTargets(
        attacker,
        originalTarget,
        [attacker, originalTarget, nearbyEnemy, farEnemy],
        weapon
      )

      expect(targets).toHaveLength(1)
      expect(targets[0].id).toBe('monster-2')
    })

    it('excludes dead targets', () => {
      const attacker = createCharacterCombatant({}, [], ['greataxe'])
      attacker.position = { x: 5, y: 5 }
      const originalTarget = createMonsterCombatant({ id: 'monster-1', position: { x: 6, y: 5 } })
      const deadEnemy = createMonsterCombatant({ id: 'monster-2', position: { x: 7, y: 5 } })
      deadEnemy.currentHp = 0

      const weapon = createWeapon({ id: 'greataxe', mastery: 'cleave' })

      const targets = getCleaveTargets(
        attacker,
        originalTarget,
        [attacker, originalTarget, deadEnemy],
        weapon
      )

      expect(targets).toHaveLength(0)
    })

    it('excludes allies (same type as attacker)', () => {
      const attacker = createCharacterCombatant({}, [], ['greataxe'])
      attacker.position = { x: 5, y: 5 }
      const originalTarget = createMonsterCombatant({ id: 'monster-1', position: { x: 6, y: 5 } })
      const ally = createCharacterCombatant({}, [], [])
      ally.id = 'ally-1'
      ally.position = { x: 7, y: 5 }

      const weapon = createWeapon({ id: 'greataxe', mastery: 'cleave' })

      const targets = getCleaveTargets(
        attacker,
        originalTarget,
        [attacker, originalTarget, ally],
        weapon
      )

      expect(targets).toHaveLength(0)
    })

    it('respects weapon reach', () => {
      const attacker = createCharacterCombatant({}, [], ['halberd'])
      attacker.position = { x: 5, y: 5 }
      const originalTarget = createMonsterCombatant({ id: 'monster-1', position: { x: 6, y: 5 } })
      // This enemy is 10ft from attacker, within reach weapon range
      const nearbyEnemy = createMonsterCombatant({ id: 'monster-2', position: { x: 7, y: 5 } })

      const halberd = createWeapon({ id: 'halberd', mastery: 'cleave', properties: ['reach', 'heavy', 'two-handed'] })

      const targets = getCleaveTargets(
        attacker,
        originalTarget,
        [attacker, originalTarget, nearbyEnemy],
        halberd
      )

      expect(targets).toHaveLength(1)
    })
  })

  describe('applyOnHitMasteryEffect', () => {
    it('returns null when weapon has no mastery', () => {
      const attacker = createCharacterCombatant({}, [], ['longsword'])
      const target = createMonsterCombatant()
      const weapon = createWeapon({ mastery: undefined })
      const grid = createGrid()

      const result = applyOnHitMasteryEffect(attacker, target, weapon, grid, [attacker, target], 1)
      expect(result).toBeNull()
    })

    it('returns null when attacker has not mastered the weapon', () => {
      const attacker = createCharacterCombatant({}, [], ['greataxe'])
      const target = createMonsterCombatant()
      const weapon = createWeapon({ id: 'longsword', mastery: 'sap' })
      const grid = createGrid()

      const result = applyOnHitMasteryEffect(attacker, target, weapon, grid, [attacker, target], 1)
      expect(result).toBeNull()
    })

    describe('Sap mastery', () => {
      it('applies sap effect successfully', () => {
        const attacker = createCharacterCombatant({}, [], ['longsword'])
        const target = createMonsterCombatant()
        const weapon = createWeapon({ id: 'longsword', mastery: 'sap' })
        const grid = createGrid()

        const result = applyOnHitMasteryEffect(attacker, target, weapon, grid, [attacker, target], 1)

        expect(result).not.toBeNull()
        expect(result!.mastery).toBe('sap')
        expect(result!.applied).toBe(true)
        expect(result!.description).toContain('sapped')
      })
    })

    describe('Vex mastery', () => {
      it('applies vex effect successfully', () => {
        const attacker = createCharacterCombatant({}, [], ['rapier'])
        const target = createMonsterCombatant()
        const weapon = createWeapon({ id: 'rapier', mastery: 'vex' })
        const grid = createGrid()

        const result = applyOnHitMasteryEffect(attacker, target, weapon, grid, [attacker, target], 1)

        expect(result).not.toBeNull()
        expect(result!.mastery).toBe('vex')
        expect(result!.applied).toBe(true)
        expect(result!.description).toContain('advantage')
      })
    })

    describe('Push mastery', () => {
      it('applies push effect and calculates new position', () => {
        const attacker = createCharacterCombatant({}, [], ['warhammer'])
        attacker.position = { x: 5, y: 5 }
        const target = createMonsterCombatant()
        target.position = { x: 6, y: 5 }
        const weapon = createWeapon({ id: 'warhammer', mastery: 'push' })
        const grid = createGrid()

        const result = applyOnHitMasteryEffect(attacker, target, weapon, grid, [attacker, target], 1)

        expect(result).not.toBeNull()
        expect(result!.mastery).toBe('push')
        expect(result!.applied).toBe(true)
        expect(result!.pushResult).toBeDefined()
        expect(result!.pushResult!.newPosition.x).toBe(8) // Pushed 2 squares (10ft) to the right
        expect(result!.pushResult!.newPosition.y).toBe(5)
      })

      it('stops push at grid boundary (partial push)', () => {
        const attacker = createCharacterCombatant({}, [], ['warhammer'])
        attacker.position = { x: 5, y: 5 }
        const target = createMonsterCombatant()
        target.position = { x: 8, y: 5 } // 1 square from edge, can only be pushed 1 square
        const weapon = createWeapon({ id: 'warhammer', mastery: 'push' })
        const grid = createGrid() // 10x10 grid (x: 0-9)

        const result = applyOnHitMasteryEffect(attacker, target, weapon, grid, [attacker, target], 1)

        expect(result).not.toBeNull()
        expect(result!.applied).toBe(true)
        expect(result!.pushResult).toBeDefined()
        // Should only push 1 square (5ft) instead of 2 (10ft) due to boundary
        expect(result!.pushResult!.newPosition.x).toBe(9) // Stops at edge
        expect(result!.pushResult!.distance).toBe(5) // Only 5ft push
      })

      it('fails push when already at boundary', () => {
        const attacker = createCharacterCombatant({}, [], ['warhammer'])
        attacker.position = { x: 5, y: 5 }
        const target = createMonsterCombatant()
        target.position = { x: 9, y: 5 } // Already at edge
        const weapon = createWeapon({ id: 'warhammer', mastery: 'push' })
        const grid = createGrid() // 10x10 grid (x: 0-9)

        const result = applyOnHitMasteryEffect(attacker, target, weapon, grid, [attacker, target], 1)

        expect(result).not.toBeNull()
        expect(result!.applied).toBe(false)
        expect(result!.description).toContain('blocked')
      })
    })

    describe('Slow mastery', () => {
      it('applies slow effect', () => {
        const attacker = createCharacterCombatant({}, [], ['longbow'])
        const target = createMonsterCombatant()
        const weapon = createWeapon({ id: 'longbow', mastery: 'slow', type: 'ranged' })
        const grid = createGrid()

        const result = applyOnHitMasteryEffect(attacker, target, weapon, grid, [attacker, target], 1)

        expect(result).not.toBeNull()
        expect(result!.mastery).toBe('slow')
        expect(result!.applied).toBe(true)
        expect(result!.slowResult?.speedReduction).toBe(10)
      })
    })

    describe('Topple mastery', () => {
      it('applies topple effect with save roll', () => {
        // Mock Math.random for predictable save roll
        vi.spyOn(Math, 'random').mockReturnValue(0.05) // Low roll = fail save

        const feature = createWeaponMasteryFeature(3)
        const attacker = createCharacterCombatant({ level: 5, proficiencyBonus: 3 }, [feature], ['maul'])
        const target = createMonsterCombatant()
        const weapon = createWeapon({ id: 'maul', mastery: 'topple' })
        const grid = createGrid()

        const result = applyOnHitMasteryEffect(attacker, target, weapon, grid, [attacker, target], 1)

        expect(result).not.toBeNull()
        expect(result!.mastery).toBe('topple')
        expect(result!.toppleResult).toBeDefined()
        expect(result!.toppleResult!.saveDC).toBeGreaterThan(0)
      })
    })

    describe('Nick mastery', () => {
      it('returns null for nick (handled separately)', () => {
        const attacker = createCharacterCombatant({}, [], ['dagger'])
        const target = createMonsterCombatant()
        const weapon = createWeapon({ id: 'dagger', mastery: 'nick', properties: ['light', 'finesse'] })
        const grid = createGrid()

        const result = applyOnHitMasteryEffect(attacker, target, weapon, grid, [attacker, target], 1)

        expect(result).toBeNull()
      })
    })

    describe('Graze mastery', () => {
      it('returns null for graze on hit (only applies on miss)', () => {
        const attacker = createCharacterCombatant({}, [], ['greatsword'])
        const target = createMonsterCombatant()
        const weapon = createWeapon({ id: 'greatsword', mastery: 'graze' })
        const grid = createGrid()

        const result = applyOnHitMasteryEffect(attacker, target, weapon, grid, [attacker, target], 1)

        expect(result).toBeNull()
      })
    })

    describe('Cleave mastery', () => {
      it('returns cleave targets info', () => {
        const attacker = createCharacterCombatant({}, [], ['greataxe'])
        attacker.position = { x: 5, y: 5 }
        const target = createMonsterCombatant({ id: 'monster-1' })
        target.position = { x: 6, y: 5 }
        // nearbyEnemy must be within 5ft of target AND within attacker's weapon reach
        // Position (6,6) is diagonally adjacent to both attacker and target
        const nearbyEnemy = createMonsterCombatant({ id: 'monster-2' })
        nearbyEnemy.position = { x: 6, y: 6 }

        const weapon = createWeapon({ id: 'greataxe', mastery: 'cleave' })
        const grid = createGrid()

        const result = applyOnHitMasteryEffect(
          attacker,
          target,
          weapon,
          grid,
          [attacker, target, nearbyEnemy],
          1
        )

        expect(result).not.toBeNull()
        expect(result!.mastery).toBe('cleave')
        expect(result!.applied).toBe(false) // Cleave is not "applied" on initial hit
        expect(result!.cleaveTargets).toBeDefined()
        expect(result!.cleaveTargets!.length).toBe(1)
      })
    })
  })

  describe('getMasteryDescription', () => {
    const masteries: WeaponMastery[] = ['cleave', 'graze', 'nick', 'push', 'sap', 'slow', 'topple', 'vex']

    it.each(masteries)('returns non-empty description for %s', (mastery) => {
      const description = getMasteryDescription(mastery)
      expect(description).toBeTruthy()
      expect(description.length).toBeGreaterThan(10)
    })

    it('returns empty string for unknown mastery', () => {
      const description = getMasteryDescription('unknown' as WeaponMastery)
      expect(description).toBe('')
    })
  })
})
