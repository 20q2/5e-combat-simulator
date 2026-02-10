import type { Grid, GridCell, Position } from '@/types'
import { getPathfindingHeuristic } from './distance'

// ============================================
// A* Pathfinding Implementation
// (Supports multi-cell creatures and squeezing)
// ============================================

/**
 * Movement context for terrain cost calculations.
 * Carries speed info needed to calculate water terrain costs.
 */
export interface MovementContext {
  walkSpeed: number
  swimSpeed?: number
}

interface PathNode {
  x: number
  y: number
  gCost: number      // Actual cost from start
  hCost: number      // Heuristic cost to end
  fCost: number      // gCost + hCost
  parent: PathNode | null
}

// Priority queue using binary heap for efficient pathfinding
class PriorityQueue<T> {
  private heap: T[] = []
  private compareFn: (a: T, b: T) => number

  constructor(compareFn: (a: T, b: T) => number) {
    this.compareFn = compareFn
  }

  push(item: T): void {
    this.heap.push(item)
    this.bubbleUp(this.heap.length - 1)
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined
    const top = this.heap[0]
    const last = this.heap.pop()
    if (this.heap.length > 0 && last !== undefined) {
      this.heap[0] = last
      this.bubbleDown(0)
    }
    return top
  }

  isEmpty(): boolean {
    return this.heap.length === 0
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)
      if (this.compareFn(this.heap[index], this.heap[parentIndex]) >= 0) break
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]]
      index = parentIndex
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length
    while (true) {
      const leftChild = 2 * index + 1
      const rightChild = 2 * index + 2
      let smallest = index

      if (leftChild < length && this.compareFn(this.heap[leftChild], this.heap[smallest]) < 0) {
        smallest = leftChild
      }
      if (rightChild < length && this.compareFn(this.heap[rightChild], this.heap[smallest]) < 0) {
        smallest = rightChild
      }
      if (smallest === index) break
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]]
      index = smallest
    }
  }
}

/**
 * Calculate the 5-10 diagonal movement cost between two adjacent positions
 * Uses D&D 5e variant rule: first diagonal costs 5ft, second costs 10ft, alternating
 */
function calculateAdjacentCost(from: Position, to: Position, diagonalCount: number): { cost: number; newDiagonalCount: number } {
  const dx = Math.abs(to.x - from.x)
  const dy = Math.abs(to.y - from.y)

  if (dx === 0 && dy === 0) return { cost: 0, newDiagonalCount: diagonalCount }

  const isDiagonal = dx === 1 && dy === 1

  if (isDiagonal) {
    // Alternating diagonal cost: odd diagonals cost 5, even cost 10
    const newCount = diagonalCount + 1
    const cost = newCount % 2 === 1 ? 5 : 10
    return { cost, newDiagonalCount: newCount }
  }

  // Straight movement always costs 5ft
  return { cost: 5, newDiagonalCount: diagonalCount }
}

/**
 * Calculate heuristic distance using Chebyshev with 5-10 estimate
 * This is admissible (never overestimates) for 5-10 rule
 */
function heuristic(from: Position, to: Position): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return getPathfindingHeuristic(dx, dy)
}

/**
 * Check if a cell blocks movement
 */
export function blocksMovement(cell: GridCell | undefined): boolean {
  if (!cell) return true
  return cell.obstacle?.blocksMovement === true
}

/**
 * Check if a single cell is passable for movement
 */
export function isPassable(
  cell: GridCell | undefined,
  occupiedPositions: Set<string>
): boolean {
  if (!cell) return false

  // Check if blocked by obstacle
  if (blocksMovement(cell)) return false

  // Check if occupied by another combatant
  const key = `${cell.x},${cell.y}`
  if (occupiedPositions.has(key)) return false

  return true
}

/**
 * Check if an entire footprint is passable at a given anchor position
 * @param footprintSize - number of cells per side (1 for medium, 2 for large, etc.)
 */
