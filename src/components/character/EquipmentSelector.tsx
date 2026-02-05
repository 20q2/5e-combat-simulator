import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getAllWeapons, getAllArmors, getClassById, getWeaponById, getArmorById } from '@/data'
import { useCharacterStore, calculateAC, calculateFinalAbilityScores } from '@/stores/characterStore'
import { getAbilityModifier } from '@/types'
import type { Weapon, Armor } from '@/types'
import { Swords, Shield, Target, Shirt, HardHat, ShieldPlus } from 'lucide-react'
import { WeaponMasterySelector } from './WeaponMasterySelector'

// Parse dice notation and return average
function parseDiceAverage(diceNotation: string): number {
  // Handle formats like "1d8", "2d6", "1d10+2"
  const match = diceNotation.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/)
  if (!match) return 0
  const numDice = parseInt(match[1])
  const dieSize = parseInt(match[2])
  const bonus = match[3] ? parseInt(match[3]) : 0
  const averagePerDie = (dieSize + 1) / 2
  return numDice * averagePerDie + bonus
}

// Calculate weapon damage modifier based on weapon type and stats
function getWeaponDamageMod(weapon: Weapon, strMod: number, dexMod: number): number {
  const isFinesse = weapon.properties.includes('finesse')
  const isRanged = weapon.type === 'ranged'

  if (isFinesse) {
    return Math.max(strMod, dexMod)
  } else if (isRanged) {
    return dexMod
  } else {
    return strMod
  }
}

function WeaponCard({
  weapon,
  selected,
  onSelect,
  strMod,
  dexMod,
}: {
  weapon: Weapon
  selected: boolean
  onSelect: () => void
  strMod: number
  dexMod: number
}) {
  const baseDamage = parseDiceAverage(weapon.damage)
  const damageMod = getWeaponDamageMod(weapon, strMod, dexMod)
  const avgDamage = Math.max(1, Math.floor(baseDamage + damageMod))

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
        <div className="text-right">
          <span className="text-xs text-muted-foreground block">
            {weapon.category}
          </span>
          <span className="text-sm font-semibold text-primary">
            ~{avgDamage} avg
          </span>
        </div>
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

  // Calculate ability modifiers for damage calculations
  const finalAbilityScores = calculateFinalAbilityScores(
    draft.baseAbilityScores,
    draft.abilityBonusPlus2,
    draft.abilityBonusPlus1,
    draft.abilityBonusMode,
    draft.abilityBonusPlus1Trio
  )
  const strMod = getAbilityModifier(finalAbilityScores.strength)
  const dexMod = getAbilityModifier(finalAbilityScores.dexterity)

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

  const hasTwoHandedWeapon = selectedMeleeWeapon?.properties.includes('two-handed') ?? false

  // Calculate preview AC
  const previewAC = calculateAC(
    selectedArmor?.category !== 'shield' ? selectedArmor : null,
    draft.shieldEquipped,
    draft.baseAbilityScores.dexterity
  )

  // Group weapons by type
  const meleeWeapons = availableWeapons.filter((w) => w.type === 'melee')
  const rangedWeapons = availableWeapons.filter((w) => w.type === 'ranged')

  // Handle melee weapon selection - auto-unequip shield if two-handed
  const handleMeleeWeaponSelect = (weaponId: string | null) => {
    setMeleeWeapon(weaponId)
    if (weaponId) {
      const weapon = meleeWeapons.find((w) => w.id === weaponId)
      if (weapon?.properties.includes('two-handed') && draft.shieldEquipped) {
        setShield(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Weapons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-orange-400" />
            Weapons
          </CardTitle>
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
              <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-orange-400" />
                Melee Weapon
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                <button
                  onClick={() => handleMeleeWeaponSelect(null)}
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
                    onSelect={() => handleMeleeWeaponSelect(weapon.id)}
                    strMod={strMod}
                    dexMod={dexMod}
                  />
                ))}
              </div>
            </div>

            {/* Ranged Weapons */}
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-400" />
                Ranged Weapon
              </h4>
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
                    strMod={strMod}
                    dexMod={dexMod}
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
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Armor
          </CardTitle>
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
              <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
                <Shirt className="w-4 h-4 text-green-400" />
                Light Armor
              </h4>
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
              <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-400" />
                Medium Armor
              </h4>
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
              <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
                <HardHat className="w-4 h-4 text-slate-400" />
                Heavy Armor
              </h4>
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
                <Label className="flex items-center gap-1.5">
                  <ShieldPlus className="w-4 h-4 text-blue-400" />
                  Shield (+2 AC)
                </Label>
                <button
                  onClick={() => setShield(!draft.shieldEquipped)}
                  disabled={!canUseShield || hasTwoHandedWeapon}
                  className={cn(
                    'px-4 py-2 rounded-lg border-2 transition-all',
                    draft.shieldEquipped ? 'border-primary bg-primary/5' : 'border-border',
                    canUseShield && !hasTwoHandedWeapon ? 'hover:border-primary/50' : 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {draft.shieldEquipped ? 'Equipped' : 'Not Equipped'}
                </button>
                {!canUseShield && (
                  <span className="text-xs text-destructive">Not proficient</span>
                )}
                {canUseShield && hasTwoHandedWeapon && (
                  <span className="text-xs text-destructive">Cannot use with two-handed weapon</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weapon Mastery - Only shown for Fighter and Ranger */}
      <WeaponMasterySelector />
    </div>
  )
}
