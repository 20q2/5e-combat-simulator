import { useRef, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useCombatStore } from '@/stores/combatStore'
import type { CombatLogEntry } from '@/types'
import {
  Sword,
  Heart,
  Skull,
  AlertTriangle,
  Zap,
  Footprints,
  Sparkles,
  Target,
  ScrollText,
  Info,
} from 'lucide-react'

function RoundDivider({ round }: { round: number }) {
  return (
    <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
      <div className="flex-1 h-px bg-slate-700" />
      <span className="font-medium">
        {round === 0 ? 'Initiative' : `Round ${round}`}
      </span>
      <div className="flex-1 h-px bg-slate-700" />
    </div>
  )
}

function LogEntry({ entry }: { entry: CombatLogEntry }) {
  const getEntryStyle = () => {
    switch (entry.type) {
      case 'damage':
        return { color: 'text-rose-400', Icon: Sword }
      case 'heal':
        return { color: 'text-emerald-400', Icon: Heart }
      case 'death':
        return { color: 'text-rose-300 font-bold', Icon: Skull }
      case 'condition':
        return { color: 'text-amber-400', Icon: AlertTriangle }
      case 'initiative':
        return { color: 'text-violet-400', Icon: Zap }
      case 'movement':
        return { color: 'text-sky-400', Icon: Footprints }
      case 'spell':
        return { color: 'text-purple-400', Icon: Sparkles }
      case 'attack':
        return { color: 'text-orange-400', Icon: Target }
      default:
        return { color: 'text-foreground', Icon: Info }
    }
  }

  const { color, Icon } = getEntryStyle()

  // Don't show "System" as actor name for general messages
  const showActorName = entry.actorName && entry.actorName !== 'System'

  return (
    <div className={cn('flex items-start gap-2 text-sm py-1 pl-1', color)}>
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
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
  const { log } = useCombatStore()
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
    <Card className="flex flex-col h-[400px]">
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
                <LogEntry key={`entry-${item.index}`} entry={item.entry} />
              )
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
