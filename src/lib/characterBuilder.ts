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
import type { CharacterDraft, MagicInitiateChoice } from '@/stores/characterStore'
import { calculateFinalAbilityScores, calculateHP, calculateAC } from '@/stores/characterStore'
import { getProficiencyBonus } from '@/types'
import type { Character } from '@/types'
import type { FightingStyle } from '@/types/classFeature'

/**
 * Build a Character object from a CharacterDraft.
 * Returns null if the draft is missing required fields.
 */
export function buildCharacterFromDraft(draft: CharacterDraft): Character | null {
  const race = draft.raceId ? getRaceById(draft.raceId) ?? null : null
  const characterClass = draft.classId ? getClassById(draft.classId) ?? null : null
  const background = draft.backgroundId ? getBackgroundById(draft.backgroundId) ?? null : null

  if (!draft.name.trim() || !race || !characterClass || !background || !draft.backgroundOriginFeat) {
    return null
  }

  const subclass = characterClass.subclasses.find((s) => s.id === draft.subclassId)
  const meleeWeapon = draft.meleeWeaponId ? getWeaponById(draft.meleeWeaponId) ?? undefined : undefined
  const rangedWeapon = draft.rangedWeaponId ? getWeaponById(draft.rangedWeaponId) ?? undefined : undefined
  const offhandWeapon = draft.offhandWeaponId ? getWeaponById(draft.offhandWeaponId) ?? undefined : undefined
  const armor = draft.armorId ? getArmorById(draft.armorId) ?? null : null

  const finalAbilityScores = calculateFinalAbilityScores(
    draft.baseAbilityScores,
    draft.abilityBonusPlus2,
    draft.abilityBonusPlus1,
    draft.abilityBonusMode,
    draft.abilityBonusPlus1Trio,
    draft.classAsiSelections
  )
  const proficiencyBonus = getProficiencyBonus(draft.level)

  // Origin feats
  const originFeats: OriginFeatId[] = []
  if (draft.raceId === 'human' && draft.humanOriginFeat) {
    originFeats.push(draft.humanOriginFeat)
  }
  originFeats.push(draft.backgroundOriginFeat)

  // Magic Initiate
  const magicInitiateChoices: MagicInitiateChoice[] = []
  if (draft.humanOriginFeat === 'magic-initiate' && draft.humanMagicInitiate) {
    magicInitiateChoices.push(draft.humanMagicInitiate)
  }
  if (draft.backgroundOriginFeat === 'magic-initiate' && draft.backgroundMagicInitiate) {
    magicInitiateChoices.push(draft.backgroundMagicInitiate)
  }

  const fightingStyles = [draft.fightingStyle, draft.additionalFightingStyle].filter(
    (s): s is FightingStyle => s !== null
  )

  const hp = calculateHP(characterClass, draft.level, finalAbilityScores.constitution, originFeats)
  const ac = calculateAC(
    armor?.category !== 'shield' ? armor : null,
    draft.shieldEquipped,
    finalAbilityScores.dexterity,
    fightingStyles
  )

  const classFeatures = getClassFeaturesByLevel(characterClass, draft.level)
  const subclassFeatures = draft.subclassId
    ? getSubclassFeaturesByLevel(characterClass, draft.subclassId, draft.level)
    : []

  const cantrips = draft.selectedCantrips.map((id) => getSpellById(id)).filter(Boolean)
  const spells = draft.selectedSpellIds.map((id) => getSpellById(id)).filter(Boolean)

  let spellSlots: Character['spellSlots'] = undefined
  if (characterClass.spellcasting) {
    const slotProgression = characterClass.spellcasting.spellSlotProgression[draft.level] || []
    spellSlots = {
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
  }

  return {
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
      meleeWeapon,
      rangedWeapon,
      offhandWeapon,
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
      ...magicInitiateChoices.flatMap((choice) => [
        ...choice.cantrips.map((id) => getSpellById(id)),
        choice.levelOneSpell ? getSpellById(choice.levelOneSpell) : undefined,
      ]),
    ].filter((s): s is NonNullable<typeof s> => s !== undefined),
    masteredWeaponIds: draft.masteredWeaponIds.length > 0 ? draft.masteredWeaponIds : undefined,
    fightingStyles,
    knownManeuverIds: draft.selectedManeuverIds.length > 0 ? draft.selectedManeuverIds : undefined,
    customTokenImage: draft.customTokenImage ?? undefined,
  }
}
