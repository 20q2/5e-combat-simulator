import type { Race, RacialAbility } from '@/types'

export const races: Race[] = [
  {
    id: 'human',
    name: 'Human',
    size: 'medium',
    speed: 30,
    abilityScoreIncrease: {
      strength: 1,
      dexterity: 1,
      constitution: 1,
      intelligence: 1,
      wisdom: 1,
      charisma: 1,
    },
    abilities: [
      {
        id: 'human-versatile',
        type: 'trait',
        name: 'Versatile',
        description: 'Humans gain +1 to all ability scores.',
        trigger: 'passive',
      },
    ],
    languages: ['Common', 'One additional language'],
  },
  {
    id: 'elf-high',
    name: 'High Elf',
    size: 'medium',
    speed: 30,
    abilityScoreIncrease: {
      dexterity: 2,
      intelligence: 1,
    },
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
        id: 'elf-keen-senses',
        type: 'proficiency',
        name: 'Keen Senses',
        description: 'You have proficiency in the Perception skill.',
        trigger: 'passive',
        proficiencies: {
          skills: ['Perception'],
        },
      },
      {
        id: 'elf-fey-ancestry',
        type: 'save_advantage',
        name: 'Fey Ancestry',
        description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep.",
        trigger: 'on_saving_throw',
        conditions: ['charmed'],
      },
      {
        id: 'elf-trance',
        type: 'trait',
        name: 'Trance',
        description: "Elves don't need to sleep. Instead, they meditate deeply for 4 hours a day.",
        trigger: 'passive',
      },
      {
        id: 'elf-weapon-training',
        type: 'proficiency',
        name: 'Elf Weapon Training',
        description: 'You have proficiency with the longsword, shortsword, shortbow, and longbow.',
        trigger: 'passive',
        proficiencies: {
          weapons: ['longsword', 'shortsword', 'shortbow', 'longbow'],
        },
      },
      {
        id: 'high-elf-cantrip',
        type: 'bonus_cantrip',
        name: 'Cantrip',
        description: 'You know one cantrip of your choice from the wizard spell list. Intelligence is your spellcasting ability for it.',
        trigger: 'passive',
        spellId: 'firebolt', // Default, should be selectable
        spellcastingAbility: 'intelligence',
      },
    ],
    languages: ['Common', 'Elvish'],
  },
  {
    id: 'dwarf-hill',
    name: 'Hill Dwarf',
    size: 'medium',
    speed: 25,
    abilityScoreIncrease: {
      constitution: 2,
      wisdom: 1,
    },
    abilities: [
      {
        id: 'dwarf-darkvision',
        type: 'darkvision',
        name: 'Darkvision',
        description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
        trigger: 'passive',
        range: 60,
      },
      {
        id: 'dwarf-resilience-resistance',
        type: 'resistance',
        name: 'Dwarven Resilience',
        description: 'You have resistance to poison damage.',
        trigger: 'passive',
        damageTypes: ['poison'],
        level: 'resistance',
      },
      {
        id: 'dwarf-resilience-save',
        type: 'save_advantage',
        name: 'Dwarven Resilience',
        description: 'You have advantage on saving throws against poison.',
        trigger: 'on_saving_throw',
        damageTypes: ['poison'],
      },
      {
        id: 'dwarf-combat-training',
        type: 'proficiency',
        name: 'Dwarven Combat Training',
        description: 'You have proficiency with the battleaxe, handaxe, light hammer, and warhammer.',
        trigger: 'passive',
        proficiencies: {
          weapons: ['battleaxe', 'handaxe', 'light hammer', 'warhammer'],
        },
      },
      {
        id: 'dwarf-stonecunning',
        type: 'trait',
        name: 'Stonecunning',
        description: 'Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient and add double your proficiency bonus.',
        trigger: 'passive',
      },
      {
        id: 'hill-dwarf-toughness',
        type: 'trait',
        name: 'Dwarven Toughness',
        description: 'Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.',
        trigger: 'passive',
      },
    ],
    languages: ['Common', 'Dwarvish'],
  },
  {
    id: 'dwarf-mountain',
    name: 'Mountain Dwarf',
    size: 'medium',
    speed: 25,
    abilityScoreIncrease: {
      constitution: 2,
      strength: 2,
    },
    abilities: [
      {
        id: 'dwarf-darkvision',
        type: 'darkvision',
        name: 'Darkvision',
        description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
        trigger: 'passive',
        range: 60,
      },
      {
        id: 'dwarf-resilience-resistance',
        type: 'resistance',
        name: 'Dwarven Resilience',
        description: 'You have resistance to poison damage.',
        trigger: 'passive',
        damageTypes: ['poison'],
        level: 'resistance',
      },
      {
        id: 'dwarf-resilience-save',
        type: 'save_advantage',
        name: 'Dwarven Resilience',
        description: 'You have advantage on saving throws against poison.',
        trigger: 'on_saving_throw',
        damageTypes: ['poison'],
      },
      {
        id: 'dwarf-combat-training',
        type: 'proficiency',
        name: 'Dwarven Combat Training',
        description: 'You have proficiency with the battleaxe, handaxe, light hammer, and warhammer.',
        trigger: 'passive',
        proficiencies: {
          weapons: ['battleaxe', 'handaxe', 'light hammer', 'warhammer'],
        },
      },
      {
        id: 'dwarf-stonecunning',
        type: 'trait',
        name: 'Stonecunning',
        description: 'Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient and add double your proficiency bonus.',
        trigger: 'passive',
      },
      {
        id: 'mountain-dwarf-armor-training',
        type: 'proficiency',
        name: 'Dwarven Armor Training',
        description: 'You have proficiency with light and medium armor.',
        trigger: 'passive',
        proficiencies: {
          armor: ['light', 'medium'],
        },
      },
    ],
    languages: ['Common', 'Dwarvish'],
  },
  {
    id: 'halfling-lightfoot',
    name: 'Lightfoot Halfling',
    size: 'small',
    speed: 25,
    abilityScoreIncrease: {
      dexterity: 2,
      charisma: 1,
    },
    abilities: [
      {
        id: 'halfling-lucky',
        type: 'reroll',
        name: 'Lucky',
        description: 'When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.',
        trigger: 'on_attack_roll',
        appliesTo: ['attack', 'ability_check', 'saving_throw'],
        triggerValue: 1,
      },
      {
        id: 'halfling-brave',
        type: 'save_advantage',
        name: 'Brave',
        description: 'You have advantage on saving throws against being frightened.',
        trigger: 'on_saving_throw',
        conditions: ['frightened'],
      },
      {
        id: 'halfling-nimbleness',
        type: 'nimbleness',
        name: 'Halfling Nimbleness',
        description: 'You can move through the space of any creature that is of a size larger than yours.',
        trigger: 'passive',
        canMoveThrough: ['medium', 'large', 'huge', 'gargantuan'],
      },
      {
        id: 'lightfoot-naturally-stealthy',
        type: 'trait',
        name: 'Naturally Stealthy',
        description: 'You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.',
        trigger: 'passive',
      },
    ],
    languages: ['Common', 'Halfling'],
  },
  {
    id: 'halfling-stout',
    name: 'Stout Halfling',
    size: 'small',
    speed: 25,
    abilityScoreIncrease: {
      dexterity: 2,
      constitution: 1,
    },
    abilities: [
      {
        id: 'halfling-lucky',
        type: 'reroll',
        name: 'Lucky',
        description: 'When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.',
        trigger: 'on_attack_roll',
        appliesTo: ['attack', 'ability_check', 'saving_throw'],
        triggerValue: 1,
      },
      {
        id: 'halfling-brave',
        type: 'save_advantage',
        name: 'Brave',
        description: 'You have advantage on saving throws against being frightened.',
        trigger: 'on_saving_throw',
        conditions: ['frightened'],
      },
      {
        id: 'halfling-nimbleness',
        type: 'nimbleness',
        name: 'Halfling Nimbleness',
        description: 'You can move through the space of any creature that is of a size larger than yours.',
        trigger: 'passive',
        canMoveThrough: ['medium', 'large', 'huge', 'gargantuan'],
      },
      {
        id: 'stout-resilience-resistance',
        type: 'resistance',
        name: 'Stout Resilience',
        description: 'You have resistance to poison damage.',
        trigger: 'passive',
        damageTypes: ['poison'],
        level: 'resistance',
      },
      {
        id: 'stout-resilience-save',
        type: 'save_advantage',
        name: 'Stout Resilience',
        description: 'You have advantage on saving throws against poison.',
        trigger: 'on_saving_throw',
        damageTypes: ['poison'],
      },
    ],
    languages: ['Common', 'Halfling'],
  },
  {
    id: 'dragonborn',
    name: 'Dragonborn',
    size: 'medium',
    speed: 30,
    abilityScoreIncrease: {
      strength: 2,
      charisma: 1,
    },
    abilities: [
      {
        id: 'dragonborn-ancestry',
        type: 'trait',
        name: 'Draconic Ancestry',
        description: 'You have draconic ancestry. Choose one type of dragon from the Draconic Ancestry table. Your breath weapon and damage resistance are determined by the dragon type.',
        trigger: 'passive',
      },
      {
        id: 'dragonborn-breath-weapon',
        type: 'breath_weapon',
        name: 'Breath Weapon',
        description: 'You can use your action to exhale destructive energy. DC = 8 + CON mod + proficiency bonus.',
        trigger: 'action',
        damageType: 'fire', // Default, should be set by ancestry choice
        damageDice: '2d6',
        damageScaling: {
          1: '2d6',
          6: '3d6',
          11: '4d6',
          16: '5d6',
        },
        shape: 'cone', // Default, should be set by ancestry choice
        size: 15, // feet
        savingThrow: 'dexterity',
        dcAbility: 'constitution',
        maxUses: 1,
      },
      {
        id: 'dragonborn-resistance',
        type: 'resistance',
        name: 'Damage Resistance',
        description: 'You have resistance to the damage type associated with your draconic ancestry.',
        trigger: 'passive',
        damageTypes: ['fire'], // Default, should be set by ancestry choice
        level: 'resistance',
      },
    ],
    languages: ['Common', 'Draconic'],
  },
  {
    id: 'gnome-rock',
    name: 'Rock Gnome',
    size: 'small',
    speed: 25,
    abilityScoreIncrease: {
      intelligence: 2,
      constitution: 1,
    },
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
        name: 'Gnome Cunning',
        description: 'You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.',
        trigger: 'on_saving_throw',
        magicSaves: true,
      },
      {
        id: 'gnome-artificers-lore',
        type: 'trait',
        name: "Artificer's Lore",
        description: 'Whenever you make an Intelligence (History) check related to magic items, alchemical objects, or technological devices, you can add twice your proficiency bonus.',
        trigger: 'passive',
      },
      {
        id: 'gnome-tinker',
        type: 'proficiency',
        name: 'Tinker',
        description: "You have proficiency with artisan's tools (tinker's tools). You can spend 1 hour and 10 gp worth of materials to construct a Tiny clockwork device.",
        trigger: 'passive',
        proficiencies: {
          tools: ["tinker's tools"],
        },
      },
    ],
    languages: ['Common', 'Gnomish'],
  },
  {
    id: 'half-elf',
    name: 'Half-Elf',
    size: 'medium',
    speed: 30,
    abilityScoreIncrease: {
      charisma: 2,
      // Note: Half-elves also get +1 to two other abilities of choice
      // This would need UI support for selection
    },
    abilities: [
      {
        id: 'half-elf-darkvision',
        type: 'darkvision',
        name: 'Darkvision',
        description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
        trigger: 'passive',
        range: 60,
      },
      {
        id: 'half-elf-fey-ancestry',
        type: 'save_advantage',
        name: 'Fey Ancestry',
        description: "You have advantage on saving throws against being charmed, and magic can't put you to sleep.",
        trigger: 'on_saving_throw',
        conditions: ['charmed'],
      },
      {
        id: 'half-elf-skill-versatility',
        type: 'proficiency',
        name: 'Skill Versatility',
        description: 'You gain proficiency in two skills of your choice.',
        trigger: 'passive',
        proficiencies: {
          // Would need UI to select 2 skills
          skills: [],
        },
      },
      {
        id: 'half-elf-extra-asi',
        type: 'trait',
        name: 'Extra Ability Score Increase',
        description: 'Two ability scores of your choice increase by 1 (in addition to Charisma).',
        trigger: 'passive',
      },
    ],
    languages: ['Common', 'Elvish', 'One additional language'],
  },
  {
    id: 'half-orc',
    name: 'Half-Orc',
    size: 'medium',
    speed: 30,
    abilityScoreIncrease: {
      strength: 2,
      constitution: 1,
    },
    abilities: [
      {
        id: 'half-orc-darkvision',
        type: 'darkvision',
        name: 'Darkvision',
        description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
        trigger: 'passive',
        range: 60,
      },
      {
        id: 'half-orc-menacing',
        type: 'proficiency',
        name: 'Menacing',
        description: 'You gain proficiency in the Intimidation skill.',
        trigger: 'passive',
        proficiencies: {
          skills: ['Intimidation'],
        },
      },
      {
        id: 'half-orc-relentless-endurance',
        type: 'triggered_heal',
        name: 'Relentless Endurance',
        description: "When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can't use this feature again until you finish a long rest.",
        trigger: 'on_damage_taken',
        triggerCondition: 'drop_to_zero',
        healAmount: 1,
        maxUses: 1,
      },
      {
        id: 'half-orc-savage-attacks',
        type: 'bonus_damage',
        name: 'Savage Attacks',
        description: "When you score a critical hit with a melee weapon attack, you can roll one of the weapon's damage dice one additional time and add it to the extra damage of the critical hit.",
        trigger: 'on_attack_roll',
        triggerCondition: 'critical_hit',
        bonusDice: '1d6', // This should be weapon damage die, simplified for now
      },
    ],
    languages: ['Common', 'Orc'],
  },
  {
    id: 'tiefling',
    name: 'Tiefling',
    size: 'medium',
    speed: 30,
    abilityScoreIncrease: {
      charisma: 2,
      intelligence: 1,
    },
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
        id: 'tiefling-hellish-resistance',
        type: 'resistance',
        name: 'Hellish Resistance',
        description: 'You have resistance to fire damage.',
        trigger: 'passive',
        damageTypes: ['fire'],
        level: 'resistance',
      },
      {
        id: 'tiefling-thaumaturgy',
        type: 'bonus_cantrip',
        name: 'Infernal Legacy: Thaumaturgy',
        description: 'You know the thaumaturgy cantrip.',
        trigger: 'passive',
        spellId: 'thaumaturgy',
        spellcastingAbility: 'charisma',
      },
      {
        id: 'tiefling-hellish-rebuke',
        type: 'bonus_spell',
        name: 'Infernal Legacy: Hellish Rebuke',
        description: 'At 3rd level, you can cast hellish rebuke as a 2nd-level spell once per long rest.',
        trigger: 'reaction',
        spellId: 'hellish-rebuke',
        spellcastingAbility: 'charisma',
        minLevel: 3,
        usesPerCombat: 1,
      },
      {
        id: 'tiefling-darkness',
        type: 'bonus_spell',
        name: 'Infernal Legacy: Darkness',
        description: 'At 5th level, you can cast darkness once per long rest.',
        trigger: 'action',
        spellId: 'darkness',
        spellcastingAbility: 'charisma',
        minLevel: 5,
        usesPerCombat: 1,
      },
    ],
    languages: ['Common', 'Infernal'],
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
