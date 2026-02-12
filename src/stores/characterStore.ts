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

export type ClassAsiSelection = {
  level: number  // Which level grants this ASI (4, 6, 8, etc.)
  mode: 'plus2-plus1' | 'plus1-plus1'  // +2 to one OR +1 to two
  plus2Ability?: AbilityName  // If mode is 'plus2-plus1'
  plus1Abilities: AbilityName[]  // 1 ability if 'plus2-plus1', 2 if 'plus1-plus1'
}

export interface ClassDraftEntry {
  classId: string
  subclassId: string | null
  level: number  // levels in THIS class
  fightingStyle: FightingStyle | null
  additionalFightingStyle: FightingStyle | null
  selectedManeuverIds: string[]
  classAsiSelections: ClassAsiSelection[]
  selectedSpellIds: string[]
  selectedCantrips: string[]
}

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
  // Multiclass entries — each class the character has levels in
  classEntries: ClassDraftEntry[]
  meleeWeaponId: string | null
  rangedWeaponId: string | null
  offhandWeaponId: string | null // Light weapon for two-weapon fighting
  armorId: string | null
  shieldEquipped: boolean
  masteredWeaponIds: string[]
  customTokenImage: string | null // User-uploaded token image as base64 data URL
  editingCharacterId: string | null // Set when editing an existing character
}

interface CharacterState {
  // Draft character being created
  draft: CharacterDraft

  // Saved characters
  savedCharacters: Character[]

  // Current step in creation wizard (string ID for dynamic steps)
  currentStep: string

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
  // Multiclass actions
  setClassLevel: (classId: string, level: number) => void
  setClassSubclass: (classId: string, subclassId: string | null) => void
  setClassFightingStyle: (classId: string, style: FightingStyle | null) => void
  setClassAdditionalFightingStyle: (classId: string, style: FightingStyle | null) => void
  setClassManeuvers: (classId: string, maneuverIds: string[]) => void
  toggleClassManeuver: (classId: string, maneuverId: string) => void
  setClassAsiSelection: (classId: string, index: number, selection: ClassAsiSelection) => void
  clearClassAsiSelection: (classId: string, index: number) => void
  toggleClassSpell: (classId: string, spellId: string) => void
  toggleClassCantrip: (classId: string, spellId: string) => void
  // Equipment actions (not per-class)
  setMeleeWeapon: (weaponId: string | null) => void
  setRangedWeapon: (weaponId: string | null) => void
  setOffhandWeapon: (weaponId: string | null) => void
  setArmor: (armorId: string | null) => void
  setShield: (equipped: boolean) => void
  setMasteredWeapons: (weaponIds: string[]) => void
  toggleMasteredWeapon: (weaponId: string) => void
  setAbilityBonusPlus2: (ability: AbilityName | null) => void
  setAbilityBonusPlus1: (ability: AbilityName | null) => void
  setAbilityBonusMode: (mode: AbilityBonusMode) => void
  toggleAbilityBonusPlus1Trio: (ability: AbilityName) => void
  setAbilityBonusPlus1Trio: (abilities: AbilityName[]) => void
  setCustomTokenImage: (image: string | null) => void
  setCurrentStep: (step: string) => void
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
  classEntries: [],
  meleeWeaponId: null,
  rangedWeaponId: null,
  offhandWeaponId: null,
  armorId: null,
  shieldEquipped: false,
  masteredWeaponIds: [],
  customTokenImage: null,
  editingCharacterId: null,
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      draft: { ...initialDraft },
      savedCharacters: [],
      currentStep: 'abilities',

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

      setClassLevel: (classId, level) =>
        set((state) => {
          const entries = [...state.draft.classEntries]
          const existingIdx = entries.findIndex(e => e.classId === classId)
          const otherLevels = entries.reduce((sum, e, i) => i === existingIdx ? sum : sum + e.level, 0)
          const clampedLevel = Math.max(0, Math.min(20 - otherLevels, level))

          if (clampedLevel === 0) {
            // Remove entry
            return { draft: { ...state.draft, classEntries: entries.filter(e => e.classId !== classId) } }
          }

          if (existingIdx >= 0) {
            const entry = { ...entries[existingIdx], level: clampedLevel }
            // Trim ASI selections if level decreased
            const classData = getClassById(classId)
            if (classData) {
              const maxAsis = getClassAsiLevels(classData, clampedLevel).length
              entry.classAsiSelections = entry.classAsiSelections.slice(0, maxAsis)
            }
            entries[existingIdx] = entry
          } else {
            entries.push({
              classId,
              subclassId: null,
              level: clampedLevel,
              fightingStyle: null,
              additionalFightingStyle: null,
              selectedManeuverIds: [],
              classAsiSelections: [],
              selectedSpellIds: [],
              selectedCantrips: [],
            })
          }

          return { draft: { ...state.draft, classEntries: entries } }
        }),

