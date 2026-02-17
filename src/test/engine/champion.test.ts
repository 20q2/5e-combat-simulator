import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCriticalRange,
  isCriticalHit,
  hasRemarkableAthlete,
  hasHeroicWarrior,
  hasSurvivor,
  getAllFightingStyles,
  hasFightingStyle,
} from '@/engine/classAbilities'
import { rollDeathSave } from '@/engine/combat'
import type { Combatant, Character } from '@/types'
import type {
  ImprovedCriticalFeature,
  RemarkableAthleteFeature,
  HeroicWarriorFeature,
  SurvivorFeature,
  AdditionalFightingStyleFeature,
  ClassFeature,
} from '@/types/classFeature'

// ============================================
// Test Helpers
// ============================================

/** Create a feature with default trigger field */
function createFeature<T extends ClassFeature>(base: Omit<T, 'trigger'> & { trigger?: string }): T {
  return { trigger: 'passive', ...base } as T
}

/**
 * Create a Champion Fighter combatant at the given level.
 * Automatically includes the appropriate subclass features for that level.
 */
function createChampionCombatant(
  level: number,
  overrides: Partial<Character> = {}
): Combatant {
  const subclassFeatures: ClassFeature[] = []

  // Level 3: Improved Critical (19-20)
  if (level >= 3) {
    subclassFeatures.push(createFeature<ImprovedCriticalFeature>({
      id: 'improved-critical',
      name: 'Improved Critical',
      description: 'Crit on 19-20',
      level: 3,
      type: 'improved_critical',
      criticalRange: 19,
    }))
  }

  // Level 3: Remarkable Athlete
  if (level >= 3) {
    subclassFeatures.push(createFeature<RemarkableAthleteFeature>({
      id: 'remarkable-athlete',
      name: 'Remarkable Athlete',
      description: 'Advantage on Initiative and Athletics',
      level: 3,
      type: 'remarkable_athlete',
    }))
  }

  // Level 7: Additional Fighting Style
  if (level >= 7) {
    subclassFeatures.push(createFeature<AdditionalFightingStyleFeature>({
      id: 'additional-fighting-style',
      name: 'Additional Fighting Style',
      description: 'Gain another Fighting Style feat',
      level: 7,
      type: 'additional_fighting_style',
    }))
  }

  // Level 10: Heroic Warrior
  if (level >= 10) {
    subclassFeatures.push(createFeature<HeroicWarriorFeature>({
      id: 'heroic-warrior',
      name: 'Heroic Warrior',
      description: 'Gain Heroic Inspiration at start of turn if you don\'t have it',
      level: 10,
      type: 'heroic_warrior',
    }))
  }

  // Level 15: Superior Critical (18-20)
  if (level >= 15) {
    subclassFeatures.push(createFeature<ImprovedCriticalFeature>({
      id: 'superior-critical',
      name: 'Superior Critical',
      description: 'Crit on 18-20',
      level: 15,
      type: 'improved_critical',
      criticalRange: 18,
    }))
  }

  // Level 18: Survivor
  if (level >= 18) {
    subclassFeatures.push(createFeature<SurvivorFeature>({
      id: 'survivor',
      name: 'Survivor',
      description: 'Defy Death + Heroic Rally',
      level: 18,
      type: 'survivor',
    }))
  }

  const classData = {
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
  }
  const subclassData = {
    id: 'champion',
    name: 'Champion',
    description: 'Critical hit specialist',
    features: subclassFeatures,
  }

  const character = {
    id: 'test-champion',
    name: 'Test Champion',
    level,
    race: { id: 'human', name: 'Human', abilityScoreIncrease: {}, abilities: [], size: 'medium', speed: 30 },
    class: classData,
    subclass: subclassData,
    // Provide classes array so getCombatantClassFeatures uses the multiclass-aware path
    // which properly includes subclass features
    classes: [{
      classId: 'fighter',
      classData,
      subclass: subclassData,
      level,
    }],
    proficiencyBonus: Math.ceil(level / 4) + 1,
    abilityScores: { strength: 18, dexterity: 14, constitution: 16, intelligence: 10, wisdom: 12, charisma: 8 },
    equipment: { items: [] },
    fightingStyles: ['dueling'] as Character['fightingStyles'],
    ...overrides,
  } as unknown as Character

  return {
    id: 'combatant-champion',
    type: 'character',
    data: character,
    name: character.name,
    maxHp: 10 + (level - 1) * 9,
    currentHp: 10 + (level - 1) * 9,
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
    hitDiceRemaining: 0,
  } as Combatant
}

