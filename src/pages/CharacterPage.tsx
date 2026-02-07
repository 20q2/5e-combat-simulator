import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CharacterCreator } from '@/components/character/CharacterCreator'
import { useCharacterStore } from '@/stores/characterStore'
import type { Character } from '@/types'
import { Trash2, Plus, Users, Heart, Shield, Footprints, Pencil } from 'lucide-react'

function SavedCharacterCard({
  character,
  onDelete,
  onEdit,
}: {
  character: Character
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{character.name}</CardTitle>
            <CardDescription>
              {character.race.name} {character.class.name}
              {character.subclass && ` (${character.subclass.name})`} · Level {character.level}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 text-sm text-muted-foreground mb-3">
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
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Character Creator</h1>
            <p className="text-muted-foreground">
              Build your character step by step
            </p>
          </div>
          {savedCharacters.length > 0 && (
            <Button variant="outline" onClick={() => setShowCreator(false)}>
              <Users className="w-4 h-4 mr-2" />
              View Saved Characters
            </Button>
          )}
        </div>

        <CharacterCreator />
      </div>
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
