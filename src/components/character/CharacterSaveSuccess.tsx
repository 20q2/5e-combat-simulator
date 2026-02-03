import { useNavigate } from 'react-router-dom'
import { CheckCircle, Swords, Users, PlusCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCharacterStore } from '@/stores/characterStore'
import { getCharacterTokenImage } from '@/lib/tokenImages'
import type { Character } from '@/types'

interface CharacterSaveSuccessProps {
  character: Character | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CharacterSaveSuccess({
  character,
  open,
  onOpenChange,
}: CharacterSaveSuccessProps) {
  const navigate = useNavigate()
  const { resetDraft } = useCharacterStore()

  if (!character) return null

  const tokenImage = getCharacterTokenImage(character)

  const handleCreateAnother = () => {
    resetDraft()
    onOpenChange(false)
  }

  const handleGoToQuickStart = () => {
    onOpenChange(false)
    // Navigate to home with the character pre-selected via router state
    navigate('/', { state: { selectedCharacterId: character.id } })
  }

  const handleBuildEncounter = () => {
    onOpenChange(false)
    navigate('/encounter')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <DialogTitle>Character Saved!</DialogTitle>
              <DialogDescription>
                {character.name} is ready for battle
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Character Summary Card */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-4">
            {tokenImage ? (
              <img
                src={tokenImage}
                alt={character.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-violet-500 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center text-white text-xl font-bold border-2 border-violet-500 shadow-lg">
                {character.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{character.name}</h3>
              <p className="text-sm text-muted-foreground">
                Level {character.level} {character.race.name} {character.class.name}
              </p>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-emerald-400">{character.maxHp} HP</span>
                <span className="text-sky-400">AC {character.ac}</span>
                <span className="text-amber-400">{character.speed} ft</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleGoToQuickStart} className="w-full gap-2">
            <Swords className="w-4 h-4" />
            Go to Quick Start
          </Button>
          <Button onClick={handleBuildEncounter} variant="secondary" className="w-full gap-2">
            <Users className="w-4 h-4" />
            Build Custom Encounter
          </Button>
          <Button onClick={handleCreateAnother} variant="outline" className="w-full gap-2">
            <PlusCircle className="w-4 h-4" />
            Create Another Character
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
