import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { getClassById } from '@/data'
import { useCharacterStore } from '@/stores/characterStore'
import { isFightingStyleFeature, isAdditionalFightingStyleFeature } from '@/types'
import type { FightingStyle, FightingStyleFeature } from '@/types'
import { Swords, Shield, Target, CircleDot, Users, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface FightingStyleInfo {
  name: string
  description: string
  benefit: string
  icon: React.ReactNode
}

const FIGHTING_STYLE_INFO: Record<FightingStyle, FightingStyleInfo> = {
  archery: {
    name: 'Archery',
    description: 'You gain a +2 bonus to attack rolls you make with ranged weapons.',
    benefit: '+2 ranged attack',
    icon: <Target className="w-4 h-4" />,
  },
  defense: {
    name: 'Defense',
    description: 'While you are wearing armor, you gain a +1 bonus to AC.',
    benefit: '+1 AC (armor)',
    icon: <Shield className="w-4 h-4" />,
  },
  dueling: {
    name: 'Dueling',
    description: 'When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.',
    benefit: '+2 melee damage',
    icon: <Swords className="w-4 h-4" />,
  },
  great_weapon: {
    name: 'Great Weapon Fighting',
    description: 'When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two hands, you can reroll the die and must use the new roll.',
    benefit: 'Reroll 1s/2s damage',
    icon: <Zap className="w-4 h-4" />,
  },
  protection: {
    name: 'Protection',
    description: 'When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll. You must be wielding a shield.',
    benefit: 'Protect allies',
    icon: <Users className="w-4 h-4" />,
  },
  two_weapon: {
    name: 'Two-Weapon Fighting',
    description: 'When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack.',
    benefit: '+mod off-hand',
    icon: <CircleDot className="w-4 h-4" />,
  },
}

function getStyleColorClass(style: FightingStyle, isSelected: boolean): string {
  if (!isSelected) return 'border-border hover:border-primary/50'

  switch (style) {
    case 'archery':
      return 'border-green-500 bg-green-500/10'
    case 'defense':
      return 'border-blue-500 bg-blue-500/10'
    case 'dueling':
      return 'border-orange-500 bg-orange-500/10'
    case 'great_weapon':
      return 'border-red-500 bg-red-500/10'
    case 'protection':
      return 'border-cyan-500 bg-cyan-500/10'
    case 'two_weapon':
      return 'border-purple-500 bg-purple-500/10'
    default:
      return 'border-primary bg-primary/10'
  }
}

interface StyleCardProps {
  style: FightingStyle
  isSelected: boolean
  isDisabled: boolean
  onSelect: () => void
}

function StyleCard({ style, isSelected, isDisabled, onSelect }: StyleCardProps) {
  const info = FIGHTING_STYLE_INFO[style]

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={cn(
        'w-full text-left p-3 rounded-lg border-2 transition-all',
        getStyleColorClass(style, isSelected),
        isDisabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {info.icon}
        <span className="font-medium text-sm">{info.name}</span>
        <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {info.benefit}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {info.description}
      </p>
    </button>
  )
}

interface FightingStyleSelectorInnerProps {
  title: string
  description: string
  availableStyles: FightingStyle[]
  selectedStyle: FightingStyle | null
  onSelectStyle: (style: FightingStyle | null) => void
  disabledStyles?: FightingStyle[]
}

function FightingStyleSelectorInner({
  title,
  description,
  availableStyles,
  selectedStyle,
  onSelectStyle,
  disabledStyles = [],
}: FightingStyleSelectorInnerProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Swords className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {availableStyles.map((style) => (
            <StyleCard
              key={style}
              style={style}
              isSelected={selectedStyle === style}
              isDisabled={disabledStyles.includes(style)}
              onSelect={() => {
                if (selectedStyle === style) {
                  onSelectStyle(null)
                } else {
                  onSelectStyle(style)
                }
              }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function FightingStyleSelector() {
  const draft = useCharacterStore((state) => state.draft)
  const setFightingStyle = useCharacterStore((state) => state.setFightingStyle)
  const setAdditionalFightingStyle = useCharacterStore((state) => state.setAdditionalFightingStyle)

  const characterClass = draft.classId ? getClassById(draft.classId) : null

  // Find fighting style feature for current level
  const fightingStyleFeature = useMemo((): FightingStyleFeature | null => {
    if (!characterClass) return null

    const allFeatures = [
      ...characterClass.features,
      ...(characterClass.subclasses.find(s => s.id === draft.subclassId)?.features ?? []),
    ]

    for (const feature of allFeatures) {
      if (isFightingStyleFeature(feature) && feature.level <= draft.level) {
        return feature
      }
    }

    return null
  }, [characterClass, draft.subclassId, draft.level])

  // Find additional fighting style feature (Champion level 10)
  const additionalFightingStyleFeature = useMemo(() => {
    if (!characterClass) return null

    const allFeatures = [
      ...characterClass.features,
      ...(characterClass.subclasses.find(s => s.id === draft.subclassId)?.features ?? []),
    ]

    for (const feature of allFeatures) {
      if (isAdditionalFightingStyleFeature(feature) && feature.level <= draft.level) {
        return feature
      }
    }

    return null
  }, [characterClass, draft.subclassId, draft.level])

  // Don't render if no fighting style feature
  if (!fightingStyleFeature) {
    return null
  }

  const availableStyles = fightingStyleFeature.availableStyles ?? []

  // If no styles defined, don't render
  if (availableStyles.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <FightingStyleSelectorInner
        title="Fighting Style"
        description="Choose a fighting style to specialize in."
        availableStyles={availableStyles}
        selectedStyle={draft.fightingStyle}
        onSelectStyle={setFightingStyle}
      />

      {additionalFightingStyleFeature && (
        <FightingStyleSelectorInner
          title="Additional Fighting Style"
          description="As a Champion, choose a second fighting style."
          availableStyles={availableStyles}
          selectedStyle={draft.additionalFightingStyle}
          onSelectStyle={setAdditionalFightingStyle}
          disabledStyles={draft.fightingStyle ? [draft.fightingStyle] : []}
        />
      )}
    </div>
  )
}
