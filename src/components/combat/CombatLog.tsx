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

// Highlight important parts of a message with color
function StyledMessage({ entry }: { entry: CombatLogEntry }) {
  const { type, message } = entry

  // Death messages: bold red
  if (type === 'death') {
    return <span className="text-rose-400 font-bold">{message}</span>
  }

  // Damage messages: color the number and damage type
  if (type === 'damage') {
    const match = message.match(/^(\d+)\s+(.+?\s+damage)(.*)$/)
    if (match) {
      return (
        <span>
          <span className="text-rose-400 font-semibold">{match[1]}</span>
          <span className="text-slate-300"> {match[2]}</span>
          {match[3] && <span className="text-slate-400">{match[3]}</span>}
        </span>
      )
    }
    return <span className="text-slate-300">{message}</span>
  }

  // Heal messages: color the heal amount
  if (type === 'heal') {
    const match = message.match(/(heals?\s+)(\d+)(\s+HP.*)/)
    if (match) {
      return (
        <span className="text-slate-300">
          {match[1]}<span className="text-emerald-400 font-semibold">{match[2]}</span>{match[3]}
        </span>
      )
    }
    // Temp HP
    const tempMatch = message.match(/(gains?\s+)(\d+)(\s+temporary HP.*)/)
    if (tempMatch) {
      return (
        <span className="text-slate-300">
          {tempMatch[1]}<span className="text-emerald-400 font-semibold">{tempMatch[2]}</span>{tempMatch[3]}
        </span>
      )
    }
    return <span className="text-slate-300">{message}</span>
  }

  // Attack messages: highlight CRITICAL
  if (type === 'attack') {
    if (message.includes('CRITICAL')) {
      const parts = message.split(/(CRITICAL(?:LY)?(?:\s+HIT[S]?)?|CRITICAL MISS)/i)
      return (
        <span className="text-slate-300">
          {parts.map((part, i) =>
            /CRITICAL/i.test(part)
              ? <span key={i} className="text-amber-400 font-bold">{part}</span>
              : <span key={i}>{part}</span>
          )}
        </span>
      )
    }
    // Highlight "hits" and "misses"
    if (message.includes(' hits ')) {
      const idx = message.indexOf(' hits ')
      return (
        <span className="text-slate-300">
          {message.slice(0, idx)}
          <span className="text-orange-400"> hits </span>
          {message.slice(idx + 6)}
        </span>
      )
    }
    if (message.includes(' misses ')) {
      const idx = message.indexOf(' misses ')
      return (
        <span className="text-slate-300">
          {message.slice(0, idx)}
          <span className="text-slate-500"> misses </span>
          {message.slice(idx + 8)}
        </span>
      )
    }
    return <span className="text-slate-300">{message}</span>
  }

  // Spell messages: highlight the spell name
  if (type === 'spell') {
    const castsMatch = message.match(/^(casts\s+)(.+?)(!.*)?$/)
    if (castsMatch) {
      return (
        <span className="text-slate-300">
          {castsMatch[1]}<span className="text-purple-400">{castsMatch[2]}</span>{castsMatch[3] || ''}
        </span>
      )
    }
    // Save results: highlight DC
    const dcMatch = message.match(/(DC\s+\d+)/)
    if (dcMatch) {
      const parts = message.split(/(DC\s+\d+)/)
      return (
        <span className="text-slate-300">
          {parts.map((part, i) =>
            /DC\s+\d+/.test(part)
              ? <span key={i} className="text-amber-400">{part}</span>
              : <span key={i}>{part}</span>
          )}
        </span>
      )
    }
    return <span className="text-slate-300">{message}</span>
  }

  // Movement messages: highlight distance
  if (type === 'movement') {
    const match = message.match(/(moves?\s+)(\d+\s*ft)(.*)/)
    if (match) {
      return (
        <span className="text-slate-300">
          {match[1]}<span className="text-sky-400">{match[2]}</span>{match[3]}
        </span>
      )
    }
    return <span className="text-slate-300">{message}</span>
  }

  // Everything else: plain light text
  return <span className="text-slate-300">{message}</span>
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
  // Find the actor combatant
  const actor = entry.actorId ? combatants.find(c => c.id === entry.actorId) : undefined

  // Don't show "System" as actor name for general messages
  const showActorName = entry.actorName && entry.actorName !== 'System'

  // Strip leading actor name from message to avoid showing it twice
  const strippedEntry = showActorName && entry.message.startsWith(entry.actorName)
    ? { ...entry, message: entry.message.slice(entry.actorName.length).trimStart() }
    : entry

  return (
    <div className="flex items-start gap-2 text-sm py-1 pl-1 animate-slide-in-left">
      <ActorToken combatant={actor} />
      <div className="flex-1 min-w-0">
        <div>
          {showActorName && (
            <span className="font-semibold text-white">{entry.actorName} </span>
          )}
          <StyledMessage entry={strippedEntry} />
        </div>
        {entry.details && (
          <div className="text-xs text-slate-500 mt-0.5 font-mono">
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
