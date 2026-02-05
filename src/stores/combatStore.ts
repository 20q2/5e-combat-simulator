import { create } from 'zustand'
import type {
  CombatState,
  Combatant,
  Grid,
  GridCell,
  Position,
  CombatLogEntry,
  Character,
  Monster,
  Weapon,
  MonsterAction,
  Spell,
  TerrainDefinition,
  DamagePopup,
  DamageType,
  CombatPopupType,
} from '@/types'
import { rollInitiative, rollDie } from '@/engine/dice'
import { getAbilityModifier } from '@/types'
import { resolveAttack, canAttackTarget, getSpellSaveDC, getSpellAttackBonus, rollCombatantSavingThrow, rollDeathSave, selectWeaponForTarget, type AttackResult } from '@/engine/combat'
import { rollAttack, rollDamage } from '@/engine/dice'
import { getNextAIAction } from '@/engine/ai'
// Movement calculations now handled by pathfinding module
import { findPath, getReachablePositions as getReachableFromPathfinding, blocksMovement, calculatePathCost } from '@/lib/pathfinding'
import {
  initializeRacialAbilityUses,
  checkRelentlessEndurance,
  applyRelentlessEndurance,
  useRacialAbility as decrementRacialAbilityUse,
} from '@/engine/racialAbilities'
import {
  initializeClassFeatureUses,
  getSecondWindFeature,
  canUseSecondWind,
  rollSecondWind,
  getActionSurgeFeature,
  canUseActionSurge,
  useClassFeature,
  canUseCunningAction,
  getMaxAttacksPerAction,
} from '@/engine/classAbilities'
import {
  applyOnHitMasteryEffect,
  applyGrazeOnMiss,
} from '@/engine/weaponMastery'
import { getAoEAffectedCells } from '@/lib/aoeShapes'
import { getCombatantSize, getOccupiedCells, getFootprintSize } from '@/lib/creatureSize'

/**
 * Helper to immutably update grid cell occupancy.
 * Creates new arrays only for the rows that change, preserving referential equality for unchanged rows.
 */
function updateGridOccupancy(
  grid: Grid,
  updates: Array<{ x: number; y: number; occupiedBy: string | undefined }>
): Grid {
  if (updates.length === 0) return grid

  // Group updates by row for efficient row-level cloning
  const updatesByRow = new Map<number, Array<{ x: number; occupiedBy: string | undefined }>>()
  for (const update of updates) {
    if (!updatesByRow.has(update.y)) {
      updatesByRow.set(update.y, [])
    }
    updatesByRow.get(update.y)!.push({ x: update.x, occupiedBy: update.occupiedBy })
  }

  // Create new cells array with updated rows
  const newCells = grid.cells.map((row, y) => {
    const rowUpdates = updatesByRow.get(y)
    if (!rowUpdates) return row // No changes to this row, keep reference

    // Clone the row and apply updates
    const newRow = row.map((cell, x) => {
      const update = rowUpdates.find((u) => u.x === x)
      if (update) {
        return { ...cell, occupiedBy: update.occupiedBy }
      }
      return cell
    })
    return newRow
  })

  return { ...grid, cells: newCells }
}

// Simplified input type for adding combatants
type AddCombatantInput = {
  name: string
  type: 'character' | 'monster'
  data: Character | Monster
  position: Position
}

interface CombatStore extends CombatState {
  // Setup actions
  initializeGrid: (width: number, height: number) => void
  initializeGridWithTerrain: (width: number, height: number, terrain: TerrainDefinition[], backgroundImage?: string) => void
  setMapBackgroundImage: (image: string | undefined) => void
  addCombatant: (input: AddCombatantInput) => void
  removeCombatant: (id: string) => void
  placeCombatant: (id: string, position: Position) => void

  // Combat flow
  startCombat: () => void
  rollAllInitiative: () => void
  nextTurn: () => void
  endCombat: () => void

  // Selection
  selectCombatant: (id: string | undefined) => void
  setSelectedAction: (action: CombatState['selectedAction']) => void
  setHoveredTarget: (id: string | undefined) => void
  setRangeHighlight: (highlight: CombatState['rangeHighlight']) => void
  setAoEPreview: (preview: CombatState['aoePreview']) => void
  setSelectedSpell: (spell: Spell | undefined) => void

  // Projectile targeting
  startProjectileTargeting: (spell: Spell) => void
  assignProjectile: (targetId: string) => void
  unassignProjectile: (targetId: string) => void
  confirmProjectileTargeting: () => void
  cancelProjectileTargeting: () => void

  // Reactions (Shield, opportunity attacks, etc.)
  useReactionSpell: (spellId: string) => void
  skipReaction: () => void

  // Movement
  moveCombatant: (id: string, to: Position) => void
  canMoveTo: (combatantId: string, to: Position) => boolean
  getReachablePositions: (combatantId: string) => Position[]
  useDisengage: () => void

  // Movement animation
  advanceMovementAnimation: () => void
  finishMovementAnimation: () => void
  isAnimating: () => boolean

  // Combat actions
  dealDamage: (targetId: string, amount: number, source?: string) => void
  healDamage: (targetId: string, amount: number, source?: string) => void
  performAttack: (attackerId: string, targetId: string, weapon?: Weapon, monsterAction?: MonsterAction, rangedWeapon?: Weapon) => AttackResult | null
  performOpportunityAttack: (attackerId: string, targetId: string) => AttackResult | null
  useDash: () => void
  useDodge: () => void
  getValidTargets: (attackerId: string, weapon?: Weapon, monsterAction?: MonsterAction, rangedWeapon?: Weapon) => Combatant[]
  castSpell: (casterId: string, spell: Spell, targetId?: string, targetPosition?: Position, projectileAssignments?: { targetId: string; count: number }[]) => boolean
  getAvailableSpells: (combatantId: string) => Spell[]
  makeDeathSave: (combatantId: string) => void
  stabilize: (combatantId: string) => void
  getThreateningEnemies: (combatantId: string) => Combatant[]

  // Racial abilities
  useRacialAbility: (combatantId: string, abilityId: string) => void

  // Class abilities
  useSecondWind: (combatantId: string) => void
  useActionSurge: (combatantId: string) => void
  useCunningDash: () => void
  useCunningDisengage: () => void
  useCunningHide: () => void

  // Turn management
  useAction: () => void
  useBonusAction: () => void
  useReaction: () => void
  endTurn: () => void

  // AI
  executeAITurn: () => Promise<void>
  isAITurn: () => boolean

  // Logging
  addLogEntry: (entry: Omit<CombatLogEntry, 'id' | 'timestamp' | 'round'>) => void

  // Combat popups
  addDamagePopup: (targetId: string, amount: number, damageType: DamageType, isCritical?: boolean) => void
  addCombatPopup: (targetId: string, popupType: CombatPopupType, text?: string) => void
  addHealPopup: (targetId: string, amount: number) => void
  removeDamagePopup: (id: string) => void

  // Reset
  resetCombat: () => void
}

function createEmptyGrid(width: number, height: number): Grid {
  const cells: GridCell[][] = []
  for (let y = 0; y < height; y++) {
    cells[y] = []
    for (let x = 0; x < width; x++) {
      cells[y][x] = { x, y, elevation: 0 }
    }
  }
  return { width, height, cells }
}

