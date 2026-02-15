import type { Combatant, Monster, Position, MonsterAction, Grid, Character } from '@/types'
import { getDistance, canAttackTarget, canTakeActions } from './combat'
import { findPath, getReachablePositions, calculatePathCost, type MovementContext } from '@/lib/pathfinding'
import { hasLineOfSight } from '@/lib/lineOfSight'
import {
  canUseSecondWind,
  getMaxAttacksPerAction,
  hasCunningAction,
  canUseCunningAction,
} from './classAbilities'

export interface AIAction {
  type: 'move' | 'attack' | 'end' | 'second_wind' | 'cunning_dash' | 'cunning_disengage' | 'cunning_hide'
  targetId?: string
  targetPosition?: Position
  action?: MonsterAction
}

export interface AIDecision {
  actions: AIAction[]
}

/**
 * Get all enemy combatants (alive characters from monster's perspective)
 */
function getEnemies(combatants: Combatant[], self: Combatant): Combatant[] {
  return combatants.filter((c) => {
    if (c.id === self.id) return false
    if (c.currentHp <= 0) return false
    // Monsters target characters, characters would target monsters
    return c.type !== self.type
  })
}

/**
 * Score a potential target for priority selection
 * Higher score = better target
 */
function scoreTarget(self: Combatant, target: Combatant): number {
  let score = 100

  // Distance penalty (prefer closer targets)
  const distance = getDistance(self, target)
  score -= distance * 2

  // Low HP bonus (finish off wounded enemies)
  const hpPercent = target.currentHp / target.maxHp
  if (hpPercent < 0.25) {
    score += 40  // Nearly dead - high priority
  } else if (hpPercent < 0.5) {
    score += 20  // Wounded
  }

  // Spellcaster bonus (target casters first)
  if (target.type === 'character') {
    const char = target.data as Character
    if (char.class.spellcasting) {
      score += 15
    }
  }

  // Concentrating target bonus (break their concentration)
  if (target.concentratingOn) {
    score += 25
  }

  return score
}

/**
 * Find the best target (not just nearest)
 */
function findBestTarget(combatants: Combatant[], self: Combatant): Combatant | null {
  const enemies = getEnemies(combatants, self)
  if (enemies.length === 0) return null

  let bestTarget: Combatant | null = null
  let bestScore = -Infinity

  for (const enemy of enemies) {
    const score = scoreTarget(self, enemy)
    if (score > bestScore) {
      bestScore = score
      bestTarget = enemy
    }
  }

  return bestTarget
}

/**
 * Find the nearest enemy (fallback)
 */
function findNearestEnemy(combatants: Combatant[], self: Combatant): Combatant | null {
  const enemies = getEnemies(combatants, self)
  if (enemies.length === 0) return null

  let nearest: Combatant | null = null
  let nearestDistance = Infinity

  for (const enemy of enemies) {
    const distance = getDistance(self, enemy)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = enemy
    }
  }

  return nearest
}

/**
 * Check if an attack is ranged (has range property but no reach)
 */
function isRangedAttack(action: MonsterAction): boolean {
  return action.range !== undefined && action.reach === undefined
}

/**
 * Check if an attack is melee (has reach property or no range)
 */
function isMeleeAttack(action: MonsterAction): boolean {
  return action.reach !== undefined || action.range === undefined
}

/**
 * Get the best usable attack for the monster given its distance to target
 */
