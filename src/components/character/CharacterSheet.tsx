import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getRaceById,
  getClassById,
  getWeaponById,
  getArmorById,
  getSpellById,
  getClassFeaturesByLevel,
  getSubclassFeaturesByLevel,
  getBackgroundById,
} from '@/data'
import type { OriginFeatId } from '@/data/originFeats'
import type { MagicInitiateChoice } from '@/stores/characterStore'
import {
  useCharacterStore,
  calculateFinalAbilityScores,
  calculateHP,
  calculateAC,
} from '@/stores/characterStore'
import { getAbilityModifier, getProficiencyBonus } from '@/types'
import { getCharacterTokenImage } from '@/lib/tokenImages'
import { getClassIcon } from '@/lib/classIcons'
import { CharacterSaveSuccess } from './CharacterSaveSuccess'
import type { Character, AbilityName } from '@/types'
import type { ClassFeature, FightingStyleFeature, FightingStyle, SneakAttackFeature, ImprovedCriticalFeature, ExtraAttackFeature, CunningActionFeature } from '@/types/classFeature'
import type { RacialAbility } from '@/types/race'
import {
  Swords,
  Target,
  TriangleAlert,
  Shield,
  Heart,
  Footprints,
  Award,
  Crosshair,
  ShieldCheck,
  Sparkles,
  Dna,
  Wand2,
  Save,
  HardHat,
} from 'lucide-react'

const ABILITY_LABELS: Record<string, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
}

