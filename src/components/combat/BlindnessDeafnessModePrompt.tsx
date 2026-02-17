import { useCombatStore } from '@/stores/combatStore'
import { cn } from '@/lib/utils'
import { Sparkles, GripHorizontal, EyeOff, EarOff } from 'lucide-react'
import { useDraggable } from './useDraggable'

const BLINDNESS_DEAFNESS_MODES = [
  {
    id: 'blinded' as const,
    icon: EyeOff,
    label: 'Blinded',
    description: "Can't see; attacks against it have advantage, its attacks have disadvantage",
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500',
  },
  {
    id: 'deafened' as const,
    icon: EarOff,
    label: 'Deafened',
    description: "Can't hear; automatically fails hearing-based ability checks",
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500',
  },
]

export function BlindnessDeafnessModePrompt() {
  const {
    pendingBlindnessDeafnessMode,
    combatants,
    resolveBlindnessDeafnessMode,
  } = useCombatStore()

  const { isDragging, containerProps, dragHandleAttr } = useDraggable({
    resetKey: pendingBlindnessDeafnessMode?.casterId,
  })

  if (!pendingBlindnessDeafnessMode) return null

  const { casterId, targetId } = pendingBlindnessDeafnessMode
  const caster = combatants.find(c => c.id === casterId)
  const target = combatants.find(c => c.id === targetId)

  if (!caster || !target) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className={cn(
          "bg-slate-900/85 backdrop-blur-md border-2 border-slate-500 rounded-xl shadow-2xl p-4 max-w-sm w-full mx-4 pointer-events-auto",
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
          <div className="w-10 h-10 rounded-full bg-slate-500/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-300">Blindness/Deafness</h3>
            <p className="text-sm text-slate-400">Choose the affliction</p>
          </div>
        </div>

        {/* Context */}
        <div className="bg-slate-800 rounded-lg p-3 mb-4">
          <div className="text-sm text-slate-300">
            <span className="text-slate-400 font-semibold">{caster.name}</span> curses{' '}
            <span className="text-red-400 font-semibold">{target.name}</span>
          </div>
        </div>

        {/* Mode options */}
        <div className="flex flex-col gap-2">
          {BLINDNESS_DEAFNESS_MODES.map(mode => {
            const Icon = mode.icon
            return (
              <button
                key={mode.id}
                onClick={() => resolveBlindnessDeafnessMode(mode.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-all',
                  'bg-gradient-to-b from-slate-800/70 to-slate-700/70 border border-slate-600',
                  `hover:${mode.bgColor} hover:${mode.borderColor}`,
                  'hover:scale-[1.02]'
                )}
              >
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', mode.bgColor)}>
                  <Icon className={cn('w-6 h-6', mode.color)} />
                </div>
                <div className="text-left">
                  <div className={cn('text-sm font-semibold', mode.color)}>{mode.label}</div>
                  <div className="text-xs text-slate-400">{mode.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
