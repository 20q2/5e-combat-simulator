import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCombatSuperiorityFeature,
  getRelentlessFeature,
  hasCombatSuperiority,
  getSuperiorityDieSize,
  getMaxSuperiorityDice,
  getManeuversKnownCount,
  initializeSuperiorityDice,
  checkRelentless,
  getManeuverSaveDC,
  rollSuperiorityDie,
  canUseManeuver,
  getAvailableManeuvers,
  makeManeuverSavingThrow,
  applyOnHitManeuver,
  applyParry,
  applyPrecisionAttack,
  prepareRiposte,
} from '@/engine/maneuvers'
import type { Combatant, Character, Grid } from '@/types'
import type { CombatSuperiorityFeature, RelentlessFeature, ClassFeature } from '@/types/classFeature'
import { getManeuverById } from '@/data/maneuvers'

// ============================================
// Test Helpers
// ============================================

function createCombatSuperiorityFeature(overrides: Partial<CombatSuperiorityFeature> = {}): CombatSuperiorityFeature {
  return {
    id: 'combat-superiority',
    name: 'Combat Superiority',
    description: 'Learn maneuvers and gain superiority dice',
    level: 3,
    type: 'combat_superiority',
    trigger: 'passive',
    superiorityDiceCount: 4,
    superiorityDieSize: 8,
    maneuversKnown: 3,
    superiorityDiceAtLevels: { 7: 5, 15: 6 },
    superiorityDieSizeAtLevels: { 10: 10, 18: 12 },
    maneuversKnownAtLevels: { 7: 5, 10: 7, 15: 9 },
    ...overrides,
  }
}

function createRelentlessFeature(): RelentlessFeature {
  return {
    id: 'relentless',
    name: 'Relentless',
    description: 'Regain 1 superiority die on initiative if you have none',
    level: 15,
    type: 'relentless',
    trigger: 'passive',
  }
}

function createBattleMasterCombatant(
  level: number = 3,
  knownManeuverIds: string[] = ['trip-attack', 'riposte', 'precision-attack'],
  superiorityDiceRemaining: number = 4,
  includeRelentless: boolean = false
): Combatant {
  const subclassFeatures: ClassFeature[] = [createCombatSuperiorityFeature()]
  if (includeRelentless) {
    subclassFeatures.push(createRelentlessFeature())
  }

  const character = {
    id: 'test-battlemaster',
    name: 'Test Battle Master',
    level,
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
    subclass: {
      id: 'battle-master',
      name: 'Battle Master',
      description: 'Master of martial maneuvers',
      features: subclassFeatures,
    },
    proficiencyBonus: Math.ceil(level / 4) + 1,
    abilityScores: { strength: 18, dexterity: 14, constitution: 16, intelligence: 10, wisdom: 12, charisma: 8 },
    equipment: { items: [] },
    knownManeuverIds,
  } as unknown as Character

  return {
    id: 'combatant-battlemaster',
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
    superiorityDiceRemaining,
    usedManeuverThisAttack: false,
    goadedBy: undefined,
    featUses: {},
    usedSavageAttackerThisTurn: false,
    usedTavernBrawlerPushThisTurn: false,
    heroicInspiration: false,
  } as Combatant
}

function createNonBattleMasterCombatant(): Combatant {
  const character = {
    id: 'test-fighter',
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
      features: [],
      subclasses: [],
    },
    subclass: {
      id: 'champion',
      name: 'Champion',
      description: 'Critical hit specialist',
      features: [],
    },
    proficiencyBonus: 3,
    abilityScores: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
    equipment: { items: [] },
  } as unknown as Character

  return {
    id: 'combatant-champion',
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
    superiorityDiceRemaining: 0,
    usedManeuverThisAttack: false,
    goadedBy: undefined,
    featUses: {},
    usedSavageAttackerThisTurn: false,
    usedTavernBrawlerPushThisTurn: false,
    heroicInspiration: false,
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
      hp: 12,
      speed: { walk: 30 },
      abilityScores: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 },
      actions: [],
      savingThrowProficiencies: [],
    },
    name: 'Goblin',
    maxHp: 12,
    currentHp: 12,
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
    superiorityDiceRemaining: 0,
    usedManeuverThisAttack: false,
    goadedBy: undefined,
    ...overrides,
  } as Combatant
}

