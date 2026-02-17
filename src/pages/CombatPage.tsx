import { useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CombatGrid } from '@/components/combat/CombatGrid'
import { TurnOrder } from '@/components/combat/TurnOrder'
import { ActionBar } from '@/components/combat/ActionBar'
import { CombatLog } from '@/components/combat/CombatLog'
import { CombatantPanel } from '@/components/combat/CombatantPanel'
import { ReactionPrompt } from '@/components/combat/ReactionPrompt'
import { ManeuverPrompt } from '@/components/combat/ManeuverPrompt'
import { InitiativeSwapPrompt } from '@/components/combat/InitiativeSwapPrompt'
import { SavageAttackerPrompt } from '@/components/combat/SavageAttackerPrompt'
import { IndomitablePrompt } from '@/components/combat/IndomitablePrompt'
import { HeroicInspirationPrompt } from '@/components/combat/HeroicInspirationPrompt'
import { DamageTypePrompt } from '@/components/combat/DamageTypePrompt'
import { BounceTargetPrompt } from '@/components/combat/BounceTargetPrompt'
import { AlterSelfModePrompt } from '@/components/combat/AlterSelfModePrompt'
import { BlindnessDeafnessModePrompt } from '@/components/combat/BlindnessDeafnessModePrompt'
import { useCombatStore } from '@/stores/combatStore'
import { useCharacterStore } from '@/stores/characterStore'
import { getMonsterById } from '@/data'
import type { Character, Monster, Combatant } from '@/types'
import {
  Zap,
  User,
  Skull,
  RotateCcw,
  MapPin,
  Plus,
} from 'lucide-react'

