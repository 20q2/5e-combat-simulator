import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getClassIcon } from '@/lib/classIcons'
import { getAllClasses, getClassById, getClassFeaturesByLevel, getSubclassFeaturesByLevel } from '@/data'
import { useCharacterStore } from '@/stores/characterStore'
import type { CharacterClass, ClassFeature } from '@/types'
import { Minus, Plus, Crown, Sparkles, Shield, Info, Wand2 } from 'lucide-react'

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
  currentLevel,
  totalLevel,
  isSelected,
  onLevelChange,
  onSelect,
}: {
  characterClass: CharacterClass
  currentLevel: number
  totalLevel: number
  isSelected: boolean
  onLevelChange: (level: number) => void
  onSelect: () => void
}) {
  const primaryAbilities = characterClass.primaryAbility
    .map((a) => ABILITY_LABELS[a])
    .join('/')
  const classIcon = getClassIcon(characterClass.id)

  return (
    <div
      className={cn(
        'w-full text-left p-4 rounded-lg border-2 transition-all',
        'hover:border-primary/50 hover:bg-slate-800/60',
        currentLevel > 0 ? 'border-primary bg-primary/5' : 'border-border bg-slate-800/40',
        isSelected && 'ring-2 ring-primary/50 ring-offset-1 ring-offset-background'
      )}
    >
      <div className="flex justify-between items-center">
        <button onClick={onSelect} className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer text-left">
          {classIcon && (
            <img src={classIcon} alt={characterClass.name} className="w-10 h-10 object-contain invert" />
          )}
          <div className="min-w-0">
            <h3 className="font-semibold">{characterClass.name}</h3>
            <p className="text-sm text-muted-foreground">
              d{characterClass.hitDie} Hit Die · {primaryAbilities}
            </p>
          </div>
          {characterClass.spellcasting && (
            <span className="text-xs font-medium bg-secondary px-2 py-1 rounded shrink-0">
              Spellcaster
            </span>
          )}
        </button>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={(e) => { e.stopPropagation(); onLevelChange(currentLevel - 1) }}
            disabled={currentLevel <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className={cn(
            "text-lg font-bold w-8 text-center tabular-nums",
            currentLevel > 0 ? "text-primary" : "text-muted-foreground"
          )}>
            {currentLevel}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={(e) => { e.stopPropagation(); onLevelChange(currentLevel + 1) }}
            disabled={totalLevel >= 20}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
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
      <h4 className="font-medium text-sm flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
        {title}
      </h4>
      {Object.entries(featuresByLevel)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([level, levelFeatures], idx) => (
          <div key={level} className={cn(
            "pl-3 border-l-2 rounded-r-lg py-2 pr-2 -ml-1",
            idx % 2 === 0 ? "bg-muted/20 border-muted-foreground/30" : "bg-muted/10 border-muted-foreground/20"
          )}>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Level {level}
            </div>
            {levelFeatures.map((feature) => {
              const isAsi = feature.name === 'Ability Score Improvement'
              return (
                <div key={feature.name} className={cn("mb-2", isAsi && "opacity-50")}>
                  <span className={cn("text-sm", isAsi ? "text-muted-foreground" : "font-medium")}>{feature.name}.</span>{' '}
                  {!isAsi && (
                    <span className="text-sm text-muted-foreground">
                      {feature.description.length > 200
                        ? feature.description.substring(0, 200) + '...'
                        : feature.description}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
    </div>
  )
}

function MulticlassDetails({ classEntries, focusedClassId }: {
  classEntries: Array<{ classId: string; level: number; subclassId: string | null }>
  focusedClassId: string | null
}) {
  const activeEntries = classEntries.filter(e => e.level > 0)

  if (activeEntries.length === 0) {
    return (
      <Card className="flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground py-12">
          Add levels to a class to see its features
        </CardContent>
      </Card>
    )
  }

  // If a class is focused, show it first
  const sortedEntries = focusedClassId
    ? [...activeEntries].sort((a, b) => {
        if (a.classId === focusedClassId) return -1
        if (b.classId === focusedClassId) return 1
        return 0
      })
    : activeEntries

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          Class Features
        </CardTitle>
        <CardDescription>
          Total Level: {activeEntries.reduce((s, e) => s + e.level, 0)} / 20
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 flex-1 overflow-y-auto">
        {sortedEntries.map(entry => {
          const classData = getClassById(entry.classId)
          if (!classData) return null
          const classIcon = getClassIcon(entry.classId)
          const classFeatures = getClassFeaturesByLevel(classData, entry.level)
          const subclassFeatures = entry.subclassId
            ? getSubclassFeaturesByLevel(classData, entry.subclassId, entry.level)
            : []
          const selectedSubclass = classData.subclasses.find(s => s.id === entry.subclassId)

          return (
            <div key={entry.classId} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                {classIcon ? (
                  <img src={classIcon} alt={classData.name} className="w-7 h-7 object-contain invert" />
                ) : (
                  <Info className="w-5 h-5 text-blue-400" />
                )}
                <div>
                  <h3 className="font-semibold">{classData.name} (Level {entry.level})</h3>
                  <p className="text-xs text-muted-foreground">
                    d{classData.hitDie} Hit Die · Saves: {classData.savingThrowProficiencies.map(s => ABILITY_LABELS[s]).join(', ')}
                  </p>
                </div>
              </div>

              {/* Proficiencies */}
              <div>
                <h4 className="font-medium text-sm mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  Armor & Weapons
                </h4>
                <p className="text-sm text-muted-foreground">
                  {classData.armorProficiencies.length > 0
                    ? `Armor: ${classData.armorProficiencies.join(', ')}`
                    : 'No armor proficiencies'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Weapons: {classData.weaponProficiencies.join(', ')}
                </p>
              </div>

              {/* Spellcasting */}
              {classData.spellcasting && (
                <div>
                  <h4 className="font-medium text-sm mb-1 flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-violet-400" />
                    Spellcasting
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Spellcasting Ability: {ABILITY_LABELS[classData.spellcasting.ability]}
                    {classData.spellcasting.preparedCaster && ' (Prepared caster)'}
                  </p>
                </div>
              )}

              <FeatureList features={classFeatures} title="Class Features" />

              {selectedSubclass && subclassFeatures.length > 0 && (
                <FeatureList
                  features={subclassFeatures}
                  title={`${selectedSubclass.name} Features`}
                />
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export function ClassSelector() {
  const { draft, setClassLevel } = useCharacterStore()
  const classes = getAllClasses()
  const [focusedClassId, setFocusedClassId] = useState<string | null>(
    draft.classEntries.length > 0 ? draft.classEntries[0].classId : null
  )

  const totalLevel = draft.classEntries.reduce((s, e) => s + e.level, 0)

  // Build summary text
  const activeEntries = draft.classEntries.filter(e => e.level > 0)
  const summaryText = activeEntries.length > 0
    ? activeEntries.map(e => {
        const cd = getClassById(e.classId)
        return `${cd?.name ?? e.classId} ${e.level}`
      }).join(' / ')
    : 'No classes selected'

  return (
    <div className="space-y-6">
      {/* Total Level Summary */}
      <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/30 border border-border">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <span className="font-medium">Total Level: {totalLevel} / 20</span>
        </div>
        <span className="text-sm text-muted-foreground">{summaryText}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-stretch">
        {/* Class List */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              Classes
            </CardTitle>
            <CardDescription>
              Add levels to one or more classes. Your total level cannot exceed 20.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-2 overflow-y-auto pr-2">
              {classes.map((c) => {
                const entry = draft.classEntries.find(e => e.classId === c.id)
                return (
                  <ClassCard
                    key={c.id}
                    characterClass={c}
                    currentLevel={entry?.level ?? 0}
                    totalLevel={totalLevel}
                    isSelected={focusedClassId === c.id}
                    onLevelChange={(lvl) => setClassLevel(c.id, lvl)}
                    onSelect={() => setFocusedClassId(c.id)}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Class Details */}
        <MulticlassDetails
          classEntries={draft.classEntries}
          focusedClassId={focusedClassId}
        />
      </div>
    </div>
  )
}
