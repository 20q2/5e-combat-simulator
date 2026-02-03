import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCombatStore, getCurrentCombatant } from '@/stores/combatStore'
import { getCombatantTokenImage } from '@/lib/tokenImages'
import { getMaxAttacksPerAction } from '@/engine/classAbilities'
import type { Character, Monster, Combatant } from '@/types'
import { getAbilityModifier } from '@/types'
import { Sword, Crosshair, Shield, Footprints, Zap, type LucideIcon } from 'lucide-react'

function StatBlock({ label, value, subtext, icon: Icon }: { label: string; value: string | number; subtext?: string; icon?: LucideIcon }) {
  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className="text-lg font-bold">{value}</div>
      {subtext && <div className="text-xs text-muted-foreground">{subtext}</div>}
    </div>
  )
}

function AbilityScoreDisplay({ name, score }: { name: string; score: number }) {
  const mod = getAbilityModifier(score)
  const modStr = mod >= 0 ? `+${mod}` : `${mod}`

  return (
    <div className="text-center p-2 bg-slate-800/50 rounded">
      <div className="text-xs text-muted-foreground uppercase">{name.substring(0, 3)}</div>
      <div className="text-sm font-bold">{score}</div>
      <div className="text-xs text-primary">{modStr}</div>
    </div>
  )
}

function ConditionBadge({ condition }: { condition: string }) {
  const colors: Record<string, string> = {
    unconscious: 'bg-rose-900 text-rose-200',
    poisoned: 'bg-emerald-900 text-emerald-200',
    frightened: 'bg-purple-900 text-purple-200',
    charmed: 'bg-pink-900 text-pink-200',
    blinded: 'bg-slate-700 text-slate-200',
    deafened: 'bg-slate-700 text-slate-200',
    paralyzed: 'bg-amber-900 text-amber-200',
    stunned: 'bg-amber-900 text-amber-200',
    grappled: 'bg-orange-900 text-orange-200',
    restrained: 'bg-orange-900 text-orange-200',
    prone: 'bg-yellow-900 text-yellow-200',
    dodging: 'bg-sky-900 text-sky-200',
  }

  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full', colors[condition] || 'bg-slate-700 text-slate-200')}>
      {condition}
    </span>
  )
}

function ActionEconomyIndicator({ combatant }: { combatant: Combatant }) {
  return (
    <div className="flex gap-3 justify-center py-2 border-y border-slate-700">
      <div className="flex items-center gap-1.5">
        <div className={cn(
          'w-3 h-3 rounded-full border-2',
          combatant.hasActed ? 'bg-slate-600 border-slate-500' : 'bg-emerald-500 border-emerald-400'
        )} />
        <span className={cn('text-xs', combatant.hasActed ? 'text-slate-500' : 'text-emerald-400')}>
          Action
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={cn(
          'w-3 h-3 rounded-full border-2',
          combatant.hasBonusActed ? 'bg-slate-600 border-slate-500' : 'bg-amber-500 border-amber-400'
        )} />
        <span className={cn('text-xs', combatant.hasBonusActed ? 'text-slate-500' : 'text-amber-400')}>
          Bonus
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={cn(
          'w-3 h-3 rounded-full border-2',
          combatant.hasReacted ? 'bg-slate-600 border-slate-500' : 'bg-violet-500 border-violet-400'
        )} />
        <span className={cn('text-xs', combatant.hasReacted ? 'text-slate-500' : 'text-violet-400')}>
          Reaction
        </span>
      </div>
    </div>
  )
}

