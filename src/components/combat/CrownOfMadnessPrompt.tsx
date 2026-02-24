import { useCombatStore } from '@/stores/combatStore'
import { cn } from '@/lib/utils'
import { Crown, GripHorizontal, Sword } from 'lucide-react'
import { useDraggable } from './useDraggable'

export function CrownOfMadnessPrompt() {
  const {
    pendingCrownOfMadness,
    combatants,
    resolveCrownOfMadness,
    skipCrownOfMadness,
  } = useCombatStore()

  const { isDragging, containerProps, dragHandleAttr } = useDraggable({
    resetKey: pendingCrownOfMadness?.charmedId,
  })

  if (!pendingCrownOfMadness) return null

  const { charmedId, casterId, validTargets } = pendingCrownOfMadness
  const charmed = combatants.find(c => c.id === charmedId)
  const caster = combatants.find(c => c.id === casterId)
  const targets = validTargets
    .map(id => combatants.find(c => c.id === id))
    .filter(Boolean)

  if (!charmed || !caster) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className={cn(
          "bg-slate-900/85 backdrop-blur-md border-2 border-pink-500 rounded-xl shadow-2xl p-4 max-w-sm w-full mx-4 pointer-events-auto",
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
          <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
            <Crown className="w-6 h-6 text-pink-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-pink-300">Crown of Madness</h3>
            <p className="text-sm text-slate-400">Choose a melee attack target</p>
          </div>
        </div>

        {/* Context */}
        <div className="bg-slate-800 rounded-lg p-3 mb-4">
          <div className="text-sm text-slate-300">
            <span className="text-pink-400 font-semibold">{caster.name}</span> compels{' '}
            <span className="text-amber-400 font-semibold">{charmed.name}</span> to attack
          </div>
          <div className="text-xs text-slate-400 mt-1">
            The charmed creature must use its action to make a melee attack.
          </div>
        </div>

        {/* Target options */}
        <div className="flex flex-col gap-2 mb-3">
          {targets.map(target => {
            if (!target) return null
            const hpPercent = Math.round((target.currentHp / target.maxHp) * 100)
            return (
              <button
                key={target.id}
                onClick={() => resolveCrownOfMadness(target.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-all',
                  'bg-gradient-to-b from-slate-800/70 to-slate-700/70 border border-slate-600',
                  'hover:bg-pink-500/20 hover:border-pink-500',
                  'hover:scale-[1.02]'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <Sword className="w-6 h-6 text-red-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold text-slate-200">{target.name}</div>
                  <div className="text-xs text-slate-400">
                    {target.currentHp}/{target.maxHp} HP ({hpPercent}%)
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Skip button */}
        <button
          onClick={skipCrownOfMadness}
          className={cn(
            'w-full flex items-center justify-center gap-2 p-2 rounded-lg transition-all text-xs',
            'bg-slate-800 border border-slate-600',
            'hover:bg-slate-700 hover:border-slate-500',
            'text-slate-400 hover:text-slate-300'
          )}
        >
          <span>Don't designate a target</span>
        </button>
      </div>
    </div>
  )
}
