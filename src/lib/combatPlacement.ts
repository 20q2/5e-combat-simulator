import type { Character, Monster, Position, TerrainDefinition } from '@/types'

interface CombatStoreActions {
  resetCombat: () => void
  initializeGrid: (width: number, height: number) => void
  initializeGridWithTerrain?: (width: number, height: number, terrain: TerrainDefinition[], backgroundImage?: string) => void
  addCombatant: (input: {
    name: string
    type: 'character' | 'monster'
    data: Character | Monster
    position: Position
  }) => void
  startCombat: () => void
}

interface MonsterSelection {
  monster: Monster
  count: number
}

interface PlacementOptions {
  autoStart?: boolean
  gridWidth?: number
  gridHeight?: number
  terrain?: TerrainDefinition[]
  backgroundImage?: string
}

/**
 * Check if a grid position is blocked by an obstacle or already occupied
 */
function isPositionBlocked(
  x: number,
  y: number,
  gridWidth: number,
  gridHeight: number,
  terrain: TerrainDefinition[] | undefined,
  occupiedPositions: Set<string>
): boolean {
  // Out of bounds
  if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) return true
  // Already occupied by another combatant
  if (occupiedPositions.has(`${x},${y}`)) return true
  // Blocked by obstacle
  if (terrain?.some(t => t.x === x && t.y === y && t.obstacle?.blocksMovement)) return true
  return false
}

/**
 * Find a valid position near the target that's not blocked by obstacles or other combatants.
 * Searches in expanding rings around the start position, preferring the given search direction.
 * searchDirection: 1 = prefer right (for characters), -1 = prefer left (for monsters)
 */
export function findValidPosition(
  startX: number,
  startY: number,
  gridWidth: number,
  gridHeight: number,
  terrain: TerrainDefinition[] | undefined,
  occupiedPositions: Set<string>,
  searchDirection: 1 | -1 = 1
): Position {
  // Try the exact position first
  if (!isPositionBlocked(startX, startY, gridWidth, gridHeight, terrain, occupiedPositions)) {
    return { x: startX, y: startY }
  }
  // Search in expanding radius, checking all cells at each distance
  for (let radius = 1; radius <= Math.max(gridWidth, gridHeight); radius++) {
    // First check along the preferred direction, then expand
    for (let dy = -radius; dy <= radius; dy++) {
      const x = startX + radius * searchDirection
      const y = startY + dy
      if (!isPositionBlocked(x, y, gridWidth, gridHeight, terrain, occupiedPositions)) {
        return { x, y }
      }
    }
    // Then check remaining perimeter cells at this radius
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
        // Skip the preferred direction column (already checked above)
        if (dx === radius * searchDirection) continue
        const x = startX + dx
        const y = startY + dy
        if (!isPositionBlocked(x, y, gridWidth, gridHeight, terrain, occupiedPositions)) {
          return { x, y }
        }
      }
    }
  }
  // Absolute fallback — shouldn't happen unless grid is completely full
  return { x: startX, y: startY }
}

/**
 * Calculate positions for combatants on the grid
 * - Characters placed on left side (x=2), vertically centered
 * - Monsters placed on right side, spread vertically with column wrapping
 */
export function calculateCombatantPositions(
  characterCount: number,
  monsterCount: number,
  gridWidth: number = 15,
  gridHeight: number = 10
): { characterPositions: Position[]; monsterPositions: Position[] } {
  const characterPositions: Position[] = []
  const monsterPositions: Position[] = []

  // Place characters on left side, vertically centered
  const charStartY = Math.max(1, Math.floor((gridHeight - characterCount) / 2))
  for (let i = 0; i < characterCount; i++) {
    characterPositions.push({ x: 2, y: charStartY + i })
  }

  // Place monsters on right side, spread vertically with column wrapping
  const monsterStartY = Math.max(1, Math.floor((gridHeight - monsterCount) / 2))
  const monsterX = gridWidth - 3

  for (let i = 0; i < monsterCount; i++) {
    const row = i % (gridHeight - 2)
    const col = Math.floor(i / (gridHeight - 2))
    monsterPositions.push({
      x: monsterX - col * 2,
      y: monsterStartY + row,
    })
  }

  return { characterPositions, monsterPositions }
}

/**
 * Set up combat with automatic combatant placement
 * Replicates the HomePage quick start flow for use in EncounterBuilder and other contexts
 */
export function setupCombatWithPlacement(
  combatStore: CombatStoreActions,
  characters: Character[],
  monsters: MonsterSelection[],
  options: PlacementOptions = {}
): void {
  const { autoStart = true, gridWidth = 15, gridHeight = 10, terrain, backgroundImage } = options

  // Reset combat state and initialize grid
  combatStore.resetCombat()

  // Use terrain-aware initialization if terrain is provided
  if (terrain && terrain.length > 0 && combatStore.initializeGridWithTerrain) {
    combatStore.initializeGridWithTerrain(gridWidth, gridHeight, terrain, backgroundImage)
  } else {
    combatStore.initializeGrid(gridWidth, gridHeight)
  }

  // Calculate total monster count
  const totalMonsters = monsters.reduce((sum, m) => sum + m.count, 0)

  // Calculate ideal positions
  const { characterPositions, monsterPositions } = calculateCombatantPositions(
    characters.length,
    totalMonsters,
    gridWidth,
    gridHeight
  )

  // Track occupied positions to prevent overlaps
  const occupiedPositions = new Set<string>()

  // Add characters with validated positions
  characters.forEach((character, index) => {
    const ideal = characterPositions[index] ?? { x: 2, y: Math.floor(gridHeight / 2) }
    const pos = findValidPosition(ideal.x, ideal.y, gridWidth, gridHeight, terrain, occupiedPositions, 1)
    occupiedPositions.add(`${pos.x},${pos.y}`)

    combatStore.addCombatant({
      name: character.name,
      type: 'character',
      data: character,
      position: pos,
    })
  })

  // Add monsters with validated positions
  let monsterIndex = 0
  monsters.forEach(({ monster, count }) => {
    for (let i = 0; i < count; i++) {
      const ideal = monsterPositions[monsterIndex] ?? { x: gridWidth - 3, y: Math.floor(gridHeight / 2) }
      const pos = findValidPosition(ideal.x, ideal.y, gridWidth, gridHeight, terrain, occupiedPositions, -1)
      occupiedPositions.add(`${pos.x},${pos.y}`)

      combatStore.addCombatant({
        name: count > 1 ? `${monster.name} ${i + 1}` : monster.name,
        type: 'monster',
        data: { ...monster },
        position: pos,
      })
      monsterIndex++
    }
  })

  // Auto-start combat (roll initiative) if requested
  if (autoStart) {
    combatStore.startCombat()
  }
}
