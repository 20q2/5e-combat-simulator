import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Character,
  AbilityScores,
  AbilityName,
  CharacterClass,
  Armor,
  DragonAncestry,
  FightingStyle,
} from '@/types'
import { getAbilityModifier } from '@/types'
import type { OriginFeatId } from '@/data/originFeats'
import { getClassById } from '@/data'

export type AbilityScoreMethod = 'point-buy' | 'standard-array' | 'manual'
export type AbilityBonusMode = 'standard' | 'three-plus-one'

export type ElfLineage = 'drow' | 'high' | 'wood'
export type GnomeLineage = 'forest' | 'rock'
export type TieflingLegacy = 'abyssal' | 'chthonic' | 'infernal'
export type GoliathGiantAncestry = 'cloud' | 'fire' | 'frost' | 'hill' | 'stone' | 'storm'
export type KeenSensesSkill = 'insight' | 'perception' | 'survival'

// Magic Initiate feat spell choices
export type MagicInitiateSpellList = 'cleric' | 'druid' | 'wizard'
export type MagicInitiateAbility = 'intelligence' | 'wisdom' | 'charisma'

export interface MagicInitiateChoice {
  spellList: MagicInitiateSpellList
  spellcastingAbility: MagicInitiateAbility
  cantrips: string[] // spell IDs (max 2)
  levelOneSpell: string | null // spell ID
}

// Re-export for backward compatibility
export type OriginFeat = OriginFeatId

export interface CharacterDraft {
  name: string
  abilityScoreMethod: AbilityScoreMethod
  baseAbilityScores: AbilityScores
  abilityBonusMode: AbilityBonusMode
  abilityBonusPlus2: AbilityName | null
  abilityBonusPlus1: AbilityName | null
  abilityBonusPlus1Trio: AbilityName[]
  raceId: string | null
  // Racial choices
  dragonbornAncestry: DragonAncestry | null
  elfLineage: ElfLineage | null
  elfKeenSensesSkill: KeenSensesSkill | null
  gnomeLineage: GnomeLineage | null
  tieflingLegacy: TieflingLegacy | null
  goliathGiantAncestry: GoliathGiantAncestry | null
  humanOriginFeat: OriginFeat | null
  humanMagicInitiate: MagicInitiateChoice | null // Spell choices if human picked Magic Initiate
  // Background
  backgroundId: string | null
  backgroundOriginFeat: OriginFeat | null
  backgroundMagicInitiate: MagicInitiateChoice | null // Spell choices if background feat is Magic Initiate
  classId: string | null
  subclassId: string | null
  level: number
  selectedSpellIds: string[]
  selectedCantrips: string[]
  meleeWeaponId: string | null
  rangedWeaponId: string | null
  offhandWeaponId: string | null // Light weapon for two-weapon fighting
  armorId: string | null
  shieldEquipped: boolean
  masteredWeaponIds: string[]
  fightingStyle: FightingStyle | null
  additionalFightingStyle: FightingStyle | null  // For Champion level 10
  selectedManeuverIds: string[]  // Battle Master maneuvers
  // Class ASI selections - array of ASI choices indexed by order
  classAsiSelections: Array<{
    level: number  // Which level grants this ASI (4, 6, 8, etc.)
    mode: 'plus2-plus1' | 'plus1-plus1'  // +2 to one OR +1 to two
    plus2Ability?: AbilityName  // If mode is 'plus2-plus1'
    plus1Abilities: AbilityName[]  // 1 ability if 'plus2-plus1', 2 if 'plus1-plus1'
  }>
  editingCharacterId: string | null // Set when editing an existing character
}

interface CharacterState {
  // Draft character being created
  draft: CharacterDraft

  // Saved characters
  savedCharacters: Character[]

  // Current step in creation wizard
  currentStep: number

