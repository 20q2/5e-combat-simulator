import { useCombatStore } from '@/stores/combatStore'
import { cn } from '@/lib/utils'
import { Star, X, RotateCcw, GripHorizontal, Swords, Shield } from 'lucide-react'
import { useDraggable } from './useDraggable'

export function HeroicInspirationPrompt() {
  const {
    pendingHeroicInspiration,
    combatants,
    resolveHeroicInspiration,
    skipHeroicInspiration,
  } = useCombatStore()

  // Drag functionality
  const { isDragging, containerProps, dragHandleAttr } = useDraggable({
    resetKey: pendingHeroicInspiration?.combatantId,
  })

  if (!pendingHeroicInspiration) return null

  const combatant = combatants.find(c => c.id === pendingHeroicInspiration.combatantId)
  if (!combatant) return null

  const { type, originalRoll, originalTotal, modifier, targetValue, context } = pendingHeroicInspiration
  const isAttack = type === 'attack'

  // Calculate the chance of success with a reroll
  const neededRoll = targetValue - modifier
  const successChance = Math.min(100, Math.max(5, (21 - neededRoll) * 5))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className={cn(
          "bg-slate-900/85 backdrop-blur-md border-2 border-yellow-500 rounded-xl shadow-2xl p-4 max-w-md w-full mx-4 pointer-events-auto",
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
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Star className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-yellow-300">Heroic Inspiration!</h3>
            <p className="text-sm text-slate-400">
              {isAttack ? `${combatant.name} missed an attack` : `${combatant.name} failed a saving throw`}
            </p>
          </div>
        </div>

        {/* Roll info */}
        <div className="bg-slate-800 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
            {isAttack ? (
              <Swords className="w-4 h-4 text-rose-400" />
            ) : (
              <Shield className="w-4 h-4 text-violet-400" />
            )}
            <span className="text-rose-400 font-semibold">{combatant.name}</span>
            {isAttack ? (
              <>
                {' '}missed{' '}
                <span className="text-amber-400 font-semibold">{context.targetName}</span>
              </>
            ) : (
              <>
                {' '}failed a{' '}
                <span className="text-violet-400 font-semibold">
                  {context.ability?.charAt(0).toUpperCase()}{context.ability?.slice(1)}
                </span>
                {' '}save
                {context.sourceName && (
                  <> against <span className="text-violet-400 font-semibold">{context.sourceName}</span></>
                )}
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            <span>
              Roll: <span className="text-white font-mono">{originalRoll}</span>
              {' + '}<span className="text-white font-mono">{modifier >= 0 ? `+${modifier}` : modifier}</span>
              {' = '}<span className="text-rose-400 font-mono">{originalTotal}</span>
            </span>
            <span>
              {isAttack ? 'AC' : 'DC'}: <span className="text-white font-mono">{targetValue}</span>
            </span>
            {!isAttack && context.damage && (
              <span>Damage: <span className="text-rose-400 font-mono">{context.damage}</span></span>
            )}
          </div>
        </div>

        {/* Heroic Inspiration option */}
        <div className="space-y-2 mb-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Use Heroic Inspiration?</div>
          <button
            onClick={() => resolveHeroicInspiration(true)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg transition-all',
              'bg-gradient-to-r from-yellow-900/50 to-yellow-800/50',
              'border border-yellow-600 hover:border-yellow-400',
              'hover:from-yellow-800/50 hover:to-yellow-700/50'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-yellow-500/30 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-yellow-300" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-yellow-200">Reroll with Heroic Inspiration</div>
              <div className="text-xs">
                <span className="text-slate-400">You </span>
                <span className="text-yellow-300 font-semibold">must</span>
                <span className="text-slate-400"> take the new result</span>
                <span className="ml-2 text-emerald-400">~{successChance}% to succeed</span>
              </div>
            </div>
            <div className="text-xs text-yellow-400 font-medium">
              1 use
            </div>
          </button>
        </div>

        {/* Skip button */}
        <button
          onClick={() => skipHeroicInspiration()}
          className={cn(
            'w-full flex items-center justify-center gap-2 p-3 rounded-lg transition-all',
            'bg-slate-800 border border-slate-600',
            'hover:bg-slate-700 hover:border-slate-500',
            'text-slate-400 hover:text-slate-300'
          )}
        >
          <X className="w-4 h-4" />
          <span>
            Accept {isAttack ? 'Miss' : 'Failure'}
            {!isAttack && context.damage && ` (Take ${context.halfDamageOnSave ? Math.floor(context.damage / 2) : context.damage} damage)`}
          </span>
        </button>
      </div>
    </div>
  )
}
