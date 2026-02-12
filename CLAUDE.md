# 5e Combat Simulator - Claude Memory Document

## Project Overview
A D&D 5th Edition tactical combat simulator built with React + TypeScript + Vite. Features character creation, encounter building, and turn-based combat with AI opponents on a tactical grid.

## Tech Stack
- **React 18.3** with React Router DOM 7.13
- **TypeScript 5.6** (strict mode)
- **Vite 6.0** (build tool)
- **Vitest 4.0** + **React Testing Library** (testing)
- **Zustand 5.0** (state management with localStorage persistence)
- **Tailwind CSS 4.1** + **Shadcn/ui** (styling)
- **Lucide React** (icons)

## Project Structure
```
src/
├── components/
│   ├── character/    # Character creation wizard components
│   ├── combat/       # Combat UI (grid, tokens, action bar, logs)
│   ├── encounter/    # Encounter builder
│   ├── layout/       # Layout wrapper
│   └── ui/           # Shadcn base components (14 components)
├── pages/            # Route pages (Home, Character, Encounter, Combat)
├── stores/           # Zustand stores (combatStore, characterStore)
├── engine/           # Core combat logic
│   ├── combat.ts         # Attack resolution, advantage/disadvantage
│   ├── classAbilities.ts # Class feature logic (Second Wind, Sneak Attack, etc.)
│   ├── racialAbilities.ts# Racial ability logic (resistances, saves)
│   ├── dice.ts           # Dice rolling with expression parsing
│   └── ai.ts             # Monster AI decision tree
├── lib/              # Utilities
│   ├── pathfinding.ts    # A* pathfinding with 5-10 diagonal rule
│   ├── movement.ts       # Movement calculations
│   ├── lineOfSight.ts    # LOS calculations
│   └── utils.ts          # Tailwind class merging (cn)
├── data/             # Game data definitions
│   ├── classes.ts        # 12 D&D classes with features
│   ├── races.ts          # 11 races with abilities
│   ├── monsters.ts       # Monster stat blocks
│   ├── equipment.ts      # Weapons & armor
│   ├── spells.ts         # Spell definitions
│   └── encounters.json   # Preset encounters
├── types/            # TypeScript definitions
│   ├── index.ts          # Core types (Character, Combatant, Grid, etc.)
│   ├── classFeature.ts   # Discriminated union for class features
│   └── race.ts           # Discriminated union for racial abilities
└── assets/           # Images (portraits, tokens, maps, obstacles)
```

## Routes
- `/` - HomePage: Quick start, preset selection, saved characters
- `/character` - CharacterPage: Multi-step character creation wizard
- `/encounter` - EncounterPage: Custom encounter builder
- `/combat` - CombatPage: Main combat simulation

## Key Type Patterns

### Discriminated Unions
Class features and racial abilities use discriminated unions with `type` field:

```typescript
// Class features (classFeature.ts)
type ClassFeature =
  | SecondWindFeature      // type: 'second_wind'
  | FightingStyleFeature   // type: 'fighting_style'
  | SneakAttackFeature     // type: 'sneak_attack'
  | ActionSurgeFeature     // type: 'action_surge'
  | CunningActionFeature   // type: 'cunning_action'
  | ExtraAttackFeature     // type: 'extra_attack'
  | ImprovedCriticalFeature// type: 'improved_critical'
  | GenericClassFeature    // type: 'generic'

// Racial abilities (race.ts)
type RacialAbility =
  | ResistanceAbility      // type: 'resistance'
  | DarkvisionAbility      // type: 'darkvision'
  | ProficiencyAbility     // type: 'proficiency'
  | SaveAdvantageAbility   // type: 'save_advantage'
  | RerollAbility          // type: 'reroll'
  | TriggeredHealAbility   // type: 'triggered_heal'
  | BonusDamageAbility     // type: 'bonus_damage'
  | BreathWeaponAbility    // type: 'breath_weapon'
  // ... and more
```

### Combatant State
The `Combatant` type tracks all combat state:
```typescript
interface Combatant {
  id: string;
  character: Character;
  position: Position;
  currentHp: number;
  maxHp: number;
  initiative: number;
  conditions: ActiveCondition[];
  // Action economy
  hasActed: boolean;
  hasBonusActed: boolean;
  hasReacted: boolean;
  movementUsed: number;
  // Feature tracking
  classFeatureUses: Record<string, number>;
  racialAbilityUses: Record<string, number>;
  usedSneakAttackThisTurn: boolean;
}
```

