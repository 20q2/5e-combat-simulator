import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Character,
  AbilityScores,
  AbilityName,
  CharacterClass,
  Armor,
} from '@/types'
import { getAbilityModifier } from '@/types'

export type AbilityScoreMethod = 'point-buy' | 'standard-array' | 'manual'

export interface CharacterDraft {
  name: string
  abilityScoreMethod: AbilityScoreMethod
  baseAbilityScores: AbilityScores
  abilityBonusPlus2: AbilityName | null
  abilityBonusPlus1: AbilityName | null
  raceId: string | null
  classId: string | null
  subclassId: string | null
  level: number
  selectedSpellIds: string[]
  selectedCantrips: string[]
  meleeWeaponId: string | null
  rangedWeaponId: string | null
  armorId: string | null
  shieldEquipped: boolean
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
  setClass: (classId: string | null) => void
  setSubclass: (subclassId: string | null) => void
  setLevel: (level: number) => void
  toggleSpell: (spellId: string) => void
  toggleCantrip: (spellId: string) => void
  setMeleeWeapon: (weaponId: string | null) => void
  setRangedWeapon: (weaponId: string | null) => void
  setArmor: (armorId: string | null) => void
  setShield: (equipped: boolean) => void
  setAbilityBonusPlus2: (ability: AbilityName | null) => void
  setAbilityBonusPlus1: (ability: AbilityName | null) => void
  setCurrentStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  resetDraft: () => void
  saveCharacter: (character: Character) => void
  deleteCharacter: (characterId: string) => void
  loadCharacter: (characterId: string) => Character | undefined
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
  abilityBonusPlus2: null,
  abilityBonusPlus1: null,
  raceId: null,
  classId: null,
  subclassId: null,
  level: 1,
  selectedSpellIds: [],
  selectedCantrips: [],
  meleeWeaponId: null,
  rangedWeaponId: null,
  armorId: null,
  shieldEquipped: false,
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
          draft: { ...state.draft, raceId },
        })),

      setClass: (classId) =>
        set((state) => ({
          draft: {
            ...state.draft,
            classId,
            subclassId: null, // Reset subclass when class changes
            selectedSpellIds: [],
            selectedCantrips: [],
          },
        })),

      setSubclass: (subclassId) =>
        set((state) => ({
          draft: { ...state.draft, subclassId },
        })),

      setLevel: (level) =>
        set((state) => ({
          draft: { ...state.draft, level: Math.max(1, Math.min(20, level)) },
        })),

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

      setArmor: (armorId) =>
        set((state) => ({
          draft: { ...state.draft, armorId },
        })),

      setShield: (equipped) =>
        set((state) => ({
          draft: { ...state.draft, shieldEquipped: equipped },
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

      setCurrentStep: (step) => set({ currentStep: step }),

      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(state.currentStep + 1, 6),
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
  abilityBonusPlus1: AbilityName | null
): AbilityScores {
  const result = { ...baseScores }

  if (abilityBonusPlus2) {
    result[abilityBonusPlus2] += 2
  }
  if (abilityBonusPlus1) {
    result[abilityBonusPlus1] += 1
  }

  return result
}

export function calculateHP(
  characterClass: CharacterClass,
  level: number,
  constitution: number
): number {
  const conMod = getAbilityModifier(constitution)
  // Max HP at level 1, then average for subsequent levels
  const firstLevel = characterClass.hitDie + conMod
  const subsequentLevels = (level - 1) * (Math.floor(characterClass.hitDie / 2) + 1 + conMod)
  return Math.max(1, firstLevel + subsequentLevels)
}

export function calculateAC(
  armor: Armor | null,
  shield: boolean,
  dexterity: number
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

  return ac
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
