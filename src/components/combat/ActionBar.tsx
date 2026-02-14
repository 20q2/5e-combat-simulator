import React, { useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn, formatCR } from '@/lib/utils'
import { useCombatStore, getCurrentCombatant } from '@/stores/combatStore'
import { getCharacterTokenImage, getMonsterTokenImage } from '@/lib/tokenImages'
import { SpellSlotDisplay } from './SpellSlotDisplay'
import { ResourceTracker } from './ResourceTracker'
import type { Character, Monster, Weapon, MonsterAction, Spell } from '@/types'
import { getMeleeRange } from '@/engine/combat'
import { canTargetWithRangedAttack } from '@/lib/lineOfSight'
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
  Trophy,
  Skull,
  Bug,
  X,
} from 'lucide-react'
import type { Condition } from '@/types'
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
import { hasCombatSuperiority, getSuperiorityDieSize } from '@/engine/maneuvers'
import { getManeuversByIds } from '@/data/maneuvers'
import {
  getAvailableAttackReplacements,
  canUseAttackReplacement,
} from '@/engine/attackReplacements'
import { canUseBattleMedic, getLuckPoints } from '@/engine/originFeats'
import type { AttackReplacement, AoEAttackReplacement } from '@/types'
import { Flame, Stethoscope, GripHorizontal } from 'lucide-react'

