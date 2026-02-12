import { describe, it, expect } from 'vitest'
import {
  blocksLineOfSight,
  getLineBetween,
  hasLineOfSight,
  canTargetWithRangedAttack,
  getLineTargets,
} from '@/lib/lineOfSight'
import type { Grid, GridCell, Position } from '@/types'

// ============================================
// Test Helpers
// ============================================

function makeCell(x: number, y: number, obstacle?: { blocksLineOfSight: boolean }): GridCell {
  return {
    x,
    y,
    elevation: 0,
    ...(obstacle ? { obstacle: { id: 'wall', name: 'Wall', blocksLineOfSight: obstacle.blocksLineOfSight, blocksMovement: true } } : {}),
  } as GridCell
}

function makeGrid(width: number, height: number, walls: Position[] = []): Grid {
  const wallSet = new Set(walls.map(w => `${w.x},${w.y}`))
  const cells: GridCell[][] = []
  for (let y = 0; y < height; y++) {
    cells[y] = []
    for (let x = 0; x < width; x++) {
      cells[y][x] = makeCell(x, y, wallSet.has(`${x},${y}`) ? { blocksLineOfSight: true } : undefined)
    }
  }
  return { width, height, cells }
}

// ============================================
// blocksLineOfSight
// ============================================

describe('blocksLineOfSight', () => {
  it('returns false for cell with no obstacle', () => {
    expect(blocksLineOfSight(makeCell(0, 0))).toBe(false)
  })

  it('returns true for cell with LOS-blocking obstacle', () => {
    expect(blocksLineOfSight(makeCell(0, 0, { blocksLineOfSight: true }))).toBe(true)
  })

  it('returns false for cell with non-blocking obstacle', () => {
    expect(blocksLineOfSight(makeCell(0, 0, { blocksLineOfSight: false }))).toBe(false)
  })
})

// ============================================
// getLineBetween
// ============================================

describe('getLineBetween', () => {
  it('returns empty array for adjacent cells', () => {
    expect(getLineBetween({ x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([])
  })

  it('returns empty array for same cell', () => {
    expect(getLineBetween({ x: 3, y: 3 }, { x: 3, y: 3 })).toEqual([])
  })

  it('returns intermediate cells on a horizontal line', () => {
    const result = getLineBetween({ x: 0, y: 0 }, { x: 4, y: 0 })
    expect(result).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ])
  })

  it('returns intermediate cells on a vertical line', () => {
    const result = getLineBetween({ x: 0, y: 0 }, { x: 0, y: 3 })
    expect(result).toEqual([
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ])
  })

  it('returns intermediate cells on a diagonal line', () => {
    const result = getLineBetween({ x: 0, y: 0 }, { x: 3, y: 3 })
    expect(result).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ])
  })

  it('excludes both start and end positions', () => {
    const from = { x: 2, y: 2 }
    const to = { x: 5, y: 2 }
    const result = getLineBetween(from, to)
    expect(result.find(p => p.x === from.x && p.y === from.y)).toBeUndefined()
    expect(result.find(p => p.x === to.x && p.y === to.y)).toBeUndefined()
  })

  it('works in negative direction', () => {
    const result = getLineBetween({ x: 4, y: 0 }, { x: 0, y: 0 })
    expect(result).toEqual([
      { x: 3, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
    ])
  })
})

// ============================================
// hasLineOfSight
// ============================================

describe('hasLineOfSight', () => {
  it('returns true for adjacent cells (melee range always has LOS)', () => {
    const grid = makeGrid(10, 10)
    expect(hasLineOfSight(grid, { x: 3, y: 3 }, { x: 4, y: 3 })).toBe(true)
    expect(hasLineOfSight(grid, { x: 3, y: 3 }, { x: 4, y: 4 })).toBe(true) // diagonal
  })

  it('returns true for adjacent cells even with fog on endpoint', () => {
    const grid = makeGrid(10, 10)
    const fogCells = new Set(['4,3'])
    // Adjacent = melee range, always LOS regardless of fog
    expect(hasLineOfSight(grid, { x: 3, y: 3 }, { x: 4, y: 3 }, fogCells)).toBe(true)
  })

  it('returns true for clear line of sight over distance', () => {
    const grid = makeGrid(10, 10)
    expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 5, y: 0 })).toBe(true)
    expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 5, y: 5 })).toBe(true)
  })

  it('returns false when a wall blocks the line', () => {
    const grid = makeGrid(10, 10, [{ x: 3, y: 0 }])
    expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 5, y: 0 })).toBe(false)
  })

  it('returns false when fog is on the FROM endpoint (non-adjacent)', () => {
    const grid = makeGrid(10, 10)
    const fogCells = new Set(['0,0'])
    expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 5, y: 0 }, fogCells)).toBe(false)
  })

  it('returns false when fog is on the TO endpoint (non-adjacent)', () => {
    const grid = makeGrid(10, 10)
    const fogCells = new Set(['5,0'])
    expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 5, y: 0 }, fogCells)).toBe(false)
  })

  it('returns false when fog is on an intermediate cell', () => {
    const grid = makeGrid(10, 10)
    const fogCells = new Set(['3,0'])
    expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 5, y: 0 }, fogCells)).toBe(false)
  })

  it('returns true when fog is present but not on the line', () => {
    const grid = makeGrid(10, 10)
    const fogCells = new Set(['0,5', '1,5', '2,5']) // fog is far from the line
    expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 5, y: 0 }, fogCells)).toBe(true)
  })

  it('works without fogCells parameter', () => {
    const grid = makeGrid(10, 10)
    expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 5, y: 0 })).toBe(true)
  })
})

