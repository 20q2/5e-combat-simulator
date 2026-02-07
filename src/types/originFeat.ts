// ============================================
// Origin Feat Combat Types
// ============================================
// Combat-specific types for origin feats
// Non-combat feats (crafter, musician, skilled, tough) are not represented here

import type { OriginFeatId } from '@/data/originFeats'

// Origin feat trigger types
export type OriginFeatTrigger =
  | 'passive'           // Always active (Enhanced Unarmed Strike)
  | 'on_initiative'     // When rolling initiative (Alert proficiency bonus)
  | 'post_initiative'   // After initiative rolled (Alert swap)
  | 'on_attack_roll'    // Before/during attack roll (Lucky self-advantage)
  | 'on_damage_roll'    // When rolling damage (Savage Attacker)
  | 'on_hit'            // After successful hit (Tavern Brawler push)
  | 'on_enemy_attack'   // When enemy attacks you (Lucky disadvantage)
  | 'action'            // Requires action (Healer Battle Medic)
  | 'on_healing_roll'   // When rolling healing dice (Healer rerolls)

// Base origin feat combat interface
export interface OriginFeatCombatBase {
  id: OriginFeatId
  type: string
  trigger: OriginFeatTrigger
  maxUses?: number      // Per combat/long rest limit
  usesPerTurn?: number  // Per turn limit
}

// ============================================
// Specific Feat Types
// ============================================

// Alert - Initiative bonuses
export interface AlertFeatCombat extends OriginFeatCombatBase {
  type: 'alert'
  trigger: 'on_initiative'
  initiativeProficiencyBonus: true
  canSwapInitiative: true
}

// Healer - Battle Medic and healing rerolls
export interface HealerFeatCombat extends OriginFeatCombatBase {
  type: 'healer'
  trigger: 'action'
  requiresHealerKit: true
  healingRerollOnes: true
}

// Lucky - Luck points for advantage/disadvantage
export interface LuckyFeatCombat extends OriginFeatCombatBase {
  type: 'lucky'
  trigger: 'on_attack_roll'
  luckPointsEqualProficiency: true
}

// Savage Attacker - Roll damage twice
export interface SavageAttackerFeatCombat extends OriginFeatCombatBase {
  type: 'savage_attacker'
  trigger: 'on_damage_roll'
  usesPerTurn: 1
}

// Tavern Brawler - Enhanced unarmed strike
export interface TavernBrawlerFeatCombat extends OriginFeatCombatBase {
  type: 'tavern_brawler'
  trigger: 'passive'
  enhancedUnarmedDie: '1d4'
  rerollOnes: true
  pushDistance: 5
  pushOncePerTurn: true
}

// Musician - Heroic Inspiration
export interface MusicianFeatCombat extends OriginFeatCombatBase {
  type: 'musician'
  trigger: 'on_attack_roll'  // Can also be used on saves
  grantsHeroicInspiration: true
}

// ============================================
// Union Type
// ============================================

export type OriginFeatCombat =
  | AlertFeatCombat
  | HealerFeatCombat
  | LuckyFeatCombat
  | SavageAttackerFeatCombat
  | TavernBrawlerFeatCombat
  | MusicianFeatCombat

// ============================================
// Type Guards
// ============================================

export function isAlertFeat(f: OriginFeatCombat): f is AlertFeatCombat {
  return f.type === 'alert'
}

export function isHealerFeat(f: OriginFeatCombat): f is HealerFeatCombat {
  return f.type === 'healer'
}

export function isLuckyFeat(f: OriginFeatCombat): f is LuckyFeatCombat {
  return f.type === 'lucky'
}

export function isSavageAttackerFeat(f: OriginFeatCombat): f is SavageAttackerFeatCombat {
  return f.type === 'savage_attacker'
}

export function isTavernBrawlerFeat(f: OriginFeatCombat): f is TavernBrawlerFeatCombat {
  return f.type === 'tavern_brawler'
}

export function isMusicianFeat(f: OriginFeatCombat): f is MusicianFeatCombat {
  return f.type === 'musician'
}
