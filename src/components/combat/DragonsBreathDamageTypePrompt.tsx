import { useCombatStore } from '@/stores/combatStore'
import { cn } from '@/lib/utils'
import { Sparkles, GripHorizontal, Droplets, Snowflake, Flame, Zap, Skull } from 'lucide-react'
import { useDraggable } from './useDraggable'
import type { DamageType } from '@/types'

const DRAGONS_BREATH_DAMAGE_TYPES: {
  id: DamageType
  icon: typeof Flame
  label: string
  color: string
  bgColor: string
  borderColor: string
}[] = [
  {
    id: 'acid',
    icon: Droplets,
    label: 'Acid',
    color: 'text-lime-400',
    bgColor: 'bg-lime-500/20',
    borderColor: 'border-lime-500',
  },
  {
    id: 'cold',
    icon: Snowflake,
    label: 'Cold',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500',
  },
  {
    id: 'fire',
    icon: Flame,
    label: 'Fire',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500',
  },
  {
    id: 'lightning',
    icon: Zap,
    label: 'Lightning',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500',
  },
  {
    id: 'poison',
    icon: Skull,
    label: 'Poison',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500',
  },
]

export function DragonsBreathDamageTypePrompt() {
  const {
    pendingDragonsBreathDamageType,
    combatants,
    resolveDragonsBreathDamageType,
  } = useCombatStore()

  const { isDragging, containerProps, dragHandleAttr } = useDraggable({
    resetKey: pendingDragonsBreathDamageType?.casterId,
  })

  if (!pendingDragonsBreathDamageType) return null

  const { casterId, targetId } = pendingDragonsBreathDamageType
  const caster = combatants.find(c => c.id === casterId)
  const target = combatants.find(c => c.id === targetId)

  if (!caster || !target) return null

  const isSelf = casterId === targetId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className={cn(
          "bg-slate-900/85 backdrop-blur-md border-2 border-orange-500 rounded-xl shadow-2xl p-4 max-w-sm w-full mx-4 pointer-events-auto",
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
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-orange-300">Dragon's Breath</h3>
            <p className="text-sm text-slate-400">Choose the damage type</p>
          </div>
        </div>

        {/* Context */}
        <div className="bg-slate-800 rounded-lg p-3 mb-4">
          <div className="text-sm text-slate-300">
            <span className="text-orange-400 font-semibold">{caster.name}</span>{' '}
            {isSelf ? 'imbues themselves' : <>imbues <span className="text-emerald-400 font-semibold">{target.name}</span></>}
          </div>
        </div>

        {/* Damage type options */}
        <div className="flex flex-col gap-2">
          {DRAGONS_BREATH_DAMAGE_TYPES.map(dtype => {
            const Icon = dtype.icon
            return (
              <button
                key={dtype.id}
                onClick={() => resolveDragonsBreathDamageType(dtype.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-all',
                  'bg-gradient-to-b from-slate-800/70 to-slate-700/70 border border-slate-600',
                  `hover:${dtype.bgColor} hover:${dtype.borderColor}`,
                  'hover:scale-[1.02]'
                )}
              >
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', dtype.bgColor)}>
                  <Icon className={cn('w-6 h-6', dtype.color)} />
                </div>
                <div className="text-left">
                  <div className={cn('text-sm font-semibold', dtype.color)}>{dtype.label}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
