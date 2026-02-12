import { useCombatStore } from '@/stores/combatStore'
import { cn } from '@/lib/utils'
import { Sparkles, GripHorizontal, Droplets, Snowflake, Flame, Zap, Skull, Volume2 } from 'lucide-react'
import { useDraggable } from './useDraggable'
import type { DamageType } from '@/types'

const DAMAGE_TYPE_CONFIG: Record<string, { icon: typeof Flame; label: string; color: string; bgColor: string; borderColor: string }> = {
  acid: { icon: Droplets, label: 'Acid', color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500' },
  cold: { icon: Snowflake, label: 'Cold', color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500' },
  fire: { icon: Flame, label: 'Fire', color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500' },
  lightning: { icon: Zap, label: 'Lightning', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500' },
  poison: { icon: Skull, label: 'Poison', color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500' },
  thunder: { icon: Volume2, label: 'Thunder', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', borderColor: 'border-indigo-500' },
}

export function DamageTypePrompt() {
  const {
    pendingDamageTypeChoice,
    combatants,
    resolveDamageTypeChoice,
    skipDamageTypeChoice,
  } = useCombatStore()

  const { isDragging, containerProps, dragHandleAttr } = useDraggable({
    resetKey: `${pendingDamageTypeChoice?.casterId}-${pendingDamageTypeChoice?.targetId}`,
  })

  if (!pendingDamageTypeChoice) return null

  const { casterId, targetId, options, spell } = pendingDamageTypeChoice
  const caster = combatants.find(c => c.id === casterId)
  const target = combatants.find(c => c.id === targetId)

  if (!caster || !target) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className={cn(
          "bg-slate-900/85 backdrop-blur-md border-2 border-violet-500 rounded-xl shadow-2xl p-4 max-w-md w-full mx-4 pointer-events-auto",
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
          <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-violet-300">{spell.name}</h3>
            <p className="text-sm text-slate-400">Choose damage type</p>
          </div>
        </div>

        {/* Context */}
        <div className="bg-slate-800 rounded-lg p-3 mb-4">
          <div className="text-sm text-slate-300">
            <span className="text-violet-400 font-semibold">{caster.name}</span> targets{' '}
            <span className="text-amber-400 font-semibold">{target.name}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Choose the type of energy for the orb.
          </div>
        </div>

        {/* Damage type options - 2x3 grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {options.map(type => {
            const config = DAMAGE_TYPE_CONFIG[type]
            if (!config) return null
            const Icon = config.icon
            return (
              <button
                key={type}
                onClick={() => resolveDamageTypeChoice(type as DamageType)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all',
                  'bg-gradient-to-b from-slate-800/70 to-slate-700/70 border border-slate-600',
                  `hover:${config.bgColor} hover:${config.borderColor}`,
                  'hover:scale-105'
                )}
              >
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', config.bgColor)}>
                  <Icon className={cn('w-5 h-5', config.color)} />
                </div>
                <span className={cn('text-sm font-medium', config.color)}>{config.label}</span>
              </button>
            )
          })}
        </div>

        {/* Skip button */}
        <button
          onClick={skipDamageTypeChoice}
          className={cn(
            'w-full flex items-center justify-center gap-2 p-2 rounded-lg transition-all text-xs',
            'bg-slate-800 border border-slate-600',
            'hover:bg-slate-700 hover:border-slate-500',
            'text-slate-400 hover:text-slate-300'
          )}
        >
          <span>Quick cast (Acid)</span>
        </button>
      </div>
    </div>
  )
}
