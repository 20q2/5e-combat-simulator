import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CharacterCreator } from '@/components/character/CharacterCreator'
import { useCharacterStore } from '@/stores/characterStore'
import { getCharacterTokenImage } from '@/lib/tokenImages'
import { cn } from '@/lib/utils'
import type { Character } from '@/types'
import { Trash2, Plus, Heart, Shield, Footprints, Pencil } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

function SavedCharacterCard({
  character,
  onDelete,
  onEdit,
}: {
  character: Character
  onDelete: () => void
  onEdit: () => void
}) {
  const tokenImage = getCharacterTokenImage(character)

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {tokenImage ? (
              <img
                src={tokenImage}
                alt={character.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0',
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
              <CardTitle className="text-lg truncate">{character.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {character.race.name} {character.class.name}
                {character.subclass && ` (${character.subclass.name})`} · Level {character.level}
              </CardDescription>
            </div>
            <div className="flex gap-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={onEdit}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit character</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="destructive" className="h-8 w-8" onClick={onDelete}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete character</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              {character.maxHp}
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              {character.ac}
            </span>
            <span className="flex items-center gap-1">
              <Footprints className="w-3.5 h-3.5 text-emerald-400" />
              {character.speed} ft
            </span>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

export function CharacterPage() {
  const { savedCharacters, deleteCharacter, resetDraft, loadCharacterForEditing } = useCharacterStore()
  const [showCreator, setShowCreator] = useState(savedCharacters.length === 0)

  const handleNewCharacter = () => {
    resetDraft()
    setShowCreator(true)
  }

  const handleEditCharacter = (character: Character) => {
    loadCharacterForEditing(character.id)
    setShowCreator(true)
  }

  if (showCreator) {
    return (
      <CharacterCreator />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Characters</h1>
          <p className="text-muted-foreground">
            Manage your saved characters or create a new one
          </p>
        </div>
        <Button onClick={handleNewCharacter}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Character
        </Button>
      </div>

      {savedCharacters.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              You haven't created any characters yet.
            </p>
            <Button onClick={handleNewCharacter}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Character
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedCharacters.map((character) => (
            <SavedCharacterCard
              key={character.id}
              character={character}
              onDelete={() => deleteCharacter(character.id)}
              onEdit={() => handleEditCharacter(character)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
