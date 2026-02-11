import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getClassIcon } from '@/lib/classIcons'
import { useCombatStore, getCurrentCombatant } from '@/stores/combatStore'
import { getCombatantTokenImage } from '@/lib/tokenImages'
import { getMaxAttacksPerAction, getSecondWindMaxUses, getIndomitableMaxUses, getIndomitableFeature } from '@/engine/classAbilities'
import { canAttackTarget } from '@/engine/combat'
import { hasCombatSuperiority, getMaxSuperiorityDice, getSuperiorityDieSize, getManeuverSaveDC } from '@/engine/maneuvers'
import { startsWithHeroicInspiration } from '@/engine/originFeats'
import { getManeuverById } from '@/data/maneuvers'
import type { Character, Monster, Combatant, FightingStyle, Spell, Weapon } from '@/types'
import type { Maneuver } from '@/types/maneuver'
import { getAbilityModifier } from '@/types'
import { Sword, Crosshair, Sparkles, Shield, Footprints, Zap, Swords, Target, X, type LucideIcon } from 'lucide-react'

// ============================================
// Selected Feature Types
// ============================================

type SelectedFeature =
  | { type: 'fighting_style'; style: FightingStyle }
  | { type: 'maneuver'; maneuver: Maneuver }

function StatBlock({ label, value, subtext, icon: Icon }: { label: string; value: string | number; subtext?: string; icon?: LucideIcon }) {
  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className="text-lg font-bold">{value}</div>
      {subtext && <div className="text-xs text-muted-foreground">{subtext}</div>}
    </div>
  )
}

function AbilityScoreDisplay({ name, score }: { name: string; score: number }) {
  const mod = getAbilityModifier(score)
  const modStr = mod >= 0 ? `+${mod}` : `${mod}`

  return (
    <div className="text-center p-2 bg-slate-800/50 rounded">
      <div className="text-xs text-muted-foreground uppercase">{name.substring(0, 3)}</div>
      <div className="text-sm font-bold">{score}</div>
      <div className="text-xs text-primary">{modStr}</div>
    </div>
  )
}

// Fighting style display names and descriptions
const FIGHTING_STYLE_INFO: Record<FightingStyle, { name: string; description: string }> = {
  archery: {
    name: 'Archery',
    description: 'You gain a +2 bonus to attack rolls you make with ranged weapons.',
  },
  defense: {
    name: 'Defense',
    description: 'While you are wearing armor, you gain a +1 bonus to AC.',
  },
  dueling: {
    name: 'Dueling',
    description: 'When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.',
  },
  great_weapon: {
    name: 'Great Weapon Fighting',
    description: 'When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two hands, you can reroll the die and must use the new roll.',
  },
  protection: {
    name: 'Protection',
    description: 'When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll. You must be wielding a shield.',
  },
  two_weapon: {
    name: 'Two-Weapon Fighting',
    description: 'When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack.',
  },
}

interface ClassFeaturesSectionProps {
  character: Character
  selectedFeature: SelectedFeature | null
  onSelectFeature: (feature: SelectedFeature | null) => void
}