## State Management

### combatStore (no persistence)
- Grid and combatant management
- Combat flow (initiative, turns, rounds)
- Attack resolution and damage
- Movement with pathfinding
- AI execution
- Combat logging

### characterStore (localStorage persistence)
- Draft character creation with step tracking
- Saved characters list
- Ability score generation methods

## Combat Engine Logic

### Attack Resolution (`engine/combat.ts`)
1. Calculate attack bonus (ability mod + proficiency + fighting style)
2. Determine advantage/disadvantage from conditions
3. Roll d20 (handle natural 1/20)
4. Compare vs AC
5. Roll damage (double dice on crit)
6. Apply extra damage (Savage Attacks, Sneak Attack)

### Advantage Sources
- **Attacker gets advantage**: invisible, target is blinded/paralyzed/restrained/stunned/unconscious, melee vs prone
- **Attacker gets disadvantage**: blinded/poisoned/restrained/prone, target invisible

### Movement
- Uses A* pathfinding
- 5-10 diagonal rule (alternating 5/10 ft cost)
- Opportunity attacks on leaving threatened squares

## Scripts
```bash
npm run dev           # Start dev server
npm run build         # Type-check + build
npm run lint          # ESLint
npm run preview       # Preview production build
npm run test          # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run tests with coverage report
```

## Testing

### Framework
- **Vitest** - Test runner (integrates with Vite)
- **React Testing Library** - Component testing
- **jsdom** - DOM environment for tests

### Test File Locations
- Tests are colocated with source files: `*.test.ts` or `*.spec.ts`
- Test utilities: `src/test/setup.ts`, `src/test/test-utils.tsx`

### Running Tests
```bash
npm run test          # Watch mode (re-runs on file changes)
npm run test:run      # Single run (CI mode)
npm run test:coverage # Generate coverage report
```

### Mocking Dice Rolls
The dice engine uses `Math.random()`. Mock it for deterministic tests:
```typescript
import { vi } from 'vitest'

// Mock specific value: for d20, value N needs (N-1)/20
vi.spyOn(Math, 'random').mockReturnValue(0.5) // d20 = 11

// Mock sequence of rolls
let i = 0
vi.spyOn(Math, 'random').mockImplementation(() => {
  return [0.2, 0.9][i++ % 2] // Alternates: 5, 19 for d20
})
```

### Test Utilities (`src/test/test-utils.tsx`)
- `render()` - Custom render with BrowserRouter wrapper
- `mockDiceRoll(value)` - Returns Math.random value for specific die result
- `mockDiceSequence(values, sides)` - Returns function for sequence of rolls

### Writing Tests
Place test files next to source: `engine/dice.ts` → `engine/dice.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('feature', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does something', () => {
    expect(result).toBe(expected)
  })
})
```

### Coverage
Coverage reports generated in `coverage/` directory. Excluded:
- `node_modules/`
- `src/test/`
- `src/components/ui/` (Shadcn components)
- `*.d.ts` files

## Common Modification Patterns

### Adding a New Racial Ability
1. Add type to union in `src/types/race.ts`
2. Add logic in `src/engine/racialAbilities.ts`
3. Add ability to race definition in `src/data/races.ts`

### Adding a New Monster
1. Add to `src/data/monsters.ts` with stat block and actions

## SOP: Adding New Spells

This is the full procedure for adding a new spell, including its combat logic and class list assignment. Not every spell uses every field — simple damage cantrips are straightforward, while multi-projectile, AoE, or reaction spells involve more configuration.

### Step 1: Understand the Spell Type

Before writing data, determine which category the spell falls into. This determines which fields you need:

| Category | Fields Needed | Example |
|---|---|---|
| **Attack cantrip** | `damage`, `attackType`, `damage.scaling` | Fire Bolt |
| **Save cantrip** | `damage`, `savingThrow`, `damage.scaling` | Sacred Flame |
| **AoE save cantrip** | `damage`, `savingThrow`, `damage.scaling`, `areaOfEffect` | Acid Splash |
| **Attack spell (leveled)** | `damage`, `attackType`, `higherLevels` | Guiding Bolt |
| **Save spell (leveled)** | `damage`, `savingThrow`, `higherLevels` | Fireball |
| **AoE save spell** | `damage`, `savingThrow`, `areaOfEffect`, `higherLevels` | Burning Hands, Fireball |
| **Multi-projectile** | `damage`, `projectiles`, optionally `autoHit` | Magic Missile, Scorching Ray |
| **Reaction spell** | `reaction` (trigger + effect) | Shield, Counterspell |
| **Healing spell** | No `damage`, no `attackType`, no `savingThrow` | Cure Wounds |
| **Buff/debuff** | No `damage` (or optional) | Bless, Bane |
| **Self-origin AoE** | `areaOfEffect` with `origin: 'self'` | Thunder Wave |

