import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  getRaceById,
  getClassById,
  getWeaponById,
  getArmorById,
  getClassFeaturesByLevel,
  getSubclassFeaturesByLevel,
} from '@/data'
import {
  useCharacterStore,
  calculateFinalAbilityScores,
  calculateHP,
  calculateAC,
} from '@/stores/characterStore'
import { getAbilityModifier, getProficiencyBonus } from '@/types'
import { getCharacterTokenImage } from '@/lib/tokenImages'
import type { Character } from '@/types'
import {
  Heart,
  Shield,
  Footprints,
  Swords,
  Sparkles,
  User,
} from 'lucide-react'

const ABILITY_LABELS: Record<string, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
}

function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function CharacterPreview() {
  const { draft, setName } = useCharacterStore()

  const race = draft.raceId ? getRaceById(draft.raceId) ?? null : null
  const characterClass = draft.classId ? getClassById(draft.classId) ?? null : null
  const subclass = characterClass?.subclasses.find((s) => s.id === draft.subclassId)
  const meleeWeapon = draft.meleeWeaponId ? getWeaponById(draft.meleeWeaponId) ?? null : null
  const rangedWeapon = draft.rangedWeaponId ? getWeaponById(draft.rangedWeaponId) ?? null : null
  const armor = draft.armorId ? getArmorById(draft.armorId) ?? null : null

  // Calculate final stats
  const finalAbilityScores = calculateFinalAbilityScores(
    draft.baseAbilityScores,
    draft.abilityBonusPlus2,
    draft.abilityBonusPlus1,
    draft.abilityBonusMode,
    draft.abilityBonusPlus1Trio
  )
  const proficiencyBonus = getProficiencyBonus(draft.level)

  const hp = characterClass
    ? calculateHP(characterClass, draft.level, finalAbilityScores.constitution)
    : 0

  const ac = calculateAC(
    armor?.category !== 'shield' ? armor : null,
    draft.shieldEquipped,
    finalAbilityScores.dexterity
  )

  // Get features
  const classFeatures = characterClass
    ? getClassFeaturesByLevel(characterClass, draft.level)
    : []
  const subclassFeatures = characterClass && draft.subclassId
    ? getSubclassFeaturesByLevel(characterClass, draft.subclassId, draft.level)
    : []

  // Get token preview image
  const tokenImage = useMemo(() => {
    if (!race || !characterClass) return null
    const mockCharacter = { race, class: characterClass } as Character
    return getCharacterTokenImage(mockCharacter)
  }, [race, characterClass])

  // Calculate if we have enough to show certain sections
  const hasRaceOrClass = race || characterClass
  const hasEquipment = meleeWeapon || rangedWeapon || armor || draft.shieldEquipped

  return (
    <Card className="sticky top-4">
      <CardContent className="pt-6">
        {/* Character Portrait & Name */}
        <div className="text-center mb-6">
          {/* Token */}
          <div className="relative inline-block mb-4">
            {tokenImage ? (
              <img
                src={tokenImage}
                alt="Character token"
                className="w-32 h-32 rounded-full object-cover border-4 border-violet-500 shadow-xl shadow-violet-500/20 mx-auto"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border-4 border-slate-600 shadow-xl mx-auto">
                {race && characterClass ? (
                  <span className="text-4xl font-bold text-slate-400">
                    {draft.name ? draft.name.charAt(0).toUpperCase() : '?'}
                  </span>
                ) : (
                  <User className="w-12 h-12 text-slate-500" />
                )}
              </div>
            )}
            {/* Level badge */}
            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg border-2 border-background shadow-lg">
              {draft.level}
            </div>
          </div>

          {/* Name Input */}
          <Input
            value={draft.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Character Name"
            className="text-center text-lg font-semibold border-none bg-transparent focus-visible:ring-1 mb-1"
          />

          {/* Race/Class/Subclass */}
          <div className="text-sm text-muted-foreground">
            {race?.name ?? <span className="text-slate-500">Select Race</span>}
            {' '}
            {characterClass?.name ?? <span className="text-slate-500">Select Class</span>}
            {subclass && (
              <span className="text-primary"> ({subclass.name})</span>
            )}
          </div>
        </div>

        {/* Core Stats Row */}
        {hasRaceOrClass && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="text-center p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <Heart className="w-4 h-4 mx-auto mb-1 text-rose-400" />
              <div className="text-2xl font-bold text-rose-400">{hp || '—'}</div>
              <div className="text-xs text-muted-foreground">HP</div>
            </div>
            <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Shield className="w-4 h-4 mx-auto mb-1 text-blue-400" />
              <div className="text-2xl font-bold text-blue-400">{ac}</div>
              <div className="text-xs text-muted-foreground">AC</div>
            </div>
            <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <Footprints className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
              <div className="text-2xl font-bold text-emerald-400">{race?.speed ?? 30}</div>
              <div className="text-xs text-muted-foreground">Speed</div>
            </div>
          </div>
        )}

        {/* Ability Scores */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Ability Scores
          </h4>
          <div className="grid grid-cols-6 gap-1">
            {Object.entries(finalAbilityScores).map(([ability, score]) => {
              const mod = getAbilityModifier(score)
              const hasBonus = draft.abilityBonusPlus2 === ability || draft.abilityBonusPlus1 === ability
              return (
                <div
                  key={ability}
                  className={cn(
                    'text-center p-2 rounded-lg border',
                    hasBonus
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-muted/50 border-transparent'
                  )}
                >
                  <div className="text-[10px] text-muted-foreground font-medium">
                    {ABILITY_LABELS[ability]}
                  </div>
                  <div className="text-lg font-bold">{score}</div>
                  <div className={cn(
                    'text-xs font-medium',
                    mod >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {formatModifier(mod)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Proficiency Bonus */}
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg mb-4">
          <span className="text-sm text-muted-foreground">Proficiency Bonus</span>
          <span className="font-bold text-lg">{formatModifier(proficiencyBonus)}</span>
        </div>

        {/* Equipment Preview */}
        {hasEquipment && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Swords className="w-3 h-3" />
              Equipment
            </h4>
            <div className="space-y-1 text-sm">
              {meleeWeapon && (
                <div className="flex justify-between px-2 py-1 bg-muted/30 rounded">
                  <span>{meleeWeapon.name}</span>
                  <span className="text-muted-foreground">{meleeWeapon.damage}</span>
                </div>
              )}
              {rangedWeapon && (
                <div className="flex justify-between px-2 py-1 bg-muted/30 rounded">
                  <span>{rangedWeapon.name}</span>
                  <span className="text-muted-foreground">{rangedWeapon.damage}</span>
                </div>
              )}
              {armor && (
                <div className="flex justify-between px-2 py-1 bg-muted/30 rounded">
                  <span>{armor.name}</span>
                  <span className="text-muted-foreground">AC {armor.baseAC}</span>
                </div>
              )}
              {draft.shieldEquipped && (
                <div className="flex justify-between px-2 py-1 bg-muted/30 rounded">
                  <span>Shield</span>
                  <span className="text-muted-foreground">+2 AC</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Class Features */}
        {(classFeatures.length > 0 || subclassFeatures.length > 0) && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Features
            </h4>
            <div className="space-y-1 max-h-[150px] overflow-y-auto">
              {[...classFeatures, ...subclassFeatures].map((feature, idx) => (
                <div
                  key={`${feature.name}-${idx}`}
                  className="text-xs px-2 py-1.5 bg-muted/30 rounded flex justify-between items-center"
                >
                  <span className="font-medium truncate">{feature.name}</span>
                  <span className="text-muted-foreground text-[10px] ml-2">Lv{feature.level}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State Hints */}
        {!hasRaceOrClass && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Select a race and class to see your character come to life!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
