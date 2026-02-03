import type { Grid, GridCell, Position } from '@/types'

/**
 * Line of Sight / Cover System
 * Uses Bresenham's line algorithm to determine if there's a clear line
 * between two positions for ranged attacks.
 */

/**
 * Check if a cell blocks line of sight
 */
export function blocksLineOfSight(cell: GridCell): boolean {
  return cell.obstacle?.blocksLineOfSight === true
}

/**
 * Get all cells along a line between two positions using Bresenham's algorithm
 * Returns array of positions from start to end (exclusive of endpoints)
 */
export function getLineBetween(from: Position, to: Position): Position[] {
  const positions: Position[] = []

  let x0 = from.x
  let y0 = from.y
  const x1 = to.x
  const y1 = to.y

  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1

  let err = dx - dy

  while (true) {
    // Don't include start or end points
    if ((x0 !== from.x || y0 !== from.y) && (x0 !== to.x || y0 !== to.y)) {
      positions.push({ x: x0, y: y0 })
    }

    if (x0 === x1 && y0 === y1) break

    const e2 = 2 * err

    if (e2 > -dy) {
      err -= dy
      x0 += sx
    }

    if (e2 < dx) {
      err += dx
      y0 += sy
    }
  }

  return positions
}

/**
 * Check if there's a clear line of sight between two positions
 * Returns true if the line is clear, false if blocked by an obstacle
 */
export function hasLineOfSight(
  grid: Grid,
  from: Position,
  to: Position
): boolean {
  // Adjacent cells always have line of sight (melee range)
  const dx = Math.abs(to.x - from.x)
  const dy = Math.abs(to.y - from.y)
  if (dx <= 1 && dy <= 1) return true

  // Get all cells along the line
  const lineCells = getLineBetween(from, to)

  // Check each cell for line-of-sight blocking obstacles
  for (const pos of lineCells) {
    const cell = grid.cells[pos.y]?.[pos.x]
    if (cell && blocksLineOfSight(cell)) {
      return false
    }
  }

  return true
}

/**
 * Check if a ranged attack can hit a target
 * Combines range check with line of sight check
 */
export function canTargetWithRangedAttack(
  grid: Grid,
  attacker: Position,
  target: Position,
  range: number
): { canTarget: boolean; blockedBy?: Position } {
  // Calculate distance (using simple Chebyshev for range)
  const dx = Math.abs(target.x - attacker.x)
  const dy = Math.abs(target.y - attacker.y)
  const distance = Math.max(dx, dy) * 5 // Convert to feet

  // Check range
  if (distance > range) {
    return { canTarget: false }
  }

  // Check line of sight
  const lineCells = getLineBetween(attacker, target)

  for (const pos of lineCells) {
    const cell = grid.cells[pos.y]?.[pos.x]
    if (cell && blocksLineOfSight(cell)) {
      return { canTarget: false, blockedBy: pos }
    }
  }

  return { canTarget: true }
}

/**
 * Get all positions that would be hit along a line (for line spells)
 * Stops at the first blocking obstacle
 */
export function getLineTargets(
  grid: Grid,
  from: Position,
  direction: Position,
  maxRange: number
): Position[] {
  const targets: Position[] = []

  // Normalize direction to unit vector
  const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y)
  if (magnitude === 0) return targets

  // Calculate end point
  const maxSquares = Math.floor(maxRange / 5)
  const endX = from.x + Math.round((direction.x / magnitude) * maxSquares)
  const endY = from.y + Math.round((direction.y / magnitude) * maxSquares)

  const lineCells = getLineBetween(from, { x: endX, y: endY })

  for (const pos of lineCells) {
    const cell = grid.cells[pos.y]?.[pos.x]
    if (!cell) break

    // Stop at blocking obstacles
    if (blocksLineOfSight(cell)) break

    targets.push(pos)
  }

  return targets
}