function TargetActionsPanel({ target, currentCombatant }: { target: Combatant; currentCombatant: Combatant }) {
  const { getValidTargets, performAttack, selectCombatant } = useCombatStore()

  // Get weapons for the current combatant
  const isCharacter = currentCombatant.type === 'character'
  const character = isCharacter ? currentCombatant.data as Character : null
  const monster = !isCharacter ? currentCombatant.data as Monster : null

  const meleeWeapon = character?.equipment?.meleeWeapon
  const rangedWeapon = character?.equipment?.rangedWeapon
  const monsterAction = monster?.actions.find(a => a.attackBonus !== undefined)

  // Check if target is in range
  const validTargets = getValidTargets(currentCombatant.id, meleeWeapon, monsterAction, rangedWeapon)
  const isInRange = validTargets.some(t => t.id === target.id)

  // Check if we can attack (have attacks remaining)
  const maxAttacks = getMaxAttacksPerAction(currentCombatant)
  const attacksRemaining = maxAttacks - currentCombatant.attacksMadeThisTurn
  // Can attack if: in range AND have attacks remaining AND (haven't used action OR mid-Attack action)
  // attacksMadeThisTurn > 0 means we're in the middle of an Attack action with Extra Attack
  const canAttack = isInRange && attacksRemaining > 0 && (!currentCombatant.hasActed || currentCombatant.attacksMadeThisTurn > 0)

  // Determine which weapon would be used based on range
  const getWeaponInfo = () => {
    if (!isCharacter) {
      return { name: monsterAction?.name ?? 'Attack', icon: Sword }
    }

    // Check if target is in melee range (5ft for most weapons)
    const dx = Math.abs(target.position.x - currentCombatant.position.x)
    const dy = Math.abs(target.position.y - currentCombatant.position.y)
    const distance = Math.max(dx, dy) * 5

    if (meleeWeapon && distance <= 5) {
      return { name: meleeWeapon.name, icon: Sword }
    }
    if (rangedWeapon) {
      return { name: rangedWeapon.name, icon: Crosshair }
    }
    if (meleeWeapon) {
      return { name: meleeWeapon.name, icon: Sword }
    }
    return { name: 'Unarmed Strike', icon: Sword }
  }

  const weaponInfo = getWeaponInfo()
  const WeaponIcon = weaponInfo.icon

  const handleAttack = () => {
    performAttack(currentCombatant.id, target.id, meleeWeapon, monsterAction, rangedWeapon)
    // Deselect after attack so the panel updates
    selectCombatant(undefined)
  }

  return (
    <div className="pt-3 border-t border-slate-700">
      <div className="text-xs text-muted-foreground mb-2">Target Actions</div>
      <div className="flex flex-col gap-2">
        <Button
          variant="destructive"
          size="sm"
          className="w-full justify-start gap-2"
          disabled={!canAttack}
          onClick={handleAttack}
        >
          <WeaponIcon className="w-4 h-4" />
          <span>Attack with {weaponInfo.name}</span>
          {attacksRemaining > 1 && (
            <span className="ml-auto text-xs opacity-75">({attacksRemaining} left)</span>
          )}
        </Button>
        {!isInRange && (
          <p className="text-xs text-muted-foreground italic">Target is out of range</p>
        )}
        {isInRange && currentCombatant.hasActed && attacksRemaining === 0 && (
          <p className="text-xs text-muted-foreground italic">No attacks remaining this turn</p>
        )}
      </div>
    </div>
  )
}

