import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCharacterStore } from '@/stores/characterStore'
import { AbilityScoreSelector } from './AbilityScoreSelector'
import { RaceSelector } from './RaceSelector'
import { ClassSelector } from './ClassSelector'
import { SpellSelector } from './SpellSelector'
import { EquipmentSelector } from './EquipmentSelector'
import { CharacterSheet } from './CharacterSheet'
import { CharacterPreview } from './CharacterPreview'
import { getClassById } from '@/data'
import {
  Brain,
  Users,
  Crown,
  Sparkles,
  Shield,
  ScrollText,
  Check,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'

const STEPS: { id: number; label: string; component: React.ComponentType; icon: LucideIcon }[] = [
  { id: 0, label: 'Abilities', component: AbilityScoreSelector, icon: Brain },
  { id: 1, label: 'Race', component: RaceSelector, icon: Users },
  { id: 2, label: 'Class', component: ClassSelector, icon: Crown },
  { id: 3, label: 'Spells', component: SpellSelector, icon: Sparkles },
  { id: 4, label: 'Equipment', component: EquipmentSelector, icon: Shield },
  { id: 5, label: 'Review', component: CharacterSheet, icon: ScrollText },
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

  // Filter steps - skip spells if class doesn't have spellcasting
  const visibleSteps = STEPS.filter((step) => {
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
  const isLastStep = actualCurrentStep === visibleSteps.length - 1
  const isReviewStep = visibleSteps[actualCurrentStep]?.label === 'Review'

  // Validation for next button
  const canProceed = () => {
    const step = visibleSteps[actualCurrentStep]
    switch (step?.label) {
      case 'Race':
        return !!draft.raceId
      case 'Class':
        return !!draft.classId
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

      <div className={cn(
        'grid gap-6',
        isReviewStep ? 'grid-cols-1 max-w-5xl mx-auto' : 'lg:grid-cols-[1fr,320px]'
      )}>
        {/* Main Content */}
        <div>
          <div className="mb-8">
            <CurrentStepComponent />
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={isFirstStep}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            {!isLastStep && (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Character Preview Sidebar */}
        {!isReviewStep && (
          <div className="hidden lg:block">
            <CharacterPreview />
          </div>
        )}
      </div>
    </div>
  )
}
