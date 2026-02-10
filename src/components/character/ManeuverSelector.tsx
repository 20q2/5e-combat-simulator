import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { getClassById } from '@/data'
import { getAllManeuvers } from '@/data/maneuvers'
import { useCharacterStore } from '@/stores/characterStore'
import { isCombatSuperiorityFeature } from '@/types/classFeature'
import type { Maneuver } from '@/types/maneuver'
import { Swords, Target, Shield, Crosshair, Zap, ArrowRight, Users, Eye, Footprints, MoveRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

function getManeuverIcon(maneuver: Maneuver): React.ReactNode {
  switch (maneuver.id) {
    case 'precision-attack':
      return <Crosshair className="w-4 h-4" />
    case 'trip-attack':
      return <ArrowRight className="w-4 h-4 rotate-90" />
    case 'menacing-attack':
      return <Zap className="w-4 h-4" />
    case 'pushing-attack':
      return <ArrowRight className="w-4 h-4" />
    case 'disarming-attack':
      return <Target className="w-4 h-4" />
    case 'goading-attack':
      return <Users className="w-4 h-4" />
    case 'riposte':
      return <Swords className="w-4 h-4" />
    case 'parry':
      return <Shield className="w-4 h-4" />
    case 'distracting-strike':
      return <Eye className="w-4 h-4" />
    case 'sweeping-attack':
      return <Swords className="w-4 h-4" />
    case 'evasive-footwork':
      return <Footprints className="w-4 h-4" />
    case 'feinting-attack':
      return <Crosshair className="w-4 h-4" />
    case 'lunging-attack':
      return <MoveRight className="w-4 h-4" />
    default:
      return <Swords className="w-4 h-4" />
  }
}

function getTriggerColorClass(trigger: Maneuver['trigger'], isSelected: boolean): string {
  if (!isSelected) return 'border-border bg-slate-800/40 hover:border-primary/50 hover:bg-slate-800/60'

  switch (trigger) {
    case 'on_hit':
      return 'border-red-500 bg-red-500/10'
    case 'pre_attack':
      return 'border-yellow-500 bg-yellow-500/10'
    case 'bonus_action':
      return 'border-green-500 bg-green-500/10'
    case 'reaction':
      return 'border-blue-500 bg-blue-500/10'
    default:
      return 'border-primary bg-primary/10'
  }
}

interface ManeuverCardProps {
  maneuver: Maneuver
  isSelected: boolean
  isDisabled: boolean
  onToggle: () => void
}

function ManeuverCard({ maneuver, isSelected, isDisabled, onToggle }: ManeuverCardProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onToggle}
          disabled={isDisabled}
          className={cn(
            'w-full text-left px-3 py-2 rounded-lg border-2 transition-all',
            isSelected ? getTriggerColorClass(maneuver.trigger, true) : 'border-border bg-slate-800/40',
            isDisabled && !isSelected ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 hover:bg-slate-800/60 cursor-pointer'
          )}
        >
          <div className="flex items-center gap-2">
            {getManeuverIcon(maneuver)}
            <span className="font-medium text-sm flex-1">{maneuver.name}</span>
            <div className={cn(
              'w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center text-xs',
              isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
            )}>
              {isSelected && '✓'}
            </div>
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="leading-relaxed">{maneuver.description}</p>
        {maneuver.savingThrow && (
          <p className="mt-1.5 text-amber-300 font-medium">
            {maneuver.savingThrow.ability.toUpperCase()} save: {maneuver.savingThrow.effect}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export function ManeuverSelector() {
  const draft = useCharacterStore((state) => state.draft)
  const toggleManeuver = useCharacterStore((state) => state.toggleManeuver)

  const characterClass = draft.classId ? getClassById(draft.classId) : null

  // Find combat superiority feature for current level
  const combatSuperiorityFeature = useMemo(() => {
    if (!characterClass) return null

    // Check subclass features (Battle Master is a subclass)
    const subclass = characterClass.subclasses.find(s => s.id === draft.subclassId)
    if (!subclass) return null

    for (const feature of subclass.features) {
      if (isCombatSuperiorityFeature(feature) && feature.level <= draft.level) {
        return feature
      }
    }

    return null
  }, [characterClass, draft.subclassId, draft.level])

  // Calculate maneuvers known count based on level
  const maneuversKnownCount = useMemo(() => {
    if (!combatSuperiorityFeature) return 0

    let count = combatSuperiorityFeature.maneuversKnown
    if (combatSuperiorityFeature.maneuversKnownAtLevels) {
      for (const [lvl, maneuverCount] of Object.entries(combatSuperiorityFeature.maneuversKnownAtLevels)) {
        if (draft.level >= parseInt(lvl)) {
          count = maneuverCount
        }
      }
    }
    return count
  }, [combatSuperiorityFeature, draft.level])

  // Group maneuvers by trigger type for organization
  // Must be called before early return to maintain consistent hook order
  const allManeuvers = getAllManeuvers()
  const maneuversByTrigger = useMemo(() => {
    const groups: Record<string, Maneuver[]> = {
      on_hit: [],
      pre_attack: [],
      reaction: [],
      bonus_action: [],
    }

    for (const maneuver of allManeuvers) {
      groups[maneuver.trigger].push(maneuver)
    }

    return groups
  }, [allManeuvers])

  // Don't render if no combat superiority feature
  if (!combatSuperiorityFeature) {
    return null
  }

  const selectedCount = draft.selectedManeuverIds.length
  const canSelectMore = selectedCount < maneuversKnownCount

  return (
    <TooltipProvider delayDuration={300}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Swords className="w-4 h-4 text-primary" />
            Combat Superiority Maneuvers
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {selectedCount} / {maneuversKnownCount} selected
            </span>
          </CardTitle>
          <CardDescription>
            Choose {maneuversKnownCount} maneuvers to learn. You can use them by spending superiority dice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* On-Hit Maneuvers */}
            {maneuversByTrigger.on_hit.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  On Hit (add to damage)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {maneuversByTrigger.on_hit.map((maneuver) => {
                    const isSelected = draft.selectedManeuverIds.includes(maneuver.id)
                    return (
                      <ManeuverCard
                        key={maneuver.id}
                        maneuver={maneuver}
                        isSelected={isSelected}
                        isDisabled={!canSelectMore && !isSelected}
                        onToggle={() => toggleManeuver(maneuver.id)}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* On-Miss Maneuvers */}
            {maneuversByTrigger.pre_attack.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  On Miss (add to attack roll)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {maneuversByTrigger.pre_attack.map((maneuver) => {
                    const isSelected = draft.selectedManeuverIds.includes(maneuver.id)
                    return (
                      <ManeuverCard
                        key={maneuver.id}
                        maneuver={maneuver}
                        isSelected={isSelected}
                        isDisabled={!canSelectMore && !isSelected}
                        onToggle={() => toggleManeuver(maneuver.id)}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Reaction Maneuvers */}
            {maneuversByTrigger.reaction.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Reactions
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {maneuversByTrigger.reaction.map((maneuver) => {
                    const isSelected = draft.selectedManeuverIds.includes(maneuver.id)
                    return (
                      <ManeuverCard
                        key={maneuver.id}
                        maneuver={maneuver}
                        isSelected={isSelected}
                        isDisabled={!canSelectMore && !isSelected}
                        onToggle={() => toggleManeuver(maneuver.id)}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Bonus Action Maneuvers */}
            {maneuversByTrigger.bonus_action.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Bonus Actions
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {maneuversByTrigger.bonus_action.map((maneuver) => {
                    const isSelected = draft.selectedManeuverIds.includes(maneuver.id)
                    return (
                      <ManeuverCard
                        key={maneuver.id}
                        maneuver={maneuver}
                        isSelected={isSelected}
                        isDisabled={!canSelectMore && !isSelected}
                        onToggle={() => toggleManeuver(maneuver.id)}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