### Step 2: Add Spell Data (`src/data/spells.ts`)

Add a new entry to the `spells` array, organized by level (cantrips first, then 1st level, etc.).

**Required fields (all spells):**
```typescript
{
  id: 'spell-name',              // Kebab-case, unique
  name: 'Spell Name',            // Display name
  level: 0,                      // 0 = cantrip, 1-9 = spell level
  school: 'evocation',           // SpellSchool type
  castingTime: '1 action',       // '1 action', '1 bonus action', '1 reaction, which you take when...'
  range: '120 feet',             // 'Self', 'Touch', 'X feet', 'Self (X-foot cone)', etc.
  components: { verbal: true, somatic: true, material?: 'a tiny ball of bat guano' },
  duration: 'Instantaneous',     // 'Instantaneous', '1 round', 'Concentration, up to 1 minute', etc.
  concentration: false,          // true if requires concentration
  ritual: false,                 // true if can be cast as ritual
  description: 'PHB spell text here.',
  classes: ['wizard', 'sorcerer'],  // All classes that have this on their spell list (lowercase)
}
```

**Damage field** (for spells that deal damage):
```typescript
damage: {
  type: 'fire',                   // DamageType
  dice: '1d10',                   // Base damage dice
  scaling: { 5: '2d10', 11: '3d10', 17: '4d10' },  // Cantrip only: character level thresholds
}
```
- `scaling` is only for cantrips (scales at character levels 5, 11, 17)
- For leveled spells, upcast scaling is described in `higherLevels` but handled by the casting UI (not automatically)

**Attack type** (for spell attack roll spells):
```typescript
attackType: 'ranged',  // 'melee' or 'ranged' — triggers spell attack roll in castSpell
```

**Saving throw** (for save-based spells):
```typescript
savingThrow: 'dexterity',  // AbilityName — triggers saving throw in castSpell
```

**Area of effect** (for AoE spells):
```typescript
areaOfEffect: {
  type: 'cone',        // 'cone' | 'cube' | 'cylinder' | 'line' | 'sphere'
  size: 15,            // Size in feet
  origin: 'self',      // 'self' = AoE originates from caster (Thunder Wave), 'point' = freely placed (Fireball)
}
```

**Multi-projectile** (Magic Missile, Scorching Ray):
```typescript
projectiles: {
  count: 3,                    // Base projectile count at spell level
  damagePerProjectile: '1d4+1', // Damage per projectile
  scalingPerSlotLevel: 1,       // Extra projectiles per slot level above base
}
autoHit: true,  // Only for spells that don't require attack rolls (Magic Missile)
```

**Reaction** (Shield, Counterspell):
```typescript
reaction: {
  trigger: 'on_hit',              // 'on_hit' | 'on_magic_missile' | 'enemy_casts_spell' | 'take_damage'
  effect: {
    type: 'ac_bonus',             // 'ac_bonus' | 'negate_spell' | 'resistance'
    value: 5,                     // For ac_bonus: the AC increase
    damageType: 'fire',           // For resistance: which damage type
  }
}
```

**Higher levels** (for leveled spells):
```typescript
higherLevels: 'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st.',
```

### Step 3: Assign to Class Spell Lists

The `classes` array determines which classes can learn/prepare the spell. Use lowercase class IDs:

```typescript
classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard']
```

**Lookup flow for character creation:**
- `SpellSelector.tsx` calls `getSpellsForClassAtLevel(className, maxLevel)` from `data/spells.ts`
- This filters spells where `s.classes.includes(className) && s.level <= maxLevel`
- `characterStore.ts` tracks selected spells in `DraftClassEntry.selectedSpellIds` and `selectedCantrips`
- `characterBuilder.ts` maps these to `character.knownSpells` in the final `Character` object

**No additional registration needed** — adding the class name to `classes[]` is sufficient for the spell to appear in that class's spell selection during character creation.

