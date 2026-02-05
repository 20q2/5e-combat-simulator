import type { Position } from '@/types'

/**
 * D&D 5e 5-10 Diagonal Rule Distance Calculation
 *
 * This module provides the canonical implementation for calculating distances
 * using the D&D 5e variant rule where:
 * - Straight moves (horizontal/vertical) cost 5ft each
 * - Diagonal moves alternate between 5ft and 10ft (first diagonal = 5ft, second = 10ft, etc.)
 *
 * Formula: distance = (straights + diagonals + floor(diagonals / 2)) * 5
 *
 * Examples:
 * - 1 diagonal = 5ft
 * - 2 diagonals = 15ft (5 + 10)
 * - 3 diagonals = 20ft (5 + 10 + 5)
 * - 4 diagonals = 30ft (5 + 10 + 5 + 10)
 */

/**
 * Calculate distance in feet between two grid coordinates using the 5-10 diagonal rule.
 * Takes raw dx/dy values (can be negative, will be converted to absolute).
 */
export function getDistanceFeet(dx: number, dy: number): number {
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  const diagonals = Math.min(absDx, absDy)
  const straights = Math.max(absDx, absDy) - diagonals
  return (straights + diagonals + Math.floor(diagonals / 2)) * 5
}

/**
 * Calculate distance in feet between two positions using the 5-10 diagonal rule.
 */
export function getDistanceBetweenPositions(from: Position, to: Position): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return getDistanceFeet(dx, dy)
}

/**
 * Calculate heuristic value for pathfinding using the 5-10 diagonal rule.
 * This is consistent with the movement distance calculation.
 */
export function getPathfindingHeuristic(dx: number, dy: number): number {
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  const diagonals = Math.min(absDx, absDy)
  const straights = Math.max(absDx, absDy) - diagonals
  // Use 7.5 for diagonals average cost (5+10)/2 to maintain admissibility
  return diagonals * 7.5 + straights * 5
}
