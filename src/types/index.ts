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
  FightingStyle,
  SneakAttackFeature,
  ActionSurgeFeature,
  WeaponMasteryFeature,
  GenericClassFeature,
} from './classFeature'

export {
  isSecondWindFeature,
  isFightingStyleFeature,
  isSneakAttackFeature,
  isActionSurgeFeature,
  isWeaponMasteryFeature,
  isGenericClassFeature,
} from './classFeature'

// Import ClassFeature type for use in CharacterClass interface
import type { ClassFeature } from './classFeature'

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
  }
  // Multi-projectile spells (Magic Missile, Scorching Ray, Eldritch Blast, etc.)
  projectiles?: {
    count: number                    // Base number of projectiles at spell level
    damagePerProjectile: string      // Damage dice per projectile (e.g., "1d4+1")
    scalingPerSlotLevel?: number     // Additional projectiles per slot level above base
  }
  // Reaction spells (Shield, Counterspell, Absorb Elements, etc.)
  reaction?: {
    trigger: 'on_hit' | 'on_magic_missile' | 'enemy_casts_spell' | 'take_damage'
    effect: {
      type: 'ac_bonus' | 'negate_spell' | 'resistance'
      value?: number                 // e.g., +5 for Shield
      damageType?: DamageType        // For Absorb Elements
    }
  }
}

// ============================================
// Character Types
// ============================================

// Import Background type for Character interface
import type { Background, OriginFeatId } from '@/data'
import type { MagicInitiateChoice } from '@/stores/characterStore'

export interface Character {
  id: string
  name: string
  race: Race
  class: CharacterClass
  subclass?: Subclass
  background?: Background
  originFeats: OriginFeatId[] // All origin feats (from background, and from human racial if applicable)
  magicInitiateChoices?: MagicInitiateChoice[] // Spell choices for Magic Initiate feat(s)
  level: number
  abilityScores: AbilityScores
  maxHp: number
  currentHp: number
  temporaryHp: number
  ac: number
  speed: number
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
  type: 'melee' | 'ranged' | 'spell'
  shape?: 'circle' | 'cone' | 'line' // For future use
}

export interface AoEPreview {
  type: 'cone' | 'cube' | 'cylinder' | 'line' | 'sphere'
  size: number
  origin: Position // Caster position
}

export type CombatPopupType =
  | 'damage'      // Shows damage number
  | 'miss'        // "MISS"
  | 'critical'    // "CRITICAL!" (used with damage)
  | 'heal'        // Shows heal number in green
  | 'saved'       // "SAVED" - passed saving throw
  | 'dodged'      // "DODGED" - attack missed due to Dodge action
  | 'resisted'    // "RESISTED" - damage reduced by resistance

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
