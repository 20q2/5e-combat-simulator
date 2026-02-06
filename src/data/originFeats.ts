// Origin Feats from D&D 5e 2024 rules
// These are feats available at character creation through backgrounds (and for Humans as a racial feature)

export type OriginFeatId =
  | 'alert'
  | 'crafter'
  | 'healer'
  | 'lucky'
  | 'magic-initiate'
  | 'musician'
  | 'savage-attacker'
  | 'skilled'
  | 'tavern-brawler'
  | 'tough'

export interface OriginFeatBenefit {
  name: string
  description: string
}

export interface OriginFeat {
  id: OriginFeatId
  name: string
  benefits: OriginFeatBenefit[]
  repeatable?: boolean // If true, can be taken multiple times
}

export const ORIGIN_FEATS: OriginFeat[] = [
  {
    id: 'alert',
    name: 'Alert',
    benefits: [
      {
        name: 'Initiative Proficiency',
        description:
          'When you roll Initiative, you can add your Proficiency Bonus to the roll.',
      },
      {
        name: 'Initiative Swap',
        description:
          "Immediately after you roll Initiative, you can swap your Initiative with one willing ally in the same combat. You can't make this swap if you or the ally has the Incapacitated condition.",
      },
    ],
  },
  {
    id: 'crafter',
    name: 'Crafter',
    benefits: [
      {
        name: 'Tool Proficiency',
        description:
          "You gain proficiency with three different Artisan's Tools of your choice.",
      },
      {
        name: 'Discount',
        description:
          'Whenever you buy a nonmagical item, you receive a 20 percent discount on it.',
      },
      {
        name: 'Fast Crafting',
        description:
          "When you finish a Long Rest, you can craft one piece of gear (Ladder, Torch, Rope, Caltrops, etc.), provided you have the Artisan's Tools associated with that item. The item lasts until you finish another Long Rest.",
      },
    ],
  },
  {
    id: 'healer',
    name: 'Healer',
    benefits: [
      {
        name: 'Battle Medic',
        description:
          "If you have a Healer's Kit, you can expend one use of it and tend to a creature within 5 feet as a Utilize action. That creature can expend one of its Hit Point Dice, and you roll that die. The creature regains Hit Points equal to the roll plus your Proficiency Bonus.",
      },
      {
        name: 'Healing Rerolls',
        description:
          'Whenever you roll a die to determine Hit Points restored with a spell or Battle Medic, you can reroll the die if it rolls a 1, and you must use the new roll.',
      },
    ],
  },
  {
    id: 'lucky',
    name: 'Lucky',
    benefits: [
      {
        name: 'Luck Points',
        description:
          'You have Luck Points equal to your Proficiency Bonus. You regain all expended Luck Points when you finish a Long Rest.',
      },
      {
        name: 'Advantage',
        description:
          'When you roll a d20 for a D20 Test, you can spend 1 Luck Point to give yourself Advantage on the roll.',
      },
      {
        name: 'Disadvantage',
        description:
          'When a creature rolls a d20 for an attack roll against you, you can spend 1 Luck Point to impose Disadvantage on that roll.',
      },
    ],
  },
  {
    id: 'magic-initiate',
    name: 'Magic Initiate',
    repeatable: true,
    benefits: [
      {
        name: 'Two Cantrips',
        description:
          'You learn two cantrips of your choice from the Cleric, Druid, or Wizard spell list. Intelligence, Wisdom, or Charisma is your spellcasting ability (choose when you select this feat).',
      },
      {
        name: 'Level 1 Spell',
        description:
          'Choose a level 1 spell from the same list. You always have it prepared. You can cast it once without a spell slot per Long Rest, or using any spell slots you have.',
      },
    ],
  },
  {
    id: 'musician',
    name: 'Musician',
    benefits: [
      {
        name: 'Instrument Training',
        description:
          'You gain proficiency with three Musical Instruments of your choice.',
      },
      {
        name: 'Encouraging Song',
        description:
          'As you finish a Short or Long Rest, you can play a song on a Musical Instrument with which you have proficiency and give Heroic Inspiration to allies who hear the song. The number of allies equals your Proficiency Bonus.',
      },
    ],
  },
  {
    id: 'savage-attacker',
    name: 'Savage Attacker',
    benefits: [
      {
        name: 'Damaging Strikes',
        description:
          "Once per turn when you hit a target with a weapon, you can roll the weapon's damage dice twice and use either roll against the target.",
      },
    ],
  },
  {
    id: 'skilled',
    name: 'Skilled',
    repeatable: true,
    benefits: [
      {
        name: 'Skill Proficiencies',
        description:
          'You gain proficiency in any combination of three skills or tools of your choice.',
      },
    ],
  },
  {
    id: 'tavern-brawler',
    name: 'Tavern Brawler',
    benefits: [
      {
        name: 'Enhanced Unarmed Strike',
        description:
          'When you hit with your Unarmed Strike, you can deal Bludgeoning damage equal to 1d4 + your Strength modifier instead of normal Unarmed Strike damage.',
      },
      {
        name: 'Damage Rerolls',
        description:
          'Whenever you roll a damage die for your Unarmed Strike, you can reroll the die if it rolls a 1, and you must use the new roll.',
      },
      {
        name: 'Improvised Weaponry',
        description: 'You have proficiency with improvised weapons.',
      },
      {
        name: 'Push',
        description:
          'When you hit a creature with an Unarmed Strike as part of the Attack action, you can push it 5 feet away. Once per turn.',
      },
    ],
  },
  {
    id: 'tough',
    name: 'Tough',
    benefits: [
      {
        name: 'Hit Point Increase',
        description:
          'Your Hit Point maximum increases by an amount equal to twice your character level when you gain this feat. Whenever you gain a level thereafter, your HP maximum increases by an additional 2.',
      },
    ],
  },
]