      setClassSubclass: (classId, subclassId) =>
        set((state) => {
          const entries = state.draft.classEntries.map(e =>
            e.classId === classId ? { ...e, subclassId, selectedManeuverIds: [] } : e
          )
          return { draft: { ...state.draft, classEntries: entries } }
        }),

      setClassFightingStyle: (classId, style) =>
        set((state) => {
          const entries = state.draft.classEntries.map(e =>
            e.classId === classId ? { ...e, fightingStyle: style } : e
          )
          return { draft: { ...state.draft, classEntries: entries } }
        }),

      setClassAdditionalFightingStyle: (classId, style) =>
        set((state) => {
          const entries = state.draft.classEntries.map(e =>
            e.classId === classId ? { ...e, additionalFightingStyle: style } : e
          )
          return { draft: { ...state.draft, classEntries: entries } }
        }),

      setClassManeuvers: (classId, maneuverIds) =>
        set((state) => {
          const entries = state.draft.classEntries.map(e =>
            e.classId === classId ? { ...e, selectedManeuverIds: maneuverIds } : e
          )
          return { draft: { ...state.draft, classEntries: entries } }
        }),

      toggleClassManeuver: (classId, maneuverId) =>
        set((state) => {
          const entries = state.draft.classEntries.map(e => {
            if (e.classId !== classId) return e
            const isSelected = e.selectedManeuverIds.includes(maneuverId)
            return {
              ...e,
              selectedManeuverIds: isSelected
                ? e.selectedManeuverIds.filter(id => id !== maneuverId)
                : [...e.selectedManeuverIds, maneuverId],
            }
          })
          return { draft: { ...state.draft, classEntries: entries } }
        }),

      setClassAsiSelection: (classId, index, selection) =>
        set((state) => {
          const entries = state.draft.classEntries.map(e => {
            if (e.classId !== classId) return e
            const newSelections = [...e.classAsiSelections]
            while (newSelections.length <= index) {
              newSelections.push({ level: 0, mode: 'plus2-plus1', plus1Abilities: [] })
            }
            newSelections[index] = selection
            return { ...e, classAsiSelections: newSelections }
          })
          return { draft: { ...state.draft, classEntries: entries } }
        }),

      clearClassAsiSelection: (classId, index) =>
        set((state) => {
          const entries = state.draft.classEntries.map(e => {
            if (e.classId !== classId) return e
            return { ...e, classAsiSelections: e.classAsiSelections.filter((_, i) => i !== index) }
          })
          return { draft: { ...state.draft, classEntries: entries } }
        }),

      toggleClassSpell: (classId, spellId) =>
        set((state) => {
          const entries = state.draft.classEntries.map(e => {
            if (e.classId !== classId) return e
            const has = e.selectedSpellIds.includes(spellId)
            return {
              ...e,
              selectedSpellIds: has
                ? e.selectedSpellIds.filter(id => id !== spellId)
                : [...e.selectedSpellIds, spellId],
            }
          })
          return { draft: { ...state.draft, classEntries: entries } }
        }),