  // Actions
  setName: (name: string) => void
  setAbilityScoreMethod: (method: AbilityScoreMethod) => void
  setBaseAbilityScore: (ability: keyof AbilityScores, value: number) => void
  setBaseAbilityScores: (scores: AbilityScores) => void
  setRace: (raceId: string | null) => void
  setDragonbornAncestry: (ancestry: DragonAncestry | null) => void
  setElfLineage: (lineage: ElfLineage | null) => void
  setElfKeenSensesSkill: (skill: KeenSensesSkill | null) => void
  setGnomeLineage: (lineage: GnomeLineage | null) => void
  setTieflingLegacy: (legacy: TieflingLegacy | null) => void
  setGoliathGiantAncestry: (ancestry: GoliathGiantAncestry | null) => void
  setHumanOriginFeat: (feat: OriginFeat | null) => void
  setHumanMagicInitiate: (choice: MagicInitiateChoice | null) => void
  setBackground: (backgroundId: string | null) => void
  setBackgroundOriginFeat: (feat: OriginFeat | null) => void
  setBackgroundMagicInitiate: (choice: MagicInitiateChoice | null) => void
  setClass: (classId: string | null) => void
  setSubclass: (subclassId: string | null) => void
  setLevel: (level: number) => void
  toggleSpell: (spellId: string) => void
  toggleCantrip: (spellId: string) => void
  setMeleeWeapon: (weaponId: string | null) => void
  setRangedWeapon: (weaponId: string | null) => void
  setOffhandWeapon: (weaponId: string | null) => void
  setArmor: (armorId: string | null) => void
  setShield: (equipped: boolean) => void
  setMasteredWeapons: (weaponIds: string[]) => void
  toggleMasteredWeapon: (weaponId: string) => void
  setFightingStyle: (style: FightingStyle | null) => void
  setAdditionalFightingStyle: (style: FightingStyle | null) => void
  setSelectedManeuvers: (maneuverIds: string[]) => void
  toggleManeuver: (maneuverId: string) => void
  setClassAsiSelection: (index: number, selection: CharacterDraft['classAsiSelections'][0]) => void
  clearClassAsiSelection: (index: number) => void
  resetClassAsiSelections: () => void
  setAbilityBonusPlus2: (ability: AbilityName | null) => void
  setAbilityBonusPlus1: (ability: AbilityName | null) => void
  setAbilityBonusMode: (mode: AbilityBonusMode) => void
  toggleAbilityBonusPlus1Trio: (ability: AbilityName) => void
  setAbilityBonusPlus1Trio: (abilities: AbilityName[]) => void
  setCurrentStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  resetDraft: () => void
  saveCharacter: (character: Character) => void
  deleteCharacter: (characterId: string) => void
  loadCharacter: (characterId: string) => Character | undefined
  loadCharacterForEditing: (characterId: string) => boolean
}

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

