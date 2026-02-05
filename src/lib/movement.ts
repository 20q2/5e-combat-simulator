import type { Position } from '@/types'
import { getDistanceBetweenPositions } from './distance'

/**
 * Calculate movement distance using the 5-10 diagonal rule (DMG variant).
 * Re-exports the canonical implementation from distance.ts for backwards compatibility.
 */
export function calculateMovementDistance(from: Position, to: Position): number {
  return getDistanceBetweenPositions(from, to)
}

/**
 * Calculate the optimal path from one position to another.
 * Returns an array of positions representing each step of the path.
 * Uses diagonal movement when beneficial (minimizes distance).
 */
export function calculateMovementPath(from: Position, to: Position): Position[] {
  const path: Position[] = [from]

  let currentX = from.x
  let currentY = from.y

  while (currentX !== to.x || currentY !== to.y) {
    const dx = to.x - currentX
    const dy = to.y - currentY

    // Determine next step - prefer diagonal when both x and y need to change
    let nextX = currentX
    let nextY = currentY

    if (dx !== 0 && dy !== 0) {
      // Move diagonally
      nextX += dx > 0 ? 1 : -1
      nextY += dy > 0 ? 1 : -1
    } else if (dx !== 0) {
      // Move horizontally
      nextX += dx > 0 ? 1 : -1
    } else if (dy !== 0) {
      // Move vertically
      nextY += dy > 0 ? 1 : -1
    }

    currentX = nextX
    currentY = nextY
    path.push({ x: currentX, y: currentY })
  }

  return path
}

/**
 * Check if a position is reachable within a given movement budget using the 5-10 rule.
 */
export function isPositionReachable(
  from: Position,
  to: Position,
  remainingMovement: number
): boolean {
  return calculateMovementDistance(from, to) <= remainingMovement
}

/**
 * Get all positions reachable from a starting position within a movement budget.
 * Uses the 5-10 diagonal rule.
 */
export function getReachablePositionsInRange(
  from: Position,
  remainingMovement: number,
  gridWidth: number,
  gridHeight: number,
  occupiedPositions: Set<string>
): Position[] {
  const reachable: Position[] = []

  // Maximum possible range (all straight moves)
  const maxRange = Math.floor(remainingMovement / 5)

  for (let dy = -maxRange; dy <= maxRange; dy++) {
    for (let dx = -maxRange; dx <= maxRange; dx++) {
      const x = from.x + dx
      const y = from.y + dy

      // Skip out of bounds
      if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) continue

      // Skip current position
      if (dx === 0 && dy === 0) continue

      // Skip occupied cells
      if (occupiedPositions.has(`${x},${y}`)) continue

      // Check if reachable with 5-10 rule
      const distance = calculateMovementDistance(from, { x, y })
      if (distance <= remainingMovement) {
        reachable.push({ x, y })
      }
    }
  }

  return reachable
}
