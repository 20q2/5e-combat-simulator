import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useCombatStore, isCurrentTurn } from '@/stores/combatStore'
import { Token } from './Token'
import { DamagePopup } from './DamagePopup'
import { calculateMovementDistance } from '@/lib/movement'
import { findPath, calculatePathCost } from '@/lib/pathfinding'
import type { Position, Character, Monster, GridCell as GridCellType } from '@/types'

const CELL_SIZE = 56 // pixels

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
  distance?: number
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

// Get obstacle image path (returns null if no image available)
function getObstacleImage(type: string): string | null {
  switch (type) {
    case 'wall': return '/src/assets/obstacles/wall.png'
    case 'tree': return '/src/assets/obstacles/tree.png'
    case 'pillar': return '/src/assets/obstacles/pillar.png'
    case 'boulder': return '/src/assets/obstacles/boulder.png'
    case 'furniture': return '/src/assets/obstacles/furniture.png'
    default: return null
  }
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
  distance,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: GridCellProps) {
  const hasObstacle = cell.obstacle !== undefined
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
        'border border-slate-700 transition-colors cursor-pointer bg-slate-900/50 relative',
        // Weapon range highlighting (before other highlights so they can override)
        isInWeaponRange === 'melee' && 'bg-rose-900/30 border-rose-700/50',
        isInWeaponRange === 'ranged' && 'bg-orange-900/30 border-orange-700/50',
        isInWeaponRange === 'spell' && 'bg-violet-900/30 border-violet-700/50',
        // Terrain backgrounds
        hasDifficultTerrain && 'bg-amber-900/40',
        hasHazardTerrain && 'bg-red-900/50 animate-pulse',
        hasWaterTerrain && 'bg-blue-900/50',
        // Elevation styling
        isElevated && 'bg-slate-700/60 border-slate-500 shadow-inner',
        // Obstacle styling
        hasObstacle && 'bg-slate-800',
        hasObstacle && cell.obstacle?.type === 'wall' && 'bg-stone-800',
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
      {/* Obstacle image or icon */}
      {hasObstacle && (
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

      {/* Distance indicator on hover */}
      {distance !== undefined && distance > 0 && !hasObstacle && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/80 pointer-events-none">
          {distance}
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
    damagePopups,
    selectCombatant,
    moveCombatant,
    getReachablePositions,
    placeCombatant,
    getValidTargets,
    performAttack,
    setSelectedAction,
    setHoveredTarget,
  } = useCombatStore()

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

  // Calculate targetable positions and valid target IDs (enemy positions when in attack mode)
  const { targetablePositions, validTargetIds, attackerWeapons } = useMemo(() => {
    if (phase !== 'combat' || selectedAction !== 'attack' || !currentTurnId) {
      return { targetablePositions: new Set<string>(), validTargetIds: new Set<string>(), attackerWeapons: null }
    }

    const attacker = combatants.find(c => c.id === currentTurnId)
    if (!attacker) {
      return { targetablePositions: new Set<string>(), validTargetIds: new Set<string>(), attackerWeapons: null }
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
      attackerWeapons: { meleeWeapon, rangedWeapon, monsterAction }
    }
  }, [phase, selectedAction, currentTurnId, combatants, getValidTargets])

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
    if (!rangeHighlight) return { cells: new Set<string>(), type: undefined as 'melee' | 'ranged' | 'spell' | undefined }

    const { origin, range, type } = rangeHighlight
    const cellsInRange = new Set<string>()
    const rangeInSquares = Math.ceil(range / 5)

    for (let dy = -rangeInSquares; dy <= rangeInSquares; dy++) {
      for (let dx = -rangeInSquares; dx <= rangeInSquares; dx++) {
        const x = origin.x + dx
        const y = origin.y + dy
        if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) continue

        // Calculate distance using Chebyshev (D&D 5e diagonal = 5ft)
        const distance = Math.max(Math.abs(dx), Math.abs(dy)) * 5
        if (distance <= range && distance > 0) {
          cellsInRange.add(`${x},${y}`)
        }
      }
    }

    return { cells: cellsInRange, type }
  }, [rangeHighlight, grid.width, grid.height])

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
  const isCellOccupied = (x: number, y: number, excludeId?: string) => {
    return combatants.some(
      (c) => c.id !== excludeId && c.position.x === x && c.position.y === y
    )
  }

  // Check if a combatant can be dragged
  const canDragCombatant = (combatantId: string) => {
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
  const isValidDropPosition = (x: number, y: number) => {
    if (!draggingCombatantId) return false
    if (isCellOccupied(x, y, draggingCombatantId)) return false

    if (phase === 'setup') {
      return true
    }

    if (phase === 'combat') {
      return reachableSet.has(`${x},${y}`)
    }

    return false
  }

  const handleCellClick = (x: number, y: number) => {
    const position: Position = { x, y }

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
          display: 'grid',
          gridTemplateColumns: `repeat(${grid.width}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${grid.height}, ${CELL_SIZE}px)`,
          width: grid.width * CELL_SIZE,
          height: grid.height * CELL_SIZE,
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
            const distance = getDistanceToCell(x, y)

            return (
              <GridCell
                key={cellKey}
                x={x}
                y={y}
                cell={cell}
                isReachable={reachableSet.has(cellKey)}
                isSelected={selectedCombatant?.position.x === x && selectedCombatant?.position.y === y}
                isDragOver={isDragOver}
                isValidDrop={isValidDrop}
                isTargetable={isTargetable}
                isThreatened={isThreatened}
                isInWeaponRange={isInWeaponRange}
                distance={distance}
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

          return (
            <div
              key={combatant.id}
              className={cn(
                'absolute transition-all duration-150',
                isDragging && 'opacity-50 scale-90 z-50',
                isHovered && !isDragging && 'z-40',
                !isDragging && !isHovered && 'z-10'
              )}
              style={{
                left: combatant.position.x * CELL_SIZE + 4,
                top: combatant.position.y * CELL_SIZE + 4,
                width: CELL_SIZE - 8,
                height: CELL_SIZE - 8,
              }}
            >
              <Token
                combatant={combatant}
                isSelected={selectedCombatantId === combatant.id}
                isCurrentTurn={currentTurnId === combatant.id && phase === 'combat'}
                isDraggable={canDrag}
                isHoveredTarget={hoveredTargetId === combatant.id}
                onClick={() => handleTokenClick(combatant.id)}
                onDragStart={() => handleTokenDragStart(combatant.id)}
                onDragEnd={handleTokenDragEnd}
                onHoverChange={(hovered) => {
                  setHoveredTokenId(hovered ? combatant.id : null)
                  // Highlight valid targets when hovering in attack mode
                  if (selectedAction === 'attack' && validTargetIds.has(combatant.id)) {
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