// Quick setup panel for testing
function SetupPanel() {
  const { addCombatant, combatants, resetCombat } = useCombatStore()
  const { savedCharacters } = useCharacterStore()

  const addCharacterToCombat = (character: Character) => {
    // Check if already added
    if (combatants.some((c) => c.id === character.id)) return

    addCombatant({
      name: character.name,
      type: 'character',
      data: character,
      position: { x: -1, y: -1 }, // Will be placed later
    })
  }

  const addMonsterToCombat = (monsterId: string) => {
    const monster = getMonsterById(monsterId)
    if (!monster) return

    // Create unique instance
    const existingCount = combatants.filter((c) =>
      c.type === 'monster' && (c.data as Monster).id === monsterId
    ).length

    addCombatant({
      name: existingCount > 0 ? `${monster.name} ${existingCount + 1}` : monster.name,
      type: 'monster',
      data: { ...monster }, // Clone to avoid mutations
      position: { x: -1, y: -1 },
    })
  }

  const commonMonsters = [
    { id: 'goblin', name: 'Goblin' },
    { id: 'wolf', name: 'Wolf' },
    { id: 'skeleton', name: 'Skeleton' },
    { id: 'orc', name: 'Orc' },
    { id: 'zombie', name: 'Zombie' },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Quick Setup
        </CardTitle>
        <CardDescription className="text-xs">
          Add combatants to the battle
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Saved Characters */}
        <div>
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Your Characters
          </div>
          {savedCharacters.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No saved characters. Create one first!
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {savedCharacters.map((char) => (
                <Button
                  key={char.id}
                  size="sm"
                  variant="outline"
                  onClick={() => addCharacterToCombat(char)}
                  disabled={combatants.some((c) => c.id === char.id)}
                  className="text-xs"
                >
                  {char.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Add Monsters */}
        <div>
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
            <Skull className="w-3.5 h-3.5" />
            Add Monsters
          </div>
          <div className="flex flex-wrap gap-1">
            {commonMonsters.map((m) => (
              <Button
                key={m.id}
                size="sm"
                variant="outline"
                onClick={() => addMonsterToCombat(m.id)}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                {m.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Reset */}
        {combatants.length > 0 && (
          <Button
            size="sm"
            variant="destructive"
            onClick={resetCombat}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset Combat
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Draggable token for unplaced combatants
function DraggableSetupToken({ combatant }: { combatant: Combatant }) {
  const { selectCombatant, selectedCombatantId } = useCombatStore()
  const isSelected = selectedCombatantId === combatant.id
  const bgColor = combatant.type === 'character' ? 'bg-violet-600' : 'bg-rose-600'

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', combatant.id)
    e.dataTransfer.effectAllowed = 'move'
    selectCombatant(combatant.id)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => selectCombatant(isSelected ? undefined : combatant.id)}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all',
        isSelected ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400' : 'border-slate-700 hover:border-primary/50 bg-slate-800/50',
        'hover:shadow-lg hover:shadow-primary/10'
      )}
      title={`Drag ${combatant.name} to the grid`}
    >
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg', bgColor)}>
        {combatant.name.substring(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{combatant.name}</div>
        <div className="text-xs text-muted-foreground">
          {combatant.type === 'character' ? 'Player' : 'Monster'} · {combatant.maxHp} HP
        </div>
      </div>
    </div>
  )
}

// Panel showing unplaced combatants that can be dragged
function UnplacedCombatantsPanel() {
  const { combatants } = useCombatStore()
  const unplacedCombatants = combatants.filter((c) => c.position.x < 0 || c.position.y < 0)

  if (unplacedCombatants.length === 0) return null

  const characters = unplacedCombatants.filter((c) => c.type === 'character')
  const monsters = unplacedCombatants.filter((c) => c.type === 'monster')

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Place Combatants
        </CardTitle>
        <CardDescription className="text-xs">
          Drag tokens to the grid or click then click a cell
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {characters.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">Characters ({characters.length})</div>
            <div className="space-y-2">
              {characters.map((c) => (
                <DraggableSetupToken key={c.id} combatant={c} />
              ))}
            </div>
          </div>
        )}

        {monsters.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">Monsters ({monsters.length})</div>
            <div className="space-y-2">
              {monsters.map((c) => (
                <DraggableSetupToken key={c.id} combatant={c} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CombatPage() {
  const { phase, initializeGrid, combatants } = useCombatStore()

  // Hide body scrollbar on combat page
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = '' }
  }, [])

  // Initialize grid on mount only if in sandbox mode (no combatants from encounter setup)
  useEffect(() => {
    // Only initialize a fresh grid if no combatants exist
    // This preserves terrain from encounter setup when coming from HomePage
    if (combatants.length === 0) {
      initializeGrid(20, 20)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[350px_1fr_350px] gap-1 px-1 pt-2 pb-1 overflow-hidden">
        {/* Left Column - Initiative & Setup */}
        <div className="space-y-1 flex flex-col overflow-hidden">
          {/* Turn Order / Initiative */}
          <TurnOrder />

          {/* Setup Panel (only in setup phase) */}
          {phase === 'setup' && <SetupPanel />}

          {/* Unplaced combatants (only in setup phase) */}
          {phase === 'setup' && <UnplacedCombatantsPanel />}

          {/* Combat Log */}
          {phase === 'combat' && <CombatLog />}
        </div>

        {/* Center Column - Combat Grid */}
        <div className="flex flex-col items-center overflow-hidden min-h-0">
          <CombatGrid />
        </div>

        {/* Right Column - Character Info */}
        <div className="space-y-4 overflow-auto min-h-0">
          {/* Combatant Details Panel */}
          <CombatantPanel />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <ActionBar />

      {/* Reaction Prompt Overlay */}
      <ReactionPrompt />

      {/* Maneuver Prompt Overlay */}
      <ManeuverPrompt />

      {/* Initiative Swap Prompt (Alert feat) */}
      <InitiativeSwapPrompt />

      {/* Savage Attacker Damage Choice Prompt */}
      <SavageAttackerPrompt />

      {/* Indomitable Reroll Prompt (Fighter level 9+) */}
      <IndomitablePrompt />

      {/* Heroic Inspiration Reroll Prompt (Musician feat) */}
      <HeroicInspirationPrompt />

      {/* Chromatic Orb damage type choice */}
      <DamageTypePrompt />

      {/* Chromatic Orb bounce target selection */}
      <BounceTargetPrompt />

      {/* Alter Self mode selection */}
      <AlterSelfModePrompt />

      {/* Blindness/Deafness mode selection */}
      <BlindnessDeafnessModePrompt />
    </div>
  )
}
