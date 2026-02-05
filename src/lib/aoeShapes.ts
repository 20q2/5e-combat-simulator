import type { Position } from '@/types'
import { getDistanceFeet } from './distance'

export type AoEType = 'cone' | 'cube' | 'cylinder' | 'line' | 'sphere'

export interface AoEConfig {
  type: AoEType
  size: number // in feet
  origin: Position // caster position for cones/lines, or ignored for sphere/cube
  target: Position // cursor/target position
}

/**
 * Get the angle from origin to target in radians
 */
function getAngle(origin: Position, target: Position): number {
  return Math.atan2(target.y - origin.y, target.x - origin.x)
}

/**
 * Direction type for 8 cardinal/diagonal directions
 */
type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

/**
 * Snap an angle to one of 8 directions
 * Note: Screen coordinates have Y increasing downward, so we flip N/S
 */
function snapToDirection(angle: number): Direction {
  // Normalize to [0, 2*PI)
  let normalized = angle
  while (normalized < 0) normalized += 2 * Math.PI
  while (normalized >= 2 * Math.PI) normalized -= 2 * Math.PI

  // Each direction covers PI/4 (45 degrees)
  // In screen coords: angle 0 = East, PI/2 = South (down), PI = West, 3PI/2 = North (up)
  const index = Math.round(normalized / (Math.PI / 4)) % 8
  const directions: Direction[] = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']
  return directions[index]
}

/**
 * Generate a cone template for cardinal directions (N, S, E, W)
 * Creates a triangle: row 1 has 1 cell, row 2 has 2 cells, row 3 has 3 cells, etc.
 */
function getCardinalConeTemplate(numRows: number, direction: Direction): Position[] {
  const cells: Position[] = []

  for (let row = 1; row <= numRows; row++) {
    const width = row
    // Center the cells: for width 1 -> offset 0; width 2 -> offsets 0,1; width 3 -> offsets -1,0,1
    const startOffset = -Math.floor((width - 1) / 2)

    for (let i = 0; i < width; i++) {
      const offset = startOffset + i

      switch (direction) {
        case 'N':
          cells.push({ x: offset, y: -row })
          break
        case 'S':
          cells.push({ x: offset, y: row })
          break
        case 'E':
          cells.push({ x: row, y: offset })
          break
        case 'W':
          cells.push({ x: -row, y: offset })
          break
      }
    }
  }

  return cells
}

/**
 * Generate a cone template for diagonal directions (NE, SE, SW, NW)
 * Creates a triangular wedge spreading along two axes
 */
function getDiagonalConeTemplate(numRows: number, direction: Direction): Position[] {
  const cells: Position[] = []

  // Direction multipliers
  const xDir = direction === 'NE' || direction === 'SE' ? 1 : -1
  const yDir = direction === 'SE' || direction === 'SW' ? 1 : -1

  for (let row = 1; row <= numRows; row++) {
    // For diagonal cones, we fill a triangular area
    // At row r, we have cells forming an L-shape or triangle
    for (let i = 0; i < row; i++) {
      for (let j = 0; j < row; j++) {
        // Only include cells where i + j < row (forms triangle)
        // Plus the diagonal cell itself at i=row-1, j=0 and i=0, j=row-1
        if (i + j < row) {
          // Offset from origin along each axis
          const dx = (i + 1) * xDir
          const dy = (j + 1) * yDir

          // Check if this cell is within the cone's distance using 5-10-5
          const dist = getDistanceFeet(dx, dy)
          if (dist <= numRows * 5) {
            cells.push({ x: dx, y: dy })
          }
        }
      }
    }
  }

  return cells
}

/**
 * Calculate cells affected by a cone AoE
 * D&D 5e cone: width at any point equals distance from origin
 * Uses template-based approach snapped to 8 directions
 */
function getConeAffectedCells(
  origin: Position,
  target: Position,
  sizeFeet: number
): Set<string> {
  const cells = new Set<string>()

  // Don't show cone if target is at origin
  if (target.x === origin.x && target.y === origin.y) {
    return cells
  }

  // Get direction from origin to target
  const angle = getAngle(origin, target)
  const direction = snapToDirection(angle)

  // Calculate number of rows based on size (5ft per row)
  const numRows = Math.floor(sizeFeet / 5)

  // Get the appropriate template
  const isCardinal = direction === 'N' || direction === 'S' || direction === 'E' || direction === 'W'
  const template = isCardinal
    ? getCardinalConeTemplate(numRows, direction)
    : getDiagonalConeTemplate(numRows, direction)

  // Apply template to origin position
  for (const offset of template) {
    cells.add(`${origin.x + offset.x},${origin.y + offset.y}`)
  }

  return cells
}

