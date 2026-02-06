import { useCombatStore } from '@/stores/combatStore'
import { cn } from '@/lib/utils'
import { Swords, X, Target, ArrowBigDown, Skull, Shield, CircleSlash, GripHorizontal } from 'lucide-react'
import { getManeuverById } from '@/data/maneuvers'
import { getSuperiorityDieSize, getManeuverSaveDC } from '@/engine/maneuvers'
import { useDraggable } from './useDraggable'
import type { Character } from '@/types'

// Get icon for maneuver based on effect
function getManeuverIcon(maneuverId: string) {
  switch (maneuverId) {
    case 'trip-attack':
      return ArrowBigDown
    case 'menacing-attack':
      return Skull
    case 'pushing-attack':
      return Target
    case 'disarming-attack':
      return CircleSlash
    case 'goading-attack':
      return Target
    case 'parry':
      return Shield
    case 'riposte':
      return Swords
    case 'precision-attack':
      return Target
    default:
      return Swords
  }
}

// Build effect string for maneuver display
function buildManeuverEffect(maneuverId: string, saveDC: number, dieSize: number): string {
  const maneuver = getManeuverById(maneuverId)
  if (!maneuver) return ''

  const parts: string[] = []

  if (maneuver.addsDamageDie) {
    parts.push(`+1d${dieSize} damage`)
  }

  if (maneuver.addsToAttackRoll) {
    parts.push(`+1d${dieSize} to attack roll`)
  }

  if (maneuver.savingThrow) {
    const ability = maneuver.savingThrow.ability.toUpperCase().slice(0, 3)
    parts.push(`${ability} save (DC ${saveDC}) or ${maneuver.savingThrow.effect}`)
  }

  if (maneuver.pushDistance) {
    parts.push(`push ${maneuver.pushDistance}ft`)
  }

  return parts.join(', ')
}