const initialDraft: CharacterDraft = {
  name: '',
  abilityScoreMethod: 'point-buy',
  baseAbilityScores: {
    strength: 8,
    dexterity: 8,
    constitution: 8,
    intelligence: 8,
    wisdom: 8,
    charisma: 8,
  },
  abilityBonusMode: 'standard',
  abilityBonusPlus2: null,
  abilityBonusPlus1: null,
  abilityBonusPlus1Trio: [],
  raceId: null,
  dragonbornAncestry: null,
  elfLineage: null,
  elfKeenSensesSkill: null,
  gnomeLineage: null,
  tieflingLegacy: null,
  goliathGiantAncestry: null,
  humanOriginFeat: null,
  humanMagicInitiate: null,
  backgroundId: null,
  backgroundOriginFeat: null,
  backgroundMagicInitiate: null,
  classId: null,
  subclassId: null,
  level: 1,
  selectedSpellIds: [],
  selectedCantrips: [],
  meleeWeaponId: null,
  rangedWeaponId: null,
  offhandWeaponId: null,
  armorId: null,
  shieldEquipped: false,
  masteredWeaponIds: [],
  fightingStyle: null,
  additionalFightingStyle: null,
  selectedManeuverIds: [],
  classAsiSelections: [],
  editingCharacterId: null,
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      draft: { ...initialDraft },
      savedCharacters: [],
      currentStep: 0,

      setName: (name) =>
        set((state) => ({
          draft: { ...state.draft, name },
        })),

      setAbilityScoreMethod: (method) =>
        set((state) => {
          let scores = state.draft.baseAbilityScores
          if (method === 'standard-array') {
            // Reset to unassigned standard array
            scores = {
              strength: 8,
              dexterity: 8,
              constitution: 8,
              intelligence: 8,
              wisdom: 8,
              charisma: 8,
            }
          } else if (method === 'point-buy') {
            scores = {
              strength: 8,
              dexterity: 8,
              constitution: 8,
              intelligence: 8,
              wisdom: 8,
              charisma: 8,
            }
          }
          return {
            draft: { ...state.draft, abilityScoreMethod: method, baseAbilityScores: scores },
          }
        }),

      setBaseAbilityScore: (ability, value) =>
        set((state) => ({
          draft: {
            ...state.draft,
            baseAbilityScores: {
              ...state.draft.baseAbilityScores,
              [ability]: value,
            },
          },
        })),

      setBaseAbilityScores: (scores) =>
        set((state) => ({
          draft: { ...state.draft, baseAbilityScores: scores },
        })),

      setRace: (raceId) =>
        set((state) => ({
          draft: {
            ...state.draft,
            raceId,
            // Reset all racial choices when race changes
            dragonbornAncestry: null,
            elfLineage: null,
            elfKeenSensesSkill: null,
            gnomeLineage: null,
            tieflingLegacy: null,
            goliathGiantAncestry: null,
            humanOriginFeat: null,
          },
        })),

      setDragonbornAncestry: (ancestry) =>
        set((state) => ({
          draft: { ...state.draft, dragonbornAncestry: ancestry },
        })),

      setElfLineage: (lineage) =>
        set((state) => ({
          draft: { ...state.draft, elfLineage: lineage },
        })),

      setElfKeenSensesSkill: (skill) =>
        set((state) => ({
          draft: { ...state.draft, elfKeenSensesSkill: skill },
        })),

      setGnomeLineage: (lineage) =>
        set((state) => ({
          draft: { ...state.draft, gnomeLineage: lineage },
        })),

      setTieflingLegacy: (legacy) =>
        set((state) => ({
          draft: { ...state.draft, tieflingLegacy: legacy },
        })),

      setGoliathGiantAncestry: (ancestry) =>
        set((state) => ({
          draft: { ...state.draft, goliathGiantAncestry: ancestry },
        })),

      setHumanOriginFeat: (feat) =>
        set((state) => ({
          draft: {
            ...state.draft,
            humanOriginFeat: feat,
            // Clear magic initiate choices if feat changes
            humanMagicInitiate: feat === 'magic-initiate' ? state.draft.humanMagicInitiate : null,
          },
        })),

      setHumanMagicInitiate: (choice) =>
        set((state) => ({
          draft: { ...state.draft, humanMagicInitiate: choice },
        })),

      setBackground: (backgroundId) =>
        set((state) => ({
          draft: {
            ...state.draft,
            backgroundId,
            // Reset origin feat when background changes
            backgroundOriginFeat: null,
          },
        })),

      setBackgroundOriginFeat: (feat) =>
        set((state) => ({
          draft: {
            ...state.draft,
            backgroundOriginFeat: feat,
            // Clear magic initiate choices if feat changes
            backgroundMagicInitiate: feat === 'magic-initiate' ? state.draft.backgroundMagicInitiate : null,
          },
        })),

      setBackgroundMagicInitiate: (choice) =>
        set((state) => ({
          draft: { ...state.draft, backgroundMagicInitiate: choice },
        })),

      setClass: (classId) =>
        set((state) => ({
          draft: {
            ...state.draft,
            classId,
            subclassId: null, // Reset subclass when class changes
            selectedSpellIds: [],
            selectedCantrips: [],
            fightingStyle: null, // Reset fighting style when class changes
            additionalFightingStyle: null,
            selectedManeuverIds: [], // Reset maneuvers when class changes
            classAsiSelections: [], // Reset ASI selections when class changes
          },
        })),

      setSubclass: (subclassId) =>
        set((state) => ({
          draft: {
            ...state.draft,
            subclassId,
            selectedManeuverIds: [], // Reset maneuvers when subclass changes
          },
        })),

      setLevel: (level) =>
        set((state) => {
          const newLevel = Math.max(1, Math.min(20, level))
          // Get available ASI levels for current class
          const classData = state.draft.classId ? getClassById(state.draft.classId) : null
          const availableAsiLevels = classData
            ? getClassAsiLevels(classData, newLevel)
            : []

          // Trim ASI selections that are no longer available
          const trimmedAsiSelections = state.draft.classAsiSelections.filter(
            (_, index) => index < availableAsiLevels.length
          )

          return {
            draft: {
              ...state.draft,
              level: newLevel,
              classAsiSelections: trimmedAsiSelections,
            },
          }
        }),

      toggleSpell: (spellId) =>
        set((state) => {
          const spells = state.draft.selectedSpellIds
          const newSpells = spells.includes(spellId)
            ? spells.filter((id) => id !== spellId)
            : [...spells, spellId]
          return {
            draft: { ...state.draft, selectedSpellIds: newSpells },
          }
        }),

      toggleCantrip: (spellId) =>
        set((state) => {
          const cantrips = state.draft.selectedCantrips
          const newCantrips = cantrips.includes(spellId)
            ? cantrips.filter((id) => id !== spellId)
            : [...cantrips, spellId]
          return {
            draft: { ...state.draft, selectedCantrips: newCantrips },
          }
        }),

      setMeleeWeapon: (weaponId) =>
        set((state) => ({
          draft: { ...state.draft, meleeWeaponId: weaponId },
        })),

      setRangedWeapon: (weaponId) =>
        set((state) => ({
          draft: { ...state.draft, rangedWeaponId: weaponId },
        })),

      setOffhandWeapon: (weaponId) =>
        set((state) => ({
          draft: {
            ...state.draft,
            offhandWeaponId: weaponId,
            // Clear shield if equipping offhand weapon
            shieldEquipped: weaponId ? false : state.draft.shieldEquipped,
          },
        })),

      setArmor: (armorId) =>
        set((state) => ({
          draft: { ...state.draft, armorId },
        })),

      setShield: (equipped) =>
        set((state) => ({
          draft: {
            ...state.draft,
            shieldEquipped: equipped,
            // Clear offhand weapon if equipping shield
            offhandWeaponId: equipped ? null : state.draft.offhandWeaponId,
          },
        })),

      setMasteredWeapons: (weaponIds) =>
        set((state) => ({
          draft: { ...state.draft, masteredWeaponIds: weaponIds },
        })),

      toggleMasteredWeapon: (weaponId) =>
        set((state) => {
          const current = state.draft.masteredWeaponIds
          const isSelected = current.includes(weaponId)
          return {
            draft: {
              ...state.draft,
              masteredWeaponIds: isSelected
                ? current.filter((id) => id !== weaponId)
                : [...current, weaponId],
            },
          }
        }),

      setFightingStyle: (style) =>
        set((state) => ({
          draft: { ...state.draft, fightingStyle: style },
        })),

      setAdditionalFightingStyle: (style) =>
        set((state) => ({
          draft: { ...state.draft, additionalFightingStyle: style },
        })),

      setSelectedManeuvers: (maneuverIds) =>
        set((state) => ({
          draft: { ...state.draft, selectedManeuverIds: maneuverIds },
        })),

      toggleManeuver: (maneuverId) =>
        set((state) => {
          const current = state.draft.selectedManeuverIds
          const isSelected = current.includes(maneuverId)
          return {
            draft: {
              ...state.draft,
              selectedManeuverIds: isSelected
                ? current.filter((id) => id !== maneuverId)
                : [...current, maneuverId],
            },
          }
        }),

      setClassAsiSelection: (index, selection) =>
        set((state) => {
          const newSelections = [...state.draft.classAsiSelections]
          // Ensure array has enough elements to prevent sparse arrays
          while (newSelections.length <= index) {
            newSelections.push({
              level: 0, // Will be set when actually used
              mode: 'plus2-plus1',
              plus1Abilities: [],
            })
          }
          newSelections[index] = selection
          return {
            draft: { ...state.draft, classAsiSelections: newSelections },
          }
        }),

      clearClassAsiSelection: (index) =>
        set((state) => {
          const newSelections = state.draft.classAsiSelections.filter((_, i) => i !== index)
          return {
            draft: { ...state.draft, classAsiSelections: newSelections },
          }
        }),

      resetClassAsiSelections: () =>
        set((state) => ({
          draft: { ...state.draft, classAsiSelections: [] },
        })),

      setAbilityBonusPlus2: (ability) =>
        set((state) => ({
          draft: {
            ...state.draft,
            abilityBonusPlus2: ability,
            // If +1 was on the same ability, clear it
            abilityBonusPlus1: state.draft.abilityBonusPlus1 === ability ? null : state.draft.abilityBonusPlus1,
          },
        })),

      setAbilityBonusPlus1: (ability) =>
        set((state) => ({
          draft: {
            ...state.draft,
            abilityBonusPlus1: ability,
            // If +2 was on the same ability, clear it
            abilityBonusPlus2: state.draft.abilityBonusPlus2 === ability ? null : state.draft.abilityBonusPlus2,
          },
        })),

      setAbilityBonusMode: (mode) =>
        set((state) => ({
          draft: {
            ...state.draft,
            abilityBonusMode: mode,
            // Clear selections when switching modes
            abilityBonusPlus2: null,
            abilityBonusPlus1: null,
            abilityBonusPlus1Trio: [],
          },
        })),

      toggleAbilityBonusPlus1Trio: (ability) =>
        set((state) => {
          const current = state.draft.abilityBonusPlus1Trio
          const isSelected = current.includes(ability)
          let newTrio: AbilityName[]

          if (isSelected) {
            // Remove the ability
            newTrio = current.filter((a) => a !== ability)
          } else if (current.length < 3) {
            // Add the ability (max 3)
            newTrio = [...current, ability]
          } else {
            // Already at max, don't change
            newTrio = current
          }

          return {
            draft: {
              ...state.draft,
              abilityBonusPlus1Trio: newTrio,
            },
          }
        }),

      setAbilityBonusPlus1Trio: (abilities) =>
        set((state) => ({
          draft: {
            ...state.draft,
            abilityBonusPlus1Trio: abilities.slice(0, 3),
          },
        })),

      setCurrentStep: (step) => set({ currentStep: step }),

      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(state.currentStep + 1, 7),
        })),

      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(state.currentStep - 1, 0),
        })),

      resetDraft: () =>
        set({
          draft: { ...initialDraft },
          currentStep: 0,
        }),

      saveCharacter: (character) =>
        set((state) => {
          const existing = state.savedCharacters.findIndex((c) => c.id === character.id)
          if (existing >= 0) {
            const updated = [...state.savedCharacters]
            updated[existing] = character
            return { savedCharacters: updated }
          }
          return { savedCharacters: [...state.savedCharacters, character] }
        }),

      deleteCharacter: (characterId) =>
        set((state) => ({
          savedCharacters: state.savedCharacters.filter((c) => c.id !== characterId),
        })),

      loadCharacter: (characterId) => {
        return get().savedCharacters.find((c) => c.id === characterId)
      },

      loadCharacterForEditing: (characterId) => {
        const character = get().savedCharacters.find((c) => c.id === characterId)
        if (!character) return false

        // Use stored base scores if available, otherwise fall back to final scores
        // (for backwards compatibility with characters saved before this feature)
        const baseScores = character.baseAbilityScores ?? character.abilityScores
        const bonusMode = character.abilityBonusMode ?? 'standard'
        const bonusPlus2 = character.abilityBonusPlus2 ?? null
        const bonusPlus1 = character.abilityBonusPlus1 ?? null
        const bonusPlus1Trio = character.abilityBonusPlus1Trio ?? []

        // Map Character back to CharacterDraft
        set({
          draft: {
            name: character.name,
            abilityScoreMethod: 'point-buy', // Can't know original method, default to point-buy
            baseAbilityScores: { ...baseScores },
            abilityBonusMode: bonusMode,
            abilityBonusPlus2: bonusPlus2,
            abilityBonusPlus1: bonusPlus1,
            abilityBonusPlus1Trio: [...bonusPlus1Trio],
            raceId: character.race.id,
            dragonbornAncestry: null, // These would need to be stored on Character to restore
            elfLineage: null,
            elfKeenSensesSkill: null,
            gnomeLineage: null,
            tieflingLegacy: null,
            goliathGiantAncestry: null,
            humanOriginFeat: null,
            humanMagicInitiate: null,
            backgroundId: character.background?.id ?? null,
            backgroundOriginFeat: null,
            backgroundMagicInitiate: null,
            classId: character.class.id,
            subclassId: character.subclass?.id ?? null,
            level: character.level,
            selectedSpellIds: character.knownSpells?.map(s => s.id) ?? [],
            selectedCantrips: character.knownSpells?.filter(s => s.level === 0).map(s => s.id) ?? [],
            meleeWeaponId: character.equipment.meleeWeapon?.id ?? null,
            rangedWeaponId: character.equipment.rangedWeapon?.id ?? null,
            offhandWeaponId: character.equipment.offhandWeapon?.id ?? null,
            armorId: character.equipment.armor?.id ?? null,
            shieldEquipped: !!character.equipment.shield,
            masteredWeaponIds: character.masteredWeaponIds ?? [],
            fightingStyle: character.fightingStyles?.[0] ?? null,
            additionalFightingStyle: character.fightingStyles?.[1] ?? null,
            selectedManeuverIds: character.knownManeuverIds ?? [],
            classAsiSelections: character.classAsiSelections ?? [],
            editingCharacterId: character.id,
          },
          currentStep: 0,
        })

        return true
      },
    }),
    {
      name: '5e-combat-sim-characters',
      partialize: (state) => ({
        savedCharacters: state.savedCharacters,
      }),
    }
  )
)

