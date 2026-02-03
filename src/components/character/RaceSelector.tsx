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
import { getAllRaces, getRaceById } from '@/data'
import {
  useCharacterStore,
  type ElfLineage,
  type GnomeLineage,
  type TieflingLegacy,
  type GoliathGiantAncestry,
  type OriginFeat,
  type KeenSensesSkill,
} from '@/stores/characterStore'
import type { Race, RacialAbility, DarkvisionAbility, DragonAncestry } from '@/types'
import { isDarkvisionAbility, DRAGON_ANCESTRIES } from '@/types'
import {
  Eye,
  Shield,
  Sword,
  Sparkles,
  Heart,
  Flame,
  Zap,
  Users,
  MessageSquare,
  Info,
  Palette,
  Trees,
  Mountain,
  Skull,
  Crown,
  Footprints,
  Award,
} from 'lucide-react'

// ==================== CHOICE DATA ====================

const ELF_LINEAGES: { id: ElfLineage; name: string; description: string }[] = [
  {
    id: 'drow',
    name: 'Drow',
    description: '120ft darkvision, Dancing Lights cantrip. At level 3: Faerie Fire. At level 5: Darkness.',
  },
  {
    id: 'high',
    name: 'High Elf',
    description: 'Prestidigitation cantrip (swappable on long rest). At level 3: Detect Magic. At level 5: Misty Step.',
  },
  {
    id: 'wood',
    name: 'Wood Elf',
    description: '35ft speed, Druidcraft cantrip. At level 3: Longstrider. At level 5: Pass without Trace.',
  },
]

const KEEN_SENSES_SKILLS: { id: KeenSensesSkill; name: string }[] = [
  { id: 'insight', name: 'Insight' },
  { id: 'perception', name: 'Perception' },
  { id: 'survival', name: 'Survival' },
]

const GNOME_LINEAGES: { id: GnomeLineage; name: string; description: string }[] = [
  {
    id: 'forest',
    name: 'Forest Gnome',
    description: 'Minor Illusion cantrip. Speak with Animals (PB times per long rest).',
  },
  {
    id: 'rock',
    name: 'Rock Gnome',
    description: 'Mending and Prestidigitation cantrips. Can create clockwork devices.',
  },
]

const TIEFLING_LEGACIES: { id: TieflingLegacy; name: string; resistance: string; cantrip: string; level3: string; level5: string }[] = [
  {
    id: 'abyssal',
    name: 'Abyssal',
    resistance: 'Poison',
    cantrip: 'Poison Spray',
    level3: 'Ray of Sickness',
    level5: 'Hold Person',
  },
  {
    id: 'chthonic',
    name: 'Chthonic',
    resistance: 'Necrotic',
    cantrip: 'Chill Touch',
    level3: 'False Life',
    level5: 'Ray of Enfeeblement',
  },
  {
    id: 'infernal',
    name: 'Infernal',
    resistance: 'Fire',
    cantrip: 'Fire Bolt',
    level3: 'Hellish Rebuke',
    level5: 'Darkness',
  },
]

const GOLIATH_ANCESTRIES: { id: GoliathGiantAncestry; name: string; description: string }[] = [
  {
    id: 'cloud',
    name: "Cloud's Jaunt",
    description: 'Bonus action to teleport up to 30 feet to an unoccupied space you can see.',
  },
  {
    id: 'fire',
    name: "Fire's Burn",
    description: 'When you hit with an attack, deal an extra 1d10 Fire damage.',
  },
  {
    id: 'frost',
    name: "Frost's Chill",
    description: 'When you hit with an attack, deal an extra 1d6 Cold damage and reduce target speed by 10ft.',
  },
  {
    id: 'hill',
    name: "Hill's Tumble",
    description: 'When you hit a Large or smaller creature, knock them Prone.',
  },
  {
    id: 'stone',
    name: "Stone's Endurance",
    description: 'Reaction when taking damage: reduce damage by 1d12 + Constitution modifier.',
  },
  {
    id: 'storm',
    name: "Storm's Thunder",
    description: 'Reaction when damaged by creature within 60ft: deal 1d8 Thunder damage to them.',
  },
]

