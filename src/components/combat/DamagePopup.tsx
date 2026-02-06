import { cn } from '@/lib/utils'
import type { DamageType, CombatPopupType } from '@/types'

interface DamagePopupProps {
  amount?: number
  damageType?: DamageType
  isCritical: boolean
  velocityX: number // -1 to 1, controls horizontal drift
  popupType: CombatPopupType
  text?: string
}

// D&D 5e damage type colors
function getDamageTypeColor(damageType: DamageType): string {
  switch (damageType) {
    // Physical damage types
    case 'bludgeoning':
      return 'text-stone-300'
    case 'piercing':
      return 'text-slate-300'
    case 'slashing':
      return 'text-zinc-300'
    // Elemental damage types
    case 'acid':
      return 'text-lime-400'
    case 'cold':
      return 'text-cyan-400'
    case 'fire':
      return 'text-orange-500'
    case 'lightning':
      return 'text-yellow-300'
    case 'thunder':
      return 'text-blue-400'
    // Magical damage types
    case 'force':
      return 'text-violet-400'
    case 'necrotic':
      return 'text-purple-500'
    case 'poison':
      return 'text-green-500'
    case 'psychic':
      return 'text-pink-400'
    case 'radiant':
      return 'text-amber-300'
    default:
      return 'text-white'
  }
}

// Shadow/glow color for better visibility
function getDamageTypeShadow(damageType: DamageType): string {
  switch (damageType) {
    case 'bludgeoning':
    case 'piercing':
    case 'slashing':
      return 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
    case 'acid':
      return 'drop-shadow-[0_2px_4px_rgba(132,204,22,0.6)]'
    case 'cold':
      return 'drop-shadow-[0_2px_4px_rgba(34,211,238,0.6)]'
    case 'fire':
      return 'drop-shadow-[0_2px_8px_rgba(249,115,22,0.8)]'
    case 'lightning':
      return 'drop-shadow-[0_2px_8px_rgba(253,224,71,0.8)]'
    case 'thunder':
      return 'drop-shadow-[0_2px_4px_rgba(96,165,250,0.6)]'
    case 'force':
      return 'drop-shadow-[0_2px_4px_rgba(167,139,250,0.6)]'
    case 'necrotic':
      return 'drop-shadow-[0_2px_6px_rgba(168,85,247,0.7)]'
    case 'poison':
      return 'drop-shadow-[0_2px_4px_rgba(34,197,94,0.6)]'
    case 'psychic':
      return 'drop-shadow-[0_2px_4px_rgba(244,114,182,0.6)]'
    case 'radiant':
      return 'drop-shadow-[0_2px_8px_rgba(251,191,36,0.8)]'
    default:
      return 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
  }
}

// Get styling based on popup type
function getPopupTypeStyles(popupType: CombatPopupType): { color: string; shadow: string; text: string } {
  switch (popupType) {
    case 'miss':
      return {
        color: 'text-gray-400',
        shadow: 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
        text: 'MISS',
      }
    case 'dodged':
      return {
        color: 'text-sky-400',
        shadow: 'drop-shadow-[0_2px_4px_rgba(56,189,248,0.6)]',
        text: 'DODGED',
      }
    case 'saved':
      return {
        color: 'text-blue-400',
        shadow: 'drop-shadow-[0_2px_4px_rgba(96,165,250,0.6)]',
        text: 'SAVED',
      }
    case 'resisted':
      return {
        color: 'text-amber-400',
        shadow: 'drop-shadow-[0_2px_4px_rgba(251,191,36,0.6)]',
        text: 'RESISTED',
      }
    case 'heal':
      return {
        color: 'text-emerald-400',
        shadow: 'drop-shadow-[0_2px_6px_rgba(52,211,153,0.7)]',
        text: '+',
      }
    case 'critical':
      return {
        color: 'text-red-500',
        shadow: 'drop-shadow-[0_2px_8px_rgba(239,68,68,0.8)]',
        text: 'CRITICAL!',
      }
    case 'condition':
      return {
        color: 'text-purple-400',
        shadow: 'drop-shadow-[0_2px_6px_rgba(192,132,252,0.7)]',
        text: '', // Text will be provided via text prop
      }
    case 'damage':
    default:
      return {
        color: 'text-white',
        shadow: 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
        text: '',
      }
  }
}

export function DamagePopup({ amount, damageType, isCritical, velocityX, popupType, text }: DamagePopupProps) {
  const typeStyles = getPopupTypeStyles(popupType)

  // For damage/heal, use damage type colors if available
  const colorClass = popupType === 'damage' && damageType
    ? getDamageTypeColor(damageType)
    : typeStyles.color

  const shadowClass = popupType === 'damage' && damageType
    ? getDamageTypeShadow(damageType)
    : typeStyles.shadow

  // Convert velocityX (-1 to 1) to pixels for horizontal drift
  const driftX = velocityX * 30 // Max 30px drift in either direction

  // Determine what to display
  const displayText = text ?? typeStyles.text
  const showAmount = (popupType === 'damage' || popupType === 'heal') && amount !== undefined
  const isLargeText = isCritical || popupType === 'miss' || popupType === 'dodged' || popupType === 'saved' || popupType === 'critical' || popupType === 'condition'

  return (
    <div
      className={cn(
        'animate-damage-popup pointer-events-none select-none',
        'font-bold text-center whitespace-nowrap',
        isLargeText ? 'text-2xl' : 'text-xl',
        colorClass,
        shadowClass
      )}
      style={{ '--drift-x': `${driftX}px` } as React.CSSProperties}
    >
      {isCritical && popupType === 'damage' && <span className="text-red-500">!</span>}
      {popupType === 'heal' && <span className="text-emerald-400">+</span>}
      {showAmount && amount}
      {!showAmount && displayText}
      {isCritical && popupType === 'damage' && <span className="text-red-500">!</span>}
    </div>
  )
}
