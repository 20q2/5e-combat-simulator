import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useCombatStore, isCurrentTurn } from '@/stores/combatStore'
import { useMovementAnimation } from '@/hooks/useMovementAnimation'
import { Token } from './Token'
import { DamagePopup } from './DamagePopup'
import { calculateMovementDistance } from '@/lib/movement'
import { findPath, calculatePathCost } from '@/lib/pathfinding'
import { getAoEAffectedCells, aoeOriginatesFromCaster } from '@/lib/aoeShapes'
import { hasLineOfSight } from '@/lib/lineOfSight'
import { getCombatantSize, getFootprintSize, getVisualScale, getOccupiedCellKeys } from '@/lib/creatureSize'
import type { Position, Character, Monster, GridCell as GridCellType } from '@/types'

// Use Vite's glob import to load obstacle images
const obstacleImages = import.meta.glob<{ default: string }>(
  '@/assets/obstacles/*.png',
  { eager: true }
)

// Use Vite's glob import to load map background images
const mapBackgroundImages = import.meta.glob<{ default: string }>(
  '@/assets/maps/*.png',
  { eager: true }
)

// Get map background image by filename (e.g., "goblin_camp")
function getMapBackgroundImage(filename: string | undefined): string | null {
  if (!filename) return null
  const imagePath = `/src/assets/maps/${filename}.png`
  const imageModule = mapBackgroundImages[imagePath]
  return imageModule?.default ?? null
}

const CELL_SIZE = 56 // pixels

// Parse spell range string to number (in feet)
// e.g., "120 feet" → 120, "Touch" → 5, "Self" → 0
function parseSpellRangeForGrid(range: string): number {
  const lowerRange = range.toLowerCase()
  if (lowerRange === 'self' || lowerRange.startsWith('self')) return 0
  if (lowerRange === 'touch') return 5
  const match = range.match(/(\d+)\s*(feet|ft|foot)?/i)
  if (match) return parseInt(match[1], 10)
  return 0
}

// Get the direction arrow for a path segment
function getPathArrow(from: Position, to: Position): string {
  const dx = to.x - from.x
  const dy = to.y - from.y

  if (dx === 1 && dy === 0) return '→'
  if (dx === -1 && dy === 0) return '←'
  if (dx === 0 && dy === 1) return '↓'
  if (dx === 0 && dy === -1) return '↑'
  if (dx === 1 && dy === 1) return '↘'
  if (dx === -1 && dy === 1) return '↙'
  if (dx === 1 && dy === -1) return '↗'
  if (dx === -1 && dy === -1) return '↖'
  return '•'
}

// Path segment component
function PathSegment({
  position,
  nextPosition,
}: {
  position: Position
  nextPosition?: Position
}) {
  // Don't render anything at the destination (no arrow to show)
  if (!nextPosition) return null

  const arrow = getPathArrow(position, nextPosition)

  return (
    <div
      className="absolute flex items-center justify-center pointer-events-none z-20 text-emerald-400/80"
      style={{
        left: position.x * CELL_SIZE,
        top: position.y * CELL_SIZE,
        width: CELL_SIZE,
        height: CELL_SIZE,
      }}
    >
      <span className="text-2xl font-bold drop-shadow-lg">
        {arrow}
      </span>
    </div>
  )
}

