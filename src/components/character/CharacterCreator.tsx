import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCharacterStore } from '@/stores/characterStore'
import { useNavigate } from 'react-router-dom'
import { buildCharacterFromDraft, getMissingDraftFields } from '@/lib/characterBuilder'
import { AbilityScoreSelector } from './AbilityScoreSelector'
import { RaceSelector } from './RaceSelector'
import { BackgroundSelector } from './BackgroundSelector'
import { ClassSelector } from './ClassSelector'
import { SubclassSelector } from './SubclassSelector'
import { SpellSelector } from './SpellSelector'
import { EquipmentSelector } from './EquipmentSelector'
import { CharacterSheet } from './CharacterSheet'
import { CharacterPreview } from './CharacterPreview'
import { CharacterSaveSuccess } from './CharacterSaveSuccess'
import type { Character } from '@/types'
import { getClassById } from '@/data'
import {
  isFightingStyleFeature,
  isCombatSuperiorityFeature,
} from '@/types'
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
  Save,
  Zap,
  type LucideIcon,
} from 'lucide-react'

interface StepDefinition {
  id: string
  label: string
  component: React.ComponentType
  icon: LucideIcon
}

function StepIndicator({
  steps,
  currentStepId,
  onStepClick,
  trailing,
}: {
  steps: StepDefinition[]
  currentStepId: string
  onStepClick: (stepId: string) => void
  trailing?: React.ReactNode
}) {
  const currentIndex = steps.findIndex(s => s.id === currentStepId)

  return (
    <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-2 mb-4 -mx-4 px-4 border-b border-border/50">
      <div className="flex items-center gap-2">
      <ol className="flex items-center justify-center gap-1 flex-wrap flex-1">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isCompleted = index < currentIndex
          const isCurrent = step.id === currentStepId

          return (
            <li key={step.id} className="flex items-center">
              <button
                onClick={() => onStepClick(step.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-sm',
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <span className={cn(
                  'flex items-center justify-center w-5 h-5 rounded-full',
                  isCurrent
                    ? 'bg-primary-foreground text-primary'
                    : isCompleted
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted-foreground/20'
                )}>
                  {isCompleted ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div className={cn(
                  'w-6 h-0.5 mx-0.5',
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )} />
              )}
            </li>
          )
        })}
      </ol>
      {trailing}
      </div>
    </nav>
  )
}

/**
 * Check if a class entry has configurable options (subclass, fighting style, maneuvers, ASIs)
 */
function classHasOptions(classId: string, subclassId: string | null, classLevel: number): boolean {
  const characterClass = getClassById(classId)
  if (!characterClass) return false

  // Subclass at level 3+
  if (classLevel >= 3 && characterClass.subclasses.length > 0) return true

  const allFeatures = [
    ...characterClass.features,
    ...(characterClass.subclasses.find(s => s.id === subclassId)?.features ?? []),
  ]

  // Fighting Style
  if (allFeatures.some(f => isFightingStyleFeature(f) && f.level <= classLevel && f.availableStyles && f.availableStyles.length > 0)) return true
  // Combat Superiority
  if (allFeatures.some(f => isCombatSuperiorityFeature(f) && f.level <= classLevel)) return true
  // Weapon Mastery
  if (allFeatures.some(f => f.type === 'weapon_mastery' && f.level <= classLevel)) return true
  // ASI
  if (characterClass.features.some(f => f.type === 'generic' && f.name === 'Ability Score Improvement' && f.level <= classLevel)) return true

  return false
}

