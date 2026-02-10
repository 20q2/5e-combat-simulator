import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCharacterStore } from '@/stores/characterStore'
import { AbilityScoreSelector } from './AbilityScoreSelector'
import { RaceSelector } from './RaceSelector'
import { BackgroundSelector } from './BackgroundSelector'
import { ClassSelector } from './ClassSelector'
import { SubclassSelector } from './SubclassSelector'
import { SpellSelector } from './SpellSelector'
import { EquipmentSelector } from './EquipmentSelector'
import { CharacterSheet } from './CharacterSheet'
import { CharacterPreview } from './CharacterPreview'
import { getClassById } from '@/data'
import {
  Brain,
  Users,
  BookOpen,
  Crown,
  Sparkles,
  Shield,
  ScrollText,
  Check,
  ChevronLeft,
  ChevronRight,
  Zap,
  type LucideIcon,
} from 'lucide-react'

const STEPS: { id: number; label: string; component: React.ComponentType; icon: LucideIcon }[] = [
  { id: 0, label: 'Abilities', component: AbilityScoreSelector, icon: Brain },
  { id: 1, label: 'Race', component: RaceSelector, icon: Users },
  { id: 2, label: 'Background', component: BackgroundSelector, icon: BookOpen },
  { id: 3, label: 'Class', component: ClassSelector, icon: Crown },
  { id: 4, label: 'Class Options', component: SubclassSelector, icon: Zap },
  { id: 5, label: 'Spells', component: SpellSelector, icon: Sparkles },
  { id: 6, label: 'Equipment', component: EquipmentSelector, icon: Shield },
  { id: 7, label: 'Review', component: CharacterSheet, icon: ScrollText },
]

function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: typeof STEPS
  currentStep: number
  onStepClick: (step: number) => void
}) {
  return (
    <nav className="mb-8">
      <ol className="flex items-center justify-center gap-2 flex-wrap">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isCompleted = currentStep > step.id
          const isCurrent = currentStep === step.id

          return (
            <li key={step.id} className="flex items-center">
              <button
                onClick={() => onStepClick(step.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <span className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full',
                  isCurrent
                    ? 'bg-primary-foreground text-primary'
                    : isCompleted
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted-foreground/20'
                )}>
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div className={cn(
                  'w-8 h-0.5 mx-1',
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )} />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function CharacterCreator() {
  const { currentStep, setCurrentStep, draft } = useCharacterStore()

  const selectedClass = draft.classId ? getClassById(draft.classId) : null
  const hasSpellcasting = selectedClass?.spellcasting !== undefined

  // Check if character has selectable class/subclass options
  const hasSubclassFeatures = selectedClass
    ? (() => {
        // Show if needs subclass selection (level 3+)
        if (draft.level >= 3 && selectedClass.subclasses.length > 0) return true

        const allFeatures = [
          ...selectedClass.features,
          ...(selectedClass.subclasses.find(s => s.id === draft.subclassId)?.features ?? []),
        ]

        // Check for Fighting Style, Maneuvers, or Weapon Mastery
        return allFeatures.some(f => {
          if (f.level > draft.level) return false
          if (f.type === 'fighting_style' && f.availableStyles && f.availableStyles.length > 0) return true
          if (f.type === 'combat_superiority') return true
          if (f.type === 'weapon_mastery') return true
          return false
        })
      })()
    : false

  // Filter steps - skip class options/spells if not applicable
  const visibleSteps = STEPS.filter((step) => {
    if (step.label === 'Class Options' && !hasSubclassFeatures) return false
    if (step.label === 'Spells' && !hasSpellcasting) return false
    return true
  })

  // Map current step to visible step index
  const visibleStepIndex = visibleSteps.findIndex((s) => s.id === currentStep)
  const actualCurrentStep = visibleStepIndex >= 0 ? visibleStepIndex : 0

  const CurrentStepComponent = visibleSteps[actualCurrentStep]?.component ?? AbilityScoreSelector

  const handleNext = () => {
    const nextVisibleIndex = actualCurrentStep + 1
    if (nextVisibleIndex < visibleSteps.length) {
      setCurrentStep(visibleSteps[nextVisibleIndex].id)
    }
  }

  const handlePrev = () => {
    const prevVisibleIndex = actualCurrentStep - 1
    if (prevVisibleIndex >= 0) {
      setCurrentStep(visibleSteps[prevVisibleIndex].id)
    }
  }

  const handleStepClick = (stepId: number) => {
    // Check if the step is visible
    if (visibleSteps.some((s) => s.id === stepId)) {
      setCurrentStep(stepId)
    }
  }

  const isFirstStep = actualCurrentStep === 0
  const isReviewStep = visibleSteps[actualCurrentStep]?.label === 'Review'

  // Validation for next button
  const canProceed = () => {
    const step = visibleSteps[actualCurrentStep]
    switch (step?.label) {
      case 'Race':
        return !!draft.raceId
      case 'Background':
        return !!draft.backgroundId && !!draft.backgroundOriginFeat
      case 'Class':
        return !!draft.classId
      case 'Class Options': {
        if (!selectedClass) return true

        // Check Subclass requirement (level 3+)
        if (draft.level >= 3 && selectedClass.subclasses.length > 0 && !draft.subclassId) {
          return false
        }

        const allFeatures = [
          ...selectedClass.features,
          ...(selectedClass.subclasses.find(s => s.id === draft.subclassId)?.features ?? []),
        ]

        // Check Fighting Style requirement
        const fightingStyleFeature = allFeatures.find(f =>
          f.type === 'fighting_style' && f.level <= draft.level && f.availableStyles && f.availableStyles.length > 0
        )
        if (fightingStyleFeature && !draft.fightingStyle) return false

        // Check Maneuvers requirement
        const combatSuperiorityFeature = allFeatures.find(f =>
          f.type === 'combat_superiority' && f.level <= draft.level
        )
        if (combatSuperiorityFeature) {
          // Get required maneuver count
          let maneuversRequired = (combatSuperiorityFeature as any).maneuversKnown || 0
          const scalingLevels = (combatSuperiorityFeature as any).maneuversKnownAtLevels
          if (scalingLevels) {
            for (const [lvl, count] of Object.entries(scalingLevels)) {
              if (draft.level >= parseInt(lvl)) {
                maneuversRequired = count as number
              }
            }
          }
          if (draft.selectedManeuverIds.length < maneuversRequired) return false
        }

        return true
      }
      default:
        return true
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <StepIndicator
        steps={visibleSteps}
        currentStep={visibleSteps[actualCurrentStep]?.id ?? 0}
        onStepClick={handleStepClick}
      />

      {isReviewStep ? (
        <div className="max-w-5xl mx-auto pb-20">
          <CurrentStepComponent />
        </div>
      ) : (
        <div className="flex gap-6 pb-20">
          {/* Main Content - Left Side */}
          <div className="flex-1 min-w-0">
            <CurrentStepComponent />
          </div>

          {/* Character Preview - Right Side */}
          <div className="w-[320px] shrink-0">
            <CharacterPreview />
          </div>
        </div>
      )}

      {/* Sticky navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-3">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={isFirstStep}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          {!isReviewStep && (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