interface GridCellProps {
  x: number
  y: number
  cell: GridCellType
  isReachable: boolean
  isSelected: boolean
  isDragOver: boolean
  isValidDrop: boolean
  isTargetable: boolean
  isThreatened: boolean
  isInWeaponRange?: 'melee' | 'ranged' | 'spell'
  isBlockedByLOS: boolean
  isInAoEPreview: boolean
  distance?: number
  wallBorderStyle?: React.CSSProperties // For wall outline rendering
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

// Get obstacle image path (returns null if no image available)
function getObstacleImage(type: string): string | null {
  const imagePath = `/src/assets/obstacles/${type}.png`
  const imageModule = obstacleImages[imagePath]
  return imageModule?.default ?? null
}

// Get obstacle visual icon/emoji (fallback for obstacles without images)
function getObstacleIcon(type: string): string {
  switch (type) {
    case 'wall': return '▓'
    case 'pillar': return '◼'
    case 'tree': return '🌲'
    case 'boulder': return '🪨'
    case 'furniture': return '▬'
    default: return '■'
  }
}

function GridCell({
  x,
  y,
  cell,
  isReachable,
  isSelected,
  isDragOver,
  isValidDrop,
  isTargetable,
  isThreatened,
  isInWeaponRange,
  isBlockedByLOS,
  isInAoEPreview,
  distance,
  wallBorderStyle,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: GridCellProps) {
  const hasObstacle = cell.obstacle !== undefined
  const isWall = cell.obstacle?.type === 'wall'
  const hasDifficultTerrain = cell.terrain === 'difficult'
  const hasHazardTerrain = cell.terrain === 'hazard'
  const hasWaterTerrain = cell.terrain === 'water'
  const isElevated = (cell.elevation ?? 0) > 0
  const hasStairs = cell.stairConnection !== undefined

  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'border border-slate-700/50 transition-colors cursor-pointer relative',
        // Weapon range highlighting (before other highlights so they can override)
        isInWeaponRange === 'melee' && 'bg-rose-900/30 border-rose-700/50',
        isInWeaponRange === 'ranged' && 'bg-orange-900/30 border-orange-700/50',
        isInWeaponRange === 'spell' && 'bg-violet-900/30 border-violet-700/50',
        // LOS blocked cells - dimmed with strikethrough pattern
        isBlockedByLOS && 'bg-slate-800/50 border-slate-600/50',
        // AoE preview highlighting (overrides weapon range)
        isInAoEPreview && 'bg-orange-500/50 border-orange-400 ring-1 ring-orange-400/50',
        // Terrain backgrounds
        hasDifficultTerrain && 'bg-amber-900/40',
        hasHazardTerrain && 'bg-red-900/50 animate-pulse',
        hasWaterTerrain && 'bg-blue-900/50',
        // Elevation styling
        isElevated && 'bg-slate-700/60 border-slate-500 shadow-inner',
        // Obstacle styling (walls get subtle tint, others are filled)
        isWall && 'bg-slate-900/40',
        hasObstacle && !isWall && 'bg-slate-800',
        hasObstacle && cell.obstacle?.type === 'pillar' && 'bg-stone-700',
        hasObstacle && cell.obstacle?.type === 'tree' && 'bg-emerald-950',
        hasObstacle && cell.obstacle?.type === 'boulder' && 'bg-stone-600',
        hasObstacle && cell.obstacle?.type === 'furniture' && 'bg-amber-950',
        // Stairs styling
        hasStairs && 'bg-cyan-900/50 border-cyan-700',
        // Interactive state overrides
        isReachable && !hasObstacle && 'bg-emerald-900/60 hover:bg-emerald-800/70 border-emerald-700',
        isSelected && 'bg-violet-900/60 border-violet-500',
        isDragOver && isValidDrop && 'bg-emerald-700/80 border-emerald-400 border-2',
        isDragOver && !isValidDrop && 'bg-red-900/70 border-red-500 border-2',
        isTargetable && 'bg-rose-900/40 border-rose-600 ring-1 ring-rose-500/50',
        isThreatened && !isReachable && !hasObstacle && 'bg-amber-900/30 border-amber-700/50',
        !isReachable && !isSelected && !isDragOver && !isTargetable && !isThreatened && !hasObstacle && !hasDifficultTerrain && !hasHazardTerrain && !hasWaterTerrain && !isElevated && !hasStairs && 'hover:bg-slate-800/70'
      )}
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        gridColumn: x + 1,
        gridRow: y + 1,
      }}
    >
      {/* Wall obstacle - rendered as faint outline */}
      {isWall && wallBorderStyle && (
        <div
          className="absolute inset-0 bg-transparent pointer-events-none"
          style={wallBorderStyle}
        />
      )}

      {/* Non-wall obstacle image or icon */}
      {hasObstacle && !isWall && (
        <>
          {getObstacleImage(cell.obstacle!.type) ? (
            <img
              src={getObstacleImage(cell.obstacle!.type)!}
              alt={cell.obstacle!.type}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-90"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-2xl pointer-events-none opacity-80">
              {getObstacleIcon(cell.obstacle!.type)}
            </span>
          )}
        </>
      )}

      {/* Difficult terrain indicator */}
      {hasDifficultTerrain && !hasObstacle && (
        <span className="absolute inset-0 flex items-center justify-center text-amber-500/50 text-xs font-bold pointer-events-none">
          ≋
        </span>
      )}

      {/* Hazard terrain indicator */}
      {hasHazardTerrain && !hasObstacle && (
        <span className="absolute inset-0 flex items-center justify-center text-red-400/60 text-lg pointer-events-none">
          ⚠
        </span>
      )}

      {/* Water terrain indicator */}
      {hasWaterTerrain && !hasObstacle && (
        <span className="absolute inset-0 flex items-center justify-center text-blue-400/50 text-lg pointer-events-none">
          ≈
        </span>
      )}

      {/* Stairs indicator */}
      {hasStairs && !hasObstacle && (
        <span className={cn(
          'absolute inset-0 flex items-center justify-center text-lg font-bold pointer-events-none',
          cell.stairConnection?.direction === 'up' ? 'text-green-400' : 'text-blue-400'
        )}>
          {cell.stairConnection?.direction === 'up' ? '▲' : '▼'}
        </span>
      )}

      {/* Elevation badge */}
      {isElevated && !hasObstacle && !hasStairs && (
        <span className="absolute top-0.5 right-0.5 text-[10px] font-bold text-slate-300 bg-slate-800/80 px-1 rounded pointer-events-none">
          +{cell.elevation}
        </span>
      )}

      {/* Distance and terrain indicator on hover */}
      {distance !== undefined && distance > 0 && !hasObstacle && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs font-bold text-white/90 drop-shadow-md">
            {distance}ft
          </span>
          {hasDifficultTerrain && (
            <span className="text-[9px] font-medium text-amber-300/90 drop-shadow-md">
              Difficult
            </span>
          )}
          {hasHazardTerrain && (
            <span className="text-[9px] font-medium text-red-300/90 drop-shadow-md">
              1d4 fire
            </span>
          )}
          {hasWaterTerrain && (
            <span className="text-[9px] font-medium text-blue-300/90 drop-shadow-md">
              Water
            </span>
          )}
        </div>
      )}

      {/* LOS blocked indicator */}
      {isBlockedByLOS && !hasObstacle && (
        <span className="absolute inset-0 flex items-center justify-center text-slate-500 text-lg pointer-events-none opacity-60">
          ⊘
        </span>
      )}
    </div>
  )
}