function createEmptyGrid(): Grid {
  const cells = Array.from({ length: 10 }, (_, y) =>
    Array.from({ length: 10 }, (_, x) => ({
      x,
      y,
      terrain: undefined,
      occupiedBy: undefined,
      elevation: 0,
    }))
  )
  return { width: 10, height: 10, cells }
}

// ============================================
// Feature Detection Tests
// ============================================

describe('Feature Detection', () => {
  describe('getCombatSuperiorityFeature', () => {
    it('returns Combat Superiority feature for Battle Master', () => {
      const combatant = createBattleMasterCombatant()
      const feature = getCombatSuperiorityFeature(combatant)
      expect(feature).toBeDefined()
      expect(feature?.type).toBe('combat_superiority')
    })

    it('returns undefined for non-Battle Master', () => {
      const combatant = createNonBattleMasterCombatant()
      const feature = getCombatSuperiorityFeature(combatant)
      expect(feature).toBeUndefined()
    })

    it('returns undefined for monsters', () => {
      const combatant = createMonsterCombatant()
      const feature = getCombatSuperiorityFeature(combatant)
      expect(feature).toBeUndefined()
    })

    it('returns undefined if character level is below feature level', () => {
      const combatant = createBattleMasterCombatant(2) // Level 2, feature requires level 3
      const feature = getCombatSuperiorityFeature(combatant)
      expect(feature).toBeUndefined()
    })
  })

  describe('getRelentlessFeature', () => {
    it('returns Relentless feature for level 15+ Battle Master', () => {
      const combatant = createBattleMasterCombatant(15, [], 0, true)
      const feature = getRelentlessFeature(combatant)
      expect(feature).toBeDefined()
      expect(feature?.type).toBe('relentless')
    })

    it('returns undefined for Battle Master below level 15', () => {
      const combatant = createBattleMasterCombatant(10, [], 4, true)
      const feature = getRelentlessFeature(combatant)
      expect(feature).toBeUndefined()
    })

    it('returns undefined for non-Battle Master', () => {
      const combatant = createNonBattleMasterCombatant()
      const feature = getRelentlessFeature(combatant)
      expect(feature).toBeUndefined()
    })
  })

  describe('hasCombatSuperiority', () => {
    it('returns true for Battle Master', () => {
      const combatant = createBattleMasterCombatant()
      expect(hasCombatSuperiority(combatant)).toBe(true)
    })

    it('returns false for non-Battle Master', () => {
      const combatant = createNonBattleMasterCombatant()
      expect(hasCombatSuperiority(combatant)).toBe(false)
    })

    it('returns false for monsters', () => {
      const combatant = createMonsterCombatant()
      expect(hasCombatSuperiority(combatant)).toBe(false)
    })
  })
})

// ============================================
// Superiority Dice Calculation Tests
// ============================================

