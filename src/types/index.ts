// ============================================
// Core Types
// ============================================

export type AbilityName = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'

export interface AbilityScores {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

export type Size = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'

export type DamageType =
  | 'bludgeoning'
  | 'piercing'
  | 'slashing'
  | 'acid'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'thunder'

export type Condition =
  // Standard D&D 5e conditions
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious'
  | 'exhaustion'
  // Combat action-based conditions (tracked for mechanics)
  | 'dodging'
  | 'disengaging'
  | 'dashing'
  | 'hidden'
  | 'shielded'
  // Weapon mastery conditions
  | 'sapped'  // Disadvantage on next attack (from Sap mastery)
  // Battle Master maneuver conditions
  | 'goaded'  // Disadvantage on attacks vs targets other than goader (from Goading Attack)
  | 'distracted'  // Next attack by a different attacker has advantage (from Distracting Strike)
  | 'evasive'  // AC bonus from Evasive Footwork (bonus stored on combatant)

// ============================================
// Character Types
// ============================================

// Race types are now defined in ./race.ts with full ability support
// Import Race for use in Character interface, then re-export everything
import type { Race } from './race'

export type {
  Race,
  RacialAbility,
  RacialAbilityTrigger,
  RacialAbilityBase,
  ResistanceAbility,
  DarkvisionAbility,
  ProficiencyAbility,
  SaveAdvantageAbility,
  RerollAbility,
  TriggeredHealAbility,
  BonusDamageAbility,
  BreathWeaponAbility,
  BonusCantripAbility,
  BonusSpellAbility,
  NimblenessAbility,
  TraitAbility,
  DragonAncestry,
  DragonAncestryInfo,
} from './race'

export {
  isResistanceAbility,
  isDarkvisionAbility,
  isProficiencyAbility,
  isSaveAdvantageAbility,
  isRerollAbility,
  isTriggeredHealAbility,
  isBonusDamageAbility,
  isBreathWeaponAbility,
  isBonusCantripAbility,
  isBonusSpellAbility,
  DRAGON_ANCESTRIES,
} from './race'

// Class feature types are defined in ./classFeature.ts with full ability support
export type {
  ClassFeature,
  ClassFeatureBase,
  ClassFeatureTrigger,
  SecondWindFeature,
  FightingStyleFeature,
  AdditionalFightingStyleFeature,
  FightingStyle,
  SneakAttackFeature,
  ActionSurgeFeature,
  WeaponMasteryFeature,
  CombatSuperiorityFeature,
  RelentlessFeature,
  GenericClassFeature,
} from './classFeature'

export {
  isSecondWindFeature,
  isFightingStyleFeature,
  isAdditionalFightingStyleFeature,
  isSneakAttackFeature,
  isActionSurgeFeature,
  isWeaponMasteryFeature,
  isCombatSuperiorityFeature,
  isRelentlessFeature,
  isGenericClassFeature,
} from './classFeature'

// Maneuver types are defined in ./maneuver.ts
export type {
  ManeuverTrigger,
  Maneuver,
  ManeuverResult,
  ManeuverContext,
} from './maneuver'

// Attack replacement types are defined in ./attackReplacement.ts
export type {
  AttackReplacement,
  AttackReplacementBase,
  AoEAttackReplacement,
  SingleTargetAttackReplacement,
  AoEAttackResult,
  AoETargetResult,
} from './attackReplacement'

export {
  isAoEAttackReplacement,
  isSingleTargetAttackReplacement,
} from './attackReplacement'

// Origin feat combat types are defined in ./originFeat.ts
export type {
  OriginFeatTrigger,
  OriginFeatCombatBase,
  OriginFeatCombat,
  AlertFeatCombat,
  HealerFeatCombat,
  LuckyFeatCombat,
  SavageAttackerFeatCombat,
  TavernBrawlerFeatCombat,
} from './originFeat'

export {
  isAlertFeat,
  isHealerFeat,
  isLuckyFeat,
  isSavageAttackerFeat,
  isTavernBrawlerFeat,
} from './originFeat'

// Import ClassFeature and FightingStyle types for use in interfaces
import type { ClassFeature, FightingStyle } from './classFeature'

export interface CharacterClass {
  id: string
  name: string
  hitDie: number
  primaryAbility: AbilityName[]
  savingThrowProficiencies: AbilityName[]
  armorProficiencies: string[]
  weaponProficiencies: string[]
  skillChoices: {
    count: number
    options: string[]
  }
  features: ClassFeature[]
  subclassLevel: number
  subclasses: Subclass[]
  spellcasting?: SpellcastingInfo
}

export interface Subclass {
  id: string
  name: string
  features: ClassFeature[]
}

export interface SpellcastingInfo {
  ability: AbilityName
  spellsKnownProgression?: number[]
  cantripsKnownProgression: number[]
  spellSlotProgression: SpellSlotProgression
  preparedCaster: boolean
  ritual: boolean
}

export type SpellSlotProgression = {
  [level: number]: number[]
}

export interface SpellSlots {
  1: { max: number; current: number }
  2: { max: number; current: number }
  3: { max: number; current: number }
  4: { max: number; current: number }
  5: { max: number; current: number }
  6: { max: number; current: number }
  7: { max: number; current: number }
  8: { max: number; current: number }
  9: { max: number; current: number }
}

// ============================================
// Equipment Types
// ============================================

export type WeaponProperty =
  | 'ammunition'
  | 'finesse'
  | 'heavy'
  | 'light'
  | 'loading'
  | 'range'
  | 'reach'
  | 'special'
  | 'thrown'
  | 'two-handed'
  | 'versatile'

// D&D 5e 2024 Weapon Mastery properties
export type WeaponMastery =
  | 'cleave'   // On hit, make second attack vs creature within 5ft (no ability mod to damage). Once per turn.
  | 'graze'    // On miss, deal ability modifier damage. Every miss.
  | 'nick'     // Extra light weapon attack as part of Attack action. Once per turn.
  | 'push'     // Push target 10ft away on hit. Every hit.
  | 'sap'      // Target has disadvantage on next attack. Every hit.
  | 'slow'     // Reduce target speed by 10ft until your next turn. Every hit.
  | 'topple'   // Target makes CON save or falls prone. Every hit.
  | 'vex'      // Gain advantage on next attack vs same target. Every hit.

export interface Weapon {
  id: string
  name: string
  category: 'simple' | 'martial'
  type: 'melee' | 'ranged'
  damage: string
  damageType: DamageType
  properties: WeaponProperty[]
  range?: { normal: number; long: number }
  versatileDamage?: string
  weight: number
  cost: number
  mastery?: WeaponMastery  // D&D 2024 weapon mastery property
}

export interface Armor {
  id: string
  name: string
  category: 'light' | 'medium' | 'heavy' | 'shield'
  baseAC: number
  dexBonus: boolean
  maxDexBonus?: number
  strengthRequirement?: number
  stealthDisadvantage: boolean
  weight: number
  cost: number
}

export interface Equipment {
  meleeWeapon?: Weapon
  rangedWeapon?: Weapon
  offhandWeapon?: Weapon // Light weapon for two-weapon fighting
  armor?: Armor
  shield?: Armor
  items: EquipmentItem[]
}

export interface EquipmentItem {
  id: string
  name: string
  quantity: number
  weight: number
}

// ============================================
// Spell Types
// ============================================

export type SpellSchool =
  | 'abjuration'
  | 'conjuration'
  | 'divination'
  | 'enchantment'
  | 'evocation'
  | 'illusion'
  | 'necromancy'
  | 'transmutation'

export interface Spell {
  id: string
  name: string
  level: number
  school: SpellSchool
  castingTime: string
  range: string
  components: {
    verbal?: boolean
    somatic?: boolean
    material?: string
  }
  duration: string
  concentration: boolean
  ritual: boolean
  description: string
  higherLevels?: string
  classes: string[]
  damage?: {
    type: DamageType
    dice: string
    scaling?: { [level: number]: string }
  }
  savingThrow?: AbilityName
  attackType?: 'melee' | 'ranged'
  autoHit?: boolean // Spells like Magic Missile that automatically hit
  areaOfEffect?: {
    type: 'cone' | 'cube' | 'cylinder' | 'line' | 'sphere'
    size: number
    origin?: 'self' | 'point' // 'self' means AoE must touch caster (like Thunder Wave), 'point' means freely placeable
  }
  // Multi-projectile spells (Magic Missile, Scorching Ray, Eldritch Blast, etc.)
  projectiles?: {
    count: number                    // Base number of projectiles at spell level
    damagePerProjectile: string      // Damage dice per projectile (e.g., "1d4+1")
    scalingPerSlotLevel?: number     // Additional projectiles per slot level above base
  }
  // Multi-projectile spells (Magic Missile, Scorching Ray, Eldritch Blast, etc.)
  // Reaction spells (Shield, Counterspell, Absorb Elements, etc.)
  reaction?: {
    trigger: 'on_hit' | 'on_magic_missile' | 'enemy_casts_spell' | 'take_damage'
    effect: {
      type: 'ac_bonus' | 'negate_spell' | 'resistance'
      value?: number                 // e.g., +5 for Shield
      damageType?: DamageType        // For Absorb Elements
    }
  }