// Helper functions for character calculations
export function calculateFinalAbilityScores(
  baseScores: AbilityScores,
  abilityBonusPlus2: AbilityName | null,
  abilityBonusPlus1: AbilityName | null,
  abilityBonusMode: AbilityBonusMode = 'standard',
  abilityBonusPlus1Trio: AbilityName[] = [],
  classAsiSelections: CharacterDraft['classAsiSelections'] = []
): AbilityScores {
  const result = { ...baseScores }

  // Apply background bonuses
  if (abilityBonusMode === 'standard') {
    // +2 to one stat, +1 to another
    if (abilityBonusPlus2) {
      result[abilityBonusPlus2] += 2
    }
    if (abilityBonusPlus1) {
      result[abilityBonusPlus1] += 1
    }
  } else {
    // Three +1s to different stats
    for (const ability of abilityBonusPlus1Trio) {
      result[ability] += 1
    }
  }

  // Apply class ASI bonuses (filter out undefined/null entries)
  for (const asiSelection of classAsiSelections.filter(Boolean)) {
    if (asiSelection.mode === 'plus2-plus1') {
      // +2 to one ability, +1 to another
      if (asiSelection.plus2Ability) {
        result[asiSelection.plus2Ability] = Math.min(20, result[asiSelection.plus2Ability] + 2)
      }
      if (asiSelection.plus1Abilities[0]) {
        result[asiSelection.plus1Abilities[0]] = Math.min(20, result[asiSelection.plus1Abilities[0]] + 1)
      }
    } else {
      // +1 to two different abilities
      for (const ability of asiSelection.plus1Abilities.slice(0, 2)) {
        result[ability] = Math.min(20, result[ability] + 1)
      }
    }
  }

  return result
}

