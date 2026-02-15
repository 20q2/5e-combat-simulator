import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { getClassById, getSpellsForClassAtLevel } from '@/data'
import { useCharacterStore } from '@/stores/characterStore'
import type { Spell } from '@/types'
import { Sparkles, Wand2, ChevronDown, ChevronUp } from 'lucide-react'

function SpellCard({
  spell,
  selected,
  onToggle,
  disabled,
  isExpanded,
  onExpand,
}: {
  spell: Spell
  selected: boolean
  onToggle: () => void
  disabled?: boolean
  isExpanded: boolean
  onExpand: () => void
}) {
  return (
    <div className={cn(
      'rounded-lg border-2 transition-all',
      selected ? 'border-primary bg-primary/5' : 'border-border bg-slate-800/40',
      disabled && !selected ? 'opacity-50' : ''
    )}>
      <div className="flex items-center gap-2 p-3">
        <button
          onClick={onToggle}
          disabled={disabled && !selected}
          className={cn(
            'w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors',
            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground',
            disabled && !selected ? 'cursor-not-allowed' : 'cursor-pointer'
          )}
        >
          {selected && '✓'}
        </button>
        <button
          onClick={onExpand}
          className="flex-1 text-left min-w-0 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{spell.name}</h4>
            {spell.concentration && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded shrink-0 border border-amber-500/30">
                C
              </span>
            )}
            {spell.ritual && (
              <span className="text-xs bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded shrink-0 border border-violet-500/30">
                R
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {spell.school.charAt(0).toUpperCase() + spell.school.slice(1)} · {spell.castingTime}
          </p>
        </button>
        <button onClick={onExpand} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border/50">
          <div className="text-sm space-y-1 mt-2 mb-2">
            <p><span className="font-medium text-muted-foreground">Range:</span> {spell.range}</p>
            <p><span className="font-medium text-muted-foreground">Duration:</span> {spell.duration}</p>
            <p>
              <span className="font-medium text-muted-foreground">Components:</span>{' '}
              {[
                spell.components.verbal && 'V',
                spell.components.somatic && 'S',
                spell.components.material && `M (${spell.components.material})`,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{spell.description}</p>
          {spell.higherLevels && (
            <p className="text-sm mt-2 text-cyan-400/80">
              <span className="font-medium">At Higher Levels:</span> {spell.higherLevels}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Per-class spell section that handles one class's spell selection.
 */
function ClassSpellSection({ classId }: { classId: string }) {
  const draft = useCharacterStore((state) => state.draft)
  const toggleClassSpell = useCharacterStore((state) => state.toggleClassSpell)
  const toggleClassCantrip = useCharacterStore((state) => state.toggleClassCantrip)
  const [expandedSpellId, setExpandedSpellId] = useState<string | null>(null)

  const entry = draft.classEntries.find(e => e.classId === classId)
  const selectedClass = getClassById(classId) ?? null
  const classLevel = entry?.level ?? 0
  const spellcasting = selectedClass?.spellcasting

  const selectedSpellIds = entry?.selectedSpellIds ?? []
  const selectedCantrips = entry?.selectedCantrips ?? []

  // Calculate max spell level based on class and level
  const maxSpellLevel = useMemo(() => {
    if (!spellcasting) return 0
    const slots = spellcasting.spellSlotProgression[classLevel]
    if (!slots) return 0
    for (let i = slots.length - 1; i >= 0; i--) {
      if (slots[i] > 0) return i + 1
    }
    return 0
  }, [spellcasting, classLevel])

  // Get available spells
  const availableSpells = useMemo(() => {
    if (!selectedClass) return []
    return getSpellsForClassAtLevel(selectedClass.name, maxSpellLevel)
  }, [selectedClass, maxSpellLevel])

  const cantrips = availableSpells.filter((s) => s.level === 0).sort((a, b) => a.name.localeCompare(b.name))
  const leveledSpells = availableSpells.filter((s) => s.level > 0)

  const spellsByLevel = useMemo(() => {
    const grouped: Record<number, Spell[]> = {}
    for (const spell of leveledSpells) {
      if (!grouped[spell.level]) grouped[spell.level] = []
      grouped[spell.level].push(spell)
    }
    for (const level of Object.keys(grouped)) {
      grouped[Number(level)].sort((a, b) => a.name.localeCompare(b.name))
    }
    return grouped
  }, [leveledSpells])

  const cantripsKnown = spellcasting?.cantripsKnownProgression[classLevel - 1] ?? 0
  const spellsKnown = spellcasting?.spellsKnownProgression?.[classLevel - 1]
  const isPreparedCaster = spellcasting?.preparedCaster ?? false
  const preparedLimit = isPreparedCaster ? classLevel + 3 : undefined

  const spellLevels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b)

  if (!spellcasting) return null

  const handleExpand = (spellId: string) => {
    setExpandedSpellId(expandedSpellId === spellId ? null : spellId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-violet-400" />
          {selectedClass?.name} Spells (Level {classLevel})
        </CardTitle>
        <CardDescription>
          {isPreparedCaster ? (
            <>Prepared: {selectedSpellIds.length} (suggested max: {preparedLimit})</>
          ) : (
            <>Known: {selectedSpellIds.length}{spellsKnown ? ` / ${spellsKnown}` : ''}</>
          )}
          {' · '}Cantrips: {selectedCantrips.length} / {cantripsKnown}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cantrips">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="cantrips" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Cantrips
              <span className="text-xs opacity-70">({selectedCantrips.length}/{cantripsKnown})</span>
            </TabsTrigger>
            {spellLevels.map((level) => {
              const count = spellsByLevel[level]?.filter(s => selectedSpellIds.includes(s.id)).length ?? 0
              return (
                <TabsTrigger key={level} value={`level-${level}`} className="gap-1.5">
                  Level {level}
                  {count > 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-1.5 rounded-full">{count}</span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value="cantrips">
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {cantrips.map((spell) => (
                <SpellCard
                  key={spell.id}
                  spell={spell}
                  selected={selectedCantrips.includes(spell.id)}
                  onToggle={() => toggleClassCantrip(classId, spell.id)}
                  disabled={
                    selectedCantrips.length >= cantripsKnown &&
                    !selectedCantrips.includes(spell.id)
                  }
                  isExpanded={expandedSpellId === spell.id}
                  onExpand={() => handleExpand(spell.id)}
                />
              ))}
            </div>
          </TabsContent>

          {spellLevels.map((level) => (
            <TabsContent key={level} value={`level-${level}`}>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {spellsByLevel[level].map((spell) => (
                  <SpellCard
                    key={spell.id}
                    spell={spell}
                    selected={selectedSpellIds.includes(spell.id)}
                    onToggle={() => toggleClassSpell(classId, spell.id)}
                    disabled={
                      !isPreparedCaster &&
                      spellsKnown !== undefined &&
                      selectedSpellIds.length >= spellsKnown &&
                      !selectedSpellIds.includes(spell.id)
                    }
                    isExpanded={expandedSpellId === spell.id}
                    onExpand={() => handleExpand(spell.id)}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

export function SpellSelector() {
  const { draft } = useCharacterStore()

  // Find all class entries that have spellcasting
  const spellcastingEntries = draft.classEntries.filter(entry => {
    const classData = getClassById(entry.classId)
    return classData?.spellcasting !== undefined
  })

  if (spellcastingEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-violet-400" />
            Spells
          </CardTitle>
          <CardDescription>
            No spellcasting classes selected.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          No spells available for your current classes.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {spellcastingEntries.map(entry => (
        <ClassSpellSection key={entry.classId} classId={entry.classId} />
      ))}
    </div>
  )
}
