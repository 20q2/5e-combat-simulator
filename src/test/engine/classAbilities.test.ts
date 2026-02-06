import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getArcheryBonus,
  getDuelingBonus,
  getDefenseBonus,
  isWeaponValidForSneakAttack,
  getSneakAttackDice,
  getMaxAttacksPerAction,
  getCriticalRange,
  isCriticalHit,
} from '@/engine/classAbilities'
import type { Combatant, Character, Weapon } from '@/types'
import type { FightingStyleFeature, SneakAttackFeature, ExtraAttackFeature, ImprovedCriticalFeature, ClassFeature } from '@/types/classFeature'

// Helper to create a minimal character combatant for testing
// Uses type assertions since tests don't need full type compliance
function createCharacterCombatant(
  overrides: Partial<Character> = {},
  features: ClassFeature[] = []
): Combatant {
  const character = {
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
      weaponProficiencies: [],
      skillChoices: { count: 2, options: [] },
      numSkillChoices: 2,
      features: features,
    },
    abilityScores: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
    equipment: { items: [] },
    ...overrides,
  } as unknown as Character

  return {
    id: 'combatant-1',
    type: 'character',
    data: character,
    name: character.name,
    maxHp: 44,
    currentHp: 44,
    position: { x: 0, y: 0 },
    initiative: 0,
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
  } as unknown as Combatant
}

// Helper to create a weapon
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
    ...overrides,
  } as Weapon
}

// Helper to create a feature with required trigger field
function createFeature<T extends ClassFeature>(base: Omit<T, 'trigger'> & { trigger?: string }): T {
  return { trigger: 'passive', ...base } as T
}

