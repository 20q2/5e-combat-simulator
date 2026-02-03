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
import { getAllRaces, getRaceById, getAllSpells } from '@/data'
import { useCharacterStore } from '@/stores/characterStore'
import type { Race, RacialAbility, DarkvisionAbility, DragonAncestry } from '@/types'
import { isDarkvisionAbility, DRAGON_ANCESTRIES } from '@/types'
import { Eye, Shield, Sword, Sparkles, Heart, Flame, Zap, Users, MessageSquare, Info, Palette, BookOpen } from 'lucide-react'

// Get icon for ability type
function getAbilityIcon(type: RacialAbility['type']) {
  switch (type) {
    case 'darkvision':
      return <Eye className="w-3.5 h-3.5" />
    case 'resistance':
      return <Shield className="w-3.5 h-3.5" />
    case 'proficiency':
      return <Sword className="w-3.5 h-3.5" />
    case 'save_advantage':
      return <Shield className="w-3.5 h-3.5" />
    case 'reroll':
      return <Sparkles className="w-3.5 h-3.5" />
    case 'triggered_heal':
      return <Heart className="w-3.5 h-3.5" />
    case 'bonus_damage':
      return <Zap className="w-3.5 h-3.5" />
    case 'breath_weapon':
      return <Flame className="w-3.5 h-3.5" />
    case 'bonus_cantrip':
    case 'bonus_spell':
      return <Sparkles className="w-3.5 h-3.5" />
    default:
      return null
  }
}

// Get color for ability type
function getAbilityColor(type: RacialAbility['type']): string {
  switch (type) {
    case 'resistance':
      return 'text-blue-400'
    case 'save_advantage':
      return 'text-green-400'
    case 'triggered_heal':
      return 'text-rose-400'
    case 'bonus_damage':
      return 'text-orange-400'
    case 'breath_weapon':
      return 'text-red-400'
    case 'bonus_cantrip':
    case 'bonus_spell':
      return 'text-violet-400'
    case 'darkvision':
      return 'text-amber-400'
    default:
      return 'text-muted-foreground'
  }
}

// Get trigger label
function getTriggerLabel(trigger: RacialAbility['trigger']): string | null {
  switch (trigger) {
    case 'action':
      return 'Action'
    case 'bonus_action':
      return 'Bonus'
    case 'reaction':
      return 'Reaction'
    default:
      return null
  }
}

// Get darkvision range from race abilities
function getDarkvisionRange(race: Race): number | null {
  const darkvision = race.abilities.find(isDarkvisionAbility) as DarkvisionAbility | undefined
  return darkvision?.range ?? null
}

function RaceCard({
  race,
  selected,
  onSelect,
}: {
  race: Race
  selected: boolean
  onSelect: () => void
}) {
  const darkvision = getDarkvisionRange(race)

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-lg border-2 transition-all hover:border-primary/50',
        selected ? 'border-primary bg-primary/5' : 'border-border'
      )}
    >
      <div>
        <h3 className="font-semibold">{race.name}</h3>
        <p className="text-sm text-muted-foreground">
          {race.size.charAt(0).toUpperCase() + race.size.slice(1)} · Speed {race.speed} ft
          {darkvision ? ` · Darkvision ${darkvision} ft` : ''}
        </p>
      </div>
    </button>
  )
}