/** Create a combatant with no subclass features */
function createPlainFighterCombatant(): Combatant {
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
    proficiencyBonus: 3,
    abilityScores: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
    equipment: { items: [] },
  } as unknown as Character

  return {
    id: 'combatant-plain-fighter',
    type: 'character',
    data: character,
    name: character.name,
    maxHp: 44,
    currentHp: 44,
    temporaryHp: 0,
    position: { x: 5, y: 5 },
    initiative: 10,
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
    hitDiceRemaining: 0,
  } as Combatant
}

// ============================================
// Improved Critical Tests
// ============================================

describe('Champion: Improved Critical', () => {
  it('getCriticalRange returns 19 at level 3', () => {
    const combatant = createChampionCombatant(3)
    expect(getCriticalRange(combatant)).toBe(19)
  })

  it('getCriticalRange returns 19 at level 14 (before Superior Critical)', () => {
    const combatant = createChampionCombatant(14)
    expect(getCriticalRange(combatant)).toBe(19)
  })

  it('isCriticalHit returns true on 19 for level 3 Champion', () => {
    const combatant = createChampionCombatant(3)
    expect(isCriticalHit(combatant, 19)).toBe(true)
    expect(isCriticalHit(combatant, 20)).toBe(true)
  })

  it('isCriticalHit returns false on 18 for level 3 Champion', () => {
    const combatant = createChampionCombatant(3)
    expect(isCriticalHit(combatant, 18)).toBe(false)
  })

  it('getCriticalRange returns 20 for fighter without Champion subclass', () => {
    const combatant = createPlainFighterCombatant()
    expect(getCriticalRange(combatant)).toBe(20)
  })
})

// ============================================
// Superior Critical Tests
// ============================================

describe('Champion: Superior Critical', () => {
  it('getCriticalRange returns 18 at level 15', () => {
    const combatant = createChampionCombatant(15)
    expect(getCriticalRange(combatant)).toBe(18)
  })

  it('getCriticalRange returns 18 at level 20', () => {
    const combatant = createChampionCombatant(20)
    expect(getCriticalRange(combatant)).toBe(18)
  })

  it('isCriticalHit returns true on 18, 19, and 20 for level 15+ Champion', () => {
    const combatant = createChampionCombatant(15)
    expect(isCriticalHit(combatant, 18)).toBe(true)
    expect(isCriticalHit(combatant, 19)).toBe(true)
    expect(isCriticalHit(combatant, 20)).toBe(true)
  })

  it('isCriticalHit returns false on 17 for level 15+ Champion', () => {
    const combatant = createChampionCombatant(15)
    expect(isCriticalHit(combatant, 17)).toBe(false)
  })

  it('takes the lowest critical range when both Improved and Superior Critical are present', () => {
    // Level 15 Champion has both: 19 (Improved) and 18 (Superior)
    // getCriticalRange should return Math.min(19, 18) = 18
    const combatant = createChampionCombatant(15)
    expect(getCriticalRange(combatant)).toBe(18)
  })
})

// ============================================
// Remarkable Athlete Tests
// ============================================

describe('Champion: Remarkable Athlete', () => {
  it('hasRemarkableAthlete returns true for level 3+ Champion', () => {
    const combatant = createChampionCombatant(3)
    expect(hasRemarkableAthlete(combatant)).toBe(true)
  })

  it('hasRemarkableAthlete returns true for level 20 Champion', () => {
    const combatant = createChampionCombatant(20)
    expect(hasRemarkableAthlete(combatant)).toBe(true)
  })

  it('hasRemarkableAthlete returns false for level 2 Champion (below feature level)', () => {
    const combatant = createChampionCombatant(2)
    expect(hasRemarkableAthlete(combatant)).toBe(false)
  })

  it('hasRemarkableAthlete returns false for fighter without Champion subclass', () => {
    const combatant = createPlainFighterCombatant()
    expect(hasRemarkableAthlete(combatant)).toBe(false)
  })
})

