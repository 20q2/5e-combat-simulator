import { useCombatStore } from '@/stores/combatStore'
import { cn } from '@/lib/utils'
import { Shield, X, RotateCcw, GripHorizontal } from 'lucide-react'
import { getIndomitableUses, getIndomitableBonus } from '@/engine/classAbilities'
import { useDraggable } from './useDraggable'

export function IndomitablePrompt() {
  const {
    pendingIndomitable,
    combatants,
    resolveIndomitable,
    skipIndomitable,
  } = useCombatStore()

  // Drag functionality
  const { isDragging, containerProps, dragHandleAttr } = useDraggable({
    resetKey: pendingIndomitable?.combatantId,
  })

  if (!pendingIndomitable) return null

  const combatant = combatants.find(c => c.id === pendingIndomitable.combatantId)
  if (!combatant) return null

  const usesRemaining = getIndomitableUses(combatant, combatant.classFeatureUses)
  const bonus = getIndomitableBonus(combatant)
  const { ability, dc, originalRoll, originalNatural, modifier, context } = pendingIndomitable

  // Calculate what the reroll would need to succeed
  const neededRoll = dc - modifier - bonus
  const successChance = Math.min(100, Math.max(5, (21 - neededRoll) * 5))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className={cn(
          "bg-slate-900 border-2 border-amber-500 rounded-xl shadow-2xl p-4 max-w-md w-full mx-4 pointer-events-auto",
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
            <Shield className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-300">Indomitable!</h3>
            <p className="text-sm text-slate-400">{combatant.name} failed a saving throw</p>
          </div>
        </div>

        {/* Save info */}
        <div className="bg-slate-800 rounded-lg p-3 mb-4">
          <div className="text-sm text-slate-300 mb-2">
            <span className="text-rose-400 font-semibold">{combatant.name}</span>
            {' '}failed a{' '}
            <span className="text-amber-400 font-semibold">{ability.charAt(0).toUpperCase() + ability.slice(1)}</span>
            {' '}saving throw
            {context.sourceName && (
              <> against <span className="text-violet-400 font-semibold">{context.sourceName}</span></>
            )}!
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            <span>Roll: <span className="text-white font-mono">{originalNatural}</span> + <span className="text-white font-mono">{modifier}</span> = <span className="text-rose-400 font-mono">{originalRoll}</span></span>
            <span>DC: <span className="text-white font-mono">{dc}</span></span>
            {context.damage && (
              <span>Damage: <span className="text-rose-400 font-mono">{context.damage}</span></span>
            )}
          </div>
        </div>

        {/* Indomitable option */}
        <div className="space-y-2 mb-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Use Indomitable?</div>
          <button
            onClick={() => resolveIndomitable(true)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg transition-all',
              'bg-gradient-to-r from-emerald-900/50 to-emerald-800/50',
              'border border-emerald-600 hover:border-emerald-400',
              'hover:from-emerald-800/50 hover:to-emerald-700/50'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-emerald-200">Reroll with Indomitable</div>
              <div className="text-xs">
                <span className="text-slate-400">New roll gets </span>
                <span className="text-emerald-300 font-semibold">+{bonus}</span>
                <span className="text-slate-400"> bonus (Fighter level)</span>
                <span className="ml-2 text-amber-400">~{successChance}% to succeed</span>
              </div>
            </div>
            <div className="text-xs text-amber-400 font-medium">
              {usesRemaining} use{usesRemaining !== 1 ? 's' : ''} left
            </div>
          </button>
        </div>

        {/* Skip button */}
        <button
          onClick={() => skipIndomitable()}
          className={cn(
            'w-full flex items-center justify-center gap-2 p-3 rounded-lg transition-all',
            'bg-slate-800 border border-slate-600',
            'hover:bg-slate-700 hover:border-slate-500',
            'text-slate-400 hover:text-slate-300'
          )}
        >
          <X className="w-4 h-4" />
          <span>
            Accept Failure
            {context.damage && ` (Take ${context.halfDamageOnSave ? Math.floor(context.damage / 2) : context.damage} damage)`}
          </span>
        </button>
      </div>
    </div>
  )
}