  // ---- Data-driven spell effects (applied generically by combat store) ----

  // Condition applied when the spell attack hits (e.g., Shocking Grasp can't react)
  conditionOnHit?: Condition
  // Condition applied when target fails saving throw (e.g., Charm Person → charmed)
  conditionOnFailedSave?: Condition
  // Target gets advantage on save during combat (e.g., Charm Person)
  saveAdvantageInCombat?: boolean
  // Target can't take reactions until start of its next turn (Shocking Grasp)
  onHitNoReactions?: boolean
  // Descriptive effect logged on hit (Ray of Frost speed, Chill Touch healing)
  onHitDescription?: string
  // Descriptive effect logged on failed save (Mind Sliver -1d4)
  onFailedSaveDescription?: string
  // Replace base die type when target is below max HP (Toll the Dead: 'd8' → 'd12')
  damagedTargetDieUpgrade?: string
  // Caster picks damage type at cast time (e.g., Chromatic Orb)
  damageTypeChoice?: DamageType[]
  // Bounce mechanic: orb bounces to new target if any two damage dice match
  bounce?: {
    range: number       // Bounce range in feet (30 for Chromatic Orb)
    maxBounces: number  // Max bounces at base spell level
  }
}

// ============================================
// Character Types
// ============================================

// Import Background type for Character interface
import type { Background, OriginFeatId } from '@/data'
import type { MagicInitiateChoice, AbilityBonusMode } from '@/stores/characterStore'

export interface ClassEntry {
  classId: string
  classData: CharacterClass
  subclass?: Subclass
  level: number  // levels in THIS class (not total character level)
}

export interface Character {
  id: string
  name: string
  race: Race
  class: CharacterClass          // Primary class (first class taken) — backward compat
  subclass?: Subclass            // Primary class subclass — backward compat
  background?: Background
  originFeats: OriginFeatId[] // All origin feats (from background, and from human racial if applicable)
  magicInitiateChoices?: MagicInitiateChoice[] // Spell choices for Magic Initiate feat(s)
  level: number                  // Total character level (sum of all class levels) — backward compat
  classes: ClassEntry[]          // All class entries for multiclass support
  abilityScores: AbilityScores
  // For editing: store the base scores and ASI choices so we can reconstruct the draft
  baseAbilityScores?: AbilityScores
  abilityBonusMode?: AbilityBonusMode
  abilityBonusPlus2?: AbilityName | null
  abilityBonusPlus1?: AbilityName | null
  abilityBonusPlus1Trio?: AbilityName[]
  // Class ASI selections for reconstruction when editing
  classAsiSelections?: Array<{
    level: number
    mode: 'plus2-plus1' | 'plus1-plus1'
    plus2Ability?: AbilityName
    plus1Abilities: AbilityName[]
  }>
  maxHp: number
  currentHp: number
  temporaryHp: number
  ac: number
  speed: number
  swimSpeed?: number
  proficiencyBonus: number
  skillProficiencies: string[]
  savingThrowProficiencies: AbilityName[]
  equipment: Equipment
  spellSlots?: SpellSlots
  knownSpells?: Spell[]
  preparedSpells?: Spell[]
  features: ClassFeature[]
  conditions: ActiveCondition[]
  concentratingOn?: Spell
  deathSaves: {
    successes: number
    failures: number
  }
  masteredWeaponIds?: string[]  // D&D 2024: IDs of weapons this character has mastered
  fightingStyles?: FightingStyle[]  // Selected fighting styles (primary + additional for Champion)
  knownManeuverIds?: string[]  // Battle Master: IDs of known maneuvers
  customTokenImage?: string  // User-uploaded token image as base64 data URL
}

export interface ActiveCondition {
  condition: Condition
  duration?: number
  source?: string
}

// ============================================
// Monster Types
// ============================================

export interface Monster {
  id: string
  name: string
  size: Size
  type: string
  alignment: string
  ac: number
  acType?: string
  hp: number
  hitDice: string
  speed: {
    walk: number
    fly?: number
    swim?: number
    climb?: number
    burrow?: number
  }
  abilityScores: AbilityScores
  savingThrows?: Partial<Record<AbilityName, number>>
  skills?: Record<string, number>
  damageResistances?: DamageType[]
  damageImmunities?: DamageType[]
  damageVulnerabilities?: DamageType[]
  conditionImmunities?: Condition[]
  senses: {
    darkvision?: number
    blindsight?: number
    tremorsense?: number
    truesight?: number
    passivePerception: number
  }
  languages: string[]
  challengeRating: number
  experiencePoints: number
  actions: MonsterAction[]
  reactions?: MonsterAction[]
  legendaryActions?: MonsterAction[]
}

export interface MonsterAction {
  name: string
  description: string
  attackBonus?: number
  damage?: string
  damageType?: DamageType
  reach?: number
  range?: { normal: number; long: number }
  savingThrow?: {
    ability: AbilityName
    dc: number
  }
  recharge?: string
}

// ============================================
// Combat Types
// ============================================

export interface Position {
  x: number
  y: number
}

// ============================================
// Terrain & Obstacle Types
// ============================================

export type ObstacleType = 'wall' | 'pillar' | 'furniture' | 'boulder' | 'tree'

export interface Obstacle {
  type: ObstacleType
  blocksMovement: boolean
  blocksLineOfSight: boolean
}

export type TerrainType = 'difficult' | 'hazard' | 'water'

export interface StairConnection {
  targetX: number
  targetY: number
  targetElevation: number
  direction: 'up' | 'down'
}

export interface TerrainDefinition {
  x: number
  y: number
  terrain?: TerrainType
  obstacle?: Obstacle
  elevation?: number
  stairConnection?: StairConnection
}

export interface Combatant {
  id: string
  name: string
  type: 'character' | 'monster'
  data: Character | Monster
  position: Position
  initiative: number
  currentHp: number
  maxHp: number
  temporaryHp: number
  conditions: ActiveCondition[]
  concentratingOn?: Spell
  hasActed: boolean
  hasBonusActed: boolean
  hasReacted: boolean
  movementUsed: number
  deathSaves: {
    successes: number
    failures: number
  }
  isStable: boolean
  racialAbilityUses: Record<string, number>  // Track uses of limited racial abilities
  classFeatureUses: Record<string, number>   // Track uses of limited class features (Second Wind, etc.)
  usedSneakAttackThisTurn: boolean           // Track if Sneak Attack was used this turn
  attacksMadeThisTurn: number                // Track attacks made this turn for Extra Attack
  // D&D 2024 Weapon Mastery tracking
  usedCleaveThisTurn: boolean                // Track if Cleave was used this turn (once per turn)
  usedNickThisTurn: boolean                  // Track if Nick bonus attack was used this turn
  vexedBy?: {                                // Track who vexed this target (for Vex mastery advantage)
    attackerId: string
    expiresOnRound: number
  }
  // Magic Initiate feat tracking
  magicInitiateFreeUses: Record<string, boolean>  // spell ID -> has free use available (resets on long rest)
  // Battle Master tracking
  superiorityDiceRemaining: number  // Current number of superiority dice available
  usedManeuverThisAttack: boolean  // Track if a maneuver was used on the current attack (for on-hit maneuvers)
  goadedBy?: string  // ID of combatant who goaded this target (for Goading Attack disadvantage)
  // Bonus action maneuver tracking
  evasiveFootworkBonus?: number  // AC bonus from Evasive Footwork (cleared when 'evasive' condition expires)
  feintTarget?: string  // Target ID for Feinting Attack advantage (cleared at turn end)
  feintBonusDamage?: number  // Superiority die roll for Feinting Attack bonus damage
  lungingAttackBonus?: number  // Superiority die roll for Lunging Attack bonus damage
  // Fighter Studied Attacks tracking (level 13)
  studiedTargetId?: string  // ID of combatant this fighter has advantage against (after missing them)
  // Origin Feat tracking
  featUses: Record<string, number>  // feat id -> remaining uses (e.g., { lucky: 2 })
  usedSavageAttackerThisTurn: boolean  // Track if Savage Attacker was used this turn (once per turn)
  usedTavernBrawlerPushThisTurn: boolean  // Track if Tavern Brawler push was used this turn (once per turn)
  heroicInspiration: boolean  // Musician feat: can reroll a failed attack or save (one use per combat)
}

export interface GridCell {
  x: number
  y: number
  terrain?: TerrainType
  occupiedBy?: string
  obstacle?: Obstacle
  elevation: number
  stairConnection?: StairConnection
}

export interface Grid {
  width: number
  height: number
  cells: GridCell[][]
}

export interface CombatLogEntry {
  id: string
  timestamp: number
  round: number
  type: 'initiative' | 'movement' | 'attack' | 'damage' | 'heal' | 'spell' | 'condition' | 'death' | 'other'
  actorId?: string
  actorName: string
  targetId?: string
  targetName?: string
  message: string
  details?: string
}

export type CombatPhase = 'setup' | 'initiative' | 'combat' | 'victory' | 'defeat'

export interface RangeHighlight {
  origin: Position
  range: number
  longRange?: number // Long range in feet (attacks at disadvantage)
  type: 'melee' | 'ranged' | 'spell'
  shape?: 'circle' | 'cone' | 'line' // For future use
}

export interface AoEPreview {
  type: 'cone' | 'cube' | 'cylinder' | 'line' | 'sphere'
  size: number
  origin: Position // Caster position
  originType?: 'self' | 'point' // 'self' means AoE must touch caster (Thunder Wave)
}

export type CombatPopupType =
  | 'damage'      // Shows damage number
  | 'miss'        // "MISS"
  | 'critical'    // "CRITICAL!" - shown separately from damage on crits
  | 'critical_miss' // "CRITICAL MISS!" - natural 1
  | 'heal'        // Shows heal number in green
  | 'saved'       // "SAVED" - passed saving throw
  | 'save_failed' // "FAILED" - failed saving throw
  | 'dodged'      // "DODGED" - attack missed due to Dodge action
  | 'resisted'    // "RESISTED" - damage reduced by resistance
  | 'condition'   // Shows condition name (e.g., "Frightened", "Prone")

export interface DamagePopup {
  id: string
  targetId: string
  position: Position
  amount?: number              // Optional - not needed for miss/saved
  damageType?: DamageType      // Optional - not needed for miss/heal
  isCritical: boolean
  timestamp: number
  velocityX: number            // Random horizontal drift (-1 to 1)
  popupType: CombatPopupType   // What kind of popup to show
  text?: string                // Optional custom text override
}

export interface ActiveProjectile {
  id: string
  from: Position       // Attacker grid position
  to: Position         // Target grid position
  timestamp: number
  duration: number     // Flight duration in ms
}

// ============================================
// Combat Trigger System Types
// ============================================

export type CombatTriggerType =
  | 'on_hit'           // After successful weapon attack (Battle Master on-hit maneuvers)
  | 'on_miss'          // After attack miss (Riposte opportunity)
  | 'on_damage_taken'  // After taking damage (Parry, Absorb Elements)
  | 'pre_attack'       // On miss - add to attack roll (Precision Attack)

export interface TriggerOption {
  id: string
  type: 'maneuver' | 'spell' | 'class_feature'
  name: string
  description: string
  cost?: string        // "1 Superiority Die (d8)", "Level 1 Slot"
  effect?: string      // "+1d8 damage, STR save (DC 15) or prone"
}

export interface PendingTrigger {
  type: CombatTriggerType
  triggererId: string       // Who triggered (usually attacker)
  reactorId: string         // Who can respond (attacker for on_hit, target for on_damage_taken)
  options: TriggerOption[]
  context: {
    attackRoll?: number
    naturalRoll?: number     // The natural d20 roll (for Precision Attack re-resolution)
    targetAC?: number
    damage?: number
    damageType?: DamageType
    isCritical?: boolean
    weapon?: Weapon
  }
  pendingDamage?: number    // Hold damage until trigger resolved
  targetId?: string         // Target of the original attack (for applying maneuver effects)
}

export interface CombatState {
  grid: Grid
  combatants: Combatant[]
  turnOrder: string[]
  currentTurnIndex: number
  round: number
  phase: CombatPhase
  log: CombatLogEntry[]
  mapBackgroundImage?: string // Background image path for the map
  selectedCombatantId?: string
  selectedAction?: 'move' | 'attack' | 'spell' | 'dash' | 'disengage' | 'dodge' | 'help' | 'hide' | 'ready'
  preselectedWeaponId?: string // Set from CombatantPanel to open attack mode with a specific weapon
  preselectedSpellId?: string // Set from CombatantPanel to shortcut directly to casting a spell
  targetingMode?: {
    type: 'single' | 'area'
    spell?: Spell
    weapon?: Weapon
    range: number
  }
  hoveredTargetId?: string
  rangeHighlight?: RangeHighlight
  aoePreview?: AoEPreview
  selectedSpell?: Spell
  damagePopups: DamagePopup[]
  // Active projectile animations (ranged attacks flying to target)
  activeProjectiles: ActiveProjectile[]
  // Projectile targeting for multi-projectile spells (Magic Missile, etc.)
  projectileTargeting?: {
    spell: Spell
    totalProjectiles: number
    assignments: Record<string, number>  // targetId -> count
  }
  // Pending reaction prompt (Shield, opportunity attacks, etc.)
  pendingReaction?: {
    type: 'shield' | 'opportunity_attack'
    reactingCombatantId: string          // Who can react
    triggeringCombatantId: string        // Who triggered the reaction
    availableReactions: Spell[]          // Reaction spells available
    context: {
      attackRoll?: number                // The attack roll that hit
      attackBonus?: number               // Attacker's bonus
      targetAC?: number                  // Target's current AC
      damage?: number                    // Pending damage (for Shield)
      damageType?: DamageType
      isCritical?: boolean
    }
  }
  // Pending combat trigger prompt (maneuvers, class features, etc.)
  pendingTrigger?: PendingTrigger
  // Movement animation state
  movementAnimation?: {
    combatantId: string
    path: Position[]
    currentIndex: number
  }
  // Pending movement data (applied after animation completes)
  pendingMovement?: {
    id: string
    to: Position
    path: Position[]
    pathCost: number
    threateningEnemies: string[]  // IDs of enemies that will trigger opportunity attacks
  }
  // Alert feat initiative swap prompt
  pendingInitiativeSwap?: {
    swapperId: string         // ID of combatant with Alert feat
    eligibleAllies: string[]  // IDs of allies available to swap with
  }
  // Savage Attacker feat damage choice prompt
  pendingSavageAttacker?: {
    attackerId: string
    targetId: string
    roll1: { total: number; breakdown: string }
    roll2: { total: number; breakdown: string }
    damageType: DamageType
    isCritical: boolean
  }
  // Chromatic Orb damage type choice prompt
  pendingDamageTypeChoice?: {
    casterId: string
    spell: Spell
    targetId: string
    options: DamageType[]
  }
  // Chromatic Orb bounce target selection prompt
  pendingBounceTarget?: {
    casterId: string
    spell: Spell
    damageType: DamageType
    previousTargetId: string
    alreadyTargetedIds: string[]
    bouncesRemaining: number
  }
  // Breath weapon targeting state (for AoE attack replacements)
  breathWeaponTargeting?: {
    replacementId: string
    attackerId: string
  }
  // Indomitable reroll prompt (Fighter level 9+)
  pendingIndomitable?: {
    combatantId: string           // Fighter who can use Indomitable
    ability: AbilityName          // The ability for the saving throw
    dc: number                    // The DC that was failed
    originalRoll: number          // The original roll total (failed)
    originalNatural: number       // The natural d20 roll
    modifier: number              // The save modifier
    context: {                    // Context for what happens after resolution
      type: 'spell_damage' | 'breath_weapon' | 'effect'
      sourceId?: string           // Who/what caused the save
      sourceName?: string         // Name of source
      damage?: number             // Pending damage on failed save
      halfDamageOnSave?: boolean  // Whether save halves damage
      damageType?: DamageType
      effect?: string             // Description of effect on failed save
    }
  }
  // Heroic Inspiration reroll prompt (Musician feat)
  pendingHeroicInspiration?: {
    combatantId: string           // Who has Heroic Inspiration
    type: 'attack' | 'save'       // What type of roll failed
    originalRoll: number          // The original d20 roll (natural)
    originalTotal: number         // The original roll total
    modifier: number              // The modifier applied
    targetValue: number           // AC (for attack) or DC (for save)
    context: {
      targetId?: string           // Target of the attack (for attacks)
      targetName?: string         // Name of target
      weapon?: Weapon             // Weapon used (for attacks)
      isRanged?: boolean          // Whether the attack was ranged (for projectile deferral)
      ability?: AbilityName       // Ability for save (for saves)
      sourceName?: string         // What caused the save
      damage?: number             // Pending damage on failed save
      halfDamageOnSave?: boolean  // Whether save halves damage
      damageType?: DamageType
    }
  }
  // Pending attack (for Precision Attack on-miss re-resolution)
  pendingAttack?: {
    attackerId: string
    targetId: string
    weapon?: Weapon
    monsterAction?: MonsterAction
    rangedWeapon?: Weapon
    masteryOverride?: WeaponMastery
    overrideNaturalRoll?: number
  }
}

// ============================================
// Encounter Types
// ============================================

export interface EncounterMonster {
  monsterId: string
  count: number
}

export interface Encounter {
  id: string
  name: string
  characterId: string
  monsters: EncounterMonster[]
  gridWidth: number
  gridHeight: number
}

// ============================================
// Utility Types
// ============================================

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1
}