describe('Superiority Dice Calculations', () => {
  describe('getSuperiorityDieSize', () => {
    it('returns d8 for level 3 Battle Master', () => {
      const combatant = createBattleMasterCombatant(3)
      expect(getSuperiorityDieSize(combatant)).toBe(8)
    })

    it('returns d8 for level 9 Battle Master', () => {
      const combatant = createBattleMasterCombatant(9)
      expect(getSuperiorityDieSize(combatant)).toBe(8)
    })

    it('returns d10 for level 10 Battle Master', () => {
      const combatant = createBattleMasterCombatant(10)
      expect(getSuperiorityDieSize(combatant)).toBe(10)
    })

    it('returns d10 for level 17 Battle Master', () => {
      const combatant = createBattleMasterCombatant(17)
      expect(getSuperiorityDieSize(combatant)).toBe(10)
    })

    it('returns d12 for level 18 Battle Master', () => {
      const combatant = createBattleMasterCombatant(18)
      expect(getSuperiorityDieSize(combatant)).toBe(12)
    })

    it('returns d12 for level 20 Battle Master', () => {
      const combatant = createBattleMasterCombatant(20)
      expect(getSuperiorityDieSize(combatant)).toBe(12)
    })

    it('returns 0 for non-Battle Master', () => {
      const combatant = createNonBattleMasterCombatant()
      expect(getSuperiorityDieSize(combatant)).toBe(0)
    })
  })

  describe('getMaxSuperiorityDice', () => {
    it('returns 4 for level 3-6 Battle Master', () => {
      const combatant = createBattleMasterCombatant(3)
      expect(getMaxSuperiorityDice(combatant)).toBe(4)
    })

    it('returns 5 for level 7-14 Battle Master', () => {
      const combatant = createBattleMasterCombatant(7)
      expect(getMaxSuperiorityDice(combatant)).toBe(5)
    })

    it('returns 6 for level 15+ Battle Master', () => {
      const combatant = createBattleMasterCombatant(15)
      expect(getMaxSuperiorityDice(combatant)).toBe(6)
    })

    it('returns 0 for non-Battle Master', () => {
      const combatant = createNonBattleMasterCombatant()
      expect(getMaxSuperiorityDice(combatant)).toBe(0)
    })
  })

  describe('getManeuversKnownCount', () => {
    it('returns 3 for level 3-6 Battle Master', () => {
      const combatant = createBattleMasterCombatant(3)
      expect(getManeuversKnownCount(combatant)).toBe(3)
    })

    it('returns 5 for level 7-9 Battle Master', () => {
      const combatant = createBattleMasterCombatant(7)
      expect(getManeuversKnownCount(combatant)).toBe(5)
    })

    it('returns 7 for level 10-14 Battle Master', () => {
      const combatant = createBattleMasterCombatant(10)
      expect(getManeuversKnownCount(combatant)).toBe(7)
    })

    it('returns 9 for level 15+ Battle Master', () => {
      const combatant = createBattleMasterCombatant(15)
      expect(getManeuversKnownCount(combatant)).toBe(9)
    })

    it('returns 0 for non-Battle Master', () => {
      const combatant = createNonBattleMasterCombatant()
      expect(getManeuversKnownCount(combatant)).toBe(0)
    })
  })

  describe('initializeSuperiorityDice', () => {
    it('returns max dice count for Battle Master', () => {
      const combatant = createBattleMasterCombatant(7)
      expect(initializeSuperiorityDice(combatant)).toBe(5)
    })

    it('returns 0 for non-Battle Master', () => {
      const combatant = createNonBattleMasterCombatant()
      expect(initializeSuperiorityDice(combatant)).toBe(0)
    })
  })
})

// ============================================
// Relentless Feature Tests
// ============================================

describe('Relentless Feature', () => {
  describe('checkRelentless', () => {
    it('returns true when level 15+ Battle Master has 0 dice', () => {
      const combatant = createBattleMasterCombatant(15, [], 0, true)
      expect(checkRelentless(combatant)).toBe(true)
    })

    it('returns false when level 15+ Battle Master has dice remaining', () => {
      const combatant = createBattleMasterCombatant(15, [], 3, true)
      expect(checkRelentless(combatant)).toBe(false)
    })

    it('returns false for Battle Master without Relentless', () => {
      const combatant = createBattleMasterCombatant(10, [], 0, false)
      expect(checkRelentless(combatant)).toBe(false)
    })

    it('returns false for non-Battle Master', () => {
      const combatant = createNonBattleMasterCombatant()
      expect(checkRelentless(combatant)).toBe(false)
    })
  })
})

// ============================================
// Maneuver Save DC Tests
// ============================================

