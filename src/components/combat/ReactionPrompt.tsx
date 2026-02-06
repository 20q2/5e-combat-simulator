import { useCombatStore } from '@/stores/combatStore'
import { cn } from '@/lib/utils'
import { Shield, X, Zap } from 'lucide-react'
import type { Spell } from '@/types'

// Get icon for reaction spell
function getReactionIcon(spell: Spell) {
  if (spell.id === 'shield') return Shield
  return Zap
}

export function ReactionPrompt() {
  const {
    pendingReaction,
    combatants,
    useReactionSpell,
    skipReaction,
  } = useCombatStore()

  if (!pendingReaction) return null

  const reactor = combatants.find(c => c.id === pendingReaction.reactingCombatantId)
  const attacker = combatants.find(c => c.id === pendingReaction.triggeringCombatantId)

  if (!reactor || !attacker) return null

  const { context, availableReactions } = pendingReaction

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-xl shadow-2xl p-4 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200 pointer-events-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-300">Reaction Available!</h3>
            <p className="text-sm text-slate-400">{reactor.name} can react</p>
          </div>
        </div>

        {/* Attack info */}
        <div className="bg-slate-800 rounded-lg p-3 mb-4">
          <div className="text-sm text-slate-300 mb-2">
            <span className="text-rose-400 font-semibold">{attacker.name}</span>
            {pendingReaction.type === 'opportunity_attack' ? (
              <> hit <span className="text-violet-400 font-semibold">{reactor.name}</span> with an <span className="text-amber-400">opportunity attack</span>!</>
            ) : (
              <> hit <span className="text-violet-400 font-semibold">{reactor.name}</span>!</>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            <span>Attack Roll: <span className="text-white font-mono">{context.attackRoll}</span></span>
            <span>Your AC: <span className="text-white font-mono">{context.targetAC}</span></span>
            {context.damage && (
              <span>Damage: <span className="text-rose-400 font-mono">{context.damage}</span></span>
            )}
          </div>
        </div>

        {/* Available reactions */}
        <div className="space-y-2 mb-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Available Reactions</div>
          {availableReactions.map((spell) => {
            const Icon = getReactionIcon(spell)
            // Calculate Shield effect
            const acBonus = spell.reaction?.effect.value || 0
            const newAC = (context.targetAC || 0) + acBonus
            const attackRoll = context.attackRoll || 0
            const wouldMiss = attackRoll < newAC

            return (
              <button
                key={spell.id}
                onClick={() => useReactionSpell(spell.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg transition-all',
                  'bg-gradient-to-r from-violet-900/50 to-violet-800/50',
                  'border border-violet-600 hover:border-violet-400',
                  'hover:from-violet-800/50 hover:to-violet-700/50'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-violet-500/30 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-violet-300" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold text-violet-200">{spell.name}</div>
                  {spell.reaction?.effect.type === 'ac_bonus' && (
                    <div className="text-xs">
                      <span className="text-slate-400">AC {context.targetAC} → </span>
                      <span className="text-violet-300 font-semibold">{newAC}</span>
                      {wouldMiss ? (
                        <span className="ml-2 text-emerald-400 font-semibold">• Attack would MISS!</span>
                      ) : (
                        <span className="ml-2 text-rose-400">• Attack still hits</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-xs text-amber-400 font-medium">
                  Lv {spell.level}
                </div>
              </button>
            )
          })}
        </div>

        {/* Skip button */}
        <button
          onClick={skipReaction}
          className={cn(
            'w-full flex items-center justify-center gap-2 p-3 rounded-lg transition-all',
            'bg-slate-800 border border-slate-600',
            'hover:bg-slate-700 hover:border-slate-500',
            'text-slate-400 hover:text-slate-300'
          )}
        >
          <X className="w-4 h-4" />
          <span>Don't React (Take {context.damage} damage)</span>
        </button>
      </div>
    </div>
  )
}