function getBestUsableAttack(
  monster: Monster,
  self: Combatant,
  target: Combatant,
  grid: Grid,
  fogCells?: Set<string>
): MonsterAction | null {
  const attacks = monster.actions.filter((a) => a.attackBonus !== undefined || a.damage)
  if (attacks.length === 0) return null

  const distance = getDistance(self, target)

  // Separate melee and ranged attacks
  const meleeAttacks = attacks.filter(isMeleeAttack)
  const rangedAttacks = attacks.filter(isRangedAttack)

  // Check if we're in melee range - prefer melee attacks
  for (const attack of meleeAttacks) {
    const reach = attack.reach ?? 5
    if (distance <= reach) {
      return attack
    }
  }

  // Check ranged attacks if melee isn't an option
  for (const attack of rangedAttacks) {
    const normalRange = attack.range?.normal ?? 30
    if (distance <= normalRange) {
      // Check line of sight for ranged attacks
      const hasLOS = hasLineOfSight(grid, self.position, target.position, fogCells)
      if (hasLOS) {
        return attack
      }
    }
  }

  // No usable attack from current position - return best attack for movement planning
  // If target is beyond melee reach and we have ranged attacks, prefer ranged
  // (the monster will move to get LOS rather than charge across the map with a sword)
  const bestMeleeReach = meleeAttacks.length > 0 ? Math.max(...meleeAttacks.map(a => a.reach ?? 5)) : 0
  if (distance > bestMeleeReach && rangedAttacks.length > 0) {
    console.warn(`[AI] getBestUsableAttack: no usable attack from current position, distance=${distance} > meleeReach=${bestMeleeReach}, preferring ranged=${rangedAttacks[0].name}`)
    return rangedAttacks[0]
  }

  console.warn(`[AI] getBestUsableAttack: no usable attack from current position, falling back to ${meleeAttacks[0]?.name ?? rangedAttacks[0]?.name ?? attacks[0]?.name}`)
  return meleeAttacks[0] ?? rangedAttacks[0] ?? attacks[0]
}


/**
 * Check if a combatant is dead (monsters at 0 HP, characters with 3 death save failures)
 */
function isDead(combatant: Combatant): boolean {
  if (combatant.type === 'monster') return combatant.currentHp <= 0
  return combatant.deathSaves.failures >= 3
}

/**
 * Build occupied position sets for AI pathfinding.
 * D&D 5e rules: you can move through a friendly creature's space but can't end there.
 *
 * Returns:
 * - pathBlocked: positions that block pathfinding (only enemies, not allies or dead)
 * - endBlocked: positions you can't end movement on (all living creatures)
 */
function buildOccupiedSets(
  self: Combatant,
  combatants: Combatant[]
): { pathBlocked: Set<string>; endBlocked: Set<string> } {
  const pathBlocked = new Set<string>()
  const endBlocked = new Set<string>()

  for (const c of combatants) {
    if (c.id === self.id) continue
    if (c.position.x < 0) continue
    if (isDead(c)) continue

    const key = `${c.position.x},${c.position.y}`

    // Can't end on anyone's space
    endBlocked.add(key)

    // Only enemies block pathfinding; allies can be moved through
    if (c.type !== self.type) {
      pathBlocked.add(key)
    }
  }

  return { pathBlocked, endBlocked }
}

/**
 * Calculate path toward a target position using A* pathfinding
 * Returns the best position to move to given remaining movement budget
 *
 * pathBlocked: positions that block A* pathfinding (enemies only)
 * endBlocked: positions the creature can't stop on (all living creatures)
 */
function getPositionTowardTarget(
  current: Position,
  target: Position,
  maxMovement: number,
  grid: Grid,
  pathBlocked: Set<string>,
  endBlocked: Set<string>,
  movementContext?: MovementContext,
  difficultZoneCells?: Set<string>
): Position | null {
  if (maxMovement <= 0) return null

  // Use A* to find path to target (or adjacent to target)
  const path = findPath(grid, current, target, pathBlocked, undefined, 1, movementContext, difficultZoneCells)

  if (path && path.length > 1) {
    // Find how far along the path we can go with our movement budget
    let movementUsed = 0
    let lastValidIndex = 0

    for (let i = 1; i < path.length; i++) {
      const segmentCost = calculatePathCost(grid, [path[i - 1], path[i]], movementContext, difficultZoneCells)
      if (movementUsed + segmentCost <= maxMovement) {
        movementUsed += segmentCost
        lastValidIndex = i
      } else {
        break
      }
    }

    // Walk back from the furthest reachable position until we find an unblocked cell
    if (lastValidIndex > 0) {
      for (let i = lastValidIndex; i >= 1; i--) {
        const dest = path[i]
        const destKey = `${dest.x},${dest.y}`
        // Can't end on the target's position or any living creature's space
        if (endBlocked.has(destKey)) continue
        if (dest.x === current.x && dest.y === current.y) continue
        return dest
      }
    }
  }

  // If no path found, try to find reachable positions that get us closer
  // Use pathBlocked for BFS so we can traverse through ally spaces
  const reachable = getReachablePositions(grid, current, maxMovement, pathBlocked, 1, movementContext, difficultZoneCells)

  let bestPosition: Position | null = null
  let bestDistance = Infinity

  reachable.forEach((_, key) => {
    // Can't end on any living creature's space
    if (endBlocked.has(key)) return

    const [x, y] = key.split(',').map(Number)

    const distance = Math.max(Math.abs(target.x - x), Math.abs(target.y - y))
    if (distance < bestDistance) {
      bestDistance = distance
      bestPosition = { x, y }
    }
  })

  // Only return a position if it actually gets us closer
  const currentDistance = Math.max(Math.abs(target.x - current.x), Math.abs(target.y - current.y))
  if (bestPosition && bestDistance < currentDistance) {
    return bestPosition
  }

  return null
}