describe('Maneuver Save DC', () => {
  describe('getManeuverSaveDC', () => {
    it('calculates DC correctly using higher of STR/DEX', () => {
      // Level 5 (prof +3), STR 18 (+4), DEX 14 (+2)
      // DC = 8 + 3 + 4 = 15
      const combatant = createBattleMasterCombatant(5)
      expect(getManeuverSaveDC(combatant)).toBe(15)
    })

    it('uses DEX when higher than STR', () => {
      const combatant = createBattleMasterCombatant(5)
      const character = combatant.data as Character
      // Modify to have DEX higher than STR
      character.abilityScores.strength = 10 // +0
      character.abilityScores.dexterity = 18 // +4
      // DC = 8 + 3 + 4 = 15
      expect(getManeuverSaveDC(combatant)).toBe(15)
    })

    it('scales with level (proficiency)', () => {
      // Level 9 (prof +4), STR 18 (+4)
      // DC = 8 + 4 + 4 = 16
      const combatant = createBattleMasterCombatant(9)
      expect(getManeuverSaveDC(combatant)).toBe(16)
    })

    it('returns 10 for monsters', () => {
      const combatant = createMonsterCombatant()
      expect(getManeuverSaveDC(combatant)).toBe(10)
    })
  })
})

// ============================================
// Superiority Die Rolling Tests
// ============================================

describe('Superiority Die Rolling', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('rollSuperiorityDie', () => {
    it('rolls the correct die size', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // Should give 5 on d8
      const combatant = createBattleMasterCombatant(5)
      const result = rollSuperiorityDie(combatant)
      expect(result.dieSize).toBe(8)
      expect(result.total).toBe(5)
      expect(result.rolls).toHaveLength(1)
    })

    it('uses d10 at level 10+', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // Should give 6 on d10
      const combatant = createBattleMasterCombatant(10)
      const result = rollSuperiorityDie(combatant)
      expect(result.dieSize).toBe(10)
      expect(result.total).toBe(6)
    })

    it('uses d12 at level 18+', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // Should give 7 on d12
      const combatant = createBattleMasterCombatant(18)
      const result = rollSuperiorityDie(combatant)
      expect(result.dieSize).toBe(12)
      expect(result.total).toBe(7)
    })

    it('returns 0 for non-Battle Master', () => {
      const combatant = createNonBattleMasterCombatant()
      const result = rollSuperiorityDie(combatant)
      expect(result.total).toBe(0)
      expect(result.dieSize).toBe(0)
      expect(result.rolls).toHaveLength(0)
    })
  })
})

// ============================================
// Maneuver Availability Tests
// ============================================

