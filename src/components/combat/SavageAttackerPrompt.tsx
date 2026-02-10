import { useCombatStore } from '@/stores/combatStore'
import { cn } from '@/lib/utils'
import { Swords, X, Sparkles, GripHorizontal } from 'lucide-react'
import { useDraggable } from './useDraggable'

export function SavageAttackerPrompt() {
  const {
    pendingSavageAttacker,
    combatants,
    confirmSavageAttacker,
    skipSavageAttacker,
  } = useCombatStore()

  // Drag functionality
  const { isDragging, containerProps, dragHandleAttr } = useDraggable({
    resetKey: `${pendingSavageAttacker?.attackerId}-${pendingSavageAttacker?.targetId}`,
  })

  if (!pendingSavageAttacker) return null

  const { attackerId, targetId, roll1, roll2, isCritical } = pendingSavageAttacker
  const attacker = combatants.find(c => c.id === attackerId)
  const target = combatants.find(c => c.id === targetId)

  if (!attacker || !target) return null

  const better = roll1.total >= roll2.total ? 'roll1' : 'roll2'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className={cn(
          "bg-slate-900/85 backdrop-blur-md border-2 border-rose-500 rounded-xl shadow-2xl p-4 max-w-md w-full mx-4 pointer-events-auto",
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
          <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
            <Swords className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-rose-300">Savage Attacker!</h3>
            <p className="text-sm text-slate-400">Choose which damage roll to use</p>
          </div>
        </div>

        {/* Context */}
        <div className="bg-slate-800 rounded-lg p-3 mb-4">
          <div className="text-sm text-slate-300">
            <span className="text-rose-400 font-semibold">{attacker.name}</span> hit{' '}
            <span className="text-amber-400 font-semibold">{target.name}</span>
            {isCritical && <span className="text-yellow-400 ml-2">(Critical Hit!)</span>}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Roll weapon damage twice and choose either result. (Once per turn)
          </div>
        </div>

        {/* Damage roll options */}
        <div className="space-y-2 mb-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            Choose Damage Roll
          </div>

          {/* Roll 1 */}
          <button
            onClick={() => confirmSavageAttacker(true)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg transition-all',
              better === 'roll1'
                ? 'bg-gradient-to-r from-rose-900/70 to-rose-800/70 border-2 border-rose-400'
                : 'bg-gradient-to-r from-slate-800/70 to-slate-700/70 border border-slate-600',
              'hover:from-rose-800/70 hover:to-rose-700/70 hover:border-rose-400'
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              better === 'roll1' ? 'bg-rose-500/30' : 'bg-slate-600/30'
            )}>
              {better === 'roll1' && <Sparkles className="w-5 h-5 text-yellow-400" />}
              {better !== 'roll1' && <span className="text-slate-400 font-mono">1</span>}
            </div>
            <div className="flex-1 text-left">
              <div className={cn(
                'text-lg font-bold',
                better === 'roll1' ? 'text-rose-200' : 'text-slate-300'
              )}>
                {roll1.total} damage
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {roll1.breakdown}
              </div>
            </div>
            {better === 'roll1' && (
              <div className="text-xs font-medium text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded">
                Better!
              </div>
            )}
          </button>

          {/* Roll 2 */}
          <button
            onClick={() => confirmSavageAttacker(false)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg transition-all',
              better === 'roll2'
                ? 'bg-gradient-to-r from-rose-900/70 to-rose-800/70 border-2 border-rose-400'
                : 'bg-gradient-to-r from-slate-800/70 to-slate-700/70 border border-slate-600',
              'hover:from-rose-800/70 hover:to-rose-700/70 hover:border-rose-400'
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              better === 'roll2' ? 'bg-rose-500/30' : 'bg-slate-600/30'
            )}>
              {better === 'roll2' && <Sparkles className="w-5 h-5 text-yellow-400" />}
              {better !== 'roll2' && <span className="text-slate-400 font-mono">2</span>}
            </div>
            <div className="flex-1 text-left">
              <div className={cn(
                'text-lg font-bold',
                better === 'roll2' ? 'text-rose-200' : 'text-slate-300'
              )}>
                {roll2.total} damage
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {roll2.breakdown}
              </div>
            </div>
            {better === 'roll2' && (
              <div className="text-xs font-medium text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded">
                Better!
              </div>
            )}
          </button>
        </div>

        {/* Skip button (uses roll 1 by default) */}
        <button
          onClick={skipSavageAttacker}
          className={cn(
            'w-full flex items-center justify-center gap-2 p-3 rounded-lg transition-all',
            'bg-slate-800 border border-slate-600',
            'hover:bg-slate-700 hover:border-slate-500',
            'text-slate-400 hover:text-slate-300'
          )}
        >
          <X className="w-4 h-4" />
          <span>Skip (use first roll: {roll1.total} damage)</span>
        </button>
      </div>
    </div>
  )
}
