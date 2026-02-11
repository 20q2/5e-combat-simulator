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
  ActiveProjectile,
  DamageType,
  CombatPopupType,
  Condition,
  WeaponMastery,
} from '@/types'
import { rollInitiative, rollDie, rollD20 } from '@/engine/dice'
import { getAbilityModifier } from '@/types'
import { resolveAttack, canAttackTarget, getSpellSaveDC, getSpellAttackBonus, rollCombatantSavingThrow, rollDeathSave, selectWeaponForTarget, isRangedAttack, type AttackResult } from '@/engine/combat'
import { rollAttack, rollDamage } from '@/engine/dice'
import { getNextAIAction } from '@/engine/ai'
// Movement calculations now handled by pathfinding module
import { findPath, getReachablePositions as getReachableFromPathfinding, blocksMovement, calculatePathCost, type MovementContext } from '@/lib/pathfinding'
import {
  initializeRacialAbilityUses,
  checkRelentlessEndurance,
  applyRelentlessEndurance,
  useRacialAbility as decrementRacialAbilityUse,
  applyDamageResistance,
  rollBreathWeaponDamage,
  hasNimbleness,
  canMoveThrough,
} from '@/engine/racialAbilities'
import {
  getAttackReplacementById,
  canUseAttackReplacement,
  getReplacementSourceId,
} from '@/engine/attackReplacements'
import type { AoEAttackReplacement, AoETargetResult } from '@/types'
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
  canUseIndomitable,
  getIndomitableFeature,
  getIndomitableBonus,
  hasStudiedAttacks,
} from '@/engine/classAbilities'
import {
  applyOnHitMasteryEffect,
  applyGrazeOnMiss,
} from '@/engine/weaponMastery'
import {
  initializeSuperiorityDice,
  checkRelentless,
  getAvailableManeuvers,
  applyOnHitManeuver,
  getSuperiorityDieSize,
  getManeuverSaveDC,
  prepareRiposte,
  applyParry,
  applyPrecisionAttack,
  applySweepingAttack,
  applyEvasiveFootwork,
  applyFeintingAttack,
  applyLungingAttack,
  hasCombatSuperiority,
} from '@/engine/maneuvers'
import { getManeuverById } from '@/data/maneuvers'
import type { TriggerOption, PendingTrigger } from '@/types'
import { getAoEAffectedCells } from '@/lib/aoeShapes'
import { getCombatantSize, getOccupiedCells, getFootprintSize } from '@/lib/creatureSize'
import {
  initializeFeatUses,
  getAlertInitiativeBonus,
  canSwapInitiative,
  getEligibleSwapTargets,
  canUseSavageAttacker,
  canTavernBrawlerPush,
  calculatePushPosition,
  isUnarmedStrike,
  canUseBattleMedic,
  getBattleMedicTargets as getOriginFeatBattleMedicTargets,
  rollBattleMedicHealing,
  startsWithHeroicInspiration,
  canUseHeroicInspiration,
} from '@/engine/originFeats'

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
  preselectWeapon: (weaponId: string) => void
  preselectSpell: (spellId: string) => void
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

  // Combat triggers (maneuvers, class features)
  resolveTrigger: (optionId: string | null) => void
  skipTrigger: () => void

  // Indomitable (Fighter save reroll)
  resolveIndomitable: (useReroll: boolean) => void
  skipIndomitable: () => void

  // Heroic Inspiration (Musician feat reroll)
  resolveHeroicInspiration: (useReroll: boolean) => void
  skipHeroicInspiration: () => void

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
  performAttack: (attackerId: string, targetId: string, weapon?: Weapon, monsterAction?: MonsterAction, rangedWeapon?: Weapon, masteryOverride?: WeaponMastery, attackBonus?: number, skipPreAttackCheck?: boolean, overrideNaturalRoll?: number) => AttackResult | null
  performAttackReplacement: (attackerId: string, replacementId: string, targetPosition: Position) => boolean
  performOpportunityAttack: (attackerId: string, targetId: string, attackReplacementId?: string) => AttackResult | null
  useDash: () => void
  useDodge: () => void
  getValidTargets: (attackerId: string, weapon?: Weapon, monsterAction?: MonsterAction, rangedWeapon?: Weapon) => Combatant[]
  castSpell: (casterId: string, spell: Spell, targetId?: string, targetPosition?: Position, projectileAssignments?: { targetId: string; count: number }[]) => boolean
  getAvailableSpells: (combatantId: string) => Spell[]
  makeDeathSave: (combatantId: string) => void
  stabilize: (combatantId: string) => void
  getThreateningEnemies: (combatantId: string) => Combatant[]

  // Attack replacement (breath weapon, etc.)
  setBreathWeaponTargeting: (targeting: { replacementId: string; attackerId: string } | undefined) => void

  // Racial abilities
  useRacialAbility: (combatantId: string, abilityId: string) => void

  // Class abilities
  useSecondWind: (combatantId: string) => void
  useActionSurge: (combatantId: string) => void
  useCunningDash: () => void
  useCunningDisengage: () => void
  useCunningHide: () => void

  // Battle Master maneuvers
  useSuperiority: (combatantId: string) => void
  getSuperiorityDiceRemaining: (combatantId: string) => number
  useBonusActionManeuver: (maneuverId: string, targetId?: string) => void

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

  // Projectile animations (ranged attacks)
  launchProjectile: (from: Position, to: Position, onComplete: () => void) => string
  removeProjectile: (id: string) => void

  // Debug utilities
  debugApplyCondition: (combatantId: string, condition: Condition) => void
  debugRemoveCondition: (combatantId: string, condition: Condition) => void

  // Origin feats
  confirmInitiativeSwap: (targetId: string | null) => void
  skipInitiativeSwap: () => void
  confirmSavageAttacker: (useRoll1: boolean) => void
  skipSavageAttacker: () => void
  useBattleMedic: (healerId: string, targetId: string) => void
  getBattleMedicTargets: (healerId: string) => Combatant[]

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

/**
 * Check if a combatant is dead (not just unconscious)
 * Monsters die at 0 HP, characters die at 3 death save failures
 */
export function isDead(combatant: Combatant): boolean {
  if (combatant.type === 'monster') {
    return combatant.currentHp <= 0
  }
  // Characters are dead only with 3 death save failures
  return combatant.deathSaves.failures >= 3
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
  preselectedWeaponId: undefined,
  preselectedSpellId: undefined,
  targetingMode: undefined,
  hoveredTargetId: undefined,
  damagePopups: [],
  activeProjectiles: [],
  pendingReaction: undefined,
  pendingIndomitable: undefined,
  pendingAttack: undefined,
  movementAnimation: undefined,
  pendingMovement: undefined,
}

