import type { Grid, GridCell, Position } from '@/types'

// ============================================
// A* Pathfinding Implementation
// ============================================

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
  const dx = Math.abs(to.x - from.x)
  const dy = Math.abs(to.y - from.y)
  const diagonals = Math.min(dx, dy)
  const straights = Math.abs(dx - dy)
  // Estimate: average 7.5ft per diagonal (5+10)/2, 5ft per straight
  return diagonals * 7.5 + straights * 5
}

/**
 * Check if a cell blocks movement
 */
export function blocksMovement(cell: GridCell): boolean {
  return cell.obstacle?.blocksMovement === true
}

/**
 * Check if a cell is passable for movement
 */
export function isPassable(
  cell: GridCell,
  occupiedPositions: Set<string>
): boolean {
  // Check if blocked by obstacle
  if (blocksMovement(cell)) return false

  // Check if occupied by another combatant
  const key = `${cell.x},${cell.y}`
  if (occupiedPositions.has(key)) return false

  return true
}

/**
 * Get movement cost between two adjacent cells
 * Returns Infinity if movement is not possible
 */
export function getMovementCost(
  grid: Grid,
  from: Position,
  to: Position,
  diagonalCount: number
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
 */
export function findPath(
  grid: Grid,
  start: Position,
  end: Position,
  occupiedPositions: Set<string>,
  maxCost?: number
): Position[] | null {
  // Quick check: if end is blocked, no path possible
  const endCell = grid.cells[end.y]?.[end.x]
  if (!endCell || blocksMovement(endCell)) {
    return null
  }

  // Allow moving to occupied destination if it's the target (for attack range calculations)
  const effectiveOccupied = new Set(occupiedPositions)
  effectiveOccupied.delete(`${end.x},${end.y}`)

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

      // Skip if impassable (unless it's the destination)
      const neighborCell = grid.cells[neighbor.y][neighbor.x]
      if (neighborKey !== `${end.x},${end.y}` && !isPassable(neighborCell, effectiveOccupied)) {
        continue
      }

      // Calculate movement cost
      const { cost: moveCost, newDiagonalCount } = getMovementCost(
        grid,
        { x: current.x, y: current.y },
        neighbor,
        currentDiagonalCount
      )

      // Skip if impassable
      if (moveCost === Infinity) continue

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
export function calculatePathCost(grid: Grid, path: Position[]): number {
  if (path.length < 2) return 0

  let totalCost = 0
  let diagonalCount = 0

  for (let i = 0; i < path.length - 1; i++) {
    const { cost, newDiagonalCount } = getMovementCost(grid, path[i], path[i + 1], diagonalCount)
    if (cost === Infinity) return Infinity
    totalCost += cost
    diagonalCount = newDiagonalCount
  }

  return totalCost
}

/**
 * Get all reachable positions within a movement budget using BFS
 * Returns a map of position -> cost to reach
 */
export function getReachablePositions(
  grid: Grid,
  start: Position,
  movementBudget: number,
  occupiedPositions: Set<string>
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
      const neighborCell = grid.cells[neighbor.y]?.[neighbor.x]

      if (!neighborCell) continue

      // Check if passable
      if (!isPassable(neighborCell, occupiedPositions)) continue

      // Calculate cost
      const { cost: moveCost, newDiagonalCount } = getMovementCost(
        grid,
        current,
        neighbor,
        diagonalCount
      )

      if (moveCost === Infinity) continue

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