export function getOriginFeatById(id: OriginFeatId): OriginFeat | undefined {
  return ORIGIN_FEATS.find((f) => f.id === id)
}

export function isRepeatableFeat(id: OriginFeatId): boolean {
  const feat = getOriginFeatById(id)
  return feat?.repeatable ?? false
}

// ============================================
// Combat-Specific Data
// ============================================
// Maps origin feat IDs to their combat-relevant data
// Non-combat feats (crafter, musician, skilled, tough) map to null

import type {
  OriginFeatCombat,
  AlertFeatCombat,
  HealerFeatCombat,
  LuckyFeatCombat,
  SavageAttackerFeatCombat,
  TavernBrawlerFeatCombat,
} from '@/types/originFeat'

const ALERT_COMBAT: AlertFeatCombat = {
  id: 'alert',
  type: 'alert',
  trigger: 'on_initiative',
  initiativeProficiencyBonus: true,
  canSwapInitiative: true,
}

const HEALER_COMBAT: HealerFeatCombat = {
  id: 'healer',
  type: 'healer',
  trigger: 'action',
  requiresHealerKit: true,
  healingRerollOnes: true,
}

const LUCKY_COMBAT: LuckyFeatCombat = {
  id: 'lucky',
  type: 'lucky',
  trigger: 'on_attack_roll',
  luckPointsEqualProficiency: true,
}

const SAVAGE_ATTACKER_COMBAT: SavageAttackerFeatCombat = {
  id: 'savage-attacker',
  type: 'savage_attacker',
  trigger: 'on_damage_roll',
  usesPerTurn: 1,
}

const TAVERN_BRAWLER_COMBAT: TavernBrawlerFeatCombat = {
  id: 'tavern-brawler',
  type: 'tavern_brawler',
  trigger: 'passive',
  enhancedUnarmedDie: '1d4',
  rerollOnes: true,
  pushDistance: 5,
  pushOncePerTurn: true,
}

export const ORIGIN_FEAT_COMBAT: Record<OriginFeatId, OriginFeatCombat | null> = {
  'alert': ALERT_COMBAT,
  'crafter': null,           // No combat relevance
  'healer': HEALER_COMBAT,
  'lucky': LUCKY_COMBAT,
  'magic-initiate': null,    // Handled separately via spell system
  'musician': null,          // No combat relevance
  'savage-attacker': SAVAGE_ATTACKER_COMBAT,
  'skilled': null,           // No combat relevance
  'tavern-brawler': TAVERN_BRAWLER_COMBAT,
  'tough': null,             // HP bonus applied at character creation
}

export function getOriginFeatCombatData(id: OriginFeatId): OriginFeatCombat | null {
  return ORIGIN_FEAT_COMBAT[id] ?? null
}

export function hasCombatRelevantFeat(originFeats: OriginFeatId[]): boolean {
  return originFeats.some(id => ORIGIN_FEAT_COMBAT[id] !== null)
}
