import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { presetCharacters, encounterPresets, getMonsterById } from '@/data'
import { useCombatStore } from '@/stores/combatStore'
import { useCharacterStore } from '@/stores/characterStore'
import { getCharacterTokenImage } from '@/lib/tokenImages'
import type { Character } from '@/types'
import { Check, Skull, Dices, User, ArrowRight } from 'lucide-react'

function CharacterCard({
  character,
  isSelected,
  onClick,
}: {
  character: Character
  isSelected: boolean
  onClick: () => void
}) {
  const hpDisplay = `${character.maxHp} HP`
  const acDisplay = `AC ${character.ac}`
  const tokenImage = getCharacterTokenImage(character)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-lg border-2 transition-all',
        isSelected
          ? 'border-primary bg-primary/10 ring-2 ring-primary'
          : 'border-slate-700 bg-slate-800/50 hover:border-primary/50 hover:bg-slate-800'
      )}
    >
      <div className="flex items-center gap-3">
        {tokenImage ? (
          <img
            src={tokenImage}
            alt={character.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-violet-500"
          />
        ) : (
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg',
            character.class.name === 'Fighter' && 'bg-orange-600',
            character.class.name === 'Rogue' && 'bg-emerald-600',
            character.class.name === 'Wizard' && 'bg-violet-600',
            character.class.name === 'Cleric' && 'bg-amber-600',
            !['Fighter', 'Rogue', 'Wizard', 'Cleric'].includes(character.class.name) && 'bg-slate-600'
          )}>
            {character.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{character.name}</div>
          <div className="text-sm text-muted-foreground">
            Level {character.level} {character.race.name} {character.class.name}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {hpDisplay} · {acDisplay} · {character.speed} ft
          </div>
        </div>
        {isSelected && (
          <Check className="w-6 h-6 text-primary" />
        )}
      </div>
    </button>
  )
}

