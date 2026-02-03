export interface DiceRollResult {
  total: number
  rolls: number[]
  modifier: number
  expression: string
  breakdown: string
}

export interface D20RollResult extends DiceRollResult {
  isNatural20: boolean
  isNatural1: boolean
  naturalRoll: number  // The actual d20 roll (before modifiers)
  advantage: 'normal' | 'advantage' | 'disadvantage'
}

/**
 * Roll a single die with the specified number of sides
 */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1
}

/**
 * Roll multiple dice and return the sum
 */
export function rollDice(count: number, sides: number): number[] {
  const rolls: number[] = []
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(sides))
  }
  return rolls
}

/**
 * Parse a dice expression like "2d6+3" or "1d20-2"
 * Returns { count, sides, modifier }
 */
export function parseDiceExpression(expression: string): {
  count: number
  sides: number
  modifier: number
} | null {
  const regex = /^(\d+)?d(\d+)([+-]\d+)?$/i
  const match = expression.trim().match(regex)

  if (!match) return null

  return {
    count: match[1] ? parseInt(match[1], 10) : 1,
    sides: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0,
  }
}

/**
 * Roll dice from a string expression like "2d6+3"
 */
export function roll(expression: string): DiceRollResult {
  const parsed = parseDiceExpression(expression)

  if (!parsed) {
    throw new Error(`Invalid dice expression: ${expression}`)
  }

  const rolls = rollDice(parsed.count, parsed.sides)
  const rollTotal = rolls.reduce((sum, r) => sum + r, 0)
  const total = rollTotal + parsed.modifier

  const modifierStr = parsed.modifier > 0
    ? `+${parsed.modifier}`
    : parsed.modifier < 0
      ? `${parsed.modifier}`
      : ''

  const breakdown = `[${rolls.join(', ')}]${modifierStr} = ${total}`

  return {
    total,
    rolls,
    modifier: parsed.modifier,
    expression,
    breakdown,
  }
}

/**
 * Roll a d20 with optional advantage/disadvantage
 */
export function rollD20(
  modifier: number = 0,
  advantage: 'normal' | 'advantage' | 'disadvantage' = 'normal'
): D20RollResult {
  let rolls: number[]
  let selectedRoll: number

  if (advantage === 'normal') {
    rolls = [rollDie(20)]
    selectedRoll = rolls[0]
  } else {
    rolls = [rollDie(20), rollDie(20)]
    selectedRoll = advantage === 'advantage'
      ? Math.max(...rolls)
      : Math.min(...rolls)
  }

  const total = selectedRoll + modifier
  const modifierStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : ''

  let breakdown: string
  if (advantage === 'normal') {
    breakdown = `[${rolls[0]}]${modifierStr} = ${total}`
  } else {
    const prefix = advantage === 'advantage' ? 'Adv' : 'Dis'
    breakdown = `${prefix}[${rolls.join(', ')}→${selectedRoll}]${modifierStr} = ${total}`
  }

  return {
    total,
    rolls,
    modifier,
    expression: `1d20${modifierStr}`,
    breakdown,
    isNatural20: selectedRoll === 20,
    isNatural1: selectedRoll === 1,
    naturalRoll: selectedRoll,
    advantage,
  }
}

/**
 * Roll for initiative (d20 + DEX modifier)
 */
export function rollInitiative(dexModifier: number): D20RollResult {
  return rollD20(dexModifier)
}

/**
 * Roll an attack (d20 + attack bonus)
 * Returns hit result including critical hit/miss detection
 */
export function rollAttack(
  attackBonus: number,
  advantage: 'normal' | 'advantage' | 'disadvantage' = 'normal'
): D20RollResult {
  return rollD20(attackBonus, advantage)
}

/**
 * Roll damage dice
 */
export function rollDamage(damageExpression: string, critical: boolean = false): DiceRollResult {
  const parsed = parseDiceExpression(damageExpression)

  if (!parsed) {
    throw new Error(`Invalid damage expression: ${damageExpression}`)
  }

  // On critical hit, double the number of dice
  const diceCount = critical ? parsed.count * 2 : parsed.count
  const rolls = rollDice(diceCount, parsed.sides)
  const rollTotal = rolls.reduce((sum, r) => sum + r, 0)
  const total = rollTotal + parsed.modifier

  const modifierStr = parsed.modifier > 0
    ? `+${parsed.modifier}`
    : parsed.modifier < 0
      ? `${parsed.modifier}`
      : ''

  const critPrefix = critical ? 'CRIT! ' : ''
  const breakdown = `${critPrefix}[${rolls.join(', ')}]${modifierStr} = ${total}`

  return {
    total,
    rolls,
    modifier: parsed.modifier,
    expression: critical ? `${diceCount}d${parsed.sides}${modifierStr}` : damageExpression,
    breakdown,
  }
}

/**
 * Roll a saving throw
 */
export function rollSavingThrow(
  saveModifier: number,
  dc: number,
  advantage: 'normal' | 'advantage' | 'disadvantage' = 'normal'
): { roll: D20RollResult; success: boolean; dc: number } {
  const rollResult = rollD20(saveModifier, advantage)
  return {
    roll: rollResult,
    success: rollResult.total >= dc,
    dc,
  }
}

/**
 * Roll ability check
 */
export function rollAbilityCheck(
  abilityModifier: number,
  proficiencyBonus: number = 0,
  advantage: 'normal' | 'advantage' | 'disadvantage' = 'normal'
): D20RollResult {
  return rollD20(abilityModifier + proficiencyBonus, advantage)
}
