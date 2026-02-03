import type { Character, Monster, Position } from '@/types'

interface CombatStoreActions {
  resetCombat: () => void
  initializeGrid: (width: number, height: number) => void
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
  const { autoStart = true, gridWidth = 15, gridHeight = 10 } = options

  // Reset combat state and initialize grid
  combatStore.resetCombat()
  combatStore.initializeGrid(gridWidth, gridHeight)

  // Calculate total monster count
  const totalMonsters = monsters.reduce((sum, m) => sum + m.count, 0)

  // Calculate positions
  const { characterPositions, monsterPositions } = calculateCombatantPositions(
    characters.length,
    totalMonsters,
    gridWidth,
    gridHeight
  )

  // Add characters with positions
  characters.forEach((character, index) => {
    combatStore.addCombatant({
      name: character.name,
      type: 'character',
      data: character,
      position: characterPositions[index] ?? { x: 2, y: Math.floor(gridHeight / 2) },
    })
  })

  // Add monsters with positions
  let monsterIndex = 0
  monsters.forEach(({ monster, count }) => {
    for (let i = 0; i < count; i++) {
      combatStore.addCombatant({
        name: count > 1 ? `${monster.name} ${i + 1}` : monster.name,
        type: 'monster',
        data: { ...monster },
        position: monsterPositions[monsterIndex] ?? { x: gridWidth - 3, y: Math.floor(gridHeight / 2) },
      })
      monsterIndex++
    }
  })

  // Auto-start combat (roll initiative) if requested
  if (autoStart) {
    combatStore.startCombat()
  }
}