describe('Maneuver Availability', () => {
  describe('canUseManeuver', () => {
    it('allows using a known maneuver with dice remaining', () => {
      const combatant = createBattleMasterCombatant(5, ['trip-attack'], 4)
      const result = canUseManeuver(combatant, 'trip-attack')
      expect(result.canUse).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('denies use without Combat Superiority', () => {
      const combatant = createNonBattleMasterCombatant()
      const result = canUseManeuver(combatant, 'trip-attack')
      expect(result.canUse).toBe(false)
      expect(result.reason).toBe('No Combat Superiority feature')
    })

    it('denies use with no dice remaining', () => {
      const combatant = createBattleMasterCombatant(5, ['trip-attack'], 0)
      const result = canUseManeuver(combatant, 'trip-attack')
      expect(result.canUse).toBe(false)
      expect(result.reason).toBe('No superiority dice remaining')
    })

    it('denies use of unknown maneuver', () => {
      const combatant = createBattleMasterCombatant(5, ['trip-attack'], 4)
      const result = canUseManeuver(combatant, 'menacing-attack')
      expect(result.canUse).toBe(false)
      expect(result.reason).toBe('Maneuver not known')
    })

    it('denies reaction maneuver when reaction used', () => {
      const combatant = createBattleMasterCombatant(5, ['riposte'], 4)
      combatant.hasReacted = true
      const result = canUseManeuver(combatant, 'riposte')
      expect(result.canUse).toBe(false)
      expect(result.reason).toBe('Reaction already used')
    })

    it('allows reaction maneuver when reaction available', () => {
      const combatant = createBattleMasterCombatant(5, ['riposte'], 4)
      combatant.hasReacted = false
      const result = canUseManeuver(combatant, 'riposte')
      expect(result.canUse).toBe(true)
    })

    it('returns error for non-existent maneuver', () => {
      const combatant = createBattleMasterCombatant(5, ['fake-maneuver'], 4)
      const result = canUseManeuver(combatant, 'fake-maneuver')
      expect(result.canUse).toBe(false)
      expect(result.reason).toBe('Maneuver not found')
    })
  })

  describe('getAvailableManeuvers', () => {
    it('returns available on_hit maneuvers', () => {
      const combatant = createBattleMasterCombatant(5, ['trip-attack', 'menacing-attack', 'riposte'], 4)
      const maneuvers = getAvailableManeuvers(combatant, 'on_hit')
      expect(maneuvers).toHaveLength(2)
      expect(maneuvers.map(m => m.id)).toContain('trip-attack')
      expect(maneuvers.map(m => m.id)).toContain('menacing-attack')
    })

    it('returns available reaction maneuvers', () => {
      const combatant = createBattleMasterCombatant(5, ['trip-attack', 'riposte', 'parry'], 4)
      const maneuvers = getAvailableManeuvers(combatant, 'reaction')
      expect(maneuvers).toHaveLength(2)
      expect(maneuvers.map(m => m.id)).toContain('riposte')
      expect(maneuvers.map(m => m.id)).toContain('parry')
    })

    it('returns empty array when no dice remaining', () => {
      const combatant = createBattleMasterCombatant(5, ['trip-attack', 'riposte'], 0)
      const maneuvers = getAvailableManeuvers(combatant, 'on_hit')
      expect(maneuvers).toHaveLength(0)
    })

    it('returns empty array for non-character', () => {
      const combatant = createMonsterCombatant()
      const maneuvers = getAvailableManeuvers(combatant, 'on_hit')
      expect(maneuvers).toHaveLength(0)
    })

    it('returns empty array when no maneuvers known', () => {
      const combatant = createBattleMasterCombatant(5, [], 4)
      const maneuvers = getAvailableManeuvers(combatant, 'on_hit')
      expect(maneuvers).toHaveLength(0)
    })

    it('excludes reaction maneuvers when reaction used', () => {
      const combatant = createBattleMasterCombatant(5, ['riposte', 'parry'], 4)
      combatant.hasReacted = true
      const maneuvers = getAvailableManeuvers(combatant, 'reaction')
      expect(maneuvers).toHaveLength(0)
    })
  })
})

// ============================================
// Saving Throw Tests
// ============================================

describe('Maneuver Saving Throws', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('makeManeuverSavingThrow', () => {
    it('succeeds when roll + modifier >= DC', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.7) // Roll 15 on d20
      const target = createMonsterCombatant()
      // Goblin has STR 8 (-1), needs 14+, rolls 15-1=14
      const result = makeManeuverSavingThrow(target, 14, 'strength')
      expect(result.success).toBe(true)
      expect(result.roll).toBe(15)
      expect(result.total).toBe(14)
    })

    it('fails when roll + modifier < DC', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.4) // Roll 9 on d20
      const target = createMonsterCombatant()
      // Goblin has STR 8 (-1), needs 14+, rolls 9-1=8
      const result = makeManeuverSavingThrow(target, 14, 'strength')
      expect(result.success).toBe(false)
      expect(result.roll).toBe(9)
      expect(result.total).toBe(8)
    })

    it('works with character targets', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // Roll 11 on d20
      const target = createNonBattleMasterCombatant()
      // Character has STR 16 (+3), needs 14+, rolls 11+3=14
      const result = makeManeuverSavingThrow(target, 14, 'strength')
      expect(result.success).toBe(true)
      expect(result.total).toBe(14)
    })
  })
})

// ============================================
// Maneuver Application Tests
// ============================================

