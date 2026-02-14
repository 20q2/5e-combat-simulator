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
  isMultiTargetSelected?: boolean
  suppressTooltip?: boolean
  visualScale?: number // 0.6-1.0 for tiny/small creatures visual scaling
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent) => void
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
  isMultiTargetSelected,
  suppressTooltip,
  visualScale,
  onClick,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onHoverChange,
}: TokenProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<'right' | 'left'>('right')
  const [isPlayingDeathAnimation, setIsPlayingDeathAnimation] = useState(false)
  const [isPlayingHitAnimation, setIsPlayingHitAnimation] = useState(false)
  const tokenRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<number | null>(null)
  const hitAnimationTimerRef = useRef<number | null>(null)
  const prevHpRef = useRef(combatant.currentHp)

  const hpPercent = (combatant.currentHp / combatant.maxHp) * 100
  const isDead = combatant.currentHp <= 0
  const isConcentrating = !!combatant.concentratingOn
  const isProne = !isDead && combatant.conditions.some(c => c.condition === 'prone')

  // Detect when combatant dies or takes damage and trigger animations
  useEffect(() => {
    if (combatant.currentHp <= 0 && prevHpRef.current > 0) {
      // Combatant just died - trigger death animation
      setIsPlayingDeathAnimation(true)
    } else if (combatant.currentHp < prevHpRef.current && combatant.currentHp > 0) {
      // Took damage but still alive - trigger hit animation
      setIsPlayingHitAnimation(true)
      if (hitAnimationTimerRef.current) {
        clearTimeout(hitAnimationTimerRef.current)
      }
      hitAnimationTimerRef.current = window.setTimeout(() => {
        setIsPlayingHitAnimation(false)
        hitAnimationTimerRef.current = null
      }, 300)
    }
    prevHpRef.current = combatant.currentHp
    return () => {
      if (hitAnimationTimerRef.current) {
        clearTimeout(hitAnimationTimerRef.current)
      }
    }
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

  // Gradient border for team indicator
  const teamGradient = combatant.type === 'character'
    ? 'linear-gradient(135deg, #22c55e, #10b981, #059669)' // Green gradient for allies
    : 'linear-gradient(135deg, #ef4444, #f97316, #eab308)' // Red-orange-yellow for enemies

  // HP bar color
  const hpBarColor = hpPercent > 50
    ? 'bg-emerald-500'
    : hpPercent > 25
      ? 'bg-amber-500'
      : 'bg-rose-500'

  // Temp HP bar calculations
  const tempHp = combatant.temporaryHp || 0
  const effectiveMax = Math.max(combatant.maxHp, combatant.currentHp + tempHp)
  const hpBarWidth = (combatant.currentHp / effectiveMax) * 100
  const tempHpBarWidth = tempHp > 0 ? (tempHp / effectiveMax) * 100 : 0

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
        isCurrentTurn && 'z-10',
        showTooltip && 'z-[100]'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Gradient border container */}
      <div
        draggable={isDraggable}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault()
          onContextMenu?.(e)
        }}
        className={cn(
          'w-full h-full rounded-full p-[2px] transition-all cursor-pointer shadow-md shadow-black/40',
          isCurrentTurn && 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900 scale-110 shadow-lg shadow-black/50',
          isHoveredTarget && 'ring-4 ring-rose-500 ring-offset-2 ring-offset-slate-900 scale-[1.15] animate-pulse',
          isMultiTargetSelected && !isHoveredTarget && 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-900 scale-[1.1]',
          // Concentration glow effect
          isConcentrating && !isSelected && !isHoveredTarget && 'ring-2 ring-purple-400/70 ring-offset-1 ring-offset-slate-900',
          // Hit animation: shrink and bounce back
          isPlayingHitAnimation && !isDead && 'animate-hit',
          // Death state: play animation when just died, otherwise show dead state (prone/rotated 90deg)
          isPlayingDeathAnimation && 'animate-death',
          isDead && !isPlayingDeathAnimation && 'opacity-50 grayscale scale-[0.85] rotate-90',
          // Prone: rotate 90deg (smooth transition via transition-all)
          isProne && 'rotate-90',
          isDraggable && 'cursor-grab active:cursor-grabbing hover:scale-110'
        )}
        style={{
          background: teamGradient,
          // Apply visual scaling for tiny/small creatures (combine with prone rotation if needed)
          ...(visualScale && visualScale < 1
            ? { transform: `scale(${visualScale})${isProne ? ' rotate(90deg)' : ''}` }
            : {}),
        }}
      >
        {/* Inner token content */}
        <div
          className={cn(
            'w-full h-full rounded-full flex items-center justify-center relative overflow-hidden',
            tokenImage ? 'bg-slate-900' : bgColor
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
        </div>

        {/* HP bar - positioned outside the clipped circle to be fully visible */}
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3/4 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-600 shadow-md flex">
          <div
            className={cn('h-full transition-all shrink-0', hpBarColor)}
            style={{ width: `${hpBarWidth}%` }}
          />
          {tempHp > 0 && (
            <div
              className="h-full bg-sky-400 transition-all shrink-0"
              style={{ width: `${tempHpBarWidth}%` }}
            />
          )}
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
      {showTooltip && !suppressTooltip && (
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