function ClassFeaturesSection({ character, selectedFeature, onSelectFeature }: ClassFeaturesSectionProps) {
  const fightingStyles = character.fightingStyles ?? []
  const knownManeuverIds = character.knownManeuverIds ?? []

  // Nothing to show
  if (fightingStyles.length === 0 && knownManeuverIds.length === 0) {
    return null
  }

  const isStyleSelected = (style: FightingStyle) =>
    selectedFeature?.type === 'fighting_style' && selectedFeature.style === style

  const isManeuverSelected = (id: string) =>
    selectedFeature?.type === 'maneuver' && selectedFeature.maneuver.id === id

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">Class Features</div>
      <div className="space-y-2">
        {/* Fighting Styles */}
        {fightingStyles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {fightingStyles.map(style => (
              <button
                key={style}
                onClick={() => onSelectFeature(isStyleSelected(style) ? null : { type: 'fighting_style', style })}
                className={cn(
                  'text-xs px-2 py-0.5 rounded flex items-center gap-1 transition-all',
                  isStyleSelected(style)
                    ? 'bg-orange-500 text-white ring-2 ring-orange-400'
                    : 'bg-orange-900/50 text-orange-200 hover:bg-orange-800/50'
                )}
              >
                <Swords className="w-3 h-3" />
                {FIGHTING_STYLE_INFO[style].name}
              </button>
            ))}
          </div>
        )}

        {/* Battle Master Maneuvers */}
        {knownManeuverIds.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Maneuvers</div>
            <div className="flex flex-wrap gap-1">
              {knownManeuverIds.map(id => {
                const maneuver = getManeuverById(id)
                if (!maneuver) return null
                return (
                  <button
                    key={id}
                    onClick={() => onSelectFeature(isManeuverSelected(id) ? null : { type: 'maneuver', maneuver })}
                    className={cn(
                      'text-xs px-2 py-0.5 rounded flex items-center gap-1 transition-all',
                      isManeuverSelected(id)
                        ? 'bg-amber-500 text-white ring-2 ring-amber-400'
                        : 'bg-amber-900/50 text-amber-200 hover:bg-amber-800/50'
                    )}
                  >
                    <Target className="w-3 h-3" />
                    {maneuver.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Feature Detail Card
// ============================================

function getTriggerLabel(trigger: Maneuver['trigger']): string {
  switch (trigger) {
    case 'on_hit': return 'On Hit'
    case 'pre_attack': return 'On Miss'
    case 'bonus_action': return 'Bonus Action'
    case 'reaction': return 'Reaction'
    default: return trigger
  }
}

function getTriggerColor(trigger: Maneuver['trigger']): string {
  switch (trigger) {
    case 'on_hit': return 'bg-red-500/20 text-red-300 border-red-500/50'
    case 'pre_attack': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
    case 'bonus_action': return 'bg-green-500/20 text-green-300 border-green-500/50'
    case 'reaction': return 'bg-blue-500/20 text-blue-300 border-blue-500/50'
    default: return 'bg-slate-500/20 text-slate-300 border-slate-500/50'
  }
}

interface FeatureDetailCardProps {
  feature: SelectedFeature
  combatant: Combatant
  onClose: () => void
}

function FeatureDetailCard({ feature, combatant, onClose }: FeatureDetailCardProps) {
  if (feature.type === 'fighting_style') {
    const info = FIGHTING_STYLE_INFO[feature.style]
    return (
      <Card className="border-orange-500/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Swords className="w-4 h-4 text-orange-400" />
              {info.name}
            </CardTitle>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <span className="text-xs bg-orange-500/20 text-orange-300 border border-orange-500/50 px-2 py-0.5 rounded w-fit">
            Fighting Style
          </span>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {info.description}
          </p>
        </CardContent>
      </Card>
    )
  }

  // Maneuver detail
  const { maneuver } = feature
  const saveDC = getManeuverSaveDC(combatant)
  const dieSize = getSuperiorityDieSize(combatant)

  return (
    <Card className="border-amber-500/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            {maneuver.name}
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className={cn('text-xs border px-2 py-0.5 rounded', getTriggerColor(maneuver.trigger))}>
            {getTriggerLabel(maneuver.trigger)}
          </span>
          {maneuver.addsDamageDie && (
            <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded">
              +1d{dieSize} damage
            </span>
          )}
          {maneuver.addsToAttackRoll && (
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded">
              +1d{dieSize} to hit
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {maneuver.description}
        </p>

        {/* Saving Throw Info */}
        {maneuver.savingThrow && (
          <div className="bg-slate-800/50 rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">Saving Throw</div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary">
                DC {saveDC} {maneuver.savingThrow.ability.toUpperCase()}
              </span>
              <span className="text-xs text-muted-foreground">
                — {maneuver.savingThrow.effect}
              </span>
            </div>
          </div>
        )}

        {/* Cost */}
        <div className="text-xs text-amber-400 flex items-center gap-1">
          <span className="font-medium">Cost:</span> 1 Superiority Die (d{dieSize})
        </div>
      </CardContent>
    </Card>
  )
}

function ConditionBadge({ condition }: { condition: string }) {
  const colors: Record<string, string> = {
    unconscious: 'bg-rose-900 text-rose-200',
    poisoned: 'bg-emerald-900 text-emerald-200',
    frightened: 'bg-purple-900 text-purple-200',
    charmed: 'bg-pink-900 text-pink-200',
    blinded: 'bg-slate-700 text-slate-200',
    deafened: 'bg-slate-700 text-slate-200',
    paralyzed: 'bg-amber-900 text-amber-200',
    stunned: 'bg-amber-900 text-amber-200',
    grappled: 'bg-orange-900 text-orange-200',
    restrained: 'bg-orange-900 text-orange-200',
    prone: 'bg-yellow-900 text-yellow-200',
    dodging: 'bg-sky-900 text-sky-200',
  }

  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full', colors[condition] || 'bg-slate-700 text-slate-200')}>
      {condition}
    </span>
  )
}

// ============================================
// Resource Tracker Component
// ============================================

interface ResourceDisplayProps {
  name: string
  current: number
  max: number
  color: string
  dieSize?: number
}

function ResourceDisplay({ name, current, max, color, dieSize }: ResourceDisplayProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">
        {name}
        {dieSize && <span className="text-xs ml-1">(d{dieSize})</span>}
      </span>
      <div className="flex items-center gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-3 h-3 rounded-full border-2 transition-all',
              i < current
                ? `${color} border-current`
                : 'bg-slate-800 border-slate-600'
            )}
          />
        ))}
        <span className={cn('text-xs ml-1 font-medium', current > 0 ? color.replace('bg-', 'text-') : 'text-slate-500')}>
          {current}/{max}
        </span>
      </div>
    </div>
  )
}

interface ClassResourcesProps {
  combatant: Combatant
  character: Character
}

function ClassResources({ combatant, character }: ClassResourcesProps) {
  const resources: ResourceDisplayProps[] = []

  // Check for Battle Master Superiority Dice
  if (hasCombatSuperiority(combatant)) {
    const maxDice = getMaxSuperiorityDice(combatant)
    const dieSize = getSuperiorityDieSize(combatant)
    resources.push({
      name: 'Superiority Dice',
      current: combatant.superiorityDiceRemaining,
      max: maxDice,
      color: 'bg-amber-500',
      dieSize,
    })
  }

  // Check for Indomitable (Fighter level 9+)
  if (getIndomitableFeature(combatant)) {
    const maxUses = getIndomitableMaxUses(combatant)
    const currentUses = combatant.classFeatureUses['indomitable'] ?? maxUses
    resources.push({
      name: 'Indomitable',
      current: currentUses,
      max: maxUses,
      color: 'bg-emerald-500',
    })
  }

  // Check for Second Wind (Fighter)
  if (character.class.id === 'fighter') {
    const maxUses = getSecondWindMaxUses(combatant)
    if (maxUses > 0) {
      const currentUses = combatant.classFeatureUses['second-wind'] ?? maxUses
      resources.push({
        name: 'Second Wind',
        current: currentUses,
        max: maxUses,
        color: 'bg-rose-500',
      })
    }
  }

  // Check for Action Surge (Fighter level 2+)
  if (character.class.id === 'fighter' && character.level >= 2) {
    const maxUses = 1 // Action Surge is 1/rest
    const currentUses = combatant.classFeatureUses['action-surge'] ?? maxUses
    resources.push({
      name: 'Action Surge',
      current: currentUses,
      max: maxUses,
      color: 'bg-violet-500',
    })
  }

  // Check for Heroic Inspiration (Musician feat / Human race)
  if (startsWithHeroicInspiration(combatant)) {
    resources.push({
      name: 'Heroic Inspiration',
      current: combatant.heroicInspiration ? 1 : 0,
      max: 1,
      color: 'bg-yellow-500',
    })
  }

  if (resources.length === 0) return null

  return (
    <div className="bg-slate-800/50 rounded-lg p-2">
      <div className="text-xs text-muted-foreground mb-1 font-medium">Class Resources</div>
      <div className="space-y-0.5">
        {resources.map((resource) => (
          <ResourceDisplay key={resource.name} {...resource} />
        ))}
      </div>
    </div>
  )
}

function ActionEconomyIndicator({ combatant }: { combatant: Combatant }) {
  return (
    <div className="flex gap-3 justify-center py-2 border-y border-slate-700">
      <div className="flex items-center gap-1.5">
        <div className={cn(
          'w-3 h-3 rounded-full border-2',
          combatant.hasActed ? 'bg-slate-600 border-slate-500' : 'bg-emerald-500 border-emerald-400'
        )} />
        <span className={cn('text-xs', combatant.hasActed ? 'text-slate-500' : 'text-emerald-400')}>
          Action
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={cn(
          'w-3 h-3 rounded-full border-2',
          combatant.hasBonusActed ? 'bg-slate-600 border-slate-500' : 'bg-amber-500 border-amber-400'
        )} />
        <span className={cn('text-xs', combatant.hasBonusActed ? 'text-slate-500' : 'text-amber-400')}>
          Bonus
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={cn(
          'w-3 h-3 rounded-full border-2',
          combatant.hasReacted ? 'bg-slate-600 border-slate-500' : 'bg-violet-500 border-violet-400'
        )} />
        <span className={cn('text-xs', combatant.hasReacted ? 'text-slate-500' : 'text-violet-400')}>
          Reaction
        </span>
      </div>
    </div>
  )
}

function getWeaponRange(weapon: Weapon): { normal: number; long?: number } {
  if (weapon.type === 'ranged' && weapon.range) {
    return { normal: weapon.range.normal, long: weapon.range.long }
  }
  const hasReach = weapon.properties.includes('reach')
  return { normal: hasReach ? 10 : 5 }
}

function parseSpellRange(range: string): number {
  const lowerRange = range.toLowerCase()
  if (lowerRange === 'self' || lowerRange.startsWith('self')) return 0
  if (lowerRange === 'touch') return 5
  const match = range.match(/(\d+)\s*(feet|ft|foot)?/i)
  if (match) return parseInt(match[1], 10)
  return 0
}

function TargetActionsPanel({ target, currentCombatant }: { target: Combatant; currentCombatant: Combatant }) {
  const { performAttack, castSpell, selectCombatant, grid } = useCombatStore()

  const isCharacter = currentCombatant.type === 'character'
  const character = isCharacter ? currentCombatant.data as Character : null
  const monster = !isCharacter ? currentCombatant.data as Monster : null

  const dx = Math.abs(target.position.x - currentCombatant.position.x)
  const dy = Math.abs(target.position.y - currentCombatant.position.y)
  const distance = Math.max(dx, dy) * 5

  // Check if we can attack (have attacks remaining)
  const maxAttacks = getMaxAttacksPerAction(currentCombatant)
  const attacksRemaining = maxAttacks - currentCombatant.attacksMadeThisTurn
  const canAttack = attacksRemaining > 0 && (!currentCombatant.hasActed || currentCombatant.attacksMadeThisTurn > 0)

  // Check line of sight
  const meleeWeapon = character?.equipment?.meleeWeapon
  const rangedWeapon = character?.equipment?.rangedWeapon
  const monsterAction = monster?.actions.find(a => a.attackBonus !== undefined)

  const losCheck = canAttackTarget(currentCombatant, target, grid, meleeWeapon || rangedWeapon, monsterAction)
  const hasLineOfSight = losCheck.reason !== 'no_line_of_sight'

  // Build action list matching the context menu
  const actions: { id: string; label: string; icon: LucideIcon; disabled: boolean; disabledReason?: string; onClick: () => void }[] = []

  if (isCharacter && character) {
    // Melee weapon
    if (meleeWeapon) {
      const meleeRange = getWeaponRange(meleeWeapon)
      const inMeleeRange = distance <= meleeRange.normal

      actions.push({
        id: 'attack-melee',
        label: `Attack with ${meleeWeapon.name}`,
        icon: Sword,
        disabled: !canAttack || !inMeleeRange || !hasLineOfSight,
        disabledReason: !hasLineOfSight ? 'no_los' : !inMeleeRange ? 'out_of_range' : undefined,
        onClick: () => {
          performAttack(currentCombatant.id, target.id, meleeWeapon, undefined, undefined)
          selectCombatant(undefined)
        }
      })
    }

    // Ranged weapon
    if (rangedWeapon) {
      const rangedRange = getWeaponRange(rangedWeapon)
      const inNormalRange = distance <= rangedRange.normal
      const inLongRange = rangedRange.long ? distance <= rangedRange.long : false
      const atDisadvantage = !inNormalRange && inLongRange
      const inRange = inNormalRange || inLongRange

      actions.push({
        id: 'attack-ranged',
        label: atDisadvantage
          ? `Attack with ${rangedWeapon.name} (disadvantage)`
          : `Attack with ${rangedWeapon.name}`,
        icon: Crosshair,
        disabled: !canAttack || !inRange || !hasLineOfSight,
        disabledReason: !hasLineOfSight ? 'no_los' : !inRange ? 'out_of_range' : undefined,
        onClick: () => {
          performAttack(currentCombatant.id, target.id, undefined, undefined, rangedWeapon)
          selectCombatant(undefined)
        }
      })
    }

    // Unarmed strike fallback (only if no weapons at all)
    if (!meleeWeapon && !rangedWeapon) {
      const inMeleeRange = distance <= 5

      actions.push({
        id: 'attack-unarmed',
        label: 'Unarmed Strike',
        icon: Sword,
        disabled: !canAttack || !inMeleeRange || !hasLineOfSight,
        disabledReason: !hasLineOfSight ? 'no_los' : !inMeleeRange ? 'out_of_range' : undefined,
        onClick: () => {
          performAttack(currentCombatant.id, target.id, undefined, undefined, undefined)
          selectCombatant(undefined)
        }
      })
    }

    // Offensive spells
    const offensiveSpells = (character.preparedSpells || character.knownSpells || [])
      .filter((spell: Spell) =>
        (spell.damage || spell.attackType || spell.savingThrow) &&
        !spell.areaOfEffect &&
        !spell.projectiles
      )
      .slice(0, 3)

    offensiveSpells.forEach((spell: Spell) => {
      const spellRange = parseSpellRange(spell.range)
      const inSpellRange = distance <= spellRange

      actions.push({
        id: `spell-${spell.id}`,
        label: `Cast ${spell.name}`,
        icon: Sparkles,
        disabled: !inSpellRange || !hasLineOfSight,
        disabledReason: !hasLineOfSight ? 'no_los' : !inSpellRange ? 'out_of_range' : undefined,
        onClick: () => {
          castSpell(currentCombatant.id, spell, target.id)
          selectCombatant(undefined)
        }
      })
    })
  } else if (monster && monsterAction) {
    // Monster attack
    const inRange = distance <= 5

    actions.push({
      id: 'attack-monster',
      label: `Attack with ${monsterAction.name}`,
      icon: Sword,
      disabled: !canAttack || !inRange || !hasLineOfSight,
      disabledReason: !hasLineOfSight ? 'no_los' : !inRange ? 'out_of_range' : undefined,
      onClick: () => {
        performAttack(currentCombatant.id, target.id, undefined, monsterAction, undefined)
        selectCombatant(undefined)
      }
    })
  }

  // Determine overall status message
  const allOutOfRange = actions.length > 0 && actions.every(a => a.disabledReason === 'out_of_range')
  const allNoLos = actions.length > 0 && actions.every(a => a.disabledReason === 'no_los')
  const noAttacksLeft = canAttack === false && hasLineOfSight

  return (
    <div className="pt-3 border-t border-slate-700">
      <div className="text-xs text-muted-foreground mb-2">Target Actions</div>
      <div className="flex flex-col gap-1.5">
        {actions.map(action => {
          const Icon = action.icon
          return (
            <Button
              key={action.id}
              variant="destructive"
              size="sm"
              className="w-full justify-start gap-2"
              disabled={action.disabled}
              onClick={action.onClick}
            >
              <Icon className="w-4 h-4" />
              <span>{action.label}</span>
              {!action.disabled && attacksRemaining > 1 && action.id.startsWith('attack') && (
                <span className="ml-auto text-xs opacity-75">({attacksRemaining} left)</span>
              )}
            </Button>
          )
        })}
        {allNoLos && (
          <p className="text-xs text-rose-400 italic">No line of sight (blocked by obstacle)</p>
        )}
        {allOutOfRange && !allNoLos && (
          <p className="text-xs text-muted-foreground italic">Target is out of range</p>
        )}
        {noAttacksLeft && !allOutOfRange && !allNoLos && (
          <p className="text-xs text-muted-foreground italic">No attacks remaining this turn</p>
        )}
      </div>
    </div>
  )
}

export function CombatantPanel() {
  const state = useCombatStore()
  const { selectedCombatantId, combatants, phase, preselectWeapon, preselectSpell } = state
  const currentCombatant = getCurrentCombatant(state)
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null)

  // Show current combatant if none selected, otherwise show selected
  const displayCombatant = selectedCombatantId
    ? combatants.find(c => c.id === selectedCombatantId)
    : currentCombatant

  if (!displayCombatant) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Combatant Info</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-4">
              {phase === 'setup' ? 'Select a combatant to view details' : 'No combatant selected'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isCharacter = displayCombatant.type === 'character'
  const character = isCharacter ? displayCombatant.data as Character : null
  const monster = !isCharacter ? displayCombatant.data as Monster : null

  const abilityScores = character?.abilityScores ?? monster?.abilityScores
  const ac = character?.ac ?? monster?.ac ?? 10
  const speed = character?.speed ?? monster?.speed.walk ?? 30
  const hpPercent = Math.round((displayCombatant.currentHp / displayCombatant.maxHp) * 100)

  const isCurrentTurn = currentCombatant?.id === displayCombatant.id

  // Check if this combatant can still attack (for weapon button interactivity)
  const maxAttacks = getMaxAttacksPerAction(displayCombatant)
  const attacksRemaining = maxAttacks - displayCombatant.attacksMadeThisTurn
  const canAttack = isCurrentTurn && phase === 'combat' && attacksRemaining > 0 && (!displayCombatant.hasActed || displayCombatant.attacksMadeThisTurn > 0)

  const tokenImage = getCombatantTokenImage(displayCombatant.type, displayCombatant.data)

  return (
    <div className="space-y-4">
      <Card className={cn(isCurrentTurn && phase === 'combat' && 'border-amber-500/50')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tokenImage ? (
              <img
                src={tokenImage}
                alt={displayCombatant.name}
                className={cn(
                  'w-10 h-10 rounded-full object-cover border-2',
                  isCharacter ? 'border-violet-500' : 'border-rose-500'
                )}
              />
            ) : (
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold',
                isCharacter ? 'bg-violet-600' : 'bg-rose-600'
              )}>
                {displayCombatant.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <CardTitle className="text-sm">{displayCombatant.name}</CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {isCharacter ? (
                  <>
                    Level {character!.level} {character!.race.name}
                    {getClassIcon(character!.class.id) && (
                      <img src={getClassIcon(character!.class.id)} alt="" className="w-4 h-4 object-contain" />
                    )}
                    {character!.class.name}
                  </>
                ) : (
                  `${monster!.size} ${monster!.type}`
                )}
              </p>
            </div>
          </div>
          {isCurrentTurn && phase === 'combat' && (
            <span className="text-xs bg-amber-500 text-slate-900 font-semibold px-2 py-1 rounded">
              CURRENT
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* HP Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Hit Points</span>
            <span className={cn(
              'font-medium',
              hpPercent > 50 ? 'text-emerald-400' : hpPercent > 25 ? 'text-amber-400' : 'text-rose-400'
            )}>
              {displayCombatant.currentHp} / {displayCombatant.maxHp}
            </span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all rounded-full',
                hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 25 ? 'bg-amber-500' : 'bg-rose-500'
              )}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          {displayCombatant.temporaryHp > 0 && (
            <div className="text-xs text-sky-400 mt-1">
              +{displayCombatant.temporaryHp} temporary HP
            </div>
          )}
        </div>

        {/* Class Resources (Superiority Dice, Indomitable, etc.) */}
        {character && <ClassResources combatant={displayCombatant} character={character} />}

        {/* Core Stats */}
        <div className="grid grid-cols-3 gap-2 py-2">
          <StatBlock label="AC" value={ac} icon={Shield} />
          <StatBlock label="Speed" value={`${speed} ft`} icon={Footprints} />
          <StatBlock label="Initiative" value={displayCombatant.initiative || '—'} icon={Zap} />
        </div>

        {/* Action Economy (only during combat) */}
        {phase === 'combat' && <ActionEconomyIndicator combatant={displayCombatant} />}

        {/* Ability Scores */}
        {abilityScores && (
          <div className="grid grid-cols-6 gap-1">
            <AbilityScoreDisplay name="Strength" score={abilityScores.strength} />
            <AbilityScoreDisplay name="Dexterity" score={abilityScores.dexterity} />
            <AbilityScoreDisplay name="Constitution" score={abilityScores.constitution} />
            <AbilityScoreDisplay name="Intelligence" score={abilityScores.intelligence} />
            <AbilityScoreDisplay name="Wisdom" score={abilityScores.wisdom} />
            <AbilityScoreDisplay name="Charisma" score={abilityScores.charisma} />
          </div>
        )}

        {/* Conditions */}
        {displayCombatant.conditions.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Conditions</div>
            <div className="flex flex-wrap gap-1">
              {displayCombatant.conditions.map((c, i) => (
                <ConditionBadge key={i} condition={c.condition} />
              ))}
            </div>
          </div>
        )}

        {/* Character-specific: Equipment & Spells */}
        {character && (
          <>
            {(character.equipment?.meleeWeapon || character.equipment?.rangedWeapon) && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Weapons</div>
                <div className="space-y-1">
                  {character.equipment.meleeWeapon && (
                    <button
                      disabled={!canAttack}
                      className={cn(
                        "w-full text-left text-sm rounded px-1.5 py-0.5 -mx-1.5 transition-colors",
                        canAttack
                          ? "hover:bg-slate-700/60 cursor-pointer"
                          : "cursor-default opacity-80"
                      )}
                      onClick={() => canAttack && preselectWeapon('melee')}
                    >
                      <span className="font-medium">{character.equipment.meleeWeapon.name}</span>
                      <span className="text-xs text-sky-400 ml-1">
                        {character.equipment.meleeWeapon.range
                          ? `${character.equipment.meleeWeapon.range.normal}/${character.equipment.meleeWeapon.range.long} ft,`
                          : 'reach 5 ft,'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        {character.equipment.meleeWeapon.damage} {character.equipment.meleeWeapon.damageType}
                      </span>
                    </button>
                  )}
                  {character.equipment.rangedWeapon && (
                    <button
                      disabled={!canAttack}
                      className={cn(
                        "w-full text-left text-sm rounded px-1.5 py-0.5 -mx-1.5 transition-colors",
                        canAttack
                          ? "hover:bg-slate-700/60 cursor-pointer"
                          : "cursor-default opacity-80"
                      )}
                      onClick={() => canAttack && preselectWeapon('ranged')}
                    >
                      <span className="font-medium">{character.equipment.rangedWeapon.name}</span>
                      {character.equipment.rangedWeapon.range && (
                        <span className="text-xs text-sky-400 ml-1">
                          {character.equipment.rangedWeapon.range.normal}/{character.equipment.rangedWeapon.range.long} ft,
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-1">
                        {character.equipment.rangedWeapon.damage} {character.equipment.rangedWeapon.damageType}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {character.knownSpells && character.knownSpells.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  Spells ({character.knownSpells.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {character.knownSpells.map((spell, idx) => {
                    const canCast = isCurrentTurn && phase === 'combat' && !displayCombatant.hasActed
                    return (
                      <button
                        key={`${spell.id}-${idx}`}
                        className={cn(
                          "text-xs bg-violet-900/50 text-violet-200 px-2 py-0.5 rounded transition-colors",
                          canCast
                            ? "hover:bg-violet-700/60 hover:text-violet-100 cursor-pointer"
                            : "cursor-default opacity-80"
                        )}
                        onClick={() => canCast && preselectSpell(spell.id)}
                      >
                        {spell.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Class Features: Fighting Styles, Maneuvers, etc. */}
            <ClassFeaturesSection
              character={character}
              selectedFeature={selectedFeature}
              onSelectFeature={setSelectedFeature}
            />
          </>
        )}

        {/* Monster-specific: Actions */}
        {monster && monster.actions.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Actions</div>
            <div className="space-y-1">
              {monster.actions.slice(0, 3).map((action, i) => (
                <div key={i} className="text-xs">
                  <span className="font-medium">{action.name}</span>
                  {action.attackBonus !== undefined && (
                    <span className="text-muted-foreground ml-1">
                      +{action.attackBonus} to hit,
                    </span>
                  )}
                  {action.reach && (
                    <span className="text-sky-400 ml-1">
                      reach {action.reach} ft,
                    </span>
                  )}
                  {action.range && (
                    <span className="text-sky-400 ml-1">
                      {action.range.normal}/{action.range.long} ft,
                    </span>
                  )}
                  {action.damage && (
                    <span className="text-rose-400 ml-1">
                      {action.damage} {action.damageType}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Death Saves */}
        {displayCombatant.currentHp <= 0 && displayCombatant.type === 'character' && (
          <div className="pt-2 border-t border-slate-700">
            <div className="text-xs text-muted-foreground mb-2">Death Saves</div>
            <div className="flex justify-around">
              <div className="text-center">
                <div className="text-xs text-emerald-400 mb-1">Successes</div>
                <div className="flex gap-1 justify-center">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={cn(
                        'w-4 h-4 rounded-full border-2',
                        i < displayCombatant.deathSaves.successes
                          ? 'bg-emerald-500 border-emerald-400'
                          : 'border-slate-600'
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-rose-400 mb-1">Failures</div>
                <div className="flex gap-1 justify-center">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={cn(
                        'w-4 h-4 rounded-full border-2',
                        i < displayCombatant.deathSaves.failures
                          ? 'bg-rose-500 border-rose-400'
                          : 'border-slate-600'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
            {displayCombatant.isStable && (
              <p className="text-xs text-emerald-400 text-center mt-2">Stabilized</p>
            )}
          </div>
        )}

        {/* Target Actions - show when viewing an enemy during combat on player's turn */}
        {phase === 'combat' &&
          currentCombatant &&
          currentCombatant.type === 'character' &&
          displayCombatant.id !== currentCombatant.id &&
          displayCombatant.type !== currentCombatant.type &&
          displayCombatant.currentHp > 0 && (
            <TargetActionsPanel target={displayCombatant} currentCombatant={currentCombatant} />
          )}
      </CardContent>
    </Card>

      {/* Feature Detail Card - shown when a feature is selected */}
      {selectedFeature && isCharacter && (
        <FeatureDetailCard
          feature={selectedFeature}
          combatant={displayCombatant}
          onClose={() => setSelectedFeature(null)}
        />
      )}
    </div>
  )
}
