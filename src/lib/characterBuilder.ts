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
import { calculateFinalAbilityScores, calculateMulticlassHP, calculateAC, getAllDraftAsiSelections } from '@/stores/characterStore'
import { getProficiencyBonus } from '@/types'
import type { Character, ClassEntry } from '@/types'
import type { FightingStyle } from '@/types/classFeature'

/**
 * Build a Character object from a CharacterDraft.
 * Returns null if the draft is missing required fields.
 */
/**
 * Returns a list of field names that are missing/invalid in the draft.
 * Empty array means the draft is valid and ready to save.
 */
export function getMissingDraftFields(draft: CharacterDraft): string[] {
  const missing: string[] = []
  if (!draft.name.trim()) missing.push('Character name')
  if (!draft.raceId || !getRaceById(draft.raceId)) missing.push('Race')
  if (!draft.backgroundId || !getBackgroundById(draft.backgroundId)) missing.push('Background')
  if (!draft.backgroundOriginFeat) missing.push('Background origin feat')
  if (draft.classEntries.length === 0 || draft.classEntries.reduce((s, e) => s + e.level, 0) === 0) missing.push('Class')
  return missing
}

export function buildCharacterFromDraft(draft: CharacterDraft): Character | null {
  const race = draft.raceId ? getRaceById(draft.raceId) ?? null : null
  const background = draft.backgroundId ? getBackgroundById(draft.backgroundId) ?? null : null

  // Need at least one class with levels
  if (draft.classEntries.length === 0) return null
  const totalLevel = draft.classEntries.reduce((s, e) => s + e.level, 0)
  if (totalLevel === 0) return null

  // Primary class is the first entry
  const primaryEntry = draft.classEntries[0]
  const primaryClass = getClassById(primaryEntry.classId)
  if (!primaryClass) return null

  if (!draft.name.trim() || !race || !background || !draft.backgroundOriginFeat) {
    return null
  }

  const primarySubclass = primaryClass.subclasses.find((s) => s.id === primaryEntry.subclassId)

  // Build ClassEntry array
  const classes: ClassEntry[] = draft.classEntries.map(entry => {
    const classData = getClassById(entry.classId)!
    const subclass = classData.subclasses.find(s => s.id === entry.subclassId)
    return { classId: entry.classId, classData, subclass, level: entry.level }
  })

  const meleeWeapon = draft.meleeWeaponId ? getWeaponById(draft.meleeWeaponId) ?? undefined : undefined
  const rangedWeapon = draft.rangedWeaponId ? getWeaponById(draft.rangedWeaponId) ?? undefined : undefined
  const offhandWeapon = draft.offhandWeaponId ? getWeaponById(draft.offhandWeaponId) ?? undefined : undefined
  const armor = draft.armorId ? getArmorById(draft.armorId) ?? null : null

  // Aggregate ASI selections from all class entries
  const allAsiSelections = getAllDraftAsiSelections(draft)

  const finalAbilityScores = calculateFinalAbilityScores(
    draft.baseAbilityScores,
    draft.abilityBonusPlus2,
    draft.abilityBonusPlus1,
    draft.abilityBonusMode,
    draft.abilityBonusPlus1Trio,
    allAsiSelections
  )
  const proficiencyBonus = getProficiencyBonus(totalLevel)

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

  // Aggregate fighting styles from all class entries
  const fightingStyles = draft.classEntries.flatMap(entry =>
    [entry.fightingStyle, entry.additionalFightingStyle].filter(
      (s): s is FightingStyle => s !== null
    )
  )

  const hp = calculateMulticlassHP(draft.classEntries, finalAbilityScores.constitution, originFeats, race.abilities)
  const ac = calculateAC(
    armor?.category !== 'shield' ? armor : null,
    draft.shieldEquipped,
    finalAbilityScores.dexterity,
    fightingStyles
  )

  // Aggregate features from all classes (each filtered by its own level)
  const allFeatures = draft.classEntries.flatMap(entry => {
    const classData = getClassById(entry.classId)
    if (!classData) return []
    const classFeatures = getClassFeaturesByLevel(classData, entry.level)
    const subclassFeatures = entry.subclassId
      ? getSubclassFeaturesByLevel(classData, entry.subclassId, entry.level)
      : []
    return [...classFeatures, ...subclassFeatures]
  })

  // Aggregate spells from all class entries
  const allCantripIds = draft.classEntries.flatMap(e => e.selectedCantrips)
  const allSpellIds = draft.classEntries.flatMap(e => e.selectedSpellIds)
  const cantrips = allCantripIds.map((id) => getSpellById(id)).filter(Boolean)
  const spells = allSpellIds.map((id) => getSpellById(id)).filter(Boolean)

  // Spell slots: use primary spellcasting class's progression for now
  // TODO: proper multiclass spell slot calculation
  let spellSlots: Character['spellSlots'] = undefined
  for (const entry of draft.classEntries) {
    const classData = getClassById(entry.classId)
    if (classData?.spellcasting) {
      const slotProgression = classData.spellcasting.spellSlotProgression[entry.level] || []
      const newSlots = {
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
      if (!spellSlots) {
        spellSlots = newSlots
      } else {
        // Merge: take max of each slot level
        for (let lvl = 1; lvl <= 9; lvl++) {
          const key = lvl as keyof typeof spellSlots
          spellSlots[key] = {
            max: Math.max(spellSlots[key].max, newSlots[key].max),
            current: Math.max(spellSlots[key].current, newSlots[key].current),
          }
        }
      }
    }
  }

  // Aggregate maneuvers from all class entries
  const allManeuverIds = draft.classEntries.flatMap(e => e.selectedManeuverIds)

  // Saving throw proficiencies come from first class only (D&D multiclass rule)
  const savingThrowProficiencies = primaryClass.savingThrowProficiencies

  return {
    id: draft.editingCharacterId ?? `char-${Date.now()}`,
    name: draft.name,
    race,
    class: primaryClass,
    subclass: primarySubclass,
    background,
    originFeats,
    magicInitiateChoices: magicInitiateChoices.length > 0 ? magicInitiateChoices : undefined,
    level: totalLevel,
    classes,
    abilityScores: finalAbilityScores,
    baseAbilityScores: { ...draft.baseAbilityScores },
    abilityBonusMode: draft.abilityBonusMode,
    abilityBonusPlus2: draft.abilityBonusPlus2,
    abilityBonusPlus1: draft.abilityBonusPlus1,
    abilityBonusPlus1Trio: draft.abilityBonusPlus1Trio.length > 0 ? [...draft.abilityBonusPlus1Trio] : undefined,
    classAsiSelections: allAsiSelections.length > 0 ? [...allAsiSelections] : undefined,
    maxHp: hp,
    currentHp: hp,
    temporaryHp: 0,
    ac,
    speed: race.speed,
    proficiencyBonus,
    skillProficiencies: [],
    savingThrowProficiencies,
    equipment: {
      meleeWeapon,
      rangedWeapon,
      offhandWeapon,
      armor: armor ?? undefined,
      shield: draft.shieldEquipped ? getArmorById('shield') : undefined,
      items: [],
    },
    features: allFeatures,
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
    knownManeuverIds: allManeuverIds.length > 0 ? allManeuverIds : undefined,
    customTokenImage: draft.customTokenImage ?? undefined,
  }
}