export function ManeuverPrompt() {
  const {
    pendingTrigger,
    combatants,
    resolveTrigger,
    skipTrigger,
  } = useCombatStore()

  // Drag functionality
  const { isDragging, containerProps, dragHandleAttr } = useDraggable({
    resetKey: `${pendingTrigger?.reactorId}-${pendingTrigger?.targetId}`,
  })

  // Handle on_hit, on_miss, pre_attack, and on_damage_taken triggers
  if (!pendingTrigger) return null
  if (
    pendingTrigger.type !== 'on_hit' &&
    pendingTrigger.type !== 'pre_attack' &&
    pendingTrigger.type !== 'on_miss' &&
    pendingTrigger.type !== 'on_damage_taken'
  ) return null

  // Only show for maneuver options
  const hasManeuvers = pendingTrigger.options.some(o => o.type === 'maneuver')
  if (!hasManeuvers) return null

  const reactor = combatants.find(c => c.id === pendingTrigger.reactorId)
  const target = combatants.find(c => c.id === pendingTrigger.targetId)

  if (!reactor) return null

  const { context, options } = pendingTrigger

  // Get die size and save DC for display
  const dieSize = getSuperiorityDieSize(reactor)
  const saveDC = getManeuverSaveDC(reactor)

  // Get known maneuver IDs for this character
  const character = reactor.type === 'character' ? reactor.data as Character : null
  const knownManeuverIds = character?.knownManeuverIds || []

  // Filter options based on trigger type
  // For on_damage_taken, include both spells (Shield) and maneuvers (Parry)
  // For other triggers, only include known maneuvers
  const filteredOptions = pendingTrigger.type === 'on_damage_taken'
    ? options.filter(o =>
        o.type === 'spell' || (o.type === 'maneuver' && knownManeuverIds.includes(o.id))
      )
    : options.filter(o =>
        o.type === 'maneuver' && knownManeuverIds.includes(o.id)
      )

  if (filteredOptions.length === 0) return null

  // For Riposte (on_miss), the triggerer is who missed, and we're counter-attacking them
  const attacker = combatants.find(c => c.id === pendingTrigger.triggererId)

  const headerText = pendingTrigger.type === 'on_hit'
    ? 'Maneuver Available!'
    : pendingTrigger.type === 'on_miss'
    ? 'Riposte Opportunity!'
    : pendingTrigger.type === 'on_damage_taken'
    ? 'Reaction Available!'
    : 'Pre-Attack Maneuver!'

  const contextText = pendingTrigger.type === 'on_hit'
    ? <>You hit <span className="text-rose-400 font-semibold">{target?.name || 'the target'}</span> for <span className="text-amber-400 font-semibold">{context.damage}</span> damage!</>
    : pendingTrigger.type === 'on_miss'
    ? <><span className="text-rose-400 font-semibold">{attacker?.name || 'The attacker'}</span> missed you! Use your reaction to counter-attack.</>
    : pendingTrigger.type === 'on_damage_taken'
    ? <><span className="text-rose-400 font-semibold">{attacker?.name || 'An enemy'}</span> hit you for <span className="text-amber-400 font-semibold">{context.damage}</span> damage!</>
    : <>You are about to attack <span className="text-rose-400 font-semibold">{target?.name || 'the target'}</span></>

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
            <Swords className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-300">{headerText}</h3>
            <p className="text-sm text-slate-400">{reactor.name} can use a maneuver</p>
          </div>
        </div>

        {/* Context */}
        <div className="bg-slate-800 rounded-lg p-3 mb-4">
          <div className="text-sm text-slate-300 mb-2">
            {contextText}
          </div>
          {/* Only show superiority dice info if maneuver options exist */}
          {filteredOptions.some(o => o.type === 'maneuver') && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>Superiority Dice: <span className="text-amber-400 font-mono">{reactor.superiorityDiceRemaining}</span></span>
              <span>Die Size: <span className="text-white font-mono">d{dieSize}</span></span>
              <span>Save DC: <span className="text-white font-mono">{saveDC}</span></span>
            </div>
          )}
        </div>

        {/* Available options */}
        <div className="space-y-2 mb-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            {pendingTrigger.type === 'on_damage_taken' ? 'Available Reactions' : 'Available Maneuvers'}
          </div>
          {filteredOptions.map((option) => {
            const Icon = getManeuverIcon(option.id)
            const maneuver = option.type === 'maneuver' ? getManeuverById(option.id) : null
            const effectText = option.type === 'maneuver'
              ? buildManeuverEffect(option.id, saveDC, dieSize)
              : option.effect || ''

            // Different styling for spells vs maneuvers
            const isSpell = option.type === 'spell'
            const bgGradient = isSpell
              ? 'from-blue-900/50 to-blue-800/50'
              : 'from-amber-900/50 to-amber-800/50'
            const borderColor = isSpell
              ? 'border-blue-600 hover:border-blue-400'
              : 'border-amber-600 hover:border-amber-400'
            const hoverGradient = isSpell
              ? 'hover:from-blue-800/50 hover:to-blue-700/50'
              : 'hover:from-amber-800/50 hover:to-amber-700/50'
            const iconBg = isSpell ? 'bg-blue-500/30' : 'bg-amber-500/30'
            const iconColor = isSpell ? 'text-blue-300' : 'text-amber-300'
            const textColor = isSpell ? 'text-blue-200' : 'text-amber-200'
            const costColor = isSpell ? 'text-blue-400' : 'text-amber-400'

            return (
              <button
                key={option.id}
                onClick={() => resolveTrigger(option.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg transition-all',
                  `bg-gradient-to-r ${bgGradient}`,
                  `border ${borderColor}`,
                  hoverGradient
                )}
              >
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', iconBg)}>
                  <Icon className={cn('w-5 h-5', iconColor)} />
                </div>
                <div className="flex-1 text-left">
                  <div className={cn('text-sm font-semibold', textColor)}>{option.name}</div>
                  <div className="text-xs text-slate-400">
                    {effectText}
                  </div>
                  {maneuver?.description && (
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {maneuver.description}
                    </div>
                  )}
                  {isSpell && option.description && (
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {option.description}
                    </div>
                  )}
                </div>
                <div className={cn('text-xs font-medium whitespace-nowrap', costColor)}>
                  {option.cost || (isSpell ? 'Slot' : `1d${dieSize}`)}
                </div>
              </button>
            )
          })}
        </div>

        {/* Skip button */}
        <button
          onClick={skipTrigger}
          className={cn(
            'w-full flex items-center justify-center gap-2 p-3 rounded-lg transition-all',
            'bg-slate-800 border border-slate-600',
            'hover:bg-slate-700 hover:border-slate-500',
            'text-slate-400 hover:text-slate-300'
          )}
        >
          <X className="w-4 h-4" />
          <span>
            {pendingTrigger.type === 'on_hit'
              ? `Continue without maneuver (deal ${context.damage} damage)`
              : pendingTrigger.type === 'on_miss'
              ? 'Skip Riposte (no reaction)'
              : pendingTrigger.type === 'on_damage_taken'
              ? `Take ${context.damage} damage (no reaction)`
              : 'Attack without maneuver'}
          </span>
        </button>
      </div>
    </div>
  )
}