export function calculateHP(
  characterClass: CharacterClass,
  level: number,
  constitution: number,
  originFeats: OriginFeatId[] = []
): number {
  const conMod = getAbilityModifier(constitution)
  // Max HP at level 1, then average for subsequent levels
  const firstLevel = characterClass.hitDie + conMod
  const subsequentLevels = (level - 1) * (Math.floor(characterClass.hitDie / 2) + 1 + conMod)
  let hp = Math.max(1, firstLevel + subsequentLevels)

  // Tough feat: +2 HP per level
  if (originFeats.includes('tough')) {
    hp += level * 2
  }

  return hp
}

export function calculateAC(
  armor: Armor | null,
  shield: boolean,
  dexterity: number,
  fightingStyles: FightingStyle[] = []
): number {
  const dexMod = getAbilityModifier(dexterity)
  let ac = 10 + dexMod // Base AC without armor

  if (armor) {
    if (armor.category === 'shield') {
      ac += armor.baseAC
    } else {
      ac = armor.baseAC
      if (armor.dexBonus) {
        const maxDex = armor.maxDexBonus ?? Infinity
        ac += Math.min(dexMod, maxDex)
      }
    }
  }

  if (shield) {
    ac += 2 // Standard shield bonus
  }

  // Defense fighting style: +1 AC when wearing armor
  if (fightingStyles.includes('defense') && armor && armor.category !== 'shield') {
    ac += 1
  }

  return ac
}

/**
 * Get all ASI levels available for a class at the given character level.
 * Returns an array of levels where the class grants ASI features.
 *
 * @example Fighter level 12 returns [4, 6, 8, 12]
 * @example Rogue level 8 returns [4, 8]
 */
export function getClassAsiLevels(
  characterClass: CharacterClass,
  characterLevel: number
): number[] {
  return characterClass.features
    .filter(
      (feature) =>
        feature.type === 'generic' &&
        feature.name === 'Ability Score Improvement' &&
        feature.level <= characterLevel
    )
    .map((feature) => feature.level)
    .sort((a, b) => a - b)
}

export function getPointBuyCost(score: number): number {
  if (score <= 8) return 0
  if (score <= 13) return score - 8
  if (score === 14) return 7
  if (score === 15) return 9
  return Infinity // Can't go above 15 in point buy
}

export function getTotalPointBuyCost(scores: AbilityScores): number {
  return Object.values(scores).reduce((total, score) => total + getPointBuyCost(score), 0)
}

export const POINT_BUY_BUDGET = 27
export { STANDARD_ARRAY }
