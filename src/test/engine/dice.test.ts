import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  rollDie,
  rollDice,
  parseDiceExpression,
  roll,
  rollD20,
  rollDamage,
  rollSavingThrow,
} from '@/engine/dice'

describe('dice engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('rollDie', () => {
    it('returns values within valid range for d20', () => {
      for (let i = 0; i < 100; i++) {
        const result = rollDie(20)
        expect(result).toBeGreaterThanOrEqual(1)
        expect(result).toBeLessThanOrEqual(20)
      }
    })

    it('returns values within valid range for d6', () => {
      for (let i = 0; i < 100; i++) {
        const result = rollDie(6)
        expect(result).toBeGreaterThanOrEqual(1)
        expect(result).toBeLessThanOrEqual(6)
      }
    })

    it('returns deterministic value when Math.random is mocked', () => {
      // Mock to return 0.5, which for d20 = floor(0.5 * 20) + 1 = 11
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      expect(rollDie(20)).toBe(11)

      // For d6: floor(0.5 * 6) + 1 = 4
      expect(rollDie(6)).toBe(4)
    })

    it('returns 1 when Math.random returns 0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      expect(rollDie(20)).toBe(1)
    })

    it('returns max value when Math.random returns just under 1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99999)
      expect(rollDie(20)).toBe(20)
    })
  })

  describe('rollDice', () => {
    it('returns correct number of dice', () => {
      const result = rollDice(4, 6)
      expect(result).toHaveLength(4)
    })

    it('returns array of valid values', () => {
      const result = rollDice(3, 8)
      result.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(1)
        expect(value).toBeLessThanOrEqual(8)
      })
    })
  })

  describe('parseDiceExpression', () => {
    it('parses basic expression "2d6"', () => {
      const result = parseDiceExpression('2d6')
      expect(result).toEqual({ count: 2, sides: 6, modifier: 0 })
    })

    it('parses expression with positive modifier "1d20+5"', () => {
      const result = parseDiceExpression('1d20+5')
      expect(result).toEqual({ count: 1, sides: 20, modifier: 5 })
    })

    it('parses expression with negative modifier "1d8-2"', () => {
      const result = parseDiceExpression('1d8-2')
      expect(result).toEqual({ count: 1, sides: 8, modifier: -2 })
    })

    it('parses single die without count "d20"', () => {
      const result = parseDiceExpression('d20')
      expect(result).toEqual({ count: 1, sides: 20, modifier: 0 })
    })

    it('handles uppercase "2D6+3"', () => {
      const result = parseDiceExpression('2D6+3')
      expect(result).toEqual({ count: 2, sides: 6, modifier: 3 })
    })

    it('returns null for invalid expression', () => {
      expect(parseDiceExpression('invalid')).toBeNull()
      expect(parseDiceExpression('2d')).toBeNull()
      expect(parseDiceExpression('d')).toBeNull()
    })
  })

  describe('roll', () => {
    it('returns correct structure', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const result = roll('2d6+3')

      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('rolls')
      expect(result).toHaveProperty('modifier')
      expect(result).toHaveProperty('expression')
      expect(result).toHaveProperty('breakdown')
    })

    it('calculates total correctly', () => {
      // Mock returns 0.5, so d6 = floor(0.5 * 6) + 1 = 4
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const result = roll('2d6+3')

      expect(result.rolls).toEqual([4, 4])
      expect(result.modifier).toBe(3)
      expect(result.total).toBe(11) // 4 + 4 + 3
    })

    it('throws on invalid expression', () => {
      expect(() => roll('invalid')).toThrow('Invalid dice expression')
    })
  })

  describe('rollD20', () => {
    it('handles normal roll', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const result = rollD20(5, 'normal')

      expect(result.naturalRoll).toBe(11)
      expect(result.total).toBe(16) // 11 + 5
      expect(result.isNatural20).toBe(false)
      expect(result.isNatural1).toBe(false)
      expect(result.advantage).toBe('normal')
    })

    it('detects natural 20', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.95) // d20 = 20
      const result = rollD20(5)

      expect(result.naturalRoll).toBe(20)
      expect(result.isNatural20).toBe(true)
      expect(result.isNatural1).toBe(false)
    })

    it('detects natural 1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // d20 = 1
      const result = rollD20(5)

      expect(result.naturalRoll).toBe(1)
      expect(result.isNatural1).toBe(true)
      expect(result.isNatural20).toBe(false)
    })

    it('takes higher roll with advantage', () => {
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        // First roll: 5, Second roll: 15
        return callCount++ === 0 ? 0.2 : 0.7
      })

      const result = rollD20(0, 'advantage')
      expect(result.naturalRoll).toBe(15)
      expect(result.rolls).toContain(5)
      expect(result.rolls).toContain(15)
    })

    it('takes lower roll with disadvantage', () => {
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        // First roll: 15, Second roll: 5
        return callCount++ === 0 ? 0.7 : 0.2
      })

      const result = rollD20(0, 'disadvantage')
      expect(result.naturalRoll).toBe(5)
    })
  })

  describe('rollDamage', () => {
    it('rolls normal damage', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // d8 = 5
      const result = rollDamage('1d8+3')

      expect(result.rolls).toHaveLength(1)
      expect(result.total).toBe(8) // 5 + 3
    })

    it('doubles dice on critical hit', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const result = rollDamage('1d8+3', true)

      expect(result.rolls).toHaveLength(2) // Doubled dice
      expect(result.total).toBe(13) // 5 + 5 + 3
      expect(result.breakdown).toContain('CRIT!')
    })

    it('handles multi-die damage with crit', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const result = rollDamage('2d6+4', true)

      expect(result.rolls).toHaveLength(4) // 2 * 2 = 4 dice
      expect(result.total).toBe(20) // 4*4 + 4 = 20
    })
  })

  describe('rollSavingThrow', () => {
    it('succeeds when total meets DC', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // d20 = 11
      const result = rollSavingThrow(4, 15) // 11 + 4 = 15

      expect(result.success).toBe(true)
      expect(result.dc).toBe(15)
    })

    it('fails when total is below DC', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // d20 = 11
      const result = rollSavingThrow(3, 15) // 11 + 3 = 14

      expect(result.success).toBe(false)
    })

    it('respects advantage/disadvantage', () => {
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        return callCount++ === 0 ? 0.2 : 0.9 // 5 and 19
      })

      const result = rollSavingThrow(0, 15, 'advantage')
      expect(result.roll.naturalRoll).toBe(19)
      expect(result.success).toBe(true)
    })
  })
})
