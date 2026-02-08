import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getClassById, getSpellsForClassAtLevel, getSpellById } from '@/data'
import { useCharacterStore } from '@/stores/characterStore'
import type { Spell } from '@/types'
import { Sparkles, BookOpen, Info, Wand2 } from 'lucide-react'

function SpellCard({
  spell,
  selected,
  onToggle,
  disabled,
}: {
  spell: Spell
  selected: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled && !selected}
      className={cn(
        'w-full text-left p-3 rounded-lg border-2 transition-all',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-slate-800/40',
        disabled && !selected ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 hover:bg-slate-800/60 cursor-pointer'
      )}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
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
        </div>
        <div className={cn(
          'w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
        )}>
          {selected && '✓'}
        </div>
      </div>
    </button>
  )
}

function SpellDetails({ spell }: { spell: Spell }) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <h4 className="font-semibold">{spell.name}</h4>
      <p className="text-sm text-muted-foreground mb-2">
        {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} {spell.school}
      </p>
      <div className="text-sm space-y-1 mb-3">
        <p><span className="font-medium">Casting Time:</span> {spell.castingTime}</p>
        <p><span className="font-medium">Range:</span> {spell.range}</p>
        <p><span className="font-medium">Duration:</span> {spell.duration}</p>
        <p>
          <span className="font-medium">Components:</span>{' '}
          {[
            spell.components.verbal && 'V',
            spell.components.somatic && 'S',
            spell.components.material && `M (${spell.components.material})`,
          ]
            .filter(Boolean)
            .join(', ')}
        </p>
      </div>
      <p className="text-sm">{spell.description}</p>
      {spell.higherLevels && (
        <p className="text-sm mt-2 text-muted-foreground">
          <span className="font-medium">At Higher Levels:</span> {spell.higherLevels}
        </p>
      )}
    </div>
  )
}

export function SpellSelector() {
  const { draft, toggleSpell, toggleCantrip } = useCharacterStore()

  const selectedClass = draft.classId ? getClassById(draft.classId) : null
  const spellcasting = selectedClass?.spellcasting

  // Calculate max spell level based on class and level
  const maxSpellLevel = useMemo(() => {
    if (!spellcasting) return 0
    const slots = spellcasting.spellSlotProgression[draft.level]
    if (!slots) return 0
    // Find highest level with slots
    for (let i = slots.length - 1; i >= 0; i--) {
      if (slots[i] > 0) return i + 1
    }
    return 0
  }, [spellcasting, draft.level])

  // Get available spells
  const availableSpells = useMemo(() => {
    if (!selectedClass) return []
    return getSpellsForClassAtLevel(selectedClass.name, maxSpellLevel)
  }, [selectedClass, maxSpellLevel])

  // Separate cantrips and leveled spells
  const cantrips = availableSpells.filter((s) => s.level === 0)
  const leveledSpells = availableSpells.filter((s) => s.level > 0)

  // Group leveled spells by level
  const spellsByLevel = useMemo(() => {
    const grouped: Record<number, Spell[]> = {}
    for (const spell of leveledSpells) {
      if (!grouped[spell.level]) {
        grouped[spell.level] = []
      }
      grouped[spell.level].push(spell)
    }
    return grouped
  }, [leveledSpells])

  // Calculate limits
  const cantripsKnown = spellcasting?.cantripsKnownProgression[draft.level - 1] ?? 0
  const spellsKnown = spellcasting?.spellsKnownProgression?.[draft.level - 1]
  const isPreparedCaster = spellcasting?.preparedCaster ?? false

  // For prepared casters, they can prepare INT/WIS mod + level spells
  // We'll just show a reasonable limit for now
  const preparedLimit = isPreparedCaster ? draft.level + 3 : undefined

  const selectedSpell = draft.selectedSpellIds.length > 0
    ? getSpellById(draft.selectedSpellIds[draft.selectedSpellIds.length - 1])
    : draft.selectedCantrips.length > 0
      ? getSpellById(draft.selectedCantrips[draft.selectedCantrips.length - 1])
      : null

  if (!spellcasting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-violet-400" />
            Spells
          </CardTitle>
          <CardDescription>
            {selectedClass
              ? `${selectedClass.name} is not a spellcasting class.`
              : 'Select a class first to see spell options.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          No spells available for this class.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Cantrips */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Cantrips
          </CardTitle>
          <CardDescription>
            Selected: {draft.selectedCantrips.length} / {cantripsKnown}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {cantrips.map((spell) => (
              <SpellCard
                key={spell.id}
                spell={spell}
                selected={draft.selectedCantrips.includes(spell.id)}
                onToggle={() => toggleCantrip(spell.id)}
                disabled={
                  draft.selectedCantrips.length >= cantripsKnown &&
                  !draft.selectedCantrips.includes(spell.id)
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leveled Spells */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-400" />
            Spells
          </CardTitle>
          <CardDescription>
            {isPreparedCaster ? (
              <>Prepared: {draft.selectedSpellIds.length} (suggested max: {preparedLimit})</>
            ) : (
              <>Known: {draft.selectedSpellIds.length}{spellsKnown ? ` / ${spellsKnown}` : ''}</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {Object.entries(spellsByLevel)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([level, spells]) => (
                <div key={level}>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    Level {level}
                  </h4>
                  <div className="space-y-2">
                    {spells.map((spell) => (
                      <SpellCard
                        key={spell.id}
                        spell={spell}
                        selected={draft.selectedSpellIds.includes(spell.id)}
                        onToggle={() => toggleSpell(spell.id)}
                        disabled={
                          !isPreparedCaster &&
                          spellsKnown !== undefined &&
                          draft.selectedSpellIds.length >= spellsKnown &&
                          !draft.selectedSpellIds.includes(spell.id)
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Spell Details */}
      <div>
        {selectedSpell ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                Spell Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SpellDetails spell={selectedSpell} />
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center text-muted-foreground py-12">
              Select a spell to see its details
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
