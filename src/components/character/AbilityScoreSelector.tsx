import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AbilityScores, AbilityName } from '@/types'
import { getAbilityModifier } from '@/types'
import {
  useCharacterStore,
  AbilityScoreMethod,
  getPointBuyCost,
  getTotalPointBuyCost,
  POINT_BUY_BUDGET,
  STANDARD_ARRAY,
  calculateFinalAbilityScores,
} from '@/stores/characterStore'

const ABILITY_NAMES: (keyof AbilityScores)[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
]

const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
}

function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function AbilityScoreSelector() {
  const {
    draft,
    setAbilityScoreMethod,
    setBaseAbilityScore,
    setBaseAbilityScores,
    setAbilityBonusPlus2,
    setAbilityBonusPlus1,
  } = useCharacterStore()

  const { abilityScoreMethod, baseAbilityScores, abilityBonusPlus2, abilityBonusPlus1 } = draft

  const finalAbilityScores = calculateFinalAbilityScores(
    baseAbilityScores,
    abilityBonusPlus2,
    abilityBonusPlus1
  )

  // For standard array assignment
  const [standardArrayAssignments, setStandardArrayAssignments] = useState<
    Record<keyof AbilityScores, number | null>
  >({
    strength: null,
    dexterity: null,
    constitution: null,
    intelligence: null,
    wisdom: null,
    charisma: null,
  })

  const totalPointBuyCost = getTotalPointBuyCost(baseAbilityScores)
  const pointsRemaining = POINT_BUY_BUDGET - totalPointBuyCost

  const handleMethodChange = (method: string) => {
    setAbilityScoreMethod(method as AbilityScoreMethod)
    // Reset standard array assignments when changing methods
    setStandardArrayAssignments({
      strength: null,
      dexterity: null,
      constitution: null,
      intelligence: null,
      wisdom: null,
      charisma: null,
    })
  }

  const handlePointBuyChange = (ability: keyof AbilityScores, delta: number) => {
    const current = baseAbilityScores[ability]
    const newValue = current + delta

    // Point buy limits: 8-15
    if (newValue < 8 || newValue > 15) return

    // Check if we have enough points
    const newCost = getPointBuyCost(newValue) - getPointBuyCost(current)
    if (pointsRemaining - newCost < 0) return

    setBaseAbilityScore(ability, newValue)
  }

  const handleStandardArrayAssign = (ability: keyof AbilityScores, value: string) => {
    const numValue = parseInt(value, 10)

    // Find which ability currently has this value and swap
    const currentHolder = Object.entries(standardArrayAssignments).find(
      ([_, v]) => v === numValue
    )?.[0] as keyof AbilityScores | undefined

    const newAssignments = { ...standardArrayAssignments }

    // If another ability has this value, give it our old value
    if (currentHolder && currentHolder !== ability) {
      newAssignments[currentHolder] = standardArrayAssignments[ability]
    }

    newAssignments[ability] = numValue

    setStandardArrayAssignments(newAssignments)

    // Update the actual scores
    const newScores: AbilityScores = { ...baseAbilityScores }
    for (const [key, val] of Object.entries(newAssignments)) {
      if (val !== null) {
        newScores[key as keyof AbilityScores] = val
      }
    }
    setBaseAbilityScores(newScores)
  }

  const handleManualChange = (ability: keyof AbilityScores, value: string) => {
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 30) {
      setBaseAbilityScore(ability, numValue)
    }
  }

  const getUsedStandardArrayValues = (): number[] => {
    return Object.values(standardArrayAssignments).filter((v): v is number => v !== null)
  }

  const getAvailableStandardArrayValues = (currentAbility: keyof AbilityScores): number[] => {
    const used = getUsedStandardArrayValues()
    const currentValue = standardArrayAssignments[currentAbility]
    return STANDARD_ARRAY.filter((v) => !used.includes(v) || v === currentValue)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ability Scores</CardTitle>
        <CardDescription>
          Choose how to determine your character's ability scores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={abilityScoreMethod} onValueChange={handleMethodChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="point-buy">Point Buy</TabsTrigger>
            <TabsTrigger value="standard-array">Standard Array</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          {/* Point Buy */}
          <TabsContent value="point-buy" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Points remaining: <span className={pointsRemaining < 0 ? 'text-destructive' : 'font-bold'}>{pointsRemaining}</span> / {POINT_BUY_BUDGET}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {ABILITY_NAMES.map((ability) => {
                const score = baseAbilityScores[ability]
                const mod = getAbilityModifier(score)
                const cost = getPointBuyCost(score)

                return (
                  <div key={ability} className="flex flex-col items-center p-3 border rounded-lg">
                    <Label className="text-xs text-muted-foreground mb-1">
                      {ABILITY_LABELS[ability]}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePointBuyChange(ability, -1)}
                        disabled={score <= 8}
                      >
                        -
                      </Button>
                      <div className="text-center min-w-[3rem]">
                        <div className="text-2xl font-bold">{score}</div>
                        <div className="text-xs text-muted-foreground">
                          ({formatModifier(mod)})
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePointBuyChange(ability, 1)}
                        disabled={score >= 15 || pointsRemaining <= 0}
                      >
                        +
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Cost: {cost}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* Standard Array */}
          <TabsContent value="standard-array" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Assign values from the standard array: {STANDARD_ARRAY.join(', ')}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {ABILITY_NAMES.map((ability) => {
                const assigned = standardArrayAssignments[ability]
                const score = assigned ?? 8
                const mod = getAbilityModifier(score)
                const available = getAvailableStandardArrayValues(ability)

                return (
                  <div key={ability} className="flex flex-col items-center p-3 border rounded-lg">
                    <Label className="text-xs text-muted-foreground mb-2">
                      {ABILITY_LABELS[ability]}
                    </Label>
                    <Select
                      value={assigned?.toString() ?? ''}
                      onValueChange={(v) => handleStandardArrayAssign(ability, v)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue placeholder="--" />
                      </SelectTrigger>
                      <SelectContent>
                        {available.map((val) => (
                          <SelectItem key={val} value={val.toString()}>
                            {val}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assigned && (
                      <div className="text-xs text-muted-foreground mt-1">
                        ({formatModifier(mod)})
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* Manual Entry */}
          <TabsContent value="manual" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Enter your ability scores manually (1-30)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {ABILITY_NAMES.map((ability) => {
                const score = baseAbilityScores[ability]
                const mod = getAbilityModifier(score)

                return (
                  <div key={ability} className="flex flex-col items-center p-3 border rounded-lg">
                    <Label className="text-xs text-muted-foreground mb-2">
                      {ABILITY_LABELS[ability]}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={score}
                      onChange={(e) => handleManualChange(ability, e.target.value)}
                      className="w-20 text-center"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      ({formatModifier(mod)})
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Ability Score Bonuses */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-medium mb-2">Ability Score Bonuses</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Choose one ability to increase by +2 and another to increase by +1
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-2 block">+2 Bonus</Label>
              <Select
                value={abilityBonusPlus2 ?? ''}
                onValueChange={(v) => setAbilityBonusPlus2(v as AbilityName || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ability" />
                </SelectTrigger>
                <SelectContent>
                  {ABILITY_NAMES.map((ability) => (
                    <SelectItem
                      key={ability}
                      value={ability}
                      disabled={ability === abilityBonusPlus1}
                    >
                      {ABILITY_LABELS[ability]} ({baseAbilityScores[ability]} → {baseAbilityScores[ability] + 2})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-2 block">+1 Bonus</Label>
              <Select
                value={abilityBonusPlus1 ?? ''}
                onValueChange={(v) => setAbilityBonusPlus1(v as AbilityName || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ability" />
                </SelectTrigger>
                <SelectContent>
                  {ABILITY_NAMES.map((ability) => (
                    <SelectItem
                      key={ability}
                      value={ability}
                      disabled={ability === abilityBonusPlus2}
                    >
                      {ABILITY_LABELS[ability]} ({baseAbilityScores[ability]} → {baseAbilityScores[ability] + 1})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-medium mb-2">Final Ability Scores</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            {ABILITY_NAMES.map((ability) => {
              const baseScore = baseAbilityScores[ability]
              const finalScore = finalAbilityScores[ability]
              const mod = getAbilityModifier(finalScore)
              const bonus =
                abilityBonusPlus2 === ability ? 2 :
                abilityBonusPlus1 === ability ? 1 : 0
              return (
                <div key={ability} className="text-center">
                  <div className="text-xs text-muted-foreground">{ABILITY_LABELS[ability]}</div>
                  <div className="font-bold">{finalScore}</div>
                  <div className="text-xs text-muted-foreground">{formatModifier(mod)}</div>
                  {bonus > 0 && (
                    <div className="text-xs text-primary">({baseScore} +{bonus})</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
