import { cn } from '@/lib/utils'
import { Dices, Clover, Star } from 'lucide-react'
import type { Combatant } from '@/types'
import {
  hasCombatSuperiority,
  getMaxSuperiorityDice,
  getSuperiorityDieSize,
} from '@/engine/maneuvers'
import {
  getLuckPoints,
  getLuckPointsRemaining,
  startsWithHeroicInspiration,
} from '@/engine/originFeats'

interface ResourceTrackerProps {
  combatant: Combatant
  compact?: boolean
}

/**
 * Compact resource tracker that matches SpellSlotDisplay style
 * Shows superiority dice and other class resources
 */
export function ResourceTracker({ combatant, compact = false }: ResourceTrackerProps) {
  if (combatant.type !== 'character') return null

  // Check for superiority dice (Battle Master)
  const hasSupDice = hasCombatSuperiority(combatant)

  // Check for Luck Points (Lucky feat)
  const maxLuckPoints = getLuckPoints(combatant)
  const currentLuckPoints = getLuckPointsRemaining(combatant, combatant.featUses)
  const hasLucky = maxLuckPoints > 0
  const hasLuckAvailable = currentLuckPoints > 0

  // Check for Heroic Inspiration (Musician feat / Human race)
  const hasHeroicInspirationSource = startsWithHeroicInspiration(combatant)
  const hasInspirationAvailable = combatant.heroicInspiration

  // If no resources to show, return null
  if (!hasSupDice && !hasLucky && !hasHeroicInspirationSource) return null

  // Build superiority dice indicators
  const supDiceIndicators: React.ReactNode[] = []
  if (hasSupDice) {
    const maxDice = getMaxSuperiorityDice(combatant)
    const currentDice = combatant.superiorityDiceRemaining

    for (let i = 0; i < maxDice; i++) {
      const isAvailable = i < currentDice
      supDiceIndicators.push(
        <div
          key={i}
          className={cn(
            'rounded-sm transition-colors',
            compact ? 'w-2 h-2' : 'w-2.5 h-2.5',
            isAvailable
              ? 'bg-amber-500 border border-amber-400'
              : 'bg-slate-700 border border-slate-600'
          )}
          title={isAvailable ? 'Available' : 'Used'}
        />
      )
    }
  }

  // Build luck point indicators
  const luckIndicators: React.ReactNode[] = []
  if (hasLucky) {
    for (let i = 0; i < maxLuckPoints; i++) {
      const isAvailable = i < currentLuckPoints
      luckIndicators.push(
        <div
          key={i}
          className={cn(
            'rounded-full transition-colors',
            compact ? 'w-2 h-2' : 'w-2.5 h-2.5',
            isAvailable
              ? 'bg-emerald-500 border border-emerald-400'
              : 'bg-slate-700 border border-slate-600'
          )}
          title={isAvailable ? 'Available' : 'Used'}
        />
      )
    }
  }

  return (
    <div className={cn(
      'flex flex-col flex-wrap gap-1.5 bg-slate-900/80 rounded-lg border border-slate-700/50',
      compact ? 'px-2 py-1' : 'px-3 py-1.5'
    )}>
      {/* Superiority Dice */}
      {hasSupDice && (() => {
        const maxDice = getMaxSuperiorityDice(combatant)
        const dieSize = getSuperiorityDieSize(combatant)
        const currentDice = combatant.superiorityDiceRemaining
        const hasDiceAvailable = currentDice > 0
        return (
          <div
            className={cn(
              'flex items-center gap-1.5',
              !hasDiceAvailable && 'opacity-50'
            )}
            title={`Superiority Dice: ${currentDice}/${maxDice} (d${dieSize})`}
          >
            <div className="flex items-center gap-1">
              <Dices className={cn(
                'transition-colors',
                compact ? 'w-3 h-3' : 'w-3.5 h-3.5',
                hasDiceAvailable ? 'text-amber-400' : 'text-slate-500'
              )} />
              <span className={cn(
                'font-bold uppercase transition-colors',
                compact ? 'text-[9px]' : 'text-[10px]',
                hasDiceAvailable ? 'text-amber-300' : 'text-slate-500'
              )}>
                d{dieSize}
              </span>
            </div>
            <div className={cn('flex gap-0.5', compact && 'gap-px')}>
              {supDiceIndicators}
            </div>
          </div>
        )
      })()}

      {/* Luck Points */}
      {hasLucky && (
        <div
          className={cn(
            'flex items-center gap-1.5',
            !hasLuckAvailable && 'opacity-50'
          )}
          title={`Luck Points: ${currentLuckPoints}/${maxLuckPoints}`}
        >
          <div className="flex items-center gap-1">
            <Clover className={cn(
              'transition-colors',
              compact ? 'w-3 h-3' : 'w-3.5 h-3.5',
              hasLuckAvailable ? 'text-emerald-400' : 'text-slate-500'
            )} />
            <span className={cn(
              'font-bold uppercase transition-colors',
              compact ? 'text-[9px]' : 'text-[10px]',
              hasLuckAvailable ? 'text-emerald-300' : 'text-slate-500'
            )}>
              Luck
            </span>
          </div>
          <div className={cn('flex gap-0.5', compact && 'gap-px')}>
            {luckIndicators}
          </div>
        </div>
      )}

      {/* Heroic Inspiration */}
      {hasHeroicInspirationSource && (
        <div
          className={cn(
            'flex items-center gap-1.5',
            !hasInspirationAvailable && 'opacity-50'
          )}
          title={`Heroic Inspiration: ${hasInspirationAvailable ? 'Available' : 'Used'}`}
        >
          <div className="flex items-center gap-1">
            <Star className={cn(
              'transition-colors',
              compact ? 'w-3 h-3' : 'w-3.5 h-3.5',
              hasInspirationAvailable ? 'text-yellow-400' : 'text-slate-500'
            )} />
            <span className={cn(
              'font-bold uppercase transition-colors',
              compact ? 'text-[9px]' : 'text-[10px]',
              hasInspirationAvailable ? 'text-yellow-300' : 'text-slate-500'
            )}>
              Insp
            </span>
          </div>
          <div
            className={cn(
              'rounded-full transition-colors',
              compact ? 'w-2 h-2' : 'w-2.5 h-2.5',
              hasInspirationAvailable
                ? 'bg-yellow-500 border border-yellow-400'
                : 'bg-slate-700 border border-slate-600'
            )}
          />
        </div>
      )}
    </div>
  )
}
