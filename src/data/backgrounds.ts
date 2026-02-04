// Backgrounds from D&D 5e 2024 rules
// Each background grants ability score improvements and an origin feat

import type { AbilityName } from '@/types'
import type { OriginFeatId } from './originFeats'

export interface Background {
  id: string
  name: string
  description: string
  // Suggested ability score improvements (player can customize)
  suggestedAbilities: AbilityName[]
  skillProficiencies: string[]
  toolProficiency?: string
  languages?: number // Number of additional languages
  defaultOriginFeat: OriginFeatId
}

export const BACKGROUNDS: Background[] = [
  {
    id: 'acolyte',
    name: 'Acolyte',
    description:
      'You devoted yourself to service in a temple, either nestled in a town or secluded in a sacred grove.',
    suggestedAbilities: ['intelligence', 'wisdom', 'charisma'],
    skillProficiencies: ['Insight', 'Religion'],
    languages: 2,
    defaultOriginFeat: 'magic-initiate',
  },
  {
    id: 'artisan',
    name: 'Artisan',
    description:
      'You began mopping floors and scrubbing counters in an artisan\'s workshop for a few coppers per day.',
    suggestedAbilities: ['strength', 'dexterity', 'intelligence'],
    skillProficiencies: ['Investigation', 'Persuasion'],
    toolProficiency: "Artisan's Tools",
    defaultOriginFeat: 'crafter',
  },
  {
    id: 'charlatan',
    name: 'Charlatan',
    description:
      'Once you were old enough to order an ale, you soon had a favorite stool in every tavern within ten miles of where you were born.',
    suggestedAbilities: ['dexterity', 'constitution', 'charisma'],
    skillProficiencies: ['Deception', 'Sleight of Hand'],
    toolProficiency: "Forgery Kit",
    defaultOriginFeat: 'skilled',
  },
  {
    id: 'criminal',
    name: 'Criminal',
    description:
      'You learned to earn your coin in dark alleyways, cutting purses or worse.',
    suggestedAbilities: ['dexterity', 'constitution', 'intelligence'],
    skillProficiencies: ['Sleight of Hand', 'Stealth'],
    toolProficiency: "Thieves' Tools",
    defaultOriginFeat: 'alert',
  },
  {
    id: 'entertainer',
    name: 'Entertainer',
    description:
      'You spent much of your youth following minstrels and other entertainers, learning the bytes of their craft.',
    suggestedAbilities: ['strength', 'dexterity', 'charisma'],
    skillProficiencies: ['Acrobatics', 'Performance'],
    toolProficiency: 'Musical Instrument',
    defaultOriginFeat: 'musician',
  },
  {
    id: 'farmer',
    name: 'Farmer',
    description:
      'You grew up tilling the earth, tending crops, and caring for livestock.',
    suggestedAbilities: ['strength', 'constitution', 'wisdom'],
    skillProficiencies: ['Animal Handling', 'Nature'],
    toolProficiency: "Carpenter's Tools",
    defaultOriginFeat: 'tough',
  },
  {
    id: 'guard',
    name: 'Guard',
    description:
      'Your feet ache when you remember the countless hours of standing watch on a castle wall or at a city gate.',
    suggestedAbilities: ['strength', 'intelligence', 'wisdom'],
    skillProficiencies: ['Athletics', 'Perception'],
    toolProficiency: 'Gaming Set',
    defaultOriginFeat: 'alert',
  },
  {
    id: 'guide',
    name: 'Guide',
    description:
      'You came of age in the wilderness, far from any settlement.',
    suggestedAbilities: ['dexterity', 'constitution', 'wisdom'],
    skillProficiencies: ['Stealth', 'Survival'],
    toolProficiency: "Cartographer's Tools",
    defaultOriginFeat: 'magic-initiate',
  },
  {
    id: 'hermit',
    name: 'Hermit',
    description:
      'You spent an extended amount of time living in seclusion, seeking enlightenment or penance.',
    suggestedAbilities: ['constitution', 'wisdom', 'charisma'],
    skillProficiencies: ['Medicine', 'Religion'],
    toolProficiency: 'Herbalism Kit',
    defaultOriginFeat: 'healer',
  },
  {
    id: 'merchant',
    name: 'Merchant',
    description:
      'You come from a family of traders, learning the ins and outs of commerce.',
    suggestedAbilities: ['constitution', 'intelligence', 'charisma'],
    skillProficiencies: ['Animal Handling', 'Persuasion'],
    toolProficiency: "Navigator's Tools",
    defaultOriginFeat: 'lucky',
  },
  {
    id: 'noble',
    name: 'Noble',
    description:
      'You were raised in a castle among the high lords, learning the ways of nobility.',
    suggestedAbilities: ['strength', 'intelligence', 'charisma'],
    skillProficiencies: ['History', 'Persuasion'],
    toolProficiency: 'Gaming Set',
    defaultOriginFeat: 'skilled',
  },
  {
    id: 'sage',
    name: 'Sage',
    description:
      'You spent your formative years poring over ancient tomes in a library or under the tutelage of a learned master.',
    suggestedAbilities: ['constitution', 'intelligence', 'wisdom'],
    skillProficiencies: ['Arcana', 'History'],
    toolProficiency: "Calligrapher's Supplies",
    defaultOriginFeat: 'magic-initiate',
  },
  {
    id: 'sailor',
    name: 'Sailor',
    description:
      'You lived aboard a sailing vessel, learning the ways of the sea.',
    suggestedAbilities: ['strength', 'dexterity', 'wisdom'],
    skillProficiencies: ['Acrobatics', 'Perception'],
    toolProficiency: "Navigator's Tools",
    defaultOriginFeat: 'tavern-brawler',
  },
  {
    id: 'scribe',
    name: 'Scribe',
    description:
      'You spent your youth copying texts and learning the art of written communication.',
    suggestedAbilities: ['dexterity', 'intelligence', 'wisdom'],
    skillProficiencies: ['Investigation', 'Perception'],
    toolProficiency: "Calligrapher's Supplies",
    defaultOriginFeat: 'skilled',
  },
  {
    id: 'soldier',
    name: 'Soldier',
    description:
      'You trained as a warrior, learning to wield weapons with deadly skill.',
    suggestedAbilities: ['strength', 'dexterity', 'constitution'],
    skillProficiencies: ['Athletics', 'Intimidation'],
    toolProficiency: 'Gaming Set',
    defaultOriginFeat: 'savage-attacker',
  },
  {
    id: 'wayfarer',
    name: 'Wayfarer',
    description:
      'You grew up on the road, traveling from place to place with a group of wanderers.',
    suggestedAbilities: ['dexterity', 'wisdom', 'charisma'],
    skillProficiencies: ['Insight', 'Stealth'],
    toolProficiency: "Thieves' Tools",
    defaultOriginFeat: 'lucky',
  },
]

export function getBackgroundById(id: string): Background | undefined {
  return BACKGROUNDS.find((b) => b.id === id)
}

export function getAllBackgrounds(): Background[] {
  return BACKGROUNDS
}
