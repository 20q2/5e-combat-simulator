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
  GenericClassFeature,
} from './classFeature'

export {
  isSecondWindFeature,
  isFightingStyleFeature,
  isSneakAttackFeature,
  isActionSurgeFeature,
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
}

// ============================================
// Character Types
// ============================================

export interface Character {
  id: string
  name: string
  race: Race
  class: CharacterClass
  subclass?: Subclass
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
