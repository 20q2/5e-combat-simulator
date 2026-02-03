import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { getCombatantTokenImage } from '@/lib/tokenImages'
import { getConditionIcon } from '@/lib/conditionIcons'
import { TokenTooltip } from './TokenTooltip'
import type { Combatant, Character, Monster } from '@/types'

interface TokenProps {
  combatant: Combatant
  isSelected: boolean
  isCurrentTurn: boolean
  isDraggable: boolean
  isHoveredTarget?: boolean
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: (e: React.DragEvent) => void
  onHoverChange?: (isHovered: boolean) => void
}

export function Token({
  combatant,
  isSelected,
  isCurrentTurn,
  isDraggable,
  isHoveredTarget,
  onClick,
  onDragStart,
  onDragEnd,
  onHoverChange,
}: TokenProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<'right' | 'left'>('right')
  const [isPlayingDeathAnimation, setIsPlayingDeathAnimation] = useState(false)
  const tokenRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<number | null>(null)
  const prevHpRef = useRef(combatant.currentHp)

  const hpPercent = (combatant.currentHp / combatant.maxHp) * 100
  const isDead = combatant.currentHp <= 0
  const isConcentrating = !!combatant.concentratingOn

  // Detect when combatant dies and trigger animation
  useEffect(() => {
    if (combatant.currentHp <= 0 && prevHpRef.current > 0) {
      // Combatant just died - trigger animation
      setIsPlayingDeathAnimation(true)
      // Animation lasts 600ms, then it just stays in the final state
    }
    prevHpRef.current = combatant.currentHp
  }, [combatant.currentHp])

  // Get token image if available
  const tokenImage = getCombatantTokenImage(
    combatant.type,
    combatant.data as Character | Monster
  )

  // Color based on type - brighter for dark mode (used as fallback)
  const bgColor = combatant.type === 'character'
    ? 'bg-violet-600 shadow-lg shadow-violet-500/30'
    : 'bg-rose-600 shadow-lg shadow-rose-500/30'

  // Border color for image tokens
  const borderColor = combatant.type === 'character'
    ? 'border-violet-500'
    : 'border-rose-500'

  // HP bar color
  const hpBarColor = hpPercent > 50
    ? 'bg-emerald-500'
    : hpPercent > 25
      ? 'bg-amber-500'
      : 'bg-rose-500'

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) {
      e.preventDefault()
      return
    }
    // Hide tooltip when dragging starts
    setShowTooltip(false)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    e.dataTransfer.setData('text/plain', combatant.id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(e)
  }

  const handleMouseEnter = () => {
    onHoverChange?.(true)
    // Small delay before showing tooltip to avoid flicker
    hoverTimeoutRef.current = window.setTimeout(() => {
      // Determine tooltip position based on token's position on screen
      if (tokenRef.current) {
        const rect = tokenRef.current.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        // If token is in the right half of the screen, show tooltip on left
        setTooltipPosition(rect.left > viewportWidth / 2 ? 'left' : 'right')
      }
      setShowTooltip(true)
    }, 200)
  }

  const handleMouseLeave = () => {
    onHoverChange?.(false)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setShowTooltip(false)
  }

  return (
    <div
      ref={tokenRef}
      className={cn(
        'relative w-full h-full',
        showTooltip && 'z-[100]'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        draggable={isDraggable}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onClick={onClick}
        className={cn(
          'w-full h-full rounded-full flex items-center justify-center transition-all cursor-pointer border-2 relative overflow-hidden',
          tokenImage ? borderColor : bgColor,
          tokenImage ? 'border-2' : 'border-white/20',
          isCurrentTurn && 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900',
          isSelected && 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-900',
          isHoveredTarget && 'ring-4 ring-rose-500 ring-offset-2 ring-offset-slate-900 scale-110 animate-pulse',
          // Concentration glow effect
          isConcentrating && !isSelected && !isHoveredTarget && 'ring-2 ring-purple-400/70 ring-offset-1 ring-offset-slate-900',
          // Death state: play animation when just died, otherwise just show dead state
          isPlayingDeathAnimation && 'animate-death',
          isDead && !isPlayingDeathAnimation && 'opacity-50 grayscale scale-[0.85]',
          isDraggable && 'cursor-grab active:cursor-grabbing hover:scale-110'
        )}
      >
        {/* Token image or label */}
        {tokenImage ? (
          <img
            src={tokenImage}
            alt={combatant.name}
            className="w-full h-full object-cover rounded-full"
            draggable={false}
          />
        ) : (
          <span className="text-white text-xs font-bold truncate px-1 select-none">
            {combatant.name.substring(0, 3).toUpperCase()}
          </span>
        )}

        {/* HP bar */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-600">
          <div
            className={cn('h-full transition-all', hpBarColor)}
            style={{ width: `${hpPercent}%` }}
          />
        </div>

        {/* Current turn indicator */}
        {isCurrentTurn && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-900 shadow-lg shadow-amber-400/50" />
        )}

        {/* Concentration indicator */}
        {isConcentrating && !isDead && (
          <div className="absolute -top-1 -left-1 w-4 h-4 bg-purple-500 rounded-full border-2 border-slate-900 shadow-lg shadow-purple-500/50 flex items-center justify-center animate-pulse">
            <span className="text-[8px] text-white">✦</span>
          </div>
        )}
      </div>

      {/* Condition badges */}
      {combatant.conditions.length > 0 && !isDead && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
          {combatant.conditions.slice(0, 3).map((activeCondition, index) => {
            const iconInfo = getConditionIcon(activeCondition.condition)
            if (!iconInfo) return null
            const IconComponent = iconInfo.icon
            return (
              <div
                key={`${activeCondition.condition}-${index}`}
                className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center border border-slate-900 shadow-md',
                  iconInfo.bgColor
                )}
                title={iconInfo.label}
              >
                <IconComponent className={cn('w-2.5 h-2.5', iconInfo.color)} />
              </div>
            )
          })}
          {combatant.conditions.length > 3 && (
            <div className="w-4 h-4 rounded-full flex items-center justify-center bg-slate-700 border border-slate-900 shadow-md">
              <span className="text-[8px] text-slate-300 font-bold">
                +{combatant.conditions.length - 3}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={cn(
            'absolute z-50 pointer-events-none',
            tooltipPosition === 'right' ? 'left-full ml-2' : 'right-full mr-2',
            'top-1/2 -translate-y-1/2'
          )}
        >
          <TokenTooltip combatant={combatant} isCurrentTurn={isCurrentTurn} />
        </div>
      )}
    </div>
  )
}
