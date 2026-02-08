import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getSpellsByClass } from '@/data'
import type { Spell } from '@/types'
import type {
  MagicInitiateChoice,
  MagicInitiateSpellList,
  MagicInitiateAbility,
} from '@/stores/characterStore'
import { Wand2, Sparkles, BookOpen } from 'lucide-react'

interface MagicInitiateSpellSelectorProps {
  value: MagicInitiateChoice | null
  onChange: (choice: MagicInitiateChoice | null) => void
  /** Title for the card (e.g., "Magic Initiate (Human)" or "Magic Initiate (Background)") */
  title?: string
}

const SPELL_LISTS: { value: MagicInitiateSpellList; label: string }[] = [
  { value: 'cleric', label: 'Cleric' },
  { value: 'druid', label: 'Druid' },
  { value: 'wizard', label: 'Wizard' },
]

const SPELLCASTING_ABILITIES: { value: MagicInitiateAbility; label: string }[] = [
  { value: 'intelligence', label: 'Intelligence' },
  { value: 'wisdom', label: 'Wisdom' },
  { value: 'charisma', label: 'Charisma' },
]

function SpellOption({
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
        'w-full text-left p-2 rounded-lg border transition-all text-sm',
        selected ? 'border-primary bg-primary/10' : 'border-border bg-slate-800/40',
        disabled && !selected ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 hover:bg-slate-800/60 cursor-pointer'
      )}
    >
      <div className="flex justify-between items-center gap-2">
        <span className="font-medium truncate">{spell.name}</span>
        <div
          className={cn(
            'w-4 h-4 rounded border shrink-0 flex items-center justify-center text-xs',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground'
          )}
        >
          {selected && '✓'}
        </div>
      </div>
      <p className="text-xs text-muted-foreground truncate">
        {spell.school.charAt(0).toUpperCase() + spell.school.slice(1)}
        {spell.damage && ` · ${spell.damage.dice} ${spell.damage.type}`}
      </p>
    </button>
  )
}

export function MagicInitiateSpellSelector({
  value,
  onChange,
  title = 'Magic Initiate Spells',
}: MagicInitiateSpellSelectorProps) {
  // Get spells for selected list
  const spellList = value?.spellList ?? null
  const availableSpells = useMemo(() => {
    if (!spellList) return []
    return getSpellsByClass(spellList)
  }, [spellList])

  const cantrips = availableSpells.filter((s) => s.level === 0)
  const levelOneSpells = availableSpells.filter((s) => s.level === 1)

  const handleSpellListChange = (newList: MagicInitiateSpellList) => {
    onChange({
      spellList: newList,
      spellcastingAbility: value?.spellcastingAbility ?? 'intelligence',
      cantrips: [],
      levelOneSpell: null,
    })
  }

  const handleAbilityChange = (ability: MagicInitiateAbility) => {
    if (!value) return
    onChange({
      ...value,
      spellcastingAbility: ability,
    })
  }

  const handleCantripToggle = (spellId: string) => {
    if (!value) return
    const current = value.cantrips
    const isSelected = current.includes(spellId)

    if (isSelected) {
      onChange({
        ...value,
        cantrips: current.filter((id) => id !== spellId),
      })
    } else if (current.length < 2) {
      onChange({
        ...value,
        cantrips: [...current, spellId],
      })
    }
  }

  const handleLevelOneSpellToggle = (spellId: string) => {
    if (!value) return
    onChange({
      ...value,
      levelOneSpell: value.levelOneSpell === spellId ? null : spellId,
    })
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-amber-400" />
          {title}
        </CardTitle>
        <CardDescription>
          Choose a spell list, your spellcasting ability, 2 cantrips, and 1 level 1 spell.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Spell List Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm mb-2 block">Spell List</Label>
            <Select
              value={spellList ?? ''}
              onValueChange={(v) => handleSpellListChange(v as MagicInitiateSpellList)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a class" />
              </SelectTrigger>
              <SelectContent>
                {SPELL_LISTS.map((list) => (
                  <SelectItem key={list.value} value={list.value}>
                    {list.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm mb-2 block">Spellcasting Ability</Label>
            <Select
              value={value?.spellcastingAbility ?? ''}
              onValueChange={(v) => handleAbilityChange(v as MagicInitiateAbility)}
              disabled={!spellList}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose ability" />
              </SelectTrigger>
              <SelectContent>
                {SPELLCASTING_ABILITIES.map((ability) => (
                  <SelectItem key={ability.value} value={ability.value}>
                    {ability.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {spellList && (
          <div className="grid grid-cols-2 gap-4">
            {/* Cantrips */}
            <div>
              <Label className="text-sm mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Cantrips ({value?.cantrips.length ?? 0}/2)
              </Label>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {cantrips.length > 0 ? (
                  cantrips.map((spell) => (
                    <SpellOption
                      key={spell.id}
                      spell={spell}
                      selected={value?.cantrips.includes(spell.id) ?? false}
                      onToggle={() => handleCantripToggle(spell.id)}
                      disabled={(value?.cantrips.length ?? 0) >= 2}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No cantrips available</p>
                )}
              </div>
            </div>

            {/* Level 1 Spell */}
            <div>
              <Label className="text-sm mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                Level 1 Spell ({value?.levelOneSpell ? 1 : 0}/1)
              </Label>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {levelOneSpells.length > 0 ? (
                  levelOneSpells.map((spell) => (
                    <SpellOption
                      key={spell.id}
                      spell={spell}
                      selected={value?.levelOneSpell === spell.id}
                      onToggle={() => handleLevelOneSpellToggle(spell.id)}
                      disabled={!!value?.levelOneSpell && value.levelOneSpell !== spell.id}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No level 1 spells available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
