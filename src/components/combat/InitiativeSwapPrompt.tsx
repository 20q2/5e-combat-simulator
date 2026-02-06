import { useCombatStore } from '@/stores/combatStore'
import { cn } from '@/lib/utils'
import { ArrowLeftRight, X, Shield } from 'lucide-react'

export function InitiativeSwapPrompt() {
  const {
    pendingInitiativeSwap,
    combatants,
    confirmInitiativeSwap,
    skipInitiativeSwap,
  } = useCombatStore()

  if (!pendingInitiativeSwap) return null

  const swapper = combatants.find(c => c.id === pendingInitiativeSwap.swapperId)
  const eligibleAllies = combatants.filter(c =>
    pendingInitiativeSwap.eligibleAllies.includes(c.id)
  )

  if (!swapper || eligibleAllies.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-slate-900 border-2 border-emerald-500 rounded-xl shadow-2xl p-4 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200 pointer-events-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-300">Alert: Initiative Swap!</h3>
            <p className="text-sm text-slate-400">{swapper.name} can swap initiative with an ally</p>
          </div>
        </div>

        {/* Context */}
        <div className="bg-slate-800 rounded-lg p-3 mb-4">
          <div className="text-sm text-slate-300 mb-2">
            <span className="text-emerald-400 font-semibold">{swapper.name}</span> rolled initiative: <span className="text-white font-semibold">{swapper.initiative}</span>
          </div>
          <div className="text-xs text-slate-400">
            The Alert feat allows you to swap your initiative with a willing ally.
          </div>
        </div>

        {/* Available allies to swap with */}
        <div className="space-y-2 mb-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            Swap Initiative With
          </div>
          {eligibleAllies.map((ally) => (
            <button
              key={ally.id}
              onClick={() => confirmInitiativeSwap(ally.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg transition-all',
                'bg-gradient-to-r from-emerald-900/50 to-emerald-800/50',
                'border border-emerald-600 hover:border-emerald-400',
                'hover:from-emerald-800/50 hover:to-emerald-700/50'
              )}
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-emerald-200">{ally.name}</div>
                <div className="text-xs text-slate-400">
                  Current initiative: {ally.initiative}
                </div>
              </div>
              <div className="text-xs font-medium text-emerald-400">
                {ally.initiative > swapper.initiative ? 'Go Earlier' : 'Go Later'}
              </div>
            </button>
          ))}
        </div>

        {/* Skip button */}
        <button
          onClick={skipInitiativeSwap}
          className={cn(
            'w-full flex items-center justify-center gap-2 p-3 rounded-lg transition-all',
            'bg-slate-800 border border-slate-600',
            'hover:bg-slate-700 hover:border-slate-500',
            'text-slate-400 hover:text-slate-300'
          )}
        >
          <X className="w-4 h-4" />
          <span>Keep current initiative ({swapper.initiative})</span>
        </button>
      </div>
    </div>
  )
}