/**
 * Check if AI should use Second Wind (Fighter ability)
 */
function shouldUseSecondWind(combatant: Combatant): boolean {
  // Use Second Wind when below 50% HP and haven't used bonus action
  const hpPercent = combatant.currentHp / combatant.maxHp
  if (hpPercent > 0.5) return false
  if (!canUseSecondWind(combatant, combatant.classFeatureUses)) return false
  return true
}

/**
 * Check if AI should use Cunning Action (Rogue ability)
 */
function getCunningActionToUse(combatant: Combatant, combatants: Combatant[], enemies: Combatant[]): AIAction | null {
  if (!hasCunningAction(combatant)) return null

  // Check if we're threatened (enemies within 5ft)
  const nearbyEnemies = enemies.filter(e => getDistance(combatant, e) <= 5)

  // If threatened and need to retreat, use Cunning Disengage
  const hpPercent = combatant.currentHp / combatant.maxHp
  if (nearbyEnemies.length > 1 && hpPercent < 0.4 && canUseCunningAction(combatant, 'disengage')) {
    return { type: 'cunning_disengage' }
  }

  // If no threats nearby and want to get in range faster, use Cunning Dash
  if (nearbyEnemies.length === 0 && canUseCunningAction(combatant, 'dash')) {
    // Only dash if we're far from enemies
    const nearestEnemy = findNearestEnemy(combatants, combatant)
    if (nearestEnemy && getDistance(combatant, nearestEnemy) > 15) {
      return { type: 'cunning_dash' }
    }
  }

  return null
}

/**
 * Main AI decision function for a monster's turn
 */