export function isFootprintPassable(
  grid: Grid,
  anchor: Position,
  footprintSize: number,
  occupiedPositions: Set<string>
): boolean {
  for (let dy = 0; dy < footprintSize; dy++) {
    for (let dx = 0; dx < footprintSize; dx++) {
      const x = anchor.x + dx
      const y = anchor.y + dy

      // Check bounds
      if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) {
        return false
      }

      const cell = grid.cells[y]?.[x]
      if (!isPassable(cell, occupiedPositions)) {
        return false
      }
    }
  }
  return true
}

/**
 * Check if a creature can squeeze at a given position
 * Squeezing allows creatures to fit through spaces one size smaller
 * @returns true if the creature can fit by squeezing
 */
export function canSqueezeAt(
  grid: Grid,
  anchor: Position,
  footprintSize: number,
  occupiedPositions: Set<string>
): boolean {
  // Only creatures > 1 square can squeeze
  if (footprintSize <= 1) return false

  // Squeeze footprint is 1 less (Large 2x2 -> 1x1, Huge 3x3 -> 2x2)
  const squeezedSize = footprintSize - 1
  return isFootprintPassable(grid, anchor, squeezedSize, occupiedPositions)
}

/**
 * Check if a footprint can fit at a position (either normally or by squeezing)
 * @returns { passable: boolean, squeezing: boolean }
 */
export function checkFootprintPassability(
  grid: Grid,
  anchor: Position,
  footprintSize: number,
  occupiedPositions: Set<string>
): { passable: boolean; squeezing: boolean } {
  // Check normal footprint first
  if (isFootprintPassable(grid, anchor, footprintSize, occupiedPositions)) {
    return { passable: true, squeezing: false }
  }

  // Check if can squeeze
  if (canSqueezeAt(grid, anchor, footprintSize, occupiedPositions)) {
    return { passable: true, squeezing: true }
  }

  return { passable: false, squeezing: false }
}

/**
 * Get movement cost between two adjacent cells
 * Returns Infinity if movement is not possible
 */
export function getMovementCost(
  grid: Grid,
  from: Position,
  to: Position,
  diagonalCount: number,
  movementContext?: MovementContext
): { cost: number; newDiagonalCount: number } {
  const toCell = grid.cells[to.y]?.[to.x]
  const fromCell = grid.cells[from.y]?.[from.x]

  if (!toCell || !fromCell) {
    return { cost: Infinity, newDiagonalCount: diagonalCount }
  }

  // Check if destination is blocked by obstacle
  if (blocksMovement(toCell)) {
    return { cost: Infinity, newDiagonalCount: diagonalCount }
  }

  // Check elevation changes
  const fromElevation = fromCell.elevation ?? 0
  const toElevation = toCell.elevation ?? 0

  if (fromElevation !== toElevation) {
    // Can only change elevation via stairs
    if (fromCell.stairConnection) {
      // Check if stairs connect to destination
      if (
        fromCell.stairConnection.targetX === to.x &&
        fromCell.stairConnection.targetY === to.y &&
        fromCell.stairConnection.targetElevation === toElevation
      ) {
        // Using stairs - add extra 5ft climbing cost
        const { cost, newDiagonalCount } = calculateAdjacentCost(from, to, diagonalCount)
        return { cost: cost + 5, newDiagonalCount }
      }
    }
    // Cannot move to different elevation without stairs
    return { cost: Infinity, newDiagonalCount: diagonalCount }
  }

  // Calculate base movement cost
  const { cost: baseCost, newDiagonalCount } = calculateAdjacentCost(from, to, diagonalCount)

  // Water terrain - difficult unless creature has swim speed
  if (toCell.terrain === 'water') {
    if (movementContext?.swimSpeed) {
      const ratio = movementContext.walkSpeed / movementContext.swimSpeed
      return { cost: baseCost * ratio, newDiagonalCount }
    }
    return { cost: baseCost * 2, newDiagonalCount }
  }

  // Double cost for difficult terrain
  if (toCell.terrain === 'difficult') {
    return { cost: baseCost * 2, newDiagonalCount }
  }

  // Hazard terrain - could block or damage, for now treat as difficult
  if (toCell.terrain === 'hazard') {
    return { cost: baseCost * 2, newDiagonalCount }
  }

  return { cost: baseCost, newDiagonalCount }
}