// ============================================
// canTargetWithRangedAttack
// ============================================

describe('canTargetWithRangedAttack', () => {
  it('returns canTarget true for in-range clear shot', () => {
    const grid = makeGrid(10, 10)
    const result = canTargetWithRangedAttack(grid, { x: 0, y: 0 }, { x: 4, y: 0 }, 30)
    expect(result.canTarget).toBe(true)
  })

  it('returns canTarget false when target is out of range', () => {
    const grid = makeGrid(20, 20)
    // distance: 7 squares * 5ft = 35ft (straight horizontal), range = 30
    const result = canTargetWithRangedAttack(grid, { x: 0, y: 0 }, { x: 7, y: 0 }, 30)
    expect(result.canTarget).toBe(false)
    expect(result.blockedBy).toBeUndefined()
  })

  it('returns canTarget false with blockedBy when wall is in the way', () => {
    const grid = makeGrid(10, 10, [{ x: 3, y: 0 }])
    const result = canTargetWithRangedAttack(grid, { x: 0, y: 0 }, { x: 5, y: 0 }, 60)
    expect(result.canTarget).toBe(false)
    expect(result.blockedBy).toEqual({ x: 3, y: 0 })
  })

  it('returns canTarget false when attacker is in fog (non-adjacent)', () => {
    const grid = makeGrid(10, 10)
    const fogCells = new Set(['0,0'])
    const result = canTargetWithRangedAttack(grid, { x: 0, y: 0 }, { x: 5, y: 0 }, 60, fogCells)
    expect(result.canTarget).toBe(false)
    expect(result.blockedBy).toEqual({ x: 0, y: 0 })
  })

  it('returns canTarget false when target is in fog (non-adjacent)', () => {
    const grid = makeGrid(10, 10)
    const fogCells = new Set(['5,0'])
    const result = canTargetWithRangedAttack(grid, { x: 0, y: 0 }, { x: 5, y: 0 }, 60, fogCells)
    expect(result.canTarget).toBe(false)
    expect(result.blockedBy).toEqual({ x: 5, y: 0 })
  })

  it('returns canTarget false when fog is between attacker and target', () => {
    const grid = makeGrid(10, 10)
    const fogCells = new Set(['2,0'])
    const result = canTargetWithRangedAttack(grid, { x: 0, y: 0 }, { x: 5, y: 0 }, 60, fogCells)
    expect(result.canTarget).toBe(false)
    expect(result.blockedBy).toEqual({ x: 2, y: 0 })
  })

  it('checks range before LOS (out of range returns no blockedBy)', () => {
    const grid = makeGrid(20, 20, [{ x: 3, y: 0 }])
    // Out of range AND wall — range check should come first
    const result = canTargetWithRangedAttack(grid, { x: 0, y: 0 }, { x: 15, y: 0 }, 30)
    expect(result.canTarget).toBe(false)
    expect(result.blockedBy).toBeUndefined() // range fail, not LOS fail
  })

  it('uses 5-10 diagonal distance rule', () => {
    const grid = makeGrid(10, 10)
    // 3 diagonal squares: 5+10+5 = 20ft
    const result20 = canTargetWithRangedAttack(grid, { x: 0, y: 0 }, { x: 3, y: 3 }, 20)
    expect(result20.canTarget).toBe(true)

    // 4 diagonal: 5+10+5+10 = 30ft
    const result25 = canTargetWithRangedAttack(grid, { x: 0, y: 0 }, { x: 4, y: 4 }, 25)
    expect(result25.canTarget).toBe(false) // 30ft > 25ft range
  })

  it('works without fogCells parameter', () => {
    const grid = makeGrid(10, 10)
    const result = canTargetWithRangedAttack(grid, { x: 0, y: 0 }, { x: 3, y: 0 }, 30)
    expect(result.canTarget).toBe(true)
  })
})

// ============================================
// getLineTargets (line spells)
// ============================================

describe('getLineTargets', () => {
  it('returns cells along a line in the given direction', () => {
    const grid = makeGrid(10, 10)
    const targets = getLineTargets(grid, { x: 0, y: 5 }, { x: 1, y: 0 }, 25)
    // 25ft / 5 = 5 squares range, direction is +x
    expect(targets.length).toBeGreaterThan(0)
    expect(targets.every(p => p.y === 5)).toBe(true) // all on same row
    expect(targets.every(p => p.x > 0)).toBe(true) // all ahead of origin
  })

  it('stops at a wall', () => {
    const grid = makeGrid(10, 10, [{ x: 3, y: 5 }])
    const targets = getLineTargets(grid, { x: 0, y: 5 }, { x: 1, y: 0 }, 50)
    // Should stop before the wall at x=3
    expect(targets.every(p => p.x < 3)).toBe(true)
  })

  it('returns empty for zero direction', () => {
    const grid = makeGrid(10, 10)
    const targets = getLineTargets(grid, { x: 5, y: 5 }, { x: 0, y: 0 }, 30)
    expect(targets).toEqual([])
  })

  it('stops at grid boundary', () => {
    const grid = makeGrid(5, 5)
    const targets = getLineTargets(grid, { x: 0, y: 2 }, { x: 1, y: 0 }, 100)
    // Grid is only 5 wide, should not go out of bounds
    expect(targets.every(p => p.x < 5)).toBe(true)
  })
})