function createGridWithTerrain(width: number, height: number, terrain: TerrainDefinition[]): Grid {
  const grid = createEmptyGrid(width, height)

  // Apply terrain definitions
  for (const def of terrain) {
    const cell = grid.cells[def.y]?.[def.x]
    if (cell) {
      if (def.terrain) cell.terrain = def.terrain
      if (def.obstacle) cell.obstacle = def.obstacle
      if (def.elevation !== undefined) cell.elevation = def.elevation
      if (def.stairConnection) cell.stairConnection = def.stairConnection
    }
  }

  return grid
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Get reaction spells available for a combatant based on trigger type
// Helper to check if combat has ended (all monsters dead = victory, all characters dead = defeat)
function checkCombatEnd(combatants: Combatant[]): 'victory' | 'defeat' | null {
  const characters = combatants.filter(c => c.type === 'character')
  const monsters = combatants.filter(c => c.type === 'monster')

  // Check if all monsters are dead (HP <= 0)
  const allMonstersDead = monsters.length > 0 && monsters.every(m => m.currentHp <= 0)

  // Check if all characters are dead (3 death save failures)
  const allCharactersDead = characters.length > 0 && characters.every(c =>
    c.deathSaves.failures >= 3
  )

  if (allMonstersDead) return 'victory'
  if (allCharactersDead) return 'defeat'
  return null
}

function getAvailableReactionSpells(
  combatant: Combatant,
  trigger: 'on_hit' | 'on_magic_missile' | 'enemy_casts_spell' | 'take_damage'
): Spell[] {
  if (combatant.type !== 'character') return []
  if (combatant.hasReacted) return []

  const character = combatant.data as Character
  const knownSpells = character.knownSpells || []
  const preparedSpells = character.preparedSpells || []
  const allSpells = [...knownSpells, ...preparedSpells]

  // Filter for reaction spells matching the trigger
  return allSpells.filter(spell => {
    if (!spell.reaction) return false
    if (spell.reaction.trigger !== trigger) return false

    // Check if character has spell slots available (for leveled spells)
    if (spell.level > 0 && character.spellSlots) {
      const slotLevel = spell.level as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
      const slots = character.spellSlots[slotLevel]
      if (!slots || slots.current <= 0) return false
    }

    return true
  })
}

const initialState: CombatState = {
  grid: createEmptyGrid(20, 15),
  combatants: [],
  turnOrder: [],
  currentTurnIndex: 0,
  round: 0,
  phase: 'setup',
  log: [],
  selectedCombatantId: undefined,
  selectedAction: undefined,
  targetingMode: undefined,
  hoveredTargetId: undefined,
  damagePopups: [],
  pendingReaction: undefined,
  movementAnimation: undefined,
  pendingMovement: undefined,
}

export const useCombatStore = create<CombatStore>((set, get) => ({
  ...initialState,

  initializeGrid: (width, height) => {
    set({ grid: createEmptyGrid(width, height), mapBackgroundImage: undefined })
  },

  initializeGridWithTerrain: (width, height, terrain, backgroundImage) => {
    set({ grid: createGridWithTerrain(width, height, terrain), mapBackgroundImage: backgroundImage })
  },

  setMapBackgroundImage: (image) => {
    set({ mapBackgroundImage: image })
  },

  addCombatant: (input) => {
    // Extract HP from the data based on type
    let maxHp: number
    let currentHp: number

    if (input.type === 'character') {
      const char = input.data as Character
      maxHp = char.maxHp
      currentHp = char.currentHp
    } else {
      const monster = input.data as Monster
      maxHp = monster.hp
      currentHp = monster.hp
    }

    const combatant: Combatant = {
      id: generateId(),
      name: input.name,
      type: input.type,
      data: input.data,
      position: input.position,
      initiative: 0,
      currentHp,
      maxHp,
      temporaryHp: 0,
      conditions: [],
      hasActed: false,
      hasBonusActed: false,
      hasReacted: false,
      movementUsed: 0,
      deathSaves: { successes: 0, failures: 0 },
      isStable: false,
      racialAbilityUses: {},
      classFeatureUses: {},
      usedSneakAttackThisTurn: false,
      attacksMadeThisTurn: 0,
      // D&D 2024 Weapon Mastery tracking
      usedCleaveThisTurn: false,
      usedNickThisTurn: false,
      vexedBy: undefined,
    }

    // Initialize racial and class ability uses for characters
    if (input.type === 'character') {
      combatant.racialAbilityUses = initializeRacialAbilityUses(combatant)
      combatant.classFeatureUses = initializeClassFeatureUses(combatant)
    }

    // Update grid cell occupancy immutably
    const { grid } = get()
    const { x, y } = combatant.position
    const gridUpdates: Array<{ x: number; y: number; occupiedBy: string | undefined }> = []
    if (x >= 0 && x < grid.width && y >= 0 && y < grid.height) {
      gridUpdates.push({ x, y, occupiedBy: combatant.id })
    }

    set((state) => ({
      combatants: [...state.combatants, combatant],
      grid: updateGridOccupancy(state.grid, gridUpdates),
    }))
  },

  removeCombatant: (id) => {
    const { combatants, grid } = get()
    const combatant = combatants.find((c) => c.id === id)

    // Build updates to clear all grid cells occupied by this combatant's footprint
    const gridUpdates: Array<{ x: number; y: number; occupiedBy: string | undefined }> = []
    if (combatant) {
      const size = getCombatantSize(combatant)
      const cells = getOccupiedCells(combatant.position, size)
      for (const cell of cells) {
        if (grid.cells[cell.y]?.[cell.x]) {
          gridUpdates.push({ x: cell.x, y: cell.y, occupiedBy: undefined })
        }
      }
    }

    set((state) => ({
      combatants: state.combatants.filter((c) => c.id !== id),
      turnOrder: state.turnOrder.filter((tid) => tid !== id),
      grid: updateGridOccupancy(state.grid, gridUpdates),
      selectedCombatantId: state.selectedCombatantId === id ? undefined : state.selectedCombatantId,
    }))
  },

  placeCombatant: (id, position) => {
    const { combatants, grid } = get()
    const combatant = combatants.find((c) => c.id === id)

    if (!combatant) return

    // Get creature size and calculate footprint cells
    const size = getCombatantSize(combatant)
    const newCells = getOccupiedCells(position, size)

    // Validate all cells in footprint
    for (const cell of newCells) {
      // Bounds check
      if (cell.x < 0 || cell.x >= grid.width || cell.y < 0 || cell.y >= grid.height) {
        return
      }

      const gridCell = grid.cells[cell.y]?.[cell.x]

      // Check if blocked by obstacle
      if (blocksMovement(gridCell)) {
        return
      }

      // Check if occupied by another combatant
      if (gridCell?.occupiedBy && gridCell.occupiedBy !== id) {
        return
      }
    }

    // Build grid updates for old and new position cells
    const gridUpdates: Array<{ x: number; y: number; occupiedBy: string | undefined }> = []

    // Clear old position cells
    const oldCells = getOccupiedCells(combatant.position, size)
    for (const cell of oldCells) {
      if (cell.x >= 0 && cell.y >= 0 && grid.cells[cell.y]?.[cell.x]) {
        gridUpdates.push({ x: cell.x, y: cell.y, occupiedBy: undefined })
      }
    }

    // Mark new position cells
    for (const cell of newCells) {
      gridUpdates.push({ x: cell.x, y: cell.y, occupiedBy: id })
    }

    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id ? { ...c, position } : c
      ),
      grid: updateGridOccupancy(state.grid, gridUpdates),
    }))
  },

  startCombat: () => {
    const { combatants } = get()
    if (combatants.length < 2) return

    get().rollAllInitiative()

    set({
      phase: 'combat',
      round: 1,
      currentTurnIndex: 0,
    })

    get().addLogEntry({
      type: 'other',
      actorName: 'System',
      message: 'Combat has begun!',
    })
  },

  rollAllInitiative: () => {
    const { combatants } = get()

    const updatedCombatants = combatants.map((c) => {
      const dexMod = getAbilityModifier(
        c.type === 'character'
          ? (c.data as Character).abilityScores.dexterity
          : (c.data as Monster).abilityScores.dexterity
      )
      const roll = rollInitiative(dexMod)

      get().addLogEntry({
        type: 'initiative',
        actorId: c.id,
        actorName: c.name,
        message: `rolls initiative: ${roll.breakdown}`,
      })

      return { ...c, initiative: roll.total }
    })

    // Sort by initiative (highest first)
    const sorted = [...updatedCombatants].sort((a, b) => b.initiative - a.initiative)
    const turnOrder = sorted.map((c) => c.id)

    set({
      combatants: updatedCombatants,
      turnOrder,
      phase: 'initiative',
    })
  },

  nextTurn: () => {
    // Don't advance turns if combat has ended
    const currentPhase = get().phase
    if (currentPhase === 'victory' || currentPhase === 'defeat') {
      return
    }

    const { turnOrder, currentTurnIndex, combatants } = get()

    // Reset current combatant's turn state
    const currentId = turnOrder[currentTurnIndex]
    const updatedCombatants = combatants.map((c) =>
      c.id === currentId
        ? {
            ...c,
            hasActed: false,
            hasBonusActed: false,
            movementUsed: 0,
            usedSneakAttackThisTurn: false,
            attacksMadeThisTurn: 0,
            // Reset weapon mastery per-turn flags
            usedCleaveThisTurn: false,
            usedNickThisTurn: false,
          }
        : c
    )

    let nextIndex = currentTurnIndex + 1
    let newRound = get().round

    // Check if we've completed a round
    if (nextIndex >= turnOrder.length) {
      nextIndex = 0
      newRound += 1

      get().addLogEntry({
        type: 'other',
        actorName: 'System',
        message: `Round ${newRound} begins`,
      })
    }

    // Get the next combatant and expire their conditions
    const nextCombatantId = turnOrder[nextIndex]
    const combatantsWithExpiredConditions = updatedCombatants.map((c) => {
      if (c.id !== nextCombatantId) return c

      // Decrement condition durations and remove expired ones
      // Duration -1 or undefined means indefinite (e.g., unconscious), don't decrement those
      const expiredConditions: string[] = []
      const newConditions = c.conditions
        .map((cond) => {
          if (cond.duration === undefined || cond.duration === -1) return cond // Indefinite condition
          const newDuration = cond.duration - 1
          if (newDuration <= 0) {
            expiredConditions.push(cond.condition)
            return null
          }
          return { ...cond, duration: newDuration }
        })
        .filter((cond): cond is NonNullable<typeof cond> => cond !== null)

      // Log expired conditions
      if (expiredConditions.length > 0) {
        expiredConditions.forEach((condition) => {
          get().addLogEntry({
            type: 'other',
            actorId: c.id,
            actorName: c.name,
            message: `${c.name}'s ${condition} effect expires`,
          })
        })
      }

      return { ...c, conditions: newConditions }
    })

    set({
      combatants: combatantsWithExpiredConditions,
      currentTurnIndex: nextIndex,
      round: newRound,
      selectedAction: undefined,
      targetingMode: undefined,
    })

    // Auto-skip dead combatants (monsters at 0 HP or characters who have died)
    const nextCombatant = combatantsWithExpiredConditions.find((c) => c.id === turnOrder[nextIndex])
    if (nextCombatant) {
      const isDead = nextCombatant.currentHp <= 0 && (
        nextCombatant.type === 'monster' || // Monsters are dead at 0 HP
        nextCombatant.deathSaves.failures >= 3 // Characters are dead at 3 failures
      )
      if (isDead) {
        // Recursively skip to next turn
        get().nextTurn()
      }
    }
  },

  endCombat: () => {
    set({
      phase: 'setup',
      round: 0,
      currentTurnIndex: 0,
      turnOrder: [],
      selectedAction: undefined,
      targetingMode: undefined,
    })
  },

  selectCombatant: (id) => {
    set({ selectedCombatantId: id })
  },

  setSelectedAction: (action) => {
    set({ selectedAction: action })
  },

  setHoveredTarget: (id) => {
    set({ hoveredTargetId: id })
  },

  setRangeHighlight: (highlight) => {
    set({ rangeHighlight: highlight })
  },

  setAoEPreview: (preview) => {
    set({ aoePreview: preview })
  },

  setSelectedSpell: (spell) => {
    set({ selectedSpell: spell })
  },

  // Projectile targeting
  startProjectileTargeting: (spell) => {
    if (!spell.projectiles) return
    set({
      selectedSpell: spell,
      selectedAction: 'spell',
      projectileTargeting: {
        spell,
        totalProjectiles: spell.projectiles.count,
        assignments: {},
      },
    })
  },

  assignProjectile: (targetId) => {
    const { projectileTargeting } = get()
    if (!projectileTargeting) return

    const currentAssignments = projectileTargeting.assignments
    const totalAssigned = Object.values(currentAssignments).reduce((sum, n) => sum + n, 0)

    // Can't assign more than total projectiles
    if (totalAssigned >= projectileTargeting.totalProjectiles) return

    set({
      projectileTargeting: {
        ...projectileTargeting,
        assignments: {
          ...currentAssignments,
          [targetId]: (currentAssignments[targetId] || 0) + 1,
        },
      },
    })
  },

  unassignProjectile: (targetId) => {
    const { projectileTargeting } = get()
    if (!projectileTargeting) return

    const current = projectileTargeting.assignments[targetId] || 0
    if (current <= 0) return

    const newAssignments = { ...projectileTargeting.assignments }
    if (current === 1) {
      delete newAssignments[targetId]
    } else {
      newAssignments[targetId] = current - 1
    }

    set({
      projectileTargeting: {
        ...projectileTargeting,
        assignments: newAssignments,
      },
    })
  },

  confirmProjectileTargeting: () => {
    const { projectileTargeting } = get()
    if (!projectileTargeting) return

    const assignments = Object.entries(projectileTargeting.assignments)
      .filter(([_, count]) => count > 0)
      .map(([targetId, count]) => ({ targetId, count }))

    if (assignments.length > 0) {
      const currentCombatant = getCurrentCombatant(get())
      if (currentCombatant) {
        get().castSpell(currentCombatant.id, projectileTargeting.spell, undefined, undefined, assignments)
      }
    }

    set({
      projectileTargeting: undefined,
      selectedSpell: undefined,
      selectedAction: undefined,
      rangeHighlight: undefined,
      hoveredTargetId: undefined,
    })
  },

  cancelProjectileTargeting: () => {
    set({
      projectileTargeting: undefined,
      selectedSpell: undefined,
      selectedAction: undefined,
      rangeHighlight: undefined,
      hoveredTargetId: undefined,
    })
  },

  // Reaction handling
  useReactionSpell: (spellId: string) => {
    const { pendingReaction, combatants } = get()
    if (!pendingReaction) return

    const reactor = combatants.find(c => c.id === pendingReaction.reactingCombatantId)
    if (!reactor || reactor.hasReacted) return

    const spell = pendingReaction.availableReactions.find(s => s.id === spellId)
    if (!spell) return

    // Handle Shield spell
    if (spell.id === 'shield' && spell.reaction?.effect.type === 'ac_bonus') {
      const acBonus = spell.reaction.effect.value || 5
      const newAC = (pendingReaction.context.targetAC || 0) + acBonus
      const attackRoll = pendingReaction.context.attackRoll || 0

      // Log the Shield cast
      get().addLogEntry({
        type: 'spell',
        actorId: pendingReaction.reactingCombatantId,
        actorName: reactor.name,
        message: `${reactor.name} casts Shield as a reaction! (+${acBonus} AC)`,
        details: `AC ${pendingReaction.context.targetAC} → ${newAC}`,
      })

      // Mark reaction as used
      set((state) => ({
        combatants: state.combatants.map(c =>
          c.id === pendingReaction.reactingCombatantId
            ? { ...c, hasReacted: true }
            : c
        ),
      }))

      // Check if the attack now misses with the new AC
      if (attackRoll < newAC) {
        // Attack misses due to Shield
        get().addLogEntry({
          type: 'attack',
          actorId: pendingReaction.triggeringCombatantId,
          actorName: combatants.find(c => c.id === pendingReaction.triggeringCombatantId)?.name || 'Attacker',
          targetId: pendingReaction.reactingCombatantId,
          targetName: reactor.name,
          message: `Attack blocked by Shield!`,
          details: `Roll ${attackRoll} vs AC ${newAC}`,
        })
        get().addCombatPopup(pendingReaction.reactingCombatantId, 'saved')
      } else {
        // Attack still hits - apply the pending damage
        if (pendingReaction.context.damage) {
          get().dealDamage(
            pendingReaction.reactingCombatantId,
            pendingReaction.context.damage,
            combatants.find(c => c.id === pendingReaction.triggeringCombatantId)?.name
          )
          get().addDamagePopup(
            pendingReaction.reactingCombatantId,
            pendingReaction.context.damage,
            pendingReaction.context.damageType || 'bludgeoning',
            pendingReaction.context.isCritical || false
          )
        }
      }

      // Apply Shield buff (lasts until start of reactor's next turn)
      // For now, we'll track this as a condition
      set((state) => ({
        combatants: state.combatants.map(c =>
          c.id === pendingReaction.reactingCombatantId
            ? {
                ...c,
                conditions: [
                  ...c.conditions,
                  { condition: 'shielded', duration: 1, source: 'Shield spell' }
                ]
              }
            : c
        ),
      }))
    }

    // Clear pending reaction
    set({ pendingReaction: undefined })

    // If this was during an AI turn, end the turn now
    if (get().isAITurn()) {
      setTimeout(() => get().endTurn(), 500)
    }
  },

  skipReaction: () => {
    const { pendingReaction, combatants } = get()
    if (!pendingReaction) return

    // Apply the pending damage since they chose not to react
    if (pendingReaction.context.damage) {
      get().dealDamage(
        pendingReaction.reactingCombatantId,
        pendingReaction.context.damage,
        combatants.find(c => c.id === pendingReaction.triggeringCombatantId)?.name
      )
      get().addDamagePopup(
        pendingReaction.reactingCombatantId,
        pendingReaction.context.damage,
        pendingReaction.context.damageType || 'bludgeoning',
        pendingReaction.context.isCritical || false
      )
    }

    // Clear pending reaction
    set({ pendingReaction: undefined })

    // If this was during an AI turn, end the turn now
    if (get().isAITurn()) {
      setTimeout(() => get().endTurn(), 500)
    }
  },

  moveCombatant: (id, to) => {
    const { combatants, grid, phase } = get()
    const combatant = combatants.find((c) => c.id === id)

    if (!combatant) return

    // Get creature size for footprint calculations
    const size = getCombatantSize(combatant)

    // Get occupied positions for pathfinding (all footprint cells of other combatants)
    const occupiedPositions = new Set<string>()
    combatants
      .filter((c) => c.id !== id && c.position.x >= 0)
      .forEach((c) => {
        const cSize = getCombatantSize(c)
        const cells = getOccupiedCells(c.position, cSize)
        cells.forEach((cell) => occupiedPositions.add(`${cell.x},${cell.y}`))
      })

    // Find path using A* pathfinding with footprint awareness
    const footprint = getFootprintSize(size)
    const path = findPath(grid, combatant.position, to, occupiedPositions, undefined, footprint)
    if (!path) return

    // Calculate actual path cost (accounts for terrain)
    const pathCost = calculatePathCost(grid, path)

    // Get speed based on combatant type
    const speed =
      combatant.type === 'character'
        ? (combatant.data as Character).speed
        : (combatant.data as Monster).speed.walk

    const remainingMovement = speed - combatant.movementUsed

    if (pathCost > remainingMovement) return

    // Check if target is valid (redundant but safe)
    if (!get().canMoveTo(id, to)) return

    // Collect threatening enemies that will trigger opportunity attacks
    const threateningEnemyIds: string[] = []

    // Check for opportunity attacks (only during combat, not setup)
    if (phase === 'combat') {
      // Check if combatant has disengaging condition
      const isDisengaging = combatant.conditions.some((c) => c.condition === 'disengaging' as any)

      if (!isDisengaging) {
        // Find all enemies currently threatening this combatant
        const threateningEnemies = get().getThreateningEnemies(id)

        // Get destination footprint cells
        const destCells = getOccupiedCells(to, size)

        // For each threatening enemy, check if we're leaving their reach
        for (const enemy of threateningEnemies) {
          const enemySize = getCombatantSize(enemy)
          const enemyCells = getOccupiedCells(enemy.position, enemySize)

          // Check if any destination cell is adjacent to any enemy cell
          let stillAdjacent = false
          for (const destCell of destCells) {
            for (const enemyCell of enemyCells) {
              const dx = Math.abs(destCell.x - enemyCell.x)
              const dy = Math.abs(destCell.y - enemyCell.y)
              if (dx <= 1 && dy <= 1) {
                stillAdjacent = true
                break
              }
            }
            if (stillAdjacent) break
          }

          // If we're moving out of reach (no longer adjacent), trigger opportunity attack
          if (!stillAdjacent) {
            threateningEnemyIds.push(enemy.id)
          }
        }
      }
    }

    // Start movement animation (path includes start position)
    set({
      movementAnimation: {
        combatantId: id,
        path: path,
        currentIndex: 0,
      },
      pendingMovement: {
        id,
        to,
        path,
        pathCost,
        threateningEnemies: threateningEnemyIds,
      },
    })
  },

  advanceMovementAnimation: () => {
    const { movementAnimation } = get()
    if (!movementAnimation) return

    const nextIndex = movementAnimation.currentIndex + 1
    if (nextIndex >= movementAnimation.path.length) {
      // Animation complete, finalize movement
      get().finishMovementAnimation()
    } else {
      set({
        movementAnimation: {
          ...movementAnimation,
          currentIndex: nextIndex,
        },
      })
    }
  },

  finishMovementAnimation: () => {
    const { pendingMovement, grid, combatants } = get()
    if (!pendingMovement) {
      set({ movementAnimation: undefined })
      return
    }

    const { id, to, pathCost, threateningEnemies } = pendingMovement
    const combatant = combatants.find((c) => c.id === id)
    if (!combatant) {
      set({ movementAnimation: undefined, pendingMovement: undefined })
      return
    }

    // Process opportunity attacks
    for (const enemyId of threateningEnemies) {
      get().performOpportunityAttack(enemyId, id)

      // Re-fetch combatant in case they were damaged/killed
      const updatedCombatant = get().combatants.find((c) => c.id === id)
      if (!updatedCombatant || updatedCombatant.currentHp <= 0) {
        // Combatant was killed by opportunity attack, cancel movement
        set({ movementAnimation: undefined, pendingMovement: undefined })
        return
      }
    }

    // Get creature size for footprint calculations
    const size = getCombatantSize(combatant)

    // Build grid updates for old and new position cells
    const gridUpdates: Array<{ x: number; y: number; occupiedBy: string | undefined }> = []

    // Clear old position cells (all footprint cells)
    const oldCells = getOccupiedCells(combatant.position, size)
    for (const cell of oldCells) {
      if (grid.cells[cell.y]?.[cell.x]) {
        gridUpdates.push({ x: cell.x, y: cell.y, occupiedBy: undefined })
      }
    }

    // Mark new position cells (all footprint cells)
    const newCells = getOccupiedCells(to, size)
    for (const cell of newCells) {
      gridUpdates.push({ x: cell.x, y: cell.y, occupiedBy: id })
    }

    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id
          ? { ...c, position: to, movementUsed: c.movementUsed + pathCost }
          : c
      ),
      grid: updateGridOccupancy(state.grid, gridUpdates),
      movementAnimation: undefined,
      pendingMovement: undefined,
    }))

    get().addLogEntry({
      type: 'movement',
      actorId: id,
      actorName: combatant.name,
      message: `moves ${pathCost} ft`,
    })

    // Check for hazardous terrain damage
    const destinationCell = grid.cells[to.y][to.x]
    if (destinationCell.terrain === 'hazard') {
      const hazardDamage = rollDie(4)
      get().dealDamage(id, hazardDamage, 'Hazardous Terrain')
      get().addDamagePopup(id, hazardDamage, 'fire', false)
      get().addLogEntry({
        type: 'damage',
        actorName: 'Hazardous Terrain',
        targetId: id,
        targetName: combatant.name,
        message: `${combatant.name} takes ${hazardDamage} fire damage from hazardous terrain`,
      })
    }
  },

  isAnimating: () => {
    return get().movementAnimation !== null
  },

  canMoveTo: (combatantId, to) => {
    const { grid, combatants } = get()
    const combatant = combatants.find((c) => c.id === combatantId)

    if (!combatant) return false

    // Get creature size for footprint calculations
    const size = getCombatantSize(combatant)
    const footprint = getFootprintSize(size)

    // Check all footprint cells at destination
    for (let dy = 0; dy < footprint; dy++) {
      for (let dx = 0; dx < footprint; dx++) {
        const checkX = to.x + dx
        const checkY = to.y + dy

        // Check bounds
        if (checkX < 0 || checkX >= grid.width || checkY < 0 || checkY >= grid.height) {
          return false
        }

        const targetCell = grid.cells[checkY][checkX]

        // Check if blocked by obstacle
        if (blocksMovement(targetCell)) {
          return false
        }

        // Check if occupied by another combatant
        if (targetCell.occupiedBy && targetCell.occupiedBy !== combatantId) {
          return false
        }
      }
    }

    // Get occupied positions for pathfinding (all footprint cells of other combatants)
    const occupiedPositions = new Set<string>()
    combatants
      .filter((c) => c.id !== combatantId && c.position.x >= 0)
      .forEach((c) => {
        const cSize = getCombatantSize(c)
        const cells = getOccupiedCells(c.position, cSize)
        cells.forEach((cell) => occupiedPositions.add(`${cell.x},${cell.y}`))
      })

    // Find path using A* pathfinding with footprint awareness
    const path = findPath(grid, combatant.position, to, occupiedPositions, undefined, footprint)
    if (!path) return false

    // Calculate actual path cost
    const pathCost = calculatePathCost(grid, path)

    const speed =
      combatant.type === 'character'
        ? (combatant.data as Character).speed
        : (combatant.data as Monster).speed.walk

    const remainingMovement = speed - combatant.movementUsed

    return pathCost <= remainingMovement
  },

  getReachablePositions: (combatantId) => {
    const { grid, combatants } = get()
    const combatant = combatants.find((c) => c.id === combatantId)

    if (!combatant) return []

    // Get creature size for footprint-aware pathfinding
    const size = getCombatantSize(combatant)
    const footprint = getFootprintSize(size)

    const speed =
      combatant.type === 'character'
        ? (combatant.data as Character).speed
        : (combatant.data as Monster).speed.walk

    const remainingMovement = speed - combatant.movementUsed

    // Get occupied positions (all footprint cells of other combatants)
    const occupiedPositions = new Set<string>()
    combatants
      .filter((c) => c.id !== combatantId && c.position.x >= 0)
      .forEach((c) => {
        const cSize = getCombatantSize(c)
        const cells = getOccupiedCells(c.position, cSize)
        cells.forEach((cell) => occupiedPositions.add(`${cell.x},${cell.y}`))
      })

    // Use pathfinding-based reachability with footprint awareness
    const reachableMap = getReachableFromPathfinding(
      grid,
      combatant.position,
      remainingMovement,
      occupiedPositions,
      footprint
    )

    // Convert map to array of positions
    const reachable: Position[] = []
    for (const key of reachableMap.keys()) {
      const [x, y] = key.split(',').map(Number)
      reachable.push({ x, y })
    }

    return reachable
  },

  dealDamage: (targetId, amount, source) => {
    set((state) => {
      const target = state.combatants.find((c) => c.id === targetId)
      if (!target) return state

      let newHp = Math.max(0, target.currentHp - amount)
      let updatedRacialAbilityUses = target.racialAbilityUses

      get().addLogEntry({
        type: 'damage',
        actorName: source ?? 'Unknown',
        targetId,
        targetName: target.name,
        message: `deals ${amount} damage to ${target.name}`,
        details: `${target.currentHp} → ${newHp} HP`,
      })

      // Check for Relentless Endurance when dropping to 0 HP (characters only)
      const wasConscious = target.currentHp > 0
      if (newHp === 0 && wasConscious && target.type === 'character') {
        const relentlessCheck = checkRelentlessEndurance(target, target.racialAbilityUses)
        if (relentlessCheck.canUse && relentlessCheck.ability) {
          // Use Relentless Endurance
          newHp = applyRelentlessEndurance(relentlessCheck.ability)
          const result = decrementRacialAbilityUse(
            target,
            relentlessCheck.ability.id,
            target.racialAbilityUses
          )
          updatedRacialAbilityUses = result.newUses

          get().addLogEntry({
            type: 'other',
            actorId: targetId,
            actorName: target.name,
            message: `${target.name} uses Relentless Endurance and drops to ${newHp} HP instead of falling unconscious!`,
          })
        }
      }

      // Track if we need to clear grid occupancy for a dead monster
      let monsterDied = false
      const { x, y } = target.position

      // Check for falling unconscious (characters) or dying (monsters)
      if (newHp === 0 && wasConscious) {
        if (target.type === 'monster') {
          // Monsters die immediately at 0 HP
          get().addLogEntry({
            type: 'death',
            actorId: targetId,
            actorName: target.name,
            message: `${target.name} has been slain!`,
          })
          monsterDied = true
        } else {
          // Characters fall unconscious
          get().addLogEntry({
            type: 'death',
            actorId: targetId,
            actorName: target.name,
            message: `${target.name} falls unconscious!`,
          })
        }
      }

      // If already unconscious and takes damage, add death save failure
      if (target.currentHp === 0 && !target.isStable && target.type === 'character') {
        const newFailures = target.deathSaves.failures + 1
        if (newFailures >= 3) {
          get().addLogEntry({
            type: 'death',
            actorId: targetId,
            actorName: target.name,
            message: `${target.name} has died from damage while unconscious!`,
          })
        } else {
          get().addLogEntry({
            type: 'other',
            actorId: targetId,
            actorName: target.name,
            message: `${target.name} takes damage while unconscious - death save failure! (${newFailures}/3)`,
          })
        }
        return {
          combatants: state.combatants.map((c) =>
            c.id === targetId
              ? { ...c, deathSaves: { ...c.deathSaves, failures: newFailures } }
              : c
          ),
        }
      }

      // Build grid updates for dead monsters
      const gridUpdates: Array<{ x: number; y: number; occupiedBy: string | undefined }> = []
      if (monsterDied && x >= 0 && y >= 0 && state.grid.cells[y]?.[x]) {
        gridUpdates.push({ x, y, occupiedBy: undefined })
      }

      return {
        combatants: state.combatants.map((c) =>
          c.id === targetId
            ? {
                ...c,
                currentHp: newHp,
                racialAbilityUses: updatedRacialAbilityUses,
                // Only add unconscious condition for characters, not monsters (they're dead)
                conditions: newHp === 0 && wasConscious && c.type === 'character'
                  ? [...c.conditions, { condition: 'unconscious' as const, duration: -1 }]
                  : c.conditions,
              }
            : c
        ),
        grid: gridUpdates.length > 0 ? updateGridOccupancy(state.grid, gridUpdates) : state.grid,
      }
    })

    // Check for victory/defeat after damage is dealt
    const combatResult = checkCombatEnd(get().combatants)
    if (combatResult) {
      set({ phase: combatResult })
      get().addLogEntry({
        type: combatResult === 'victory' ? 'initiative' : 'death',
        actorName: 'System',
        message: combatResult === 'victory' ? 'Victory! All enemies defeated!' : 'Defeat... All heroes have fallen.',
      })
    }
  },

  healDamage: (targetId, amount, source) => {
    set((state) => {
      const target = state.combatants.find((c) => c.id === targetId)
      if (!target) return state

      const wasUnconscious = target.currentHp === 0
      const newHp = Math.min(target.maxHp, target.currentHp + amount)

      // Show heal popup
      get().addHealPopup(targetId, amount)

      get().addLogEntry({
        type: 'heal',
        actorName: source ?? 'Unknown',
        targetId,
        targetName: target.name,
        message: `heals ${target.name} for ${amount} HP`,
        details: `${target.currentHp} → ${newHp} HP`,
      })

      // If was unconscious and now has HP, they regain consciousness
      if (wasUnconscious && newHp > 0) {
        get().addLogEntry({
          type: 'other',
          actorId: targetId,
          actorName: target.name,
          message: `${target.name} regains consciousness!`,
        })
      }

      return {
        combatants: state.combatants.map((c) =>
          c.id === targetId
            ? {
                ...c,
                currentHp: newHp,
                // Reset death saves and remove unconscious when healed
                deathSaves: newHp > 0 ? { successes: 0, failures: 0 } : c.deathSaves,
                isStable: newHp > 0 ? false : c.isStable,
                conditions: newHp > 0
                  ? c.conditions.filter((cond) => cond.condition !== 'unconscious')
                  : c.conditions,
              }
            : c
        ),
      }
    })
  },

  performAttack: (attackerId, targetId, weapon, monsterAction, rangedWeapon) => {
    const { combatants, grid } = get()
    const attacker = combatants.find((c) => c.id === attackerId)
    const target = combatants.find((c) => c.id === targetId)

    if (!attacker || !target) return null

    // Check if attacker can attack (Extra Attack allows multiple attacks per action)
    const maxAttacks = getMaxAttacksPerAction(attacker)
    if (attacker.attacksMadeThisTurn >= maxAttacks) return null

    // Auto-select weapon based on distance if character has both melee and ranged
    let selectedWeapon = weapon
    if (attacker.type === 'character' && (weapon || rangedWeapon)) {
      selectedWeapon = selectWeaponForTarget(attacker, target, grid, weapon, rangedWeapon)
    }

    // Check range and line of sight
    const attackCheck = canAttackTarget(attacker, target, grid, selectedWeapon, monsterAction)
    if (!attackCheck.canAttack) {
      const message = attackCheck.reason === 'no_line_of_sight'
        ? `${attacker.name}'s ranged attack on ${target.name} fails - no line of sight!`
        : `${attacker.name}'s attack on ${target.name} fails - out of range!`
      get().addLogEntry({
        type: 'attack',
        actorId: attackerId,
        actorName: attacker.name,
        targetId,
        targetName: target.name,
        message,
      })
      return null
    }

    // Resolve the attack (pass all combatants for Sneak Attack check)
    const result = resolveAttack({
      attacker,
      target,
      weapon: selectedWeapon,
      monsterAction,
      allCombatants: combatants,
      usedSneakAttackThisTurn: attacker.usedSneakAttackThisTurn,
    })

    // Log the attack
    if (result.criticalMiss) {
      get().addLogEntry({
        type: 'attack',
        actorId: attackerId,
        actorName: attacker.name,
        targetId,
        targetName: target.name,
        message: `${attacker.name} rolls a critical miss against ${target.name}!`,
        details: result.attackRoll.breakdown,
      })
    } else if (result.critical) {
      get().addLogEntry({
        type: 'attack',
        actorId: attackerId,
        actorName: attacker.name,
        targetId,
        targetName: target.name,
        message: `${attacker.name} scores a CRITICAL HIT on ${target.name}!`,
        details: `${result.attackRoll.breakdown} vs AC ${result.targetAC}`,
      })
    } else if (result.hit) {
      get().addLogEntry({
        type: 'attack',
        actorId: attackerId,
        actorName: attacker.name,
        targetId,
        targetName: target.name,
        message: `${attacker.name} hits ${target.name}`,
        details: `${result.attackRoll.breakdown} vs AC ${result.targetAC}`,
      })
    } else {
      get().addLogEntry({
        type: 'attack',
        actorId: attackerId,
        actorName: attacker.name,
        targetId,
        targetName: target.name,
        message: `${attacker.name} misses ${target.name}`,
        details: `${result.attackRoll.breakdown} vs AC ${result.targetAC}`,
      })
      // Show miss popup on target
      get().addCombatPopup(targetId, 'miss')

      // Apply Graze mastery damage on miss (if applicable)
      if (selectedWeapon) {
        const grazeResult = applyGrazeOnMiss(attacker, target, selectedWeapon)
        if (grazeResult && grazeResult.applied && grazeResult.grazeDamage && grazeResult.grazeDamage > 0) {
          get().dealDamage(targetId, grazeResult.grazeDamage, attacker.name)
          get().addDamagePopup(targetId, grazeResult.grazeDamage, selectedWeapon.damageType as DamageType, false)
          get().addLogEntry({
            type: 'damage',
            actorId: attackerId,
            actorName: attacker.name,
            targetId,
            targetName: target.name,
            message: `Graze: ${grazeResult.grazeDamage} ${selectedWeapon.damageType} damage`,
            details: 'Weapon mastery: Graze',
          })
        }
      }
    }

    // Apply damage if hit
    if (result.hit && result.damage) {
      // Calculate total damage including Savage Attacks and Sneak Attack bonus
      let totalDamage = result.damage.total
      const bonusDamageDetails: string[] = []

      if (result.savageAttacksDamage) {
        totalDamage += result.savageAttacksDamage.total
        bonusDamageDetails.push(`Savage Attacks [${result.savageAttacksDamage.rolls.join(', ')}]`)
      }

      if (result.sneakAttackDamage) {
        totalDamage += result.sneakAttackDamage.total
        bonusDamageDetails.push(`Sneak Attack [${result.sneakAttackDamage.rolls.join(', ')}]`)
      }

      // Check if target has reaction spells available (like Shield)
      const availableReactionSpells = getAvailableReactionSpells(target, 'on_hit')

      if (availableReactionSpells.length > 0 && !target.hasReacted) {
        // Set pending reaction and pause for player decision
        set({
          pendingReaction: {
            type: 'shield',
            reactingCombatantId: targetId,
            triggeringCombatantId: attackerId,
            availableReactions: availableReactionSpells,
            context: {
              attackRoll: result.attackRoll.total,
              attackBonus: result.attackRoll.total - result.attackRoll.naturalRoll,
              targetAC: result.targetAC,
              damage: totalDamage,
              damageType: (result.damageType ?? 'bludgeoning') as DamageType,
              isCritical: result.critical,
            },
          },
        })
        // Don't deal damage yet - wait for reaction decision
        // Update attacker state still needs to happen
      } else {
        // No reaction available, deal damage immediately
        get().dealDamage(targetId, totalDamage, attacker.name)
        get().addDamagePopup(targetId, totalDamage, (result.damageType ?? 'bludgeoning') as DamageType, result.critical)

        const damageDetails = bonusDamageDetails.length > 0
          ? `${result.damage.breakdown} + ${bonusDamageDetails.join(' + ')}`
          : result.damage.breakdown

        get().addLogEntry({
          type: 'damage',
          actorId: attackerId,
          actorName: attacker.name,
          targetId,
          targetName: target.name,
          message: `${totalDamage} ${result.damageType} damage`,
          details: damageDetails,
        })

        // Log Sneak Attack if used
        if (result.sneakAttackUsed) {
          get().addLogEntry({
            type: 'other',
            actorId: attackerId,
            actorName: attacker.name,
            message: `${attacker.name} deals Sneak Attack damage! (+${result.sneakAttackDamage?.total})`,
          })
        }

        // Apply on-hit weapon mastery effects
        if (selectedWeapon) {
          const { round, combatants: currentCombatants } = get()
          const masteryResult = applyOnHitMasteryEffect(attacker, target, selectedWeapon, grid, currentCombatants, round)

          if (masteryResult && masteryResult.applied) {
            // Log the mastery effect
            get().addLogEntry({
              type: 'other',
              actorId: attackerId,
              actorName: attacker.name,
              message: masteryResult.description,
              details: `Weapon mastery: ${masteryResult.mastery}`,
            })

            // Apply specific effects based on mastery type
            switch (masteryResult.mastery) {
              case 'push':
                if (masteryResult.pushResult) {
                  // Update target position
                  set((state) => ({
                    combatants: state.combatants.map((c) =>
                      c.id === targetId
                        ? { ...c, position: masteryResult.pushResult!.newPosition }
                        : c
                    ),
                  }))
                }
                break

              case 'sap':
                // Add sapped condition to target (disadvantage on next attack)
                set((state) => ({
                  combatants: state.combatants.map((c) =>
                    c.id === targetId
                      ? {
                          ...c,
                          conditions: [...c.conditions, { condition: 'sapped' as const, duration: 1 }],
                        }
                      : c
                  ),
                }))
                break

              case 'slow':
                // Slow is tracked via speed reduction - handled by combat calculations
                // For now just log it; speed reduction is applied automatically in movement
                break

              case 'topple':
                if (masteryResult.toppleResult && !masteryResult.toppleResult.savePassed) {
                  // Target failed save, add prone condition
                  set((state) => ({
                    combatants: state.combatants.map((c) =>
                      c.id === targetId
                        ? {
                            ...c,
                            conditions: [...c.conditions, { condition: 'prone' as const, duration: -1 }],
                          }
                        : c
                    ),
                  }))
                }
                break

              case 'vex':
                // Set vexedBy on target so attacker has advantage on next attack
                set((state) => ({
                  combatants: state.combatants.map((c) =>
                    c.id === targetId
                      ? {
                          ...c,
                          vexedBy: { attackerId, expiresOnRound: round + 1 },
                        }
                      : c
                  ),
                }))
                break
            }
          }
        }
      }
    }

    // Update attacker state: increment attacks made, mark sneak attack if used
    const newAttacksMade = attacker.attacksMadeThisTurn + 1
    const maxAttacksForAttacker = getMaxAttacksPerAction(attacker)
    const allAttacksUsed = newAttacksMade >= maxAttacksForAttacker

    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === attackerId
          ? {
              ...c,
              attacksMadeThisTurn: newAttacksMade,
              hasActed: allAttacksUsed,
              usedSneakAttackThisTurn: c.usedSneakAttackThisTurn || (result.sneakAttackUsed ?? false),
            }
          : c
      ),
    }))

    // Clear targeting mode
    set({ selectedAction: undefined, targetingMode: undefined })

    return result
  },

  useDash: () => {
    const { turnOrder, currentTurnIndex, combatants } = get()
    const currentId = turnOrder[currentTurnIndex]
    const combatant = combatants.find((c) => c.id === currentId)

    if (!combatant || combatant.hasActed) return

    // Dash adds your speed to your remaining movement for this turn
    const speed = combatant.type === 'character'
      ? (combatant.data as Character).speed
      : (combatant.data as Monster).speed.walk

    // Subtract speed from movementUsed (can go negative to represent bonus movement)
    // Example: 30 speed, used 10 ft -> movementUsed becomes -20, remaining = 30 - (-20) = 50 ft
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === currentId
          ? { ...c, hasActed: true, movementUsed: c.movementUsed - speed }
          : c
      ),
      selectedAction: undefined,
    }))

    get().addLogEntry({
      type: 'other',
      actorId: currentId,
      actorName: combatant.name,
      message: `${combatant.name} takes the Dash action (+${speed} ft movement)`,
    })
  },

  useDodge: () => {
    const { turnOrder, currentTurnIndex, combatants } = get()
    const currentId = turnOrder[currentTurnIndex]
    const combatant = combatants.find((c) => c.id === currentId)

    if (!combatant || combatant.hasActed) return

    // Add dodging condition (we'll track this via a special condition)
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === currentId
          ? {
              ...c,
              hasActed: true,
              conditions: [...c.conditions, { condition: 'dodging', duration: 1 }],
            }
          : c
      ),
      selectedAction: undefined,
    }))

    get().addLogEntry({
      type: 'other',
      actorId: currentId,
      actorName: combatant.name,
      message: `${combatant.name} takes the Dodge action (attacks have disadvantage)`,
    })
  },

  useDisengage: () => {
    const { turnOrder, currentTurnIndex, combatants } = get()
    const currentId = turnOrder[currentTurnIndex]
    const combatant = combatants.find((c) => c.id === currentId)

    if (!combatant || combatant.hasActed) return

    // Add disengaging condition to prevent opportunity attacks this turn
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === currentId
          ? {
              ...c,
              hasActed: true,
              conditions: [...c.conditions, { condition: 'disengaging', duration: 1 }],
            }
          : c
      ),
      selectedAction: undefined,
    }))

    get().addLogEntry({
      type: 'other',
      actorId: currentId,
      actorName: combatant.name,
      message: `${combatant.name} takes the Disengage action (no opportunity attacks this turn)`,
    })
  },

  getThreateningEnemies: (combatantId) => {
    const { combatants } = get()
    const combatant = combatants.find((c) => c.id === combatantId)

    if (!combatant || combatant.position.x < 0) return []

    // Get combatant's footprint cells
    const combatantSize = getCombatantSize(combatant)
    const combatantCells = getOccupiedCells(combatant.position, combatantSize)

    return combatants.filter((c) => {
      // Must be a different combatant
      if (c.id === combatantId) return false
      // Must be opposite type (enemy)
      if (c.type === combatant.type) return false
      // Must be alive
      if (c.currentHp <= 0) return false
      // Must have reaction available
      if (c.hasReacted) return false
      // Must be in melee range (any cell of enemy adjacent to any cell of combatant)
      const enemySize = getCombatantSize(c)
      const enemyCells = getOccupiedCells(c.position, enemySize)

      // Check if any enemy cell is adjacent to any combatant cell
      for (const enemyCell of enemyCells) {
        for (const combatantCell of combatantCells) {
          const dx = Math.abs(enemyCell.x - combatantCell.x)
          const dy = Math.abs(enemyCell.y - combatantCell.y)
          // Adjacent means within 1 square (including diagonals)
          if (dx <= 1 && dy <= 1) {
            return true
          }
        }
      }
      return false
    })
  },

  performOpportunityAttack: (attackerId, targetId) => {
    const { combatants } = get()
    const attacker = combatants.find((c) => c.id === attackerId)
    const target = combatants.find((c) => c.id === targetId)

    if (!attacker || !target) return null

    // Check if attacker has reaction available
    if (attacker.hasReacted) return null

    get().addLogEntry({
      type: 'other',
      actorId: attackerId,
      actorName: attacker.name,
      message: `${attacker.name} makes an opportunity attack against ${target.name}!`,
    })

    // Get weapon or monster action for the attack
    let weapon: Weapon | undefined
    let monsterAction: MonsterAction | undefined

    if (attacker.type === 'character') {
      const character = attacker.data as Character
      // Use melee weapon for opportunity attacks
      weapon = character.equipment?.meleeWeapon
    } else {
      const monster = attacker.data as Monster
      // Use first melee action
      monsterAction = monster.actions.find((a) => a.reach !== undefined || (a.attackBonus !== undefined && !a.range))
    }

    // Resolve the attack
    const result = resolveAttack({
      attacker,
      target,
      weapon,
      monsterAction,
    })

    // Use the attacker's reaction
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === attackerId ? { ...c, hasReacted: true } : c
      ),
    }))

    // Log the attack result
    if (result.hit) {
      get().addLogEntry({
        type: 'attack',
        actorId: attackerId,
        actorName: attacker.name,
        targetId,
        targetName: target.name,
        message: result.critical
          ? `${attacker.name} CRITICALLY HITS with opportunity attack!`
          : `${attacker.name} hits with opportunity attack`,
        details: `${result.attackRoll.breakdown} vs AC ${result.targetAC}`,
      })

      if (result.damage) {
        const totalDamage = result.damage.total

        // Check if target has reaction spells available (like Shield)
        const availableReactionSpells = getAvailableReactionSpells(target, 'on_hit')

        if (availableReactionSpells.length > 0 && !target.hasReacted) {
          // Set pending reaction and pause for player decision
          set({
            pendingReaction: {
              type: 'opportunity_attack',
              reactingCombatantId: targetId,
              triggeringCombatantId: attackerId,
              availableReactions: availableReactionSpells,
              context: {
                attackRoll: result.attackRoll.total,
                attackBonus: result.attackRoll.total - result.attackRoll.naturalRoll,
                targetAC: result.targetAC,
                damage: totalDamage,
                damageType: (result.damageType ?? 'bludgeoning') as DamageType,
                isCritical: result.critical,
              },
            },
          })
          // Don't deal damage yet - wait for reaction decision
        } else {
          // No reaction available, deal damage immediately
          get().dealDamage(targetId, totalDamage, attacker.name)
          get().addDamagePopup(targetId, totalDamage, (result.damageType ?? 'bludgeoning') as DamageType, result.critical)
          get().addLogEntry({
            type: 'damage',
            actorId: attackerId,
            actorName: attacker.name,
            targetId,
            targetName: target.name,
            message: `${totalDamage} ${result.damageType} damage`,
            details: result.damage.breakdown,
          })
        }
      }
    } else {
      get().addLogEntry({
        type: 'attack',
        actorId: attackerId,
        actorName: attacker.name,
        targetId,
        targetName: target.name,
        message: `${attacker.name} misses with opportunity attack`,
        details: `${result.attackRoll.breakdown} vs AC ${result.targetAC}`,
      })
      // Show miss popup on target
      get().addCombatPopup(targetId, 'miss')
    }

    return result
  },

  getValidTargets: (attackerId, weapon, monsterAction, rangedWeapon) => {
    const { combatants, grid } = get()
    const attacker = combatants.find((c) => c.id === attackerId)

    if (!attacker) return []

    return combatants.filter((c) => {
      // Can't target self
      if (c.id === attackerId) return false

      // Can't target dead combatants
      if (c.currentHp <= 0) return false

      // Check range and line of sight for melee weapon
      const meleeCheck = canAttackTarget(attacker, c, grid, weapon, monsterAction)
      if (meleeCheck.canAttack) return true

      // If ranged weapon provided, also check if ranged can reach
      if (rangedWeapon) {
        const rangedCheck = canAttackTarget(attacker, c, grid, rangedWeapon, undefined)
        if (rangedCheck.canAttack) return true
      }

      return false
    })
  },

  castSpell: (casterId, spell, targetId, targetPosition, projectileAssignments) => {
    const { combatants } = get()
    const caster = combatants.find((c) => c.id === casterId)

    if (!caster || caster.hasActed) return false
    if (caster.type !== 'character') return false // Only characters can cast spells for now

    const character = caster.data as Character

    // Check and consume spell slot for leveled spells (not cantrips)
    if (spell.level > 0) {
      const spellSlots = character.spellSlots
      if (!spellSlots) {
        get().addLogEntry({
          type: 'spell',
          actorId: casterId,
          actorName: caster.name,
          message: `${caster.name} cannot cast ${spell.name} - no spell slots!`,
        })
        return false
      }

      const slotLevel = spell.level as keyof typeof spellSlots
      const slot = spellSlots[slotLevel]
      if (!slot || slot.current <= 0) {
        get().addLogEntry({
          type: 'spell',
          actorId: casterId,
          actorName: caster.name,
          message: `${caster.name} cannot cast ${spell.name} - no level ${spell.level} spell slots remaining!`,
        })
        return false
      }

      // Decrement the spell slot
      const updatedSpellSlots = {
        ...spellSlots,
        [slotLevel]: { ...slot, current: slot.current - 1 },
      }

      // Update character's spell slots in combatants
      set((state) => ({
        combatants: state.combatants.map((c) =>
          c.id === casterId && c.type === 'character'
            ? { ...c, data: { ...(c.data as Character), spellSlots: updatedSpellSlots } }
            : c
        ),
      }))

      get().addLogEntry({
        type: 'spell',
        actorId: casterId,
        actorName: caster.name,
        message: `${caster.name} uses a level ${spell.level} spell slot (${slot.current - 1}/${slot.max} remaining)`,
      })
    }

    // Log spell cast
    get().addLogEntry({
      type: 'spell',
      actorId: casterId,
      actorName: caster.name,
      message: `${caster.name} casts ${spell.name}!`,
    })

    // Handle multi-projectile spells (Magic Missile, Scorching Ray, etc.)
    if (spell.projectiles && projectileAssignments && projectileAssignments.length > 0) {
      const damageType = spell.damage?.type || 'force'
      const damagePerProjectile = spell.projectiles.damagePerProjectile

      // Process each target assignment
      for (const assignment of projectileAssignments) {
        const target = combatants.find((c) => c.id === assignment.targetId)
        if (!target || target.currentHp <= 0) continue

        // Roll damage for each projectile and deal it
        let totalDamage = 0
        const projectileDamages: number[] = []

        for (let i = 0; i < assignment.count; i++) {
          const damageResult = rollDamage(damagePerProjectile, false)
          projectileDamages.push(damageResult.total)
          totalDamage += damageResult.total
        }

        // Log the projectile hits
        const projectileWord = assignment.count === 1 ? 'projectile' : 'projectiles'
        const damageBreakdown = projectileDamages.join(' + ')

        if (spell.autoHit) {
          get().addLogEntry({
            type: 'spell',
            actorId: casterId,
            actorName: caster.name,
            targetId: assignment.targetId,
            targetName: target.name,
            message: `${assignment.count} ${projectileWord} hit ${target.name}`,
            details: `Auto-hit`,
          })
        }

        // Deal the combined damage
        get().dealDamage(assignment.targetId, totalDamage, caster.name)
        get().addDamagePopup(assignment.targetId, totalDamage, damageType, false)

        get().addLogEntry({
          type: 'damage',
          actorId: casterId,
          actorName: caster.name,
          targetId: assignment.targetId,
          targetName: target.name,
          message: `${totalDamage} ${damageType} damage (${damageBreakdown})`,
          details: `${assignment.count}x ${damagePerProjectile}`,
        })
      }

      // Mark action as used
      set((state) => ({
        combatants: state.combatants.map((c) =>
          c.id === casterId ? { ...c, hasActed: true } : c
        ),
      }))

      return true
    }

    // Determine targets based on whether spell has AoE
    let targets: Combatant[] = []

    if (spell.areaOfEffect && (targetPosition || targetId)) {
      // Get target position - prefer directly passed position, fall back to combatant position
      let aoeTargetPosition = targetPosition
      if (!aoeTargetPosition && targetId) {
        const targetCombatant = combatants.find((c) => c.id === targetId)
        aoeTargetPosition = targetCombatant?.position
      }

      if (aoeTargetPosition) {
        // AoE spell - find all combatants in the affected area
        const aoeConfig = {
          type: spell.areaOfEffect.type,
          size: spell.areaOfEffect.size,
          origin: caster.position,
          target: aoeTargetPosition,
        }
        const affectedCells = getAoEAffectedCells(aoeConfig)

        // Find all living enemy combatants in the affected cells
        // For now, AoE spells hit enemies (monsters for player, characters for monsters)
        const isPlayerCaster = caster.type === 'character'
        targets = combatants.filter((c) => {
          if (c.currentHp <= 0) return false
          if (c.id === casterId) return false // Don't hit self
          // Check if combatant is in affected area
          const cellKey = `${c.position.x},${c.position.y}`
          if (!affectedCells.has(cellKey)) return false
          // For player casters, only hit monsters; for monster casters, only hit characters
          if (isPlayerCaster && c.type === 'character') return false
          if (!isPlayerCaster && c.type === 'monster') return false
          return true
        })

        if (targets.length === 0) {
          get().addLogEntry({
            type: 'spell',
            actorId: casterId,
            actorName: caster.name,
            message: `${spell.name} hits no targets in the area.`,
          })
        }
      }
    } else if (targetId) {
      // Single target spell
      const target = combatants.find((c) => c.id === targetId)
      if (target) {
        targets = [target]
      }
    }

    // Handle damage spells
    if (spell.damage && targets.length > 0) {
      for (const target of targets) {
        const currentTargetId = target.id

        // Spell attack or saving throw?
        if (spell.attackType) {
          // Spell attack roll
          const spellAttackBonus = getSpellAttackBonus(character)
          const attackRoll = rollAttack(spellAttackBonus)
          const targetAC = target.type === 'character'
            ? (target.data as Character).ac
            : (target.data as Monster).ac

          if (attackRoll.isNatural1) {
            get().addLogEntry({
              type: 'attack',
              actorId: casterId,
              actorName: caster.name,
              targetId: currentTargetId,
              targetName: target.name,
              message: `${caster.name} misses ${target.name} with ${spell.name} (natural 1)`,
              details: attackRoll.breakdown,
            })
            get().addCombatPopup(currentTargetId, 'miss')
          } else if (attackRoll.isNatural20 || attackRoll.total >= targetAC) {
            const isCrit = attackRoll.isNatural20
            const damage = rollDamage(spell.damage.dice, isCrit)

            get().addLogEntry({
              type: 'attack',
              actorId: casterId,
              actorName: caster.name,
              targetId: currentTargetId,
              targetName: target.name,
              message: isCrit
                ? `${caster.name} CRITICALLY HITS ${target.name} with ${spell.name}!`
                : `${caster.name} hits ${target.name} with ${spell.name}`,
              details: `${attackRoll.breakdown} vs AC ${targetAC}`,
            })

            get().dealDamage(currentTargetId, damage.total, caster.name)
            get().addDamagePopup(currentTargetId, damage.total, spell.damage.type, isCrit)
            get().addLogEntry({
              type: 'damage',
              actorId: casterId,
              actorName: caster.name,
              targetId: currentTargetId,
              targetName: target.name,
              message: `${damage.total} ${spell.damage.type} damage`,
              details: damage.breakdown,
            })
          } else {
            get().addLogEntry({
              type: 'attack',
              actorId: casterId,
              actorName: caster.name,
              targetId: currentTargetId,
              targetName: target.name,
              message: `${caster.name} misses ${target.name} with ${spell.name}`,
              details: `${attackRoll.breakdown} vs AC ${targetAC}`,
            })
            get().addCombatPopup(currentTargetId, 'miss')
          }
        } else if (spell.savingThrow) {
          // Saving throw spell
          const dc = getSpellSaveDC(character)
          const saveResult = rollCombatantSavingThrow(target, spell.savingThrow, dc)

          if (saveResult.success) {
            // Usually half damage on save for damaging spells
            const damage = rollDamage(spell.damage.dice, false)
            const halfDamage = Math.floor(damage.total / 2)

            get().addLogEntry({
              type: 'spell',
              actorId: casterId,
              actorName: caster.name,
              targetId: currentTargetId,
              targetName: target.name,
              message: `${target.name} saves against ${spell.name} (DC ${dc})`,
              details: `${saveResult.roll.breakdown} - half damage`,
            })

            // Show saved popup
            get().addCombatPopup(currentTargetId, 'saved')

            if (halfDamage > 0) {
              get().dealDamage(currentTargetId, halfDamage, caster.name)
              get().addDamagePopup(currentTargetId, halfDamage, spell.damage.type, false)
            }
          } else {
            const damage = rollDamage(spell.damage.dice, false)

            get().addLogEntry({
              type: 'spell',
              actorId: casterId,
              actorName: caster.name,
              targetId: currentTargetId,
              targetName: target.name,
              message: `${target.name} fails save against ${spell.name} (DC ${dc})`,
              details: saveResult.roll.breakdown,
            })

            get().dealDamage(currentTargetId, damage.total, caster.name)
            get().addDamagePopup(currentTargetId, damage.total, spell.damage.type, false)
            get().addLogEntry({
              type: 'damage',
              actorId: casterId,
              actorName: caster.name,
              targetId: currentTargetId,
              targetName: target.name,
              message: `${damage.total} ${spell.damage.type} damage`,
              details: damage.breakdown,
            })
          }
        } else if (spell.autoHit) {
          // Auto-hit spells (like Magic Missile) - no attack roll or saving throw
          const damage = rollDamage(spell.damage.dice, false)

          get().addLogEntry({
            type: 'spell',
            actorId: casterId,
            actorName: caster.name,
            targetId: currentTargetId,
            targetName: target.name,
            message: `${caster.name} hits ${target.name} with ${spell.name}`,
            details: 'Auto-hit',
          })

          get().dealDamage(currentTargetId, damage.total, caster.name)
          get().addDamagePopup(currentTargetId, damage.total, spell.damage.type, false)
          get().addLogEntry({
            type: 'damage',
            actorId: casterId,
            actorName: caster.name,
            targetId: currentTargetId,
            targetName: target.name,
            message: `${damage.total} ${spell.damage.type} damage`,
            details: damage.breakdown,
          })
        }
      }
    }

    // Mark action as used (cantrips are still actions)
    if (spell.level === 0 || spell.castingTime === '1 action') {
      get().useAction()
    }

    set({ selectedAction: undefined })
    return true
  },

  getAvailableSpells: (combatantId) => {
    const { combatants } = get()
    const combatant = combatants.find((c) => c.id === combatantId)

    if (!combatant || combatant.type !== 'character') return []

    const character = combatant.data as Character
    return character.knownSpells ?? []
  },

  makeDeathSave: (combatantId) => {
    const { combatants } = get()
    const combatant = combatants.find((c) => c.id === combatantId)

    if (!combatant || combatant.currentHp > 0 || combatant.isStable) return

    const result = rollDeathSave()

    // Handle critical success (nat 20) - regain 1 HP
    if (result.criticalSuccess) {
      get().addLogEntry({
        type: 'other',
        actorId: combatantId,
        actorName: combatant.name,
        message: `${combatant.name} rolls a NATURAL 20 on death save and regains 1 HP!`,
        details: result.roll.breakdown,
      })

      set((state) => ({
        combatants: state.combatants.map((c) =>
          c.id === combatantId
            ? {
                ...c,
                currentHp: 1,
                deathSaves: { successes: 0, failures: 0 },
                conditions: c.conditions.filter((cond) => cond.condition !== 'unconscious'),
              }
            : c
        ),
      }))
      return
    }

    // Handle critical failure (nat 1) - 2 failures
    const failuresToAdd = result.criticalFailure ? 2 : (result.success ? 0 : 1)
    const successesToAdd = result.success ? 1 : 0

    const newFailures = combatant.deathSaves.failures + failuresToAdd
    const newSuccesses = combatant.deathSaves.successes + successesToAdd

    get().addLogEntry({
      type: 'other',
      actorId: combatantId,
      actorName: combatant.name,
      message: result.success
        ? `${combatant.name} succeeds on death save (${newSuccesses}/3)`
        : result.criticalFailure
          ? `${combatant.name} rolls a NATURAL 1 - 2 death save failures! (${newFailures}/3)`
          : `${combatant.name} fails death save (${newFailures}/3)`,
      details: result.roll.breakdown,
    })

    // Check for death (3 failures)
    if (newFailures >= 3) {
      get().addLogEntry({
        type: 'death',
        actorId: combatantId,
        actorName: combatant.name,
        message: `${combatant.name} has died!`,
      })
    }

    // Check for stabilization (3 successes)
    if (newSuccesses >= 3) {
      get().addLogEntry({
        type: 'other',
        actorId: combatantId,
        actorName: combatant.name,
        message: `${combatant.name} has stabilized!`,
      })
    }

    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === combatantId
          ? {
              ...c,
              deathSaves: { successes: newSuccesses, failures: newFailures },
              isStable: newSuccesses >= 3,
            }
          : c
      ),
    }))

    // Check for defeat after death save (only defeat possible here since this is character death)
    if (newFailures >= 3) {
      const combatResult = checkCombatEnd(get().combatants)
      if (combatResult === 'defeat') {
        set({ phase: 'defeat' })
        get().addLogEntry({
          type: 'death',
          actorName: 'System',
          message: 'Defeat... All heroes have fallen.',
        })
      }
    }
  },

  stabilize: (combatantId) => {
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === combatantId
          ? { ...c, isStable: true, deathSaves: { successes: 0, failures: 0 } }
          : c
      ),
    }))

    const combatant = get().combatants.find((c) => c.id === combatantId)
    if (combatant) {
      get().addLogEntry({
        type: 'other',
        actorId: combatantId,
        actorName: combatant.name,
        message: `${combatant.name} has been stabilized`,
      })
    }
  },

  useRacialAbility: (combatantId, abilityId) => {
    const { combatants } = get()
    const combatant = combatants.find((c) => c.id === combatantId)

    if (!combatant) return

    const result = decrementRacialAbilityUse(combatant, abilityId, combatant.racialAbilityUses)

    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === combatantId
          ? { ...c, racialAbilityUses: result.newUses }
          : c
      ),
    }))
  },

  useSecondWind: (combatantId) => {
    const { combatants } = get()
    const combatant = combatants.find((c) => c.id === combatantId)

    if (!combatant) return
    if (combatant.type !== 'character') return

    // Check if can use Second Wind
    const feature = getSecondWindFeature(combatant)
    if (!feature) return
    if (!canUseSecondWind(combatant, combatant.classFeatureUses)) return

    // Roll healing
    const healResult = rollSecondWind(combatant)
    const character = combatant.data as Character

    // Use the ability (decrement uses)
    const useResult = useClassFeature(combatant, feature.id, combatant.classFeatureUses)

    // Calculate new HP (capped at max)
    const newHp = Math.min(combatant.maxHp, combatant.currentHp + healResult.total)

    get().addLogEntry({
      type: 'heal',
      actorId: combatantId,
      actorName: combatant.name,
      targetId: combatantId,
      targetName: combatant.name,
      message: `${combatant.name} uses Second Wind and heals ${healResult.total} HP!`,
      details: `1d10 [${healResult.rolls.join(', ')}] + ${character.level} (level)`,
    })

    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === combatantId
          ? {
              ...c,
              currentHp: newHp,
              hasBonusActed: true,
              classFeatureUses: useResult.newUses,
            }
          : c
      ),
    }))

    // Show heal popup
    get().addHealPopup(combatantId, healResult.total)
  },

  useActionSurge: (combatantId) => {
    const { combatants } = get()
    const combatant = combatants.find((c) => c.id === combatantId)

    if (!combatant) return
    if (combatant.type !== 'character') return

    // Check if can use Action Surge
    const feature = getActionSurgeFeature(combatant)
    if (!feature) return
    if (!canUseActionSurge(combatant, combatant.classFeatureUses)) return

    // Use the ability (decrement uses)
    const useResult = useClassFeature(combatant, feature.id, combatant.classFeatureUses)

    get().addLogEntry({
      type: 'other',
      actorId: combatantId,
      actorName: combatant.name,
      message: `${combatant.name} uses Action Surge! They can take another action this turn.`,
    })

    // Reset hasActed and attacksMadeThisTurn to allow another full Attack action
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === combatantId
          ? {
              ...c,
              hasActed: false,
              attacksMadeThisTurn: 0,
              classFeatureUses: useResult.newUses,
            }
          : c
      ),
    }))
  },

  useCunningDash: () => {
    const { turnOrder, currentTurnIndex, combatants } = get()
    const currentId = turnOrder[currentTurnIndex]
    const combatant = combatants.find((c) => c.id === currentId)

    if (!combatant || combatant.hasBonusActed) return
    if (!canUseCunningAction(combatant, 'dash')) return

    // Cunning Action Dash: adds your speed to remaining movement for this turn
    const speed = combatant.type === 'character'
      ? (combatant.data as Character).speed
      : (combatant.data as Monster).speed.walk

    get().addLogEntry({
      type: 'other',
      actorId: currentId,
      actorName: combatant.name,
      message: `${combatant.name} uses Cunning Action to Dash (+${speed} ft)!`,
    })

    // Grant extra movement (same as regular Dash but uses bonus action)
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === currentId
          ? {
              ...c,
              hasBonusActed: true,
              movementUsed: c.movementUsed - speed, // Grant extra speed (can go negative)
            }
          : c
      ),
      selectedAction: undefined,
    }))
  },

  useCunningDisengage: () => {
    const { turnOrder, currentTurnIndex, combatants } = get()
    const currentId = turnOrder[currentTurnIndex]
    const combatant = combatants.find((c) => c.id === currentId)

    if (!combatant || combatant.hasBonusActed) return
    if (!canUseCunningAction(combatant, 'disengage')) return

    get().addLogEntry({
      type: 'other',
      actorId: currentId,
      actorName: combatant.name,
      message: `${combatant.name} uses Cunning Action to Disengage!`,
    })

    // Add disengaging condition to prevent opportunity attacks this turn
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === currentId
          ? {
              ...c,
              hasBonusActed: true,
              conditions: [...c.conditions, { condition: 'disengaging', duration: 1 }],
            }
          : c
      ),
      selectedAction: undefined,
    }))
  },

  useCunningHide: () => {
    const { turnOrder, currentTurnIndex, combatants } = get()
    const currentId = turnOrder[currentTurnIndex]
    const combatant = combatants.find((c) => c.id === currentId)

    if (!combatant || combatant.hasBonusActed) return
    if (!canUseCunningAction(combatant, 'hide')) return

    get().addLogEntry({
      type: 'other',
      actorId: currentId,
      actorName: combatant.name,
      message: `${combatant.name} uses Cunning Action to Hide!`,
    })

    // Add hidden condition (grants advantage on next attack, enemies have disadvantage attacking)
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === currentId
          ? {
              ...c,
              hasBonusActed: true,
              conditions: [...c.conditions, { condition: 'hidden', duration: 1 }],
            }
          : c
      ),
      selectedAction: undefined,
    }))
  },

  useAction: () => {
    const { turnOrder, currentTurnIndex } = get()
    const currentId = turnOrder[currentTurnIndex]

    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === currentId ? { ...c, hasActed: true } : c
      ),
    }))
  },

  useBonusAction: () => {
    const { turnOrder, currentTurnIndex } = get()
    const currentId = turnOrder[currentTurnIndex]

    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === currentId ? { ...c, hasBonusActed: true } : c
      ),
    }))
  },

  useReaction: () => {
    const { turnOrder, currentTurnIndex } = get()
    const currentId = turnOrder[currentTurnIndex]

    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === currentId ? { ...c, hasReacted: true } : c
      ),
    }))
  },

  endTurn: () => {
    get().nextTurn()
  },

  isAITurn: () => {
    const { turnOrder, currentTurnIndex, combatants, phase } = get()
    if (phase !== 'combat') return false

    const currentId = turnOrder[currentTurnIndex]
    const current = combatants.find((c) => c.id === currentId)

    return current?.type === 'monster' && current.currentHp > 0
  },

  executeAITurn: async () => {
    const { turnOrder, currentTurnIndex, combatants, grid, phase } = get()
    if (phase !== 'combat') return

    const currentId = turnOrder[currentTurnIndex]
    const current = combatants.find((c) => c.id === currentId)

    if (!current || current.type !== 'character' || current.currentHp <= 0) {
      // This is a monster turn - execute AI
      if (current && current.type === 'monster' && current.currentHp > 0) {
        // Add small delay for visual feedback
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Get AI action
        const action = getNextAIAction(current, combatants, grid)

        if (action.type === 'move' && action.targetPosition) {
          get().moveCombatant(current.id, action.targetPosition)
          // Small delay after move
          await new Promise((resolve) => setTimeout(resolve, 300))

          // Get next action after move (monster may have died from opportunity attack)
          const updatedCombatants = get().combatants
          const updatedCurrent = updatedCombatants.find((c) => c.id === currentId)
          if (updatedCurrent && updatedCurrent.currentHp > 0) {
            const updatedGrid = get().grid
            const nextAction = getNextAIAction(updatedCurrent, updatedCombatants, updatedGrid)
            if (nextAction.type === 'attack' && nextAction.targetId && nextAction.action) {
              get().performAttack(updatedCurrent.id, nextAction.targetId, undefined, nextAction.action)
            }
          }
        } else if (action.type === 'attack' && action.targetId && action.action) {
          get().performAttack(current.id, action.targetId, undefined, action.action)
        }

        // Check if there's a pending reaction - if so, don't end turn yet
        // The reaction handlers (useReactionSpell/skipReaction) will end the turn
        const hasPendingReaction = get().pendingReaction !== undefined
        if (!hasPendingReaction) {
          // End the monster's turn
          await new Promise((resolve) => setTimeout(resolve, 500))
          get().endTurn()
        }
        // If there's a pending reaction, the turn will be ended by the reaction handler
      }
    }
  },

  addLogEntry: (entry) => {
    const logEntry: CombatLogEntry = {
      ...entry,
      id: generateId(),
      timestamp: Date.now(),
      round: get().round,
    }

    set((state) => ({
      log: [...state.log, logEntry],
    }))
  },

  addDamagePopup: (targetId, amount, damageType, isCritical = false) => {
    const { combatants } = get()
    const target = combatants.find((c) => c.id === targetId)
    if (!target || target.position.x < 0) return

    const popup: DamagePopup = {
      id: generateId(),
      targetId,
      position: { ...target.position },
      amount,
      damageType,
      isCritical,
      timestamp: Date.now(),
      velocityX: (Math.random() - 0.5) * 2, // Random value between -1 and 1
      popupType: 'damage',
    }

    set((state) => ({
      damagePopups: [...state.damagePopups, popup],
    }))

    // Auto-remove popup after animation completes (1.2 seconds)
    setTimeout(() => {
      get().removeDamagePopup(popup.id)
    }, 1200)
  },

  addCombatPopup: (targetId, popupType, text) => {
    const { combatants } = get()
    const target = combatants.find((c) => c.id === targetId)
    if (!target || target.position.x < 0) return

    const popup: DamagePopup = {
      id: generateId(),
      targetId,
      position: { ...target.position },
      isCritical: false,
      timestamp: Date.now(),
      velocityX: (Math.random() - 0.5) * 2,
      popupType,
      text,
    }

    set((state) => ({
      damagePopups: [...state.damagePopups, popup],
    }))

    setTimeout(() => {
      get().removeDamagePopup(popup.id)
    }, 1200)
  },

  addHealPopup: (targetId, amount) => {
    const { combatants } = get()
    const target = combatants.find((c) => c.id === targetId)
    if (!target || target.position.x < 0) return

    const popup: DamagePopup = {
      id: generateId(),
      targetId,
      position: { ...target.position },
      amount,
      isCritical: false,
      timestamp: Date.now(),
      velocityX: (Math.random() - 0.5) * 2,
      popupType: 'heal',
    }

    set((state) => ({
      damagePopups: [...state.damagePopups, popup],
    }))

    setTimeout(() => {
      get().removeDamagePopup(popup.id)
    }, 1200)
  },

  removeDamagePopup: (id) => {
    set((state) => ({
      damagePopups: state.damagePopups.filter((p) => p.id !== id),
    }))
  },

  resetCombat: () => {
    set(initialState)
  },
}))

// Selector helpers
export function getCurrentCombatant(state: CombatState): Combatant | undefined {
  return state.combatants.find(
    (c) => c.id === state.turnOrder[state.currentTurnIndex]
  )
}

export function isCurrentTurn(state: CombatState, combatantId: string): boolean {
  return state.turnOrder[state.currentTurnIndex] === combatantId
}
