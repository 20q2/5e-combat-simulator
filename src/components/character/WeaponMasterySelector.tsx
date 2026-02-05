import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getAllWeapons, getClassById } from '@/data'
import { useCharacterStore } from '@/stores/characterStore'
import { isWeaponMasteryFeature } from '@/types'
import type { Weapon, WeaponMastery } from '@/types'
import { getMasteryDescription } from '@/engine/weaponMastery'
import { Swords, Check } from 'lucide-react'

interface MasteryWeaponCardProps {
  weapon: Weapon
  selected: boolean
  onSelect: () => void
  disabled: boolean
}

function MasteryWeaponCard({ weapon, selected, onSelect, disabled }: MasteryWeaponCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled && !selected}
      className={cn(
        'w-full text-left p-3 rounded-lg border-2 transition-all',
        selected
          ? 'border-primary bg-primary/5'
          : disabled
            ? 'border-border opacity-50 cursor-not-allowed'
            : 'border-border hover:border-primary/50'
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">{weapon.name}</h4>
            {selected && <Check className="w-4 h-4 text-primary" />}
          </div>
          <p className="text-xs text-muted-foreground">
            {weapon.damage} {weapon.damageType}
            {weapon.range && ` · ${weapon.range.normal}/${weapon.range.long} ft`}
          </p>
        </div>
        {weapon.mastery && (
          <span className={cn(
            'text-xs px-2 py-1 rounded font-medium uppercase tracking-wide',
            getMasteryColorClass(weapon.mastery)
          )}>
            {weapon.mastery}
          </span>
        )}
      </div>
      {weapon.mastery && (
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {getMasteryDescription(weapon.mastery)}
        </p>
      )}
    </button>
  )
}

function getMasteryColorClass(mastery: WeaponMastery): string {
  switch (mastery) {
    case 'cleave':
      return 'bg-red-500/20 text-red-300'
    case 'graze':
      return 'bg-orange-500/20 text-orange-300'
    case 'nick':
      return 'bg-yellow-500/20 text-yellow-300'
    case 'push':
      return 'bg-blue-500/20 text-blue-300'
    case 'sap':
      return 'bg-purple-500/20 text-purple-300'
    case 'slow':
      return 'bg-cyan-500/20 text-cyan-300'
    case 'topple':
      return 'bg-green-500/20 text-green-300'
    case 'vex':
      return 'bg-pink-500/20 text-pink-300'
    default:
      return 'bg-slate-500/20 text-slate-300'
  }
}

export function WeaponMasterySelector() {
  const draft = useCharacterStore((state) => state.draft)
  const toggleMasteredWeapon = useCharacterStore((state) => state.toggleMasteredWeapon)

  // Get class weapon mastery feature
  const characterClass = draft.classId ? getClassById(draft.classId) : null

  const masteryFeature = useMemo(() => {
    if (!characterClass) return null

    // Check all features for weapon mastery
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

  // Calculate max allowed weapons based on level and scaling
  const maxMasteredWeapons = useMemo(() => {
    if (!masteryFeature) return 0

    let count = masteryFeature.masteredWeaponCount

    if (masteryFeature.masteredWeaponCountAtLevels) {
      const levels = Object.keys(masteryFeature.masteredWeaponCountAtLevels)
        .map(Number)
        .sort((a, b) => b - a)

      for (const level of levels) {
        if (draft.level >= level) {
          count = masteryFeature.masteredWeaponCountAtLevels[level]
          break
        }
      }
    }

    return count
  }, [masteryFeature, draft.level])

  // Get all weapons that can be mastered
  const availableWeapons = useMemo(() => {
    const allWeapons = getAllWeapons()
    // Only show weapons with mastery properties
    return allWeapons.filter(w => w.mastery)
  }, [])

  // Group weapons by mastery type for easier browsing
  const weaponsByMastery = useMemo(() => {
    const groups: Record<WeaponMastery, Weapon[]> = {
      cleave: [],
      graze: [],
      nick: [],
      push: [],
      sap: [],
      slow: [],
      topple: [],
      vex: [],
    }

    for (const weapon of availableWeapons) {
      if (weapon.mastery) {
        groups[weapon.mastery].push(weapon)
      }
    }

    return groups
  }, [availableWeapons])

  // Don't show if class doesn't have weapon mastery
  if (!masteryFeature) {
    return null
  }

  const selectedCount = draft.masteredWeaponIds.length
  const canSelectMore = selectedCount < maxMasteredWeapons

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Weapon Mastery</CardTitle>
        </div>
        <CardDescription>
          Select {maxMasteredWeapons} weapons to master. You can use the mastery property of these weapons in combat.
          <span className={cn(
            'block mt-1 font-medium',
            selectedCount === maxMasteredWeapons ? 'text-primary' : 'text-muted-foreground'
          )}>
            {selectedCount} / {maxMasteredWeapons} selected
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {(Object.entries(weaponsByMastery) as [WeaponMastery, Weapon[]][]).map(([mastery, weapons]) => {
          if (weapons.length === 0) return null

          return (
            <div key={mastery}>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn(
                  'text-sm px-2 py-1 rounded font-medium uppercase tracking-wide',
                  getMasteryColorClass(mastery)
                )}>
                  {mastery}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({weapons.length} weapons)
                </span>
              </div>
              <div className="grid gap-2">
                {weapons.map((weapon) => (
                  <MasteryWeaponCard
                    key={weapon.id}
                    weapon={weapon}
                    selected={draft.masteredWeaponIds.includes(weapon.id)}
                    onSelect={() => toggleMasteredWeapon(weapon.id)}
                    disabled={!canSelectMore}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
