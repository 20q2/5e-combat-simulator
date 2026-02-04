import { useState, useEffect, type ReactNode } from 'react'
import { cn, formatCR } from '@/lib/utils'
import { useCombatStore, getCurrentCombatant } from '@/stores/combatStore'
import { getCharacterTokenImage, getMonsterTokenImage } from '@/lib/tokenImages'
import { SpellSlotDisplay } from './SpellSlotDisplay'
import type { Character, Monster, Weapon, MonsterAction, Spell } from '@/types'
import { getMeleeRange } from '@/engine/combat'
import {
  Footprints,
  Sword,
  Sparkles,
  Wind,
  Shield,
  DoorOpen,
  SkipForward,
  AlertTriangle,
  Circle,
  Triangle,
  Square,
  Crosshair,
  Hand,
  Heart,
  Zap,
  Eye,
} from 'lucide-react'
import {
  getSecondWindFeature,
  canUseSecondWind,
  getSecondWindUses,
  getActionSurgeFeature,
  canUseActionSurge,
  getActionSurgeUses,
  hasCunningAction,
  canUseCunningAction,
  getMaxAttacksPerAction,
} from '@/engine/classAbilities'

// Parse spell range string to number (in feet)
// e.g., "120 feet" → 120, "Touch" → 5, "Self" → 0
function parseSpellRange(range: string): number {
  const lowerRange = range.toLowerCase()
  if (lowerRange === 'self' || lowerRange === 'self (cone)' || lowerRange.startsWith('self')) {
    return 0
  }
  if (lowerRange === 'touch') {
    return 5
  }
  // Extract number from strings like "120 feet", "60 ft", etc.
  const match = range.match(/(\d+)\s*(feet|ft|foot)?/i)
  if (match) {
    return parseInt(match[1], 10)
  }
  return 0
}

// Action type badge component
function ActionTypeBadge({ type }: { type: 'action' | 'bonus' | 'reaction' }) {
  if (type === 'action') {
    return (
      <span className="absolute -top-1 -left-1 w-4 h-4 flex items-center justify-center">
        <Circle className="w-3 h-3 fill-emerald-500 text-emerald-400" />
      </span>
    )
  }
  if (type === 'bonus') {
    return (
      <span className="absolute -top-1 -left-1 w-4 h-4 flex items-center justify-center">
        <Triangle className="w-3 h-3 fill-amber-500 text-amber-400" />
      </span>
    )
  }
  // reaction
  return (
    <span className="absolute -top-1 -left-1 w-4 h-4 flex items-center justify-center">
      <Square className="w-3 h-3 fill-violet-500 text-violet-400" />
    </span>
  )
}

// Action button component with icon-like styling
function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  variant = 'default',
  tooltip,
  badge,
  actionType,
}: {
  icon: ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  variant?: 'default' | 'attack' | 'spell' | 'movement' | 'end'
  tooltip?: string
  badge?: string | number
  actionType?: 'action' | 'bonus' | 'reaction'
}) {
  const variantStyles = {
    default: 'from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border-slate-600',
    attack: 'from-rose-900 to-rose-950 hover:from-rose-800 hover:to-rose-900 border-rose-700',
    spell: 'from-violet-900 to-violet-950 hover:from-violet-800 hover:to-violet-900 border-violet-700',
    movement: 'from-emerald-900 to-emerald-950 hover:from-emerald-800 hover:to-emerald-900 border-emerald-700',
    end: 'from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 border-amber-600',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip || label}
      className={cn(
        'relative flex flex-col items-center justify-center w-14 h-14 rounded-lg border-2 transition-all',
        'bg-gradient-to-b shadow-lg',
        variantStyles[variant],
        active && 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900',
        disabled && 'opacity-40 cursor-not-allowed grayscale',
        !disabled && 'hover:scale-105 hover:-translate-y-0.5 active:scale-95'
      )}
    >
      {actionType && <ActionTypeBadge type={actionType} />}
      <span className="text-slate-100">{icon}</span>
      <span className="text-[10px] text-slate-300 font-medium mt-0.5">{label}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-slate-900 text-xs font-bold rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  )
}

// Resource bar (HP, movement, etc.)
function ResourceBar({
  current,
  max,
  color,
  label,
  showText = true,
}: {
  current: number
  max: number
  color: 'red' | 'green' | 'blue' | 'amber'
  label: string
  showText?: boolean
}) {
  const percent = Math.max(0, Math.min(100, (current / max) * 100))
  const colorStyles = {
    red: 'bg-gradient-to-r from-rose-600 to-rose-500',
    green: 'bg-gradient-to-r from-emerald-600 to-emerald-500',
    blue: 'bg-gradient-to-r from-sky-600 to-sky-500',
    amber: 'bg-gradient-to-r from-amber-600 to-amber-500',
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{label}</span>
        {showText && <span>{current}/{max}</span>}
      </div>
      <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
        <div
          className={cn('h-full transition-all duration-300', colorStyles[color])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

// Movement slider showing 5ft segments
function MovementSlider({
  remaining,
  total,
}: {
  remaining: number
  total: number
}) {
  const segments = Math.floor(total / 5)
  const usedSegments = Math.floor((total - remaining) / 5)

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>Movement</span>
        <span>{remaining}/{total} ft</span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: segments }).map((_, i) => {
          const isUsed = i < usedSegments
          const isPartiallyUsed = i === usedSegments && (total - remaining) % 5 > 0

          return (
            <div
              key={i}
              className={cn(
                'h-3 flex-1 rounded-sm border transition-all',
                isUsed
                  ? 'bg-slate-700 border-slate-600'
                  : isPartiallyUsed
                    ? 'bg-gradient-to-r from-slate-700 to-sky-500 border-sky-600'
                    : 'bg-sky-500 border-sky-400 shadow-sm shadow-sky-500/30'
              )}
              title={`${(i + 1) * 5}ft`}
            />
          )
        })}
      </div>
    </div>
  )
}