describe('Maneuver Application', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('applyOnHitManeuver', () => {
    it('applies Trip Attack with failed save', () => {
      // Mock dice: superiority die = 5, save roll = 5 (fails)
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.5 // Superiority die: 5
        return 0.2 // Save roll: 5
      })

      const attacker = createBattleMasterCombatant(5)
      const target = createMonsterCombatant()
      const maneuver = getManeuverById('trip-attack')!
      const grid = createEmptyGrid()

      const result = applyOnHitManeuver(attacker, target, maneuver, grid, [])

      expect(result.success).toBe(true)
      expect(result.maneuverId).toBe('trip-attack')
      expect(result.bonusDamage).toBe(5)
      expect(result.savingThrowMade).toBe(false)
      expect(result.conditionApplied).toBe('prone')
    })

    it('applies Trip Attack with successful save', () => {
      // Mock dice: superiority die = 5, save roll = 19 (succeeds)
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.5 // Superiority die: 5
        return 0.9 // Save roll: 19
      })

      const attacker = createBattleMasterCombatant(5)
      const target = createMonsterCombatant()
      const maneuver = getManeuverById('trip-attack')!
      const grid = createEmptyGrid()

      const result = applyOnHitManeuver(attacker, target, maneuver, grid, [])

      expect(result.savingThrowMade).toBe(true)
      expect(result.conditionApplied).toBeUndefined()
      expect(result.bonusDamage).toBe(5) // Still get the damage
    })

    it('applies Pushing Attack with push effect', () => {
      // Mock dice: superiority die = 6, save roll = 3 (fails)
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.625 // Superiority die: 6
        return 0.1 // Save roll: 3
      })

      const attacker = createBattleMasterCombatant(5)
      const target = createMonsterCombatant()
      const maneuver = getManeuverById('pushing-attack')!
      const grid = createEmptyGrid()

      const result = applyOnHitManeuver(attacker, target, maneuver, grid, [])

      expect(result.pushApplied).toBe(true)
      expect(result.bonusDamage).toBe(6)
    })
  })

  describe('applyParry', () => {
    it('reduces damage by die roll + DEX modifier', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.75) // Roll 7 on d8
      const defender = createBattleMasterCombatant(5)
      // DEX 14 = +2, so reduction = 7 + 2 = 9

      const result = applyParry(defender, 15)

      expect(result.maneuverId).toBe('parry')
      expect(result.damageReduced).toBe(9)
      expect(result.superiorityDieRoll).toBe(7)
    })

    it('caps damage reduction at incoming damage', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99) // Roll 8 on d8
      const defender = createBattleMasterCombatant(5)
      // DEX 14 = +2, so max reduction = 8 + 2 = 10, but damage is only 5

      const result = applyParry(defender, 5)

      expect(result.damageReduced).toBe(5) // Capped at incoming damage
    })
  })

  describe('applyPrecisionAttack', () => {
    it('provides attack bonus equal to die roll', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.625) // Roll 6 on d8
      const attacker = createBattleMasterCombatant(5)

      const result = applyPrecisionAttack(attacker)

      expect(result.maneuverId).toBe('precision-attack')
      expect(result.attackBonus).toBe(6)
      expect(result.superiorityDieRoll).toBe(6)
    })
  })

  describe('prepareRiposte', () => {
    it('provides bonus damage equal to die roll', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // Roll 5 on d8
      const attacker = createBattleMasterCombatant(5)

      const result = prepareRiposte(attacker)

      expect(result.maneuverId).toBe('riposte')
      expect(result.bonusDamage).toBe(5)
      expect(result.superiorityDieRoll).toBe(5)
    })
  })
})

// ============================================
// Integration Tests
// ============================================

describe('Integration', () => {
  it('level scaling works correctly from level 3 to 20', () => {
    const levels = [3, 6, 7, 9, 10, 14, 15, 17, 18, 20]
    const expectedDice = [4, 4, 5, 5, 5, 5, 6, 6, 6, 6]
    const expectedDieSize = [8, 8, 8, 8, 10, 10, 10, 10, 12, 12]
    const expectedManeuvers = [3, 3, 5, 5, 7, 7, 9, 9, 9, 9]

    levels.forEach((level, i) => {
      const combatant = createBattleMasterCombatant(level)
      expect(getMaxSuperiorityDice(combatant)).toBe(expectedDice[i])
      expect(getSuperiorityDieSize(combatant)).toBe(expectedDieSize[i])
      expect(getManeuversKnownCount(combatant)).toBe(expectedManeuvers[i])
    })
  })
})
