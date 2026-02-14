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
  calculateMulticlassHP,
  calculateAC,
  getDraftTotalLevel,
  getAllDraftAsiSelections,
} from '@/stores/characterStore'
import { getAbilityModifier, getProficiencyBonus } from '@/types'
import { getCharacterTokenImage } from '@/lib/tokenImages'
import { TokenImageUpload } from './TokenImageUpload'
import type { Character } from '@/types'
import {
  Heart,
  Shield,
  Footprints,
  Swords,
  Sparkles,
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
  const { draft, setName, setCustomTokenImage } = useCharacterStore()

  const race = draft.raceId ? getRaceById(draft.raceId) ?? null : null
  const primaryEntry = draft.classEntries.find(e => e.level > 0) ?? draft.classEntries[0] ?? null
  const characterClass = primaryEntry ? getClassById(primaryEntry.classId) ?? null : null
  const totalLevel = getDraftTotalLevel(draft)
  const meleeWeapon = draft.meleeWeaponId ? getWeaponById(draft.meleeWeaponId) ?? null : null
  const rangedWeapon = draft.rangedWeaponId ? getWeaponById(draft.rangedWeaponId) ?? null : null
  const armor = draft.armorId ? getArmorById(draft.armorId) ?? null : null

  // Calculate final stats
  const finalAbilityScores = calculateFinalAbilityScores(
    draft.baseAbilityScores,
    draft.abilityBonusPlus2,
    draft.abilityBonusPlus1,
    draft.abilityBonusMode,
    draft.abilityBonusPlus1Trio,
    getAllDraftAsiSelections(draft)
  )
  const proficiencyBonus = getProficiencyBonus(totalLevel)

  // Collect origin feats from human and background choices
  const originFeats = [draft.humanOriginFeat, draft.backgroundOriginFeat].filter(
    (f): f is NonNullable<typeof f> => f !== null
  )

  const activeEntries = draft.classEntries.filter(e => e.level > 0)
  const hp = activeEntries.length > 0
    ? calculateMulticlassHP(activeEntries, finalAbilityScores.constitution, originFeats, race?.abilities ?? [])
    : 0

  const ac = calculateAC(
    armor?.category !== 'shield' ? armor : null,
    draft.shieldEquipped,
    finalAbilityScores.dexterity
  )

  // Get features from all class entries
  const allClassFeatures = useMemo(() => {
    const features: ReturnType<typeof getClassFeaturesByLevel> = []
    for (const entry of draft.classEntries) {
      if (entry.level <= 0) continue
      const cd = getClassById(entry.classId)
      if (!cd) continue
      features.push(...getClassFeaturesByLevel(cd, entry.level))
      if (entry.subclassId) {
        features.push(...getSubclassFeaturesByLevel(cd, entry.subclassId, entry.level))
      }
    }
    return features
  }, [draft.classEntries])

  // Get token preview image (custom upload takes priority)
  const autoTokenImage = useMemo(() => {
    if (!race || !characterClass) return null
    const mockCharacter = { race, class: characterClass } as Character
    return getCharacterTokenImage(mockCharacter)
  }, [race, characterClass])
  const tokenImage = draft.customTokenImage ?? autoTokenImage

  // Calculate if we have enough to show certain sections
  const hasRaceOrClass = race || characterClass
  const hasEquipment = meleeWeapon || rangedWeapon || armor || draft.shieldEquipped

  return (
    <Card className="sticky top-4">
      <CardContent className="pt-6">
        {/* Character Portrait & Name */}
        <div className="text-center mb-6">
          {/* Token with upload */}
          <div className="relative inline-block mb-4">
            {draft.customTokenImage ? (
              <TokenImageUpload
                currentImage={draft.customTokenImage}
                onImageChange={setCustomTokenImage}
              />
            ) : tokenImage ? (
              <div className="relative group">
                <img
                  src={tokenImage}
                  alt="Character token"
                  className="w-32 h-32 rounded-full object-cover border-4 border-violet-500 shadow-xl shadow-violet-500/20 mx-auto"
                />
                <TokenImageUpload
                  currentImage={null}
                  onImageChange={setCustomTokenImage}
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity mx-auto"
                />
              </div>
            ) : (
              <TokenImageUpload
                currentImage={null}
                onImageChange={setCustomTokenImage}
              />
            )}
            {/* Level badge */}
            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg border-2 border-background shadow-lg z-10">
              {totalLevel}
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
            {activeEntries.length > 0 ? (
              activeEntries.map((entry, i) => {
                const cd = getClassById(entry.classId)
                const sc = cd?.subclasses.find(s => s.id === entry.subclassId)
                return (
                  <span key={entry.classId}>
                    {i > 0 && ' / '}
                    {cd?.name ?? entry.classId} {entry.level}
                    {sc && <span className="text-primary"> ({sc.name})</span>}
                  </span>
                )
              })
            ) : (
              <span className="text-slate-500">Select Class</span>
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
              const hasBonus = draft.abilityBonusPlus2 === ability || draft.abilityBonusPlus1 === ability || draft.abilityBonusPlus1Trio.includes(ability as keyof typeof draft.baseAbilityScores)
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
        {allClassFeatures.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Features
            </h4>
            <div className="space-y-1 max-h-[150px] overflow-y-auto">
              {allClassFeatures.map((feature, idx) => (
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