/**
 * Calculate cells affected by a sphere/cylinder AoE
 * Centered on target position, uses 5-10-5 diagonal rule
 * 5ft radius = center only, 10ft = plus shape, 20ft = diamond
 */
function getSphereAffectedCells(
  target: Position,
  radiusFeet: number
): Set<string> {
  const cells = new Set<string>()

  // Always include the center cell
  cells.add(`${target.x},${target.y}`)

  // For radius > 0, add cells within range using 5-10-5 rule
  // A cell is included if its distance from center is < radius (strictly less)
  // This gives us: 5ft = center only, 10ft = center + 4 cardinal, etc.
  const searchRadius = Math.ceil(radiusFeet / 5) + 1

  for (let dx = -searchRadius; dx <= searchRadius; dx++) {
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      if (dx === 0 && dy === 0) continue // Already added center

      // Use 5-10-5 rule for distance
      const distanceFeet = getDistanceFeet(dx, dy)
      // Include cells where distance is strictly less than radius
      if (distanceFeet < radiusFeet) {
        cells.add(`${target.x + dx},${target.y + dy}`)
      }
    }
  }

  return cells
}

/**
 * Calculate cells affected by a cube AoE
 * Centered on target position
 */
function getCubeAffectedCells(
  target: Position,
  sizeFeet: number
): Set<string> {
  const cells = new Set<string>()
  const sizeSquares = Math.ceil(sizeFeet / 5)
  const halfSize = Math.floor(sizeSquares / 2)

  for (let dx = -halfSize; dx <= halfSize; dx++) {
    for (let dy = -halfSize; dy <= halfSize; dy++) {
      cells.add(`${target.x + dx},${target.y + dy}`)
    }
  }

  return cells
}

/**
 * Calculate cells affected by a line AoE
 * Line from origin toward target, 5 feet wide (1 cell)
 * Snaps to 8 directions like cones
 */
function getLineAffectedCells(
  origin: Position,
  target: Position,
  lengthFeet: number
): Set<string> {
  const cells = new Set<string>()

  // Don't show line if target is at origin
  if (target.x === origin.x && target.y === origin.y) {
    return cells
  }

  // Snap to one of 8 directions
  const angle = getAngle(origin, target)
  const direction = snapToDirection(angle)

  // Calculate number of cells based on length
  const numCells = Math.floor(lengthFeet / 5)

  // Direction vectors
  const dirVectors: Record<Direction, { dx: number; dy: number }> = {
    N: { dx: 0, dy: -1 },
    NE: { dx: 1, dy: -1 },
    E: { dx: 1, dy: 0 },
    SE: { dx: 1, dy: 1 },
    S: { dx: 0, dy: 1 },
    SW: { dx: -1, dy: 1 },
    W: { dx: -1, dy: 0 },
    NW: { dx: -1, dy: -1 },
  }

  const dir = dirVectors[direction]

  // Add cells in a straight line
  for (let i = 1; i <= numCells; i++) {
    cells.add(`${origin.x + dir.dx * i},${origin.y + dir.dy * i}`)
  }

  return cells
}

/**
 * Main function to get affected cells for any AoE type
 */
export function getAoEAffectedCells(config: AoEConfig): Set<string> {
  const { type, size, origin, target } = config

  switch (type) {
    case 'cone':
      return getConeAffectedCells(origin, target, size)
    case 'sphere':
    case 'cylinder':
      return getSphereAffectedCells(target, size)
    case 'cube':
      return getCubeAffectedCells(target, size)
    case 'line':
      return getLineAffectedCells(origin, target, size)
    default:
      return new Set()
  }
}

/**
 * Check if a spell has an area of effect that needs preview
 */
export function spellHasAoE(spell: { areaOfEffect?: { type: AoEType; size: number } }): boolean {
  return !!spell.areaOfEffect
}

/**
 * Check if the AoE originates from caster (cone, line) or is placed at target (sphere, cube, cylinder)
 */
export function aoeOriginatesFromCaster(type: AoEType): boolean {
  return type === 'cone' || type === 'line'
}
