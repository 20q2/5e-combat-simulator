import { useRef, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useCombatStore } from '@/stores/combatStore'
import { getCombatantTokenImage } from '@/lib/tokenImages'
import type { CombatLogEntry, Combatant, Character, Monster } from '@/types'
import { ScrollText } from 'lucide-react'

function RoundDivider({ round }: { round: number }) {
  return (
    <div className="flex items-center gap-2 py-2 text-xs text-slate-400 animate-slide-in-left">
      <div className="flex-1 h-px bg-slate-700" />
      <span className="font-medium">
        {round === 0 ? 'Initiative' : `Round ${round}`}
      </span>
      <div className="flex-1 h-px bg-slate-700" />
    </div>
  )
}

// Get text color based on log entry type
function getEntryColor(type: CombatLogEntry['type']): string {
  switch (type) {
    case 'damage':
      return 'text-rose-400'
    case 'heal':
      return 'text-emerald-400'
    case 'death':
      return 'text-rose-300 font-bold'
    case 'condition':
      return 'text-amber-400'
    case 'initiative':
      return 'text-violet-400'
    case 'movement':
      return 'text-sky-400'
    case 'spell':
      return 'text-purple-400'
    case 'attack':
      return 'text-orange-400'
    default:
      return 'text-foreground'
  }
}

// Token avatar component for combat log
function ActorToken({ combatant }: { combatant: Combatant | undefined }) {
  if (!combatant) {
    // System message - show a neutral circle
    return (
      <div className="w-5 h-5 rounded-full bg-slate-700 shrink-0 flex items-center justify-center">
        <span className="text-[8px] text-slate-400 font-bold">SYS</span>
      </div>
    )
  }

  const tokenImage = getCombatantTokenImage(
    combatant.type,
    combatant.data as Character | Monster
  )

  // Border color based on combatant type
  const borderColor = combatant.type === 'character'
    ? 'ring-emerald-500'
    : 'ring-rose-500'

  if (tokenImage) {
    return (
      <div className={cn('w-5 h-5 rounded-full shrink-0 ring-1 overflow-hidden', borderColor)}>
        <img
          src={tokenImage}
          alt={combatant.name}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  // Fallback: colored circle with initials
  const bgColor = combatant.type === 'character' ? 'bg-violet-600' : 'bg-rose-600'
  const initials = combatant.name.substring(0, 2).toUpperCase()

  return (
    <div className={cn('w-5 h-5 rounded-full shrink-0 flex items-center justify-center', bgColor)}>
      <span className="text-[8px] text-white font-bold">{initials}</span>
    </div>
  )
}

function LogEntry({ entry, combatants }: { entry: CombatLogEntry; combatants: Combatant[] }) {
  const color = getEntryColor(entry.type)

  // Find the actor combatant
  const actor = entry.actorId ? combatants.find(c => c.id === entry.actorId) : undefined

  // Don't show "System" as actor name for general messages
  const showActorName = entry.actorName && entry.actorName !== 'System'

  return (
    <div className={cn('flex items-start gap-2 text-sm py-1 pl-1 animate-slide-in-left', color)}>
      <ActorToken combatant={actor} />
      <div className="flex-1 min-w-0">
        <div>
          {showActorName && (
            <span className="font-semibold text-slate-200">{entry.actorName} </span>
          )}
          {entry.message}
        </div>
        {entry.details && (
          <div className="text-xs text-muted-foreground mt-0.5 font-mono">
            {entry.details}
          </div>
        )}
      </div>
    </div>
  )
}

export function CombatLog() {
  const { log, combatants } = useCombatStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Group log entries by round with round dividers
  const entriesWithDividers = useMemo(() => {
    const result: Array<{ type: 'divider'; round: number } | { type: 'entry'; entry: CombatLogEntry; index: number }> = []
    let lastRound = -1

    log.forEach((entry, index) => {
      if (entry.round !== lastRound) {
        result.push({ type: 'divider', round: entry.round })
        lastRound = entry.round
      }
      result.push({ type: 'entry', entry, index })
    })

    return result
  }, [log])

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [log.length])

  return (
    <Card className="flex flex-col flex-1 min-h-0">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <ScrollText className="w-4 h-4" />
          Combat Log
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden min-h-0 pb-2">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto pr-2"
        >
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No combat events yet
            </p>
          ) : (
            entriesWithDividers.map((item) =>
              item.type === 'divider' ? (
                <RoundDivider key={`divider-${item.round}`} round={item.round} />
              ) : (
                <LogEntry key={`entry-${item.index}`} entry={item.entry} combatants={combatants} />
              )
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