// Module-level map for deferred projectile callbacks (not stored in Zustand state)
const projectileCallbacks = new Map<string, () => void>()
const PROJECTILE_FLIGHT_DURATION = 400 // ms

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
      // Magic Initiate free uses
      magicInitiateFreeUses: {},
      // Battle Master tracking
      superiorityDiceRemaining: 0,
      usedManeuverThisAttack: false,
      goadedBy: undefined,
      evasiveFootworkBonus: undefined,
      feintTarget: undefined,
      feintBonusDamage: undefined,
      lungingAttackBonus: undefined,
      // Fighter Studied Attacks tracking (level 13)
      studiedTargetId: undefined,
      // Origin Feat tracking
      featUses: {},
      usedSavageAttackerThisTurn: false,
      usedTavernBrawlerPushThisTurn: false,
      heroicInspiration: false,
    }

    // Initialize racial and class ability uses for characters
    if (input.type === 'character') {
      combatant.racialAbilityUses = initializeRacialAbilityUses(combatant)
      combatant.classFeatureUses = initializeClassFeatureUses(combatant)
      // Initialize superiority dice for Battle Masters
      combatant.superiorityDiceRemaining = initializeSuperiorityDice(combatant)
      // Initialize Magic Initiate free spell uses (one free cast per level 1 spell per long rest)
      const character = input.data as Character
      if (character.magicInitiateChoices) {
        for (const choice of character.magicInitiateChoices) {
          if (choice.levelOneSpell) {
            combatant.magicInitiateFreeUses[choice.levelOneSpell] = true
          }
        }
      }
      // Initialize origin feat uses (e.g., Lucky luck points)
      combatant.featUses = initializeFeatUses(combatant)
      // Initialize Heroic Inspiration for Musician feat
      combatant.heroicInspiration = startsWithHeroicInspiration(combatant)
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

      // Alert feat: add proficiency bonus to initiative
      const alertBonus = getAlertInitiativeBonus(c)
      const totalMod = dexMod + alertBonus
      const roll = rollInitiative(totalMod)

      get().addLogEntry({
        type: 'initiative',
        actorId: c.id,
        actorName: c.name,
        message: alertBonus > 0
          ? `rolls initiative (Alert +${alertBonus}): ${roll.breakdown}`
          : `rolls initiative: ${roll.breakdown}`,
      })

      // Check Relentless feature for Battle Masters with 0 dice
      let superiorityDiceRemaining = c.superiorityDiceRemaining
      if (checkRelentless(c)) {
        superiorityDiceRemaining = 1
        get().addLogEntry({
          type: 'other',
          actorId: c.id,
          actorName: c.name,
          message: 'Relentless triggers: regains 1 superiority die',
        })
      }

      return { ...c, initiative: roll.total, superiorityDiceRemaining }
    })

    // Sort by initiative (highest first)
    const sorted = [...updatedCombatants].sort((a, b) => b.initiative - a.initiative)
    const turnOrder = sorted.map((c) => c.id)

    // Check for Alert feat initiative swap opportunities
    const alertCharacters = updatedCombatants.filter(c =>
      c.type === 'character' && canSwapInitiative(c)
    )

    // Set up pending initiative swap if any character has Alert with eligible allies
    let pendingSwap: { swapperId: string; eligibleAllies: string[] } | undefined
    if (alertCharacters.length > 0) {
      const swapper = alertCharacters[0]
      const eligibleAllies = getEligibleSwapTargets(swapper, updatedCombatants)
      if (eligibleAllies.length > 0) {
        pendingSwap = {
          swapperId: swapper.id,
          eligibleAllies: eligibleAllies.map(a => a.id),
        }
      }
    }

    set({
      combatants: updatedCombatants,
      turnOrder,
      phase: 'initiative',
      pendingInitiativeSwap: pendingSwap,
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
            // Reset maneuver tracking (in case turn ended mid-attack)
            usedManeuverThisAttack: false,
            // Reset bonus action maneuver tracking
            feintTarget: undefined,
            feintBonusDamage: undefined,
            lungingAttackBonus: undefined,
            // Reset origin feat per-turn flags
            usedSavageAttackerThisTurn: false,
            usedTavernBrawlerPushThisTurn: false,
          }
        : c
    )

    let nextIndex = currentTurnIndex + 1
    let newRound = get().round

    // Check if we've completed a round
    if (nextIndex >= turnOrder.length) {
      nextIndex = 0
      newRound += 1

      // Round divider is shown automatically in CombatLog via round grouping
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

      // Clear evasive footwork bonus when evasive condition expires
      const evasiveExpired = expiredConditions.includes('evasive')

      return {
        ...c,
        conditions: newConditions,
        ...(evasiveExpired ? { evasiveFootworkBonus: undefined } : {}),
      }
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

  preselectWeapon: (weaponId) => {
    set({ selectedAction: 'attack', preselectedWeaponId: weaponId })
  },

  preselectSpell: (spellId) => {
    set({ selectedAction: 'spell', preselectedSpellId: spellId })
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

  resolveIndomitable: (useReroll: boolean) => {
    const { pendingIndomitable, combatants } = get()
    if (!pendingIndomitable) return

    const combatant = combatants.find(c => c.id === pendingIndomitable.combatantId)
    if (!combatant) {
      set({ pendingIndomitable: undefined })
      return
    }

    const { ability, dc, modifier, context } = pendingIndomitable

    if (useReroll) {
      // Use Indomitable - reroll with Fighter level bonus
      const feature = getIndomitableFeature(combatant)
      if (!feature) {
        set({ pendingIndomitable: undefined })
        return
      }

      const bonus = getIndomitableBonus(combatant)
      const reroll = rollD20(modifier + bonus, 'normal')
      const success = reroll.total >= dc

      // Decrement Indomitable uses
      const useResult = useClassFeature(combatant, feature.id, combatant.classFeatureUses)
      set((state) => ({
        combatants: state.combatants.map(c =>
          c.id === combatant.id
            ? { ...c, classFeatureUses: useResult.newUses }
            : c
        ),
      }))

      // Log the Indomitable use
      get().addLogEntry({
        type: 'other',
        actorId: combatant.id,
        actorName: combatant.name,
        message: `${combatant.name} uses Indomitable! Rerolls ${ability} save: ${reroll.naturalRoll} + ${modifier + bonus} = ${reroll.total} vs DC ${dc}`,
        details: success ? 'SUCCESS!' : 'Still fails...',
      })

      if (success) {
        // Save succeeded on reroll
        get().addCombatPopup(combatant.id, 'saved')

        // Handle half damage on successful save
        if (context.damage && context.halfDamageOnSave) {
          const halfDamage = Math.floor(context.damage / 2)
          if (halfDamage > 0) {
            get().dealDamage(combatant.id, halfDamage, context.sourceName)
            get().addDamagePopup(combatant.id, halfDamage, context.damageType || 'bludgeoning', false)
          }
        }
      } else {
        // Still failed - apply full effect
        get().addCombatPopup(combatant.id, 'save_failed')
        if (context.damage) {
          get().dealDamage(combatant.id, context.damage, context.sourceName)
          get().addDamagePopup(combatant.id, context.damage, context.damageType || 'bludgeoning', false)
        }
      }
    } else {
      // Chose not to use Indomitable - apply original failure effect
      get().addCombatPopup(combatant.id, 'save_failed')
      if (context.damage) {
        get().dealDamage(combatant.id, context.damage, context.sourceName)
        get().addDamagePopup(combatant.id, context.damage, context.damageType || 'bludgeoning', false)
      }
    }

    // Clear pending state
    set({ pendingIndomitable: undefined })

    // If this was during an AI turn, continue
    if (get().isAITurn()) {
      setTimeout(() => get().endTurn(), 500)
    }
  },

  skipIndomitable: () => {
    // Same as resolveIndomitable(false)
    get().resolveIndomitable(false)
  },

  resolveHeroicInspiration: (useReroll: boolean) => {
    const { pendingHeroicInspiration, combatants } = get()
    if (!pendingHeroicInspiration) return

    const combatant = combatants.find(c => c.id === pendingHeroicInspiration.combatantId)
    if (!combatant) {
      set({ pendingHeroicInspiration: undefined })
      return
    }

    const { type, modifier, targetValue, context } = pendingHeroicInspiration

    // Helper to defer effects behind a projectile for ranged attacks
    const deferIfRangedAttack = (fn: () => void) => {
      if (type === 'attack' && context.isRanged) {
        const target = combatants.find(c => c.id === context.targetId)
        if (target) {
          get().launchProjectile({ ...combatant.position }, { ...target.position }, fn)
          return
        }
      }
      fn()
    }

    if (useReroll) {
      // Use Heroic Inspiration - reroll d20 (must take new result)
      const reroll = rollD20(modifier, 'normal')
      const success = type === 'attack'
        ? reroll.total >= targetValue || reroll.isNatural20
        : reroll.total >= targetValue

      // Consume Heroic Inspiration
      set((state) => ({
        combatants: state.combatants.map(c =>
          c.id === combatant.id
            ? { ...c, heroicInspiration: false }
            : c
        ),
      }))

      if (type === 'attack') {
        // Handle attack reroll
        get().addLogEntry({
          type: 'other',
          actorId: combatant.id,
          actorName: combatant.name,
          message: `${combatant.name} uses Heroic Inspiration! Rerolls attack: ${reroll.naturalRoll} + ${modifier} = ${reroll.total} vs AC ${targetValue}`,
          details: success ? 'HIT!' : 'Still misses...',
        })

        if (success) {
          get().addLogEntry({
            type: 'attack',
            actorId: combatant.id,
            actorName: combatant.name,
            targetId: context.targetId,
            targetName: context.targetName,
            message: `${combatant.name} hits ${context.targetName} with Heroic Inspiration reroll!`,
            details: `${reroll.naturalRoll} + ${modifier} = ${reroll.total} vs AC ${targetValue}`,
          })

          // Defer damage behind projectile for ranged attacks
          deferIfRangedAttack(() => {
            get().addCombatPopup(context.targetId!, reroll.isNatural20 ? 'critical' : 'damage')
            // Roll and apply damage if we have weapon info
            if (context.weapon) {
              const isCrit = reroll.isNatural20
              const damageResult = rollDamage(context.weapon.damage, isCrit)
              const target = get().combatants.find(c => c.id === context.targetId)
              if (target) {
                get().dealDamage(target.id, damageResult.total, combatant.name)
                get().addDamagePopup(target.id, damageResult.total, context.weapon.damageType as DamageType, isCrit)
                if (isCrit) {
                  get().addCombatPopup(target.id, 'critical')
                }
                get().addLogEntry({
                  type: 'damage',
                  actorId: combatant.id,
                  actorName: combatant.name,
                  targetId: target.id,
                  targetName: target.name,
                  message: `${damageResult.total} ${context.weapon.damageType} damage`,
                  details: damageResult.breakdown,
                })
              }
            }
          })
        } else {
          // Still missed - defer miss popup behind projectile
          deferIfRangedAttack(() => {
            get().addCombatPopup(context.targetId!, 'miss')
          })
        }
      } else {
        // Handle saving throw reroll
        get().addLogEntry({
          type: 'other',
          actorId: combatant.id,
          actorName: combatant.name,
          message: `${combatant.name} uses Heroic Inspiration! Rerolls ${context.ability} save: ${reroll.naturalRoll} + ${modifier} = ${reroll.total} vs DC ${targetValue}`,
          details: success ? 'SUCCESS!' : 'Still fails...',
        })

        if (success) {
          // Save succeeded on reroll
          get().addCombatPopup(combatant.id, 'saved')

          // Handle half damage on successful save
          if (context.damage && context.halfDamageOnSave) {
            const halfDamage = Math.floor(context.damage / 2)
            if (halfDamage > 0) {
              get().dealDamage(combatant.id, halfDamage, context.sourceName)
              get().addDamagePopup(combatant.id, halfDamage, context.damageType || 'bludgeoning', false)
            }
          }
        } else {
          // Still failed - apply full effect
          get().addCombatPopup(combatant.id, 'save_failed')
          if (context.damage) {
            get().dealDamage(combatant.id, context.damage, context.sourceName)
            get().addDamagePopup(combatant.id, context.damage, context.damageType || 'bludgeoning', false)
          }
        }
      }
    } else {
      // Chose not to use Heroic Inspiration - accept original failure
      if (type === 'save') {
        get().addCombatPopup(combatant.id, 'save_failed')
        if (context.damage) {
          get().dealDamage(combatant.id, context.damage, context.sourceName)
          get().addDamagePopup(combatant.id, context.damage, context.damageType || 'bludgeoning', false)
        }
      } else if (type === 'attack') {
        // Miss was logged but popup was deferred - launch projectile now with miss popup
        deferIfRangedAttack(() => {
          get().addCombatPopup(context.targetId!, 'miss')
        })
      }
    }

    // Clear pending state
    set({ pendingHeroicInspiration: undefined })

    // If this was during an AI turn, continue
    if (get().isAITurn()) {
      setTimeout(() => get().endTurn(), 500)
    }
  },

  skipHeroicInspiration: () => {
    // Same as resolveHeroicInspiration(false)
    get().resolveHeroicInspiration(false)
  },

  resolveTrigger: (optionId: string | null) => {
    const { pendingTrigger, pendingAttack, combatants, grid, round } = get()
    if (!pendingTrigger) return

    const reactor = combatants.find(c => c.id === pendingTrigger.reactorId)
    const target = combatants.find(c => c.id === pendingTrigger.targetId)
    if (!reactor || !target) {
      // Clear trigger and return
      set({ pendingTrigger: undefined, pendingAttack: undefined })
      return
    }

    // Handle pre_attack maneuvers (Precision Attack - triggered on miss)
    if (pendingTrigger.type === 'pre_attack' && pendingAttack) {
      let attackBonus = 0

      if (optionId === 'precision-attack') {
        // Roll superiority die to see if the miss becomes a hit
        const maneuverResult = applyPrecisionAttack(reactor)
        attackBonus = maneuverResult.attackBonus || 0

        const originalTotal = pendingTrigger.context.attackRoll || 0
        const targetAC = pendingTrigger.context.targetAC || 0
        const newTotal = originalTotal + attackBonus
        const wouldHit = newTotal >= targetAC

        // Log the maneuver usage with hit/miss result
        get().addLogEntry({
          type: 'other',
          actorId: reactor.id,
          actorName: reactor.name,
          message: wouldHit
            ? `${reactor.name} uses Precision Attack! +${attackBonus} to attack roll (${originalTotal} → ${newTotal} vs AC ${targetAC}) - turns the miss into a hit!`
            : `${reactor.name} uses Precision Attack! +${attackBonus} to attack roll (${originalTotal} → ${newTotal} vs AC ${targetAC}) - still not enough!`,
          details: `Superiority die: d${maneuverResult.superiorityDieSize}`,
        })

        // Decrement superiority dice and mark maneuver as used this attack
        set((state) => ({
          combatants: state.combatants.map(c =>
            c.id === reactor.id
              ? {
                  ...c,
                  superiorityDiceRemaining: Math.max(0, c.superiorityDiceRemaining - 1),
                  usedManeuverThisAttack: true,
                }
              : c
          ),
        }))
      }

      // Clear pending states
      set({ pendingTrigger: undefined, pendingAttack: undefined })

      // Re-resolve the attack with the same d20 roll + precision bonus
      // skipPreAttackCheck=true prevents re-prompting for Precision Attack
      get().performAttack(
        pendingAttack.attackerId,
        pendingAttack.targetId,
        pendingAttack.weapon,
        pendingAttack.monsterAction,
        pendingAttack.rangedWeapon,
        pendingAttack.masteryOverride,
        attackBonus,                          // Precision die bonus (0 if declined)
        true,                                 // Skip pre-attack check
        pendingAttack.overrideNaturalRoll,    // Same d20 roll
      )

      return
    }

    // Handle Riposte (on_miss) - completely different flow (counter-attack)
    if (pendingTrigger.type === 'on_miss' && optionId === 'riposte') {
      const maneuver = getManeuverById('riposte')
      if (!maneuver) {
        set({ pendingTrigger: undefined })
        return
      }

      // Get the Riposte bonus damage (roll superiority die)
      const riposteResult = prepareRiposte(reactor)

      // Use reaction and decrement superiority dice
      set((state) => ({
        combatants: state.combatants.map(c =>
          c.id === reactor.id
            ? {
                ...c,
                hasReacted: true,
                superiorityDiceRemaining: Math.max(0, c.superiorityDiceRemaining - 1),
              }
            : c
        ),
      }))

      // Log the Riposte activation
      get().addLogEntry({
        type: 'other',
        actorId: reactor.id,
        actorName: reactor.name,
        message: riposteResult.message,
        details: `Superiority die: d${riposteResult.superiorityDieSize}`,
      })

      // Make the counter-attack (use performAttack but add bonus damage)
      // Get the reactor's melee weapon
      const character = reactor.data as Character
      const meleeWeapon = character.equipment?.meleeWeapon

      if (meleeWeapon) {
        // Resolve a melee attack against the original attacker
        const attackResult = resolveAttack({
          attacker: reactor,
          target,  // target is the original attacker who missed
          weapon: meleeWeapon,
          allCombatants: combatants,
          usedSneakAttackThisTurn: reactor.usedSneakAttackThisTurn,
        })

        // Log the counter-attack
        if (attackResult.hit) {
          get().addLogEntry({
            type: 'attack',
            actorId: reactor.id,
            actorName: reactor.name,
            targetId: target.id,
            targetName: target.name,
            message: `${reactor.name} ripostes and hits ${target.name}!`,
            details: `${attackResult.attackRoll.breakdown} vs AC ${attackResult.targetAC}`,
          })

          // Calculate damage with Riposte bonus
          const baseDamage = attackResult.damage?.total || 0
          const totalDamage = baseDamage + (riposteResult.bonusDamage || 0)
          const damageType = (attackResult.damageType ?? meleeWeapon.damageType ?? 'slashing') as DamageType

          get().dealDamage(target.id, totalDamage, reactor.name)
          get().addDamagePopup(target.id, totalDamage, damageType, attackResult.critical)
          if (attackResult.critical) {
            get().addCombatPopup(target.id, 'critical')
          }

          get().addLogEntry({
            type: 'damage',
            actorId: reactor.id,
            actorName: reactor.name,
            targetId: target.id,
            targetName: target.name,
            message: `${totalDamage} ${damageType} damage (${baseDamage} + ${riposteResult.bonusDamage} Riposte)`,
          })
        } else {
          get().addLogEntry({
            type: 'attack',
            actorId: reactor.id,
            actorName: reactor.name,
            targetId: target.id,
            targetName: target.name,
            message: `${reactor.name} ripostes but misses ${target.name}`,
            details: `${attackResult.attackRoll.breakdown} vs AC ${attackResult.targetAC}`,
          })
          get().addCombatPopup(target.id, 'miss')
        }
      }

      // Clear pending trigger
      set({ pendingTrigger: undefined })
      return
    }

    // Handle on_damage_taken (Shield spell, Parry maneuver)
    if (pendingTrigger.type === 'on_damage_taken') {
      let finalDamage = pendingTrigger.pendingDamage || 0
      const damageType = pendingTrigger.context.damageType || 'bludgeoning'
      const isCritical = pendingTrigger.context.isCritical || false
      const attackRoll = pendingTrigger.context.attackRoll || 0
      const targetAC = pendingTrigger.context.targetAC || 10
      const triggerer = combatants.find(c => c.id === pendingTrigger.triggererId)

      if (optionId === 'shield') {
        // Handle Shield spell
        const acBonus = 5
        const newAC = targetAC + acBonus

        // Log the Shield cast
        get().addLogEntry({
          type: 'spell',
          actorId: reactor.id,
          actorName: reactor.name,
          message: `${reactor.name} casts Shield as a reaction! (+${acBonus} AC)`,
          details: `AC ${targetAC} → ${newAC}`,
        })

        // Mark reaction as used
        set((state) => ({
          combatants: state.combatants.map(c =>
            c.id === reactor.id
              ? { ...c, hasReacted: true }
              : c
          ),
        }))

        // Check if the attack now misses with the new AC
        if (attackRoll < newAC) {
          // Attack misses due to Shield
          get().addLogEntry({
            type: 'attack',
            actorId: pendingTrigger.triggererId,
            actorName: triggerer?.name || 'Attacker',
            targetId: reactor.id,
            targetName: reactor.name,
            message: `Attack blocked by Shield!`,
            details: `Roll ${attackRoll} vs AC ${newAC}`,
          })
          get().addCombatPopup(reactor.id, 'saved')
          finalDamage = 0  // No damage taken
        }

        // Apply Shield buff (lasts until start of reactor's next turn)
        set((state) => ({
          combatants: state.combatants.map(c =>
            c.id === reactor.id
              ? {
                  ...c,
                  conditions: [
                    ...c.conditions,
                    { condition: 'shielded' as const, duration: 1, source: 'Shield spell' }
                  ]
                }
              : c
          ),
        }))

      } else if (optionId === 'parry') {
        // Handle Parry maneuver
        const parryResult = applyParry(reactor, finalDamage)

        // Log the Parry
        get().addLogEntry({
          type: 'other',
          actorId: reactor.id,
          actorName: reactor.name,
          message: parryResult.message,
          details: `Superiority die: d${parryResult.superiorityDieSize}`,
        })

        // Reduce damage
        finalDamage = Math.max(0, finalDamage - (parryResult.damageReduced || 0))

        // Mark reaction as used and decrement superiority dice
        set((state) => ({
          combatants: state.combatants.map(c =>
            c.id === reactor.id
              ? {
                  ...c,
                  hasReacted: true,
                  superiorityDiceRemaining: Math.max(0, c.superiorityDiceRemaining - 1),
                }
              : c
          ),
        }))
      }

      // Deal the final damage (if any)
      if (finalDamage > 0) {
        get().dealDamage(reactor.id, finalDamage, triggerer?.name)
        get().addDamagePopup(reactor.id, finalDamage, damageType, isCritical)
        if (isCritical) {
          get().addCombatPopup(reactor.id, 'critical')
        }

        get().addLogEntry({
          type: 'damage',
          actorId: pendingTrigger.triggererId,
          actorName: triggerer?.name || 'Attacker',
          targetId: reactor.id,
          targetName: reactor.name,
          message: `${finalDamage} ${damageType} damage`,
        })
      }

      // Clear pending trigger
      set({ pendingTrigger: undefined })
      return
    }

    // Handle on_hit maneuvers (Trip Attack, Menacing Attack, etc.)
    let totalDamage = pendingTrigger.pendingDamage || 0
    const damageType = pendingTrigger.context.damageType || 'bludgeoning'
    const isCritical = pendingTrigger.context.isCritical || false

    if (optionId) {
      // Player chose to use a maneuver
      const maneuver = getManeuverById(optionId)
      if (maneuver && pendingTrigger.type === 'on_hit') {
        // Apply the maneuver
        const maneuverResult = applyOnHitManeuver(reactor, target, maneuver, grid, combatants)

        // Add bonus damage if applicable
        if (maneuverResult.bonusDamage) {
          totalDamage += maneuverResult.bonusDamage
        }

        // Log the maneuver usage
        get().addLogEntry({
          type: 'other',
          actorId: reactor.id,
          actorName: reactor.name,
          message: maneuverResult.message,
          details: `Superiority die: d${maneuverResult.superiorityDieSize}`,
        })

        // Show save result popup for maneuvers with saving throws
        if (maneuver.savingThrow && maneuverResult.savingThrowMade !== undefined) {
          if (maneuverResult.savingThrowMade) {
            get().addCombatPopup(target.id, 'saved')
          } else {
            get().addCombatPopup(target.id, 'save_failed')
          }
        }

        // Apply condition if save failed (or unconditional like Distracting Strike)
        if (maneuverResult.conditionApplied) {
          const conditionEntry: { condition: typeof maneuverResult.conditionApplied; duration: number; source?: string } = {
            condition: maneuverResult.conditionApplied,
            duration: maneuver.conditionDuration || -1,
          }
          // Distracting Strike: store source so only OTHER attackers get advantage
          if (maneuver.id === 'distracting-strike') {
            conditionEntry.source = reactor.id
          }

          set((state) => ({
            combatants: state.combatants.map(c =>
              c.id === target.id
                ? {
                    ...c,
                    conditions: [...c.conditions, conditionEntry],
                    // Goading Attack: track who goaded the target
                    ...(maneuver.id === 'goading-attack' ? { goadedBy: reactor.id } : {}),
                  }
                : c
            ),
          }))
          // Show condition popup on target
          const conditionName = maneuverResult.conditionApplied.charAt(0).toUpperCase() + maneuverResult.conditionApplied.slice(1)
          get().addCombatPopup(target.id, 'condition', conditionName)
        }

        // Handle Sweeping Attack: deal die damage to adjacent enemy
        if (maneuver.sweepDamage) {
          const attackRoll = pendingTrigger.context.attackRoll || 0
          const sweepResult = applySweepingAttack(
            reactor, target, attackRoll, combatants,
            () => damageType
          )
          get().addLogEntry({
            type: 'other',
            actorId: reactor.id,
            actorName: reactor.name,
            message: sweepResult.message,
          })
          if (sweepResult.sweepTargetId && sweepResult.sweepDamage) {
            get().dealDamage(sweepResult.sweepTargetId, sweepResult.sweepDamage, reactor.name)
            get().addDamagePopup(sweepResult.sweepTargetId, sweepResult.sweepDamage, sweepResult.sweepDamageType || damageType)
          }
        }

        // Decrement superiority dice and mark maneuver as used this attack
        set((state) => ({
          combatants: state.combatants.map(c =>
            c.id === reactor.id
              ? {
                  ...c,
                  superiorityDiceRemaining: Math.max(0, c.superiorityDiceRemaining - 1),
                  usedManeuverThisAttack: true,
                }
              : c
          ),
        }))
      }
    }

    // Deal the damage (with any bonus from maneuver)
    get().dealDamage(target.id, totalDamage, reactor.name)
    get().addDamagePopup(target.id, totalDamage, damageType, isCritical)
    if (isCritical) {
      get().addCombatPopup(target.id, 'critical')
    }

    // Log damage
    get().addLogEntry({
      type: 'damage',
      actorId: reactor.id,
      actorName: reactor.name,
      targetId: target.id,
      targetName: target.name,
      message: `${totalDamage} ${damageType} damage`,
    })

    // Apply on-hit weapon mastery effects
    const weapon = pendingTrigger.context.weapon
    if (weapon) {
      const { combatants: currentCombatants } = get()
      const updatedReactor = currentCombatants.find(c => c.id === reactor.id)
      const updatedTarget = currentCombatants.find(c => c.id === target.id)

      if (updatedReactor && updatedTarget) {
        const masteryResult = applyOnHitMasteryEffect(updatedReactor, updatedTarget, weapon, grid, currentCombatants, round)

        if (masteryResult && masteryResult.applied) {
          get().addLogEntry({
            type: 'other',
            actorId: reactor.id,
            actorName: reactor.name,
            message: masteryResult.description,
            details: `Weapon mastery: ${masteryResult.mastery}`,
          })

          // Apply specific effects based on mastery type
          switch (masteryResult.mastery) {
            case 'push':
              if (masteryResult.pushResult) {
                set((state) => ({
                  combatants: state.combatants.map((c) =>
                    c.id === target.id
                      ? { ...c, position: masteryResult.pushResult!.newPosition }
                      : c
                  ),
                }))
              }
              break

            case 'sap':
              set((state) => ({
                combatants: state.combatants.map((c) =>
                  c.id === target.id
                    ? {
                        ...c,
                        conditions: [...c.conditions, { condition: 'sapped' as const, duration: 1 }],
                      }
                    : c
                ),
              }))
              get().addCombatPopup(target.id, 'condition', 'Sapped')
              break

            case 'topple':
              if (masteryResult.toppleResult) {
                if (!masteryResult.toppleResult.savePassed) {
                  get().addCombatPopup(target.id, 'save_failed')
                  set((state) => ({
                    combatants: state.combatants.map((c) =>
                      c.id === target.id
                        ? {
                            ...c,
                            conditions: [...c.conditions, { condition: 'prone' as const, duration: -1 }],
                          }
                        : c
                    ),
                  }))
                  get().addCombatPopup(target.id, 'condition', 'Prone')
                } else {
                  get().addCombatPopup(target.id, 'saved')
                }
              }
              break

            case 'vex':
              set((state) => ({
                combatants: state.combatants.map((c) =>
                  c.id === target.id
                    ? {
                        ...c,
                        vexedBy: { attackerId: reactor.id, expiresOnRound: round + 1 },
                      }
                    : c
                ),
              }))
              break
          }
        }
      }
    }

    // Clear pending trigger
    set({ pendingTrigger: undefined })
  },

  skipTrigger: () => {
    const { pendingTrigger, pendingAttack, combatants, grid, round } = get()
    if (!pendingTrigger) return

    // For pre_attack triggers, just call resolveTrigger with null (no maneuver)
    if (pendingTrigger.type === 'pre_attack' && pendingAttack) {
      get().resolveTrigger(null)
      return
    }

    const reactor = combatants.find(c => c.id === pendingTrigger.reactorId)
    const target = combatants.find(c => c.id === pendingTrigger.targetId)

    if (!target) {
      set({ pendingTrigger: undefined, pendingAttack: undefined })
      return
    }

    const totalDamage = pendingTrigger.pendingDamage || 0
    const damageType = pendingTrigger.context.damageType || 'bludgeoning'
    const isCritical = pendingTrigger.context.isCritical || false

    // Deal the pending damage without maneuver bonus
    get().dealDamage(target.id, totalDamage, reactor?.name)
    get().addDamagePopup(target.id, totalDamage, damageType, isCritical)
    if (isCritical) {
      get().addCombatPopup(target.id, 'critical')
    }

    // Log damage
    if (reactor) {
      get().addLogEntry({
        type: 'damage',
        actorId: reactor.id,
        actorName: reactor.name,
        targetId: target.id,
        targetName: target.name,
        message: `${totalDamage} ${damageType} damage`,
      })
    }

    // Apply on-hit weapon mastery effects
    const weapon = pendingTrigger.context.weapon
    if (weapon && reactor) {
      const { combatants: currentCombatants } = get()
      const updatedReactor = currentCombatants.find(c => c.id === reactor.id)
      const updatedTarget = currentCombatants.find(c => c.id === target.id)

      if (updatedReactor && updatedTarget) {
        const masteryResult = applyOnHitMasteryEffect(updatedReactor, updatedTarget, weapon, grid, currentCombatants, round)

        if (masteryResult && masteryResult.applied) {
          get().addLogEntry({
            type: 'other',
            actorId: reactor.id,
            actorName: reactor.name,
            message: masteryResult.description,
            details: `Weapon mastery: ${masteryResult.mastery}`,
          })

          // Apply specific effects based on mastery type
          switch (masteryResult.mastery) {
            case 'push':
              if (masteryResult.pushResult) {
                set((state) => ({
                  combatants: state.combatants.map((c) =>
                    c.id === target.id
                      ? { ...c, position: masteryResult.pushResult!.newPosition }
                      : c
                  ),
                }))
              }
              break

            case 'sap':
              set((state) => ({
                combatants: state.combatants.map((c) =>
                  c.id === target.id
                    ? {
                        ...c,
                        conditions: [...c.conditions, { condition: 'sapped' as const, duration: 1 }],
                      }
                    : c
                ),
              }))
              get().addCombatPopup(target.id, 'condition', 'Sapped')
              break

            case 'topple':
              if (masteryResult.toppleResult) {
                if (!masteryResult.toppleResult.savePassed) {
                  get().addCombatPopup(target.id, 'save_failed')
                  set((state) => ({
                    combatants: state.combatants.map((c) =>
                      c.id === target.id
                        ? {
                            ...c,
                            conditions: [...c.conditions, { condition: 'prone' as const, duration: -1 }],
                          }
                        : c
                    ),
                  }))
                  get().addCombatPopup(target.id, 'condition', 'Prone')
                } else {
                  get().addCombatPopup(target.id, 'saved')
                }
              }
              break

            case 'vex':
              set((state) => ({
                combatants: state.combatants.map((c) =>
                  c.id === target.id
                    ? {
                        ...c,
                        vexedBy: { attackerId: reactor.id, expiresOnRound: round + 1 },
                      }
                    : c
                ),
              }))
              break
          }
        }
      }
    }

    // Clear pending trigger
    set({ pendingTrigger: undefined })
  },

  moveCombatant: (id, to) => {
    const { combatants, grid, phase } = get()
    const combatant = combatants.find((c) => c.id === id)

    if (!combatant) return

    // Get creature size for footprint calculations
    const size = getCombatantSize(combatant)

    // Check if this combatant has Nimbleness (Halfling/Gnome ability)
    const moverHasNimbleness = hasNimbleness(combatant)

    // Get occupied positions for pathfinding (exclude creatures we can pass through)
    // Dead creatures are corpses - their spaces are passable
    const pathablePositions = new Set<string>()
    combatants
      .filter((c) => c.id !== id && c.position.x >= 0 && !isDead(c))
      .forEach((c) => {
        const cSize = getCombatantSize(c)
        const cells = getOccupiedCells(c.position, cSize)
        // Only block pathfinding if we can't pass through this creature
        const canPassThrough = moverHasNimbleness && canMoveThrough(combatant, cSize)
        if (!canPassThrough) {
          cells.forEach((cell) => pathablePositions.add(`${cell.x},${cell.y}`))
        }
      })

    // Build movement context for water terrain cost calculation
    const walkSpeed = combatant.type === 'character'
      ? (combatant.data as Character).speed
      : (combatant.data as Monster).speed.walk
    const swimSpeed = combatant.type === 'character'
      ? (combatant.data as Character).swimSpeed
      : (combatant.data as Monster).speed.swim
    const movementContext: MovementContext = { walkSpeed, swimSpeed }

    // Find path using A* pathfinding with footprint awareness
    const footprint = getFootprintSize(size)
    const path = findPath(grid, combatant.position, to, pathablePositions, undefined, footprint, movementContext)
    if (!path) return

    // Calculate actual path cost (accounts for terrain)
    const pathCost = calculatePathCost(grid, path, movementContext)

    const remainingMovement = walkSpeed - combatant.movementUsed

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
        // Check each step along the path for opportunity attacks
        // We need to check each position in the path to see if we're adjacent to an enemy
        // and then moving away from them on the next step
        for (let i = 0; i < path.length - 1; i++) {
          const currentPos = path[i]
          const nextPos = path[i + 1]

          // Get cells occupied at current position
          const currentCells = getOccupiedCells(currentPos, size)

          // Find all enemies adjacent to the current position
          const adjacentEnemies = combatants.filter((c) => {
            if (c.id === id) return false // Not ourselves
            if (isDead(c)) return false // Not dead enemies
            if (c.type === combatant.type) return false // Not allies

            const enemySize = getCombatantSize(c)
            const enemyCells = getOccupiedCells(c.position, enemySize)

            // Check if any current cell is adjacent to any enemy cell
            for (const currentCell of currentCells) {
              for (const enemyCell of enemyCells) {
                const dx = Math.abs(currentCell.x - enemyCell.x)
                const dy = Math.abs(currentCell.y - enemyCell.y)
                if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
                  return true // Adjacent
                }
              }
            }
            return false
          })

          // For each adjacent enemy, check if we're moving away from them
          for (const enemy of adjacentEnemies) {
            // Skip if already added to threatening list
            if (threateningEnemyIds.includes(enemy.id)) continue

            const enemySize = getCombatantSize(enemy)
            const enemyCells = getOccupiedCells(enemy.position, enemySize)

            // Get cells occupied at next position
            const nextCells = getOccupiedCells(nextPos, size)

            // Check if we'll still be adjacent at the next position
            let stillAdjacent = false
            for (const nextCell of nextCells) {
              for (const enemyCell of enemyCells) {
                const dx = Math.abs(nextCell.x - enemyCell.x)
                const dy = Math.abs(nextCell.y - enemyCell.y)
                if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
                  stillAdjacent = true
                  break
                }
              }
              if (stillAdjacent) break
            }

            // If we're moving away (no longer adjacent), this enemy gets an opportunity attack
            if (!stillAdjacent) {
              threateningEnemyIds.push(enemy.id)
            }
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

    // Check if this combatant has Nimbleness (Halfling/Gnome ability)
    const moverHasNimbleness = hasNimbleness(combatant)

    // Get occupied positions for pathfinding (exclude creatures we can pass through)
    // Dead creatures are corpses - their spaces are passable
    const pathablePositions = new Set<string>()
    combatants
      .filter((c) => c.id !== combatantId && c.position.x >= 0 && !isDead(c))
      .forEach((c) => {
        const cSize = getCombatantSize(c)
        const cells = getOccupiedCells(c.position, cSize)
        // Only block pathfinding if we can't pass through this creature
        const canPassThrough = moverHasNimbleness && canMoveThrough(combatant, cSize)
        if (!canPassThrough) {
          cells.forEach((cell) => pathablePositions.add(`${cell.x},${cell.y}`))
        }
      })

    // Build movement context for water terrain cost calculation
    const walkSpeed = combatant.type === 'character'
      ? (combatant.data as Character).speed
      : (combatant.data as Monster).speed.walk
    const swimSpeed = combatant.type === 'character'
      ? (combatant.data as Character).swimSpeed
      : (combatant.data as Monster).speed.swim
    const movementContext: MovementContext = { walkSpeed, swimSpeed }

    // Find path using A* pathfinding with footprint awareness
    const path = findPath(grid, combatant.position, to, pathablePositions, undefined, footprint, movementContext)
    if (!path) return false

    // Calculate actual path cost
    const pathCost = calculatePathCost(grid, path, movementContext)

    const remainingMovement = walkSpeed - combatant.movementUsed

    return pathCost <= remainingMovement
  },

  getReachablePositions: (combatantId) => {
    const { grid, combatants } = get()
    const combatant = combatants.find((c) => c.id === combatantId)

    if (!combatant) return []

    // Get creature size for footprint-aware pathfinding
    const size = getCombatantSize(combatant)
    const footprint = getFootprintSize(size)

    // Build movement context for water terrain cost calculation
    const walkSpeed = combatant.type === 'character'
      ? (combatant.data as Character).speed
      : (combatant.data as Monster).speed.walk
    const swimSpeed = combatant.type === 'character'
      ? (combatant.data as Character).swimSpeed
      : (combatant.data as Monster).speed.swim
    const movementContext: MovementContext = { walkSpeed, swimSpeed }

    const remainingMovement = walkSpeed - combatant.movementUsed

    // Check if this combatant has Nimbleness (Halfling/Gnome ability)
    const moverHasNimbleness = hasNimbleness(combatant)

    // Build two sets:
    // 1. pathablePositions: cells we can PATH through (blocked by creatures we CAN'T pass through)
    // 2. endBlockedPositions: ALL occupied cells (you can't END movement in anyone's space)
    const pathablePositions = new Set<string>()
    const endBlockedPositions = new Set<string>()

    combatants
      .filter((c) => c.id !== combatantId && c.position.x >= 0 && !isDead(c))
      .forEach((c) => {
        const cSize = getCombatantSize(c)
        const cells = getOccupiedCells(c.position, cSize)

        // Always add to endBlocked - you can't end in anyone's space
        cells.forEach((cell) => endBlockedPositions.add(`${cell.x},${cell.y}`))

        // Only add to pathable if we CAN'T pass through this creature
        const canPassThrough = moverHasNimbleness && canMoveThrough(combatant, cSize)
        if (!canPassThrough) {
          cells.forEach((cell) => pathablePositions.add(`${cell.x},${cell.y}`))
        }
      })

    // Use pathfinding-based reachability with footprint awareness
    // Pass pathablePositions so we can path through larger creatures with Nimbleness
    const reachableMap = getReachableFromPathfinding(
      grid,
      combatant.position,
      remainingMovement,
      pathablePositions,
      footprint,
      movementContext
    )

    // Convert map to array of positions, filtering out cells we can't end in
    const reachable: Position[] = []
    for (const key of reachableMap.keys()) {
      // Don't include positions where movement can't end (occupied spaces)
      if (endBlockedPositions.has(key)) continue

      const [x, y] = key.split(',').map(Number)
      reachable.push({ x, y })
    }

    return reachable
  },

  dealDamage: (targetId, amount, _source) => {
    // Collect log entries that should appear AFTER the caller's damage log.
    // We use queueMicrotask so these logs are deferred until after the current
    // synchronous code (where callers log the damage amount) finishes.
    const deferredLogs: Omit<CombatLogEntry, 'id' | 'timestamp' | 'round'>[] = []

    set((state) => {
      const target = state.combatants.find((c) => c.id === targetId)
      if (!target) return state

      let newHp = Math.max(0, target.currentHp - amount)
      let updatedRacialAbilityUses = target.racialAbilityUses

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

          deferredLogs.push({
            type: 'other',
            actorId: targetId,
            actorName: target.name,
            message: `${target.name} uses Relentless Endurance and drops to ${newHp} HP instead of falling unconscious!`,
          })
        }
      }

      // Track if creature died this damage application
      let creatureDied = false

      // Check for falling unconscious (characters) or dying (monsters)
      if (newHp === 0 && wasConscious) {
        if (target.type === 'monster') {
          // Monsters die immediately at 0 HP
          deferredLogs.push({
            type: 'death',
            actorId: targetId,
            actorName: target.name,
            message: `${target.name} has been slain!`,
          })
          creatureDied = true
        } else {
          // Characters fall unconscious
          deferredLogs.push({
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
        const characterDied = newFailures >= 3
        if (characterDied) {
          deferredLogs.push({
            type: 'death',
            actorId: targetId,
            actorName: target.name,
            message: `${target.name} has died from damage while unconscious!`,
          })
        } else {
          deferredLogs.push({
            type: 'other',
            actorId: targetId,
            actorName: target.name,
            message: `${target.name} takes damage while unconscious - death save failure! (${newFailures}/3)`,
          })
        }
        return {
          combatants: state.combatants.map((c) =>
            c.id === targetId
              ? {
                  ...c,
                  deathSaves: { ...c.deathSaves, failures: newFailures },
                  // Add prone condition when character dies (becomes corpse)
                  conditions: characterDied
                    ? [...c.conditions.filter(cond => cond.condition !== 'prone'), { condition: 'prone' as const, duration: -1 }]
                    : c.conditions,
                }
              : c
          ),
        }
      }

      // Build conditions array for the updated combatant
      let newConditions = target.conditions
      if (newHp === 0 && wasConscious) {
        if (target.type === 'character') {
          // Characters fall unconscious (not dead yet)
          newConditions = [...newConditions, { condition: 'unconscious' as const, duration: -1 }]
        } else if (creatureDied) {
          // Monsters die and become corpses (prone)
          newConditions = [...newConditions.filter(c => c.condition !== 'prone'), { condition: 'prone' as const, duration: -1 }]
        }
      }

      return {
        combatants: state.combatants.map((c) =>
          c.id === targetId
            ? {
                ...c,
                currentHp: newHp,
                racialAbilityUses: updatedRacialAbilityUses,
                conditions: newConditions,
              }
            : c
        ),
      }
    })

    // Check for victory/defeat after damage is dealt
    const combatResult = checkCombatEnd(get().combatants)
    if (combatResult) {
      set({ phase: combatResult })
      deferredLogs.push({
        type: combatResult === 'victory' ? 'initiative' : 'death',
        actorName: 'System',
        message: combatResult === 'victory' ? 'Victory! All enemies defeated!' : 'Defeat... All heroes have fallen.',
      })
    }

    // Defer death/unconscious/victory logs to after the caller's synchronous code
    // finishes, so damage log entries appear first in the combat log
    if (deferredLogs.length > 0) {
      queueMicrotask(() => {
        for (const log of deferredLogs) {
          get().addLogEntry(log)
        }
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

  performAttack: (attackerId, targetId, weapon, monsterAction, rangedWeapon, masteryOverride, attackBonus, skipPreAttackCheck, overrideNaturalRoll) => {
    const { combatants, grid } = get()
    const attacker = combatants.find((c) => c.id === attackerId)
    const target = combatants.find((c) => c.id === targetId)

    if (!attacker || !target) return null

    // Reset maneuver tracking for this new attack (allows using different maneuvers on Extra Attack)
    if (attacker.usedManeuverThisAttack) {
      set((state) => ({
        combatants: state.combatants.map((c) =>
          c.id === attackerId ? { ...c, usedManeuverThisAttack: false } : c
        ),
      }))
    }

    // Check if attacker can attack (Extra Attack allows multiple attacks per action)
    const maxAttacks = getMaxAttacksPerAction(attacker)
    if (attacker.attacksMadeThisTurn >= maxAttacks) return null

    // Auto-select weapon based on distance if character has both melee and ranged
    let selectedWeapon = weapon
    if (attacker.type === 'character' && (weapon || rangedWeapon)) {
      selectedWeapon = selectWeaponForTarget(attacker, target, grid, weapon, rangedWeapon)
    }

    // Determine if this is a ranged attack (for projectile animation)
    const isRanged = isRangedAttack(selectedWeapon, monsterAction)
    const deferIfRanged = (fn: () => void) => {
      if (isRanged) {
        get().launchProjectile({ ...attacker.position }, { ...target.position }, fn)
      } else {
        fn()
      }
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
      masteryOverride,
      attackBonus,
      overrideNaturalRoll,
    })

    // Consume distracted condition if it granted advantage to this attacker
    const distractedCond = target.conditions.find(c => c.condition === 'distracted' && c.source && c.source !== attackerId)
    if (distractedCond) {
      set((state) => ({
        combatants: state.combatants.map(c =>
          c.id === targetId
            ? { ...c, conditions: c.conditions.filter(cond => cond !== distractedCond) }
            : c
        ),
      }))
    }

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
      // Show critical miss popup on the attacker (no projectile spawns on nat 1)
      get().addCombatPopup(attackerId, 'critical_miss')
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
      // Check for Precision Attack (on miss, before logging)
      // Only if not already re-resolving after a Precision Attack decision
      if (!skipPreAttackCheck && !result.criticalMiss) {
        const precisionManeuvers = getAvailableManeuvers(attacker, 'pre_attack')
        if (
          precisionManeuvers.length > 0 &&
          attacker.superiorityDiceRemaining > 0 &&
          !attacker.usedManeuverThisAttack &&
          attacker.type === 'character'
        ) {
          const dieSize = getSuperiorityDieSize(attacker)
          const missedBy = result.targetAC - result.attackRoll.total

          const triggerOptions: TriggerOption[] = precisionManeuvers.map(m => ({
            id: m.id,
            type: 'maneuver' as const,
            name: m.name,
            description: m.description,
            cost: `1 Superiority Die (d${dieSize})`,
            effect: missedBy <= dieSize
              ? `+1d${dieSize} to attack roll (missed by ${missedBy}, could hit!)`
              : `+1d${dieSize} to attack roll (missed by ${missedBy}, max die is ${dieSize})`,
          }))

          const pendingTrigger: PendingTrigger = {
            type: 'pre_attack',
            triggererId: attackerId,
            reactorId: attackerId,
            targetId,
            options: triggerOptions,
            context: {
              attackRoll: result.attackRoll.total,
              naturalRoll: result.attackRoll.naturalRoll,
              targetAC: result.targetAC,
            },
          }

          set({
            pendingTrigger,
            pendingAttack: {
              attackerId,
              targetId,
              weapon: selectedWeapon,
              monsterAction,
              rangedWeapon,
              masteryOverride,
              overrideNaturalRoll: result.attackRoll.naturalRoll,
            },
          })

          return result  // Pause for Precision Attack decision
        }
      }

      // Check for Heroic Inspiration (Musician feat / Human) - attacker can reroll
      // Must happen BEFORE projectile launch so it doesn't fly out prematurely
      if (
        attacker.type === 'character' &&
        canUseHeroicInspiration(attacker) &&
        !result.criticalMiss  // Can't reroll a nat 1 (already auto-miss)
      ) {
        get().addLogEntry({
          type: 'attack',
          actorId: attackerId,
          actorName: attacker.name,
          targetId,
          targetName: target.name,
          message: `${attacker.name} misses ${target.name}`,
          details: `${result.attackRoll.breakdown} vs AC ${result.targetAC}`,
        })

        // Set pending Heroic Inspiration prompt (no projectile yet)
        set({
          pendingHeroicInspiration: {
            combatantId: attackerId,
            type: 'attack',
            originalRoll: result.attackRoll.naturalRoll,
            originalTotal: result.attackRoll.total,
            modifier: result.attackRoll.total - result.attackRoll.naturalRoll,
            targetValue: result.targetAC,
            context: {
              targetId,
              targetName: target.name,
              weapon: selectedWeapon,
              isRanged,
            },
          },
        })

        // Update attacker state before pausing
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
                }
              : c
          ),
          // Only clear selectedAction if all attacks are used
          ...(allAttacksUsed && { selectedAction: undefined, targetingMode: undefined }),
        }))

        return result  // Pause for Heroic Inspiration decision
      }

      get().addLogEntry({
        type: 'attack',
        actorId: attackerId,
        actorName: attacker.name,
        targetId,
        targetName: target.name,
        message: `${attacker.name} misses ${target.name}`,
        details: `${result.attackRoll.breakdown} vs AC ${result.targetAC}`,
      })
      // Show miss popup on target (deferred for ranged attacks until projectile arrives)
      deferIfRanged(() => {
        get().addCombatPopup(targetId, 'miss')
      })

      // Apply Graze mastery damage on miss (if applicable)
      if (selectedWeapon) {
        const grazeResult = applyGrazeOnMiss(attacker, target, selectedWeapon, masteryOverride)
        if (grazeResult && grazeResult.applied && grazeResult.grazeDamage && grazeResult.grazeDamage > 0) {
          const grazeDmg = grazeResult.grazeDamage
          deferIfRanged(() => {
            get().dealDamage(targetId, grazeDmg, attacker.name)
            get().addDamagePopup(targetId, grazeDmg, selectedWeapon.damageType as DamageType, false)
            get().addLogEntry({
              type: 'damage',
              actorId: attackerId,
              actorName: attacker.name,
              targetId,
              targetName: target.name,
              message: `Graze: ${grazeResult.grazeDamage} ${selectedWeapon.damageType} damage`,
              details: 'Weapon mastery: Graze',
            })
          })
        }
      }

      // Check for Riposte reaction (target can counter-attack on miss)
      // Only for melee attacks against player characters
      const isMeleeAttack = monsterAction
        ? (monsterAction.reach !== undefined || !monsterAction.range)
        : (!selectedWeapon || selectedWeapon.type === 'melee')
      const riposteManeuvers = getAvailableManeuvers(target, 'reaction').filter(m => m.id === 'riposte')

      if (
        riposteManeuvers.length > 0 &&
        target.type === 'character' &&
        target.superiorityDiceRemaining > 0 &&
        !target.hasReacted &&
        isMeleeAttack
      ) {
        const dieSize = getSuperiorityDieSize(target)

        const triggerOptions: TriggerOption[] = riposteManeuvers.map(m => ({
          id: m.id,
          type: 'maneuver' as const,
          name: m.name,
          description: m.description,
          cost: `1 Superiority Die (d${dieSize})`,
          effect: `Make melee attack with +1d${dieSize} damage if you hit`,
        }))

        // Store pending trigger for Riposte
        const pendingTrigger: PendingTrigger = {
          type: 'on_miss',
          triggererId: attackerId,    // Who missed (the attacker)
          reactorId: targetId,        // Who can riposte (the target that was missed)
          targetId: attackerId,       // Who to counter-attack (the attacker)
          options: triggerOptions,
          context: {
            attackRoll: result.attackRoll.total,
            targetAC: result.targetAC,
          },
        }

        // Update attacker state before pausing
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
                }
              : c
          ),
          pendingTrigger,
          // Only clear selectedAction if all attacks are used
          ...(allAttacksUsed && { selectedAction: undefined, targetingMode: undefined }),
        }))

        return result  // Don't continue - wait for Riposte decision
      }
    }

    // Track if Savage Attacker feat was used (needs to be outside the if block for state updates)
    let usedSavageAttackerFeat = false

    // Apply damage if hit
    if (result.hit && result.damage) {
      // Calculate total damage including Savage Attacks and Sneak Attack bonus
      let totalDamage = result.damage.total
      const bonusDamageDetails: string[] = []

      // Savage Attacker feat: roll weapon damage twice and use the better roll
      if (canUseSavageAttacker(attacker) && selectedWeapon) {
        const reroll = rollDamage(selectedWeapon.damage, result.critical)
        if (reroll.total > result.damage.total) {
          totalDamage = reroll.total
          bonusDamageDetails.push(`Savage Attacker (rerolled ${result.damage.total} -> ${reroll.total})`)
        } else {
          bonusDamageDetails.push(`Savage Attacker (kept ${result.damage.total} over ${reroll.total})`)
        }
        usedSavageAttackerFeat = true
      }

      if (result.savageAttacksDamage) {
        totalDamage += result.savageAttacksDamage.total
        bonusDamageDetails.push(`Savage Attacks [${result.savageAttacksDamage.rolls.join(', ')}]`)
      }

      if (result.sneakAttackDamage) {
        totalDamage += result.sneakAttackDamage.total
        bonusDamageDetails.push(`Sneak Attack [${result.sneakAttackDamage.rolls.join(', ')}]`)
      }

      // Feinting Attack bonus damage: if attacker feinted this target and hit
      if (attacker.feintTarget === targetId && attacker.feintBonusDamage) {
        totalDamage += attacker.feintBonusDamage
        bonusDamageDetails.push(`Feinting Attack +${attacker.feintBonusDamage}`)
        // Clear feint after use (one-time)
        set((state) => ({
          combatants: state.combatants.map(c =>
            c.id === attackerId ? { ...c, feintTarget: undefined, feintBonusDamage: undefined } : c
          ),
        }))
      }

      // Lunging Attack bonus damage: if attacker used Lunging Attack and moved ≥5ft before this melee hit
      const isMeleeAttack = selectedWeapon?.type === 'melee' || !selectedWeapon
      if (attacker.lungingAttackBonus && isMeleeAttack && attacker.movementUsed > 0) {
        totalDamage += attacker.lungingAttackBonus
        bonusDamageDetails.push(`Lunging Attack +${attacker.lungingAttackBonus}`)
        // Clear after use (one-time)
        set((state) => ({
          combatants: state.combatants.map(c =>
            c.id === attackerId ? { ...c, lungingAttackBonus: undefined } : c
          ),
        }))
      }

      // Check for on-hit maneuvers (Battle Master maneuvers like Trip Attack, Menacing Attack)
      const onHitManeuvers = getAvailableManeuvers(attacker, 'on_hit')
      if (
        onHitManeuvers.length > 0 &&
        attacker.superiorityDiceRemaining > 0 &&
        !attacker.usedManeuverThisAttack &&
        attacker.type === 'character'  // Only player characters get the prompt
      ) {
        const dieSize = getSuperiorityDieSize(attacker)
        const saveDC = getManeuverSaveDC(attacker)

        // Build trigger options from available maneuvers
        const triggerOptions: TriggerOption[] = onHitManeuvers.map(m => ({
          id: m.id,
          type: 'maneuver' as const,
          name: m.name,
          description: m.description,
          cost: `1 Superiority Die (d${dieSize})`,
          effect: m.sweepDamage
            ? `Roll 1d${dieSize}, damage adjacent enemy if attack would hit`
            : m.condition === 'distracted'
            ? `+1d${dieSize} damage, next other attacker has advantage`
            : m.savingThrow
            ? `+1d${dieSize} damage, ${m.savingThrow.ability.toUpperCase()} save (DC ${saveDC}) or ${m.savingThrow.effect}`
            : `+1d${dieSize} damage`,
        }))

        // Store pending trigger - combat pauses until resolved
        const pendingTrigger: PendingTrigger = {
          type: 'on_hit',
          triggererId: attackerId,
          reactorId: attackerId,  // Attacker chooses their own maneuver
          targetId,               // Target for applying effects
          options: triggerOptions,
          context: {
            attackRoll: result.attackRoll.total,
            targetAC: result.targetAC,
            damage: totalDamage,
            damageType: (result.damageType ?? 'bludgeoning') as DamageType,
            isCritical: result.critical,
            weapon: selectedWeapon,
          },
          pendingDamage: totalDamage,
        }

        // Update attacker state before pausing
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
                  usedSavageAttackerThisTurn: c.usedSavageAttackerThisTurn || usedSavageAttackerFeat,
                }
              : c
          ),
          pendingTrigger,
          // Only clear selectedAction if all attacks are used
          ...(allAttacksUsed && { selectedAction: undefined, targetingMode: undefined }),
        }))

        return result  // Don't deal damage yet - wait for maneuver decision
      }

      // Check if target has reaction options available (Shield spell, Parry maneuver)
      const availableReactionSpells = getAvailableReactionSpells(target, 'on_hit')

      // Check for Parry maneuver (only for melee attacks)
      const isMeleeAttackForParry = monsterAction
        ? (monsterAction.reach !== undefined || !monsterAction.range)
        : (!selectedWeapon || selectedWeapon.type === 'melee')
      const parryManeuvers = isMeleeAttackForParry
        ? getAvailableManeuvers(target, 'reaction').filter(m => m.id === 'parry')
        : []

      const hasReactionOptions =
        (availableReactionSpells.length > 0 || parryManeuvers.length > 0) &&
        !target.hasReacted &&
        target.type === 'character'

      if (hasReactionOptions) {
        // Build combined trigger options for both spells and maneuvers
        const triggerOptions: TriggerOption[] = []

        // Add Shield spell option if available
        for (const spell of availableReactionSpells) {
          if (spell.id === 'shield') {
            triggerOptions.push({
              id: 'shield',
              type: 'spell',
              name: 'Shield',
              description: 'Increase your AC by 5 until the start of your next turn',
              cost: 'Level 1 Spell Slot',
              effect: `+5 AC (${result.targetAC} → ${result.targetAC + 5})`,
            })
          }
        }

        // Add Parry maneuver option if available
        if (parryManeuvers.length > 0 && target.superiorityDiceRemaining > 0) {
          const dieSize = getSuperiorityDieSize(target)
          const character = target.data as Character
          const dexMod = Math.floor((character.abilityScores.dexterity - 10) / 2)
          triggerOptions.push({
            id: 'parry',
            type: 'maneuver',
            name: 'Parry',
            description: 'Reduce incoming damage by superiority die + DEX modifier',
            cost: `1 Superiority Die (d${dieSize})`,
            effect: `Reduce damage by 1d${dieSize}+${dexMod}`,
          })
        }

        if (triggerOptions.length > 0) {
          // Set pending trigger for damage mitigation options
          const pendingTrigger: PendingTrigger = {
            type: 'on_damage_taken',
            triggererId: attackerId,
            reactorId: targetId,
            targetId,  // Target is the one taking damage
            options: triggerOptions,
            context: {
              attackRoll: result.attackRoll.total,
              targetAC: result.targetAC,
              damage: totalDamage,
              damageType: (result.damageType ?? 'bludgeoning') as DamageType,
              isCritical: result.critical,
              weapon: selectedWeapon,
            },
            pendingDamage: totalDamage,
          }

          // Update attacker state before pausing
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
                    usedSavageAttackerThisTurn: c.usedSavageAttackerThisTurn || usedSavageAttackerFeat,
                  }
                : c
            ),
            pendingTrigger,
            // Only clear selectedAction if all attacks are used
            ...(allAttacksUsed && { selectedAction: undefined, targetingMode: undefined }),
          }))

          return result  // Don't deal damage yet - wait for reaction decision
        }
      }

      // No reactions available, deal damage (deferred for ranged attacks until projectile arrives)
      deferIfRanged(() => {
        get().dealDamage(targetId, totalDamage, attacker.name)
        get().addDamagePopup(targetId, totalDamage, (result.damageType ?? 'bludgeoning') as DamageType, result.critical)
        if (result.critical) {
          get().addCombatPopup(targetId, 'critical')
        }

        const damageDetails = bonusDamageDetails.length > 0
          ? `${result.damage!.breakdown} + ${bonusDamageDetails.join(' + ')}`
          : result.damage!.breakdown

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
          const masteryResult = applyOnHitMasteryEffect(attacker, target, selectedWeapon, grid, currentCombatants, round, masteryOverride)

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
                get().addCombatPopup(targetId, 'condition', 'Sapped')
                break

              case 'slow':
                // Slow is tracked via speed reduction - handled by combat calculations
                // For now just log it; speed reduction is applied automatically in movement
                break

              case 'topple':
                if (masteryResult.toppleResult) {
                  if (!masteryResult.toppleResult.savePassed) {
                    // Target failed save, add prone condition
                    get().addCombatPopup(targetId, 'save_failed')
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
                    get().addCombatPopup(targetId, 'condition', 'Prone')
                  } else {
                    get().addCombatPopup(targetId, 'saved')
                  }
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

        // Tavern Brawler feat: push on unarmed hit (automatic, once per turn)
        if (isUnarmedStrike(selectedWeapon) && canTavernBrawlerPush(attacker)) {
          const pushPos = calculatePushPosition(attacker, target, grid)
          if (pushPos) {
            // Update grid occupancy
            const gridUpdates = [
              { x: target.position.x, y: target.position.y, occupiedBy: undefined },
              { x: pushPos.x, y: pushPos.y, occupiedBy: targetId },
            ]
            set((state) => ({
              combatants: state.combatants.map((c) =>
                c.id === targetId
                  ? { ...c, position: pushPos }
                  : c.id === attackerId
                  ? { ...c, usedTavernBrawlerPushThisTurn: true }
                  : c
              ),
              grid: updateGridOccupancy(state.grid, gridUpdates),
            }))

            get().addLogEntry({
              type: 'other',
              actorId: attackerId,
              actorName: attacker.name,
              message: `pushes ${target.name} 5ft (Tavern Brawler)`,
            })
          }
        }
      })
    }

    // Update attacker state: increment attacks made, mark sneak attack if used
    const newAttacksMade = attacker.attacksMadeThisTurn + 1
    const maxAttacksForAttacker = getMaxAttacksPerAction(attacker)
    const allAttacksUsed = newAttacksMade >= maxAttacksForAttacker

    // Studied Attacks (Fighter level 13+): track missed target for advantage on next attack
    let newStudiedTargetId: string | undefined = attacker.studiedTargetId
    if (hasStudiedAttacks(attacker)) {
      if (result.hit && attacker.studiedTargetId === targetId) {
        // Clear studied target after hitting them
        newStudiedTargetId = undefined
      } else if (!result.hit && !result.criticalMiss) {
        // Set studied target after missing (but not on critical miss)
        newStudiedTargetId = targetId
      }
    }

    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === attackerId
          ? {
              ...c,
              attacksMadeThisTurn: newAttacksMade,
              hasActed: allAttacksUsed,
              usedSneakAttackThisTurn: c.usedSneakAttackThisTurn || (result.sneakAttackUsed ?? false),
              usedSavageAttackerThisTurn: c.usedSavageAttackerThisTurn || usedSavageAttackerFeat,
              studiedTargetId: newStudiedTargetId,
            }
          : c
      ),
    }))

    // Clear targeting mode only if all attacks are used
    if (allAttacksUsed) {
      set({ selectedAction: undefined, targetingMode: undefined })
    }

    return result
  },

  performAttackReplacement: (attackerId, replacementId, targetPosition) => {
    const { combatants } = get()
    const attacker = combatants.find((c) => c.id === attackerId)

    if (!attacker) return false

    // Get the attack replacement
    const replacement = getAttackReplacementById(attacker, replacementId)
    if (!replacement) {
      console.error('Attack replacement not found:', replacementId)
      return false
    }

    // Check if can use
    if (!canUseAttackReplacement(attacker, replacement)) {
      console.error('Cannot use attack replacement:', replacementId)
      return false
    }

    // Handle AoE attack replacements (breath weapon)
    if (replacement.targetingType === 'aoe') {
      const aoeReplacement = replacement as AoEAttackReplacement

      // Get affected cells using the AoE system
      const affectedCells = getAoEAffectedCells({
        type: aoeReplacement.aoeType,
        size: aoeReplacement.aoeSize,
        origin: attacker.position,
        target: targetPosition,
        originType: 'self',
      })

      // Find all combatants in affected cells (enemies only)
      const affectedCombatants = combatants.filter((c) => {
        if (c.id === attackerId) return false // Don't hit yourself
        if (c.currentHp <= 0) return false // Skip dead combatants
        // Check if any of the combatant's occupied cells are in the AoE
        const cellKey = `${c.position.x},${c.position.y}`
        return affectedCells.has(cellKey)
      })

      // Roll damage once for all targets
      // For breath weapon, we need to get the actual ability to roll damage
      const breathWeaponAbility = attacker.type === 'character'
        ? ((attacker.data as Character).race.abilities ?? []).find(a => a.id === replacement.sourceId)
        : null

      let damageRolled = 0
      if (breathWeaponAbility && breathWeaponAbility.type === 'breath_weapon') {
        const damageResult = rollBreathWeaponDamage(attacker, breathWeaponAbility)
        damageRolled = damageResult.total
      } else {
        // Fallback: roll the damage dice directly
        const diceResult = rollDamage(aoeReplacement.damageDice)
        damageRolled = diceResult.total
      }

      // Process each target
      const targetResults: AoETargetResult[] = []
      const updatedCombatants = [...combatants]

      for (const target of affectedCombatants) {
        // Roll saving throw for target
        const saveResult = rollCombatantSavingThrow(target, aoeReplacement.savingThrow, aoeReplacement.dc)
        const saved = saveResult.success

        // Calculate damage (half on save)
        let damage = saved ? Math.floor(damageRolled / 2) : damageRolled

        // Apply resistance
        const resistanceResult = applyDamageResistance(
          target,
          damage,
          aoeReplacement.damageType,
          target.racialAbilityUses
        )
        damage = resistanceResult.damage
        const resistanceApplied = resistanceResult.applied !== null

        targetResults.push({
          targetId: target.id,
          targetName: target.name,
          saveRoll: saveResult.roll.naturalRoll,
          saveTotal: saveResult.roll.total,
          saved,
          damageDealt: damage,
          resistanceApplied,
        })

        // Apply damage to target
        const targetIndex = updatedCombatants.findIndex((c) => c.id === target.id)
        if (targetIndex !== -1) {
          const newHp = Math.max(0, updatedCombatants[targetIndex].currentHp - damage)
          updatedCombatants[targetIndex] = {
            ...updatedCombatants[targetIndex],
            currentHp: newHp,
          }
        }

        // Show damage popup
        get().addDamagePopup(target.id, damage, aoeReplacement.damageType, false)
        if (saved) {
          get().addCombatPopup(target.id, 'saved')
        } else {
          get().addCombatPopup(target.id, 'save_failed')
        }
        if (resistanceApplied) {
          get().addCombatPopup(target.id, 'resisted')
        }

        // Log damage for each target
        get().addLogEntry({
          type: 'damage',
          actorId: attackerId,
          actorName: attacker.name,
          targetId: target.id,
          targetName: target.name,
          message: `${damage} ${aoeReplacement.damageType} damage${saved ? ' (saved)' : ''}${resistanceApplied ? ' (resisted)' : ''}`,
          details: `${aoeReplacement.savingThrow.toUpperCase()} save: ${saveResult.roll.total} vs DC ${aoeReplacement.dc}`,
        })
      }

      // Log the breath weapon usage
      get().addLogEntry({
        type: 'attack',
        actorId: attackerId,
        actorName: attacker.name,
        message: `${attacker.name} uses ${replacement.name}!`,
        details: `${damageRolled} ${aoeReplacement.damageType} damage, DC ${aoeReplacement.dc} ${aoeReplacement.savingThrow.toUpperCase()} save`,
      })

      // Decrement uses
      const sourceId = getReplacementSourceId(replacement)
      const { newUses } = decrementRacialAbilityUse(attacker, sourceId, attacker.racialAbilityUses)

      // Update attacker state: increment attacks made, decrement uses
      const newAttacksMade = attacker.attacksMadeThisTurn + 1
      const maxAttacks = getMaxAttacksPerAction(attacker)
      const allAttacksUsed = newAttacksMade >= maxAttacks

      // Update attacker in the combatants list
      const attackerIndex = updatedCombatants.findIndex((c) => c.id === attackerId)
      if (attackerIndex !== -1) {
        updatedCombatants[attackerIndex] = {
          ...updatedCombatants[attackerIndex],
          attacksMadeThisTurn: newAttacksMade,
          hasActed: allAttacksUsed,
          racialAbilityUses: newUses,
        }
      }

      // Update state
      set({
        combatants: updatedCombatants,
        aoePreview: undefined,
        // Only clear selectedAction if all attacks are used
        ...(allAttacksUsed && { selectedAction: undefined, targetingMode: undefined }),
      })

      return true
    }

    // Single target attack replacements (future: unarmed strike, etc.)
    // TODO: Implement single target attack replacements when needed

    return false
  },

  useDash: () => {
    const { turnOrder, currentTurnIndex, combatants } = get()
    const currentId = turnOrder[currentTurnIndex]
    const combatant = combatants.find((c) => c.id === currentId)

    // Can't use Dash if: no combatant, already used action, or mid-Attack action (Extra Attack)
    if (!combatant || combatant.hasActed || combatant.attacksMadeThisTurn > 0) return

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

    // Can't use Dodge if: no combatant, already used action, or mid-Attack action (Extra Attack)
    if (!combatant || combatant.hasActed || combatant.attacksMadeThisTurn > 0) return

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

    // Can't use Disengage if: no combatant, already used action, or mid-Attack action (Extra Attack)
    if (!combatant || combatant.hasActed || combatant.attacksMadeThisTurn > 0) return

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

  setBreathWeaponTargeting: (targeting) => {
    set({ breathWeaponTargeting: targeting })
  },

  performOpportunityAttack: (attackerId, targetId, attackReplacementId) => {
    const { combatants } = get()
    const attacker = combatants.find((c) => c.id === attackerId)
    const target = combatants.find((c) => c.id === targetId)

    if (!attacker || !target) return null

    // Check if attacker has reaction available
    if (attacker.hasReacted) return null

    // Handle attack replacement (breath weapon) opportunity attack
    if (attackReplacementId) {
      const replacement = getAttackReplacementById(attacker, attackReplacementId)
      if (replacement && canUseAttackReplacement(attacker, replacement) && replacement.targetingType === 'aoe') {
        get().addLogEntry({
          type: 'other',
          actorId: attackerId,
          actorName: attacker.name,
          message: `${attacker.name} uses ${replacement.name} as an opportunity attack against ${target.name}!`,
        })

        // Use target's position as the direction for the AoE
        const result = get().performAttackReplacement(attackerId, attackReplacementId, target.position)

        // Mark reaction as used (performAttackReplacement doesn't do this)
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === attackerId ? { ...c, hasReacted: true, attacksMadeThisTurn: 0, hasActed: false } : c
          ),
        }))

        // Return a fake AttackResult for compatibility (breath weapon doesn't use attack rolls)
        return result ? {
          hit: true,
          critical: false,
          criticalMiss: false,
          attackRoll: {
            total: 0,
            rolls: [0],
            modifier: 0,
            expression: 'N/A',
            breakdown: 'N/A (AoE save)',
            isNatural20: false,
            isNatural1: false,
            naturalRoll: 0,
            advantage: 'normal' as const,
          },
          targetAC: 0,
        } : null
      }
      return null
    }

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
          if (result.critical) {
            get().addCombatPopup(targetId, 'critical')
          }
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

    if (!caster) return false
    if (caster.type !== 'character') return false // Only characters can cast spells for now

    // Check action economy based on casting time
    const isBonusActionSpell = spell.castingTime.toLowerCase().includes('bonus action')
    const isReactionSpell = spell.castingTime.toLowerCase().includes('reaction')

    // Reaction spells can't be cast proactively (need a trigger)
    if (isReactionSpell) return false

    // Check if the appropriate action is available
    if (isBonusActionSpell) {
      if (caster.hasBonusActed) return false
    } else {
      if (caster.hasActed) return false
    }

    const character = caster.data as Character

    // Check and consume spell slot for leveled spells (not cantrips)
    if (spell.level > 0) {
      // Check if Magic Initiate free use is available for this spell
      const hasMagicInitiateFreeUse = caster.magicInitiateFreeUses[spell.id] === true

      if (hasMagicInitiateFreeUse) {
        // Use the free Magic Initiate cast
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === casterId
              ? {
                  ...c,
                  magicInitiateFreeUses: {
                    ...c.magicInitiateFreeUses,
                    [spell.id]: false,
                  },
                }
              : c
          ),
        }))

        get().addLogEntry({
          type: 'spell',
          actorId: casterId,
          actorName: caster.name,
          message: `${caster.name} uses Magic Initiate free cast of ${spell.name}!`,
        })
      } else {
        // No free use available, check spell slots
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

      // Mark the appropriate action type as used
      const isBonusActionSpell = spell.castingTime.toLowerCase().includes('bonus action')
      if (isBonusActionSpell) {
        get().useBonusAction()
      } else {
        get().useAction()
      }

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
          originType: spell.areaOfEffect.origin,
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
          // Determine if ranged spell attack for projectile animation
          const isRangedSpell = spell.attackType === 'ranged'
          const deferIfRangedSpell = (fn: () => void) => {
            if (isRangedSpell) {
              get().launchProjectile({ ...caster.position }, { ...target.position }, fn)
            } else {
              fn()
            }
          }

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
            deferIfRangedSpell(() => {
              get().addCombatPopup(currentTargetId, 'miss')
            })
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

            const spellDamageType = spell.damage!.type
            deferIfRangedSpell(() => {
              get().dealDamage(currentTargetId, damage.total, caster.name)
              get().addDamagePopup(currentTargetId, damage.total, spellDamageType, isCrit)
              if (isCrit) {
                get().addCombatPopup(currentTargetId, 'critical')
              }
              get().addLogEntry({
                type: 'damage',
                actorId: casterId,
                actorName: caster.name,
                targetId: currentTargetId,
                targetName: target.name,
                message: `${damage.total} ${spellDamageType} damage`,
                details: damage.breakdown,
              })
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
            deferIfRangedSpell(() => {
              get().addCombatPopup(currentTargetId, 'miss')
            })
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
            // Roll damage for the full hit
            const damage = rollDamage(spell.damage.dice, false)

            // Log the failed save
            get().addLogEntry({
              type: 'spell',
              actorId: casterId,
              actorName: caster.name,
              targetId: currentTargetId,
              targetName: target.name,
              message: `${target.name} fails save against ${spell.name} (DC ${dc})`,
              details: saveResult.roll.breakdown,
            })

            // Check if target can use Indomitable (Fighter level 9+)
            if (target.type === 'character' && canUseIndomitable(target, target.classFeatureUses)) {
              // Set pending Indomitable prompt
              set({
                pendingIndomitable: {
                  combatantId: target.id,
                  ability: spell.savingThrow,
                  dc,
                  originalRoll: saveResult.roll.total,
                  originalNatural: saveResult.roll.naturalRoll,
                  modifier: saveResult.modifier,
                  context: {
                    type: 'spell_damage',
                    sourceId: casterId,
                    sourceName: `${caster.name}'s ${spell.name}`,
                    damage: damage.total,
                    halfDamageOnSave: true,
                    damageType: spell.damage.type,
                  },
                },
              })
              // Return early - the Indomitable resolution handler will apply damage
              return true
            }

            // Check if target can use Heroic Inspiration (Musician feat)
            if (target.type === 'character' && canUseHeroicInspiration(target)) {
              // Set pending Heroic Inspiration prompt
              set({
                pendingHeroicInspiration: {
                  combatantId: target.id,
                  type: 'save',
                  originalRoll: saveResult.roll.naturalRoll,
                  originalTotal: saveResult.roll.total,
                  modifier: saveResult.modifier,
                  targetValue: dc,
                  context: {
                    ability: spell.savingThrow,
                    sourceName: `${caster.name}'s ${spell.name}`,
                    damage: damage.total,
                    halfDamageOnSave: true,
                    damageType: spell.damage.type,
                  },
                },
              })
              // Return early - the Heroic Inspiration resolution handler will apply damage
              return true
            }

            // No reroll options available - apply damage immediately
            get().addCombatPopup(currentTargetId, 'save_failed')
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

    // Mark the appropriate action type as used (isBonusActionSpell defined at start of function)
    if (isBonusActionSpell) {
      get().useBonusAction()
    } else {
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

    // Tactical Shift: Level 5+ Fighters can move half speed without provoking OAs
    if (character.class.id === 'fighter' && character.level >= 5) {
      const speed = character.speed
      const halfSpeed = Math.floor(speed / 2)

      get().addLogEntry({
        type: 'other',
        actorId: combatantId,
        actorName: combatant.name,
        message: `${combatant.name} uses Tactical Shift and can move ${halfSpeed} ft. without provoking opportunity attacks!`,
      })

      // Grant bonus movement and disengaging condition
      set((state) => ({
        combatants: state.combatants.map((c) =>
          c.id === combatantId
            ? {
                ...c,
                movementUsed: c.movementUsed - halfSpeed,
                conditions: [...c.conditions, { condition: 'disengaging' as const, duration: 1 }],
              }
            : c
        ),
      }))
    }
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

  // Battle Master maneuvers
  useSuperiority: (combatantId) => {
    const { combatants } = get()
    const combatant = combatants.find((c) => c.id === combatantId)
    if (!combatant || combatant.superiorityDiceRemaining <= 0) return

    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === combatantId
          ? { ...c, superiorityDiceRemaining: c.superiorityDiceRemaining - 1 }
          : c
      ),
    }))
  },

  getSuperiorityDiceRemaining: (combatantId) => {
    const { combatants } = get()
    const combatant = combatants.find((c) => c.id === combatantId)
    return combatant?.superiorityDiceRemaining ?? 0
  },

  useBonusActionManeuver: (maneuverId, targetId) => {
    const { turnOrder, currentTurnIndex, combatants } = get()
    const currentId = turnOrder[currentTurnIndex]
    const combatant = combatants.find((c) => c.id === currentId)

    if (!combatant || combatant.hasBonusActed) return
    if (!hasCombatSuperiority(combatant)) return
    if (combatant.superiorityDiceRemaining <= 0) return

    if (maneuverId === 'evasive-footwork') {
      const result = applyEvasiveFootwork(combatant)

      // Get speed for Dash effect
      const speed = combatant.type === 'character'
        ? (combatant.data as Character).speed
        : (combatant.data as Monster).speed.walk

      get().addLogEntry({
        type: 'other',
        actorId: currentId,
        actorName: combatant.name,
        message: result.message,
      })

      set((state) => ({
        combatants: state.combatants.map((c) =>
          c.id === currentId
            ? {
                ...c,
                hasBonusActed: true,
                superiorityDiceRemaining: c.superiorityDiceRemaining - 1,
                movementUsed: c.movementUsed - speed, // Dash effect
                evasiveFootworkBonus: result.acBonus,
                conditions: [
                  ...c.conditions,
                  { condition: 'disengaging' as const, duration: 1 },
                  { condition: 'evasive' as const, duration: 1 },
                ],
              }
            : c
        ),
      }))
    } else if (maneuverId === 'feinting-attack') {
      if (!targetId) return
      const target = combatants.find((c) => c.id === targetId)
      if (!target) return

      // Validate within 5ft
      const dx = Math.abs(combatant.position.x - target.position.x)
      const dy = Math.abs(combatant.position.y - target.position.y)
      if (dx > 1 || dy > 1) return

      const result = applyFeintingAttack(combatant, target.name)

      get().addLogEntry({
        type: 'other',
        actorId: currentId,
        actorName: combatant.name,
        message: result.message,
      })

      set((state) => ({
        combatants: state.combatants.map((c) =>
          c.id === currentId
            ? {
                ...c,
                hasBonusActed: true,
                superiorityDiceRemaining: c.superiorityDiceRemaining - 1,
                feintTarget: targetId,
                feintBonusDamage: result.bonusDamage,
              }
            : c
        ),
      }))
    } else if (maneuverId === 'lunging-attack') {
      const result = applyLungingAttack(combatant)

      // Get speed for Dash effect
      const speed = combatant.type === 'character'
        ? (combatant.data as Character).speed
        : (combatant.data as Monster).speed.walk

      get().addLogEntry({
        type: 'other',
        actorId: currentId,
        actorName: combatant.name,
        message: result.message,
      })

      set((state) => ({
        combatants: state.combatants.map((c) =>
          c.id === currentId
            ? {
                ...c,
                hasBonusActed: true,
                superiorityDiceRemaining: c.superiorityDiceRemaining - 1,
                movementUsed: c.movementUsed - speed, // Dash effect
                lungingAttackBonus: result.bonusDamage,
              }
            : c
        ),
      }))
    }
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

          // Wait for movement animation to fully complete before proceeding
          while (get().movementAnimation || get().pendingMovement) {
            await new Promise((resolve) => setTimeout(resolve, 50))
          }
          // Small extra delay for visual clarity
          await new Promise((resolve) => setTimeout(resolve, 200))

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

        // Wait for any active projectiles to complete before ending turn
        while (get().activeProjectiles.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 50))
        }

        // Wait for any pending triggers (Shield, Parry, maneuvers) to resolve
        while (get().pendingTrigger !== undefined) {
          await new Promise((resolve) => setTimeout(resolve, 50))
        }

        // Wait for any pending heroic inspiration decisions to resolve
        while (get().pendingHeroicInspiration !== undefined) {
          await new Promise((resolve) => setTimeout(resolve, 50))
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

  launchProjectile: (from, to, onComplete) => {
    const id = generateId()

    // Store callback in module-level map (not in Zustand state)
    projectileCallbacks.set(id, onComplete)

    const projectile: ActiveProjectile = {
      id,
      from: { ...from },
      to: { ...to },
      timestamp: Date.now(),
      duration: PROJECTILE_FLIGHT_DURATION,
    }

    set((state) => ({
      activeProjectiles: [...state.activeProjectiles, projectile],
    }))

    // Schedule completion: execute deferred damage then remove projectile
    setTimeout(() => {
      const callback = projectileCallbacks.get(id)
      if (callback) {
        callback()
        projectileCallbacks.delete(id)
      }
      get().removeProjectile(id)
    }, PROJECTILE_FLIGHT_DURATION)

    return id
  },

  removeProjectile: (id) => {
    set((state) => ({
      activeProjectiles: state.activeProjectiles.filter((p) => p.id !== id),
    }))
  },

  debugApplyCondition: (combatantId, condition) => {
    const { combatants } = get()
    const target = combatants.find(c => c.id === combatantId)
    if (!target) return

    // Check if condition already exists
    if (target.conditions.some(c => c.condition === condition)) return

    set((state) => ({
      combatants: state.combatants.map(c =>
        c.id === combatantId
          ? { ...c, conditions: [...c.conditions, { condition, duration: -1 }] }
          : c
      ),
    }))

    // Show condition popup
    const conditionName = condition.charAt(0).toUpperCase() + condition.slice(1)
    get().addCombatPopup(combatantId, 'condition', conditionName)

    get().addLogEntry({
      type: 'other',
      actorId: combatantId,
      actorName: target.name,
      message: `[DEBUG] ${target.name} gains ${conditionName} condition`,
    })
  },

  debugRemoveCondition: (combatantId, condition) => {
    const { combatants } = get()
    const target = combatants.find(c => c.id === combatantId)
    if (!target) return

    set((state) => ({
      combatants: state.combatants.map(c =>
        c.id === combatantId
          ? { ...c, conditions: c.conditions.filter(cond => cond.condition !== condition) }
          : c
      ),
    }))

    const conditionName = condition.charAt(0).toUpperCase() + condition.slice(1)
    get().addLogEntry({
      type: 'other',
      actorId: combatantId,
      actorName: target.name,
      message: `[DEBUG] ${target.name} loses ${conditionName} condition`,
    })
  },

  // ============================================
  // Origin Feat Actions
  // ============================================

  confirmInitiativeSwap: (targetId) => {
    const { pendingInitiativeSwap, combatants } = get()
    if (!pendingInitiativeSwap) return

    if (targetId) {
      const swapper = combatants.find(c => c.id === pendingInitiativeSwap.swapperId)
      const target = combatants.find(c => c.id === targetId)

      if (swapper && target) {
        const swapperInit = swapper.initiative
        const targetInit = target.initiative

        set((state) => ({
          combatants: state.combatants.map(c => {
            if (c.id === swapper.id) return { ...c, initiative: targetInit }
            if (c.id === target.id) return { ...c, initiative: swapperInit }
            return c
          }),
        }))

        // Re-sort turn order
        const { combatants: updated } = get()
        const sorted = [...updated].sort((a, b) => b.initiative - a.initiative)
        set({ turnOrder: sorted.map(c => c.id) })

        get().addLogEntry({
          type: 'other',
          actorId: swapper.id,
          actorName: swapper.name,
          message: `swaps initiative with ${target.name} (Alert feat)`,
        })
      }
    }

    set({ pendingInitiativeSwap: undefined })
  },

  skipInitiativeSwap: () => {
    set({ pendingInitiativeSwap: undefined })
  },

  confirmSavageAttacker: (useRoll1) => {
    const { pendingSavageAttacker, combatants } = get()
    if (!pendingSavageAttacker) return

    const { attackerId, targetId, roll1, roll2, damageType, isCritical } = pendingSavageAttacker
    const attacker = combatants.find(c => c.id === attackerId)
    const target = combatants.find(c => c.id === targetId)
    if (!attacker || !target) return

    const selectedRoll = useRoll1 ? roll1 : roll2
    const otherRoll = useRoll1 ? roll2 : roll1

    get().addLogEntry({
      type: 'damage',
      actorId: attackerId,
      actorName: attacker.name,
      targetId,
      targetName: target.name,
      message: `uses Savage Attacker: chose ${selectedRoll.breakdown} over ${otherRoll.total}`,
    })

    // Apply damage
    get().dealDamage(targetId, selectedRoll.total, attacker.name)
    get().addDamagePopup(targetId, selectedRoll.total, damageType, isCritical)

    // Mark feat as used this turn
    set((state) => ({
      combatants: state.combatants.map(c =>
        c.id === attackerId
          ? { ...c, usedSavageAttackerThisTurn: true }
          : c
      ),
      pendingSavageAttacker: undefined,
    }))
  },

  skipSavageAttacker: () => {
    const { pendingSavageAttacker, combatants } = get()
    if (!pendingSavageAttacker) return

    // Apply the first roll (default behavior if skipped)
    const { attackerId, targetId, roll1, damageType, isCritical } = pendingSavageAttacker
    const attacker = combatants.find(c => c.id === attackerId)
    if (attacker) {
      get().dealDamage(targetId, roll1.total, attacker.name)
      get().addDamagePopup(targetId, roll1.total, damageType, isCritical)
    }

    set({ pendingSavageAttacker: undefined })
  },

  getBattleMedicTargets: (healerId) => {
    const { combatants } = get()
    const healer = combatants.find(c => c.id === healerId)
    if (!healer) return []
    return getOriginFeatBattleMedicTargets(healer, combatants)
  },

  useBattleMedic: (healerId, targetId) => {
    const { combatants } = get()
    const healer = combatants.find(c => c.id === healerId)
    const target = combatants.find(c => c.id === targetId)

    if (!healer || !target) return
    if (!canUseBattleMedic(healer)) return
    if (target.type !== 'character') return

    // Get target's hit die from their class
    const targetChar = target.data as Character
    const hitDie = targetChar.class.hitDie

    // Roll healing: target's hit die + healer's proficiency (with reroll 1s)
    const healingResult = rollBattleMedicHealing(healer, hitDie)

    // Calculate actual healing (cap at max HP)
    const actualHealing = Math.min(healingResult.total, target.maxHp - target.currentHp)

    // Log the healing
    get().addLogEntry({
      type: 'heal',
      actorId: healerId,
      actorName: healer.name,
      targetId,
      targetName: target.name,
      message: `uses Battle Medic on ${target.name}: ${healingResult.breakdown} (healed ${actualHealing})`,
    })

    // Apply healing and mark action used
    set((state) => ({
      combatants: state.combatants.map(c => {
        if (c.id === targetId) {
          return {
            ...c,
            currentHp: Math.min(c.maxHp, c.currentHp + actualHealing),
          }
        }
        if (c.id === healerId) {
          return { ...c, hasActed: true }
        }
        return c
      }),
    }))

    // Show heal popup
    get().addHealPopup(targetId, actualHealing)
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