interface OriginFeatBenefit {
  name: string
  description: string
}

interface OriginFeatData {
  id: OriginFeat
  name: string
  benefits: OriginFeatBenefit[]
}

const ORIGIN_FEATS: OriginFeatData[] = [
  {
    id: 'alert',
    name: 'Alert',
    benefits: [
      { name: 'Initiative Proficiency', description: 'When you roll Initiative, you can add your Proficiency Bonus to the roll.' },
      { name: 'Initiative Swap', description: "Immediately after you roll Initiative, you can swap your Initiative with one willing ally in the same combat. You can't make this swap if you or the ally has the Incapacitated condition." },
    ],
  },
  {
    id: 'crafter',
    name: 'Crafter',
    benefits: [
      { name: 'Tool Proficiency', description: "You gain proficiency with three different Artisan's Tools of your choice." },
      { name: 'Discount', description: 'Whenever you buy a nonmagical item, you receive a 20 percent discount on it.' },
      { name: 'Fast Crafting', description: "When you finish a Long Rest, you can craft one piece of gear (Ladder, Torch, Rope, Caltrops, etc.), provided you have the Artisan's Tools associated with that item. The item lasts until you finish another Long Rest." },
    ],
  },
  {
    id: 'healer',
    name: 'Healer',
    benefits: [
      { name: 'Battle Medic', description: "If you have a Healer's Kit, you can expend one use of it and tend to a creature within 5 feet as a Utilize action. That creature can expend one of its Hit Point Dice, and you roll that die. The creature regains Hit Points equal to the roll plus your Proficiency Bonus." },
      { name: 'Healing Rerolls', description: "Whenever you roll a die to determine Hit Points restored with a spell or Battle Medic, you can reroll the die if it rolls a 1, and you must use the new roll." },
    ],
  },
  {
    id: 'lucky',
    name: 'Lucky',
    benefits: [
      { name: 'Luck Points', description: 'You have Luck Points equal to your Proficiency Bonus. You regain all expended Luck Points when you finish a Long Rest.' },
      { name: 'Advantage', description: 'When you roll a d20 for a D20 Test, you can spend 1 Luck Point to give yourself Advantage on the roll.' },
      { name: 'Disadvantage', description: 'When a creature rolls a d20 for an attack roll against you, you can spend 1 Luck Point to impose Disadvantage on that roll.' },
    ],
  },
  {
    id: 'magic-initiate',
    name: 'Magic Initiate',
    benefits: [
      { name: 'Two Cantrips', description: 'You learn two cantrips of your choice from the Cleric, Druid, or Wizard spell list. Intelligence, Wisdom, or Charisma is your spellcasting ability (choose when you select this feat).' },
      { name: 'Level 1 Spell', description: 'Choose a level 1 spell from the same list. You always have it prepared. You can cast it once without a spell slot per Long Rest, or using any spell slots you have.' },
    ],
  },
  {
    id: 'musician',
    name: 'Musician',
    benefits: [
      { name: 'Instrument Training', description: 'You gain proficiency with three Musical Instruments of your choice.' },
      { name: 'Encouraging Song', description: 'As you finish a Short or Long Rest, you can play a song on a Musical Instrument with which you have proficiency and give Heroic Inspiration to allies who hear the song. The number of allies equals your Proficiency Bonus.' },
    ],
  },
  {
    id: 'savage-attacker',
    name: 'Savage Attacker',
    benefits: [
      { name: 'Damaging Strikes', description: "Once per turn when you hit a target with a weapon, you can roll the weapon's damage dice twice and use either roll against the target." },
    ],
  },
  {
    id: 'skilled',
    name: 'Skilled',
    benefits: [
      { name: 'Skill Proficiencies', description: 'You gain proficiency in any combination of three skills or tools of your choice.' },
      { name: 'Repeatable', description: 'You can take this feat more than once.' },
    ],
  },
  {
    id: 'tavern-brawler',
    name: 'Tavern Brawler',
    benefits: [
      { name: 'Enhanced Unarmed Strike', description: 'When you hit with your Unarmed Strike, you can deal Bludgeoning damage equal to 1d4 + your Strength modifier instead of normal Unarmed Strike damage.' },
      { name: 'Damage Rerolls', description: 'Whenever you roll a damage die for your Unarmed Strike, you can reroll the die if it rolls a 1, and you must use the new roll.' },
      { name: 'Improvised Weaponry', description: 'You have proficiency with improvised weapons.' },
      { name: 'Push', description: 'When you hit a creature with an Unarmed Strike as part of the Attack action, you can push it 5 feet away. Once per turn.' },
    ],
  },
  {
    id: 'tough',
    name: 'Tough',
    benefits: [
      { name: 'Hit Point Increase', description: 'Your Hit Point maximum increases by an amount equal to twice your character level when you gain this feat. Whenever you gain a level thereafter, your HP maximum increases by an additional 2.' },
    ],
  },
]