export function CombatGrid() {
  const {
    grid,
    combatants,
    turnOrder,
    currentTurnIndex,
    phase,
    selectedCombatantId,
    selectedAction,
    hoveredTargetId,
    rangeHighlight,
    aoePreview,
    selectedSpell,
    damagePopups,
    mapBackgroundImage,
    movementAnimation,
    selectCombatant,
    moveCombatant,
    getReachablePositions,
    placeCombatant,
    getValidTargets,
    performAttack,
    castSpell,
    setSelectedAction,
    setHoveredTarget,
    setSelectedSpell,
    setAoEPreview,
    setRangeHighlight,
    projectileTargeting,
    assignProjectile,
    breathWeaponTargeting,
    setBreathWeaponTargeting,
    performAttackReplacement,
  } = useCombatStore()

  // Drive the movement animation
  useMovementAnimation()

  // Get the actual background image URL from the filename
  const backgroundImageUrl = getMapBackgroundImage(mapBackgroundImage)

  // Helper to check if a cell has a wall obstacle
  const hasWallAt = (x: number, y: number): boolean => {
    const cell = grid.cells[y]?.[x]
    return cell?.obstacle?.type === 'wall'
  }

  // Get wall border styles based on adjacent walls (for merged outline effect)
  const getWallBorderStyle = (x: number, y: number): React.CSSProperties => {
    const borderWidth = 2
    const borderColor = 'rgba(255, 255, 255, 0.4)' // Faint white

    return {
      borderTopWidth: hasWallAt(x, y - 1) ? 0 : borderWidth,
      borderBottomWidth: hasWallAt(x, y + 1) ? 0 : borderWidth,
      borderLeftWidth: hasWallAt(x - 1, y) ? 0 : borderWidth,
      borderRightWidth: hasWallAt(x + 1, y) ? 0 : borderWidth,
      borderColor,
      borderStyle: 'solid',
    }
  }

  const [draggingCombatantId, setDraggingCombatantId] = useState<string | null>(null)
  const [dragOverCell, setDragOverCell] = useState<Position | null>(null)
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null)
  const [hoveredTokenId, setHoveredTokenId] = useState<string | null>(null)

  const currentTurnId = turnOrder[currentTurnIndex]
  const selectedCombatant = combatants.find((c) => c.id === selectedCombatantId)
  const currentCombatant = combatants.find((c) => c.id === currentTurnId)

  // Calculate reachable positions for dragging combatant (in combat) or all positions (in setup)
  // Only show green movement area when: dragging, move action selected, or in setup phase
  const reachablePositions = useMemo(() => {
    // In setup phase, use selected combatant for placement
    if (phase === 'setup') {
      const combatantId = draggingCombatantId || selectedCombatantId
      if (!combatantId) return []

      // In setup, all unoccupied cells without obstacles are valid
      const occupied = new Set(
        combatants
          .filter((c) => c.id !== combatantId && c.position.x >= 0)
          .map((c) => `${c.position.x},${c.position.y}`)
      )
      const positions: Position[] = []
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          const cell = grid.cells[y]?.[x]
          const hasBlockingObstacle = cell?.obstacle?.blocksMovement === true
          if (!occupied.has(`${x},${y}`) && !hasBlockingObstacle) {
            positions.push({ x, y })
          }
        }
      }
      return positions
    }

    // In combat, only show movement when dragging or move action is selected
    // Do NOT show just because a token is selected (clicked)
    if (!draggingCombatantId && selectedAction !== 'move') return []

    const combatantId = draggingCombatantId || currentTurnId
    if (!combatantId) return []

    if (!isCurrentTurn({ turnOrder, currentTurnIndex, combatants, grid, round: 0, phase, log: [], selectedCombatantId, damagePopups: [] }, combatantId)) return []

    return getReachablePositions(combatantId)
  }, [draggingCombatantId, selectedCombatantId, phase, selectedAction, turnOrder, currentTurnIndex, currentTurnId, getReachablePositions, combatants, grid])

  const reachableSet = useMemo(() => {
    return new Set(reachablePositions.map((p) => `${p.x},${p.y}`))
  }, [reachablePositions])

  // Calculate targetable positions and valid target IDs (enemy positions when in attack/spell targeting mode)
  const { targetablePositions, validTargetIds, attackerWeapons, isSpellTargeting: _isSpellTargeting } = useMemo(() => {
    if (phase !== 'combat' || !currentTurnId) {
      return { targetablePositions: new Set<string>(), validTargetIds: new Set<string>(), attackerWeapons: null, isSpellTargeting: false }
    }

    const attacker = combatants.find(c => c.id === currentTurnId)
    if (!attacker) {
      return { targetablePositions: new Set<string>(), validTargetIds: new Set<string>(), attackerWeapons: null, isSpellTargeting: false }
    }

    // Check if we're targeting with a single-target attack spell (not AoE, not projectile)
    const isSpellAttackTargeting = selectedSpell &&
      (selectedSpell.attackType || selectedSpell.savingThrow || selectedSpell.damage) &&
      !selectedSpell.areaOfEffect &&
      !selectedSpell.projectiles &&
      !aoePreview

    if (isSpellAttackTargeting) {
      // Spell targeting - find enemies within spell range
      const spellRange = parseSpellRangeForGrid(selectedSpell.range)
      const enemies = combatants.filter(c =>
        c.id !== currentTurnId &&
        c.currentHp > 0 &&
        c.position.x >= 0
      )

      // For character casters, only target monsters; for monster casters, only target characters
      const validEnemies = enemies.filter(c =>
        (attacker.type === 'character' && c.type === 'monster') ||
        (attacker.type === 'monster' && c.type === 'character')
      )

      // Filter by range
      const inRangeTargets = validEnemies.filter(c => {
        const dx = Math.abs(c.position.x - attacker.position.x)
        const dy = Math.abs(c.position.y - attacker.position.y)
        const distance = Math.max(dx, dy) * 5 // Simple grid distance in feet
        return distance <= spellRange
      })

      return {
        targetablePositions: new Set(inRangeTargets.map(t => `${t.position.x},${t.position.y}`)),
        validTargetIds: new Set(inRangeTargets.map(t => t.id)),
        attackerWeapons: null,
        isSpellTargeting: true
      }
    }

    // Weapon attack targeting
    if (selectedAction !== 'attack') {
      return { targetablePositions: new Set<string>(), validTargetIds: new Set<string>(), attackerWeapons: null, isSpellTargeting: false }
    }

    let meleeWeapon = undefined
    let rangedWeapon = undefined
    let monsterAction = undefined

    if (attacker.type === 'character') {
      const character = attacker.data as Character
      meleeWeapon = character.equipment?.meleeWeapon
      rangedWeapon = character.equipment?.rangedWeapon
    } else {
      const monster = attacker.data as Monster
      monsterAction = monster.actions.find(a => a.attackBonus !== undefined)
    }

    const validTargets = getValidTargets(currentTurnId, meleeWeapon, monsterAction, rangedWeapon)
    return {
      targetablePositions: new Set(validTargets.map(t => `${t.position.x},${t.position.y}`)),
      validTargetIds: new Set(validTargets.map(t => t.id)),
      attackerWeapons: { meleeWeapon, rangedWeapon, monsterAction },
      isSpellTargeting: false
    }
  }, [phase, selectedAction, currentTurnId, combatants, getValidTargets, selectedSpell, aoePreview])

  // Calculate threatened positions (cells adjacent to enemies - opportunity attack zones)
  const threatenedPositions = useMemo(() => {
    if (phase !== 'combat' || !currentCombatant || currentCombatant.type !== 'character') {
      return new Set<string>()
    }

    const threatened = new Set<string>()
    const enemies = combatants.filter(c =>
      c.type === 'monster' &&
      c.currentHp > 0 &&
      c.position.x >= 0
    )

    enemies.forEach(enemy => {
      // Standard 5ft reach (could be extended for reach weapons)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const x = enemy.position.x + dx
          const y = enemy.position.y + dy
          if (x >= 0 && x < grid.width && y >= 0 && y < grid.height) {
            threatened.add(`${x},${y}`)
          }
        }
      }
    })

    return threatened
  }, [phase, currentCombatant, combatants, grid.width, grid.height])

  // Calculate cells in weapon range for highlighting
  const weaponRangeData = useMemo(() => {
    if (!rangeHighlight) return { cells: new Set<string>(), type: undefined as 'melee' | 'ranged' | 'spell' | undefined, blockedCells: new Set<string>() }

    const { origin, range, type } = rangeHighlight
    const cellsInRange = new Set<string>()
    const blockedCells = new Set<string>() // Cells in range but blocked by LOS
    const rangeInSquares = Math.ceil(range / 5)

    for (let dy = -rangeInSquares; dy <= rangeInSquares; dy++) {
      for (let dx = -rangeInSquares; dx <= rangeInSquares; dx++) {
        const x = origin.x + dx
        const y = origin.y + dy
        if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) continue

        // Calculate distance using Chebyshev (D&D 5e diagonal = 5ft)
        const distance = Math.max(Math.abs(dx), Math.abs(dy)) * 5
        if (distance <= range && distance > 0) {
          // For ranged/spell attacks, check line of sight
          if (type === 'ranged' || type === 'spell') {
            const hasLOS = hasLineOfSight(grid, origin, { x, y })
            if (hasLOS) {
              cellsInRange.add(`${x},${y}`)
            } else {
              blockedCells.add(`${x},${y}`)
            }
          } else {
            // Melee doesn't need LOS check
            cellsInRange.add(`${x},${y}`)
          }
        }
      }
    }

    return { cells: cellsInRange, type, blockedCells }
  }, [rangeHighlight, grid])

  // Calculate AoE preview cells based on hovered position
  const aoeAffectedCells = useMemo(() => {
    if (!aoePreview || !hoveredCell) return new Set<string>()

    // For cones/lines, the target is where the mouse is pointing
    // For spheres/cubes, the target is where the effect will be centered
    const targetPosition = hoveredCell

    // Don't show preview if cursor is on the caster (for origin-based AoE)
    if (aoeOriginatesFromCaster(aoePreview.type)) {
      if (targetPosition.x === aoePreview.origin.x && targetPosition.y === aoePreview.origin.y) {
        return new Set<string>()
      }
    }

    return getAoEAffectedCells({
      type: aoePreview.type,
      size: aoePreview.size,
      origin: aoePreview.origin,
      target: targetPosition,
      originType: aoePreview.originType,
    })
  }, [aoePreview, hoveredCell])

  // Calculate movement path when hovering over a reachable cell in move mode using A* pathfinding
  // This is computed first so getDistanceToCell can use the path cost
  // Also works during drag operations by using dragOverCell as fallback
  const movementPathData = useMemo(() => {
    if (phase !== 'combat') return { fullPath: [] as Position[], displayPath: [] as Position[] }
    if (selectedAction !== 'move') return { fullPath: [], displayPath: [] }
    if (!currentCombatant || currentCombatant.position.x < 0) return { fullPath: [], displayPath: [] }

    // Use dragOverCell during drag, or hoveredCell during normal hover
    const targetCell = dragOverCell || hoveredCell
    if (!targetCell) return { fullPath: [], displayPath: [] }
    if (!reachableSet.has(`${targetCell.x},${targetCell.y}`)) return { fullPath: [], displayPath: [] }

    // Get occupied positions for pathfinding
    const occupiedPositions = new Set(
      combatants
        .filter((c) => c.id !== currentCombatant.id && c.position.x >= 0)
        .map((c) => `${c.position.x},${c.position.y}`)
    )

    // Use A* pathfinding to find optimal path around obstacles
    const path = findPath(grid, currentCombatant.position, targetCell, occupiedPositions)
    if (!path || path.length < 2) return { fullPath: [], displayPath: [] }

    // Return full path for cost calculation, display path without start position
    return { fullPath: path, displayPath: path.slice(1) }
  }, [phase, selectedAction, currentCombatant, hoveredCell, dragOverCell, reachableSet, combatants, grid])

  const movementPath = movementPathData.displayPath

  // Calculate distance from current combatant to hovered/dragged cell
  // Uses actual path cost in move mode (accounts for difficult terrain), simple distance otherwise
  const getDistanceToCell = (x: number, y: number): number | undefined => {
    if (!currentCombatant || currentCombatant.position.x < 0) return undefined

    // Check both dragOverCell (during drag) and hoveredCell (during hover)
    const targetCell = dragOverCell || hoveredCell
    if (!targetCell) return undefined
    if (targetCell.x !== x || targetCell.y !== y) return undefined

    // In move mode with a valid path, use actual path cost (accounts for difficult terrain)
    if (selectedAction === 'move' && movementPathData.fullPath.length >= 2) {
      return calculatePathCost(grid, movementPathData.fullPath)
    }

    // Otherwise use simple distance calculation
    return calculateMovementDistance(currentCombatant.position, { x, y })
  }

  // Check if a cell is occupied by another combatant
  // Check if a cell is occupied by any combatant's footprint
  const isCellOccupied = (x: number, y: number, excludeId?: string) => {
    return combatants.some((c) => {
      if (c.id === excludeId) return false
      if (c.position.x < 0 || c.position.y < 0) return false
      const occupied = getOccupiedCellKeys(c.position, getCombatantSize(c))
      return occupied.has(`${x},${y}`)
    })
  }

  // Check if a combatant can be dragged
  const canDragCombatant = (combatantId: string) => {
    // Block dragging during movement animation
    if (movementAnimation) return false

    const combatant = combatants.find((c) => c.id === combatantId)
    if (!combatant) return false
    if (combatant.currentHp <= 0) return false

    if (phase === 'setup') {
      return true // Anyone can be placed in setup
    }

    if (phase === 'combat') {
      // Only current turn combatant can be dragged, and only player characters
      return combatantId === currentTurnId && combatant.type === 'character'
    }

    return false
  }

  // Check if drop is valid at position
  // Check if a position is valid for dropping a combatant (checks entire footprint)
  const isValidDropPosition = (x: number, y: number) => {
    if (!draggingCombatantId) return false

    const draggingCombatant = combatants.find((c) => c.id === draggingCombatantId)
    if (!draggingCombatant) return false

    const size = getCombatantSize(draggingCombatant)
    const footprint = getFootprintSize(size)

    // Check all cells in the creature's footprint
    for (let dy = 0; dy < footprint; dy++) {
      for (let dx = 0; dx < footprint; dx++) {
        const checkX = x + dx
        const checkY = y + dy

        // Bounds check
        if (checkX >= grid.width || checkY >= grid.height) return false

        // Obstacle check
        const cell = grid.cells[checkY]?.[checkX]
        if (cell?.obstacle?.blocksMovement) return false

        // Occupancy check (another creature in this cell)
        if (isCellOccupied(checkX, checkY, draggingCombatantId)) return false
      }
    }

    if (phase === 'setup') {
      return true
    }

    if (phase === 'combat') {
      return reachableSet.has(`${x},${y}`)
    }

    return false
  }

  const handleCellClick = (x: number, y: number) => {
    // Block interactions during movement animation
    if (movementAnimation) return

    const position: Position = { x, y }

    // In AoE spell mode, clicking casts the spell at this location
    if (phase === 'combat' && aoePreview && selectedSpell && currentTurnId) {
      // Find a combatant at this position to use as target, or use undefined for area-only
      const targetAtPosition = combatants.find(
        c => c.position.x === x && c.position.y === y && c.currentHp > 0
      )
      castSpell(currentTurnId, selectedSpell, targetAtPosition?.id, position)
      // Clear spell state
      setSelectedSpell(undefined)
      setAoEPreview(undefined)
      setRangeHighlight(undefined)
      setSelectedAction(undefined)
      return
    }

    // In breath weapon targeting mode, clicking fires the breath weapon in that direction
    if (phase === 'combat' && aoePreview && breathWeaponTargeting && currentTurnId) {
      performAttackReplacement(breathWeaponTargeting.attackerId, breathWeaponTargeting.replacementId, position)
      // Clear breath weapon state
      setBreathWeaponTargeting(undefined)
      setAoEPreview(undefined)
      setRangeHighlight(undefined)
      setSelectedAction(undefined)
      return
    }

    // In setup phase, place selected combatant
    if (phase === 'setup' && selectedCombatantId) {
      if (!isCellOccupied(x, y, selectedCombatantId)) {
        placeCombatant(selectedCombatantId, position)
      }
      return
    }

    // In combat phase, move if this is a reachable cell
    if (phase === 'combat' && selectedCombatantId && reachableSet.has(`${x},${y}`)) {
      moveCombatant(selectedCombatantId, position)
      return
    }
  }

  const handleTokenClick = (combatantId: string) => {
    // Block interactions during movement animation
    if (movementAnimation) return

    // In projectile targeting mode, clicking an enemy token assigns a projectile
    if (phase === 'combat' && projectileTargeting && currentTurnId) {
      // Only allow targeting enemies (not self)
      if (combatantId !== currentTurnId) {
        const targetCombatant = combatants.find(c => c.id === combatantId)
        // Only assign to living enemies
        if (targetCombatant && targetCombatant.currentHp > 0) {
          assignProjectile(combatantId)
        }
      }
      return
    }

    // In AoE spell mode, clicking a token casts the spell targeting that combatant
    if (phase === 'combat' && aoePreview && selectedSpell && currentTurnId) {
      const targetCombatant = combatants.find(c => c.id === combatantId)
      castSpell(currentTurnId, selectedSpell, combatantId, targetCombatant?.position)
      // Clear spell state
      setSelectedSpell(undefined)
      setAoEPreview(undefined)
      setRangeHighlight(undefined)
      setSelectedAction(undefined)
      return
    }

    // In breath weapon targeting mode, clicking a token fires the breath weapon toward that combatant
    if (phase === 'combat' && aoePreview && breathWeaponTargeting && currentTurnId) {
      const targetCombatant = combatants.find(c => c.id === combatantId)
      if (targetCombatant) {
        performAttackReplacement(breathWeaponTargeting.attackerId, breathWeaponTargeting.replacementId, targetCombatant.position)
        // Clear breath weapon state
        setBreathWeaponTargeting(undefined)
        setAoEPreview(undefined)
        setRangeHighlight(undefined)
        setSelectedAction(undefined)
      }
      return
    }

    // In single-target spell mode, clicking a valid target casts the spell
    if (phase === 'combat' && selectedSpell && !aoePreview && !projectileTargeting && currentTurnId && validTargetIds.has(combatantId)) {
      setHoveredTarget(undefined)
      castSpell(currentTurnId, selectedSpell, combatantId)
      // Clear spell state
      setSelectedSpell(undefined)
      setRangeHighlight(undefined)
      setSelectedAction(undefined)
      return
    }

    // In attack mode, clicking a valid target performs the attack
    if (phase === 'combat' && selectedAction === 'attack' && currentTurnId && validTargetIds.has(combatantId)) {
      setHoveredTarget(undefined)
      performAttack(
        currentTurnId,
        combatantId,
        attackerWeapons?.meleeWeapon,
        attackerWeapons?.monsterAction,
        attackerWeapons?.rangedWeapon
      )
      setSelectedAction(undefined)
      return
    }

    // Otherwise, toggle selection
    selectCombatant(combatantId === selectedCombatantId ? undefined : combatantId)
  }

  const handleTokenDragStart = (combatantId: string) => {
    setDraggingCombatantId(combatantId)
    selectCombatant(combatantId)
    // Auto-enter move mode when dragging in combat phase
    if (phase === 'combat') {
      setSelectedAction('move')
    }
  }

  const handleTokenDragEnd = () => {
    setDraggingCombatantId(null)
    setDragOverCell(null)
    // Clear move mode when drag ends (whether successful or cancelled)
    if (phase === 'combat' && selectedAction === 'move') {
      setSelectedAction(undefined)
    }
  }

  const handleCellDragOver = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = isValidDropPosition(x, y) ? 'move' : 'none'
    setDragOverCell({ x, y })
  }

  const handleCellDragLeave = () => {
    setDragOverCell(null)
  }

  const handleCellDrop = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault()
    const combatantId = e.dataTransfer.getData('text/plain')

    if (!combatantId) return
    if (!isValidDropPosition(x, y)) return

    const position: Position = { x, y }

    if (phase === 'setup') {
      placeCombatant(combatantId, position)
    } else if (phase === 'combat') {
      moveCombatant(combatantId, position)
    }

    setDraggingCombatantId(null)
    setDragOverCell(null)
  }

  return (
    <div className="overflow-auto border border-slate-700 rounded-lg bg-slate-950">
      <div
        className="relative"
        style={{
          width: grid.width * CELL_SIZE,
          height: grid.height * CELL_SIZE,
        }}
      >
        {/* Background image layer */}
        {backgroundImageUrl && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <img
              src={backgroundImageUrl}
              alt="Map background"
              className="w-full h-full object-cover opacity-80"
            />
          </div>
        )}

        {/* Grid layer */}
        <div
          className="relative z-10"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${grid.width}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${grid.height}, ${CELL_SIZE}px)`,
          }}
        >
        {/* Grid cells */}
        {Array.from({ length: grid.height }).map((_, y) =>
          Array.from({ length: grid.width }).map((_, x) => {
            const cellKey = `${x},${y}`
            const cell = grid.cells[y]?.[x] ?? { x, y, elevation: 0 }
            const isDragOver = dragOverCell?.x === x && dragOverCell?.y === y
            const isValidDrop = isValidDropPosition(x, y)
            const isTargetable = targetablePositions.has(cellKey)
            const isThreatened = threatenedPositions.has(cellKey) && selectedAction === 'move'
            const isInWeaponRange = weaponRangeData.cells.has(cellKey) ? weaponRangeData.type : undefined
            const isBlockedByLOS = weaponRangeData.blockedCells.has(cellKey)
            const isInAoEPreview = aoeAffectedCells.has(cellKey)
            const distance = getDistanceToCell(x, y)

            // Calculate wall border style for outline rendering
            const isWallCell = cell.obstacle?.type === 'wall'

            return (
              <GridCell
                key={cellKey}
                x={x}
                y={y}
                cell={cell}
                isReachable={reachableSet.has(cellKey)}
                isSelected={selectedCombatant ? getOccupiedCellKeys(selectedCombatant.position, getCombatantSize(selectedCombatant)).has(cellKey) : false}
                isDragOver={isDragOver}
                isValidDrop={isValidDrop}
                isTargetable={isTargetable}
                isThreatened={isThreatened}
                isInWeaponRange={isInWeaponRange}
                isBlockedByLOS={isBlockedByLOS}
                isInAoEPreview={isInAoEPreview}
                distance={distance}
                wallBorderStyle={isWallCell ? getWallBorderStyle(x, y) : undefined}
                onDragOver={(e) => handleCellDragOver(e, x, y)}
                onDragLeave={handleCellDragLeave}
                onDrop={(e) => handleCellDrop(e, x, y)}
                onClick={() => handleCellClick(x, y)}
                onMouseEnter={() => setHoveredCell({ x, y })}
                onMouseLeave={() => setHoveredCell(null)}
              />
            )
          })
        )}
        </div>

        {/* Movement path overlay */}
        {movementPath.map((pos, index) => (
          <PathSegment
            key={`path-${pos.x}-${pos.y}`}
            position={pos}
            nextPosition={movementPath[index + 1]}
          />
        ))}

        {/* Tokens layer */}
        {combatants.map((combatant) => {
          // Don't render tokens that aren't placed yet
          if (combatant.position.x < 0 || combatant.position.y < 0) return null

          const isDragging = draggingCombatantId === combatant.id
          const canDrag = canDragCombatant(combatant.id)
          const isHovered = hoveredTokenId === combatant.id

          // Get size-based token dimensions
          const size = getCombatantSize(combatant)
          const footprint = getFootprintSize(size)
          const visualScale = getVisualScale(size)
          const tokenSize = footprint * CELL_SIZE - 8

          // Check if this combatant is currently animating movement
          const isAnimatingMovement = movementAnimation?.combatantId === combatant.id
          const displayPosition = isAnimatingMovement && movementAnimation
            ? movementAnimation.path[movementAnimation.currentIndex]
            : combatant.position

          return (
            <div
              key={combatant.id}
              className={cn(
                'absolute',
                // Use faster transition when animating movement for smooth stepping
                isAnimatingMovement ? 'transition-[left,top] duration-100 ease-linear' : 'transition-all duration-150',
                isDragging && 'opacity-50 scale-90 z-50',
                isHovered && !isDragging && 'z-40',
                !isDragging && !isHovered && 'z-10'
              )}
              style={{
                left: displayPosition.x * CELL_SIZE + 4,
                top: displayPosition.y * CELL_SIZE + 4,
                width: tokenSize,
                height: tokenSize,
              }}
            >
              <Token
                combatant={combatant}
                isSelected={selectedCombatantId === combatant.id}
                isCurrentTurn={currentTurnId === combatant.id && phase === 'combat'}
                isDraggable={canDrag}
                isHoveredTarget={hoveredTargetId === combatant.id}
                suppressTooltip={!!aoePreview}
                visualScale={visualScale}
                onClick={() => handleTokenClick(combatant.id)}
                onDragStart={() => handleTokenDragStart(combatant.id)}
                onDragEnd={handleTokenDragEnd}
                onHoverChange={(hovered) => {
                  setHoveredTokenId(hovered ? combatant.id : null)
                  // Also update hoveredCell so AoE preview continues to work when hovering tokens
                  if (hovered) {
                    setHoveredCell(combatant.position)
                  }
                  // Highlight valid targets when hovering in attack or spell targeting mode
                  if ((selectedAction === 'attack' || (selectedSpell && !aoePreview && !projectileTargeting)) && validTargetIds.has(combatant.id)) {
                    setHoveredTarget(hovered ? combatant.id : undefined)
                  }
                }}
              />
            </div>
          )
        })}

        {/* Damage popups layer */}
        {damagePopups.map((popup) => (
          <div
            key={popup.id}
            className="absolute z-[200] flex items-center justify-center pointer-events-none"
            style={{
              left: popup.position.x * CELL_SIZE,
              top: popup.position.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
            }}
          >
            <DamagePopup
              amount={popup.amount}
              damageType={popup.damageType}
              isCritical={popup.isCritical}
              velocityX={popup.velocityX}
              popupType={popup.popupType}
              text={popup.text}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