// ============================================
// Additional Fighting Style Tests
// ============================================

describe('Champion: Additional Fighting Style', () => {
  it('is available at level 7', () => {
    const combatant = createChampionCombatant(7, {
      fightingStyles: ['dueling', 'defense'],
    } as Partial<Character>)

    const styles = getAllFightingStyles(combatant)
    expect(styles).toHaveLength(2)
    expect(hasFightingStyle(combatant, 'dueling')).toBe(true)
    expect(hasFightingStyle(combatant, 'defense')).toBe(true)
  })

  it('Champion with single fighting style at level 6 only has one style', () => {
    const combatant = createChampionCombatant(6, {
      fightingStyles: ['dueling'],
    } as Partial<Character>)

    const styles = getAllFightingStyles(combatant)
    expect(styles).toHaveLength(1)
  })

  it('returns empty array for fighter without fighting styles', () => {
    const combatant = createPlainFighterCombatant()
    const styles = getAllFightingStyles(combatant)
    expect(styles).toEqual([])
  })
})

// ============================================
// Heroic Warrior Tests
// ============================================

describe('Champion: Heroic Warrior', () => {
  it('hasHeroicWarrior returns true for level 10+ Champion', () => {
    const combatant = createChampionCombatant(10)
    expect(hasHeroicWarrior(combatant)).toBe(true)
  })

  it('hasHeroicWarrior returns true for level 20 Champion', () => {
    const combatant = createChampionCombatant(20)
    expect(hasHeroicWarrior(combatant)).toBe(true)
  })

  it('hasHeroicWarrior returns false for level 9 Champion', () => {
    const combatant = createChampionCombatant(9)
    expect(hasHeroicWarrior(combatant)).toBe(false)
  })

  it('hasHeroicWarrior returns false for fighter without Champion subclass', () => {
    const combatant = createPlainFighterCombatant()
    expect(hasHeroicWarrior(combatant)).toBe(false)
  })
})

// ============================================
// Survivor Tests
// ============================================

