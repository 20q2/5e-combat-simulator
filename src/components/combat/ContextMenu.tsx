import { useEffect, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useCombatStore } from '@/stores/combatStore'
import { Sword, Crosshair, Sparkles, Eye } from 'lucide-react'
import type { Character, Weapon, Spell } from '@/types'

interface ContextMenuOption {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
  action: () => void
}

interface ContextMenuProps {
  position: { x: number; y: number }
  targetId: string
  targetType: 'enemy' | 'ally'
  onClose: () => void
}

// Calculate distance between two positions in feet (5ft per cell)
function getDistanceInFeet(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
  const dx = Math.abs(pos1.x - pos2.x)
  const dy = Math.abs(pos1.y - pos2.y)
  return Math.max(dx, dy) * 5
}

// Get weapon range in feet (returns { normal, long } for ranged, { normal } for melee)
function getWeaponRange(weapon: Weapon): { normal: number; long?: number } {
  if (weapon.type === 'ranged' && weapon.range) {
    return { normal: weapon.range.normal, long: weapon.range.long }
  }
  // Melee weapon - check for reach property
  const hasReach = weapon.properties.includes('reach')
  return { normal: hasReach ? 10 : 5 }
}

// Parse spell range to feet
function parseSpellRange(range: string): number {
  const lowerRange = range.toLowerCase()
  if (lowerRange === 'self' || lowerRange.startsWith('self')) return 0
  if (lowerRange === 'touch') return 5
  const match = range.match(/(\d+)\s*(feet|ft|foot)?/i)
  if (match) return parseInt(match[1], 10)
  return 0
}

export function ContextMenu({ position, targetId, targetType, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    combatants,
    turnOrder,
    currentTurnIndex,
    performAttack,
    castSpell,
    selectCombatant,
    setSelectedAction,
  } = useCombatStore()

  const currentTurnId = turnOrder[currentTurnIndex]
  const currentCombatant = combatants.find(c => c.id === currentTurnId)
  const target = combatants.find(c => c.id === targetId)

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    // Add listeners with slight delay to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Calculate adjusted position to avoid viewport overflow
  const adjustedPosition = useMemo(() => {
    const menuWidth = 220
    const menuHeight = 200 // Estimate
    const padding = 8

    let x = position.x
    let y = position.y

    // Check right edge
    if (x + menuWidth + padding > window.innerWidth) {
      x = window.innerWidth - menuWidth - padding
    }

    // Check bottom edge
    if (y + menuHeight + padding > window.innerHeight) {
      y = window.innerHeight - menuHeight - padding
    }

    // Ensure not negative
    x = Math.max(padding, x)
    y = Math.max(padding, y)

    return { left: x, top: y }
  }, [position])

  // Generate menu options
  const options = useMemo(() => {
    const opts: ContextMenuOption[] = []

    if (!currentCombatant || !target) return opts

    const distance = getDistanceInFeet(currentCombatant.position, target.position)

    if (targetType === 'enemy') {
      // Only show attack options if action is available
      const canAttack = !currentCombatant.hasActed || currentCombatant.attacksMadeThisTurn > 0

      if (currentCombatant.type === 'character') {
        const character = currentCombatant.data as Character

        // Melee weapon option
        const meleeWeapon = character.equipment?.meleeWeapon
        if (meleeWeapon) {
          const meleeRange = getWeaponRange(meleeWeapon)
          const inMeleeRange = distance <= meleeRange.normal

          opts.push({
            id: 'attack-melee',
            label: `Attack with ${meleeWeapon.name}`,
            icon: Sword,
            disabled: !canAttack || !inMeleeRange,
            action: () => {
              performAttack(currentTurnId!, targetId, meleeWeapon, undefined, undefined)
              setSelectedAction(undefined)
            }
          })
        }

        // Ranged weapon option
        const rangedWeapon = character.equipment?.rangedWeapon
        if (rangedWeapon) {
          const rangedRange = getWeaponRange(rangedWeapon)
          const inNormalRange = distance <= rangedRange.normal
          const inLongRange = rangedRange.long && distance <= rangedRange.long
          const atDisadvantage = !inNormalRange && inLongRange

          opts.push({
            id: 'attack-ranged',
            label: atDisadvantage
              ? `Attack with ${rangedWeapon.name} (disadvantage)`
              : `Attack with ${rangedWeapon.name}`,
            icon: Crosshair,
            disabled: !canAttack || (!inNormalRange && !inLongRange),
            action: () => {
              performAttack(currentTurnId!, targetId, undefined, undefined, rangedWeapon)
              setSelectedAction(undefined)
            }
          })
        }

        // Offensive spells
        const offensiveSpells = (character.preparedSpells || character.knownSpells || [])
          .filter((spell: Spell) =>
            (spell.damage || spell.attackType || spell.savingThrow) &&
            !spell.areaOfEffect &&
            !spell.projectiles
          )
          .slice(0, 3) // Limit to 3 spells

        offensiveSpells.forEach((spell: Spell) => {
          const spellRange = parseSpellRange(spell.range)
          const inSpellRange = distance <= spellRange

          opts.push({
            id: `spell-${spell.id}`,
            label: `Cast ${spell.name}`,
            icon: Sparkles,
            disabled: !inSpellRange,
            action: () => {
              castSpell(currentTurnId!, spell, targetId)
            }
          })
        })
      }
    }

    // Separator before view details (only if we have attack options)
    if (opts.length > 0) {
      opts.push({
        id: 'separator',
        label: '',
        icon: () => null,
        action: () => {}
      })
    }

    // Always show view details
    opts.push({
      id: 'view-details',
      label: 'View Details',
      icon: Eye,
      action: () => {
        selectCombatant(targetId)
      }
    })

    return opts
  }, [currentCombatant, target, targetType, currentTurnId, targetId, performAttack, castSpell, selectCombatant, setSelectedAction])

  if (!currentCombatant || !target) {
    return null
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[200px] bg-slate-900 border border-slate-600 rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
      style={adjustedPosition}
    >
      {/* Target name header */}
      <div className="px-3 py-2 border-b border-slate-700">
        <span className={cn(
          'text-sm font-semibold',
          targetType === 'enemy' ? 'text-rose-400' : 'text-emerald-400'
        )}>
          {target.name}
        </span>
      </div>

      {/* Menu options */}
      {options.map((option, index) => {
        if (option.id === 'separator') {
          return <div key={index} className="h-px bg-slate-700 my-1" />
        }

        const Icon = option.icon
        return (
          <button
            key={option.id}
            onClick={() => {
              if (!option.disabled) {
                option.action()
                onClose()
              }
            }}
            disabled={option.disabled}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
              option.disabled
                ? 'text-slate-500 cursor-not-allowed'
                : 'text-slate-200 hover:bg-slate-800'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{option.label}</span>
            {option.disabled && option.id.startsWith('attack') && (
              <span className="ml-auto text-xs text-slate-600">out of range</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
