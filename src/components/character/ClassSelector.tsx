import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getAllClasses, getClassById, getClassFeaturesByLevel, getSubclassFeaturesByLevel } from '@/data'
import { useCharacterStore } from '@/stores/characterStore'
import type { CharacterClass, ClassFeature } from '@/types'
import { Minus, Plus } from 'lucide-react'

const ABILITY_LABELS: Record<string, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
}

function ClassCard({
  characterClass,
  selected,
  onSelect,
}: {
  characterClass: CharacterClass
  selected: boolean
  onSelect: () => void
}) {
  const primaryAbilities = characterClass.primaryAbility
    .map((a) => ABILITY_LABELS[a])
    .join('/')

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-lg border-2 transition-all hover:border-primary/50',
        selected ? 'border-primary bg-primary/5' : 'border-border'
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{characterClass.name}</h3>
          <p className="text-sm text-muted-foreground">
            d{characterClass.hitDie} Hit Die · {primaryAbilities}
          </p>
        </div>
        {characterClass.spellcasting && (
          <span className="text-xs font-medium bg-secondary px-2 py-1 rounded">
            Spellcaster
          </span>
        )}
      </div>
    </button>
  )
}

function FeatureList({ features, title }: { features: ClassFeature[]; title: string }) {
  if (features.length === 0) return null

  // Group features by level
  const featuresByLevel = features.reduce((acc, feature) => {
    if (!acc[feature.level]) {
      acc[feature.level] = []
    }
    acc[feature.level].push(feature)
    return acc
  }, {} as Record<number, ClassFeature[]>)

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm">{title}</h4>
      {Object.entries(featuresByLevel)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([level, levelFeatures]) => (
          <div key={level} className="pl-3 border-l-2 border-muted">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Level {level}
            </div>
            {levelFeatures.map((feature) => (
              <div key={feature.name} className="mb-2">
                <span className="font-medium text-sm">{feature.name}.</span>{' '}
                <span className="text-sm text-muted-foreground">
                  {feature.description.length > 200
                    ? feature.description.substring(0, 200) + '...'
                    : feature.description}
                </span>
              </div>
            ))}
          </div>
        ))}
    </div>
  )
}

function ClassDetails({ characterClass, level, subclassId }: {
  characterClass: CharacterClass
  level: number
  subclassId: string | null
}) {
  const classFeatures = getClassFeaturesByLevel(characterClass, level)
  const subclassFeatures = subclassId
    ? getSubclassFeaturesByLevel(characterClass, subclassId, level)
    : []

  const selectedSubclass = characterClass.subclasses.find(s => s.id === subclassId)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{characterClass.name}</CardTitle>
        <CardDescription>
          d{characterClass.hitDie} Hit Die · Saves:{' '}
          {characterClass.savingThrowProficiencies.map((s) => ABILITY_LABELS[s]).join(', ')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Proficiencies */}
        <div>
          <h4 className="font-medium text-sm mb-1">Armor & Weapons</h4>
          <p className="text-sm text-muted-foreground">
            {characterClass.armorProficiencies.length > 0
              ? `Armor: ${characterClass.armorProficiencies.join(', ')}`
              : 'No armor proficiencies'}
          </p>
          <p className="text-sm text-muted-foreground">
            Weapons: {characterClass.weaponProficiencies.join(', ')}
          </p>
        </div>

        {/* Spellcasting */}
        {characterClass.spellcasting && (
          <div>
            <h4 className="font-medium text-sm mb-1">Spellcasting</h4>
            <p className="text-sm text-muted-foreground">
              Spellcasting Ability: {ABILITY_LABELS[characterClass.spellcasting.ability]}
              {characterClass.spellcasting.preparedCaster && ' (Prepared caster)'}
            </p>
          </div>
        )}

        {/* Class Features */}
        <FeatureList features={classFeatures} title="Class Features" />

        {/* Subclass Features */}
        {selectedSubclass && subclassFeatures.length > 0 && (
          <FeatureList
            features={subclassFeatures}
            title={`${selectedSubclass.name} Features`}
          />
        )}
      </CardContent>
    </Card>
  )
}

export function ClassSelector() {
  const { draft, setClass, setSubclass, setLevel } = useCharacterStore()
  const classes = getAllClasses()
  const selectedClass = draft.classId ? getClassById(draft.classId) : null

  return (
    <div className="space-y-6">
      {/* Level Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Character Level</CardTitle>
          <CardDescription>
            Set your character's level to unlock class features and increase power
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main level control */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={() => setLevel(Math.max(1, draft.level - 1))}
              disabled={draft.level <= 1}
            >
              <Minus className="h-5 w-5" />
            </Button>
            <div className="flex flex-col items-center">
              <div className="text-5xl font-bold tabular-nums w-20 text-center">
                {draft.level}
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Level
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={() => setLevel(Math.min(20, draft.level + 1))}
              disabled={draft.level >= 20}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Quick select buttons */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Select</Label>
            <div className="flex flex-wrap gap-2 justify-center">
              {[1, 3, 5, 8, 10, 12, 15, 17, 20].map((lvl) => (
                <Button
                  key={lvl}
                  variant={draft.level === lvl ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'w-10 h-10 p-0 font-semibold',
                    draft.level === lvl && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  )}
                  onClick={() => setLevel(lvl)}
                >
                  {lvl}
                </Button>
              ))}
            </div>
          </div>

          {/* Tier indicator */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Tier: </span>
            <span className={cn(
              'font-medium',
              draft.level <= 4 && 'text-emerald-500',
              draft.level >= 5 && draft.level <= 10 && 'text-blue-500',
              draft.level >= 11 && draft.level <= 16 && 'text-purple-500',
              draft.level >= 17 && 'text-amber-500'
            )}>
              {draft.level <= 4 && 'Local Heroes (1-4)'}
              {draft.level >= 5 && draft.level <= 10 && 'Heroes of the Realm (5-10)'}
              {draft.level >= 11 && draft.level <= 16 && 'Masters of the Realm (11-16)'}
              {draft.level >= 17 && 'Masters of the World (17-20)'}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Class List */}
        <Card>
          <CardHeader>
            <CardTitle>Select Class</CardTitle>
            <CardDescription>
              Choose your character's class. This determines your abilities, hit points, and features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {classes.map((c) => (
                <ClassCard
                  key={c.id}
                  characterClass={c}
                  selected={draft.classId === c.id}
                  onSelect={() => setClass(c.id)}
                />
              ))}
            </div>

            {/* Subclass Selector - always show if class has subclasses */}
            {selectedClass && selectedClass.subclasses.length > 0 && (
              <div className="pt-4 border-t">
                <Label className="mb-2 block">
                  {selectedClass.name} Subclass
                  {draft.level < selectedClass.subclassLevel && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (features at level {selectedClass.subclassLevel})
                    </span>
                  )}
                </Label>
                <Select
                  value={draft.subclassId ?? ''}
                  onValueChange={(v) => setSubclass(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subclass" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedClass.subclasses.map((subclass) => (
                      <SelectItem key={subclass.id} value={subclass.id}>
                        {subclass.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {draft.subclassId && draft.level < selectedClass.subclassLevel && (
                  <p className="text-xs text-amber-500 mt-2">
                    Subclass features will activate at level {selectedClass.subclassLevel}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Class Details */}
        <div>
          {selectedClass ? (
            <ClassDetails
              characterClass={selectedClass}
              level={draft.level}
              subclassId={draft.subclassId}
            />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground py-12">
                Select a class to see its details
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
