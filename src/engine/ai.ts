import type { Combatant, Monster, Position, MonsterAction, Grid, Character } from '@/types'
import { getDistance, canAttackTarget } from './combat'
import { findPath, getReachablePositions, calculatePathCost } from '@/lib/pathfinding'
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
  grid: Grid
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
      const hasLOS = hasLineOfSight(grid, self.position, target.position)
      if (hasLOS) {
        return attack
      }
    }
  }

  // No usable attack from current position - return best melee for movement planning
  return meleeAttacks[0] ?? rangedAttacks[0] ?? attacks[0]
}


/**
 * Calculate path toward a target position using A* pathfinding
 * Returns the best position to move to given remaining movement budget
 */
function getPositionTowardTarget(
  current: Position,
  target: Position,
  maxMovement: number,
  grid: Grid,
  occupiedPositions: Set<string>
): Position | null {
  if (maxMovement <= 0) return null

  // Use A* to find path to target (or adjacent to target)
  const path = findPath(grid, current, target, occupiedPositions, undefined)

  if (path && path.length > 1) {
    // Find how far along the path we can go with our movement budget
    let movementUsed = 0
    let lastValidIndex = 0

    for (let i = 1; i < path.length; i++) {
      const segmentCost = calculatePathCost(grid, [path[i - 1], path[i]])
      if (movementUsed + segmentCost <= maxMovement) {
        movementUsed += segmentCost
        lastValidIndex = i
      } else {
        break
      }
    }

    // Don't move to the target's exact position (it's occupied by the enemy)
    // Move to the second-to-last position if we would reach the target
    if (lastValidIndex > 0) {
      const destination = path[lastValidIndex]
      // Don't move to the enemy's position
      if (destination.x === target.x && destination.y === target.y && lastValidIndex > 1) {
        return path[lastValidIndex - 1]
      }
      if (destination.x !== current.x || destination.y !== current.y) {
        return destination
      }
    }
  }

  // If no path found, try to find reachable positions that get us closer
  const reachable = getReachablePositions(grid, current, maxMovement, occupiedPositions)

  let bestPosition: Position | null = null
  let bestDistance = Infinity

  reachable.forEach((_, key) => {
    const [x, y] = key.split(',').map(Number)
    // Don't move to the enemy's position
    if (x === target.x && y === target.y) return

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
  grid: Grid
): AIDecision {
  const actions: AIAction[] = []

  const isCharacter = monster.type === 'character'
  const isMonster = monster.type === 'monster'

  if (!isCharacter && !isMonster) {
    return { actions: [{ type: 'end' }] }
  }

  // Get monster/character data
  const monsterData = isMonster ? monster.data as Monster : null
  const characterData = isCharacter ? monster.data as Character : null

  // Find best target (smarter than just nearest)
  const bestTarget = findBestTarget(combatants, monster)
  if (!bestTarget) {
    return { actions: [{ type: 'end' }] }
  }

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

  // Get occupied positions
  const occupiedPositions = new Set(
    combatants
      .filter((c) => c.id !== monster.id && c.position.x >= 0)
      .map((c) => `${c.position.x},${c.position.y}`)
  )

  // Calculate remaining movement
  const speed = monsterData?.speed.walk ?? characterData?.speed ?? 30
  const remainingMovement = speed - monster.movementUsed

  // Get max attacks per action (for Extra Attack)
  const maxAttacks = getMaxAttacksPerAction(monster)
  const attacksRemaining = maxAttacks - monster.attacksMadeThisTurn

  // Find the best usable attack from current position (considers ranged options)
  const usableAttack = monsterData
    ? getBestUsableAttack(monsterData, monster, bestTarget, grid)
    : null

  // Check if the usable attack can actually hit from here
  const attackCheck = usableAttack
    ? canAttackTarget(monster, bestTarget, grid, undefined, usableAttack)
    : { canAttack: false }
  const canAttackNow = attackCheck.canAttack

  if (canAttackNow && usableAttack) {
    // Attack the best target with the usable attack
    if (attacksRemaining > 0) {
      actions.push({
        type: 'attack',
        targetId: bestTarget.id,
        action: usableAttack,
      })
    }

    // After attacking, could move away or stay
    actions.push({ type: 'end' })
  } else {
    // Can't attack from here - move toward enemy to get in melee range
    if (remainingMovement > 0) {
      const moveTarget = getPositionTowardTarget(
        monster.position,
        bestTarget.position,
        remainingMovement,
        grid,
        occupiedPositions
      )

      if (moveTarget) {
        actions.push({
          type: 'move',
          targetPosition: moveTarget,
        })
      }
    }

    // Check if we can attack after moving (simulate the move)
    if (actions.some(a => a.type === 'move') && actions.find(a => a.type === 'move')?.targetPosition) {
      const moveAction = actions.find(a => a.type === 'move')!
      const simulatedPosition = moveAction.targetPosition!
      const simulatedMonster = { ...monster, position: simulatedPosition }

      // Get the best usable attack from the new position
      const attackAfterMove = monsterData
        ? getBestUsableAttack(monsterData, simulatedMonster, bestTarget, grid)
        : null

      if (attackAfterMove && attacksRemaining > 0) {
        const canAttackAfterMove = canAttackTarget(simulatedMonster, bestTarget, grid, undefined, attackAfterMove)
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

  return { actions }
}

/**
 * Execute AI actions one at a time (returns the next action to take)
 */
export function getNextAIAction(
  monster: Combatant,
  combatants: Combatant[],
  grid: Grid
): AIAction {
  const decision = decideMonsterAction(monster, combatants, grid)
  return decision.actions[0] ?? { type: 'end' }
}