describe('classAbilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Fighting Style bonuses', () => {
    describe('getArcheryBonus', () => {
      it('returns 0 when combatant has no fighting style', () => {
        const combatant = createCharacterCombatant()
        expect(getArcheryBonus(combatant)).toBe(0)
      })

      it('returns 2 when combatant has archery style', () => {
        const archeryStyle = createFeature<FightingStyleFeature>({
          id: 'fighting-style-archery',
          name: 'Fighting Style: Archery',
          description: '+2 to ranged attack rolls',
          level: 1,
          type: 'fighting_style',
          style: 'archery',
        })
        const combatant = createCharacterCombatant({}, [archeryStyle])
        expect(getArcheryBonus(combatant)).toBe(2)
      })

      it('returns 0 when combatant has different fighting style', () => {
        const duelingStyle = createFeature<FightingStyleFeature>({
          id: 'fighting-style-dueling',
          name: 'Fighting Style: Dueling',
          description: '+2 damage with one-handed melee',
          level: 1,
          type: 'fighting_style',
          style: 'dueling',
        })
        const combatant = createCharacterCombatant({}, [duelingStyle])
        expect(getArcheryBonus(combatant)).toBe(0)
      })
    })

    describe('getDuelingBonus', () => {
      it('returns 0 when combatant has no fighting style', () => {
        const combatant = createCharacterCombatant()
        const weapon = createWeapon()
        expect(getDuelingBonus(combatant, weapon)).toBe(0)
      })

      it('returns 2 with dueling style and one-handed melee weapon', () => {
        const duelingStyle = createFeature<FightingStyleFeature>({
          id: 'fighting-style-dueling',
          name: 'Fighting Style: Dueling',
          description: '+2 damage',
          level: 1,
          type: 'fighting_style',
          style: 'dueling',
        })
        const combatant = createCharacterCombatant({}, [duelingStyle])
        const weapon = createWeapon({ type: 'melee', properties: [] })
        expect(getDuelingBonus(combatant, weapon)).toBe(2)
      })

      it('returns 0 with dueling style but two-handed weapon', () => {
        const duelingStyle = createFeature<FightingStyleFeature>({
          id: 'fighting-style-dueling',
          name: 'Fighting Style: Dueling',
          description: '+2 damage',
          level: 1,
          type: 'fighting_style',
          style: 'dueling',
        })
        const combatant = createCharacterCombatant({}, [duelingStyle])
        const weapon = createWeapon({ properties: ['two-handed'] })
        expect(getDuelingBonus(combatant, weapon)).toBe(0)
      })

      it('returns 0 with dueling style but ranged weapon', () => {
        const duelingStyle = createFeature<FightingStyleFeature>({
          id: 'fighting-style-dueling',
          name: 'Fighting Style: Dueling',
          description: '+2 damage',
          level: 1,
          type: 'fighting_style',
          style: 'dueling',
        })
        const combatant = createCharacterCombatant({}, [duelingStyle])
        const weapon = createWeapon({ type: 'ranged' })
        expect(getDuelingBonus(combatant, weapon)).toBe(0)
      })
    })

    describe('getDefenseBonus', () => {
      it('returns 0 when combatant has no fighting style', () => {
        const combatant = createCharacterCombatant()
        expect(getDefenseBonus(combatant)).toBe(0)
      })

      it('returns 1 when wearing armor with defense style', () => {
        const defenseStyle = createFeature<FightingStyleFeature>({
          id: 'fighting-style-defense',
          name: 'Fighting Style: Defense',
          description: '+1 AC when wearing armor',
          level: 1,
          type: 'fighting_style',
          style: 'defense',
        })
        const combatant = createCharacterCombatant({
          equipment: { armor: { id: 'chain-mail', name: 'Chain Mail', category: 'heavy', baseAC: 16, weight: 55 }, items: [] } as unknown as Character['equipment'],
        }, [defenseStyle])
        expect(getDefenseBonus(combatant)).toBe(1)
      })

      it('returns 0 with defense style but no armor', () => {
        const defenseStyle = createFeature<FightingStyleFeature>({
          id: 'fighting-style-defense',
          name: 'Fighting Style: Defense',
          description: '+1 AC when wearing armor',
          level: 1,
          type: 'fighting_style',
          style: 'defense',
        })
        const combatant = createCharacterCombatant({ equipment: { items: [] } as Character['equipment'] }, [defenseStyle])
        expect(getDefenseBonus(combatant)).toBe(0)
      })
    })
  })

  describe('Sneak Attack', () => {
    describe('isWeaponValidForSneakAttack', () => {
      it('returns true for finesse weapons', () => {
        const weapon = createWeapon({ properties: ['finesse'] })
        expect(isWeaponValidForSneakAttack(weapon)).toBe(true)
      })

      it('returns true for ranged weapons', () => {
        const weapon = createWeapon({ type: 'ranged' })
        expect(isWeaponValidForSneakAttack(weapon)).toBe(true)
      })

      it('returns false for non-finesse melee weapons', () => {
        const weapon = createWeapon({ type: 'melee', properties: [] })
        expect(isWeaponValidForSneakAttack(weapon)).toBe(false)
      })

      it('returns false for undefined weapon', () => {
        expect(isWeaponValidForSneakAttack(undefined)).toBe(false)
      })
    })

    describe('getSneakAttackDice', () => {
      it('returns 0 when combatant has no sneak attack', () => {
        const combatant = createCharacterCombatant()
        expect(getSneakAttackDice(combatant)).toBe('0')
      })

      it('returns scaled dice based on level', () => {
        const sneakAttack = createFeature<SneakAttackFeature>({
          id: 'sneak-attack',
          name: 'Sneak Attack',
          description: 'Extra damage',
          level: 1,
          type: 'sneak_attack',
          trigger: 'on_attack_roll',
          baseDice: '1d6',
          diceScaling: {
            1: '1d6',
            3: '2d6',
            5: '3d6',
            7: '4d6',
          },
        })

        // Level 1 rogue
        const level1 = createCharacterCombatant({ level: 1 }, [sneakAttack])
        expect(getSneakAttackDice(level1)).toBe('1d6')

        // Level 5 rogue
        const level5 = createCharacterCombatant({ level: 5 }, [sneakAttack])
        expect(getSneakAttackDice(level5)).toBe('3d6')

        // Level 6 rogue (still 3d6, hasn't reached level 7)
        const level6 = createCharacterCombatant({ level: 6 }, [sneakAttack])
        expect(getSneakAttackDice(level6)).toBe('3d6')
      })
    })
  })

  describe('Extra Attack', () => {
    describe('getMaxAttacksPerAction', () => {
      it('returns 1 when combatant has no extra attack', () => {
        const combatant = createCharacterCombatant()
        expect(getMaxAttacksPerAction(combatant)).toBe(1)
      })

      it('returns 2 with extra attack feature', () => {
        const extraAttack = createFeature<ExtraAttackFeature>({
          id: 'extra-attack',
          name: 'Extra Attack',
          description: 'Attack twice',
          level: 5,
          type: 'extra_attack',
          attackCount: 2,
        })
        const combatant = createCharacterCombatant({ level: 5 }, [extraAttack])
        expect(getMaxAttacksPerAction(combatant)).toBe(2)
      })

      it('returns highest attack count when multiple features', () => {
        const extraAttack1 = createFeature<ExtraAttackFeature>({
          id: 'extra-attack-1',
          name: 'Extra Attack',
          description: 'Attack twice',
          level: 5,
          type: 'extra_attack',
          attackCount: 2,
        })
        const extraAttack2 = createFeature<ExtraAttackFeature>({
          id: 'extra-attack-2',
          name: 'Extra Attack (2)',
          description: 'Attack three times',
          level: 11,
          type: 'extra_attack',
          attackCount: 3,
        })
        const combatant = createCharacterCombatant({ level: 11 }, [extraAttack1, extraAttack2])
        expect(getMaxAttacksPerAction(combatant)).toBe(3)
      })
    })
  })

  describe('Improved Critical', () => {
    describe('getCriticalRange', () => {
      it('returns 20 when combatant has no improved critical', () => {
        const combatant = createCharacterCombatant()
        expect(getCriticalRange(combatant)).toBe(20)
      })

      it('returns 19 with improved critical feature', () => {
        const improvedCrit = createFeature<ImprovedCriticalFeature>({
          id: 'improved-critical',
          name: 'Improved Critical',
          description: 'Crit on 19-20',
          level: 3,
          type: 'improved_critical',
          criticalRange: 19,
        })
        const combatant = createCharacterCombatant({ level: 3 }, [improvedCrit])
        expect(getCriticalRange(combatant)).toBe(19)
      })
    })

    describe('isCriticalHit', () => {
      it('returns true on natural 20 for normal combatant', () => {
        const combatant = createCharacterCombatant()
        expect(isCriticalHit(combatant, 20)).toBe(true)
        expect(isCriticalHit(combatant, 19)).toBe(false)
      })

      it('returns true on 19+ with improved critical', () => {
        const improvedCrit = createFeature<ImprovedCriticalFeature>({
          id: 'improved-critical',
          name: 'Improved Critical',
          description: 'Crit on 19-20',
          level: 3,
          type: 'improved_critical',
          criticalRange: 19,
        })
        const combatant = createCharacterCombatant({ level: 3 }, [improvedCrit])
        expect(isCriticalHit(combatant, 20)).toBe(true)
        expect(isCriticalHit(combatant, 19)).toBe(true)
        expect(isCriticalHit(combatant, 18)).toBe(false)
      })
    })
  })
})
