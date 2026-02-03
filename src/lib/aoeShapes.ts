import type { Position } from '@/types'

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
 * Normalize angle to [-PI, PI]
 */
function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI
  while (angle < -Math.PI) angle += 2 * Math.PI
  return angle
}

/**
 * Calculate cells affected by a cone AoE
 * D&D 5e cone: width at any point equals distance from origin
 * This means a ~53 degree half-angle (106 degree total spread)
 */
function getConeAffectedCells(
  origin: Position,
  target: Position,
  sizeFeet: number
): Set<string> {
  const cells = new Set<string>()
  const sizeSquares = Math.ceil(sizeFeet / 5)

  // Get the direction angle from origin to target
  const targetAngle = getAngle(origin, target)

  // Cone half-angle: arctan(0.5) ≈ 26.57 degrees for width = distance
  // But for grid-based play, use 45 degrees (PI/4) for cleaner shapes
  const coneHalfAngle = Math.PI / 4 // 45 degrees

  // Check all cells within the bounding box of the cone
  for (let dy = -sizeSquares; dy <= sizeSquares; dy++) {
    for (let dx = -sizeSquares; dx <= sizeSquares; dx++) {
      if (dx === 0 && dy === 0) continue // Skip origin

      const cellX = origin.x + dx
      const cellY = origin.y + dy

      // Calculate distance in grid squares (using Chebyshev for D&D)
      const distance = Math.max(Math.abs(dx), Math.abs(dy))
      if (distance > sizeSquares) continue

      // Calculate angle from origin to this cell
      const cellAngle = Math.atan2(dy, dx)

      // Check if cell is within cone angle
      const angleDiff = Math.abs(normalizeAngle(cellAngle - targetAngle))
      if (angleDiff <= coneHalfAngle) {
        cells.add(`${cellX},${cellY}`)
      }
    }
  }

  return cells
}

/**
 * Calculate cells affected by a sphere/cylinder AoE
 * Centered on target position
 */
function getSphereAffectedCells(
  target: Position,
  radiusFeet: number
): Set<string> {
  const cells = new Set<string>()
  const radiusSquares = Math.ceil(radiusFeet / 5)

  // Check all cells within the bounding box
  for (let dx = -radiusSquares; dx <= radiusSquares; dx++) {
    for (let dy = -radiusSquares; dy <= radiusSquares; dy++) {
      // Use Euclidean distance for circular shape
      const distSquares = Math.sqrt(dx * dx + dy * dy)
      if (distSquares <= radiusSquares) {
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
 * Line from origin toward target, 5 feet wide
 */
function getLineAffectedCells(
  origin: Position,
  target: Position,
  lengthFeet: number
): Set<string> {
  const cells = new Set<string>()
  const lengthSquares = Math.ceil(lengthFeet / 5)

  // Get the direction angle from origin to target
  const targetAngle = getAngle(origin, target)

  // Line is narrow - use a small angle tolerance (about 22.5 degrees = PI/8)
  const lineHalfAngle = Math.PI / 8

  // Check all cells within the line's length
  for (let dy = -lengthSquares; dy <= lengthSquares; dy++) {
    for (let dx = -lengthSquares; dx <= lengthSquares; dx++) {
      if (dx === 0 && dy === 0) continue // Skip origin

      const cellX = origin.x + dx
      const cellY = origin.y + dy

      // Calculate distance
      const distance = Math.max(Math.abs(dx), Math.abs(dy))
      if (distance > lengthSquares) continue

      // Calculate angle from origin to this cell
      const cellAngle = Math.atan2(dy, dx)

      // Check if cell is within line angle (narrow cone)
      const angleDiff = Math.abs(normalizeAngle(cellAngle - targetAngle))
      if (angleDiff <= lineHalfAngle) {
        cells.add(`${cellX},${cellY}`)
      }
    }
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
