import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getAllWeapons, getAllArmors, getClassById, getWeaponById, getArmorById } from '@/data'
import { useCharacterStore, calculateAC } from '@/stores/characterStore'
import type { Weapon, Armor } from '@/types'

function WeaponCard({
  weapon,
  selected,
  onSelect,
}: {
  weapon: Weapon
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-3 rounded-lg border-2 transition-all hover:border-primary/50',
        selected ? 'border-primary bg-primary/5' : 'border-border'
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-sm">{weapon.name}</h4>
          <p className="text-xs text-muted-foreground">
            {weapon.damage} {weapon.damageType}
            {weapon.range && ` · ${weapon.range.normal}/${weapon.range.long} ft`}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {weapon.category}
        </span>
      </div>
      {weapon.properties.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {weapon.properties.map((prop) => (
            <span key={prop} className="text-xs bg-secondary px-1.5 py-0.5 rounded">
              {prop}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

function ArmorCard({
  armor,
  selected,
  onSelect,
  canUse,
}: {
  armor: Armor
  selected: boolean
  onSelect: () => void
  canUse: boolean
}) {
  return (
    <button
      onClick={onSelect}
      disabled={!canUse}
      className={cn(
        'w-full text-left p-3 rounded-lg border-2 transition-all',
        selected ? 'border-primary bg-primary/5' : 'border-border',
        canUse ? 'hover:border-primary/50' : 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-sm">{armor.name}</h4>
          <p className="text-xs text-muted-foreground">
            AC {armor.baseAC}
            {armor.dexBonus && (armor.maxDexBonus ? ` + DEX (max ${armor.maxDexBonus})` : ' + DEX')}
            {armor.stealthDisadvantage && ' · Stealth disadvantage'}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {armor.category}
        </span>
      </div>
      {!canUse && (
        <p className="text-xs text-destructive mt-1">
          Not proficient
        </p>
      )}
    </button>
  )
}

export function EquipmentSelector() {
  const { draft, setMeleeWeapon, setRangedWeapon, setArmor, setShield } = useCharacterStore()

  const selectedClass = draft.classId ? getClassById(draft.classId) : null
  const weapons = getAllWeapons()
  const armors = getAllArmors()

  // Filter equipment by class proficiencies
  const availableWeapons = useMemo(() => {
    if (!selectedClass) return weapons
    return weapons.filter((w) => {
      // Check category proficiency
      if (selectedClass.weaponProficiencies.includes(w.category)) return true
      if (selectedClass.weaponProficiencies.includes('simple') && w.category === 'simple') return true
      if (selectedClass.weaponProficiencies.includes('martial') && w.category === 'martial') return true
      // Check specific weapon proficiency
      if (selectedClass.weaponProficiencies.some((p) =>
        w.name.toLowerCase().includes(p.toLowerCase()) ||
        p.toLowerCase().includes(w.name.toLowerCase())
      )) return true
      return false
    })
  }, [selectedClass, weapons])

  // Separate armors by category (excluding shields)
  const armorsByCategory = useMemo(() => {
    const nonShields = armors.filter((a) => a.category !== 'shield')
    return {
      light: nonShields.filter((a) => a.category === 'light'),
      medium: nonShields.filter((a) => a.category === 'medium'),
      heavy: nonShields.filter((a) => a.category === 'heavy'),
    }
  }, [armors])

  const shield = armors.find((a) => a.category === 'shield')

  // Check armor proficiency
  const canUseArmor = (armor: Armor): boolean => {
    if (!selectedClass) return true
    return selectedClass.armorProficiencies.includes(armor.category)
  }

  const canUseShield = selectedClass?.armorProficiencies.includes('shields') ?? true

  // Get selected items
  const selectedMeleeWeapon = draft.meleeWeaponId ? getWeaponById(draft.meleeWeaponId) : null
  const selectedRangedWeapon = draft.rangedWeaponId ? getWeaponById(draft.rangedWeaponId) : null
  const selectedArmor = draft.armorId ? getArmorById(draft.armorId) ?? null : null

  // Calculate preview AC
  const previewAC = calculateAC(
    selectedArmor?.category !== 'shield' ? selectedArmor : null,
    draft.shieldEquipped,
    draft.baseAbilityScores.dexterity
  )

  // Group weapons by type
  const meleeWeapons = availableWeapons.filter((w) => w.type === 'melee')
  const rangedWeapons = availableWeapons.filter((w) => w.type === 'ranged')

  return (
    <div className="space-y-6">
      {/* Weapons */}
      <Card>
        <CardHeader>
          <CardTitle>Weapons</CardTitle>
          <CardDescription>
            Choose a melee weapon and/or a ranged weapon
            {selectedClass && (
              <span className="block text-xs mt-1">
                Proficient with: {selectedClass.weaponProficiencies.join(', ')}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Melee Weapons */}
            <div>
              <h4 className="font-medium text-sm mb-2">Melee Weapon</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                <button
                  onClick={() => setMeleeWeapon(null)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border-2 transition-all hover:border-primary/50',
                    !draft.meleeWeaponId ? 'border-primary bg-primary/5' : 'border-border'
                  )}
                >
                  <h4 className="font-medium text-sm">None</h4>
                  <p className="text-xs text-muted-foreground">No melee weapon</p>
                </button>
                {meleeWeapons.map((weapon) => (
                  <WeaponCard
                    key={weapon.id}
                    weapon={weapon}
                    selected={draft.meleeWeaponId === weapon.id}
                    onSelect={() => setMeleeWeapon(weapon.id)}
                  />
                ))}
              </div>
            </div>

            {/* Ranged Weapons */}
            <div>
              <h4 className="font-medium text-sm mb-2">Ranged Weapon</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                <button
                  onClick={() => setRangedWeapon(null)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border-2 transition-all hover:border-primary/50',
                    !draft.rangedWeaponId ? 'border-primary bg-primary/5' : 'border-border'
                  )}
                >
                  <h4 className="font-medium text-sm">None</h4>
                  <p className="text-xs text-muted-foreground">No ranged weapon</p>
                </button>
                {rangedWeapons.map((weapon) => (
                  <WeaponCard
                    key={weapon.id}
                    weapon={weapon}
                    selected={draft.rangedWeaponId === weapon.id}
                    onSelect={() => setRangedWeapon(weapon.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {(selectedMeleeWeapon || selectedRangedWeapon) && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-medium">Selected Weapons</h4>
              {selectedMeleeWeapon && (
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground">{selectedMeleeWeapon.name}:</span>{' '}
                  {selectedMeleeWeapon.damage} {selectedMeleeWeapon.damageType}
                  {selectedMeleeWeapon.properties.length > 0 && (
                    <> · {selectedMeleeWeapon.properties.join(', ')}</>
                  )}
                </p>
              )}
              {selectedRangedWeapon && (
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground">{selectedRangedWeapon.name}:</span>{' '}
                  {selectedRangedWeapon.damage} {selectedRangedWeapon.damageType}
                  {selectedRangedWeapon.properties.length > 0 && (
                    <> · {selectedRangedWeapon.properties.join(', ')}</>
                  )}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Armor */}
      <Card>
        <CardHeader>
          <CardTitle>Armor</CardTitle>
          <CardDescription>
            Choose your armor (Preview AC: {previewAC})
            {selectedClass && (
              <span className="block text-xs mt-1">
                Proficient with: {selectedClass.armorProficiencies.length > 0
                  ? selectedClass.armorProficiencies.join(', ')
                  : 'None'}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Light Armor */}
            <div>
              <h4 className="font-medium text-sm mb-2">Light Armor</h4>
              <div className="space-y-2">
                <button
                  onClick={() => setArmor(null)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border-2 transition-all hover:border-primary/50',
                    !draft.armorId ? 'border-primary bg-primary/5' : 'border-border'
                  )}
                >
                  <h4 className="font-medium text-sm">No Armor</h4>
                  <p className="text-xs text-muted-foreground">AC 10 + DEX</p>
                </button>
                {armorsByCategory.light.map((armor) => (
                  <ArmorCard
                    key={armor.id}
                    armor={armor}
                    selected={draft.armorId === armor.id}
                    onSelect={() => setArmor(armor.id)}
                    canUse={canUseArmor(armor)}
                  />
                ))}
              </div>
            </div>

            {/* Medium Armor */}
            <div>
              <h4 className="font-medium text-sm mb-2">Medium Armor</h4>
              <div className="space-y-2">
                {armorsByCategory.medium.map((armor) => (
                  <ArmorCard
                    key={armor.id}
                    armor={armor}
                    selected={draft.armorId === armor.id}
                    onSelect={() => setArmor(armor.id)}
                    canUse={canUseArmor(armor)}
                  />
                ))}
              </div>
            </div>

            {/* Heavy Armor */}
            <div>
              <h4 className="font-medium text-sm mb-2">Heavy Armor</h4>
              <div className="space-y-2">
                {armorsByCategory.heavy.map((armor) => (
                  <ArmorCard
                    key={armor.id}
                    armor={armor}
                    selected={draft.armorId === armor.id}
                    onSelect={() => setArmor(armor.id)}
                    canUse={canUseArmor(armor)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Shield */}
          {shield && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-4">
                <Label>Shield (+2 AC)</Label>
                <button
                  onClick={() => setShield(!draft.shieldEquipped)}
                  disabled={!canUseShield}
                  className={cn(
                    'px-4 py-2 rounded-lg border-2 transition-all',
                    draft.shieldEquipped ? 'border-primary bg-primary/5' : 'border-border',
                    canUseShield ? 'hover:border-primary/50' : 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {draft.shieldEquipped ? 'Equipped' : 'Not Equipped'}
                </button>
                {!canUseShield && (
                  <span className="text-xs text-destructive">Not proficient</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
