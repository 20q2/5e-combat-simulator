import { useRef, useEffect } from 'react'
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

  return (
    <div className={cn('flex items-start gap-2 text-sm py-1.5 border-b border-border/50 last:border-0', color)}>
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground mr-2">
          R{entry.round}
        </span>
        {entry.message}
      </div>
    </div>
  )
}

export function CombatLog() {
  const { log } = useCombatStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [log.length])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ScrollText className="w-4 h-4" />
          Combat Log
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full max-h-[300px] overflow-y-auto pr-2"
        >
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No combat events yet
            </p>
          ) : (
            log.map((entry, index) => (
              <LogEntry key={index} entry={entry} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