// Target selector modal
function TargetSelector({
  targets,
  onSelect,
  onCancel,
  onHover,
  label = 'Select Target',
}: {
  targets: { id: string; name: string; hp: number; maxHp: number }[]
  onSelect: (targetId: string) => void
  onCancel: () => void
  onHover?: (targetId: string | undefined) => void
  label?: string
}) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 border-2 border-slate-700 rounded-lg shadow-2xl p-3 z-50">
      <div className="text-sm font-semibold text-slate-200 mb-2">{label}</div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {targets.map((target) => (
          <button
            key={target.id}
            onClick={() => onSelect(target.id)}
            onMouseEnter={() => onHover?.(target.id)}
            onMouseLeave={() => onHover?.(undefined)}
            className="w-full flex justify-between items-center p-2 rounded bg-slate-800 hover:bg-slate-700 transition-colors text-left"
          >
            <span className="text-sm text-slate-200">{target.name}</span>
            <span className="text-xs text-rose-400">{target.hp}/{target.maxHp}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onCancel}
        className="w-full mt-2 p-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

// Weapon option for the selector
interface WeaponOption {
  id: string
  name: string
  type: 'melee' | 'ranged' | 'unarmed'
  range: number
  damage: string
  weapon?: Weapon
}

// Weapon and target selector (two-column layout)
function WeaponTargetSelector({
  weapons,
  targets,
  currentPosition: _currentPosition,
  onAttack,
  onCancel,
  onHoverTarget,
  onWeaponSelect,
}: {
  weapons: WeaponOption[]
  targets: { id: string; name: string; hp: number; maxHp: number }[]
  currentPosition: { x: number; y: number }
  onAttack: (targetId: string, weapon?: Weapon) => void
  onCancel: () => void
  onHoverTarget?: (targetId: string | undefined) => void
  onWeaponSelect: (weapon: WeaponOption | undefined) => void
}) {
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponOption | undefined>(
    weapons.length > 0 ? weapons[0] : undefined
  )
  const { getValidTargets } = useCombatStore()
  const currentCombatant = getCurrentCombatant(useCombatStore.getState())

  // Update range highlight when weapon changes
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only trigger on weapon change, not callback change
  useEffect(() => {
    onWeaponSelect(selectedWeapon)
  }, [selectedWeapon])

  // Get valid targets for currently selected weapon
  const validTargetIds = new Set<string>()
  if (currentCombatant && selectedWeapon) {
    const validForWeapon = getValidTargets(
      currentCombatant.id,
      selectedWeapon.type === 'melee' || selectedWeapon.type === 'unarmed' ? selectedWeapon.weapon : undefined,
      undefined,
      selectedWeapon.type === 'ranged' ? selectedWeapon.weapon : undefined
    )
    validForWeapon.forEach(t => validTargetIds.add(t.id))
  }

  const filteredTargets = targets.filter(t => validTargetIds.has(t.id))

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border-2 border-rose-800 rounded-lg shadow-2xl p-3 z-50">
      <div className="text-sm font-semibold text-rose-300 mb-2 flex items-center gap-2">
        <Sword className="w-4 h-4" />
        Attack
      </div>
      <div className="flex gap-3">
        {/* Left column: Weapons */}
        <div className="w-40 border-r border-slate-700 pr-3">
          <div className="text-xs text-slate-400 mb-1.5">Weapon</div>
          <div className="space-y-1">
            {weapons.map((weapon) => (
              <button
                key={weapon.id}
                onClick={() => setSelectedWeapon(weapon)}
                className={cn(
                  'w-full flex items-center gap-2 p-2 rounded text-left transition-colors',
                  selectedWeapon?.id === weapon.id
                    ? 'bg-rose-900/60 border border-rose-600'
                    : 'bg-slate-800 hover:bg-slate-700 border border-transparent'
                )}
              >
                {weapon.type === 'melee' && <Sword className="w-4 h-4 text-slate-300" />}
                {weapon.type === 'ranged' && <Crosshair className="w-4 h-4 text-slate-300" />}
                {weapon.type === 'unarmed' && <Hand className="w-4 h-4 text-slate-300" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-200 truncate">{weapon.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {weapon.damage} • {weapon.range}ft
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right column: Targets */}
        <div className="w-44">
          <div className="text-xs text-slate-400 mb-1.5">
            Target {filteredTargets.length > 0 && `(${filteredTargets.length})`}
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filteredTargets.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-2">No targets in range</div>
            ) : (
              filteredTargets.map((target) => (
                <button
                  key={target.id}
                  onClick={() => onAttack(target.id, selectedWeapon?.weapon)}
                  onMouseEnter={() => onHoverTarget?.(target.id)}
                  onMouseLeave={() => onHoverTarget?.(undefined)}
                  className="w-full flex justify-between items-center p-2 rounded bg-slate-800 hover:bg-rose-900/50 transition-colors text-left"
                >
                  <span className="text-xs text-slate-200">{target.name}</span>
                  <span className="text-[10px] text-rose-400">{target.hp}/{target.maxHp}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onCancel}
        className="w-full mt-2 p-2 text-sm text-slate-400 hover:text-slate-200 transition-colors border-t border-slate-700 pt-2"
      >
        Cancel
      </button>
    </div>
  )
}

// Spell selector modal
function SpellSelector({
  spells,
  onSelect,
  onCancel,
}: {
  spells: Spell[]
  onSelect: (spell: Spell) => void
  onCancel: () => void
}) {
  const cantrips = spells.filter((s) => s.level === 0)
  const leveledSpells = spells.filter((s) => s.level > 0)

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-slate-900 border-2 border-violet-800 rounded-lg shadow-2xl p-3 z-50">
      <div className="text-sm font-semibold text-violet-300 mb-2">Select Spell</div>

      {cantrips.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-slate-400 mb-1">Cantrips</div>
          <div className="grid grid-cols-2 gap-1">
            {cantrips.map((spell) => (
              <button
                key={spell.id}
                onClick={() => onSelect(spell)}
                className="flex justify-between items-center p-2 rounded bg-slate-800 hover:bg-violet-900/50 transition-colors text-left"
              >
                <span className="text-xs text-slate-200 truncate">{spell.name}</span>
                <span className="text-[10px] text-violet-400 ml-1">{spell.damage?.dice || spell.range}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {leveledSpells.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 mb-1">Spells</div>
          <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
            {leveledSpells.map((spell) => (
              <button
                key={spell.id}
                onClick={() => onSelect(spell)}
                className="flex justify-between items-center p-2 rounded bg-slate-800 hover:bg-violet-900/50 transition-colors text-left"
              >
                <span className="text-xs text-slate-200 truncate">{spell.name}</span>
                <span className="text-[10px] text-amber-400 ml-1">Lv{spell.level}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onCancel}
        className="w-full mt-2 p-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

// Projectile target selector for multi-target spells (Magic Missile, etc.)
function ProjectileTargetSelector({
  targets,
  onHover,
}: {
  targets: { id: string; name: string; hp: number; maxHp: number }[]
  onHover?: (targetId: string | undefined) => void
}) {
  const {
    projectileTargeting,
    assignProjectile,
    unassignProjectile,
    confirmProjectileTargeting,
    cancelProjectileTargeting,
  } = useCombatStore()

  if (!projectileTargeting) return null

  const { spell, totalProjectiles, assignments } = projectileTargeting
  const totalAssigned = Object.values(assignments).reduce((sum, n) => sum + n, 0)
  const remaining = totalProjectiles - totalAssigned

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-slate-900 border-2 border-violet-800 rounded-lg shadow-2xl p-3 z-50">
      <div className="text-sm font-semibold text-violet-300 mb-1 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        {spell.name}
      </div>
      <div className="text-xs text-slate-400 mb-3">
        Assign {totalProjectiles} projectiles to targets ({remaining} remaining)
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
        {targets.map((target) => {
          const count = assignments[target.id] || 0
          return (
            <div
              key={target.id}
              className="flex items-center gap-2 p-2 rounded bg-slate-800"
              onMouseEnter={() => onHover?.(target.id)}
              onMouseLeave={() => onHover?.(undefined)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-200 truncate">{target.name}</div>
                <div className="text-[10px] text-rose-400">{target.hp}/{target.maxHp} HP</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => unassignProjectile(target.id)}
                  disabled={count === 0}
                  className={cn(
                    'w-6 h-6 rounded flex items-center justify-center text-sm font-bold transition-colors',
                    count > 0
                      ? 'bg-rose-900 hover:bg-rose-800 text-rose-200'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  )}
                >
                  -
                </button>
                <span className={cn(
                  'w-6 text-center text-sm font-bold',
                  count > 0 ? 'text-violet-300' : 'text-slate-500'
                )}>
                  {count}
                </span>
                <button
                  onClick={() => assignProjectile(target.id)}
                  disabled={remaining === 0}
                  className={cn(
                    'w-6 h-6 rounded flex items-center justify-center text-sm font-bold transition-colors',
                    remaining > 0
                      ? 'bg-violet-900 hover:bg-violet-800 text-violet-200'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  )}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={confirmProjectileTargeting}
          disabled={totalAssigned === 0}
          className={cn(
            'flex-1 p-2 rounded text-sm font-medium transition-colors',
            totalAssigned > 0
              ? 'bg-violet-700 hover:bg-violet-600 text-violet-100'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          )}
        >
          Cast ({totalAssigned} projectiles)
        </button>
        <button
          onClick={cancelProjectileTargeting}
          className="px-4 p-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// Death saves UI
function DeathSavesUI({
  combatant,
  onRoll,
  onEndTurn,
}: {
  combatant: ReturnType<typeof getCurrentCombatant>
  onRoll: () => void
  onEndTurn: () => void
}) {
  if (!combatant) return null

  const isDead = combatant.deathSaves.failures >= 3
  const isStabilized = combatant.isStable

  if (isDead) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-rose-400 font-bold">DEAD</span>
        <button
          onClick={onEndTurn}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
        >
          End Turn
        </button>
      </div>
    )
  }

  if (isStabilized) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-emerald-400 font-medium">Stabilized</span>
        <button
          onClick={onEndTurn}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
        >
          End Turn
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-6">
      {/* Success dots */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-emerald-400">Saves</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'w-4 h-4 rounded-full border-2',
                i < combatant.deathSaves.successes
                  ? 'bg-emerald-500 border-emerald-400'
                  : 'border-slate-600'
              )}
            />
          ))}
        </div>
      </div>

      {/* Failure dots */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-rose-400">Fails</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'w-4 h-4 rounded-full border-2',
                i < combatant.deathSaves.failures
                  ? 'bg-rose-500 border-rose-400'
                  : 'border-slate-600'
              )}
            />
          ))}
        </div>
      </div>

      <button
        onClick={onRoll}
        className="px-4 py-2 bg-rose-900 hover:bg-rose-800 border border-rose-700 rounded text-sm font-medium transition-colors"
      >
        Roll Death Save
      </button>

      <button
        onClick={onEndTurn}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
      >
        End Turn
      </button>
    </div>
  )
}

export function ActionBar() {
  const state = useCombatStore()
  const {
    phase,
    selectedAction,
    setSelectedAction,
    setHoveredTarget,
    setRangeHighlight,
    setAoEPreview,
    selectedSpell,
    setSelectedSpell,
    endTurn,
    startCombat,
    combatants,
    performAttack,
    useDash,
    useDodge,
    useDisengage,
    getValidTargets,
    getAvailableSpells,
    castSpell,
    makeDeathSave,
    isAITurn,
    executeAITurn,
    currentTurnIndex,
    getThreateningEnemies,
    useSecondWind,
    useActionSurge,
    useCunningDash,
    useCunningDisengage,
    useCunningHide,
    projectileTargeting,
    startProjectileTargeting,
    cancelProjectileTargeting,
  } = state

  const [isSelectingTarget, setIsSelectingTarget] = useState(false)
  const [isSelectingSpell, setIsSelectingSpell] = useState(false)
  const [isSelectingWeapon, setIsSelectingWeapon] = useState(false)
  const [isExecutingAI, setIsExecutingAI] = useState(false)

  const currentCombatant = getCurrentCombatant(state)

  // Clean up local state when selectedAction changes externally (e.g., from drag in CombatGrid)
  useEffect(() => {
    if (selectedAction !== 'attack') {
      setIsSelectingWeapon(false)
      setIsSelectingTarget(false)
      setRangeHighlight(undefined)
    }
    if (selectedAction !== 'spell') {
      setIsSelectingSpell(false)
      setAoEPreview(undefined)
      setSelectedSpell(undefined)
    }
  }, [selectedAction, setRangeHighlight])

  // Auto-execute AI turns
  useEffect(() => {
    if (phase !== 'combat') return
    if (isExecutingAI) return
    if (!isAITurn()) return

    const timeoutId = setTimeout(() => {
      setIsExecutingAI(true)
      executeAITurn().finally(() => {
        setIsExecutingAI(false)
      })
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [phase, currentTurnIndex, isAITurn, executeAITurn, isExecutingAI])

  // Setup phase UI
  if (phase === 'setup') {
    const hasEnoughCombatants = combatants.length >= 2
    const allPlaced = combatants.every((c) => c.position.x >= 0 && c.position.y >= 0)

    return (
      <div className="bg-gradient-to-t from-slate-950 via-slate-900 to-slate-800 border-t-2 border-slate-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
          <div className="text-sm text-slate-400">
            {!hasEnoughCombatants
              ? 'Add at least 2 combatants to start'
              : !allPlaced
                ? 'Place all combatants on the grid'
                : 'Ready to begin combat!'}
          </div>
          <button
            onClick={startCombat}
            disabled={!hasEnoughCombatants || !allPlaced}
            className={cn(
              'px-6 py-3 rounded-lg font-semibold text-sm transition-all',
              'bg-gradient-to-b from-amber-600 to-amber-700 border-2 border-amber-500',
              'hover:from-amber-500 hover:to-amber-600',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale'
            )}
          >
            Start Combat
          </button>
        </div>
      </div>
    )
  }

  if (!currentCombatant) return null

  // Get combatant data
  const isCharacter = currentCombatant.type === 'character'
  const character = isCharacter ? currentCombatant.data as Character : null
  const monster = !isCharacter ? currentCombatant.data as Monster : null

  // Get token image
  const tokenImage = isCharacter
    ? getCharacterTokenImage(character!)
    : getMonsterTokenImage(monster!)

  // Get speed and movement
  const speed = character?.speed ?? monster?.speed.walk ?? 30
  const remainingMovement = speed - currentCombatant.movementUsed

  // Check if unconscious
  const isUnconscious = currentCombatant.currentHp <= 0

  // Get weapon/action info
  let weaponName = 'Unarmed Strike'
  let meleeWeapon: Weapon | undefined
  let rangedWeapon: Weapon | undefined
  let monsterActions: MonsterAction[] = []

  if (isCharacter && character) {
    meleeWeapon = character.equipment?.meleeWeapon
    rangedWeapon = character.equipment?.rangedWeapon
    // Display name: prefer melee, fall back to ranged, or "Unarmed Strike"
    if (meleeWeapon && rangedWeapon) {
      weaponName = `${meleeWeapon.name} / ${rangedWeapon.name}`
    } else if (meleeWeapon) {
      weaponName = meleeWeapon.name
    } else if (rangedWeapon) {
      weaponName = rangedWeapon.name
    }
  } else if (monster) {
    monsterActions = monster.actions.filter((a) => a.attackBonus !== undefined)
    weaponName = monsterActions[0]?.name ?? 'Attack'
  }

  // Get valid targets and spells
  const validTargets = getValidTargets(currentCombatant.id, meleeWeapon, monsterActions[0], rangedWeapon)
  const availableSpells = getAvailableSpells(currentCombatant.id)
  const hasSpells = availableSpells.length > 0
  const spellTargets = combatants.filter((c) => c.id !== currentCombatant.id && c.currentHp > 0)

  // Check for threatening enemies
  const threateningEnemies = getThreateningEnemies(currentCombatant.id)
  const isThreatened = threateningEnemies.length > 0

  // Check for Second Wind (Fighter class feature)
  const secondWindFeature = isCharacter ? getSecondWindFeature(currentCombatant) : undefined
  const hasSecondWind = !!secondWindFeature
  const canUseSecondWindNow = hasSecondWind && canUseSecondWind(currentCombatant, currentCombatant.classFeatureUses)
  const secondWindUses = hasSecondWind ? getSecondWindUses(currentCombatant, currentCombatant.classFeatureUses) : 0

  // Check for Action Surge (Fighter class feature, level 2+)
  const actionSurgeFeature = isCharacter ? getActionSurgeFeature(currentCombatant) : undefined
  const hasActionSurge = !!actionSurgeFeature
  const canUseActionSurgeNow = hasActionSurge && currentCombatant.hasActed && canUseActionSurge(currentCombatant, currentCombatant.classFeatureUses)
  const actionSurgeUses = hasActionSurge ? getActionSurgeUses(currentCombatant, currentCombatant.classFeatureUses) : 0

  // Check for Cunning Action (Rogue class feature, level 2+)
  const hasCunningActionFeature = isCharacter && hasCunningAction(currentCombatant)
  const canCunningDash = hasCunningActionFeature && canUseCunningAction(currentCombatant, 'dash')
  const canCunningDisengage = hasCunningActionFeature && canUseCunningAction(currentCombatant, 'disengage')
  const canCunningHide = hasCunningActionFeature && canUseCunningAction(currentCombatant, 'hide')

  // Calculate Extra Attack info
  const maxAttacks = getMaxAttacksPerAction(currentCombatant)
  const attacksRemaining = maxAttacks - currentCombatant.attacksMadeThisTurn
  const hasExtraAttack = maxAttacks > 1
  // Can attack if: have attacks remaining, have targets, and either haven't acted or mid-Attack action
  const canAttack = attacksRemaining > 0 && validTargets.length > 0 && (!currentCombatant.hasActed || currentCombatant.attacksMadeThisTurn > 0)

  // Build weapons array for character attack selector
  const availableWeapons: WeaponOption[] = []
  if (isCharacter && character) {
    if (meleeWeapon) {
      availableWeapons.push({
        id: 'melee',
        name: meleeWeapon.name,
        type: 'melee',
        range: getMeleeRange(meleeWeapon),
        damage: meleeWeapon.damage,
        weapon: meleeWeapon,
      })
    }
    if (rangedWeapon) {
      availableWeapons.push({
        id: 'ranged',
        name: rangedWeapon.name,
        type: 'ranged',
        range: rangedWeapon.range?.normal ?? 30,
        damage: rangedWeapon.damage,
        weapon: rangedWeapon,
      })
    }
    // Always add unarmed strike option
    availableWeapons.push({
      id: 'unarmed',
      name: 'Unarmed Strike',
      type: 'unarmed',
      range: 5,
      damage: '1+STR',
      weapon: undefined,
    })
  }

  // Action handlers
  const handleAttackClick = () => {
    if (selectedAction === 'attack') {
      setSelectedAction(undefined)
      setIsSelectingTarget(false)
      setIsSelectingWeapon(false)
      setRangeHighlight(undefined)
    } else {
      setSelectedAction('attack')
      if (isCharacter) {
        setIsSelectingWeapon(true)
        // Set initial range highlight for first weapon
        if (availableWeapons.length > 0) {
          const firstWeapon = availableWeapons[0]
          setRangeHighlight({
            origin: currentCombatant.position,
            range: firstWeapon.range,
            type: firstWeapon.type === 'ranged' ? 'ranged' : 'melee',
          })
        }
      } else {
        setIsSelectingTarget(true)
      }
    }
  }

  const handleWeaponSelect = (weapon: WeaponOption | undefined) => {
    if (weapon && currentCombatant) {
      setRangeHighlight({
        origin: currentCombatant.position,
        range: weapon.range,
        type: weapon.type === 'ranged' ? 'ranged' : 'melee',
      })
    } else {
      setRangeHighlight(undefined)
    }
  }

  const handleAttackWithWeapon = (targetId: string, weapon?: Weapon) => {
    setHoveredTarget(undefined)
    setRangeHighlight(undefined)
    // Determine which weapon slot to use
    const isMelee = weapon?.type === 'melee'
    const isRanged = weapon?.type === 'ranged'
    performAttack(
      currentCombatant.id,
      targetId,
      isMelee ? weapon : undefined,
      monsterActions[0],
      isRanged ? weapon : undefined
    )
    setIsSelectingWeapon(false)
    setIsSelectingTarget(false)
    setSelectedAction(undefined)
  }

  const handleTargetSelect = (targetId: string) => {
    setHoveredTarget(undefined)
    setRangeHighlight(undefined)
    setAoEPreview(undefined)
    if (selectedSpell) {
      castSpell(currentCombatant.id, selectedSpell, targetId)
      setSelectedSpell(undefined)
    } else {
      performAttack(currentCombatant.id, targetId, meleeWeapon, monsterActions[0], rangedWeapon)
    }
    setIsSelectingTarget(false)
    setSelectedAction(undefined)
  }

  const handleCancelTarget = () => {
    setHoveredTarget(undefined)
    setRangeHighlight(undefined)
    setAoEPreview(undefined)
    setSelectedAction(undefined)
    setIsSelectingTarget(false)
    setIsSelectingWeapon(false)
    cancelProjectileTargeting()
    setSelectedSpell(undefined)
    setIsSelectingSpell(false)
  }

  const handleSpellClick = () => {
    if (selectedAction === 'spell') {
      setSelectedAction(undefined)
      setIsSelectingSpell(false)
      setSelectedSpell(undefined)
    } else {
      setSelectedAction('spell')
      setIsSelectingSpell(true)
    }
  }

  const handleSpellSelect = (spell: Spell) => {
    setSelectedSpell(spell)
    setIsSelectingSpell(false)

    if (spell.damage || spell.attackType || spell.savingThrow) {
      // Set range highlight for the spell
      if (currentCombatant) {
        const spellRange = parseSpellRange(spell.range)
        if (spellRange > 0) {
          setRangeHighlight({
            origin: currentCombatant.position,
            range: spellRange,
            type: 'spell',
          })
        }

        // Set AoE preview if spell has area of effect
        if (spell.areaOfEffect) {
          setAoEPreview({
            type: spell.areaOfEffect.type,
            size: spell.areaOfEffect.size,
            origin: currentCombatant.position,
          })
        } else {
          setAoEPreview(undefined)
        }
      }

      // Check if this is a multi-projectile spell
      if (spell.projectiles) {
        startProjectileTargeting(spell)
      } else {
        setIsSelectingTarget(true)
      }
    } else {
      castSpell(currentCombatant.id, spell)
      setSelectedSpell(undefined)
      setSelectedAction(undefined)
    }
  }

  const handleMoveClick = () => {
    if (selectedAction === 'move') {
      setSelectedAction(undefined)
    } else {
      setSelectedAction('move')
      // Auto-select the current combatant when entering move mode
      if (currentCombatant) {
        state.selectCombatant(currentCombatant.id)
      }
    }
  }

  // Calculate HP color
  const hpPercent = (currentCombatant.currentHp / currentCombatant.maxHp) * 100
  const hpColor: 'green' | 'amber' | 'red' = hpPercent > 50 ? 'green' : hpPercent > 25 ? 'amber' : 'red'

  return (
    <div className="bg-gradient-to-t from-slate-950 via-slate-900 to-slate-800 border-t-2 border-slate-700">

      <div className="max-w-5xl mx-auto p-3">
        {/* Unconscious/Death saves UI */}
        {isUnconscious && isCharacter ? (
          <div className="flex items-center justify-center">
            <DeathSavesUI
              combatant={currentCombatant}
              onRoll={() => makeDeathSave(currentCombatant.id)}
              onEndTurn={endTurn}
            />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* Character Portrait Section */}
            <div className="flex items-center gap-3 pr-4 border-r border-slate-700">
              {/* Portrait */}
              <div className="relative">
                <div className={cn(
                  'w-16 h-16 rounded-full overflow-hidden border-3 shadow-lg',
                  isCharacter ? 'border-violet-500' : 'border-rose-500'
                )}>
                  {tokenImage ? (
                    <img src={tokenImage} alt={currentCombatant.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={cn(
                      'w-full h-full flex items-center justify-center text-xl font-bold',
                      isCharacter ? 'bg-violet-900' : 'bg-rose-900'
                    )}>
                      {currentCombatant.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Level/CR badge */}
                <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[10px] font-bold">
                  {isCharacter ? `Lv${character?.level}` : `CR${formatCR(monster?.challengeRating ?? 0)}`}
                </div>
              </div>

              {/* Name and resources */}
              <div className="w-32">
                <div className="text-sm font-semibold text-slate-200 truncate">{currentCombatant.name}</div>
                <div className="text-[10px] text-slate-400 mb-1">
                  {isCharacter ? `${character?.race.name} ${character?.class.name}` : monster?.type}
                </div>
                <ResourceBar
                  current={currentCombatant.currentHp}
                  max={currentCombatant.maxHp}
                  color={hpColor}
                  label="HP"
                />
                <div className="mt-1">
                  <MovementSlider
                    remaining={remainingMovement}
                    total={speed}
                  />
                </div>
              </div>
            </div>

            {/* Action Economy Indicators */}
            <div className="flex flex-col gap-1 px-3 border-r border-slate-700">
              {/* Action - Green Circle */}
              <div className="flex items-center gap-1.5">
                <Circle className={cn(
                  'w-3.5 h-3.5',
                  currentCombatant.hasActed
                    ? 'fill-slate-600 text-slate-500'
                    : 'fill-emerald-500 text-emerald-400'
                )} />
                <span className={cn('text-[10px]', currentCombatant.hasActed ? 'text-slate-500' : 'text-emerald-400')}>
                  Action
                </span>
              </div>
              {/* Bonus Action - Yellow Triangle */}
              <div className="flex items-center gap-1.5">
                <Triangle className={cn(
                  'w-3.5 h-3.5',
                  currentCombatant.hasBonusActed
                    ? 'fill-slate-600 text-slate-500'
                    : 'fill-amber-500 text-amber-400'
                )} />
                <span className={cn('text-[10px]', currentCombatant.hasBonusActed ? 'text-slate-500' : 'text-amber-400')}>
                  Bonus
                </span>
              </div>
              {/* Reaction - Purple Square */}
              <div className="flex items-center gap-1.5">
                <Square className={cn(
                  'w-3.5 h-3.5',
                  currentCombatant.hasReacted
                    ? 'fill-slate-600 text-slate-500'
                    : 'fill-violet-500 text-violet-400'
                )} />
                <span className={cn('text-[10px]', currentCombatant.hasReacted ? 'text-slate-500' : 'text-violet-400')}>
                  Reaction
                </span>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="relative flex-1 flex items-center justify-center gap-2">
              {/* Spell Slots Display (BG3-style) - floats on top edge of bar */}
              {isCharacter && character?.spellSlots && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <SpellSlotDisplay spellSlots={character.spellSlots} compact />
                </div>
              )}

              {/* Action Buttons */}
              {/* Spell selector popup */}
              {isSelectingSpell && selectedAction === 'spell' && (
                <SpellSelector
                  spells={availableSpells}
                  onSelect={handleSpellSelect}
                  onCancel={handleCancelTarget}
                />
              )}

              {/* Weapon/Target selector popup for character attacks */}
              {isSelectingWeapon && selectedAction === 'attack' && isCharacter && (
                <WeaponTargetSelector
                  weapons={availableWeapons}
                  targets={validTargets.map((t) => ({
                    id: t.id,
                    name: t.name,
                    hp: t.currentHp,
                    maxHp: t.maxHp,
                  }))}
                  currentPosition={currentCombatant.position}
                  onAttack={handleAttackWithWeapon}
                  onCancel={handleCancelTarget}
                  onHoverTarget={setHoveredTarget}
                  onWeaponSelect={handleWeaponSelect}
                />
              )}

              {/* Target selector popup for monster attacks and spells */}
              {isSelectingTarget && !isSelectingSpell && !isSelectingWeapon && !projectileTargeting && (
                <TargetSelector
                  targets={(selectedSpell ? spellTargets : validTargets).map((t) => ({
                    id: t.id,
                    name: t.name,
                    hp: t.currentHp,
                    maxHp: t.maxHp,
                  }))}
                  onSelect={handleTargetSelect}
                  onCancel={handleCancelTarget}
                  onHover={setHoveredTarget}
                  label={selectedSpell ? `Target for ${selectedSpell.name}` : 'Select Target'}
                />
              )}

              {/* Projectile target selector for multi-projectile spells */}
              {projectileTargeting && (
                <ProjectileTargetSelector
                  targets={spellTargets.map((t) => ({
                    id: t.id,
                    name: t.name,
                    hp: t.currentHp,
                    maxHp: t.maxHp,
                  }))}
                  onHover={setHoveredTarget}
                />
              )}

              {/* Action buttons */}
              <ActionButton
                icon={<Footprints className="w-5 h-5" />}
                label="Move"
                onClick={handleMoveClick}
                active={selectedAction === 'move'}
                disabled={remainingMovement === 0}
                variant="movement"
                tooltip={`Move (${remainingMovement}ft remaining)`}
              />

              <ActionButton
                icon={<Sword className="w-5 h-5" />}
                label="Attack"
                onClick={handleAttackClick}
                active={selectedAction === 'attack'}
                disabled={!canAttack}
                variant="attack"
                tooltip={
                  validTargets.length === 0
                    ? 'No targets in range'
                    : hasExtraAttack
                      ? `Attack with ${weaponName} (${attacksRemaining}/${maxAttacks} attacks)`
                      : `Attack with ${weaponName}`
                }
                badge={hasExtraAttack && attacksRemaining > 0 ? attacksRemaining : undefined}
                actionType="action"
              />

              <ActionButton
                icon={<Sparkles className="w-5 h-5" />}
                label="Spell"
                onClick={handleSpellClick}
                active={selectedAction === 'spell'}
                disabled={currentCombatant.hasActed || !hasSpells}
                variant="spell"
                tooltip={!hasSpells ? 'No spells available' : `Cast a spell`}
                badge={hasSpells ? availableSpells.length : undefined}
                actionType="action"
              />

              <div className="w-px h-10 bg-slate-700" />

              <ActionButton
                icon={<Wind className="w-5 h-5" />}
                label="Dash"
                onClick={useDash}
                disabled={currentCombatant.hasActed}
                tooltip="Double your movement speed"
                actionType="action"
              />

              <ActionButton
                icon={<Shield className="w-5 h-5" />}
                label="Dodge"
                onClick={useDodge}
                disabled={currentCombatant.hasActed}
                tooltip="Attacks against you have disadvantage"
                actionType="action"
              />

              <ActionButton
                icon={<DoorOpen className="w-5 h-5" />}
                label="Disengage"
                onClick={useDisengage}
                disabled={currentCombatant.hasActed}
                variant={isThreatened ? 'movement' : 'default'}
                actionType="action"
                tooltip={isThreatened ? `Escape ${threateningEnemies.length} threatening enemies` : 'Move without opportunity attacks'}
              />

              {/* Second Wind (Fighter bonus action) */}
              {hasSecondWind && (() => {
                const isMissingHp = currentCombatant.currentHp < currentCombatant.maxHp
                const hpMissing = currentCombatant.maxHp - currentCombatant.currentHp
                return (
                  <>
                    <div className="w-px h-10 bg-slate-700" />
                    <ActionButton
                      icon={<Heart className="w-5 h-5" />}
                      label="2nd Wind"
                      onClick={() => useSecondWind(currentCombatant.id)}
                      disabled={!canUseSecondWindNow}
                      variant={isMissingHp ? 'attack' : 'default'}
                      tooltip={isMissingHp
                        ? `Heal 1d10+${character?.level ?? 1} HP (missing ${hpMissing} HP)`
                        : `Heal 1d10+${character?.level ?? 1} HP (at full health)`
                      }
                      badge={secondWindUses > 0 ? secondWindUses : undefined}
                      actionType="bonus"
                    />
                  </>
                )
              })()}

              {/* Action Surge (Fighter, level 2+) */}
              {hasActionSurge && (
                <ActionButton
                  icon={<Zap className="w-5 h-5" />}
                  label="Surge"
                  onClick={() => useActionSurge(currentCombatant.id)}
                  disabled={!canUseActionSurgeNow}
                  variant="attack"
                  tooltip={`Take an additional action this turn (${actionSurgeUses} use remaining)`}
                  badge={actionSurgeUses > 0 ? actionSurgeUses : undefined}
                />
              )}

              {/* Cunning Action (Rogue, level 2+) */}
              {hasCunningActionFeature && (
                <>
                  <div className="w-px h-10 bg-slate-700" />
                  <ActionButton
                    icon={<Wind className="w-5 h-5" />}
                    label="C. Dash"
                    onClick={useCunningDash}
                    disabled={!canCunningDash}
                    variant="movement"
                    tooltip="Bonus Action: Dash (double movement)"
                    actionType="bonus"
                  />
                  <ActionButton
                    icon={<DoorOpen className="w-5 h-5" />}
                    label="C. Disen."
                    onClick={useCunningDisengage}
                    disabled={!canCunningDisengage}
                    variant="movement"
                    tooltip="Bonus Action: Disengage (avoid opportunity attacks)"
                    actionType="bonus"
                  />
                  <ActionButton
                    icon={<Eye className="w-5 h-5" />}
                    label="C. Hide"
                    onClick={useCunningHide}
                    disabled={!canCunningHide}
                    tooltip="Bonus Action: Hide (gain advantage on next attack)"
                    actionType="bonus"
                  />
                </>
              )}

              {/* Threat warning */}
              {isThreatened && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-900/80 border border-amber-600 rounded text-xs text-amber-200 whitespace-nowrap flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Threatened by {threateningEnemies.length} {threateningEnemies.length === 1 ? 'enemy' : 'enemies'}
                </div>
              )}
            </div>

            {/* End Turn Section */}
            <div className="pl-4 border-l border-slate-700">
              {(() => {
                // Check if there are still potential actions available
                const hasUnusedAction = !currentCombatant.hasActed && (canAttack || hasSpells || remainingMovement > 0)
                const hasUnusedBonusAction = !currentCombatant.hasBonusActed && (
                  canUseSecondWindNow ||
                  canCunningDash ||
                  canCunningDisengage ||
                  canCunningHide
                )
                const hasActionsRemaining = hasUnusedAction || hasUnusedBonusAction

                return (
                  <button
                    onClick={endTurn}
                    className={cn(
                      'flex flex-col items-center justify-center w-20 h-16 rounded-lg transition-all',
                      hasActionsRemaining
                        ? 'bg-gradient-to-b from-slate-600 to-slate-700 border-2 border-slate-500 hover:from-slate-500 hover:to-slate-600 shadow-lg shadow-slate-900/50'
                        : 'bg-gradient-to-b from-amber-700 to-amber-800 border-2 border-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-900/50',
                      'hover:scale-105'
                    )}
                  >
                    <SkipForward className={cn('w-6 h-6', hasActionsRemaining ? 'text-slate-300' : 'text-amber-100')} />
                    <span className={cn('text-xs font-semibold', hasActionsRemaining ? 'text-slate-300' : 'text-amber-100')}>End Turn</span>
                  </button>
                )
              })()}

              {/* AI Notice */}
              {!isCharacter && (
                <div className="text-center mt-1">
                  {isExecutingAI ? (
                    <span className="text-[10px] text-amber-400 animate-pulse">AI thinking...</span>
                  ) : (
                    <span className="text-[10px] text-slate-500">AI controlled</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom decorative border */}
      <div className="h-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
    </div>
  )
}