function EncounterCard({
  encounter,
  isSelected,
  onClick,
}: {
  encounter: typeof encounterPresets[0]
  isSelected: boolean
  onClick: () => void
}) {
  const difficultyColors = {
    easy: 'text-emerald-400',
    medium: 'text-amber-400',
    hard: 'text-orange-400',
    deadly: 'text-rose-400',
  }

  const monsterNames = encounter.monsters
    .map(m => {
      const monster = getMonsterById(m.id)
      return m.count > 1 ? `${m.count}x ${monster?.name || m.id}` : monster?.name || m.id
    })
    .join(', ')

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-lg border-2 transition-all',
        isSelected
          ? 'border-primary bg-primary/10 ring-2 ring-primary'
          : 'border-slate-700 bg-slate-800/50 hover:border-primary/50 hover:bg-slate-800'
      )}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="font-semibold">{encounter.name}</div>
        <span className={cn('text-xs font-medium uppercase', difficultyColors[encounter.difficulty])}>
          {encounter.difficulty}
        </span>
      </div>
      <div className="text-sm text-muted-foreground mb-2">{encounter.description}</div>
      <div className="text-xs text-slate-400">{monsterNames}</div>
      {isSelected && (
        <div className="text-primary text-sm mt-2 flex items-center gap-1">
          <Check className="w-4 h-4" />
          Selected
        </div>
      )}
    </button>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { addCombatant, initializeGrid, initializeGridWithTerrain, resetCombat, startCombat } = useCombatStore()
  const { savedCharacters } = useCharacterStore()

  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [selectedEncounter, setSelectedEncounter] = useState<typeof encounterPresets[0] | null>(null)
  const [useCustomCharacter, setUseCustomCharacter] = useState(false)

  // Handle pre-selection from router state (e.g., coming from character save modal)
  useEffect(() => {
    const state = location.state as { selectedCharacterId?: string } | null
    if (state?.selectedCharacterId && savedCharacters.length > 0) {
      const character = savedCharacters.find(c => c.id === state.selectedCharacterId)
      if (character) {
        setUseCustomCharacter(true)
        setSelectedCharacter(character)
        // Clear the state to prevent re-selection on subsequent navigations
        navigate('/', { replace: true, state: {} })
      }
    }
  }, [location.state, savedCharacters, navigate])

  const allCharacters = useCustomCharacter ? savedCharacters : presetCharacters

  const handleStartCombat = () => {
    if (!selectedCharacter || !selectedEncounter) return

    // Reset and initialize combat
    resetCombat()
    const gridWidth = selectedEncounter.gridWidth ?? 15
    const gridHeight = selectedEncounter.gridHeight ?? 10

    // Initialize grid with terrain if present
    if (selectedEncounter.terrain && selectedEncounter.terrain.length > 0) {
      initializeGridWithTerrain(gridWidth, gridHeight, selectedEncounter.terrain, selectedEncounter.backgroundImage)
    } else {
      initializeGrid(gridWidth, gridHeight)
    }

    // Helper to check if a position is blocked by an obstacle
    const isPositionBlocked = (x: number, y: number): boolean => {
      if (!selectedEncounter.terrain) return false
      return selectedEncounter.terrain.some(
        t => t.x === x && t.y === y && t.obstacle?.blocksMovement
      )
    }

    // Find a valid position near the target that's not blocked
    const findValidPosition = (startX: number, startY: number, searchDirection: 1 | -1): { x: number; y: number } => {
      // Try the exact position first
      if (!isPositionBlocked(startX, startY)) {
        return { x: startX, y: startY }
      }
      // Search nearby positions
      for (let radius = 1; radius < 5; radius++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const x = startX + (radius * searchDirection)
          const y = startY + dy
          if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth && !isPositionBlocked(x, y)) {
            return { x, y }
          }
        }
      }
      return { x: startX, y: startY } // Fallback
    }

    // Calculate total monster count for placement
    const totalMonsters = selectedEncounter.monsters.reduce((sum, m) => sum + m.count, 0)

    // Place player character on the left side, vertically centered
    const playerY = Math.floor(gridHeight / 2)
    const playerPos = findValidPosition(2, playerY, 1)
    addCombatant({
      name: selectedCharacter.name,
      type: 'character',
      data: selectedCharacter,
      position: playerPos,
    })

    // Place monsters on the right side, spread out vertically
    let monsterIndex = 0
    const monsterStartY = Math.max(1, Math.floor((gridHeight - totalMonsters) / 2))
    const monsterX = gridWidth - 3 // Right side of grid

    selectedEncounter.monsters.forEach(({ id, count }) => {
      const monster = getMonsterById(id)
      if (!monster) return

      for (let i = 0; i < count; i++) {
        // Spread monsters vertically, wrap to next column if too many
        const row = monsterIndex % (gridHeight - 2)
        const col = Math.floor(monsterIndex / (gridHeight - 2))
        const baseX = monsterX - col * 2
        const baseY = monsterStartY + row

        const monsterPos = findValidPosition(baseX, baseY, -1)

        addCombatant({
          name: count > 1 ? `${monster.name} ${i + 1}` : monster.name,
          type: 'monster',
          data: { ...monster },
          position: monsterPos,
        })
        monsterIndex++
      }
    })

    // Auto-start combat (roll initiative)
    startCombat()

    navigate('/combat')
  }

  const canStartCombat = selectedCharacter && selectedEncounter

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-amber-400 bg-clip-text text-transparent">
          5e Combat Simulator
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Test your D&D 5e builds in tactical combat. Pick a hero, choose your foes, and fight!
        </p>
      </div>

      {/* Quick Start Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Step 1: Choose Character */}
        <Card className="border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
                  Choose Your Hero
                </CardTitle>
                <CardDescription className="mt-1">
                  Pick a preset character or use one you created
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle between presets and custom */}
            <div className="flex gap-2">
              <Button
                variant={!useCustomCharacter ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setUseCustomCharacter(false)
                  setSelectedCharacter(null)
                }}
              >
                Quick Pick
              </Button>
              <Button
                variant={useCustomCharacter ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setUseCustomCharacter(true)
                  setSelectedCharacter(null)
                }}
              >
                My Characters {savedCharacters.length > 0 && `(${savedCharacters.length})`}
              </Button>
            </div>

            {/* Character list */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2">
              {allCharacters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No saved characters yet.</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link to="/character">Create your first character →</Link>
                  </Button>
                </div>
              ) : (
                allCharacters.map((char) => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    isSelected={selectedCharacter?.id === char.id}
                    onClick={() => setSelectedCharacter(char)}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Choose Encounter */}
        <Card className="border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</span>
              Pick Your Battle
            </CardTitle>
            <CardDescription>
              Select an encounter to test your skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-2">
              {encounterPresets.map((encounter) => (
                <EncounterCard
                  key={encounter.id}
                  encounter={encounter}
                  isSelected={selectedEncounter?.id === encounter.id}
                  onClick={() => setSelectedEncounter(encounter)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Start Combat Button */}
      <Card className={cn(
        'border-2 transition-all',
        canStartCombat ? 'border-primary bg-primary/5' : 'border-slate-700'
      )}>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              {canStartCombat ? (
                <div>
                  <div className="font-semibold text-lg">Ready to Battle!</div>
                  <div className="text-muted-foreground">
                    {selectedCharacter?.name} vs {selectedEncounter?.name}
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  Select a character and an encounter to begin
                </div>
              )}
            </div>
            <Button
              size="lg"
              onClick={handleStartCombat}
              disabled={!canStartCombat}
              className="w-full sm:w-auto px-8"
            >
              Start Combat
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Options */}
      <div className="grid sm:grid-cols-3 gap-4 pt-4">
        <Button asChild variant="outline" className="h-auto py-4">
          <Link to="/character" className="flex flex-col items-center gap-2">
            <User className="w-6 h-6 text-violet-400" />
            <span>Create Character</span>
            <span className="text-xs text-muted-foreground">Full customization</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4">
          <Link to="/encounter" className="flex flex-col items-center gap-2">
            <Skull className="w-6 h-6 text-rose-400" />
            <span>Custom Encounter</span>
            <span className="text-xs text-muted-foreground">Build your own battle</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4">
          <Link to="/combat" className="flex flex-col items-center gap-2">
            <Dices className="w-6 h-6 text-amber-400" />
            <span>Sandbox Mode</span>
            <span className="text-xs text-muted-foreground">Free-form combat</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
