import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getRaceById,
  getClassById,
  getWeaponById,
  getArmorById,
  getSpellById,
  getClassFeaturesByLevel,
  getSubclassFeaturesByLevel,
} from '@/data'
import {
  useCharacterStore,
  calculateFinalAbilityScores,
  calculateHP,
  calculateAC,
} from '@/stores/characterStore'
import { getAbilityModifier, getProficiencyBonus } from '@/types'
import { getCharacterTokenImage } from '@/lib/tokenImages'
import { CharacterSaveSuccess } from './CharacterSaveSuccess'
import type { Character } from '@/types'

const ABILITY_LABELS: Record<string, string> = {
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

export function CharacterSheet() {
  const { draft, setName, saveCharacter, resetDraft } = useCharacterStore()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedCharacter, setSavedCharacter] = useState<Character | null>(null)

  const race = draft.raceId ? getRaceById(draft.raceId) ?? null : null
  const characterClass = draft.classId ? getClassById(draft.classId) ?? null : null
  const meleeWeapon = draft.meleeWeaponId ? getWeaponById(draft.meleeWeaponId) ?? null : null
  const rangedWeapon = draft.rangedWeaponId ? getWeaponById(draft.rangedWeaponId) ?? null : null
  const armor = draft.armorId ? getArmorById(draft.armorId) ?? null : null
  const subclass = characterClass?.subclasses.find((s) => s.id === draft.subclassId)

  // Calculate final stats
  const finalAbilityScores = calculateFinalAbilityScores(
    draft.baseAbilityScores,
    draft.abilityBonusPlus2,
    draft.abilityBonusPlus1
  )
  const proficiencyBonus = getProficiencyBonus(draft.level)

  const hp = characterClass
    ? calculateHP(characterClass, draft.level, finalAbilityScores.constitution)
    : 0

  const ac = calculateAC(
    armor?.category !== 'shield' ? armor : null,
    draft.shieldEquipped,
    finalAbilityScores.dexterity
  )

  // Get features
  const classFeatures = characterClass
    ? getClassFeaturesByLevel(characterClass, draft.level)
    : []
  const subclassFeatures = characterClass && draft.subclassId
    ? getSubclassFeaturesByLevel(characterClass, draft.subclassId, draft.level)
    : []

  // Get spells
  const cantrips = draft.selectedCantrips.map((id) => getSpellById(id)).filter(Boolean)
  const spells = draft.selectedSpellIds.map((id) => getSpellById(id)).filter(Boolean)

  // Calculate spell slots for spellcasting classes
  const spellSlots = useMemo(() => {
    if (!characterClass?.spellcasting) return undefined
    const slotProgression = characterClass.spellcasting.spellSlotProgression[draft.level] || []
    return {
      1: { max: slotProgression[0] || 0, current: slotProgression[0] || 0 },
      2: { max: slotProgression[1] || 0, current: slotProgression[1] || 0 },
      3: { max: slotProgression[2] || 0, current: slotProgression[2] || 0 },
      4: { max: slotProgression[3] || 0, current: slotProgression[3] || 0 },
      5: { max: slotProgression[4] || 0, current: slotProgression[4] || 0 },
      6: { max: slotProgression[5] || 0, current: slotProgression[5] || 0 },
      7: { max: slotProgression[6] || 0, current: slotProgression[6] || 0 },
      8: { max: slotProgression[7] || 0, current: slotProgression[7] || 0 },
      9: { max: slotProgression[8] || 0, current: slotProgression[8] || 0 },
    }
  }, [characterClass, draft.level])

  // Get token preview image
  const tokenImage = useMemo(() => {
    if (!race || !characterClass) return null
    // Create a minimal character object just for token lookup
    const mockCharacter = { race, class: characterClass } as Character
    return getCharacterTokenImage(mockCharacter)
  }, [race, characterClass])

  // Calculate attack bonus for a weapon
  const calculateAttackBonus = (weapon: typeof meleeWeapon) => {
    if (!weapon) return 0
    const isFinesse = weapon.properties.includes('finesse')
    const isRanged = weapon.type === 'ranged'

    let abilityMod: number
    if (isFinesse) {
      abilityMod = Math.max(
        getAbilityModifier(finalAbilityScores.strength),
        getAbilityModifier(finalAbilityScores.dexterity)
      )
    } else if (isRanged) {
      abilityMod = getAbilityModifier(finalAbilityScores.dexterity)
    } else {
      abilityMod = getAbilityModifier(finalAbilityScores.strength)
    }

    return abilityMod + proficiencyBonus
  }

  const meleeAttackBonus = useMemo(() => calculateAttackBonus(meleeWeapon), [meleeWeapon, finalAbilityScores, proficiencyBonus])
  const rangedAttackBonus = useMemo(() => calculateAttackBonus(rangedWeapon), [rangedWeapon, finalAbilityScores, proficiencyBonus])

  // Check if character is valid
  const isValid = draft.name.trim() && race && characterClass

  const handleSave = () => {
    if (!isValid || !race || !characterClass) return

    const character: Character = {
      id: `char-${Date.now()}`,
      name: draft.name,
      race,
      class: characterClass,
      subclass,
      level: draft.level,
      abilityScores: finalAbilityScores,
      maxHp: hp,
      currentHp: hp,
      temporaryHp: 0,
      ac,
      speed: race.speed,
      proficiencyBonus,
      skillProficiencies: [],
      savingThrowProficiencies: characterClass.savingThrowProficiencies,
      equipment: {
        meleeWeapon: meleeWeapon ?? undefined,
        rangedWeapon: rangedWeapon ?? undefined,
        armor: armor ?? undefined,
        shield: draft.shieldEquipped ? getArmorById('shield') : undefined,
        items: [],
      },
      features: [...classFeatures, ...subclassFeatures],
      conditions: [],
      deathSaves: { successes: 0, failures: 0 },
      spellSlots,
      knownSpells: [...cantrips, ...spells].filter((s): s is NonNullable<typeof s> => s !== undefined),
    }

    saveCharacter(character)
    setSavedCharacter(character)
    setShowSuccessModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Character Name */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Character Name</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="name" className="sr-only">Name</Label>
            <Input
              id="name"
              value={draft.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter character name"
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Character Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {/* Token Preview */}
            {tokenImage ? (
              <img
                src={tokenImage}
                alt="Character token"
                className="w-20 h-20 rounded-full object-cover border-2 border-violet-500 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-2xl font-bold text-slate-400 border-2 border-slate-600">
                {draft.name ? draft.name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <div>
              <CardTitle>
                {draft.name || 'Unnamed Character'}
              </CardTitle>
              <CardDescription>
                {race?.name ?? 'No race'}{' '}
                {characterClass?.name ?? 'No class'}
                {subclass && ` (${subclass.name})`}{' '}
                Level {draft.level}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Core Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{ac}</div>
              <div className="text-sm text-muted-foreground">Armor Class</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{hp}</div>
              <div className="text-sm text-muted-foreground">Hit Points</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{race?.speed ?? 30}</div>
              <div className="text-sm text-muted-foreground">Speed (ft)</div>
            </div>
          </div>

          {/* Ability Scores */}
          <div className="mb-6">
            <h4 className="font-medium mb-3">Ability Scores</h4>
            <div className="grid grid-cols-6 gap-2">
              {Object.entries(finalAbilityScores).map(([ability, score]) => {
                const mod = getAbilityModifier(score)
                const bonus =
                  draft.abilityBonusPlus2 === ability ? 2 :
                  draft.abilityBonusPlus1 === ability ? 1 : 0
                return (
                  <div key={ability} className="text-center p-2 border rounded-lg">
                    <div className="text-xs text-muted-foreground">
                      {ABILITY_LABELS[ability]}
                    </div>
                    <div className="text-xl font-bold">{score}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatModifier(mod)}
                    </div>
                    {bonus > 0 && (
                      <div className="text-xs text-primary">+{bonus}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Proficiency & Saves */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="font-medium mb-2">Proficiency Bonus</h4>
              <div className="text-2xl font-bold">{formatModifier(proficiencyBonus)}</div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Saving Throws</h4>
              <div className="flex flex-wrap gap-2">
                {characterClass?.savingThrowProficiencies.map((save) => (
                  <span key={save} className="text-sm bg-secondary px-2 py-1 rounded">
                    {ABILITY_LABELS[save]}{' '}
                    {formatModifier(
                      getAbilityModifier(finalAbilityScores[save]) + proficiencyBonus
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Equipment */}
          {(meleeWeapon || rangedWeapon || armor || draft.shieldEquipped) && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">Equipment</h4>
              <div className="space-y-2">
                {meleeWeapon && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="font-medium">{meleeWeapon.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatModifier(meleeAttackBonus)} to hit · {meleeWeapon.damage} {meleeWeapon.damageType}
                    </div>
                  </div>
                )}
                {rangedWeapon && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="font-medium">{rangedWeapon.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatModifier(rangedAttackBonus)} to hit · {rangedWeapon.damage} {rangedWeapon.damageType}
                      {rangedWeapon.range && ` · ${rangedWeapon.range.normal}/${rangedWeapon.range.long} ft`}
                    </div>
                  </div>
                )}
                {armor && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="font-medium">{armor.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Base AC {armor.baseAC}
                    </div>
                  </div>
                )}
                {draft.shieldEquipped && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="font-medium">Shield</div>
                    <div className="text-sm text-muted-foreground">+2 AC</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spells */}
          {(cantrips.length > 0 || spells.length > 0 || spellSlots) && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">Spellcasting</h4>
              {/* Spell Slots */}
              {spellSlots && (
                <div className="mb-3">
                  <div className="text-sm text-muted-foreground mb-1">Spell Slots</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(spellSlots)
                      .filter(([, slot]) => slot.max > 0)
                      .map(([level, slot]) => (
                        <span key={level} className="text-sm bg-violet-500/20 text-violet-300 px-2 py-1 rounded border border-violet-500/30">
                          Level {level}: {slot.max}
                        </span>
                      ))}
                  </div>
                </div>
              )}
              {cantrips.length > 0 && (
                <div className="mb-2">
                  <div className="text-sm text-muted-foreground mb-1">Cantrips</div>
                  <div className="flex flex-wrap gap-1">
                    {cantrips.map((spell) => spell && (
                      <span key={spell.id} className="text-sm bg-secondary px-2 py-1 rounded">
                        {spell.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {spells.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Prepared Spells</div>
                  <div className="flex flex-wrap gap-1">
                    {spells.map((spell) => spell && (
                      <span key={spell.id} className="text-sm bg-secondary px-2 py-1 rounded">
                        {spell.name} ({spell.level})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Features */}
          {(classFeatures.length > 0 || subclassFeatures.length > 0) && (
            <div>
              <h4 className="font-medium mb-2">Features & Traits</h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {[...classFeatures, ...subclassFeatures].map((feature, idx) => (
                  <div key={`${feature.name}-${idx}`} className="text-sm">
                    <span className="font-medium">{feature.name}</span>
                    <span className="text-muted-foreground"> (Lv. {feature.level})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={resetDraft}>
          Start Over
        </Button>
        <Button onClick={handleSave} disabled={!isValid}>
          Save Character
        </Button>
      </div>

      {/* Success Modal */}
      <CharacterSaveSuccess
        character={savedCharacter}
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
      />
    </div>
  )
}