### Step 4: Add Combat Logic (if spell has special effects)

Most spells are handled automatically by `castSpell()` in `combatStore.ts` based on their data fields. You only need custom combat logic for spells with **special on-hit effects** or **unique behavior**.

**Resolution flow in `castSpell()` (line 3768 of combatStore.ts):**
1. Action economy check (action vs bonus action, reject reaction spells for proactive casting)
2. Spell slot consumption (or Magic Initiate free use)
3. Cantrip scaling via `getScaledCantripDice(spell, casterLevel)` from `engine/combat.ts`
4. Multi-projectile path (if `spell.projectiles` exists) → loops over `projectileAssignments`, rolls damage per projectile
5. AoE target resolution (if `spell.areaOfEffect` exists) → uses `getAoEAffectedCells()` from `lib/aoeShapes.ts` to find affected enemies
6. Single-target resolution (if `targetId` provided)
7. For each target:
   - **If `spell.attackType`**: roll spell attack (`getSpellAttackBonus(character)`), compare vs AC, roll damage on hit, crit on nat 20
   - **If `spell.savingThrow`**: roll save (`rollCombatantSavingThrow`), DC from `getSpellSaveDC(character)`, half damage on save, full damage on fail
   - **If `spell.autoHit`**: auto-hit, roll damage directly
8. Mark action/bonus action used

**Adding special cantrip effects** — add an `if (spell.id === 'your-spell')` block in the appropriate damage resolution branch:
- For attack cantrips: inside the hit block after damage is dealt (~line 4066)
- For save cantrips: inside the failed save block after damage is dealt (~line 4228)

