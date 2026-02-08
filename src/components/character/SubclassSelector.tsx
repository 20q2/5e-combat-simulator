import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { FightingStyleSelector } from './FightingStyleSelector'
import { ManeuverSelector } from './ManeuverSelector'
import { ASISelector } from './ASISelector'
import { useCharacterStore } from '@/stores/characterStore'
import { getClassById, getSubclassFeaturesByLevel } from '@/data'
import { getClassIcon } from '@/lib/classIcons'
import { useMemo } from 'react'
import {
  isFightingStyleFeature,
  isCombatSuperiorityFeature,
} from '@/types'
import { cn } from '@/lib/utils'
import { Sparkles, BookOpen } from 'lucide-react'

/**
 * SubclassSelector - Unified component for selecting class and subclass options
 *
 * Shows relevant selectors based on character's class and subclass:
 * - Fighting Styles (Fighter, Paladin, Ranger - class feature)
 * - Battle Master Maneuvers (Fighter - Battle Master subclass feature)
 */

// Class-specific flavor descriptions
const CLASS_DESCRIPTIONS: Record<string, string> = {
  fighter: 'Master of weapons, armor, and tactical superiority',
  wizard: 'Arcane scholar wielding reality-bending magic',
  rogue: 'Cunning expert in stealth, deception, and precision strikes',
  cleric: 'Divine champion channeling the power of the gods',
  ranger: 'Wilderness warrior blending martial prowess with nature magic',
  paladin: 'Holy warrior bound by sacred oath and divine might',
  barbarian: 'Primal warrior unleashing devastating rage',
  bard: 'Charismatic performer weaving magic through music and words',
  druid: 'Nature\'s guardian shapeshifting between wild forms',
  monk: 'Martial artist harnessing ki to transcend physical limits',
  sorcerer: 'Innate spellcaster with magic flowing through their veins',
  warlock: 'Pact-bound wielder of otherworldly power',
}

function getClassDescription(classId: string): string {
  return CLASS_DESCRIPTIONS[classId] || 'Customize your character with specialized options and abilities'
}
export function SubclassSelector() {
  const draft = useCharacterStore((state) => state.draft)
  const setSubclass = useCharacterStore((state) => state.setSubclass)

  const characterClass = draft.classId ? getClassById(draft.classId) : null

  // Check what features are available
  const hasFeatures = useMemo(() => {
    if (!characterClass) return false

    const allFeatures = [
      ...characterClass.features,
      ...(characterClass.subclasses.find(s => s.id === draft.subclassId)?.features ?? []),
    ]

    // Check for any selectable features
    const hasFightingStyle = allFeatures.some(f =>
      isFightingStyleFeature(f) && f.level <= draft.level && f.availableStyles && f.availableStyles.length > 0
    )
    const hasManeuvers = allFeatures.some(f =>
      isCombatSuperiorityFeature(f) && f.level <= draft.level
    )
    const hasAsi = characterClass.features.some(f =>
      f.type === 'generic' &&
      f.name === 'Ability Score Improvement' &&
      f.level <= draft.level
    )

    return hasFightingStyle || hasManeuvers || hasAsi
  }, [characterClass, draft.subclassId, draft.level])

  // Don't render if no features to select
  if (!hasFeatures) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Class Options
          </CardTitle>
          <CardDescription>
            Your character doesn't have any selectable class options at this level.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Check if subclass selection should be shown
  const showSubclassSelector = draft.level >= 3 && characterClass && characterClass.subclasses.length > 0

  return (
    <div className="space-y-6">
      {/* Class Banner */}
      {characterClass && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border-2 border-primary/30">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
          <div className="relative p-8 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-primary/80 uppercase tracking-wider mb-1">
                Level {draft.level} Character
              </div>
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {characterClass.name}
              </h1>
              <p className="text-muted-foreground mt-2">
                {getClassDescription(characterClass.id)}
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                {getClassIcon(characterClass.id) ? (
                  <img src={getClassIcon(characterClass.id)} alt="" className="w-14 h-14 object-contain invert opacity-80" />
                ) : (
                  <Sparkles className="w-12 h-12 text-primary" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subclass Selection */}
      {showSubclassSelector && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-400" />
              {characterClass.name} Subclass
            </CardTitle>
            <CardDescription>
              Choose your specialization within the {characterClass.name} class
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {characterClass.subclasses.map((subclass) => {
                const featuresAtLevel = getSubclassFeaturesByLevel(characterClass, subclass.id, draft.level)
                return (
                  <button
                    key={subclass.id}
                    onClick={() => setSubclass(subclass.id)}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all text-left cursor-pointer',
                      'hover:border-primary/50 hover:bg-slate-800/60',
                      draft.subclassId === subclass.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-slate-800/40'
                    )}
                  >
                    <div className="font-semibold mb-2">{subclass.name}</div>
                    {featuresAtLevel.length > 0 ? (
                      <ul className="space-y-1">
                        {featuresAtLevel.slice(0, 4).map((feature) => (
                          <li key={feature.name} className="text-xs text-muted-foreground flex items-start gap-1">
                            <span className="text-primary">•</span>
                            <span className="line-clamp-1">{feature.name}</span>
                          </li>
                        ))}
                        {featuresAtLevel.length > 4 && (
                          <li className="text-xs text-muted-foreground italic">
                            +{featuresAtLevel.length - 4} more features
                          </li>
                        )}
                      </ul>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">
                        Features unlock at higher levels
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fighting Style Selection */}
      <FightingStyleSelector />

      {/* Ability Score Improvements */}
      <ASISelector />

      {/* Battle Master Maneuver Selection */}
      <ManeuverSelector />
    </div>
  )
}