// Hook for making popover menus draggable by their header
function useDraggable() {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setOffset({
        x: e.clientX - startPos.current.x,
        y: e.clientY - startPos.current.y,
      })
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const onDragStart = (e: React.MouseEvent) => {
    dragging.current = true
    startPos.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
    e.preventDefault()
  }

  return {
    onDragStart,
    dragStyle: { transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)` } as React.CSSProperties,
  }
}

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
  tempHp = 0,
}: {
  current: number
  max: number
  color: 'red' | 'green' | 'blue' | 'amber'
  label: string
  showText?: boolean
  tempHp?: number
}) {
  const effectiveMax = Math.max(max, current + tempHp)
  const hpWidth = Math.max(0, Math.min(100, (current / effectiveMax) * 100))
  const tempWidth = tempHp > 0 ? (tempHp / effectiveMax) * 100 : 0
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
        {showText && (
          <span>
            {current}/{max}
            {tempHp > 0 && <span className="text-sky-400"> +{tempHp}</span>}
          </span>
        )}
      </div>
      <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700 flex">
        <div
          className={cn('h-full transition-all duration-300 shrink-0', colorStyles[color])}
          style={{ width: `${hpWidth}%` }}
        />
        {tempHp > 0 && (
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-300 shrink-0"
            style={{ width: `${tempWidth}%` }}
          />
        )}
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
  const { onDragStart, dragStyle } = useDraggable()
  return (
    <div className="absolute bottom-full left-1/2 mb-2 w-64 bg-slate-900/85 backdrop-blur-md border-2 border-slate-700 rounded-lg shadow-2xl p-3 z-50" style={dragStyle}>
      <div className="text-sm font-semibold text-slate-200 mb-2 cursor-grab active:cursor-grabbing select-none flex items-center justify-between" onMouseDown={onDragStart}>
        {label}
        <GripHorizontal className="w-4 h-4 text-slate-600" />
      </div>
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
  type: 'melee' | 'ranged' | 'unarmed' | 'breath_weapon'
  range: number
  longRange?: number
  damage: string
  weapon?: Weapon
  mastery?: string  // Mastery property if character has mastered the weapon
  hasMastery?: boolean  // Whether character has mastered this weapon
  selectedMastery?: string  // Tactical Master mastery override
  // Attack replacement fields (for breath weapon, etc.)
  attackReplacement?: AttackReplacement
  usesRemaining?: number | null
}

// Weapon and target selector (two-column layout)
function WeaponTargetSelector({
  weapons,
  initialWeaponId,
  targets,
  currentPosition: _currentPosition,
  onAttack,
  onCancel,
  onHoverTarget,
  onWeaponSelect,
  onBreathWeaponSelect,
}: {
  weapons: WeaponOption[]
  initialWeaponId?: string
  targets: { id: string; name: string; hp: number; maxHp: number }[]
  currentPosition: { x: number; y: number }
  onAttack: (targetId: string, weapon?: Weapon) => void
  onCancel: () => void
  onHoverTarget?: (targetId: string | undefined) => void
  onWeaponSelect: (weapon: WeaponOption | undefined) => void
  onBreathWeaponSelect?: (replacement: AttackReplacement) => void
}) {
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponOption | undefined>(
    weapons.find(w => w.id === initialWeaponId) ?? (weapons.length > 0 ? weapons[0] : undefined)
  )
  const { onDragStart, dragStyle } = useDraggable()
  const { getValidTargets } = useCombatStore()
  const currentCombatant = getCurrentCombatant(useCombatStore.getState())

  // Update range highlight when weapon changes
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only trigger on weapon change, not callback change
  useEffect(() => {
    onWeaponSelect(selectedWeapon)
  }, [selectedWeapon])

  // Get valid targets for currently selected weapon (not needed for breath weapons)
  const validTargetIds = new Set<string>()
  if (currentCombatant && selectedWeapon && selectedWeapon.type !== 'breath_weapon') {
    const validForWeapon = getValidTargets(
      currentCombatant.id,
      selectedWeapon.type === 'melee' || selectedWeapon.type === 'unarmed' ? selectedWeapon.weapon : undefined,
      undefined,
      selectedWeapon.type === 'ranged' ? selectedWeapon.weapon : undefined
    )
    validForWeapon.forEach(t => validTargetIds.add(t.id))
  }

  const filteredTargets = targets.filter(t => validTargetIds.has(t.id))
  const isBreathWeaponSelected = selectedWeapon?.type === 'breath_weapon'

  return (
    <div className="absolute bottom-full left-1/2 mb-2 bg-slate-900/85 backdrop-blur-md border-2 border-rose-800 rounded-lg shadow-2xl p-3 z-50" style={dragStyle}>
      <div className="text-sm font-semibold text-rose-300 mb-2 flex items-center gap-2 cursor-grab active:cursor-grabbing select-none" onMouseDown={onDragStart}>
        <Sword className="w-4 h-4" />
        Attack
        <GripHorizontal className="w-4 h-4 text-slate-600 ml-auto" />
      </div>
      <div className="flex gap-3">
        {/* Left column: Weapons */}
        <div className="w-44 border-r border-slate-700 pr-3">
          <div className="text-xs text-slate-400 mb-1.5">Weapon</div>
          <div className="space-y-1">
            {weapons.map((weapon) => (
              <button
                key={weapon.id}
                onClick={() => setSelectedWeapon(weapon)}
                className={cn(
                  'w-full flex items-center gap-2 p-2 rounded text-left transition-colors',
                  selectedWeapon?.id === weapon.id
                    ? weapon.type === 'breath_weapon'
                      ? 'bg-orange-900/60 border border-orange-600'
                      : 'bg-rose-900/60 border border-rose-600'
                    : 'bg-slate-800 hover:bg-slate-700 border border-transparent'
                )}
              >
                {weapon.type === 'melee' && <Sword className="w-4 h-4 text-slate-300" />}
                {weapon.type === 'ranged' && <Crosshair className="w-4 h-4 text-slate-300" />}
                {weapon.type === 'unarmed' && <Hand className="w-4 h-4 text-slate-300" />}
                {weapon.type === 'breath_weapon' && <Flame className="w-4 h-4 text-orange-400" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-200 truncate">{weapon.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {weapon.damage} • {weapon.type === 'breath_weapon' ? `${weapon.range}ft ${(weapon.attackReplacement as AoEAttackReplacement)?.aoeType}` : `${weapon.range}ft`}
                  </div>
                  {weapon.hasMastery && weapon.mastery && (
                    <div className="text-[10px] font-medium text-amber-400 uppercase">
                      {weapon.mastery}
                    </div>
                  )}
                  {weapon.type === 'breath_weapon' && weapon.usesRemaining !== null && (
                    <div className="text-[10px] font-medium text-orange-400">
                      {weapon.usesRemaining} use{weapon.usesRemaining !== 1 ? 's' : ''} left
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right column: Targets or AoE instruction */}
        <div className="w-44">
          {isBreathWeaponSelected ? (
            <>
              <div className="text-xs text-slate-400 mb-1.5">
                Aim on Grid
              </div>
              <div className="space-y-2 p-2">
                <p className="text-xs text-slate-300">
                  Click on the grid to aim your breath weapon in that direction.
                </p>
                <button
                  onClick={() => {
                    if (selectedWeapon?.attackReplacement && onBreathWeaponSelect) {
                      onBreathWeaponSelect(selectedWeapon.attackReplacement)
                    }
                  }}
                  className="w-full p-2 rounded bg-orange-700 hover:bg-orange-600 transition-colors text-center"
                >
                  <span className="text-xs text-white font-semibold">Select Direction on Grid</span>
                </button>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
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

// Helper to check spell casting time type
function getSpellActionType(spell: Spell): 'action' | 'bonus' | 'reaction' {
  const castingTime = spell.castingTime.toLowerCase()
  if (castingTime.includes('reaction')) return 'reaction'
  if (castingTime.includes('bonus')) return 'bonus'
  return 'action'
}

// Leveled spell button (shared between single-level and tabbed views)
function SpellButton({
  spell,
  canCast,
  hasFreeUse,
  actionType,
  disableReason,
  isUpcast,
  selectedSlotLevel,
  onSelect,
}: {
  spell: Spell
  canCast: boolean
  hasFreeUse: boolean
  actionType: 'action' | 'bonus' | 'reaction'
  disableReason?: string
  isUpcast: boolean
  selectedSlotLevel?: number
  onSelect: (spell: Spell) => void
}) {
  return (
    <button
      onClick={() => canCast && onSelect(spell)}
      disabled={!canCast}
      className={cn(
        "flex justify-between items-center p-2 rounded transition-colors text-left",
        canCast
          ? "bg-slate-800 hover:bg-violet-900/50"
          : "bg-slate-800/50 opacity-50 cursor-not-allowed"
      )}
      title={
        disableReason
          ? disableReason
          : hasFreeUse
          ? "Free cast (Magic Initiate)"
          : isUpcast
          ? `Upcast from level ${spell.level} to level ${selectedSlotLevel}`
          : `Uses level ${spell.level} slot`
      }
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {actionType === 'action' && <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-400 shrink-0" />}
        {actionType === 'bonus' && <Triangle className="w-2.5 h-2.5 fill-amber-500 text-amber-400 shrink-0" />}
        {actionType === 'reaction' && <Square className="w-2.5 h-2.5 fill-violet-500 text-violet-400 shrink-0" />}
        <span className="text-xs text-slate-200 truncate">{spell.name}</span>
      </div>
      <div className="flex items-center gap-1 ml-1 shrink-0">
        {hasFreeUse && (
          <span className="text-[10px] text-emerald-400 font-medium">FREE</span>
        )}
        {isUpcast && !hasFreeUse && actionType !== 'reaction' && (
          <span className="text-[10px] text-amber-400">↑</span>
        )}
        <span className={cn(
          "text-[10px]",
          actionType === 'reaction' ? "text-violet-400/70" : hasFreeUse ? "text-slate-500" : "text-violet-400"
        )}>
          Lv{spell.level}
        </span>
      </div>
    </button>
  )
}

// Spell selector modal
function SpellSelector({
  spells,
  onSelect,
  onCancel,
  spellSlots,
  magicInitiateFreeUses,
  selectedSlotLevel,
  hasActed,
  hasBonusActed,
}: {
  spells: Spell[]
  onSelect: (spell: Spell, castAtLevel?: number) => void
  onCancel: () => void
  spellSlots?: Character['spellSlots']
  magicInitiateFreeUses: Record<string, boolean>
  selectedSlotLevel?: number  // If set, only show spells that can be cast at this level
  hasActed: boolean
  hasBonusActed: boolean
}) {
  // Filter spells based on selected slot level
  const filteredSpells = selectedSlotLevel
    ? spells.filter((s) => s.level > 0 && s.level <= selectedSlotLevel)
    : spells

  const cantrips = selectedSlotLevel ? [] : spells.filter((s) => s.level === 0)
  const leveledSpells = filteredSpells.filter((s) => s.level > 0)

  // Group leveled spells by level for tabs
  const spellsByLevel = useMemo(() => {
    const groups: Record<number, Spell[]> = {}
    for (const spell of leveledSpells) {
      if (!groups[spell.level]) groups[spell.level] = []
      groups[spell.level].push(spell)
    }
    return groups
  }, [leveledSpells])
  const spellLevels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b)
  const [activeSpellLevel, setActiveSpellLevel] = useState<number>(() => {
    if (selectedSlotLevel) {
      // Default to the clicked slot level tab, or the highest available level below it
      if (spellLevels.includes(selectedSlotLevel)) return selectedSlotLevel
      const lower = spellLevels.filter(l => l <= selectedSlotLevel)
      if (lower.length > 0) return lower[lower.length - 1]
    }
    return spellLevels[0] ?? 1
  })

  // Reset active tab if current selection is no longer valid
  useEffect(() => {
    if (spellLevels.length > 0 && !spellLevels.includes(activeSpellLevel)) {
      setActiveSpellLevel(spellLevels[0])
    }
  }, [spellLevels, activeSpellLevel])

  // Check if a spell can be cast (has free use or spell slot, and action economy)
  const canCastSpell = (spell: Spell, atLevel?: number): { canCast: boolean; hasFreeUse: boolean; hasSlot: boolean; actionType: 'action' | 'bonus' | 'reaction'; disableReason?: string } => {
    const actionType = getSpellActionType(spell)

    // Reaction spells can't be cast proactively - show but disable
    if (actionType === 'reaction') {
      return { canCast: false, hasFreeUse: false, hasSlot: false, actionType, disableReason: 'Requires a trigger' }
    }

    // Check action economy
    if (actionType === 'bonus' && hasBonusActed) {
      return { canCast: false, hasFreeUse: false, hasSlot: false, actionType, disableReason: 'Bonus action already used' }
    }
    if (actionType === 'action' && hasActed) {
      return { canCast: false, hasFreeUse: false, hasSlot: false, actionType, disableReason: 'Action already used' }
    }

    // Cantrips don't need spell slots
    if (spell.level === 0) {
      return { canCast: true, hasFreeUse: false, hasSlot: false, actionType }
    }

    const hasFreeUse = magicInitiateFreeUses[spell.id] === true

    // If casting at a specific level (upcasting), check that slot level
    const checkLevel = atLevel ?? spell.level
    const slotLevel = checkLevel as keyof NonNullable<typeof spellSlots>
    const hasSlot = spellSlots?.[slotLevel]?.current ? spellSlots[slotLevel].current > 0 : false

    const canCast = hasFreeUse || hasSlot
    return {
      canCast,
      hasFreeUse,
      hasSlot,
      actionType,
      disableReason: canCast ? undefined : 'No spell slots available'
    }
  }

  const handleSpellSelect = (spell: Spell) => {
    // If we selected a specific slot level, cast at that level
    onSelect(spell, selectedSlotLevel)
  }

  const { onDragStart, dragStyle } = useDraggable()

  return (
    <div className="absolute bottom-full left-1/2 mb-2 w-80 bg-slate-900/85 backdrop-blur-md border-2 border-violet-800 rounded-lg shadow-2xl p-3 z-50" style={dragStyle}>
      <div className="text-sm font-semibold text-violet-300 mb-2 cursor-grab active:cursor-grabbing select-none flex items-center justify-between" onMouseDown={onDragStart}>
        {selectedSlotLevel ? `Cast with Level ${selectedSlotLevel} Slot` : 'Select Spell'}
        <GripHorizontal className="w-4 h-4 text-slate-600" />
      </div>

      {cantrips.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-slate-400 mb-1">Cantrips</div>
          <div className="grid grid-cols-2 gap-1">
            {cantrips.map((spell) => {
              const { canCast, actionType, disableReason } = canCastSpell(spell)
              return (
                <button
                  key={spell.id}
                  onClick={() => canCast && handleSpellSelect(spell)}
                  disabled={!canCast}
                  className={cn(
                    "flex justify-between items-center p-2 rounded transition-colors text-left",
                    canCast
                      ? "bg-slate-800 hover:bg-violet-900/50"
                      : "bg-slate-800/50 opacity-50 cursor-not-allowed"
                  )}
                  title={disableReason}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* Action type indicator */}
                    {actionType === 'action' && <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-400 shrink-0" />}
                    {actionType === 'bonus' && <Triangle className="w-2.5 h-2.5 fill-amber-500 text-amber-400 shrink-0" />}
                    {actionType === 'reaction' && <Square className="w-2.5 h-2.5 fill-violet-500 text-violet-400 shrink-0" />}
                    <span className="text-xs text-slate-200 truncate">{spell.name}</span>
                  </div>
                  <span className="text-[10px] text-violet-400 ml-1 shrink-0">{spell.damage?.dice || spell.range}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {leveledSpells.length > 0 && (
        <div>
          {/* Level tabs - only show if multiple levels exist */}
          {spellLevels.length > 1 ? (
            <>
              <div className="flex gap-1 mb-2">
                {spellLevels.map((level) => (
                  <button
                    key={level}
                    onClick={() => setActiveSpellLevel(level)}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                      activeSpellLevel === level
                        ? "bg-violet-700 text-violet-100"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
                    )}
                  >
                    {level === 1 ? '1st' : level === 2 ? '2nd' : level === 3 ? '3rd' : `${level}th`}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                {(spellsByLevel[activeSpellLevel] ?? []).map((spell) => {
                  const { canCast, hasFreeUse, actionType, disableReason } = canCastSpell(spell, selectedSlotLevel)
                  const isUpcast = selectedSlotLevel && spell.level < selectedSlotLevel
                  return (
                    <SpellButton
                      key={spell.id}
                      spell={spell}
                      canCast={canCast}
                      hasFreeUse={hasFreeUse}
                      actionType={actionType}
                      disableReason={disableReason}
                      isUpcast={!!isUpcast}
                      selectedSlotLevel={selectedSlotLevel}
                      onSelect={handleSpellSelect}
                    />
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-slate-400 mb-1">
                {selectedSlotLevel ? `Spells (level ${spellLevels[0]})` : `${spellLevels[0] === 1 ? '1st' : spellLevels[0] === 2 ? '2nd' : spellLevels[0] === 3 ? '3rd' : `${spellLevels[0]}th`} Level`}
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                {leveledSpells.map((spell) => {
                  const { canCast, hasFreeUse, actionType, disableReason } = canCastSpell(spell, selectedSlotLevel)
                  const isUpcast = selectedSlotLevel && spell.level < selectedSlotLevel
                  return (
                    <SpellButton
                      key={spell.id}
                      spell={spell}
                      canCast={canCast}
                      hasFreeUse={hasFreeUse}
                      actionType={actionType}
                      disableReason={disableReason}
                      isUpcast={!!isUpcast}
                      selectedSlotLevel={selectedSlotLevel}
                      onSelect={handleSpellSelect}
                    />
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {leveledSpells.length === 0 && cantrips.length === 0 && (
        <div className="text-xs text-slate-500 italic py-4 text-center">
          No spells available at this level
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
  const { onDragStart, dragStyle } = useDraggable()

  if (!projectileTargeting) return null

  const { spell, totalProjectiles, assignments } = projectileTargeting
  const totalAssigned = Object.values(assignments).reduce((sum, n) => sum + n, 0)
  const remaining = totalProjectiles - totalAssigned

  return (
    <div className="absolute bottom-full left-1/2 mb-2 w-80 bg-slate-900/85 backdrop-blur-md border-2 border-violet-800 rounded-lg shadow-2xl p-3 z-50" style={dragStyle}>
      <div className="text-sm font-semibold text-violet-300 mb-1 flex items-center gap-2 cursor-grab active:cursor-grabbing select-none" onMouseDown={onDragStart}>
        <Sparkles className="w-4 h-4" />
        {spell.name}
        <GripHorizontal className="w-4 h-4 text-slate-600 ml-auto" />
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

// Multi-target spell selector (Jump, Haste, etc.) — click allies to select/deselect
function MultiTargetSelector({
  targets,
  onHover,
}: {
  targets: { id: string; name: string; hp: number; maxHp: number }[]
  onHover?: (targetId: string | undefined) => void
}) {
  const {
    multiTargetSelection,
    toggleMultiTarget,
    confirmMultiTargetSelection,
    cancelMultiTargetSelection,
  } = useCombatStore()
  const { onDragStart, dragStyle } = useDraggable()

  if (!multiTargetSelection) return null

  const { spell, maxTargets, selectedTargetIds } = multiTargetSelection
  const selectedCount = selectedTargetIds.length

  return (
    <div className="absolute bottom-full left-1/2 mb-2 w-80 bg-slate-900/85 backdrop-blur-md border-2 border-emerald-800 rounded-lg shadow-2xl p-3 z-50" style={dragStyle}>
      <div className="text-sm font-semibold text-emerald-300 mb-1 flex items-center gap-2 cursor-grab active:cursor-grabbing select-none" onMouseDown={onDragStart}>
        <Sparkles className="w-4 h-4" />
        {spell.name}
        <GripHorizontal className="w-4 h-4 text-slate-600 ml-auto" />
      </div>
      <div className="text-xs text-slate-400 mb-3">
        Select up to {maxTargets} {maxTargets === 1 ? 'target' : 'targets'} ({selectedCount}/{maxTargets} selected)
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
        {targets.map((target) => {
          const isSelected = selectedTargetIds.includes(target.id)
          return (
            <button
              key={target.id}
              onClick={() => toggleMultiTarget(target.id)}
              onMouseEnter={() => onHover?.(target.id)}
              onMouseLeave={() => onHover?.(undefined)}
              className={cn(
                'flex items-center gap-2 p-2 rounded w-full text-left transition-colors',
                isSelected
                  ? 'bg-emerald-900/50 border border-emerald-600'
                  : selectedCount >= maxTargets
                    ? 'bg-slate-800/50 opacity-50 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 border border-transparent'
              )}
              disabled={!isSelected && selectedCount >= maxTargets}
            >
              <div className={cn(
                'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                isSelected ? 'border-emerald-400 bg-emerald-600' : 'border-slate-500'
              )}>
                {isSelected && <span className="text-white text-xs font-bold">{'\u2713'}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-200 truncate">{target.name}</div>
                <div className="text-[10px] text-emerald-400">{target.hp}/{target.maxHp} HP</div>
              </div>
            </button>
          )
        })}
        {targets.length === 0 && (
          <div className="text-xs text-slate-500 italic py-2 text-center">
            No valid targets in range
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={confirmMultiTargetSelection}
          disabled={selectedCount === 0}
          className={cn(
            'flex-1 p-2 rounded text-sm font-medium transition-colors',
            selectedCount > 0
              ? 'bg-emerald-700 hover:bg-emerald-600 text-emerald-100'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          )}
        >
          Cast on {selectedCount} {selectedCount === 1 ? 'target' : 'targets'}
        </button>
        <button
          onClick={cancelMultiTargetSelection}
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

// ============================================
// Debug Menu
// ============================================

const ALL_CONDITIONS: Condition[] = [
  'blinded', 'charmed', 'deafened', 'frightened', 'grappled',
  'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
  'prone', 'restrained', 'stunned', 'unconscious', 'exhaustion',
  'sapped', 'goaded', 'distracted', 'evasive'
]

function DebugMenu({
  combatants,
  onApplyCondition,
  onRemoveCondition,
  onClose,
}: {
  combatants: { id: string; name: string; conditions: { condition: Condition }[] }[]
  onApplyCondition: (combatantId: string, condition: Condition) => void
  onRemoveCondition: (combatantId: string, condition: Condition) => void
  onClose: () => void
}) {
  const [selectedCombatant, setSelectedCombatant] = useState<string | null>(null)
  const [selectedCondition, setSelectedCondition] = useState<Condition>('prone')

  const targetCombatant = combatants.find(c => c.id === selectedCombatant)
  const activeConditions = targetCombatant?.conditions.map(c => c.condition) ?? []

  return (
    <div className="absolute bottom-full right-0 mb-2 w-80 bg-slate-900/85 backdrop-blur-md border-2 border-orange-700 rounded-lg shadow-2xl p-3 z-50">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-orange-400 flex items-center gap-2">
          <Bug className="w-4 h-4" />
          Debug Menu
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Apply Condition Section */}
      <div className="space-y-3">
        <div className="text-xs text-slate-400 font-medium">Apply / Remove Condition</div>

        {/* Combatant Selector */}
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Target</label>
          <select
            value={selectedCombatant ?? ''}
            onChange={(e) => setSelectedCombatant(e.target.value || null)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200"
          >
            <option value="">Select combatant...</option>
            {combatants.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Condition Selector */}
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Condition</label>
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value as Condition)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200"
          >
            {ALL_CONDITIONS.map(cond => (
              <option key={cond} value={cond}>
                {cond.charAt(0).toUpperCase() + cond.slice(1)}
                {activeConditions.includes(cond) ? ' (active)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => selectedCombatant && onApplyCondition(selectedCombatant, selectedCondition)}
            disabled={!selectedCombatant || activeConditions.includes(selectedCondition)}
            className={cn(
              'flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors',
              selectedCombatant && !activeConditions.includes(selectedCondition)
                ? 'bg-orange-700 hover:bg-orange-600 text-orange-100'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            )}
          >
            Apply
          </button>
          <button
            onClick={() => selectedCombatant && onRemoveCondition(selectedCombatant, selectedCondition)}
            disabled={!selectedCombatant || !activeConditions.includes(selectedCondition)}
            className={cn(
              'flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors',
              selectedCombatant && activeConditions.includes(selectedCondition)
                ? 'bg-rose-700 hover:bg-rose-600 text-rose-100'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            )}
          >
            Remove
          </button>
        </div>

        {/* Show active conditions for selected combatant */}
        {targetCombatant && activeConditions.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-700">
            <div className="text-xs text-slate-500 mb-1">Active Conditions:</div>
            <div className="flex flex-wrap gap-1">
              {activeConditions.map(cond => (
                <span
                  key={cond}
                  className="text-xs px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-700/50"
                >
                  {cond}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
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
    useExpeditiousRetreatDash,
    projectileTargeting,
    startProjectileTargeting,
    cancelProjectileTargeting,
    multiTargetSelection,
    startMultiTargetSelection,
    cancelMultiTargetSelection,
    resetCombat,
    debugApplyCondition,
    debugRemoveCondition,
    setBreathWeaponTargeting,
    useBattleMedic,
    getBattleMedicTargets,
    useBonusActionManeuver,
    preselectedWeaponId,
    preselectedSpellId,
  } = state

  const navigate = useNavigate()

  const [isSelectingTarget, setIsSelectingTarget] = useState(false)
  const [isSelectingSpell, setIsSelectingSpell] = useState(false)
  const [isSelectingWeapon, setIsSelectingWeapon] = useState(false)
  const [isExecutingAI, setIsExecutingAI] = useState(false)
  const [selectedSlotLevel, setSelectedSlotLevel] = useState<number | undefined>(undefined)
  const [showDebugMenu, setShowDebugMenu] = useState(false)
  const [isSelectingBattleMedicTarget, setIsSelectingBattleMedicTarget] = useState(false)
  const [showBonusManeuvers, setShowBonusManeuvers] = useState(false)
  const [isSelectingFeintTarget, setIsSelectingFeintTarget] = useState(false)
  const [showDashPopover, setShowDashPopover] = useState(false)
  const lastSelectedWeaponIdRef = useRef<string | undefined>(undefined)

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
      setSelectedSlotLevel(undefined)
      if (multiTargetSelection) {
        cancelMultiTargetSelection()
      }
    }
    setShowDashPopover(false)
  }, [selectedAction, setRangeHighlight])

  // Auto-execute AI turns
  // Note: Only depend on phase and currentTurnIndex (the actual signals).
  // isAITurn/executeAITurn are stable store functions called inside the effect.
  // Including them or isExecutingAI in deps caused the timeout to be cancelled
  // on unrelated store updates before the AI could act.
  const isExecutingAIRef = useRef(isExecutingAI)
  isExecutingAIRef.current = isExecutingAI
  useEffect(() => {
    if (phase !== 'combat') return
    if (isExecutingAIRef.current) return
    if (!isAITurn()) return

    const timeoutId = setTimeout(() => {
      setIsExecutingAI(true)
      executeAITurn().finally(() => {
        setIsExecutingAI(false)
      })
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [phase, currentTurnIndex])

  // Handle spell preselection from CombatantPanel
  // (must be before early returns to maintain consistent hook order)
  useEffect(() => {
    if (!preselectedSpellId || !currentCombatant) return
    if (currentCombatant.type !== 'character') return

    // Clear the preselection from store
    useCombatStore.setState({ preselectedSpellId: undefined })

    // Find the spell in available spells
    const spells = getAvailableSpells(currentCombatant.id)
    const spell = spells.find(s => s.id === preselectedSpellId)
    if (!spell) return

    // Trigger the same flow as selecting from the spell menu (inlined)
    setSelectedSpell(spell)
    setIsSelectingSpell(false)
    setSelectedSlotLevel(undefined)

    if (spell.damage || spell.attackType || spell.savingThrow || spell.areaOfEffect) {
      const spellRange = parseSpellRange(spell.range)
      if (spellRange > 0) {
        setRangeHighlight({
          origin: currentCombatant.position,
          range: spellRange,
          type: 'spell',
        })
      }
      if (spell.areaOfEffect) {
        setAoEPreview({
          type: spell.areaOfEffect.type,
          size: spell.areaOfEffect.size,
          origin: currentCombatant.position,
          originType: spell.areaOfEffect.origin,
        })
      } else {
        setAoEPreview(undefined)
      }
      if (spell.projectiles) {
        startProjectileTargeting(spell)
      } else if (!spell.areaOfEffect) {
        setIsSelectingTarget(true)
      }
    } else {
      castSpell(currentCombatant.id, spell)
      setSelectedSpell(undefined)
      setSelectedAction(undefined)
    }
  }, [preselectedSpellId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle weapon preselection from CombatantPanel
  // (must be before early returns to maintain consistent hook order)
  useEffect(() => {
    if (!preselectedWeaponId || !currentCombatant) return
    if (currentCombatant.type !== 'character') return

    // Clear the preselection from store
    useCombatStore.setState({ preselectedWeaponId: undefined })

    // Build a minimal weapon lookup to find the preselected weapon
    const character = currentCombatant.data as Character
    const weapons = character.equipment
    const weaponList: { id: string; range: number; longRange?: number; type: string }[] = []
    if (weapons.meleeWeapon) weaponList.push({ id: weapons.meleeWeapon.id, range: 5, type: 'melee' })
    if (weapons.rangedWeapon) weaponList.push({
      id: weapons.rangedWeapon.id,
      range: weapons.rangedWeapon.range?.normal ?? 5,
      longRange: weapons.rangedWeapon.range?.long,
      type: 'ranged',
    })
    if (weapons.offhandWeapon) weaponList.push({ id: weapons.offhandWeapon.id, range: 5, type: 'melee' })

    const weapon = weaponList.find(w => w.id === preselectedWeaponId)
    if (!weapon) return

    lastSelectedWeaponIdRef.current = preselectedWeaponId
    setIsSelectingWeapon(true)
    setRangeHighlight({
      origin: currentCombatant.position,
      range: weapon.range,
      longRange: weapon.longRange,
      type: weapon.type === 'ranged' ? 'ranged' : 'melee',
    })
  }, [preselectedWeaponId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Victory phase UI
  if (phase === 'victory') {
    return (
      <div className="bg-gradient-to-t from-emerald-950 via-emerald-900 to-slate-800 border-t-2 border-emerald-500 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <Trophy className="w-16 h-16 mx-auto text-emerald-400 mb-4" />
          <h2 className="text-3xl font-bold text-emerald-400 mb-2">Victory!</h2>
          <p className="text-slate-300 mb-6">All enemies have been defeated!</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className={cn(
                'px-6 py-3 rounded-lg font-semibold text-sm transition-all',
                'bg-gradient-to-b from-emerald-600 to-emerald-700 border-2 border-emerald-500',
                'hover:from-emerald-500 hover:to-emerald-600'
              )}
            >
              Return Home
            </button>
            <button
              onClick={resetCombat}
              className={cn(
                'px-6 py-3 rounded-lg font-semibold text-sm transition-all',
                'bg-gradient-to-b from-slate-600 to-slate-700 border-2 border-slate-500',
                'hover:from-slate-500 hover:to-slate-600'
              )}
            >
              New Battle
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Defeat phase UI
  if (phase === 'defeat') {
    return (
      <div className="bg-gradient-to-t from-rose-950 via-rose-900 to-slate-800 border-t-2 border-rose-500 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <Skull className="w-16 h-16 mx-auto text-rose-400 mb-4" />
          <h2 className="text-3xl font-bold text-rose-400 mb-2">Defeat</h2>
          <p className="text-slate-300 mb-6">Your party has fallen...</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className={cn(
                'px-6 py-3 rounded-lg font-semibold text-sm transition-all',
                'bg-gradient-to-b from-rose-600 to-rose-700 border-2 border-rose-500',
                'hover:from-rose-500 hover:to-rose-600'
              )}
            >
              Return Home
            </button>
            <button
              onClick={resetCombat}
              className={cn(
                'px-6 py-3 rounded-lg font-semibold text-sm transition-all',
                'bg-gradient-to-b from-slate-600 to-slate-700 border-2 border-slate-500',
                'hover:from-slate-500 hover:to-slate-600'
              )}
            >
              Try Again
            </button>
          </div>
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
  const spellTargets = (() => {
    const targetType = selectedSpell?.targetType || 'enemy'
    const isAllySpell = targetType === 'ally' || targetType === 'self' || targetType === 'any'

    // For ally/self spells, include allies (same type as caster) + optionally self
    // For enemy spells, include enemies (opposite type)
    const candidates = combatants.filter((c) => {
      if (c.currentHp <= 0 || c.position.x < 0) return false
      if (isAllySpell) {
        // Allies = same type as caster (character targets character allies, monster targets monster allies)
        // Include self for targetType 'self' or 'any'
        if (targetType === 'ally' || targetType === 'any') {
          return c.type === currentCombatant.type
        }
        return c.id === currentCombatant.id // 'self' only
      }
      // Enemy targeting — exclude self
      return c.id !== currentCombatant.id && c.type !== currentCombatant.type
    })

    // When a spell is selected, filter by range + LOS (same as ranged weapon targeting)
    if (selectedSpell) {
      const spellRange = parseSpellRange(selectedSpell.range)
      if (spellRange > 0) {
        const fogCells = new Set<string>()
        for (const zone of state.persistentZones) {
          for (const cell of zone.affectedCells) fogCells.add(cell)
        }
        return candidates.filter((c) => {
          const { canTarget } = canTargetWithRangedAttack(state.grid, currentCombatant.position, c.position, spellRange, fogCells)
          return canTarget
        })
      }
    }
    return candidates
  })()

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

  // Check for bonus action maneuvers (Battle Master)
  const hasBonusManeuvers = isCharacter && hasCombatSuperiority(currentCombatant) &&
    (currentCombatant.superiorityDiceRemaining ?? 0) > 0
  const bonusActionManeuvers = hasBonusManeuvers && character?.knownManeuverIds
    ? getManeuversByIds(character.knownManeuverIds).filter(m => m.trigger === 'bonus_action')
    : []
  const canUseBonusManeuver = bonusActionManeuvers.length > 0 && !currentCombatant.hasBonusActed
  const supDieSize = hasBonusManeuvers ? getSuperiorityDieSize(currentCombatant) : 0

  // Note: Superiority dice display moved to ResourceTracker component

  // Check for Cunning Action (Rogue class feature, level 2+)
  const hasCunningActionFeature = isCharacter && hasCunningAction(currentCombatant)
  const canCunningDash = hasCunningActionFeature && canUseCunningAction(currentCombatant, 'dash')
  const canCunningDisengage = hasCunningActionFeature && canUseCunningAction(currentCombatant, 'disengage')
  const canCunningHide = hasCunningActionFeature && canUseCunningAction(currentCombatant, 'hide')

  // Check for Expeditious Retreat bonus action Dash
  const canExpeditiousDash = isCharacter && !currentCombatant.hasBonusActed && currentCombatant.conditions.some(c => c.condition === 'expeditious_retreat')

  // Check for Battle Medic (Healer origin feat)
  const hasBattleMedicFeat = isCharacter && canUseBattleMedic(currentCombatant)
  const battleMedicTargets = hasBattleMedicFeat ? getBattleMedicTargets(currentCombatant.id) : []
  const canUseBattleMedicNow = hasBattleMedicFeat && battleMedicTargets.length > 0

  // Calculate Extra Attack info
  const maxAttacks = getMaxAttacksPerAction(currentCombatant)
  const attacksRemaining = maxAttacks - currentCombatant.attacksMadeThisTurn
  const hasExtraAttack = maxAttacks > 1
  // Can attack if: have attacks remaining, have targets, and either haven't acted or mid-Attack action
  const canAttack = attacksRemaining > 0 && validTargets.length > 0 && (!currentCombatant.hasActed || currentCombatant.attacksMadeThisTurn > 0)

  // Build weapons array for character attack selector
  const availableWeapons: WeaponOption[] = []
  if (isCharacter && character) {
    // Check if character has mastered each weapon
    const masteredIds = character.masteredWeaponIds ?? []

    if (meleeWeapon) {
      const isMastered = masteredIds.includes(meleeWeapon.id)
      availableWeapons.push({
        id: 'melee',
        name: meleeWeapon.name,
        type: 'melee',
        range: getMeleeRange(meleeWeapon),
        damage: meleeWeapon.damage,
        weapon: meleeWeapon,
        mastery: isMastered && meleeWeapon.mastery ? meleeWeapon.mastery : undefined,
        hasMastery: isMastered && !!meleeWeapon.mastery,
      })
    }
    if (rangedWeapon) {
      const isMastered = masteredIds.includes(rangedWeapon.id)
      availableWeapons.push({
        id: 'ranged',
        name: rangedWeapon.name,
        type: 'ranged',
        range: rangedWeapon.range?.normal ?? 30,
        longRange: rangedWeapon.range?.long,
        damage: rangedWeapon.damage,
        weapon: rangedWeapon,
        mastery: isMastered && rangedWeapon.mastery ? rangedWeapon.mastery : undefined,
        hasMastery: isMastered && !!rangedWeapon.mastery,
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

    // Add attack replacements (breath weapon, etc.)
    if (currentCombatant) {
      const attackReplacements = getAvailableAttackReplacements(currentCombatant)
      for (const replacement of attackReplacements) {
        if (canUseAttackReplacement(currentCombatant, replacement)) {
          if (replacement.targetingType === 'aoe') {
            const aoeReplacement = replacement as AoEAttackReplacement
            availableWeapons.push({
              id: replacement.id,
              name: replacement.name,
              type: 'breath_weapon',
              range: aoeReplacement.aoeSize,
              damage: aoeReplacement.damageDice,
              attackReplacement: replacement,
              usesRemaining: replacement.usesRemaining,
            })
          }
        }
      }
    }
  }

  // (weapon preselection useEffect moved before early returns)

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
        // Set initial range highlight for remembered or first weapon
        if (availableWeapons.length > 0) {
          const initialWeapon = availableWeapons.find(w => w.id === lastSelectedWeaponIdRef.current) ?? availableWeapons[0]
          setRangeHighlight({
            origin: currentCombatant.position,
            range: initialWeapon.range,
            longRange: initialWeapon.longRange,
            type: initialWeapon.type === 'ranged' ? 'ranged' : 'melee',
          })
        }
      } else {
        setIsSelectingTarget(true)
      }
    }
  }

  const handleWeaponSelect = (weapon: WeaponOption | undefined) => {
    if (weapon && currentCombatant) {
      lastSelectedWeaponIdRef.current = weapon.id
      setRangeHighlight({
        origin: currentCombatant.position,
        range: weapon.range,
        longRange: weapon.longRange,
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
    // Store will handle keeping selectedAction if attacks remain
  }

  const handleTargetSelect = (targetId: string) => {
    setHoveredTarget(undefined)
    setRangeHighlight(undefined)
    setAoEPreview(undefined)
    if (selectedSpell) {
      castSpell(currentCombatant.id, selectedSpell, targetId)
      setSelectedSpell(undefined)
      setIsSelectingTarget(false)
      setSelectedAction(undefined)
    } else {
      performAttack(currentCombatant.id, targetId, meleeWeapon, monsterActions[0], rangedWeapon)
      // Store will handle keeping selectedAction if attacks remain
    }
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
    setSelectedSlotLevel(undefined)
    setBreathWeaponTargeting(undefined)
    setIsSelectingBattleMedicTarget(false)
  }

  // Battle Medic handlers
  const handleBattleMedicClick = () => {
    if (isSelectingBattleMedicTarget) {
      setIsSelectingBattleMedicTarget(false)
    } else {
      setIsSelectingBattleMedicTarget(true)
    }
  }

  const handleBattleMedicTargetSelect = (targetId: string) => {
    useBattleMedic(currentCombatant.id, targetId)
    setIsSelectingBattleMedicTarget(false)
    setHoveredTarget(undefined)
  }

  // Handler for when breath weapon is selected from weapon list
  const handleBreathWeaponSelect = (replacement: AttackReplacement) => {
    if (!currentCombatant) return
    if (replacement.targetingType !== 'aoe') return

    const aoeReplacement = replacement as AoEAttackReplacement

    // Set up AoE preview
    setAoEPreview({
      type: aoeReplacement.aoeType,
      size: aoeReplacement.aoeSize,
      origin: currentCombatant.position,
      originType: 'self',
    })

    // Enter breath weapon targeting mode (store format: { replacementId, attackerId })
    setBreathWeaponTargeting({
      replacementId: replacement.id,
      attackerId: currentCombatant.id,
    })
    setIsSelectingWeapon(false)  // Close weapon selector
    setRangeHighlight(undefined)  // Clear range highlight
  }

  const handleSpellClick = () => {
    if (selectedAction === 'spell') {
      setSelectedAction(undefined)
      setIsSelectingSpell(false)
      setSelectedSpell(undefined)
      setSelectedSlotLevel(undefined)
    } else {
      setSelectedAction('spell')
      setIsSelectingSpell(true)
      setSelectedSlotLevel(undefined)  // Show all spells when clicking Spell button
    }
  }

  const handleSlotLevelClick = (level: number) => {
    // If already selecting spells at this level, cancel
    if (selectedAction === 'spell' && selectedSlotLevel === level) {
      setSelectedAction(undefined)
      setIsSelectingSpell(false)
      setSelectedSlotLevel(undefined)
    } else {
      // Open spell selector filtered to this slot level
      setSelectedAction('spell')
      setIsSelectingSpell(true)
      setSelectedSlotLevel(level)
    }
  }

  const handleSpellSelect = (spell: Spell, _castAtLevel?: number) => {
    // Note: _castAtLevel is available for future upcasting implementation
    setSelectedSpell(spell)
    setIsSelectingSpell(false)
    setSelectedSlotLevel(undefined)

    if (spell.multiTarget) {
      // Multi-target buff spells (Jump, Haste, etc.) — enter multi-target selection mode
      startMultiTargetSelection(spell, _castAtLevel)
    } else if (spell.damage || spell.attackType || spell.savingThrow || spell.areaOfEffect) {
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
            originType: spell.areaOfEffect.origin,
          })
        } else {
          setAoEPreview(undefined)
        }
      }

      // Check if this is a multi-projectile spell
      if (spell.projectiles) {
        startProjectileTargeting(spell)
      } else if (!spell.areaOfEffect) {
        // Single-target spells use the target selector popup
        setIsSelectingTarget(true)
      }
      // AoE spells skip the target selector — the grid cursor/preview handles placement
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

      {/* Action Economy Indicators - thin row above */}
      <div className="flex items-center justify-center gap-4 py-0.5 border-b border-slate-700/50">
        <div className="flex items-center gap-1">
          <Circle className={cn(
            'w-3 h-3',
            currentCombatant.hasActed
              ? 'fill-slate-600 text-slate-500'
              : 'fill-emerald-500 text-emerald-400'
          )} />
          <span className={cn('text-[10px]', currentCombatant.hasActed ? 'text-slate-500' : 'text-emerald-400')}>
            Action
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Triangle className={cn(
            'w-3 h-3',
            currentCombatant.hasBonusActed
              ? 'fill-slate-600 text-slate-500'
              : 'fill-amber-500 text-amber-400'
          )} />
          <span className={cn('text-[10px]', currentCombatant.hasBonusActed ? 'text-slate-500' : 'text-amber-400')}>
            Bonus
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Square className={cn(
            'w-3 h-3',
            currentCombatant.hasReacted
              ? 'fill-slate-600 text-slate-500'
              : 'fill-violet-500 text-violet-400'
          )} />
          <span className={cn('text-[10px]', currentCombatant.hasReacted ? 'text-slate-500' : 'text-violet-400')}>
            Reaction
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-3 pt-2">
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
                  tempHp={currentCombatant.temporaryHp || 0}
                />
                <div className="mt-1">
                  <MovementSlider
                    remaining={remainingMovement}
                    total={speed}
                  />
                </div>
              </div>
            </div>

            {/* Resources Section - Spell Slots & Class Resources */}
            {isCharacter && (character?.spellSlots || hasCombatSuperiority(currentCombatant) || getLuckPoints(currentCombatant) > 0) && (
              <div className="flex flex-col gap-1 px-3 border-r border-slate-700">
                {character?.spellSlots && (
                  <SpellSlotDisplay
                    spellSlots={character.spellSlots}
                    onSlotClick={!currentCombatant.hasActed ? handleSlotLevelClick : undefined}
                    compact
                  />
                )}
                <ResourceTracker combatant={currentCombatant} compact />
              </div>
            )}

            {/* Main Action Buttons - 2 Row Grid */}
            <div className="relative flex-1">
              {/* Popups - positioned above the grid */}
              {/* Spell selector popup */}
              {isSelectingSpell && selectedAction === 'spell' && (
                <SpellSelector
                  spells={availableSpells}
                  onSelect={handleSpellSelect}
                  onCancel={handleCancelTarget}
                  spellSlots={character?.spellSlots}
                  magicInitiateFreeUses={currentCombatant.magicInitiateFreeUses}
                  selectedSlotLevel={selectedSlotLevel}
                  hasActed={currentCombatant.hasActed}
                  hasBonusActed={currentCombatant.hasBonusActed}
                />
              )}

              {/* Weapon/Target selector popup for character attacks */}
              {isSelectingWeapon && selectedAction === 'attack' && isCharacter && (
                <WeaponTargetSelector
                  weapons={availableWeapons}
                  initialWeaponId={lastSelectedWeaponIdRef.current}
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
                  onBreathWeaponSelect={handleBreathWeaponSelect}
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

              {/* Multi-target spell selector (Jump, Haste, etc.) */}
              {multiTargetSelection && (
                <MultiTargetSelector
                  targets={spellTargets.map((t) => ({
                    id: t.id,
                    name: t.name,
                    hp: t.currentHp,
                    maxHp: t.maxHp,
                  }))}
                  onHover={setHoveredTarget}
                />
              )}

              {/* Threat warning */}
              {isThreatened && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-900/80 border border-amber-600 rounded text-xs text-amber-200 whitespace-nowrap flex items-center gap-1.5 z-40">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Threatened by {threateningEnemies.length} {threateningEnemies.length === 1 ? 'enemy' : 'enemies'}
                </div>
              )}

              {/* Action Buttons Layout - 1 row if no class features, 2 rows if needed */}
              <div className="flex flex-col gap-1">
                {/* Core Actions */}
                <div className="flex items-center justify-center gap-2">
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

                  {hasSpells && (
                    <ActionButton
                      icon={<Sparkles className="w-5 h-5" />}
                      label="Spell"
                      onClick={handleSpellClick}
                      active={selectedAction === 'spell'}
                      disabled={currentCombatant.hasActed}
                      variant="spell"
                      tooltip="Cast a spell"
                      badge={availableSpells.length}
                      actionType="action"
                    />
                  )}

                  <div className="w-px h-10 bg-slate-700" />

                  {/* Dash button — shows popover for Action vs Bonus Action when ER is active */}
                  <div className="relative">
                    <ActionButton
                      icon={<Wind className="w-5 h-5" />}
                      label="Dash"
                      onClick={() => {
                        if (canExpeditiousDash) {
                          setShowDashPopover(!showDashPopover)
                        } else {
                          useDash()
                        }
                      }}
                      disabled={
                        canExpeditiousDash
                          ? (currentCombatant.hasActed && currentCombatant.hasBonusActed) || currentCombatant.attacksMadeThisTurn > 0
                          : currentCombatant.hasActed || currentCombatant.attacksMadeThisTurn > 0
                      }
                      active={showDashPopover}
                      tooltip={
                        currentCombatant.attacksMadeThisTurn > 0
                          ? "Can't change action mid-Attack"
                          : canExpeditiousDash
                            ? 'Dash as Action or Bonus Action (Expeditious Retreat)'
                            : 'Double your movement speed'
                      }
                      actionType={canExpeditiousDash ? 'bonus' : 'action'}
                    />
                    {showDashPopover && canExpeditiousDash && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900/85 backdrop-blur-md border-2 border-cyan-600 rounded-lg shadow-2xl p-3 z-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-cyan-300">Dash</span>
                          <button onClick={() => setShowDashPopover(false)} className="p-0.5 hover:bg-slate-700 rounded">
                            <X className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          <button
                            onClick={() => { useDash(); setShowDashPopover(false) }}
                            disabled={currentCombatant.hasActed || currentCombatant.attacksMadeThisTurn > 0}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border',
                              currentCombatant.hasActed || currentCombatant.attacksMadeThisTurn > 0
                                ? 'text-slate-500 bg-slate-800/50 border-slate-700 cursor-not-allowed'
                                : 'text-emerald-300 bg-emerald-900/30 border-emerald-700 hover:bg-emerald-900/50 hover:border-emerald-500'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span className="font-medium">Action</span>
                            </div>
                            <div className="text-xs text-slate-400 ml-4">Uses your action</div>
                          </button>
                          <button
                            onClick={() => { useExpeditiousRetreatDash(); setShowDashPopover(false) }}
                            disabled={currentCombatant.hasBonusActed}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border',
                              currentCombatant.hasBonusActed
                                ? 'text-slate-500 bg-slate-800/50 border-slate-700 cursor-not-allowed'
                                : 'text-amber-300 bg-amber-900/30 border-amber-700 hover:bg-amber-900/50 hover:border-amber-500'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              <span className="font-medium">Bonus Action</span>
                            </div>
                            <div className="text-xs text-slate-400 ml-4">Via Expeditious Retreat</div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <ActionButton
                    icon={<Shield className="w-5 h-5" />}
                    label="Dodge"
                    onClick={useDodge}
                    disabled={currentCombatant.hasActed || currentCombatant.attacksMadeThisTurn > 0}
                    tooltip={currentCombatant.attacksMadeThisTurn > 0 ? "Can't change action mid-Attack" : "Attacks against you have disadvantage"}
                    actionType="action"
                  />

                  <ActionButton
                    icon={<DoorOpen className="w-5 h-5" />}
                    label="Disengage"
                    onClick={useDisengage}
                    disabled={currentCombatant.hasActed || currentCombatant.attacksMadeThisTurn > 0}
                    variant={isThreatened ? 'movement' : 'default'}
                    actionType="action"
                    tooltip={currentCombatant.attacksMadeThisTurn > 0 ? "Can't change action mid-Attack" : (isThreatened ? `Escape ${threateningEnemies.length} threatening enemies` : 'Move without opportunity attacks')}
                  />
                </div>

                {/* Row 2: Class Features (only if any exist) */}
                {(hasSecondWind || hasActionSurge || hasBattleMedicFeat || hasCunningActionFeature || bonusActionManeuvers.length > 0) && (
                <div className="flex items-center justify-center gap-2">
                  {/* Second Wind (Fighter bonus action) */}
                  {hasSecondWind && (() => {
                    const isMissingHp = currentCombatant.currentHp < currentCombatant.maxHp
                    const hpMissing = currentCombatant.maxHp - currentCombatant.currentHp
                    return (
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

                  {/* Battle Medic (Healer origin feat) */}
                  {hasBattleMedicFeat && (
                    <div className="relative">
                      <ActionButton
                        icon={<Stethoscope className="w-5 h-5" />}
                        label="Medic"
                        onClick={handleBattleMedicClick}
                        disabled={!canUseBattleMedicNow}
                        active={isSelectingBattleMedicTarget}
                        variant={battleMedicTargets.length > 0 ? 'attack' : 'default'}
                        tooltip={battleMedicTargets.length > 0
                          ? `Heal an adjacent ally (${battleMedicTargets.length} target${battleMedicTargets.length > 1 ? 's' : ''})`
                          : 'No wounded adjacent allies'
                        }
                        badge={battleMedicTargets.length > 0 ? battleMedicTargets.length : undefined}
                        actionType="action"
                      />
                      {isSelectingBattleMedicTarget && battleMedicTargets.length > 0 && (
                        <TargetSelector
                          targets={battleMedicTargets.map(t => ({
                            id: t.id,
                            name: t.name,
                            hp: t.currentHp,
                            maxHp: t.maxHp,
                          }))}
                          onSelect={handleBattleMedicTargetSelect}
                          onCancel={() => setIsSelectingBattleMedicTarget(false)}
                          onHover={setHoveredTarget}
                          label="Heal Ally (Battle Medic)"
                        />
                      )}
                    </div>
                  )}

                  {/* Cunning Action (Rogue, level 2+) */}
                  {hasCunningActionFeature && (
                    <>
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

                  {/* Bonus Action Maneuvers (Battle Master) */}
                  {bonusActionManeuvers.length > 0 && (
                    <div className="relative">
                      <ActionButton
                        icon={<Sword className="w-5 h-5" />}
                        label="Maneuver"
                        onClick={() => { setShowBonusManeuvers(!showBonusManeuvers); setIsSelectingFeintTarget(false) }}
                        disabled={!canUseBonusManeuver}
                        active={showBonusManeuvers}
                        variant="attack"
                        tooltip={`Bonus Action Maneuver (${currentCombatant.superiorityDiceRemaining ?? 0} dice)`}
                        badge={(currentCombatant.superiorityDiceRemaining ?? 0) > 0 ? currentCombatant.superiorityDiceRemaining : undefined}
                        actionType="bonus"
                      />
                      {showBonusManeuvers && canUseBonusManeuver && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-slate-900/85 backdrop-blur-md border-2 border-amber-600 rounded-lg shadow-2xl p-3 z-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-amber-300">Bonus Action Maneuver</span>
                            <button onClick={() => { setShowBonusManeuvers(false); setIsSelectingFeintTarget(false) }} className="p-0.5 hover:bg-slate-700 rounded">
                              <X className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          </div>
                          <div className="text-xs text-slate-400 mb-2">
                            Superiority Dice: <span className="text-amber-400 font-mono">{currentCombatant.superiorityDiceRemaining ?? 0}</span> (d{supDieSize})
                          </div>
                          <div className="space-y-1.5">
                            {bonusActionManeuvers.map(m => {
                              const isFeint = m.id === 'feinting-attack'
                              return (
                                <div key={m.id}>
                                  <button
                                    onClick={() => {
                                      if (isFeint) {
                                        setIsSelectingFeintTarget(!isSelectingFeintTarget)
                                      } else {
                                        useBonusActionManeuver(m.id)
                                        setShowBonusManeuvers(false)
                                      }
                                    }}
                                    className={cn(
                                      'w-full text-left px-3 py-2 rounded-lg border transition-all text-sm',
                                      'bg-gradient-to-r from-amber-900/50 to-amber-800/50 border-amber-700',
                                      'hover:from-amber-800/50 hover:to-amber-700/50 hover:border-amber-500'
                                    )}
                                  >
                                    <div className="font-medium text-amber-200">{m.name}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">
                                      {m.id === 'evasive-footwork' && `Disengage + Dash + add d${supDieSize} to AC`}
                                      {m.id === 'feinting-attack' && `Choose target within 5ft → advantage + d${supDieSize} damage on hit`}
                                      {m.id === 'lunging-attack' && `Dash + d${supDieSize} bonus damage on melee hit (if moved 5ft+)`}
                                    </div>
                                  </button>
                                  {/* Feinting Attack target selection */}
                                  {isFeint && isSelectingFeintTarget && (() => {
                                    const nearbyEnemies = combatants.filter(c => {
                                      if (c.id === currentCombatant.id) return false
                                      if (c.currentHp <= 0) return false
                                      if (c.type === currentCombatant.type) return false
                                      const dx = Math.abs(c.position.x - currentCombatant.position.x)
                                      const dy = Math.abs(c.position.y - currentCombatant.position.y)
                                      return dx <= 1 && dy <= 1
                                    })
                                    if (nearbyEnemies.length === 0) {
                                      return <div className="text-xs text-rose-400 px-3 py-1">No enemies within 5ft</div>
                                    }
                                    return (
                                      <div className="ml-3 mt-1 space-y-1">
                                        {nearbyEnemies.map(e => (
                                          <button
                                            key={e.id}
                                            onClick={() => {
                                              useBonusActionManeuver('feinting-attack', e.id)
                                              setShowBonusManeuvers(false)
                                              setIsSelectingFeintTarget(false)
                                            }}
                                            className="w-full text-left px-2 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-amber-500 transition-colors"
                                          >
                                            <span className="text-amber-300">{e.name}</span>
                                            <span className="text-slate-500 ml-2">{e.currentHp}/{e.maxHp} HP</span>
                                          </button>
                                        ))}
                                      </div>
                                    )
                                  })()}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                )}
              </div>
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
                  canCunningHide ||
                  canUseBonusManeuver ||
                  canExpeditiousDash
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

            {/* Debug Menu Button */}
            <div className="relative pl-4 border-l border-slate-700">
              <button
                onClick={() => setShowDebugMenu(!showDebugMenu)}
                className={cn(
                  'flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all',
                  'bg-gradient-to-b from-orange-900 to-orange-950 border-2 border-orange-700',
                  'hover:from-orange-800 hover:to-orange-900 hover:scale-105',
                  showDebugMenu && 'ring-2 ring-orange-400'
                )}
                title="Debug Menu"
              >
                <Bug className="w-5 h-5 text-orange-400" />
                <span className="text-[8px] text-orange-300 font-medium">Debug</span>
              </button>

              {/* Debug Menu Popup */}
              {showDebugMenu && (
                <DebugMenu
                  combatants={combatants.filter(c => c.currentHp > 0).map(c => ({
                    id: c.id,
                    name: c.name,
                    conditions: c.conditions,
                  }))}
                  onApplyCondition={debugApplyCondition}
                  onRemoveCondition={debugRemoveCondition}
                  onClose={() => setShowDebugMenu(false)}
                />
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
