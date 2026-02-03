import type { Race, RacialAbility } from '@/types'

export const races: Race[] = [
  // ==================== HUMAN ====================
  {
    id: 'human',
    name: 'Human',
    size: 'medium',
    speed: 30,
    abilityScoreIncrease: {},
    abilities: [
      {
        id: 'human-resourceful',
        type: 'trait',
        name: 'Resourceful',
        description: 'You gain Heroic Inspiration whenever you finish a Long Rest.',
        trigger: 'passive',
      },
      {
        id: 'human-skillful',
        type: 'trait',
        name: 'Skillful',
        description: 'You gain proficiency in one skill of your choice.',
        trigger: 'passive',
      },
      {
        id: 'human-versatile',
        type: 'trait',
        name: 'Versatile',
        description: 'You gain an Origin feat of your choice.',
        trigger: 'passive',
      },
    ],
    languages: ['Common'],
  },

  // ==================== ELF ====================
  {
    id: 'elf',
    name: 'Elf',
    size: 'medium',
    speed: 30,
    abilityScoreIncrease: {},
    abilities: [
      {
        id: 'elf-darkvision',
        type: 'darkvision',
        name: 'Darkvision',
        description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
        trigger: 'passive',
        range: 60,
      },
      {
        id: 'elf-elven-lineage',
        type: 'trait',
        name: 'Elven Lineage',
        description: 'Choose a lineage: Drow (120ft darkvision, Dancing Lights, then Faerie Fire at 3, Darkness at 5), High Elf (Prestidigitation swappable on long rest, then Detect Magic at 3, Misty Step at 5), or Wood Elf (35ft speed, Druidcraft, then Longstrider at 3, Pass without Trace at 5). Intelligence, Wisdom, or Charisma is your spellcasting ability.',
        trigger: 'passive',
      },
      {
        id: 'elf-fey-ancestry',
        type: 'save_advantage',
        name: 'Fey Ancestry',
        description: 'You have Advantage on saving throws you make to avoid or end the Charmed condition.',
        trigger: 'on_saving_throw',
        conditions: ['charmed'],
      },
      {
        id: 'elf-keen-senses',
        type: 'trait',
        name: 'Keen Senses',
        description: 'You have proficiency in the Insight, Perception, or Survival skill (choose one).',
        trigger: 'passive',
      },
      {
        id: 'elf-trance',
        type: 'trait',
        name: 'Trance',
        description: "You don't need to sleep, and magic can't put you to sleep. You can finish a Long Rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness.",
        trigger: 'passive',
      },
    ],
    languages: ['Common', 'Elvish'],
  },

  // ==================== DWARF ====================
  {
    id: 'dwarf',
    name: 'Dwarf',
    size: 'medium',
    speed: 30,
    abilityScoreIncrease: {},
    abilities: [
      {
        id: 'dwarf-darkvision',
        type: 'darkvision',
        name: 'Darkvision',
        description: 'You can see in dim light within 120 feet as if it were bright light, and in darkness as if it were dim light.',
        trigger: 'passive',
        range: 120,
      },
      {
        id: 'dwarf-resilience-resistance',
        type: 'resistance',
        name: 'Dwarven Resilience',
        description: 'You have Resistance to Poison damage.',
        trigger: 'passive',
        damageTypes: ['poison'],
        level: 'resistance',
      },
      {
        id: 'dwarf-resilience-save',
        type: 'save_advantage',
        name: 'Dwarven Resilience',
        description: 'You have Advantage on saving throws you make to avoid or end the Poisoned condition.',
        trigger: 'on_saving_throw',
        conditions: ['poisoned'],
      },
      {
        id: 'dwarf-toughness',
        type: 'trait',
        name: 'Dwarven Toughness',
        description: 'Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level.',
        trigger: 'passive',
      },
      {
        id: 'dwarf-stonecunning',
        type: 'trait',
        name: 'Stonecunning',
        description: 'As a Bonus Action, you gain Tremorsense with a range of 60 feet for 10 minutes. You must be on a stone surface or touching a stone surface to use this. You can use this a number of times equal to your Proficiency Bonus, regaining all uses on a Long Rest.',
        trigger: 'bonus_action',
      },
    ],
    languages: ['Common', 'Dwarvish'],
  },

  // ==================== HALFLING ====================
  {
    id: 'halfling',
    name: 'Halfling',
    size: 'small',
    speed: 30,
    abilityScoreIncrease: {},
    abilities: [
      {
        id: 'halfling-brave',
        type: 'save_advantage',
        name: 'Brave',
        description: 'You have Advantage on saving throws you make to avoid or end the Frightened condition.',
        trigger: 'on_saving_throw',
        conditions: ['frightened'],
      },
      {
        id: 'halfling-nimbleness',
        type: 'nimbleness',
        name: 'Halfling Nimbleness',
        description: "You can move through the space of any creature that is a size larger than you, but you can't stop in the same space.",
        trigger: 'passive',
        canMoveThrough: ['medium', 'large', 'huge', 'gargantuan'],
      },
      {
        id: 'halfling-luck',
        type: 'reroll',
        name: 'Luck',
        description: 'When you roll a 1 on the d20 of a D20 Test, you can reroll the die, and you must use the new roll.',
        trigger: 'on_attack_roll',
        appliesTo: ['attack', 'ability_check', 'saving_throw'],
        triggerValue: 1,
      },
      {
        id: 'halfling-naturally-stealthy',
        type: 'trait',
        name: 'Naturally Stealthy',
        description: 'You can take the Hide action even when you are obscured only by a creature that is at least one size larger than you.',
        trigger: 'passive',
      },
    ],
    languages: ['Common', 'Halfling'],
  },

  // ==================== GNOME ====================
  {
    id: 'gnome',
    name: 'Gnome',
    size: 'small',
    speed: 30,
    abilityScoreIncrease: {},
    abilities: [
      {
        id: 'gnome-darkvision',
        type: 'darkvision',
        name: 'Darkvision',
        description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
        trigger: 'passive',
        range: 60,
      },
      {
        id: 'gnome-cunning',
        type: 'save_advantage',
        name: 'Gnomish Cunning',
        description: 'You have Advantage on Intelligence, Wisdom, and Charisma saving throws.',
        trigger: 'on_saving_throw',
        magicSaves: true,
      },
      {
        id: 'gnome-lineage',
        type: 'trait',
        name: 'Gnomish Lineage',
        description: 'Choose a lineage: Forest Gnome (Minor Illusion cantrip, Speak with Animals PB times/long rest) or Rock Gnome (Mending and Prestidigitation cantrips, can create clockwork devices). Intelligence, Wisdom, or Charisma is your spellcasting ability.',
        trigger: 'passive',
      },
    ],
    languages: ['Common', 'Gnomish'],
  },

  // ==================== ORC ====================
  {
    id: 'orc',
    name: 'Orc',
    size: 'medium',
    speed: 30,
    abilityScoreIncrease: {},
    abilities: [
      {
        id: 'orc-darkvision',
        type: 'darkvision',
        name: 'Darkvision',
        description: 'You can see in dim light within 120 feet as if it were bright light, and in darkness as if it were dim light.',
        trigger: 'passive',
        range: 120,
      },
      {
        id: 'orc-adrenaline-rush',
        type: 'trait',
        name: 'Adrenaline Rush',
        description: 'You can take the Dash action as a Bonus Action. When you do so, you gain Temporary Hit Points equal to your Proficiency Bonus. You can use this a number of times equal to your Proficiency Bonus, regaining all uses on a Short or Long Rest.',
        trigger: 'bonus_action',
      },
      {
        id: 'orc-relentless-endurance',
        type: 'triggered_heal',
        name: 'Relentless Endurance',
        description: "When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead. Once you use this trait, you can't do so again until you finish a Long Rest.",
        trigger: 'on_damage_taken',
        triggerCondition: 'drop_to_zero',
        healAmount: 1,
        maxUses: 1,
      },
    ],
    languages: ['Common', 'Orc'],
  },

  // ==================== TIEFLING ====================
  {
    id: 'tiefling',
    name: 'Tiefling',
    size: 'medium',
    speed: 30,
    abilityScoreIncrease: {},
    abilities: [
      {
        id: 'tiefling-darkvision',
        type: 'darkvision',
        name: 'Darkvision',
        description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
        trigger: 'passive',
        range: 60,
      },
      {
        id: 'tiefling-fiendish-legacy',
        type: 'trait',
        name: 'Fiendish Legacy',
        description: 'Choose a legacy: Abyssal (Poison resistance, Poison Spray, then Ray of Sickness at 3, Hold Person at 5), Chthonic (Necrotic resistance, Chill Touch, then False Life at 3, Ray of Enfeeblement at 5), or Infernal (Fire resistance, Fire Bolt, then Hellish Rebuke at 3, Darkness at 5). Intelligence, Wisdom, or Charisma is your spellcasting ability.',
        trigger: 'passive',
      },
      {
        id: 'tiefling-otherworldly-presence',
        type: 'bonus_cantrip',
        name: 'Otherworldly Presence',
        description: 'You know the Thaumaturgy cantrip. When you cast it with this trait, the spell uses the same spellcasting ability you use for your Fiendish Legacy trait.',
        trigger: 'passive',
        spellId: 'thaumaturgy',
        spellcastingAbility: 'charisma',
      },
    ],
    languages: ['Common', 'Infernal'],
  },

  // ==================== AASIMAR ====================
  {
    id: 'aasimar',
    name: 'Aasimar',
    size: 'medium',
    speed: 30,
    abilityScoreIncrease: {},
    abilities: [
      {
        id: 'aasimar-darkvision',
        type: 'darkvision',
        name: 'Darkvision',
        description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
        trigger: 'passive',
        range: 60,
      },
      {
        id: 'aasimar-celestial-resistance',
        type: 'resistance',
        name: 'Celestial Resistance',
        description: 'You have Resistance to Necrotic damage and Radiant damage.',
        trigger: 'passive',
        damageTypes: ['necrotic', 'radiant'],
        level: 'resistance',
      },
      {
        id: 'aasimar-healing-hands',
        type: 'trait',
        name: 'Healing Hands',
        description: 'As a Magic action, you touch a creature and roll a number of d4s equal to your Proficiency Bonus. The creature regains Hit Points equal to the total rolled. Once you use this trait, you can\'t use it again until you finish a Long Rest.',
        trigger: 'action',
      },
      {
        id: 'aasimar-light-bearer',
        type: 'bonus_cantrip',
        name: 'Light Bearer',
        description: 'You know the Light cantrip. Charisma is your spellcasting ability for it.',
        trigger: 'passive',
        spellId: 'light',
        spellcastingAbility: 'charisma',
      },
      {
        id: 'aasimar-celestial-revelation',
        type: 'trait',
        name: 'Celestial Revelation',
        description: 'At level 3, as a Bonus Action, transform for 1 minute (1/Long Rest). Choose: Heavenly Wings (Fly Speed = Speed), Inner Radiance (shed light, deal Radiant damage = PB to creatures within 10ft at end of turn), or Necrotic Shroud (creatures within 10ft make Cha save or Frightened). Once per turn, deal extra damage = PB (Radiant for Wings/Radiance, Necrotic for Shroud).',
        trigger: 'bonus_action',
      },
    ],
    languages: ['Common', 'Celestial'],
  },

  // ==================== GOLIATH ====================
  {
    id: 'goliath',
    name: 'Goliath',
    size: 'medium',
    speed: 35,
    abilityScoreIncrease: {},
    abilities: [
      {
        id: 'goliath-giant-ancestry',
        type: 'trait',
        name: 'Giant Ancestry',
        description: "Choose one (PB uses/Long Rest): Cloud's Jaunt (bonus action teleport 30ft), Fire's Burn (+1d10 fire on hit), Frost's Chill (+1d6 cold on hit, reduce speed 10ft), Hill's Tumble (knock Large or smaller prone on hit), Stone's Endurance (reaction to reduce damage by 1d12 + Con), or Storm's Thunder (reaction to deal 1d8 thunder when damaged within 60ft).",
        trigger: 'passive',
      },
      {
        id: 'goliath-large-form',
        type: 'trait',
        name: 'Large Form',
        description: 'At level 5, as a Bonus Action, become Large for 10 minutes if space permits. Gain Advantage on Strength checks and +10 Speed. Once per Long Rest.',
        trigger: 'bonus_action',
      },
      {
        id: 'goliath-powerful-build',
        type: 'trait',
        name: 'Powerful Build',
        description: 'You have Advantage on any ability check you make to end the Grappled condition. You also count as one size larger when determining your carrying capacity.',
        trigger: 'passive',
      },
    ],
    languages: ['Common', 'Giant'],
  },

  // ==================== DRAGONBORN ====================
  {
    id: 'dragonborn',
    name: 'Dragonborn',
    size: 'medium',
    speed: 30,
    abilityScoreIncrease: {},
    abilities: [
      {
        id: 'dragonborn-darkvision',
        type: 'darkvision',
        name: 'Darkvision',
        description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
        trigger: 'passive',
        range: 60,
      },
      {
        id: 'dragonborn-ancestry',
        type: 'trait',
        name: 'Draconic Ancestry',
        description: 'Choose a dragon type: Black/Copper (Acid), Blue/Bronze (Lightning), Brass/Gold/Red (Fire), Green (Poison), Silver/White (Cold). This determines your Breath Weapon damage type and Damage Resistance.',
        trigger: 'passive',
      },
      {
        id: 'dragonborn-breath-weapon',
        type: 'breath_weapon',
        name: 'Breath Weapon',
        description: 'When you take the Attack action, you can replace one attack with a 15-foot Cone or 30-foot Line (5ft wide). Creatures make a Dex save (DC 8 + Con mod + PB). Failed save: 1d10 damage (2d10 at 5, 3d10 at 11, 4d10 at 17). Success: half damage. Uses = PB per Long Rest.',
        trigger: 'action',
        damageType: 'fire',
        damageDice: '1d10',
        damageScaling: {
          1: '1d10',
          5: '2d10',
          11: '3d10',
          17: '4d10',
        },
        shape: 'cone',
        size: 15,
        savingThrow: 'dexterity',
        dcAbility: 'constitution',
        maxUses: 2, // PB at level 1
      },
      {
        id: 'dragonborn-resistance',
        type: 'resistance',
        name: 'Damage Resistance',
        description: 'You have Resistance to the damage type determined by your Draconic Ancestry.',
        trigger: 'passive',
        damageTypes: ['fire'],
        level: 'resistance',
      },
      {
        id: 'dragonborn-draconic-flight',
        type: 'trait',
        name: 'Draconic Flight',
        description: 'At level 5, as a Bonus Action, sprout spectral wings for 10 minutes. Gain Fly Speed equal to your Speed. Wings appear made of the same energy as your Breath Weapon. Once per Long Rest.',
        trigger: 'bonus_action',
      },
    ],
    languages: ['Common', 'Draconic'],
  },
]

// Helper to get abilities of a specific type from a race
export function getRacialAbilitiesOfType<T extends RacialAbility['type']>(
  race: Race,
  type: T
): Extract<RacialAbility, { type: T }>[] {
  return race.abilities.filter((a): a is Extract<RacialAbility, { type: T }> => a.type === type)
}

export function getRaceById(id: string): Race | undefined {
  return races.find(race => race.id === id)
}

export function getAllRaces(): Race[] {
  return races
}
