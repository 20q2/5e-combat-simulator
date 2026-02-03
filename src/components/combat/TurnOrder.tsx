import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useCombatStore } from '@/stores/combatStore'
import { Play, User, Skull, ListOrdered } from 'lucide-react'

export function TurnOrder() {
  const { combatants, turnOrder, currentTurnIndex, round, phase, selectCombatant, selectedCombatantId } = useCombatStore()

  // Get combatants in turn order
  const orderedCombatants = turnOrder
    .map((id) => combatants.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)

  if (phase === 'setup' || orderedCombatants.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ListOrdered className="w-4 h-4" />
            Turn Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Roll initiative to determine turn order
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm flex items-center gap-2">
            <ListOrdered className="w-4 h-4" />
            Turn Order
          </CardTitle>
          <span className="text-xs text-muted-foreground">Round {round}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {orderedCombatants.map((combatant, index) => {
          const isCurrent = index === currentTurnIndex
          const isSelected = selectedCombatantId === combatant.id

          return (
            <button
              key={combatant.id}
              onClick={() => selectCombatant(combatant.id)}
              className={cn(
                'w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-left transition-colors',
                isCurrent && 'bg-amber-500/20 border border-amber-500',
                isSelected && !isCurrent && 'bg-violet-500/20 border border-violet-500',
                !isCurrent && !isSelected && 'hover:bg-muted',
                combatant.currentHp === 0 && 'opacity-50'
              )}
            >
              {/* Current turn arrow */}
              <span className={cn(
                'text-emerald-400 w-3 shrink-0',
                !isCurrent && 'invisible'
              )}>
                <Play className="w-3 h-3 fill-current" />
              </span>

              {/* Initiative badge */}
              <span className="text-[10px] font-mono bg-muted px-1 py-0.5 rounded min-w-[24px] text-center shrink-0">
                {combatant.initiative}
              </span>

              {/* Type indicator */}
              <span
                className={cn(
                  'shrink-0',
                  combatant.type === 'character' ? 'text-violet-500' : 'text-rose-500'
                )}
              >
                {combatant.type === 'character' ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Skull className="w-3.5 h-3.5" />
                )}
              </span>

              {/* Name and HP */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{combatant.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {combatant.currentHp}/{combatant.maxHp} HP
                </div>
              </div>

            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
