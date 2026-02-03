import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getAllMonsters } from '@/data'
import { useCharacterStore } from '@/stores/characterStore'
import { useCombatStore } from '@/stores/combatStore'
import { getCharacterTokenImage } from '@/lib/tokenImages'
import { setupCombatWithPlacement } from '@/lib/combatPlacement'
import type { Monster, Character } from '@/types'

// XP thresholds by character level
const XP_THRESHOLDS: Record<number, { easy: number; medium: number; hard: number; deadly: number }> = {
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
}

// CR to XP mapping
const CR_TO_XP: Record<string, number> = {
  '0': 10,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  '1': 200,
  '2': 450,
  '3': 700,
  '4': 1100,
  '5': 1800,
  '6': 2300,
  '7': 2900,
  '8': 3900,
  '9': 5000,
  '10': 5900,
}

function getMonsterXP(cr: number | string): number {
  const crStr = typeof cr === 'number' ? cr.toString() : cr
  return CR_TO_XP[crStr] ?? 0
}

function calculateEncounterDifficulty(
  partyLevel: number,
  partySize: number,
  monsterXPTotal: number,
  monsterCount: number
): { difficulty: string; color: string; adjustedXP: number } {
  // Encounter multiplier based on number of monsters
  let multiplier = 1
  if (monsterCount === 2) multiplier = 1.5
  else if (monsterCount >= 3 && monsterCount <= 6) multiplier = 2
  else if (monsterCount >= 7 && monsterCount <= 10) multiplier = 2.5
  else if (monsterCount >= 11 && monsterCount <= 14) multiplier = 3
  else if (monsterCount >= 15) multiplier = 4

  const adjustedXP = Math.floor(monsterXPTotal * multiplier)

  // Get thresholds for party
  const thresholds = XP_THRESHOLDS[Math.min(partyLevel, 10)] ?? XP_THRESHOLDS[10]
  const partyEasy = thresholds.easy * partySize
  const partyMedium = thresholds.medium * partySize
  const partyHard = thresholds.hard * partySize
  const partyDeadly = thresholds.deadly * partySize

  if (adjustedXP >= partyDeadly) {
    return { difficulty: 'Deadly', color: 'text-rose-400', adjustedXP }
  } else if (adjustedXP >= partyHard) {
    return { difficulty: 'Hard', color: 'text-orange-400', adjustedXP }
  } else if (adjustedXP >= partyMedium) {
    return { difficulty: 'Medium', color: 'text-amber-400', adjustedXP }
  } else if (adjustedXP >= partyEasy) {
    return { difficulty: 'Easy', color: 'text-emerald-400', adjustedXP }
  } else {
    return { difficulty: 'Trivial', color: 'text-slate-400', adjustedXP }
  }
}

interface SelectedMonster {
  monster: Monster
  count: number
}

function MonsterCard({
  monster,
  count,
  onAdd,
  onRemove,
}: {
  monster: Monster
  count: number
  onAdd: () => void
  onRemove: () => void
}) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all',
        count > 0 ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium text-sm">{monster.name}</h4>
          <p className="text-xs text-muted-foreground">
            CR {monster.challengeRating} · {monster.type} · {monster.size}
          </p>
        </div>
        <span className="text-xs bg-secondary px-2 py-1 rounded">
          {getMonsterXP(monster.challengeRating)} XP
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          HP {monster.hp} · AC {monster.ac}
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <Button size="sm" variant="outline" onClick={onRemove} className="h-7 w-7 p-0">
              -
            </Button>
          )}
          {count > 0 && <span className="text-sm font-medium w-4 text-center">{count}</span>}
          <Button size="sm" variant="outline" onClick={onAdd} className="h-7 w-7 p-0">
            +
          </Button>
        </div>
      </div>
    </div>
  )
}

