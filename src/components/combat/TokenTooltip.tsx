import { cn, formatCR } from '@/lib/utils'
import { getConditionIcon } from '@/lib/conditionIcons'
import { getCombatantSpeed } from '@/stores/combatStore'
import type { Combatant, Character, Monster } from '@/types'
import {
  Heart,
  Shield,
  Zap,
  Wind,
  Footprints,
  Brain,
  Skull,
  AlertTriangle,
  Circle,
  Triangle,
  Square,
} from 'lucide-react'

interface TokenTooltipProps {
  combatant: Combatant
  isCurrentTurn: boolean
}

// Helper to format condition name
function formatCondition(condition: string): string {
  return condition.charAt(0).toUpperCase() + condition.slice(1)
}

export function TokenTooltip({ combatant, isCurrentTurn }: TokenTooltipProps) {
  const data = combatant.data
  const isCharacter = combatant.type === 'character'
  const character = isCharacter ? (data as Character) : null
  const monster = !isCharacter ? (data as Monster) : null

  // Get AC
  const ac = isCharacter ? character!.ac : monster!.ac

  // Get speed (includes Longstrider bonus etc.)
  const speed = getCombatantSpeed(combatant)

  // Calculate movement remaining
  const movementRemaining = speed - combatant.movementUsed

  // HP percentage for color coding
  const hpPercent = (combatant.currentHp / combatant.maxHp) * 100

  // Death save display (only when at 0 HP and is character)
  const showDeathSaves = combatant.currentHp === 0 && isCharacter && !combatant.isStable

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 min-w-[200px] max-w-[280px] text-sm animate-tooltip-enter">
      {/* Header - Name and Type */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-700">
        <span className="font-bold text-white truncate">{combatant.name}</span>
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded',
          isCharacter ? 'bg-violet-600/50 text-violet-200' : 'bg-rose-600/50 text-rose-200'
        )}>
          {isCharacter ? `Lvl ${character!.level}` : `CR ${formatCR(monster!.challengeRating)}`}
        </span>
      </div>

      {/* Core Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {/* HP */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-slate-400 text-xs mb-0.5">
            <Heart className="w-3 h-3" />
            <span>HP</span>
          </div>
          <span className={cn(
            'font-semibold',
            hpPercent > 50 ? 'text-emerald-400' :
            hpPercent > 25 ? 'text-amber-400' : 'text-rose-400'
          )}>
            {combatant.currentHp}/{combatant.maxHp}
          </span>
          {combatant.temporaryHp > 0 && (
            <span className="text-xs text-sky-400">+{combatant.temporaryHp} temp</span>
          )}
        </div>

        {/* AC */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-slate-400 text-xs mb-0.5">
            <Shield className="w-3 h-3" />
            <span>AC</span>
          </div>
          <span className="font-semibold text-slate-200">{ac}</span>
        </div>

        {/* Initiative */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-slate-400 text-xs mb-0.5">
            <Zap className="w-3 h-3" />
            <span>Init</span>
          </div>
          <span className="font-semibold text-slate-200">{combatant.initiative}</span>
        </div>
      </div>

      {/* Movement & Reaction */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-900/50 rounded mb-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Footprints className="w-3.5 h-3.5" />
          <span className="text-xs">Movement</span>
        </div>
        <span className={cn(
          'text-xs font-medium',
          movementRemaining > 0 ? 'text-emerald-400' : 'text-slate-500'
        )}>
          {movementRemaining} / {speed} ft
        </span>
      </div>
      {/* Reaction row - only for monsters (player characters show it in the action economy bar) */}
      {combatant.type === 'monster' && (
        <div className="flex items-center justify-between px-2 py-1.5 bg-slate-900/50 rounded mb-2">
          <div className="flex items-center gap-1.5 text-slate-400">
            <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 12 12">
              <rect x="1" y="1" width="10" height="10" rx="1"
                className={combatant.hasReacted ? 'fill-slate-600 stroke-slate-500' : 'fill-violet-500 stroke-violet-400'}
                strokeWidth="1.5"
              />
            </svg>
            <span className="text-xs">Reaction</span>
          </div>
          <span className={cn(
            'text-xs font-medium',
            combatant.hasReacted ? 'text-slate-500' : 'text-violet-400'
          )}>
            {combatant.hasReacted ? 'Used' : 'Available'}
          </span>
        </div>
      )}

      {/* Action Economy - Only show during combat when it's their turn */}
      {isCurrentTurn && (
        <div className="flex items-center justify-center gap-3 px-2 py-1.5 bg-amber-900/30 border border-amber-700/50 rounded mb-2">
          <div className="flex gap-3 text-xs">
            <span className={cn(
              'flex items-center gap-1',
              combatant.hasActed ? 'text-slate-500' : 'text-emerald-400'
            )}>
              <Circle className={cn(
                'w-3 h-3',
                combatant.hasActed ? 'fill-slate-500 text-slate-600' : 'fill-emerald-500 text-emerald-400'
              )} />
              <span className={combatant.hasActed ? 'line-through' : ''}>Action</span>
            </span>
            <span className={cn(
              'flex items-center gap-1',
              combatant.hasBonusActed ? 'text-slate-500' : 'text-amber-400'
            )}>
              <Triangle className={cn(
                'w-3 h-3',
                combatant.hasBonusActed ? 'fill-slate-500 text-slate-600' : 'fill-amber-500 text-amber-400'
              )} />
              <span className={combatant.hasBonusActed ? 'line-through' : ''}>Bonus</span>
            </span>
            <span className={cn(
              'flex items-center gap-1',
              combatant.hasReacted ? 'text-slate-500' : 'text-violet-400'
            )}>
              <Square className={cn(
                'w-3 h-3',
                combatant.hasReacted ? 'fill-slate-500 text-slate-600' : 'fill-violet-500 text-violet-400'
              )} />
              <span className={combatant.hasReacted ? 'line-through' : ''}>React</span>
            </span>
          </div>
        </div>
      )}

      {/* Concentration */}
      {combatant.concentratingOn && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-purple-900/30 border border-purple-700/50 rounded mb-2">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs text-purple-300">
            Concentrating: <span className="font-medium">{combatant.concentratingOn.name}</span>
          </span>
        </div>
      )}

      {/* Conditions */}
      {combatant.conditions.length > 0 && (
        <div className="px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded mb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-300 font-medium">Conditions</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {combatant.conditions.map((c, i) => {
              const iconInfo = getConditionIcon(c.condition)
              const IconComponent = iconInfo?.icon
              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded',
                    iconInfo?.bgColor || 'bg-slate-800',
                  )}
                >
                  {IconComponent && (
                    <IconComponent className={cn('w-3 h-3', iconInfo?.color || 'text-slate-300')} />
                  )}
                  <span className={iconInfo?.color || 'text-slate-200'}>
                    {formatCondition(c.condition)}
                  </span>
                  {c.duration && (
                    <span className="text-slate-400 ml-0.5">({c.duration}r)</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Death Saves */}
      {showDeathSaves && (
        <div className="px-2 py-1.5 bg-slate-900 border border-slate-600 rounded">
          <div className="flex items-center gap-1.5 mb-1">
            <Skull className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-300 font-medium">Death Saves</span>
          </div>
          <div className="flex justify-between text-xs">
            <div className="flex items-center gap-1">
              <span className="text-emerald-400">Saves:</span>
              <div className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className={cn(
                      'w-3 h-3 rounded-full border',
                      i < combatant.deathSaves.successes
                        ? 'bg-emerald-500 border-emerald-400'
                        : 'border-slate-600'
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-rose-400">Fails:</span>
              <div className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className={cn(
                      'w-3 h-3 rounded-full border',
                      i < combatant.deathSaves.failures
                        ? 'bg-rose-500 border-rose-400'
                        : 'border-slate-600'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stable indicator */}
      {combatant.currentHp === 0 && combatant.isStable && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-900 border border-slate-600 rounded">
          <Wind className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-300">Stable (unconscious)</span>
        </div>
      )}
    </div>
  )
}