// ==================== HELPERS ====================

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

function getDarkvisionRange(race: Race): number | null {
  const darkvision = race.abilities.find(isDarkvisionAbility) as DarkvisionAbility | undefined
  return darkvision?.range ?? null
}

// ==================== COMPONENTS ====================

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
              {ability.maxUses}/rest
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{ability.description}</p>
      </div>
    </div>
  )
}

function RaceDetails({ race }: { race: Race }) {
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

// ==================== RACIAL CHOICES ====================

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
    setElfLineage,
    setElfKeenSensesSkill,
    setGnomeLineage,
    setTieflingLegacy,
    setGoliathGiantAncestry,
    setHumanOriginFeat,
  } = useCharacterStore()

  // ==================== HUMAN ====================
  if (raceId === 'human') {
    const selectedFeat = ORIGIN_FEATS.find(f => f.id === draft.humanOriginFeat)

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Origin Feat
          </CardTitle>
          <CardDescription>
            As a Human, you gain an Origin feat of your choice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm mb-2 block">Choose Feat</Label>
            <Select
              value={draft.humanOriginFeat ?? ''}
              onValueChange={(v) => setHumanOriginFeat((v as OriginFeat) || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an origin feat" />
              </SelectTrigger>
              <SelectContent>
                {ORIGIN_FEATS.map((feat) => (
                  <SelectItem key={feat.id} value={feat.id}>
                    {feat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFeat && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="font-semibold">{selectedFeat.name}</span>
              </div>
              <div className="space-y-2">
                {selectedFeat.benefits.map((benefit, index) => (
                  <div key={index} className="pl-1">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 mt-0.5 text-amber-400 shrink-0" />
                      <div>
                        <span className="font-medium text-sm">{benefit.name}</span>
                        <p className="text-sm text-muted-foreground">{benefit.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // ==================== ELF ====================
  if (raceId === 'elf') {
    const selectedLineage = ELF_LINEAGES.find(l => l.id === draft.elfLineage)

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trees className="w-5 h-5 text-emerald-400" />
            Elven Lineage
          </CardTitle>
          <CardDescription>
            Choose your elven lineage and a skill for Keen Senses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm mb-2 block">Lineage</Label>
            <Select
              value={draft.elfLineage ?? ''}
              onValueChange={(v) => setElfLineage((v as ElfLineage) || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select lineage" />
              </SelectTrigger>
              <SelectContent>
                {ELF_LINEAGES.map((lineage) => (
                  <SelectItem key={lineage.id} value={lineage.id}>
                    {lineage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLineage && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Trees className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">{selectedLineage.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">{selectedLineage.description}</p>
            </div>
          )}

          <div>
            <Label className="text-sm mb-2 block">Keen Senses Skill</Label>
            <Select
              value={draft.elfKeenSensesSkill ?? ''}
              onValueChange={(v) => setElfKeenSensesSkill((v as KeenSensesSkill) || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select skill" />
              </SelectTrigger>
              <SelectContent>
                {KEEN_SENSES_SKILLS.map((skill) => (
                  <SelectItem key={skill.id} value={skill.id}>
                    {skill.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ==================== GNOME ====================
  if (raceId === 'gnome') {
    const selectedLineage = GNOME_LINEAGES.find(l => l.id === draft.gnomeLineage)

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            Gnomish Lineage
          </CardTitle>
          <CardDescription>
            Choose your gnomish lineage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm mb-2 block">Lineage</Label>
            <Select
              value={draft.gnomeLineage ?? ''}
              onValueChange={(v) => setGnomeLineage((v as GnomeLineage) || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select lineage" />
              </SelectTrigger>
              <SelectContent>
                {GNOME_LINEAGES.map((lineage) => (
                  <SelectItem key={lineage.id} value={lineage.id}>
                    {lineage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLineage && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="font-medium">{selectedLineage.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">{selectedLineage.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // ==================== TIEFLING ====================
  if (raceId === 'tiefling') {
    const selectedLegacy = TIEFLING_LEGACIES.find(l => l.id === draft.tieflingLegacy)

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Skull className="w-5 h-5 text-red-400" />
            Fiendish Legacy
          </CardTitle>
          <CardDescription>
            Choose your fiendish legacy to determine your resistance and spells.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm mb-2 block">Legacy</Label>
            <Select
              value={draft.tieflingLegacy ?? ''}
              onValueChange={(v) => setTieflingLegacy((v as TieflingLegacy) || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select legacy" />
              </SelectTrigger>
              <SelectContent>
                {TIEFLING_LEGACIES.map((legacy) => (
                  <SelectItem key={legacy.id} value={legacy.id}>
                    {legacy.name}
                    <span className="text-muted-foreground ml-2">— {legacy.resistance} resistance</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLegacy && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="font-medium">Resistance:</span>
                <span className="text-muted-foreground">{selectedLegacy.resistance}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="font-medium">Cantrip:</span>
                <span className="text-muted-foreground">{selectedLegacy.cantrip}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="font-medium">Level 3:</span>
                <span className="text-muted-foreground">{selectedLegacy.level3}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="font-medium">Level 5:</span>
                <span className="text-muted-foreground">{selectedLegacy.level5}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // ==================== GOLIATH ====================
  if (raceId === 'goliath') {
    const selectedAncestry = GOLIATH_ANCESTRIES.find(a => a.id === draft.goliathGiantAncestry)

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mountain className="w-5 h-5 text-stone-400" />
            Giant Ancestry
          </CardTitle>
          <CardDescription>
            Choose your giant ancestry for a supernatural boon (PB uses per long rest).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm mb-2 block">Ancestry</Label>
            <Select
              value={draft.goliathGiantAncestry ?? ''}
              onValueChange={(v) => setGoliathGiantAncestry((v as GoliathGiantAncestry) || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select giant ancestry" />
              </SelectTrigger>
              <SelectContent>
                {GOLIATH_ANCESTRIES.map((ancestry) => (
                  <SelectItem key={ancestry.id} value={ancestry.id}>
                    {ancestry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAncestry && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-stone-400" />
                <span className="font-medium">{selectedAncestry.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">{selectedAncestry.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // ==================== DRAGONBORN ====================
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
            Choose your dragon ancestry for your breath weapon and damage resistance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm mb-2 block">Dragon Type</Label>
            <Select
              value={draft.dragonbornAncestry ?? ''}
              onValueChange={(v) => setDragonbornAncestry((v as DragonAncestry) || null)}
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
                      — {ancestry.damageType}
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
                15ft cone or 30ft line of {selectedAncestry.damageType} damage. DEX save for half.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Shield className={cn('w-4 h-4', ANCESTRY_COLORS[selectedAncestry.ancestry])} />
                <span className="font-medium">Damage Resistance</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Resistance to {selectedAncestry.damageType} damage.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Footprints className={cn('w-4 h-4', ANCESTRY_COLORS[selectedAncestry.ancestry])} />
                <span className="font-medium">Draconic Flight (Level 5)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Sprout spectral wings for 10 minutes, fly speed = walking speed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return null
}

// ==================== MAIN COMPONENT ====================

export function RaceSelector() {
  const { draft, setRace } = useCharacterStore()
  const races = getAllRaces()
  const selectedRace = draft.raceId ? getRaceById(draft.raceId) : null

  // Races that require choices
  const requiresChoices = [
    'human',
    'elf',
    'gnome',
    'tiefling',
    'goliath',
    'dragonborn',
  ].includes(draft.raceId ?? '')

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
