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

### Adding a New Class Feature
1. Add type to union in `src/types/classFeature.ts`
2. Add logic in `src/engine/classAbilities.ts`
3. Add feature to class definition in `src/data/classes.ts`
4. Add UI in combat components if needed

### Adding a New Racial Ability
1. Add type to union in `src/types/race.ts`
2. Add logic in `src/engine/racialAbilities.ts`
3. Add ability to race definition in `src/data/races.ts`

### Adding a New Monster
1. Add to `src/data/monsters.ts` with stat block and actions

### Adding a New Spell
1. Add to `src/data/spells.ts` with all spell properties

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
