import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCharacterStore, getClassAsiLevels, calculateFinalAbilityScores } from '@/stores/characterStore'
import { getClassById } from '@/data'
import type { AbilityName, AbilityScores } from '@/types'
import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const ABILITY_LABELS: Record<AbilityName, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
}

const ABILITY_NAMES: AbilityName[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
]

/**
 * ASISelector - Component for selecting class Ability Score Improvements
 *
 * Displays a card for each ASI available to the character based on their class and level.
 * Allows choosing between +2/+1 or +1/+1 distribution.
 */
export function ASISelector({ classId }: { classId: string }) {
  const draft = useCharacterStore((state) => state.draft)
  const setClassAsiSelection = useCharacterStore((state) => state.setClassAsiSelection)

  const entry = draft.classEntries.find(e => e.classId === classId)
  const characterClass = getClassById(classId) ?? null
  const classLevel = entry?.level ?? 0
  const classAsiSelections = entry?.classAsiSelections ?? []

  // Get available ASI levels for this class and level
  const availableAsiLevels = useMemo(() => {
    if (!characterClass) return []
    return getClassAsiLevels(characterClass, classLevel)
  }, [characterClass, classLevel])

  // Don't render if no ASIs available
  if (availableAsiLevels.length === 0) {
    return null
  }

  // Calculate current ability scores (including background bonuses and previous ASIs)
  // For multiclass, we only include ASIs from THIS class up to the given index
  const getCurrentScores = (upToIndex: number): AbilityScores => {
    // Aggregate ASIs from other classes + this class up to index
    const otherClassAsis = draft.classEntries
      .filter(e => e.classId !== classId)
      .flatMap(e => e.classAsiSelections)
    const thisClassAsis = classAsiSelections.slice(0, upToIndex)
    return calculateFinalAbilityScores(
      draft.baseAbilityScores,
      draft.abilityBonusPlus2,
      draft.abilityBonusPlus1,
      draft.abilityBonusMode,
      draft.abilityBonusPlus1Trio,
      [...otherClassAsis, ...thisClassAsis]
    )
  }

  // Handle mode toggle for a specific ASI
  const handleModeChange = (index: number, mode: 'plus2-plus1' | 'plus1-plus1') => {
    const currentSelection = classAsiSelections[index]
    setClassAsiSelection(classId, index, {
      level: availableAsiLevels[index],
      mode,
      plus2Ability: mode === 'plus2-plus1' ? currentSelection?.plus2Ability : undefined,
      plus1Abilities: mode === 'plus1-plus1' ? [] : currentSelection?.plus1Abilities.slice(0, 1) || [],
    })
  }

  // Handle ability selection
  const handleAbilitySelect = (
    index: number,
    abilityType: 'plus2' | 'plus1-first' | 'plus1-second',
    ability: AbilityName | ''
  ) => {
    const currentSelection = classAsiSelections[index] || {
      level: availableAsiLevels[index],
      mode: 'plus2-plus1' as const,
      plus1Abilities: [],
    }

    const newSelection = { ...currentSelection }

    if (abilityType === 'plus2') {
      newSelection.plus2Ability = ability || undefined
    } else if (abilityType === 'plus1-first') {
      const newPlus1 = [...currentSelection.plus1Abilities]
      if (ability) {
        newPlus1[0] = ability
      } else {
        newPlus1.splice(0, 1)
      }
      newSelection.plus1Abilities = newPlus1
    } else {
      // plus1-second
      const newPlus1 = [...currentSelection.plus1Abilities]
      if (ability) {
        newPlus1[1] = ability
      } else {
        newPlus1.splice(1, 1)
      }
      newSelection.plus1Abilities = newPlus1
    }

    setClassAsiSelection(classId, index, newSelection)
  }

  // Check if an ability would exceed 20 with the bonus
  const wouldExceedCap = (currentScores: AbilityScores, ability: AbilityName, bonus: number): boolean => {
    return currentScores[ability] + bonus > 20
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Ability Score Improvements
        </CardTitle>
        <CardDescription>
          At certain levels, your class grants you the ability to increase your ability scores.
          Choose +2 to one ability and +1 to another, or +1 to two different abilities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {availableAsiLevels.map((asiLevel, index) => {
          const selection = classAsiSelections[index] || {
            level: asiLevel,
            mode: 'plus2-plus1' as const,
            plus1Abilities: [],
          }
          const currentScores = getCurrentScores(index)
          const mode = selection.mode

          return (
            <div key={`asi-${asiLevel}-${index}`} className="p-4 border rounded-lg bg-slate-800/40">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm">Level {asiLevel} ASI</h4>

                {/* Mode Toggle */}
                <div className="inline-flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => handleModeChange(index, 'plus2-plus1')}
                    className={cn(
                      'px-3 py-1 text-xs transition-all cursor-pointer',
                      mode === 'plus2-plus1'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    )}
                  >
                    +2 / +1
                  </button>
                  <button
                    onClick={() => handleModeChange(index, 'plus1-plus1')}
                    className={cn(
                      'px-3 py-1 text-xs transition-all border-l border-border cursor-pointer',
                      mode === 'plus1-plus1'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    )}
                  >
                    +1 / +1
                  </button>
                </div>
              </div>

              {mode === 'plus2-plus1' ? (
                <div className="grid grid-cols-2 gap-4">
                  {/* +2 Selection */}
                  <div>
                    <Label className="text-sm mb-2 block text-emerald-400">+2 Bonus</Label>
                    <Select
                      value={selection.plus2Ability ?? ''}
                      onValueChange={(v) => handleAbilitySelect(index, 'plus2', v as AbilityName | '')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ability" />
                      </SelectTrigger>
                      <SelectContent>
                        {ABILITY_NAMES.map((ability) => {
                          const exceeds = wouldExceedCap(currentScores, ability, 2)
                          const isSelectedForPlus1 = selection.plus1Abilities[0] === ability
                          return (
                            <SelectItem
                              key={ability}
                              value={ability}
                              disabled={isSelectedForPlus1 || exceeds}
                            >
                              {ABILITY_LABELS[ability]} ({currentScores[ability]} → {Math.min(20, currentScores[ability] + 2)})
                              {exceeds && ' [Max 20]'}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* +1 Selection */}
                  <div>
                    <Label className="text-sm mb-2 block text-sky-400">+1 Bonus</Label>
                    <Select
                      value={selection.plus1Abilities[0] ?? ''}
                      onValueChange={(v) => handleAbilitySelect(index, 'plus1-first', v as AbilityName | '')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ability" />
                      </SelectTrigger>
                      <SelectContent>
                        {ABILITY_NAMES.map((ability) => {
                          const exceeds = wouldExceedCap(currentScores, ability, 1)
                          const isSelectedForPlus2 = selection.plus2Ability === ability
                          return (
                            <SelectItem
                              key={ability}
                              value={ability}
                              disabled={isSelectedForPlus2 || exceeds}
                            >
                              {ABILITY_LABELS[ability]} ({currentScores[ability]} → {Math.min(20, currentScores[ability] + 1)})
                              {exceeds && ' [Max 20]'}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* First +1 Selection */}
                  <div>
                    <Label className="text-sm mb-2 block text-sky-400">+1 Bonus #1</Label>
                    <Select
                      value={selection.plus1Abilities[0] ?? ''}
                      onValueChange={(v) => handleAbilitySelect(index, 'plus1-first', v as AbilityName | '')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ability" />
                      </SelectTrigger>
                      <SelectContent>
                        {ABILITY_NAMES.map((ability) => {
                          const exceeds = wouldExceedCap(currentScores, ability, 1)
                          const isSelectedForSecond = selection.plus1Abilities[1] === ability
                          return (
                            <SelectItem
                              key={ability}
                              value={ability}
                              disabled={isSelectedForSecond || exceeds}
                            >
                              {ABILITY_LABELS[ability]} ({currentScores[ability]} → {Math.min(20, currentScores[ability] + 1)})
                              {exceeds && ' [Max 20]'}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Second +1 Selection */}
                  <div>
                    <Label className="text-sm mb-2 block text-sky-400">+1 Bonus #2</Label>
                    <Select
                      value={selection.plus1Abilities[1] ?? ''}
                      onValueChange={(v) => handleAbilitySelect(index, 'plus1-second', v as AbilityName | '')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ability" />
                      </SelectTrigger>
                      <SelectContent>
                        {ABILITY_NAMES.map((ability) => {
                          const exceeds = wouldExceedCap(currentScores, ability, 1)
                          const isSelectedForFirst = selection.plus1Abilities[0] === ability
                          return (
                            <SelectItem
                              key={ability}
                              value={ability}
                              disabled={isSelectedForFirst || exceeds}
                            >
                              {ABILITY_LABELS[ability]} ({currentScores[ability]} → {Math.min(20, currentScores[ability] + 1)})
                              {exceeds && ' [Max 20]'}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
