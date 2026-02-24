import type { Size, Position, Combatant, Character, Monster } from '@/types'

// Ordered size categories for Enlarge/Reduce shifting
const SIZE_ORDER: Size[] = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']

// Size to grid squares (footprint dimension)
const SIZE_TO_SQUARES: Record<Size, number> = {
  tiny: 1,
  small: 1,
  medium: 1,
  large: 2,
  huge: 3,
  gargantuan: 4,
}

// Visual scale factors for tokens that occupy 1 square
const SIZE_TO_SCALE: Record<Size, number> = {
  tiny: 0.6,
  small: 0.8,
  medium: 1.0,
  large: 1.0, // Multi-square, no scaling
  huge: 1.0,
  gargantuan: 1.0,
}

/**
 * Get the footprint size (number of squares per side) for a creature size
 */
export function getFootprintSize(size: Size): number {
  return SIZE_TO_SQUARES[size]
}

/**
 * Get visual scale factor for tokens (used for tiny/small creatures)
 */
export function getVisualScale(size: Size): number {
  return SIZE_TO_SCALE[size]
}

/**
 * Get the size of a combatant from their character race or monster data,
 * adjusted by Enlarge/Reduce conditions
 */
export function getCombatantSize(combatant: Combatant): Size {
  let baseSize: Size
  if (combatant.type === 'character') {
    baseSize = (combatant.data as Character).race.size
  } else {
    baseSize = (combatant.data as Monster).size
  }

  // Check for Enlarge/Reduce conditions
  const isEnlarged = combatant.conditions.some(c => c.condition === 'enlarged')
  const isReduced = combatant.conditions.some(c => c.condition === 'reduced')

  if (isEnlarged && !isReduced) {
    const idx = SIZE_ORDER.indexOf(baseSize)
    if (idx < SIZE_ORDER.length - 1) {
      return SIZE_ORDER[idx + 1]
    }
  } else if (isReduced && !isEnlarged) {
    const idx = SIZE_ORDER.indexOf(baseSize)
    if (idx > 0) {
      return SIZE_ORDER[idx - 1]
    }
  }

  return baseSize
}

/**
 * Get all cells occupied by a creature given its anchor position (top-left corner)
 */
export function getOccupiedCells(anchor: Position, size: Size): Position[] {
  const footprint = SIZE_TO_SQUARES[size]
  const cells: Position[] = []
  for (let dy = 0; dy < footprint; dy++) {
    for (let dx = 0; dx < footprint; dx++) {
      cells.push({ x: anchor.x + dx, y: anchor.y + dy })
    }
  }
  return cells
}

/**
 * Get occupied cells as Set<string> for efficient lookup
 */
export function getOccupiedCellKeys(anchor: Position, size: Size): Set<string> {
  return new Set(getOccupiedCells(anchor, size).map((p) => `${p.x},${p.y}`))
}

/**
 * Check if a footprint fits within grid bounds
 */
export function isFootprintInBounds(
  anchor: Position,
  size: Size,
  gridWidth: number,
  gridHeight: number
): boolean {
  const footprint = SIZE_TO_SQUARES[size]
  return (
    anchor.x >= 0 &&
    anchor.y >= 0 &&
    anchor.x + footprint <= gridWidth &&
    anchor.y + footprint <= gridHeight
  )
}

/**
 * Check if footprint is clear of obstacles at given anchor
 */
export function isFootprintClearOfObstacles(
  anchor: Position,
  size: Size,
  gridCells: { obstacle?: { blocksMovement?: boolean } }[][],
  gridWidth: number,
  gridHeight: number
): boolean {
  const footprint = SIZE_TO_SQUARES[size]

  for (let dy = 0; dy < footprint; dy++) {
    for (let dx = 0; dx < footprint; dx++) {
      const x = anchor.x + dx
      const y = anchor.y + dy

      // Check bounds
      if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) return false

      // Check obstacle
      const cell = gridCells[y]?.[x]
      if (cell?.obstacle?.blocksMovement) return false
    }
  }
  return true
}

/**
 * Check if footprint is clear of other combatants
 */
export function isFootprintClearOfCombatants(
  anchor: Position,
  size: Size,
  occupiedPositions: Set<string>
): boolean {
  const footprint = SIZE_TO_SQUARES[size]

  for (let dy = 0; dy < footprint; dy++) {
    for (let dx = 0; dx < footprint; dx++) {
      const key = `${anchor.x + dx},${anchor.y + dy}`
      if (occupiedPositions.has(key)) return false
    }
  }
  return true
}

/**
 * Get token pixel dimensions based on creature size
 */
export function getTokenPixelSize(size: Size, cellSize: number): number {
  const footprint = SIZE_TO_SQUARES[size]
  return footprint * cellSize - 8 // 8px padding total
}

/**
 * Check if a creature can squeeze (footprint > 1)
 */
export function canCreatureSqueeze(size: Size): boolean {
  return SIZE_TO_SQUARES[size] > 1
}

/**
 * Get the squeezed footprint size (one size smaller)
 */
export function getSqueezedFootprintSize(size: Size): number {
  const normalFootprint = SIZE_TO_SQUARES[size]
  return Math.max(1, normalFootprint - 1)
}

/**
 * Check if any cells of two footprints are adjacent (for melee range, opportunity attacks)
 */
export function areFootprintsAdjacent(
  anchor1: Position,
  size1: Size,
  anchor2: Position,
  size2: Size
): boolean {
  const cells1 = getOccupiedCells(anchor1, size1)
  const cells2 = getOccupiedCells(anchor2, size2)

  for (const c1 of cells1) {
    for (const c2 of cells2) {
      const dx = Math.abs(c1.x - c2.x)
      const dy = Math.abs(c1.y - c2.y)
      // Adjacent means within 1 square (including diagonals)
      if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
        return true
      }
    }
  }
  return false
}

/**
 * Get minimum distance between two footprints (in grid squares, not feet)
 */
export function getFootprintDistance(
  anchor1: Position,
  size1: Size,
  anchor2: Position,
  size2: Size
): number {
  const cells1 = getOccupiedCells(anchor1, size1)
  const cells2 = getOccupiedCells(anchor2, size2)

  let minDistance = Infinity
  for (const c1 of cells1) {
    for (const c2 of cells2) {
      const dx = Math.abs(c1.x - c2.x)
      const dy = Math.abs(c1.y - c2.y)
      // Use Chebyshev distance (max of dx, dy) for grid distance
      const dist = Math.max(dx, dy)
      if (dist < minDistance) {
        minDistance = dist
      }
    }
  }
  return minDistance
}