export function EncounterBuilder() {
  const navigate = useNavigate()
  const { savedCharacters } = useCharacterStore()
  const { addCombatant, initializeGrid, resetCombat, startCombat } = useCombatStore()
  const allMonsters = getAllMonsters()

  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([])
  const [selectedMonsters, setSelectedMonsters] = useState<SelectedMonster[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [crFilter, setCrFilter] = useState<string>('all')

  // Filter monsters
  const filteredMonsters = useMemo(() => {
    return allMonsters.filter((m) => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCR = crFilter === 'all' || m.challengeRating.toString() === crFilter
      return matchesSearch && matchesCR
    })
  }, [allMonsters, searchQuery, crFilter])

  // Parse CR string to number (handles fractions like "1/4")
  const parseCR = (cr: string): number => {
    if (cr.includes('/')) {
      const [num, denom] = cr.split('/')
      return parseInt(num, 10) / parseInt(denom, 10)
    }
    return parseFloat(cr)
  }

  // Get unique CRs for filter
  const availableCRs = useMemo(() => {
    const crs = new Set(allMonsters.map((m) => m.challengeRating.toString()))
    return Array.from(crs).sort((a, b) => {
      const numA = parseCR(a)
      const numB = parseCR(b)
      return numA - numB
    })
  }, [allMonsters])

  // Calculate encounter difficulty
  const encounterDifficulty = useMemo(() => {
    if (selectedCharacters.length === 0 || selectedMonsters.length === 0) {
      return null
    }

    const partyLevel = Math.round(
      selectedCharacters.reduce((sum, c) => sum + c.level, 0) / selectedCharacters.length
    )
    const partySize = selectedCharacters.length

    const totalXP = selectedMonsters.reduce(
      (sum, sm) => sum + getMonsterXP(sm.monster.challengeRating) * sm.count,
      0
    )
    const monsterCount = selectedMonsters.reduce((sum, sm) => sum + sm.count, 0)

    return calculateEncounterDifficulty(partyLevel, partySize, totalXP, monsterCount)
  }, [selectedCharacters, selectedMonsters])

  const handleAddMonster = (monster: Monster) => {
    setSelectedMonsters((prev) => {
      const existing = prev.find((sm) => sm.monster.id === monster.id)
      if (existing) {
        return prev.map((sm) =>
          sm.monster.id === monster.id ? { ...sm, count: sm.count + 1 } : sm
        )
      }
      return [...prev, { monster, count: 1 }]
    })
  }

  const handleRemoveMonster = (monsterId: string) => {
    setSelectedMonsters((prev) => {
      return prev
        .map((sm) =>
          sm.monster.id === monsterId ? { ...sm, count: sm.count - 1 } : sm
        )
        .filter((sm) => sm.count > 0)
    })
  }

  const getMonsterCount = (monsterId: string): number => {
    return selectedMonsters.find((sm) => sm.monster.id === monsterId)?.count ?? 0
  }

  const toggleCharacter = (character: Character) => {
    setSelectedCharacters((prev) => {
      const isSelected = prev.some((c) => c.id === character.id)
      if (isSelected) {
        return prev.filter((c) => c.id !== character.id)
      }
      return [...prev, character]
    })
  }

  const handleStartCombat = () => {
    // Use shared utility for auto-placement and auto-start
    setupCombatWithPlacement(
      { resetCombat, initializeGrid, addCombatant, startCombat },
      selectedCharacters,
      selectedMonsters.map(sm => ({ monster: sm.monster, count: sm.count })),
      { autoStart: true }
    )

    // Navigate to combat
    navigate('/combat')
  }

  const canStartCombat = selectedCharacters.length > 0 && selectedMonsters.length > 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
      {/* Monster Selection */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Monster Bestiary</CardTitle>
            <CardDescription>Select monsters for your encounter</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search monsters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={crFilter}
                onChange={(e) => setCrFilter(e.target.value)}
                className="px-3 py-2 border border-slate-700 rounded-md text-sm bg-slate-900 text-foreground"
              >
                <option value="all">All CRs</option>
                {availableCRs.map((cr) => (
                  <option key={cr} value={cr}>
                    CR {cr}
                  </option>
                ))}
              </select>
            </div>

            {/* Monster Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
              {filteredMonsters.map((monster) => (
                <MonsterCard
                  key={monster.id}
                  monster={monster}
                  count={getMonsterCount(monster.id)}
                  onAdd={() => handleAddMonster(monster)}
                  onRemove={() => handleRemoveMonster(monster.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - Party & Summary */}
      <div className="space-y-4">
        {/* Character Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your Party</CardTitle>
            <CardDescription>Select characters to use</CardDescription>
          </CardHeader>
          <CardContent>
            {savedCharacters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved characters. Create one first!
              </p>
            ) : (
              <div className="space-y-2">
                {savedCharacters.map((character) => {
                  const isSelected = selectedCharacters.some((c) => c.id === character.id)
                  const tokenImage = getCharacterTokenImage(character)
                  return (
                    <button
                      key={character.id}
                      onClick={() => toggleCharacter(character)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {tokenImage ? (
                          <img
                            src={tokenImage}
                            alt={character.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-violet-500"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold">
                            {character.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm">{character.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Level {character.level} {character.race.name} {character.class.name}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                            Selected
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Encounter Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Encounter Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Party */}
            <div>
              <Label className="text-xs text-muted-foreground">Party</Label>
              {selectedCharacters.length === 0 ? (
                <p className="text-sm text-muted-foreground">No characters selected</p>
              ) : (
                <ul className="text-sm">
                  {selectedCharacters.map((c) => (
                    <li key={c.id}>
                      {c.name} (Lv{c.level})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Monsters */}
            <div>
              <Label className="text-xs text-muted-foreground">Monsters</Label>
              {selectedMonsters.length === 0 ? (
                <p className="text-sm text-muted-foreground">No monsters selected</p>
              ) : (
                <ul className="text-sm">
                  {selectedMonsters.map((sm) => (
                    <li key={sm.monster.id}>
                      {sm.count}x {sm.monster.name} (CR {sm.monster.challengeRating})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Difficulty */}
            {encounterDifficulty && (
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Difficulty:</span>
                  <span className={cn('font-bold', encounterDifficulty.color)}>
                    {encounterDifficulty.difficulty}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Adjusted XP: {encounterDifficulty.adjustedXP.toLocaleString()}
                </div>
              </div>
            )}

            {/* Start Button */}
            <Button
              onClick={handleStartCombat}
              disabled={!canStartCombat}
              className="w-full"
              size="lg"
            >
              Start Combat
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