/**
 * Get all valid neighboring positions (including diagonals)
 */
export function getNeighbors(grid: Grid, pos: Position): Position[] {
  const neighbors: Position[] = []

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue

      const nx = pos.x + dx
      const ny = pos.y + dy

      // Check bounds
      if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue

      neighbors.push({ x: nx, y: ny })
    }
  }

  return neighbors
}

/**
 * A* pathfinding algorithm
 * Returns array of positions from start to end (inclusive), or null if no path exists
 * @param footprintSize - number of cells per side (1 for medium, 2 for large, etc.)
 */
export function findPath(
  grid: Grid,
  start: Position,
  end: Position,
  occupiedPositions: Set<string>,
  maxCost?: number,
  footprintSize: number = 1,
  movementContext?: MovementContext
): Position[] | null {
  // Quick check: if end footprint can't fit, no path possible
  const endPassability = checkFootprintPassability(grid, end, footprintSize, occupiedPositions)
  if (!endPassability.passable) {
    // Also allow ending at occupied destination for attack range calculations
    // Remove destination cells from occupied set and try again
    const effectiveOccupied = new Set(occupiedPositions)
    for (let dy = 0; dy < footprintSize; dy++) {
      for (let dx = 0; dx < footprintSize; dx++) {
        effectiveOccupied.delete(`${end.x + dx},${end.y + dy}`)
      }
    }
    const retryPassability = checkFootprintPassability(grid, end, footprintSize, effectiveOccupied)
    if (!retryPassability.passable) {
      return null
    }
  }

  // Allow moving to occupied destination if it's the target (for attack range calculations)
  const effectiveOccupied = new Set(occupiedPositions)
  for (let dy = 0; dy < footprintSize; dy++) {
    for (let dx = 0; dx < footprintSize; dx++) {
      effectiveOccupied.delete(`${end.x + dx},${end.y + dy}`)
    }
  }

  const openSet = new PriorityQueue<PathNode>((a, b) => a.fCost - b.fCost)
  const closedSet = new Set<string>()
  const nodeMap = new Map<string, PathNode>()

  const startNode: PathNode = {
    x: start.x,
    y: start.y,
    gCost: 0,
    hCost: heuristic(start, end),
    fCost: heuristic(start, end),
    parent: null,
  }

  openSet.push(startNode)
  nodeMap.set(`${start.x},${start.y}`, startNode)

  // Track diagonal count per node for accurate 5-10 cost
  const diagonalCounts = new Map<string, number>()
  diagonalCounts.set(`${start.x},${start.y}`, 0)

  while (!openSet.isEmpty()) {
    const current = openSet.pop()!
    const currentKey = `${current.x},${current.y}`

    // Found the path!
    if (current.x === end.x && current.y === end.y) {
      return reconstructPath(current)
    }

    // Skip if already processed
    if (closedSet.has(currentKey)) continue
    closedSet.add(currentKey)

    const currentDiagonalCount = diagonalCounts.get(currentKey) ?? 0

    // Check all neighbors
    const neighbors = getNeighbors(grid, { x: current.x, y: current.y })

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`

      // Skip if already processed
      if (closedSet.has(neighborKey)) continue

      // Check if footprint can fit at neighbor (normal or squeezing)
      const isDestination = neighbor.x === end.x && neighbor.y === end.y
      const passability = checkFootprintPassability(grid, neighbor, footprintSize, effectiveOccupied)

      if (!passability.passable && !isDestination) {
        continue
      }

      // Calculate movement cost
      const { cost: baseCost, newDiagonalCount } = getMovementCost(
        grid,
        { x: current.x, y: current.y },
        neighbor,
        currentDiagonalCount,
        movementContext
      )

      // Skip if impassable
      if (baseCost === Infinity) continue

      // Double cost if squeezing
      const moveCost = passability.squeezing ? baseCost * 2 : baseCost

      const tentativeGCost = current.gCost + moveCost

      // Skip if over budget
      if (maxCost !== undefined && tentativeGCost > maxCost) continue

      const existingNode = nodeMap.get(neighborKey)

      if (!existingNode || tentativeGCost < existingNode.gCost) {
        const hCost = heuristic(neighbor, end)
        const newNode: PathNode = {
          x: neighbor.x,
          y: neighbor.y,
          gCost: tentativeGCost,
          hCost,
          fCost: tentativeGCost + hCost,
          parent: current,
        }

        nodeMap.set(neighborKey, newNode)
        diagonalCounts.set(neighborKey, newDiagonalCount)
        openSet.push(newNode)
      }
    }
  }

  // No path found
  return null
}

/**
 * Reconstruct path from end node back to start
 */
function reconstructPath(endNode: PathNode): Position[] {
  const path: Position[] = []
  let current: PathNode | null = endNode

  while (current !== null) {
    path.unshift({ x: current.x, y: current.y })
    current = current.parent
  }

  return path
}

/**
 * Calculate the total movement cost of a path
 */
export function calculatePathCost(grid: Grid, path: Position[], movementContext?: MovementContext): number {
  if (path.length < 2) return 0

  let totalCost = 0
  let diagonalCount = 0

  for (let i = 0; i < path.length - 1; i++) {
    const { cost, newDiagonalCount } = getMovementCost(grid, path[i], path[i + 1], diagonalCount, movementContext)
    if (cost === Infinity) return Infinity
    totalCost += cost
    diagonalCount = newDiagonalCount
  }

  return totalCost
}

/**
 * Get all reachable positions within a movement budget using BFS
 * Returns a map of position -> cost to reach
 * @param footprintSize - number of cells per side (1 for medium, 2 for large, etc.)
 */
export function getReachablePositions(
  grid: Grid,
  start: Position,
  movementBudget: number,
  occupiedPositions: Set<string>,
  footprintSize: number = 1,
  movementContext?: MovementContext
): Map<string, number> {
  const reachable = new Map<string, number>()

  // BFS queue: [position, cost, diagonalCount]
  const queue: [Position, number, number][] = [[start, 0, 0]]
  const visited = new Map<string, { cost: number; diagonalCount: number }>()
  visited.set(`${start.x},${start.y}`, { cost: 0, diagonalCount: 0 })

  while (queue.length > 0) {
    const [current, currentCost, diagonalCount] = queue.shift()!
    const currentKey = `${current.x},${current.y}`

    // Add to reachable if not start
    if (currentKey !== `${start.x},${start.y}`) {
      reachable.set(currentKey, currentCost)
    }

    // Check neighbors
    const neighbors = getNeighbors(grid, current)

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`

      // Check if footprint can fit at neighbor (normal or squeezing)
      const passability = checkFootprintPassability(grid, neighbor, footprintSize, occupiedPositions)
      if (!passability.passable) continue

      // Calculate base cost
      const { cost: baseCost, newDiagonalCount } = getMovementCost(
        grid,
        current,
        neighbor,
        diagonalCount,
        movementContext
      )

      if (baseCost === Infinity) continue

      // Double cost if squeezing
      const moveCost = passability.squeezing ? baseCost * 2 : baseCost

      const newCost = currentCost + moveCost

      // Skip if over budget
      if (newCost > movementBudget) continue

      // Skip if we've found a better path to this cell
      const existing = visited.get(neighborKey)
      if (existing && existing.cost <= newCost) continue

      visited.set(neighborKey, { cost: newCost, diagonalCount: newDiagonalCount })
      queue.push([neighbor, newCost, newDiagonalCount])
    }
  }

  return reachable
}
