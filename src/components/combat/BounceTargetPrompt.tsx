import { useCombatStore } from '@/stores/combatStore'
import { cn } from '@/lib/utils'
import { Sparkles, X, Target, GripHorizontal } from 'lucide-react'
import { useDraggable } from './useDraggable'
import { getDistanceBetweenPositions } from '@/lib/distance'

export function BounceTargetPrompt() {
  const {
    pendingBounceTarget,
    combatants,
    resolveBounceTarget,
    skipBounceTarget,
  } = useCombatStore()

  const { isDragging, containerProps, dragHandleAttr } = useDraggable({
    resetKey: `bounce-${pendingBounceTarget?.previousTargetId}`,
  })

  if (!pendingBounceTarget) return null

  const { casterId, spell, damageType, previousTargetId, alreadyTargetedIds } = pendingBounceTarget
  const caster = combatants.find(c => c.id === casterId)
  const previousTarget = combatants.find(c => c.id === previousTargetId)

  if (!caster || !previousTarget) return null

  const bounceRange = spell.bounce?.range ?? 30
  const isPlayerCaster = caster.type === 'character'

  // Find valid bounce targets
  const validTargets = combatants.filter(c => {
    if (c.currentHp <= 0) return false
    if (alreadyTargetedIds.includes(c.id)) return false
    if (c.id === casterId) return false
    if (isPlayerCaster && c.type === 'character') return false
    if (!isPlayerCaster && c.type === 'monster') return false
    const dist = getDistanceBetweenPositions(previousTarget.position, c.position)
    return dist <= bounceRange
  })

  if (validTargets.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className={cn(
          "bg-slate-900/85 backdrop-blur-md border-2 border-amber-500 rounded-xl shadow-2xl p-4 max-w-md w-full mx-4 pointer-events-auto",
          !isDragging && "animate-in fade-in zoom-in duration-200"
        )}
        {...containerProps}
      >
        {/* Drag Handle */}
        <div
          {...dragHandleAttr}
          className="flex justify-center mb-2 cursor-grab active:cursor-grabbing"
          title="Drag to move"
        >
          <GripHorizontal className="w-6 h-4 text-slate-500 hover:text-slate-400" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4" {...dragHandleAttr}>
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-300">{spell.name} Bounce!</h3>
            <p className="text-sm text-slate-400">The orb can leap to a new target</p>
          </div>
        </div>

        {/* Context */}
        <div className="bg-slate-800 rounded-lg p-3 mb-4">
          <div className="text-sm text-slate-300">
            Two or more dice rolled the same number! The <span className="text-amber-400 font-semibold">{damageType}</span> orb
            can bounce from <span className="text-red-400 font-semibold">{previousTarget.name}</span> to
            a new target within {bounceRange} ft.
          </div>
        </div>

        {/* Available bounce targets */}
        <div className="space-y-2 mb-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            Choose Bounce Target
          </div>
          {validTargets.map((target) => {
            const dist = getDistanceBetweenPositions(previousTarget.position, target.position)
            const hpPercent = Math.round((target.currentHp / target.maxHp) * 100)
            return (
              <button
                key={target.id}
                onClick={() => resolveBounceTarget(target.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg transition-all',
                  'bg-gradient-to-r from-amber-900/50 to-amber-800/50',
                  'border border-amber-600 hover:border-amber-400',
                  'hover:from-amber-800/50 hover:to-amber-700/50'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/30 flex items-center justify-center">
                  <Target className="w-5 h-5 text-amber-300" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold text-amber-200">{target.name}</div>
                  <div className="text-xs text-slate-400">
                    {dist} ft away &middot; {target.currentHp}/{target.maxHp} HP ({hpPercent}%)
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Skip button */}
        <button
          onClick={skipBounceTarget}
          className={cn(
            'w-full flex items-center justify-center gap-2 p-3 rounded-lg transition-all',
            'bg-slate-800 border border-slate-600',
            'hover:bg-slate-700 hover:border-slate-500',
            'text-slate-400 hover:text-slate-300'
          )}
        >
          <X className="w-4 h-4" />
          <span>Don't bounce</span>
        </button>
      </div>
    </div>
  )
}
