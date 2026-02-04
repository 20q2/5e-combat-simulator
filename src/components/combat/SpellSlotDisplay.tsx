import { cn } from '@/lib/utils'
import type { SpellSlots } from '@/types'

// Roman numeral conversion for spell levels 1-9
const romanNumerals: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
}

interface SpellSlotDisplayProps {
  spellSlots: SpellSlots
  onSlotClick?: (level: number) => void
  compact?: boolean
}

/**
 * BG3-style spell slot display with roman numerals and square indicators
 * Shows spell levels with filled/empty squares for available/used slots
 */
export function SpellSlotDisplay({ spellSlots, onSlotClick, compact = false }: SpellSlotDisplayProps) {
  // Get levels that have slots (max > 0)
  const activeLevels = (Object.entries(spellSlots) as [string, { max: number; current: number }][])
    .filter(([, slot]) => slot.max > 0)
    .map(([level, slot]) => ({
      level: parseInt(level),
      max: slot.max,
      current: slot.current,
    }))

  if (activeLevels.length === 0) return null

  return (
    <div className={cn(
      'flex items-center justify-center gap-1 bg-slate-900/80 rounded-lg border border-slate-700/50 px-3 py-1.5',
      compact && 'gap-0.5 px-2 py-1'
    )}>
      {activeLevels.map(({ level, max, current }) => (
        <SpellSlotLevel
          key={level}
          level={level}
          max={max}
          current={current}
          onClick={onSlotClick ? () => onSlotClick(level) : undefined}
          compact={compact}
        />
      ))}
    </div>
  )
}

interface SpellSlotLevelProps {
  level: number
  max: number
  current: number
  onClick?: () => void
  compact?: boolean
}

function SpellSlotLevel({ level, max, current, onClick, compact = false }: SpellSlotLevelProps) {
  const slots = []
  for (let i = 0; i < max; i++) {
    const isAvailable = i < current
    slots.push(
      <div
        key={i}
        className={cn(
          'rounded-sm transition-colors',
          compact ? 'w-2 h-2' : 'w-2.5 h-2.5',
          isAvailable
            ? 'bg-violet-500 border border-violet-400'
            : 'bg-slate-700 border border-slate-600'
        )}
        title={isAvailable ? 'Available' : 'Used'}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-0.5 px-2 py-0.5 rounded transition-colors',
        onClick && 'cursor-pointer hover:bg-slate-800/50',
        compact && 'px-1.5'
      )}
      onClick={onClick}
      title={`Level ${level} Spell Slots: ${current}/${max}`}
    >
      {/* Roman numeral label */}
      <span className={cn(
        'font-bold text-slate-400',
        compact ? 'text-[9px]' : 'text-[10px]'
      )}>
        {romanNumerals[level]}
      </span>
      {/* Slot squares */}
      <div className={cn('flex gap-0.5', compact && 'gap-px')}>
        {slots}
      </div>
    </div>
  )
}