export function CharacterCreator() {
  const { currentStep, setCurrentStep, draft, saveCharacter, resetDraft } = useCharacterStore()
  const navigate = useNavigate()
  const isEditing = !!draft.editingCharacterId
  const [savedCharacter, setSavedCharacter] = useState<Character | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const handleSave = () => {
    const character = buildCharacterFromDraft(draft)
    if (!character) return
    saveCharacter(character)
    setSavedCharacter(character)
    setShowSuccessModal(true)
  }

  // Compute visible steps dynamically based on draft.classEntries
  const visibleSteps = useMemo((): StepDefinition[] => {
    const steps: StepDefinition[] = [
      { id: 'abilities', label: 'Abilities', component: AbilityScoreSelector, icon: Brain },
      { id: 'race', label: 'Race', component: RaceSelector, icon: Users },
      { id: 'background', label: 'Background', component: BackgroundSelector, icon: BookOpen },
      { id: 'class', label: 'Class', component: ClassSelector, icon: Crown },
    ]

    // For each class with levels, add a "Class Options" step if it has configurable options
    for (const entry of draft.classEntries) {
      if (classHasOptions(entry.classId, entry.subclassId, entry.level)) {
        const classData = getClassById(entry.classId)
        const className = classData?.name ?? entry.classId
        steps.push({
          id: `class-options-${entry.classId}`,
          label: `Options: ${className}`,
          component: () => <SubclassSelector classId={entry.classId} />,
          icon: Zap,
        })
      }
    }

    // Spells step if any class has spellcasting
    const hasAnySpellcasting = draft.classEntries.some(entry => {
      const classData = getClassById(entry.classId)
      return classData?.spellcasting !== undefined
    })
    if (hasAnySpellcasting) {
      steps.push({ id: 'spells', label: 'Spells', component: SpellSelector, icon: Sparkles })
    }

    steps.push({ id: 'equipment', label: 'Equipment', component: EquipmentSelector, icon: Shield })
    steps.push({ id: 'review', label: 'Review', component: CharacterSheet, icon: ScrollText })

    return steps
  }, [draft.classEntries])

  // Find current step in visible steps
  const currentStepIndex = visibleSteps.findIndex(s => s.id === currentStep)
  const actualCurrentIndex = currentStepIndex >= 0 ? currentStepIndex : 0
  const currentStepDef = visibleSteps[actualCurrentIndex]

  const CurrentStepComponent = currentStepDef?.component ?? AbilityScoreSelector

  const handleNext = () => {
    const nextIndex = actualCurrentIndex + 1
    if (nextIndex < visibleSteps.length) {
      setCurrentStep(visibleSteps[nextIndex].id)
      window.scrollTo({ top: 0 })
    }
  }

  const handlePrev = () => {
    const prevIndex = actualCurrentIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(visibleSteps[prevIndex].id)
      window.scrollTo({ top: 0 })
    }
  }

  const handleStepClick = (stepId: string) => {
    if (visibleSteps.some(s => s.id === stepId)) {
      setCurrentStep(stepId)
      window.scrollTo({ top: 0 })
    }
  }

  const isFirstStep = actualCurrentIndex === 0
  const isReviewStep = currentStepDef?.id === 'review'

  // Validation for next button
  const canProceed = () => {
    const step = currentStepDef
    if (!step) return true

    switch (step.id) {
      case 'race':
        return !!draft.raceId
      case 'background':
        return !!draft.backgroundId && !!draft.backgroundOriginFeat
      case 'class':
        return draft.classEntries.length > 0 && draft.classEntries.some(e => e.level > 0)
      default: {
        // Class options steps: validate per-class
        if (step.id.startsWith('class-options-')) {
          const classId = step.id.replace('class-options-', '')
          const entry = draft.classEntries.find(e => e.classId === classId)
          if (!entry) return true

          const characterClass = getClassById(classId)
          if (!characterClass) return true

          // Check Subclass requirement (level 3+)
          if (entry.level >= 3 && characterClass.subclasses.length > 0 && !entry.subclassId) {
            return false
          }

          const allFeatures = [
            ...characterClass.features,
            ...(characterClass.subclasses.find(s => s.id === entry.subclassId)?.features ?? []),
          ]

          // Check Fighting Style requirement
          const fightingStyleFeature = allFeatures.find(f =>
            isFightingStyleFeature(f) && f.level <= entry.level && f.availableStyles && f.availableStyles.length > 0
          )
          if (fightingStyleFeature && !entry.fightingStyle) return false

          // Check Maneuvers requirement
          const combatSuperiorityFeature = allFeatures.find(f =>
            isCombatSuperiorityFeature(f) && f.level <= entry.level
          )
          if (combatSuperiorityFeature) {
            let maneuversRequired = (combatSuperiorityFeature as any).maneuversKnown || 0
            const scalingLevels = (combatSuperiorityFeature as any).maneuversKnownAtLevels
            if (scalingLevels) {
              for (const [lvl, count] of Object.entries(scalingLevels)) {
                if (entry.level >= parseInt(lvl)) {
                  maneuversRequired = count as number
                }
              }
            }
            if (entry.selectedManeuverIds.length < maneuversRequired) return false
          }

          return true
        }

        return true
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <StepIndicator
        steps={visibleSteps}
        currentStepId={currentStepDef?.id ?? 'abilities'}
        onStepClick={handleStepClick}
      />

      {isReviewStep ? (
        <div className="max-w-5xl mx-auto pb-28">
          <CurrentStepComponent />
        </div>
      ) : (
        <div className="flex gap-6 pb-28">
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

          <div className="flex items-center gap-2">
            {isEditing && !isReviewStep && (
              <Button
                variant="secondary"
                onClick={() => {
                  const character = buildCharacterFromDraft(draft)
                  if (!character) return
                  saveCharacter(character)
                  resetDraft()
                  navigate('/')
                }}
              >
                <Save className="w-4 h-4 mr-1" />
                Update & Close
              </Button>
            )}
            {isReviewStep ? (
              <>
                {(() => {
                  const missing = getMissingDraftFields(draft)
                  if (missing.length > 0) {
                    return (
                      <span className="text-sm text-amber-400 mr-2">
                        Missing: {missing.join(', ')}
                      </span>
                    )
                  }
                  return null
                })()}
                <Button onClick={handleSave} disabled={!buildCharacterFromDraft(draft)} size="lg">
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Update Character' : 'Save Character'}
                </Button>
              </>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Save Success Modal */}
      <CharacterSaveSuccess
        character={savedCharacter}
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
      />
    </div>
  )
}