Examples of existing special effects:
- `shocking-grasp`: sets `hasReacted = true` on target (can't take reactions)
- `ray-of-frost`: logs speed reduction (not mechanically enforced yet)
- `chill-touch`: logs no-healing effect (not mechanically enforced yet)
- `toll-the-dead`: swaps d8→d12 dice when target is below max HP
- `mind-sliver`: logs save penalty (not mechanically enforced yet)

**Adding reaction spell handling** — The reaction spell flow is separate from `castSpell()`:
1. When an attack hits a character, `combatStore.ts` (~line 2972) checks for reaction options (Shield spell, Parry maneuver)
2. If the character has Shield prepared, it's added to `pendingReaction.availableReactions`
3. The UI shows a reaction prompt; player chooses to cast or skip
4. Resolution is in `resolveReaction()` (~line 977) — handles AC bonus check and damage application

### Step 5: Helper Functions (`src/engine/combat.ts`)

Three key helper functions for spell mechanics:

```typescript
// Cantrip scaling: returns scaled dice based on character level
getScaledCantripDice(spell: Spell, casterLevel: number): string
// e.g., Fire Bolt at level 5 → '2d10' (from scaling: { 5: '2d10', ... })

// Spell save DC: 8 + proficiency + spellcasting ability modifier
getSpellSaveDC(character: Character): number

// Spell attack bonus: proficiency + spellcasting ability modifier
getSpellAttackBonus(character: Character): number
```

Both `getSpellSaveDC` and `getSpellAttackBonus` read the spellcasting ability from `character.class.spellcasting.ability`.

### Step 6: Verify

1. `npx tsc -b --noEmit` — type check passes
2. `npx vitest run` — existing tests still pass
3. Manual: create a character of the spell's class, verify the spell appears in the spell selection during character creation
4. Manual: enter combat, verify the spell can be cast and resolves correctly (damage, saves, AoE targeting, etc.)

### Quick Reference: Spell Categories in `data/spells.ts`

| Category | Current Spells |
|---|---|
| **Attack cantrips** | Fire Bolt, Eldritch Blast, Ray of Frost, Shocking Grasp, Chill Touch, Booming Blade, Green-Flame Blade |
| **Save cantrips** | Sacred Flame, Toll the Dead, Mind Sliver |
| **AoE save cantrips** | Acid Splash, Poison Spray, Thunderclap, Word of Radiance, Sword Burst |
| **Multi-projectile** | Magic Missile (auto-hit), Scorching Ray (attack roll), Eldritch Blast (via scaling) |
| **AoE save (leveled)** | Burning Hands, Thunder Wave, Shatter, Fireball, Lightning Bolt, Cone of Cold |
| **Attack (leveled)** | Guiding Bolt, Chromatic Orb, Witch Bolt, Inflict Wounds |
| **Save (leveled)** | Bane, Command, Dissonant Whispers, Blindness/Deafness, Hold Person/Monster |
| **Reaction** | Shield (ac_bonus on_hit), Counterspell (negate_spell) |
| **Healing** | Cure Wounds, Healing Word, Mass Healing Word, Mass Cure Wounds |
| **Buff/utility** | Blade Ward, Bless, Mage Armor, Spiritual Weapon, Spirit Guardians |

### Key Helper Functions in `data/spells.ts`

| Function | Purpose |
|---|---|
| `getSpellById(id)` | Look up spell by kebab-case ID |
| `getAllSpells()` | Return all spells |
| `getSpellsByLevel(level)` | Filter by spell level (0 = cantrips) |
| `getSpellsByClass(className)` | All spells for a class |
| `getSpellsForClassAtLevel(className, maxLevel)` | Spells available to a class up to a max spell level (used by SpellSelector) |
| `getCantrips()` | Shortcut for `getSpellsByLevel(0)` |
| `getSpellsBySchool(school)` | Filter by school |

## SOP: Adding Class/Subclass Abilities

This is the full procedure for adding a new class or subclass ability. Not every ability needs every step — passive stat bonuses are simpler than abilities that modify turn flow or attack resolution. Use judgment about which steps apply.

### Step 1: Define the Feature Type (`src/types/classFeature.ts`)

**Every mechanical feature needs its own type.** Only use `GenericClassFeature` for flavor-only text with zero mechanical effect.

1. Add the interface extending `ClassFeatureBase`:
```typescript
export interface MyNewFeature extends ClassFeatureBase {
  type: 'my_new_feature'
  // Add any feature-specific fields (scaling tables, resource counts, etc.)
}
```

2. Add to the `ClassFeature` union type:
```typescript
export type ClassFeature =
  | ...existing types...
  | MyNewFeature
```

3. Add type guard function:
```typescript
export function isMyNewFeature(f: ClassFeature): f is MyNewFeature {
  return f.type === 'my_new_feature'
}
```

**Patterns for feature-specific fields:**
- Level scaling: `somethingAtLevels?: Record<number, number>` (e.g., `{3: 4, 7: 5, 15: 6}`)
- Limited use: set `maxUses` from `ClassFeatureBase`, add `maxUsesAtLevels` for scaling
- Dice: store as string like `'1d10'`, scaling via `diceScaling: Record<number, string>`
- No extra fields needed for simple detection-only features (Remarkable Athlete, Heroic Warrior, Survivor)

### Step 2: Add Feature Data (`src/data/classes.ts`)

Add the feature to the correct class or subclass `features` array. Features must include:
- `id`: Unique kebab-case string (e.g., `'improved-critical'`)
- `name`: Display name
- `description`: PHB text for the tooltip/display
- `level`: The class/subclass level at which this unlocks
- `type`: Must match the discriminated union type string
- `trigger`: One of `'passive'`, `'bonus_action'`, `'action'`, `'reaction'`, `'on_attack_roll'`, `'on_damage_roll'`

**Subclass features** go in `subclasses[n].features[]`, NOT in the parent class's `features[]`.

**Multiple features at the same type:** If a subclass gets an upgraded version (e.g., Improved Critical → Superior Critical), add both as separate entries with different `id`, `level`, and values. The engine picks the best one (e.g., `Math.min(...criticalRanges)`).

### Step 3: Add Engine Logic (`src/engine/classAbilities.ts`)

Follow the established helper pattern:

```typescript
import { isMyNewFeature } from '@/types/classFeature'
import type { MyNewFeature } from '@/types/classFeature'

// 1. Feature getter
export function getMyNewFeature(combatant: Combatant): MyNewFeature | undefined {
  return getFeatureOfType(combatant, isMyNewFeature)
}

// 2. Boolean helper (for easy checks elsewhere)
export function hasMyNewFeature(combatant: Combatant): boolean {
  return getMyNewFeature(combatant) !== undefined
}

// 3. Any specific logic functions the feature needs
export function calculateMyNewFeatureBonus(combatant: Combatant): number {
  const feature = getMyNewFeature(combatant)
  if (!feature) return 0
  // ... feature logic
}
```

**Key function: `getCombatantClassFeatures(combatant)`** — This is the central feature access function. It has two code paths:
- **Multiclass-aware path** (when `character.classes[]` exists): iterates each class entry, includes both `entry.classData.features` AND `entry.subclass.features`, filtered by that class's individual level
- **Legacy fallback** (no `classes[]`): only checks `character.class.features` — does **NOT** check `character.subclass.features`

**For features that need the owning class's level** (not total character level), use `getClassLevelForFeature(character, featureId)` which searches through `character.classes[]` to find which class owns the feature.

**For Battle Master-style resource systems** with their own dice/maneuvers, consider a separate engine file (e.g., `engine/maneuvers.ts`) rather than bloating `classAbilities.ts`.

### Step 4: Wire Into Combat (`src/stores/combatStore.ts` and/or `src/engine/combat.ts`)

Determine **when** the feature triggers and wire it into the correct hook point:

| Trigger Timing | Where to Wire It |
|---|---|
| **Passive stat bonus** (AC, attack, damage) | `engine/combat.ts` → `resolveAttack()`, `getCombatantAC()`, `getAttackAdvantage()` |
| **Start of turn** | `combatStore.ts` → `nextTurn()`, in the combatant map chain between condition expiry and `set()` |
| **On attack roll** | `engine/combat.ts` → `resolveAttack()` |
| **On hit/damage** | `combatStore.ts` → `executeAttack()` or `resolvePlayerAttack()` |
| **Bonus action** | `combatStore.ts` → add to action bar logic, create handler function |
| **Reaction** | `combatStore.ts` → in opportunity attack or damage-received flow |
| **Death saves** | `engine/combat.ts` → `rollDeathSave()` |
| **Initiative** | `combatStore.ts` → `rollInitiative()` |
| **Resource tracking** | `combatStore.ts` → `initializeCombatant()` for setup, feature handler for consumption |

**Start-of-turn chain in `nextTurn()`:**
The current chain is: expire conditions → Heroic Warrior → Heroic Rally → `set()`. New start-of-turn features go as a new `.map()` step in this chain. Pattern:
```typescript
const combatantsAfterMyFeature = previousCombatants.map((c) => {
  if (c.id !== nextCombatantId) return c  // Only affect the active combatant
  if (!hasMyFeature(c)) return c           // Feature gate
  // ... apply effect
  get().addLogEntry({ type: 'other', actorId: c.id, actorName: c.name, message: `...` })
  return { ...c, /* modified fields */ }
})
```

**If the feature needs new Combatant state** (e.g., a boolean flag, remaining uses), add the field to the `Combatant` type in `src/types/index.ts` and initialize it in `initializeCombatant()` in `combatStore.ts`.

### Step 5: AI Integration (`src/engine/ai.ts`) — If Applicable

If the feature affects how monsters or AI-controlled characters should behave:
- Resource abilities (Second Wind, Action Surge): add decision logic in `executeAITurn()`
- Movement-affecting features: pass context through `getPositionTowardTarget()`
- Most passive features (crit range, fighting styles) don't need AI changes — they're auto-applied by the engine

### Step 6: Character Creation — If Applicable

If the feature requires **player choice** during character creation (e.g., selecting a fighting style, choosing maneuvers):

1. **`src/stores/characterStore.ts`**: Add field to `DraftClassEntry` or `CharacterDraft`, add to `resetDraft()` defaults
2. **`src/components/character/`**: Add UI for the selection in the appropriate creation step
3. **`src/lib/characterBuilder.ts`**: Map the draft selection to the final `Character` object in `buildCharacterFromDraft()`

Features that are purely passive and data-driven (Improved Critical, Survivor) need NO character creation changes — they come from the class data automatically.

### Step 7: Write Unit Tests

Test files go in `src/test/engine/`. Follow existing patterns:

**Test helper pattern** — Create a combatant with the feature using the `classes[]` array (multiclass-aware path), NOT the legacy path. This is critical because subclass features are only picked up by `getCombatantClassFeatures()` through the multiclass-aware path:

```typescript
function createMySubclassCombatant(level: number): Combatant {
  const subclassFeatures: ClassFeature[] = [/* features for this level */]
  const classData = { id: 'fighter', name: 'Fighter', features: [], /* ... */ }
  const subclassData = { id: 'my-subclass', features: subclassFeatures, /* ... */ }

  const character = {
    level,
    class: classData,
    subclass: subclassData,
    classes: [{            // <-- REQUIRED for subclass features to work
      classId: 'fighter',
      classData,
      subclass: subclassData,
      level,
    }],
    // ... other fields
  } as unknown as Character

  return { type: 'character', data: character, /* ... */ } as Combatant
}
```

**What to test:**
1. **Feature detection**: `hasX()` returns true/false at correct levels
2. **Feature detection**: returns false for wrong class/subclass and for monsters
3. **Mechanics**: output values are correct (bonus amounts, dice, DC calculations)
4. **Level scaling**: values change at the right level thresholds
5. **Edge cases**: nat 1, nat 20, zero remaining uses, dead combatants
6. **Level progression**: a single test that walks through all levels verifying feature availability

**Dice mocking**: Use `vi.spyOn(Math, 'random').mockReturnValue(x)` where `x = (desiredRoll - 1) / dieSides` for a specific result. Use `.mockImplementation()` with a counter for sequences.

### Step 8: Verify

1. `npx tsc -b --noEmit` — type check passes
2. `npx vitest run src/test/engine/yourtest.test.ts` — new tests pass
3. `npx vitest run` — all existing tests still pass
4. Manual: load a character with the feature in combat and verify it triggers correctly

### Quick Reference: Existing Feature Locations

| Feature | Type File | Engine | Data | Combat Hook |
|---|---|---|---|---|
| Second Wind | `classFeature.ts` | `classAbilities.ts` | `classes.ts` (Fighter) | `combatStore.ts` (bonus action) |
| Fighting Style | `classFeature.ts` | `classAbilities.ts` | `classes.ts` (Fighter) | `combat.ts` (passive) |
| Action Surge | `classFeature.ts` | `classAbilities.ts` | `classes.ts` (Fighter) | `combatStore.ts` (action) |
| Sneak Attack | `classFeature.ts` | `classAbilities.ts` | `classes.ts` (Rogue) | `combat.ts` (on hit) |
| Improved/Superior Critical | `classFeature.ts` | `classAbilities.ts` | `classes.ts` (Champion) | `combat.ts` (passive) |
| Remarkable Athlete | `classFeature.ts` | `classAbilities.ts` | `classes.ts` (Champion) | `combatStore.ts` (initiative) |
| Heroic Warrior | `classFeature.ts` | `classAbilities.ts` | `classes.ts` (Champion) | `combatStore.ts` (start of turn) |
| Survivor | `classFeature.ts` | `classAbilities.ts` | `classes.ts` (Champion) | `combat.ts` (death save) + `combatStore.ts` (start of turn) |
| Combat Superiority | `classFeature.ts` | `maneuvers.ts` | `classes.ts` (Battle Master) | `combatStore.ts` (multiple hooks) |
| Indomitable | `classFeature.ts` | `classAbilities.ts` | `classes.ts` (Fighter) | `combatStore.ts` (reaction to failed save) |

### Test Files

| Subclass | Test File | Coverage |
|---|---|---|
| Champion | `src/test/engine/champion.test.ts` | Improved/Superior Critical, Remarkable Athlete, Additional Fighting Style, Heroic Warrior, Survivor (Defy Death + death saves), level progression |
| Battle Master | `src/test/engine/maneuvers.test.ts` | Combat Superiority (dice/scaling), Relentless, save DC, all maneuver functions (Trip, Push, Menacing, Parry, Precision, Riposte, Sweeping, Evasive Footwork, Feinting, Lunging), integration |
| General Fighter | `src/test/engine/classAbilities.test.ts` | Fighting styles (Archery, Dueling, Defense), Sneak Attack, Extra Attack, Improved Critical |

## Important Files for Common Tasks

| Task | Key Files |
|------|-----------|
| Combat mechanics | `engine/combat.ts`, `engine/classAbilities.ts` |
| Character creation | `components/character/*`, `stores/characterStore.ts` |
| Combat UI | `components/combat/*`, `stores/combatStore.ts` |
| Game data | `data/classes.ts`, `data/races.ts`, `data/monsters.ts` |
| Type definitions | `types/index.ts`, `types/classFeature.ts`, `types/race.ts` |
| Pathfinding/movement | `lib/pathfinding.ts`, `lib/movement.ts` |
| AI behavior | `engine/ai.ts` |

## Path Aliases
`@/*` maps to `src/*` (configured in tsconfig.json and vite.config.ts)

## Assets Location
- Character portraits: `assets/player_classes/[class]/[class]_[race].png`
- Monster tokens: `assets/enemies/`
- Obstacles: `assets/obstacles/`
- Maps: `assets/maps/`