describe('Champion: Survivor', () => {
  describe('feature detection', () => {
    it('hasSurvivor returns true for level 18+ Champion', () => {
      const combatant = createChampionCombatant(18)
      expect(hasSurvivor(combatant)).toBe(true)
    })

    it('hasSurvivor returns true for level 20 Champion', () => {
      const combatant = createChampionCombatant(20)
      expect(hasSurvivor(combatant)).toBe(true)
    })

    it('hasSurvivor returns false for level 17 Champion', () => {
      const combatant = createChampionCombatant(17)
      expect(hasSurvivor(combatant)).toBe(false)
    })

    it('hasSurvivor returns false for fighter without Champion subclass', () => {
      const combatant = createPlainFighterCombatant()
      expect(hasSurvivor(combatant)).toBe(false)
    })
  })

  describe('Defy Death: rollDeathSave', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('rolls with advantage when combatant has Survivor', () => {
      // With advantage, rollD20 rolls twice and takes the higher
      // Mock two rolls: 8 and 15 → takes 15
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.35  // d20 = 8
        return 0.7  // d20 = 15
      })

      const combatant = createChampionCombatant(18)
      const result = rollDeathSave(combatant)

      // With advantage, should take the higher roll (15)
      expect(result.roll.naturalRoll).toBe(15)
      expect(result.success).toBe(true)
    })

    it('rolls without advantage when combatant lacks Survivor', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.45)  // d20 = 10
      const combatant = createChampionCombatant(15)  // No Survivor yet
      const result = rollDeathSave(combatant)

      // Only one roll, no advantage
      expect(result.roll.naturalRoll).toBe(10)
      expect(result.success).toBe(true)
    })

    it('rolls without advantage when no combatant provided', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.45)  // d20 = 10
      const result = rollDeathSave()
      expect(result.roll.naturalRoll).toBe(10)
      expect(result.success).toBe(true)
    })

    it('treats roll of 18 as critical success with Survivor', () => {
      // Mock advantage: two rolls, both give 18
      vi.spyOn(Math, 'random').mockReturnValue(0.85)  // d20 = 18
      const combatant = createChampionCombatant(18)
      const result = rollDeathSave(combatant)

      expect(result.roll.naturalRoll).toBe(18)
      expect(result.criticalSuccess).toBe(true)
      expect(result.success).toBe(true)
    })

    it('treats roll of 19 as critical success with Survivor', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)  // d20 = 19
      const combatant = createChampionCombatant(18)
      const result = rollDeathSave(combatant)

      expect(result.roll.naturalRoll).toBe(19)
      expect(result.criticalSuccess).toBe(true)
      expect(result.success).toBe(true)
    })

    it('treats roll of 20 as critical success with Survivor', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.95)  // d20 = 20
      const combatant = createChampionCombatant(18)
      const result = rollDeathSave(combatant)

      expect(result.roll.naturalRoll).toBe(20)
      expect(result.criticalSuccess).toBe(true)
      expect(result.success).toBe(true)
    })

    it('does NOT treat 18 as critical success without Survivor', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.85)  // d20 = 18
      const combatant = createChampionCombatant(15)  // No Survivor
      const result = rollDeathSave(combatant)

      expect(result.roll.naturalRoll).toBe(18)
      expect(result.criticalSuccess).toBe(false)
      expect(result.success).toBe(true)  // 18 >= 10, still a normal success
    })

    it('natural 20 is critical success even without Survivor', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.95)  // d20 = 20
      const combatant = createChampionCombatant(15)
      const result = rollDeathSave(combatant)

      expect(result.criticalSuccess).toBe(true)
    })

    it('natural 1 is critical failure without Survivor', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // d20 = 1
      const result = rollDeathSave()

      expect(result.roll.naturalRoll).toBe(1)
      expect(result.criticalFailure).toBe(true)
      expect(result.success).toBe(false)
    })

    it('roll of 9 is a failure', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.4)  // d20 = 9
      const result = rollDeathSave()

      expect(result.roll.naturalRoll).toBe(9)
      expect(result.success).toBe(false)
      expect(result.criticalSuccess).toBe(false)
      expect(result.criticalFailure).toBe(false)
    })

    it('roll of 10 is a success', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.45)  // d20 = 10
      const result = rollDeathSave()

      expect(result.roll.naturalRoll).toBe(10)
      expect(result.success).toBe(true)
    })
  })
})

// ============================================
// Full Champion Progression Test
// ============================================

describe('Champion: Level Progression', () => {
  it('features unlock at correct levels', () => {
    // Level 2: No Champion features yet
    const level2 = createChampionCombatant(2)
    expect(getCriticalRange(level2)).toBe(20)
    expect(hasRemarkableAthlete(level2)).toBe(false)
    expect(hasHeroicWarrior(level2)).toBe(false)
    expect(hasSurvivor(level2)).toBe(false)

    // Level 3: Improved Critical + Remarkable Athlete
    const level3 = createChampionCombatant(3)
    expect(getCriticalRange(level3)).toBe(19)
    expect(hasRemarkableAthlete(level3)).toBe(true)
    expect(hasHeroicWarrior(level3)).toBe(false)
    expect(hasSurvivor(level3)).toBe(false)

    // Level 10: + Heroic Warrior
    const level10 = createChampionCombatant(10)
    expect(getCriticalRange(level10)).toBe(19)
    expect(hasRemarkableAthlete(level10)).toBe(true)
    expect(hasHeroicWarrior(level10)).toBe(true)
    expect(hasSurvivor(level10)).toBe(false)

    // Level 15: + Superior Critical
    const level15 = createChampionCombatant(15)
    expect(getCriticalRange(level15)).toBe(18)
    expect(hasRemarkableAthlete(level15)).toBe(true)
    expect(hasHeroicWarrior(level15)).toBe(true)
    expect(hasSurvivor(level15)).toBe(false)

    // Level 18: + Survivor
    const level18 = createChampionCombatant(18)
    expect(getCriticalRange(level18)).toBe(18)
    expect(hasRemarkableAthlete(level18)).toBe(true)
    expect(hasHeroicWarrior(level18)).toBe(true)
    expect(hasSurvivor(level18)).toBe(true)
  })
})
