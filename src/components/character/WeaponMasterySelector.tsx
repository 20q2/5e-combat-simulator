import { useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { getClassById, getWeaponById } from '@/data'
import { useCharacterStore } from '@/stores/characterStore'
import { isWeaponMasteryFeature } from '@/types'
import type { Weapon, WeaponMastery } from '@/types'
import { getMasteryDescription } from '@/engine/weaponMastery'
import { Swords } from 'lucide-react'

function getMasteryColorClass(mastery: WeaponMastery): string {
  switch (mastery) {
    case 'cleave':
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'graze':
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    case 'nick':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case 'push':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'sap':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    case 'slow':
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    case 'topple':
      return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'vex':
      return 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  }
}

interface WeaponMasteryInfoProps {
  weapon: Weapon
}

function WeaponMasteryInfo({ weapon }: WeaponMasteryInfoProps) {
  if (!weapon.mastery) return null

  return (
    <div className={cn(
      'p-3 rounded-lg border',
      getMasteryColorClass(weapon.mastery)
    )}>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-sm">{weapon.name}</span>
        <span className="text-xs px-1.5 py-0.5 rounded font-medium uppercase tracking-wide bg-black/20">
          {weapon.mastery}
        </span>
      </div>
      <p className="text-xs opacity-90 leading-relaxed">
        {getMasteryDescription(weapon.mastery)}
      </p>
    </div>
  )
}

export function WeaponMasterySelector() {
  const draft = useCharacterStore((state) => state.draft)
  const setMasteredWeapons = useCharacterStore((state) => state.setMasteredWeapons)

  // Get class weapon mastery feature
  const characterClass = draft.classId ? getClassById(draft.classId) : null

  const masteryFeature = useMemo(() => {
    if (!characterClass) return null

    const allFeatures = [
      ...characterClass.features,
      ...(characterClass.subclasses.find(s => s.id === draft.subclassId)?.features ?? []),
    ]

    for (const feature of allFeatures) {
      if (isWeaponMasteryFeature(feature) && feature.level <= draft.level) {
        return feature
      }
    }

    return null
  }, [characterClass, draft.subclassId, draft.level])

  // Get equipped weapons
  const meleeWeapon = draft.meleeWeaponId ? getWeaponById(draft.meleeWeaponId) : null
  const rangedWeapon = draft.rangedWeaponId ? getWeaponById(draft.rangedWeaponId) : null

  // Auto-sync mastered weapons with equipped weapons
  useEffect(() => {
    if (!masteryFeature) return

    const weaponIds: string[] = []
    if (meleeWeapon?.mastery) weaponIds.push(meleeWeapon.id)
    if (rangedWeapon?.mastery) weaponIds.push(rangedWeapon.id)

    const current = draft.masteredWeaponIds
    const isDifferent = weaponIds.length !== current.length ||
      weaponIds.some(id => !current.includes(id))

    if (isDifferent) {
      setMasteredWeapons(weaponIds)
    }
  }, [masteryFeature, meleeWeapon, rangedWeapon, draft.masteredWeaponIds, setMasteredWeapons])

  // Don't show if class doesn't have weapon mastery
  if (!masteryFeature) {
    return null
  }

  // Check if any equipped weapon has mastery
  const hasAnyMastery = meleeWeapon?.mastery || rangedWeapon?.mastery

  if (!hasAnyMastery) {
    return (
      <div className="p-3 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Swords className="w-4 h-4" />
          <span className="text-sm">Your equipped weapons don't have mastery properties.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 rounded-lg border border-border bg-card space-y-2">
      <div className="flex items-center gap-2">
        <Swords className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Weapon Mastery</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {meleeWeapon?.mastery && <WeaponMasteryInfo weapon={meleeWeapon} />}
        {rangedWeapon?.mastery && <WeaponMasteryInfo weapon={rangedWeapon} />}
      </div>
    </div>
  )
}