function AbilityItem({ ability }: { ability: RacialAbility }) {
  const icon = getAbilityIcon(ability.type)
  const color = getAbilityColor(ability.type)
  const triggerLabel = getTriggerLabel(ability.trigger)

  return (
    <div className="flex items-start gap-2">
      {icon && <span className={cn('mt-0.5 shrink-0', color)}>{icon}</span>}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{ability.name}</span>
          {triggerLabel && (
            <span className="text-[10px] px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">
              {triggerLabel}
            </span>
          )}
          {ability.maxUses && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
              {ability.maxUses}/combat
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{ability.description}</p>
      </div>
    </div>
  )
}

function RaceDetails({ race }: { race: Race }) {
  // Group abilities by category
  const passiveAbilities = race.abilities.filter(
    a => a.trigger === 'passive' && a.type !== 'trait'
  )
  const triggeredAbilities = race.abilities.filter(
    a => ['on_damage_taken', 'on_attack_roll', 'on_ability_check', 'on_saving_throw'].includes(a.trigger)
  )
  const activeAbilities = race.abilities.filter(
    a => ['action', 'bonus_action', 'reaction'].includes(a.trigger)
  )
  const traitAbilities = race.abilities.filter(a => a.type === 'trait')

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          {race.name}
        </CardTitle>
        <CardDescription>
          {race.size.charAt(0).toUpperCase() + race.size.slice(1)} creature · Speed {race.speed} ft
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Passive Abilities */}
        {passiveAbilities.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 text-blue-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Passive Abilities
            </h4>
            <div className="space-y-3">
              {passiveAbilities.map((ability) => (
                <AbilityItem key={ability.id} ability={ability} />
              ))}
            </div>
          </div>
        )}

        {/* Triggered Abilities */}
        {triggeredAbilities.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 text-green-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Triggered Abilities
            </h4>
            <div className="space-y-3">
              {triggeredAbilities.map((ability) => (
                <AbilityItem key={ability.id} ability={ability} />
              ))}
            </div>
          </div>
        )}

        {/* Active Abilities */}
        {activeAbilities.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 text-amber-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              Active Abilities
            </h4>
            <div className="space-y-3">
              {activeAbilities.map((ability) => (
                <AbilityItem key={ability.id} ability={ability} />
              ))}
            </div>
          </div>
        )}

        {/* Other Traits */}
        {traitAbilities.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Other Traits
            </h4>
            <div className="space-y-3">
              {traitAbilities.map((ability) => (
                <AbilityItem key={ability.id} ability={ability} />
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        <div>
          <h4 className="font-medium text-sm mb-1 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            Languages
          </h4>
          <p className="text-sm text-muted-foreground">{race.languages.join(', ')}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Dragonborn ancestry colors for display
const ANCESTRY_COLORS: Record<DragonAncestry, string> = {
  black: 'text-slate-400',
  blue: 'text-blue-400',
  brass: 'text-amber-400',
  bronze: 'text-orange-400',
  copper: 'text-orange-300',
  gold: 'text-yellow-400',
  green: 'text-green-400',
  red: 'text-red-400',
  silver: 'text-slate-300',
  white: 'text-cyan-200',
}

function RacialChoices({ raceId }: { raceId: string }) {
  const {
    draft,
    setDragonbornAncestry,
    setHighElfCantrip,
  } = useCharacterStore()

  // Get wizard cantrips for high elf
  const wizardCantrips = useMemo(() => {
    const allSpells = getAllSpells()
    return allSpells.filter(s => s.level === 0 && s.classes.includes('wizard'))
  }, [])

  // Dragonborn ancestry choice
  if (raceId === 'dragonborn') {
    const selectedAncestry = draft.dragonbornAncestry
      ? DRAGON_ANCESTRIES.find(a => a.ancestry === draft.dragonbornAncestry)
      : null

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="w-5 h-5 text-red-400" />
            Draconic Ancestry
          </CardTitle>
          <CardDescription>
            Choose your dragon ancestry to determine your breath weapon and damage resistance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm mb-2 block">Dragon Color</Label>
            <Select
              value={draft.dragonbornAncestry ?? ''}
              onValueChange={(v) => setDragonbornAncestry(v as DragonAncestry || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select dragon ancestry" />
              </SelectTrigger>
              <SelectContent>
                {DRAGON_ANCESTRIES.map((ancestry) => (
                  <SelectItem key={ancestry.ancestry} value={ancestry.ancestry}>
                    <span className={ANCESTRY_COLORS[ancestry.ancestry]}>
                      {ancestry.ancestry.charAt(0).toUpperCase() + ancestry.ancestry.slice(1)}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      — {ancestry.damageType} ({ancestry.breathSize} ft {ancestry.breathShape})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAncestry && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Flame className={cn('w-4 h-4', ANCESTRY_COLORS[selectedAncestry.ancestry])} />
                <span className="font-medium">Breath Weapon</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedAncestry.breathSize} ft {selectedAncestry.breathShape} of {selectedAncestry.damageType} damage.
                DEX save for half damage.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Shield className={cn('w-4 h-4', ANCESTRY_COLORS[selectedAncestry.ancestry])} />
                <span className="font-medium">Damage Resistance</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Resistance to {selectedAncestry.damageType} damage.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // High Elf cantrip choice
  if (raceId === 'elf') {
    const selectedSpell = wizardCantrips.find(s => s.id === draft.highElfCantrip)

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-400" />
            Wizard Cantrip
          </CardTitle>
          <CardDescription>
            As an Elf, you know one cantrip of your choice from the wizard spell list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm mb-2 block">Choose Cantrip</Label>
            <Select
              value={draft.highElfCantrip ?? ''}
              onValueChange={(v) => setHighElfCantrip(v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a wizard cantrip" />
              </SelectTrigger>
              <SelectContent>
                {wizardCantrips.map((spell) => (
                  <SelectItem key={spell.id} value={spell.id}>
                    {spell.name}
                    {spell.damage && (
                      <span className="text-muted-foreground ml-2">
                        — {spell.damage.dice} {spell.damage.type}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSpell && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="font-medium">{selectedSpell.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-secondary rounded">
                  {selectedSpell.school}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{selectedSpell.description}</p>
              {selectedSpell.damage && (
                <p className="text-sm text-violet-400 mt-1">
                  {selectedSpell.damage.dice} {selectedSpell.damage.type} damage
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return null
}

export function RaceSelector() {
  const { draft, setRace } = useCharacterStore()
  const races = getAllRaces()
  const selectedRace = draft.raceId ? getRaceById(draft.raceId) : null

  // Check if race requires choices
  const requiresChoices = draft.raceId === 'dragonborn' || draft.raceId === 'elf'

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Race List */}
      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Select Race
          </CardTitle>
          <CardDescription>
            Choose your character's race. Each race has unique traits and abilities.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-2 pr-2">
            {races.map((race) => (
              <RaceCard
                key={race.id}
                race={race}
                selected={draft.raceId === race.id}
                onSelect={() => setRace(race.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Race Details and Choices */}
      <div className="space-y-4">
        {selectedRace ? (
          <>
            <RaceDetails race={selectedRace} />
            {requiresChoices && <RacialChoices raceId={selectedRace.id} />}
          </>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center text-muted-foreground py-12">
              Select a race to see its details
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
