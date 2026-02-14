import {
  Eye,
  EyeOff,
  Heart,
  EarOff,
  Ghost,
  Grab,
  Brain,
  Sparkles,
  Droplets,
  ArrowDown,
  Link,
  Zap,
  Moon,
  Gauge,
  Shield,
  Wind,
  Footprints,
  ShieldPlus,
  ShieldCheck,
  Target,
  ArrowUp,
  CloudLightning,
  type LucideIcon,
} from 'lucide-react'
import type { Condition } from '@/types'

export interface ConditionIconInfo {
  icon: LucideIcon
  color: string
  bgColor: string
  label: string
}

// ExtendedCondition is now the same as Condition since all action states are in the main type
export type ExtendedCondition = Condition

export const conditionIcons: Record<ExtendedCondition, ConditionIconInfo> = {
  // Standard D&D 5e conditions
  blinded: {
    icon: EyeOff,
    color: 'text-slate-300',
    bgColor: 'bg-slate-700',
    label: 'Blinded',
  },
  charmed: {
    icon: Heart,
    color: 'text-pink-300',
    bgColor: 'bg-pink-900',
    label: 'Charmed',
  },
  deafened: {
    icon: EarOff,
    color: 'text-slate-300',
    bgColor: 'bg-slate-700',
    label: 'Deafened',
  },
  frightened: {
    icon: Ghost,
    color: 'text-purple-300',
    bgColor: 'bg-purple-900',
    label: 'Frightened',
  },
  grappled: {
    icon: Grab,
    color: 'text-orange-300',
    bgColor: 'bg-orange-900',
    label: 'Grappled',
  },
  incapacitated: {
    icon: Brain,
    color: 'text-gray-300',
    bgColor: 'bg-gray-800',
    label: 'Incapacitated',
  },
  invisible: {
    icon: Eye,
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-900',
    label: 'Invisible',
  },
  paralyzed: {
    icon: Zap,
    color: 'text-amber-300',
    bgColor: 'bg-amber-900',
    label: 'Paralyzed',
  },
  petrified: {
    icon: Sparkles,
    color: 'text-stone-300',
    bgColor: 'bg-stone-700',
    label: 'Petrified',
  },
  poisoned: {
    icon: Droplets,
    color: 'text-green-300',
    bgColor: 'bg-green-900',
    label: 'Poisoned',
  },
  prone: {
    icon: ArrowDown,
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-900',
    label: 'Prone',
  },
  restrained: {
    icon: Link,
    color: 'text-orange-300',
    bgColor: 'bg-orange-900',
    label: 'Restrained',
  },
  stunned: {
    icon: Zap,
    color: 'text-amber-300',
    bgColor: 'bg-amber-900',
    label: 'Stunned',
  },
  unconscious: {
    icon: Moon,
    color: 'text-indigo-300',
    bgColor: 'bg-indigo-900',
    label: 'Unconscious',
  },
  exhaustion: {
    icon: Gauge,
    color: 'text-red-300',
    bgColor: 'bg-red-900',
    label: 'Exhaustion',
  },

  // Special action states (not official conditions but tracked in combat)
  dodging: {
    icon: Shield,
    color: 'text-sky-300',
    bgColor: 'bg-sky-900',
    label: 'Dodging',
  },
  disengaging: {
    icon: Wind,
    color: 'text-teal-300',
    bgColor: 'bg-teal-900',
    label: 'Disengaging',
  },
  dashing: {
    icon: Footprints,
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-900',
    label: 'Dashing',
  },
  hidden: {
    icon: EyeOff,
    color: 'text-violet-300',
    bgColor: 'bg-violet-900',
    label: 'Hidden',
  },
  shielded: {
    icon: ShieldPlus,
    color: 'text-blue-300',
    bgColor: 'bg-blue-900',
    label: 'Shielded',
  },

  // Weapon mastery conditions
  sapped: {
    icon: Target,
    color: 'text-rose-300',
    bgColor: 'bg-rose-900',
    label: 'Sapped',
  },

  // Battle Master maneuver conditions
  goaded: {
    icon: Target,
    color: 'text-red-300',
    bgColor: 'bg-red-900',
    label: 'Goaded',
  },
  distracted: {
    icon: Eye,
    color: 'text-amber-300',
    bgColor: 'bg-amber-900',
    label: 'Distracted',
  },
  evasive: {
    icon: Footprints,
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-900',
    label: 'Evasive',
  },
  expeditious_retreat: {
    icon: Zap,
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-900',
    label: 'Expeditious Retreat',
  },
  jump: {
    icon: ArrowUp,
    color: 'text-lime-300',
    bgColor: 'bg-lime-900',
    label: 'Jump',
  },
  longstrider: {
    icon: Footprints,
    color: 'text-teal-300',
    bgColor: 'bg-teal-900',
    label: 'Longstrider',
  },
  protected_from_evil_good: {
    icon: ShieldCheck,
    color: 'text-amber-300',
    bgColor: 'bg-amber-900',
    label: 'Protected from Evil/Good',
  },
  witch_bolt: {
    icon: CloudLightning,
    color: 'text-blue-300',
    bgColor: 'bg-blue-900',
    label: 'Witch Bolt',
  },
}

export function getConditionIcon(condition: string): ConditionIconInfo | undefined {
  return conditionIcons[condition as ExtendedCondition]
}