const ABILITY_ORDER: AbilityName[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']

const FIGHTING_STYLE_NAMES: Record<string, string> = {
  archery: 'Archery',
  defense: 'Defense',
  dueling: 'Dueling',
  great_weapon: 'Great Weapon Fighting',
  protection: 'Protection',
  two_weapon: 'Two-Weapon Fighting',
}

function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

function getFeatureDetail(feature: ClassFeature, level: number): string | null {
  switch (feature.type) {
    case 'fighting_style': {
      const style = (feature as FightingStyleFeature).style
      return style ? (FIGHTING_STYLE_NAMES[style] || null) : null
    }
    case 'sneak_attack': {
      const sneakAttack = feature as SneakAttackFeature
      const dice = sneakAttack.diceScaling[level] || sneakAttack.baseDice
      return `${dice} damage`
    }
    case 'improved_critical':
      return `Crit on ${(feature as ImprovedCriticalFeature).criticalRange}+`
    case 'extra_attack':
      return `${(feature as ExtraAttackFeature).attackCount} attacks per Attack action`
    case 'cunning_action': {
      const actions = (feature as CunningActionFeature).allowedActions
      return `Bonus Action: ${actions.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}`
    }
    case 'second_wind': {
      const maxUses = (feature as any).maxUsesAtLevels
        ? Object.entries((feature as any).maxUsesAtLevels)
            .sort(([a], [b]) => Number(b) - Number(a))
            .find(([lvl]) => level >= Number(lvl))?.[1] || (feature as any).maxUses
        : (feature as any).maxUses
      return `Bonus Action: Regain 1d10+${level} HP (${maxUses} uses per combat)`
    }
    case 'action_surge': {
      const maxUses = (feature as any).maxUsesAtLevels
        ? Object.entries((feature as any).maxUsesAtLevels)
            .sort(([a], [b]) => Number(b) - Number(a))
            .find(([lvl]) => level >= Number(lvl))?.[1] || (feature as any).maxUses
        : (feature as any).maxUses
      return `Take an additional action on your turn (${maxUses} ${maxUses === 1 ? 'use' : 'uses'} per combat)`
    }
    case 'indomitable': {
      const maxUses = (feature as any).maxUsesAtLevels
        ? Object.entries((feature as any).maxUsesAtLevels)
            .sort(([a], [b]) => Number(b) - Number(a))
            .find(([lvl]) => level >= Number(lvl))?.[1] || (feature as any).maxUses
        : (feature as any).maxUses
      return `Reroll a failed saving throw (${maxUses} ${maxUses === 1 ? 'use' : 'uses'} per combat)`
    }
    case 'relentless': {
      const maxUses = (feature as any).maxUses
      return maxUses ? `${maxUses} temporary HP when you roll initiative` : 'Gain temporary HP when you roll initiative'
    }
    case 'studied_attacks':
      return 'Missing an attack grants Advantage on your next attack against that target'
    case 'tactical_master':
      return 'Replace weapon mastery with Push, Sap, or Slow'
    case 'weapon_mastery': {
      const wm = feature as any
      return wm.count ? `Master ${wm.count} weapons` : 'Master weapons for special properties'
    }
    case 'combat_superiority': {
      const cs = feature as any
      return `${cs.diceCount}d${cs.diceSize} superiority dice, learn ${cs.maneuverCount} maneuvers`
    }
    case 'generic':
    default:
      // For generic and other types, return the feature's description
      return feature.description || null
  }
}

function getRacialAbilityDetail(ability: RacialAbility): string | null {
  switch (ability.type) {
    case 'darkvision':
      return `${ability.range} ft`
    case 'resistance':
      return ability.damageTypes.join(', ')
    case 'save_advantage':
      if (ability.conditions?.length) return `vs ${ability.conditions.join(', ')}`
      if (ability.magicSaves) return 'vs magic'
      return null
    case 'reroll':
      return `Reroll ${ability.triggerValue}s`
    case 'triggered_heal':
      return 'Drop to 1 HP instead of 0'
    case 'bonus_damage':
      return ability.bonusDice
    case 'breath_weapon':
      return `${ability.damageDice} ${ability.damageType}`
    default:
      return null
  }
}

export function CharacterSheet() {
  const { draft, setName, saveCharacter, resetDraft } = useCharacterStore()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [savedCharacter, setSavedCharacter] = useState<Character | null>(null)

  const race = draft.raceId ? getRaceById(draft.raceId) ?? null : null
  const characterClass = draft.classId ? getClassById(draft.classId) ?? null : null
  const meleeWeapon = draft.meleeWeaponId ? getWeaponById(draft.meleeWeaponId) ?? null : null
  const rangedWeapon = draft.rangedWeaponId ? getWeaponById(draft.rangedWeaponId) ?? null : null
  const offhandWeapon = draft.offhandWeaponId ? getWeaponById(draft.offhandWeaponId) ?? null : null
  const armor = draft.armorId ? getArmorById(draft.armorId) ?? null : null
  const subclass = characterClass?.subclasses.find((s) => s.id === draft.subclassId)
  const background = draft.backgroundId ? getBackgroundById(draft.backgroundId) ?? null : null

  // Calculate final stats
  const finalAbilityScores = calculateFinalAbilityScores(
    draft.baseAbilityScores,
    draft.abilityBonusPlus2,
    draft.abilityBonusPlus1,
    draft.abilityBonusMode,
    draft.abilityBonusPlus1Trio,
    draft.classAsiSelections
  )
  const proficiencyBonus = getProficiencyBonus(draft.level)

  // Collect origin feats from human and background choices
  const originFeats = [draft.humanOriginFeat, draft.backgroundOriginFeat].filter(
    (f): f is NonNullable<typeof f> => f !== null
  )

  const hp = characterClass
    ? calculateHP(characterClass, draft.level, finalAbilityScores.constitution, originFeats)
    : 0

  const fightingStyles = [draft.fightingStyle, draft.additionalFightingStyle].filter(
    (s): s is NonNullable<typeof s> => s !== null
  )
  const ac = calculateAC(
    armor?.category !== 'shield' ? armor : null,
    draft.shieldEquipped,
    finalAbilityScores.dexterity,
    fightingStyles
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

  // Get token preview image (custom upload takes priority)
  const autoTokenImage = useMemo(() => {
    if (!race || !characterClass) return null
    const mockCharacter = { race, class: characterClass } as Character
    return getCharacterTokenImage(mockCharacter)
  }, [race, characterClass])
  const tokenImage = draft.customTokenImage ?? autoTokenImage

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
  const isValid = draft.name.trim() && race && characterClass && background && draft.backgroundOriginFeat

  const handleSave = () => {
    if (!isValid || !race || !characterClass || !background || !draft.backgroundOriginFeat) return

    // Collect all origin feats (human racial + background)
    const originFeats: OriginFeatId[] = []
    if (draft.raceId === 'human' && draft.humanOriginFeat) {
      originFeats.push(draft.humanOriginFeat)
    }
    originFeats.push(draft.backgroundOriginFeat)

    // Collect Magic Initiate spell choices
    const magicInitiateChoices: MagicInitiateChoice[] = []
    if (draft.humanOriginFeat === 'magic-initiate' && draft.humanMagicInitiate) {
      magicInitiateChoices.push(draft.humanMagicInitiate)
    }
    if (draft.backgroundOriginFeat === 'magic-initiate' && draft.backgroundMagicInitiate) {
      magicInitiateChoices.push(draft.backgroundMagicInitiate)
    }

    const character: Character = {
      id: draft.editingCharacterId ?? `char-${Date.now()}`,
      name: draft.name,
      race,
      class: characterClass,
      subclass,
      background,
      originFeats,
      magicInitiateChoices: magicInitiateChoices.length > 0 ? magicInitiateChoices : undefined,
      level: draft.level,
      abilityScores: finalAbilityScores,
      // Store base scores and ASI choices for editing
      baseAbilityScores: { ...draft.baseAbilityScores },
      abilityBonusMode: draft.abilityBonusMode,
      abilityBonusPlus2: draft.abilityBonusPlus2,
      abilityBonusPlus1: draft.abilityBonusPlus1,
      abilityBonusPlus1Trio: draft.abilityBonusPlus1Trio.length > 0 ? [...draft.abilityBonusPlus1Trio] : undefined,
      classAsiSelections: draft.classAsiSelections.length > 0 ? [...draft.classAsiSelections] : undefined,
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
        offhandWeapon: offhandWeapon ?? undefined,
        armor: armor ?? undefined,
        shield: draft.shieldEquipped ? getArmorById('shield') : undefined,
        items: [],
      },
      features: [...classFeatures, ...subclassFeatures],
      conditions: [],
      deathSaves: { successes: 0, failures: 0 },
      spellSlots,
      knownSpells: [
        ...cantrips,
        ...spells,
        // Add Magic Initiate spells
        ...magicInitiateChoices.flatMap((choice) => [
          ...choice.cantrips.map((id) => getSpellById(id)),
          choice.levelOneSpell ? getSpellById(choice.levelOneSpell) : undefined,
        ]),
      ].filter((s): s is NonNullable<typeof s> => s !== undefined),
      masteredWeaponIds: draft.masteredWeaponIds.length > 0 ? draft.masteredWeaponIds : undefined,
      fightingStyles: [
        draft.fightingStyle,
        draft.additionalFightingStyle,
      ].filter((s): s is FightingStyle => s !== null),
      knownManeuverIds: draft.selectedManeuverIds.length > 0 ? draft.selectedManeuverIds : undefined,
      customTokenImage: draft.customTokenImage ?? undefined,
    }

    saveCharacter(character)
    setSavedCharacter(character)
    setShowSuccessModal(true)
  }

  return (
    <div className="space-y-4">
      {/* Header with Token, Name, and Core Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {/* Token */}
            <div className="shrink-0">
              {tokenImage ? (
                <img
                  src={tokenImage}
                  alt="Character token"
                  className="w-24 h-24 rounded-full object-cover border-2 border-violet-500 shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-3xl font-bold text-slate-400 border-2 border-slate-600">
                  {draft.name ? draft.name.charAt(0).toUpperCase() : '?'}
                </div>
              )}
            </div>

            {/* Name and Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Input
                  value={draft.name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Character Name"
                  className="text-xl font-bold h-auto py-1 px-2 border-none bg-transparent focus-visible:ring-1 max-w-[250px]"
                />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm bg-primary/20 text-primary px-2 py-0.5 rounded font-medium">
                  Level {draft.level}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  {race?.name ?? 'No race'}
                  {characterClass && getClassIcon(characterClass.id) && (
                    <img src={getClassIcon(characterClass.id)} alt="" className="w-5 h-5 object-contain" />
                  )}
                  {characterClass?.name ?? 'No class'}
                </span>
                {subclass && (
                  <span className="text-sm text-amber-400 font-medium">
                    {subclass.name}
                  </span>
                )}
              </div>

              {/* Core Stats Row */}
              <div className="flex gap-3">
                <div className="text-center px-4 py-2 bg-muted rounded-lg min-w-[70px]">
                  <Shield className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                  <div className="text-2xl font-bold">{ac}</div>
                  <div className="text-xs text-muted-foreground">AC</div>
                </div>
                <div className="text-center px-4 py-2 bg-muted rounded-lg min-w-[70px]">
                  <Heart className="w-4 h-4 mx-auto mb-1 text-red-400" />
                  <div className="text-2xl font-bold">{hp}</div>
                  <div className="text-xs text-muted-foreground">HP</div>
                </div>
                <div className="text-center px-4 py-2 bg-muted rounded-lg min-w-[70px]">
                  <Footprints className="w-4 h-4 mx-auto mb-1 text-green-400" />
                  <div className="text-2xl font-bold">{race?.speed ?? 30}</div>
                  <div className="text-xs text-muted-foreground">Speed</div>
                </div>
                <div className="text-center px-4 py-2 bg-muted rounded-lg min-w-[70px]">
                  <Award className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                  <div className="text-2xl font-bold">{formatModifier(proficiencyBonus)}</div>
                  <div className="text-xs text-muted-foreground">Prof</div>
                </div>
              </div>
            </div>

            {/* Ability Scores - Larger and more readable */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              {ABILITY_ORDER.map((ability) => {
                const score = finalAbilityScores[ability]
                const mod = getAbilityModifier(score)
                return (
                  <div key={ability} className="text-center px-3 py-2 border border-border/50 rounded-lg bg-muted/30">
                    <div className="text-xs font-medium text-muted-foreground mb-0.5">{ABILITY_LABELS[ability]}</div>
                    <div className="text-xl font-bold leading-tight">{score}</div>
                    <div className={`text-sm font-medium ${mod >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatModifier(mod)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Layout for Details */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Left Column: Equipment & Combat */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-red-400" />
              Combat & Equipment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Saving Throws */}
            <div>
              <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Saving Throws
              </div>
              <div className="grid grid-cols-3 gap-1">
                {ABILITY_ORDER.map((ability) => {
                  const isProficient = characterClass?.savingThrowProficiencies.includes(ability)
                  const mod = getAbilityModifier(finalAbilityScores[ability]) + (isProficient ? proficiencyBonus : 0)
                  return (
                    <div
                      key={ability}
                      className={`text-xs px-2 py-1 rounded flex items-center justify-between ${
                        isProficient ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <span className="font-medium">{ABILITY_LABELS[ability]}</span>
                      <span className={isProficient ? 'font-bold' : ''}>
                        {formatModifier(mod)}
                        {isProficient && ' ●'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Weapons */}
            {(meleeWeapon || rangedWeapon) && (
              <div>
                <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5" />
                  Weapons
                </div>
                <div className="space-y-2">
                  {meleeWeapon && (
                    <div className="px-3 py-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Swords className="w-4 h-4 text-orange-400" />
                        <span className="font-medium">{meleeWeapon.name}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>
                          <span className="text-foreground font-medium">{formatModifier(meleeAttackBonus)}</span> to hit
                        </span>
                        <span>
                          <span className="text-foreground font-medium">{meleeWeapon.damage}</span> damage
                        </span>
                      </div>
                    </div>
                  )}
                  {rangedWeapon && (
                    <div className="px-3 py-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-blue-400" />
                        <span className="font-medium">{rangedWeapon.name}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>
                          <span className="text-foreground font-medium">{formatModifier(rangedAttackBonus)}</span> to hit
                        </span>
                        <span>
                          <span className="text-foreground font-medium">{rangedWeapon.damage}</span> damage
                        </span>
                        {rangedWeapon.range && (
                          <span>
                            <span className="text-foreground font-medium">{rangedWeapon.range.normal}/{rangedWeapon.range.long}</span> ft
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Armor */}
            {(armor || draft.shieldEquipped) && (
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <HardHat className="w-3.5 h-3.5" />
                  Armor
                </div>
                <div className="flex flex-wrap gap-1">
                  {armor && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {armor.name} (AC {armor.baseAC})
                    </span>
                  )}
                  {draft.shieldEquipped && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      Shield (+2)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Spellcasting */}
            {(cantrips.length > 0 || spells.length > 0 || spellSlots) && (
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-violet-400" />
                  Spellcasting
                </div>
                {spellSlots && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {Object.entries(spellSlots)
                      .filter(([, slot]) => slot.max > 0)
                      .map(([level, slot]) => (
                        <span key={level} className="text-xs bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">
                          {level}: {slot.max}
                        </span>
                      ))}
                  </div>
                )}
                {cantrips.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {cantrips.map((spell) => spell && (
                      <span key={spell.id} className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                        {spell.name}
                      </span>
                    ))}
                  </div>
                )}
                {spells.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {spells.map((spell) => spell && (
                      <span key={spell.id} className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                        {spell.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Features & Racial Traits */}
        <div className="space-y-4">
          {/* Class Features */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                Class Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(classFeatures.length > 0 || subclassFeatures.length > 0) ? (
                <div className="space-y-2">
                  {[...classFeatures, ...subclassFeatures].map((feature, idx) => {
                    const detail = getFeatureDetail(feature, draft.level)
                    const isSubclassFeature = subclassFeatures.some(sf => sf.id === feature.id)
                    const isAsi = feature.name === 'Ability Score Improvement'
                    return (
                      <div key={`${feature.name}-${idx}`} className={cn(
                        "px-3 py-2 rounded-lg",
                        isAsi ? "bg-muted/20 opacity-60" : "bg-muted/50"
                      )}>
                        <div className="flex items-center justify-between">
                          <span className={cn("text-sm", isAsi ? "text-muted-foreground" : "font-medium")}>
                            {feature.name}
                            {isSubclassFeature && subclass && (
                              <span className="text-muted-foreground font-normal"> — {subclass.name}</span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">Lv.{feature.level}</span>
                        </div>
                        {detail && !isAsi && (
                          <div className="text-xs text-primary mt-0.5">{detail}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No features at this level</p>
              )}
            </CardContent>
          </Card>

          {/* Racial Traits */}
          {race && race.abilities.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Dna className="w-4 h-4 text-emerald-400" />
                  Racial Traits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {race.abilities.map((ability, idx) => {
                    const detail = getRacialAbilityDetail(ability)
                    return (
                      <div key={`${ability.name}-${idx}`} className="px-3 py-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{ability.name}</span>
                          {ability.trigger !== 'passive' && (
                            <span className="text-xs text-muted-foreground capitalize">
                              {ability.trigger.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        {detail && (
                          <div className="text-xs text-amber-400 mt-0.5">{detail}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowResetConfirm(true)}
          className="text-muted-foreground hover:text-destructive"
        >
          <TriangleAlert className="w-4 h-4 mr-1" />
          Start Over
        </Button>
        <Button onClick={handleSave} disabled={!isValid} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {draft.editingCharacterId ? 'Update Character' : 'Save Character'}
        </Button>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Over?</DialogTitle>
            <DialogDescription>
              This will clear all your character choices and return you to the beginning.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => {
              resetDraft()
              setShowResetConfirm(false)
            }}>
              Yes, Start Over
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <CharacterSaveSuccess
        character={savedCharacter}
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
      />
    </div>
  )
}