export function decideMonsterAction(
  monster: Combatant,
  combatants: Combatant[],
  grid: Grid,
  fogCells?: Set<string>,
  greaseCells?: Set<string>
): AIDecision {
  const actions: AIAction[] = []

  const isCharacter = monster.type === 'character'
  const isMonster = monster.type === 'monster'

  if (!isCharacter && !isMonster) {
    console.warn(`[AI] ${monster.name}: not a character or monster (type=${monster.type}), ending`)
    return { actions: [{ type: 'end' }] }
  }

  // Can't take actions if incapacitated, stunned, unconscious, etc.
  if (!canTakeActions(monster)) {
    console.warn(`[AI] ${monster.name}: can't take actions (conditions=[${monster.conditions.map(c => c.condition).join(',')}]), ending`)
    return { actions: [{ type: 'end' }] }
  }

  // Get monster/character data
  const monsterData = isMonster ? monster.data as Monster : null
  const characterData = isCharacter ? monster.data as Character : null

  // Find best target (smarter than just nearest)
  const bestTarget = findBestTarget(combatants, monster)
  if (!bestTarget) {
    console.warn(`[AI] ${monster.name}: no valid target found, ending`)
    return { actions: [{ type: 'end' }] }
  }

  console.warn(`[AI] ${monster.name}: best target = ${bestTarget.name} (hp=${bestTarget.currentHp}/${bestTarget.maxHp}, distance=${getDistance(monster, bestTarget)})`)

  // For characters, check if should use Second Wind
  if (isCharacter && shouldUseSecondWind(monster)) {
    actions.push({ type: 'second_wind' })
    // Continue with turn after using bonus action
  }

  // Check for Cunning Action
  const enemies = getEnemies(combatants, monster)
  const cunningAction = getCunningActionToUse(monster, combatants, enemies)
  if (cunningAction && actions.length === 0) {
    actions.push(cunningAction)
  }

  // Build occupied position sets (allies passable for pathing, not for ending)
  const { pathBlocked, endBlocked } = buildOccupiedSets(monster, combatants)

  // Calculate remaining movement
  const speed = monsterData?.speed.walk ?? characterData?.speed ?? 30
  const swimSpeed = monsterData?.speed.swim ?? characterData?.swimSpeed
  const movementContext: MovementContext = { walkSpeed: speed, swimSpeed }
  const remainingMovement = speed - monster.movementUsed

  // Get max attacks per action (for Extra Attack)
  const maxAttacks = getMaxAttacksPerAction(monster)
  const attacksRemaining = maxAttacks - monster.attacksMadeThisTurn

  // Find the best usable attack from current position (considers ranged options)
  const usableAttack = monsterData
    ? getBestUsableAttack(monsterData, monster, bestTarget, grid, fogCells)
    : null

  // Check if the usable attack can actually hit from here
  const attackCheck = usableAttack
    ? canAttackTarget(monster, bestTarget, grid, undefined, usableAttack, fogCells)
    : { canAttack: false }
  const canAttackNow = attackCheck.canAttack

  console.warn(`[AI] ${monster.name}: speed=${speed}, remainingMovement=${remainingMovement}, maxAttacks=${maxAttacks}, attacksRemaining=${attacksRemaining}, usableAttack=${usableAttack?.name ?? 'none'}, canAttackNow=${canAttackNow}`)

  if (canAttackNow && usableAttack) {
    // Attack the best target with the usable attack
    if (attacksRemaining > 0) {
      actions.push({
        type: 'attack',
        targetId: bestTarget.id,
        action: usableAttack,
      })
    } else {
      console.warn(`[AI] ${monster.name}: can attack but no attacks remaining (attacksMadeThisTurn=${monster.attacksMadeThisTurn})`)
    }

    // After attacking, could move away or stay
    actions.push({ type: 'end' })
  } else {
    // Can't attack from here - move toward enemy (for melee range or better LOS for ranged)
    if (remainingMovement > 0) {
      const moveTarget = getPositionTowardTarget(
        monster.position,
        bestTarget.position,
        remainingMovement,
        grid,
        pathBlocked,
        endBlocked,
        movementContext,
        greaseCells
      )

      if (moveTarget) {
        actions.push({
          type: 'move',
          targetPosition: moveTarget,
        })
      } else {
        console.warn(`[AI] ${monster.name}: no valid move position found toward ${bestTarget.name}`)
      }
    } else {
      console.warn(`[AI] ${monster.name}: no remaining movement (movementUsed=${monster.movementUsed})`)
    }

    // Check if we can attack after moving (simulate the move)
    if (actions.some(a => a.type === 'move') && actions.find(a => a.type === 'move')?.targetPosition) {
      const moveAction = actions.find(a => a.type === 'move')!
      const simulatedPosition = moveAction.targetPosition!
      const simulatedMonster = { ...monster, position: simulatedPosition }

      // Get the best usable attack from the new position
      const attackAfterMove = monsterData
        ? getBestUsableAttack(monsterData, simulatedMonster, bestTarget, grid, fogCells)
        : null

      if (attackAfterMove && attacksRemaining > 0) {
        const canAttackAfterMove = canAttackTarget(simulatedMonster, bestTarget, grid, undefined, attackAfterMove, fogCells)
        if (canAttackAfterMove.canAttack) {
          actions.push({
            type: 'attack',
            targetId: bestTarget.id,
            action: attackAfterMove,
          })
        }
      }
    }

    actions.push({ type: 'end' })
  }

  console.warn(`[AI] ${monster.name}: final actions = [${actions.map(a => a.type).join(', ')}]`)
  return { actions }
}

/**
 * Execute AI actions one at a time (returns the next action to take)
 */
export function getNextAIAction(
  monster: Combatant,
  combatants: Combatant[],
  grid: Grid,
  fogCells?: Set<string>,
  greaseCells?: Set<string>
): AIAction {
  const decision = decideMonsterAction(monster, combatants, grid, fogCells, greaseCells)
  return decision.actions[0] ?? { type: 'end' }
}