      toggleClassCantrip: (classId, spellId) =>
        set((state) => {
          const entries = state.draft.classEntries.map(e => {
            if (e.classId !== classId) return e
            const has = e.selectedCantrips.includes(spellId)
            return {
              ...e,
              selectedCantrips: has
                ? e.selectedCantrips.filter(id => id !== spellId)
                : [...e.selectedCantrips, spellId],
            }
          })
          return { draft: { ...state.draft, classEntries: entries } }
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

      setCustomTokenImage: (image) =>
        set((state) => ({
          draft: { ...state.draft, customTokenImage: image },
        })),

      setCurrentStep: (step) => set({ currentStep: step }),

      resetDraft: () =>
        set({
          draft: { ...initialDraft },
          currentStep: 'abilities',
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

        // Build classEntries from character data
        let classEntries: ClassDraftEntry[]
        if (character.classes && character.classes.length > 0) {
          // New multiclass format
          classEntries = character.classes.map(entry => ({
            classId: entry.classId,
            subclassId: entry.subclass?.id ?? null,
            level: entry.level,
            fightingStyle: null,  // Will be populated below
            additionalFightingStyle: null,
            selectedManeuverIds: [],
            classAsiSelections: [],
            selectedSpellIds: [],
            selectedCantrips: [],
          }))
          // Put fighting styles on the first class that has a fighting style feature
          if (character.fightingStyles && character.fightingStyles.length > 0 && classEntries.length > 0) {
            classEntries[0].fightingStyle = character.fightingStyles[0] ?? null
            classEntries[0].additionalFightingStyle = character.fightingStyles[1] ?? null
          }
          // Put maneuvers on the first class entry (usually fighter/battle master)
          if (character.knownManeuverIds && classEntries.length > 0) {
            classEntries[0].selectedManeuverIds = character.knownManeuverIds
          }
          // Put ASI selections on the first class entry
          if (character.classAsiSelections && classEntries.length > 0) {
            classEntries[0].classAsiSelections = character.classAsiSelections
          }
          // Put spells on the first spellcasting class
          const spellIds = character.knownSpells?.filter(s => s.level > 0).map(s => s.id) ?? []
          const cantripIds = character.knownSpells?.filter(s => s.level === 0).map(s => s.id) ?? []
          const spellcasterEntry = classEntries.find(e => {
            const cd = getClassById(e.classId)
            return cd?.spellcasting !== undefined
          })
          if (spellcasterEntry) {
            spellcasterEntry.selectedSpellIds = spellIds
            spellcasterEntry.selectedCantrips = cantripIds
          }
        } else {
          // Legacy single-class format
          classEntries = [{
            classId: character.class.id,
            subclassId: character.subclass?.id ?? null,
            level: character.level,
            fightingStyle: character.fightingStyles?.[0] ?? null,
            additionalFightingStyle: character.fightingStyles?.[1] ?? null,
            selectedManeuverIds: character.knownManeuverIds ?? [],
            classAsiSelections: character.classAsiSelections ?? [],
            selectedSpellIds: character.knownSpells?.filter(s => s.level > 0).map(s => s.id) ?? [],
            selectedCantrips: character.knownSpells?.filter(s => s.level === 0).map(s => s.id) ?? [],
          }]
        }

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
            humanOriginFeat: character.race.id === 'human' && character.originFeats.length > 1
              ? character.originFeats[0] ?? null
              : null,
            humanMagicInitiate: character.race.id === 'human' && character.originFeats.length > 1
              ? character.magicInitiateChoices?.[0] ?? null
              : null,
            backgroundId: character.background?.id ?? null,
            backgroundOriginFeat: character.race.id === 'human' && character.originFeats.length > 1
              ? character.originFeats[1] ?? null
              : character.originFeats[0] ?? null,
            backgroundMagicInitiate: character.race.id === 'human' && character.originFeats.length > 1
              ? character.magicInitiateChoices?.[1] ?? null
              : character.magicInitiateChoices?.[0] ?? null,
            classEntries,
            meleeWeaponId: character.equipment.meleeWeapon?.id ?? null,
            rangedWeaponId: character.equipment.rangedWeapon?.id ?? null,
            offhandWeaponId: character.equipment.offhandWeapon?.id ?? null,
            armorId: character.equipment.armor?.id ?? null,
            shieldEquipped: !!character.equipment.shield,
            masteredWeaponIds: character.masteredWeaponIds ?? [],
            customTokenImage: character.customTokenImage ?? null,
            editingCharacterId: character.id,
          },
          currentStep: 'abilities',
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
  classAsiSelections: ClassAsiSelection[] = []
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
      // +1 to three different abilities
      for (const ability of asiSelection.plus1Abilities.slice(0, 3)) {
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

/**
 * Calculate HP for multiclass characters.
 * First class gets max hit die at level 1, subsequent classes use average for all levels.
 */
export function calculateMulticlassHP(
  classEntries: Array<{ classId: string; level: number }>,
  constitution: number,
  originFeats: OriginFeatId[] = []
): number {
  const conMod = getAbilityModifier(constitution)
  let hp = 0

  classEntries.forEach((entry, index) => {
    const classData = getClassById(entry.classId)
    if (!classData) return

    if (index === 0) {
      // First class: max hit die at level 1
      hp += classData.hitDie + conMod
      // Subsequent levels in first class
      hp += (entry.level - 1) * (Math.floor(classData.hitDie / 2) + 1 + conMod)
    } else {
      // Additional classes: average for all levels (no max at level 1)
      hp += entry.level * (Math.floor(classData.hitDie / 2) + 1 + conMod)
    }
  })

  hp = Math.max(1, hp)

  const totalLevel = classEntries.reduce((s, e) => s + e.level, 0)
  if (originFeats.includes('tough')) {
    hp += totalLevel * 2
  }

  return hp
}

/**
 * Helper to get total level from draft class entries
 */
export function getDraftTotalLevel(draft: CharacterDraft): number {
  return draft.classEntries.reduce((sum, e) => sum + e.level, 0)
}

/**
 * Helper to get a specific class entry from the draft
 */
export function getDraftClassEntry(draft: CharacterDraft, classId: string): ClassDraftEntry | undefined {
  return draft.classEntries.find(e => e.classId === classId)
}

/**
 * Get all ASI selections aggregated from all class entries
 */
export function getAllDraftAsiSelections(draft: CharacterDraft): ClassAsiSelection[] {
  return draft.classEntries.flatMap(e => e.classAsiSelections)
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