export function CombatantPanel() {
  const state = useCombatStore()
  const { selectedCombatantId, combatants, phase } = state
  const currentCombatant = getCurrentCombatant(state)

  // Show current combatant if none selected, otherwise show selected
  const displayCombatant = selectedCombatantId
    ? combatants.find(c => c.id === selectedCombatantId)
    : currentCombatant

  if (!displayCombatant) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Combatant Info</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {phase === 'setup' ? 'Select a combatant to view details' : 'No combatant selected'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const isCharacter = displayCombatant.type === 'character'
  const character = isCharacter ? displayCombatant.data as Character : null
  const monster = !isCharacter ? displayCombatant.data as Monster : null

  const abilityScores = character?.abilityScores ?? monster?.abilityScores
  const ac = character?.ac ?? monster?.ac ?? 10
  const speed = character?.speed ?? monster?.speed.walk ?? 30
  const hpPercent = Math.round((displayCombatant.currentHp / displayCombatant.maxHp) * 100)

  const isCurrentTurn = currentCombatant?.id === displayCombatant.id

  const tokenImage = getCombatantTokenImage(displayCombatant.type, displayCombatant.data)

  return (
    <Card className={cn(isCurrentTurn && phase === 'combat' && 'border-amber-500/50')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tokenImage ? (
              <img
                src={tokenImage}
                alt={displayCombatant.name}
                className={cn(
                  'w-10 h-10 rounded-full object-cover border-2',
                  isCharacter ? 'border-violet-500' : 'border-rose-500'
                )}
              />
            ) : (
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold',
                isCharacter ? 'bg-violet-600' : 'bg-rose-600'
              )}>
                {displayCombatant.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <CardTitle className="text-sm">{displayCombatant.name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {isCharacter
                  ? `Level ${character!.level} ${character!.race.name} ${character!.class.name}`
                  : `${monster!.size} ${monster!.type}`}
              </p>
            </div>
          </div>
          {isCurrentTurn && phase === 'combat' && (
            <span className="text-xs bg-amber-500 text-slate-900 font-semibold px-2 py-1 rounded">
              CURRENT
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* HP Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Hit Points</span>
            <span className={cn(
              'font-medium',
              hpPercent > 50 ? 'text-emerald-400' : hpPercent > 25 ? 'text-amber-400' : 'text-rose-400'
            )}>
              {displayCombatant.currentHp} / {displayCombatant.maxHp}
            </span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all rounded-full',
                hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 25 ? 'bg-amber-500' : 'bg-rose-500'
              )}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          {displayCombatant.temporaryHp > 0 && (
            <div className="text-xs text-sky-400 mt-1">
              +{displayCombatant.temporaryHp} temporary HP
            </div>
          )}
        </div>

        {/* Core Stats */}
        <div className="grid grid-cols-3 gap-2 py-2">
          <StatBlock label="AC" value={ac} icon={Shield} />
          <StatBlock label="Speed" value={`${speed} ft`} icon={Footprints} />
          <StatBlock label="Initiative" value={displayCombatant.initiative || '—'} icon={Zap} />
        </div>

        {/* Action Economy (only during combat) */}
        {phase === 'combat' && <ActionEconomyIndicator combatant={displayCombatant} />}

        {/* Ability Scores */}
        {abilityScores && (
          <div className="grid grid-cols-6 gap-1">
            <AbilityScoreDisplay name="Strength" score={abilityScores.strength} />
            <AbilityScoreDisplay name="Dexterity" score={abilityScores.dexterity} />
            <AbilityScoreDisplay name="Constitution" score={abilityScores.constitution} />
            <AbilityScoreDisplay name="Intelligence" score={abilityScores.intelligence} />
            <AbilityScoreDisplay name="Wisdom" score={abilityScores.wisdom} />
            <AbilityScoreDisplay name="Charisma" score={abilityScores.charisma} />
          </div>
        )}

        {/* Conditions */}
        {displayCombatant.conditions.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Conditions</div>
            <div className="flex flex-wrap gap-1">
              {displayCombatant.conditions.map((c, i) => (
                <ConditionBadge key={i} condition={c.condition} />
              ))}
            </div>
          </div>
        )}

        {/* Character-specific: Equipment & Spells */}
        {character && (
          <>
            {(character.equipment?.meleeWeapon || character.equipment?.rangedWeapon) && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Weapons</div>
                <div className="space-y-1">
                  {character.equipment.meleeWeapon && (
                    <div className="text-sm">
                      {character.equipment.meleeWeapon.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({character.equipment.meleeWeapon.damage} {character.equipment.meleeWeapon.damageType})
                      </span>
                    </div>
                  )}
                  {character.equipment.rangedWeapon && (
                    <div className="text-sm">
                      {character.equipment.rangedWeapon.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({character.equipment.rangedWeapon.damage} {character.equipment.rangedWeapon.damageType})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {character.knownSpells && character.knownSpells.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  Spells ({character.knownSpells.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {character.knownSpells.slice(0, 5).map(spell => (
                    <span key={spell.id} className="text-xs bg-violet-900/50 text-violet-200 px-2 py-0.5 rounded">
                      {spell.name}
                    </span>
                  ))}
                  {character.knownSpells.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{character.knownSpells.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Monster-specific: Actions */}
        {monster && monster.actions.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Actions</div>
            <div className="space-y-1">
              {monster.actions.slice(0, 3).map((action, i) => (
                <div key={i} className="text-xs">
                  <span className="font-medium">{action.name}</span>
                  {action.attackBonus !== undefined && (
                    <span className="text-muted-foreground ml-1">
                      +{action.attackBonus} to hit
                    </span>
                  )}
                  {action.damage && (
                    <span className="text-rose-400 ml-1">
                      ({action.damage})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Death Saves */}
        {displayCombatant.currentHp <= 0 && displayCombatant.type === 'character' && (
          <div className="pt-2 border-t border-slate-700">
            <div className="text-xs text-muted-foreground mb-2">Death Saves</div>
            <div className="flex justify-around">
              <div className="text-center">
                <div className="text-xs text-emerald-400 mb-1">Successes</div>
                <div className="flex gap-1 justify-center">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={cn(
                        'w-4 h-4 rounded-full border-2',
                        i < displayCombatant.deathSaves.successes
                          ? 'bg-emerald-500 border-emerald-400'
                          : 'border-slate-600'
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-rose-400 mb-1">Failures</div>
                <div className="flex gap-1 justify-center">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={cn(
                        'w-4 h-4 rounded-full border-2',
                        i < displayCombatant.deathSaves.failures
                          ? 'bg-rose-500 border-rose-400'
                          : 'border-slate-600'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
            {displayCombatant.isStable && (
              <p className="text-xs text-emerald-400 text-center mt-2">Stabilized</p>
            )}
          </div>
        )}

        {/* Target Actions - show when viewing an enemy during combat on player's turn */}
        {phase === 'combat' &&
          currentCombatant &&
          currentCombatant.type === 'character' &&
          displayCombatant.id !== currentCombatant.id &&
          displayCombatant.type !== currentCombatant.type &&
          displayCombatant.currentHp > 0 && (
            <TargetActionsPanel target={displayCombatant} currentCombatant={currentCombatant} />
          )}
      </CardContent>
    </Card>
  )
}
