// ==========================================================================
// game/progression.ts — Niveau / XP dérivés purement de LifetimeStats.
//
// Pas de stockage séparé : tout se recalcule depuis les stats lifetime.
// Formule d'XP (pondérée) pour qu'un round gagné ou un combo compte,
// pas seulement les victoires de partie.
// ==========================================================================

import type { LifetimeStats } from '../lib/persistence/stats'
import type { ComboType } from '../types'

/** XP par événement. */
export const XP = {
  gamePlayed: 5,
  gameWon: 40,
  roundWon: 8,
  trickWon: 1,
  combo: {
    simple: 0,
    kora: 12,
    '33': 28,
    trinity: 60,
    kmt: 120,
  } satisfies Record<ComboType, number>,
  special: {
    flush: 35,
    '21': 35,
    t7: 35,
  },
} as const

/**
 * Courbe de niveaux : XP cumulée requise pour atteindre le niveau N.
 * Niveau 1 = 0 XP. Chaque niveau demande un peu plus que le précédent.
 *   need(n) = 80 + 35*(n-1)   pour passer de n → n+1
 */
export function xpToNextLevel(level: number): number {
  const n = Math.max(1, Math.floor(level))
  return 80 + 35 * (n - 1)
}

/** XP totale nécessaire pour être au moins au niveau `level` (level ≥ 1). */
export function cumulativeXpForLevel(level: number): number {
  const target = Math.max(1, Math.floor(level))
  let total = 0
  for (let l = 1; l < target; l++) total += xpToNextLevel(l)
  return total
}

export function computeTotalXp(stats: LifetimeStats): number {
  let xp = 0
  xp += stats.gamesPlayed * XP.gamePlayed
  xp += stats.gamesWon * XP.gameWon
  xp += stats.totalRoundsWon * XP.roundWon
  xp += stats.totalTricksWon * XP.trickWon

  for (const key of Object.keys(XP.combo) as ComboType[]) {
    xp += (stats.comboCounts[key] ?? 0) * XP.combo[key]
  }
  xp += (stats.specialRuleCounts.flush ?? 0) * XP.special.flush
  xp += (stats.specialRuleCounts['21'] ?? 0) * XP.special['21']
  xp += (stats.specialRuleCounts.t7 ?? 0) * XP.special.t7

  return Math.max(0, Math.floor(xp))
}

export function levelFromTotalXp(totalXp: number): number {
  let level = 1
  let remaining = Math.max(0, totalXp)
  // Cap de sécurité anti-boucle infinie
  for (let i = 0; i < 500; i++) {
    const need = xpToNextLevel(level)
    if (remaining < need) break
    remaining -= need
    level += 1
  }
  return level
}

export type RankTitle =
  | 'Novice'
  | 'Apprenti'
  | 'Joueur'
  | 'Stratège'
  | 'As de table'
  | 'Maître Kora'
  | 'Légende'

export function rankTitleForLevel(level: number): RankTitle {
  if (level >= 40) return 'Légende'
  if (level >= 25) return 'Maître Kora'
  if (level >= 15) return 'As de table'
  if (level >= 10) return 'Stratège'
  if (level >= 5) return 'Joueur'
  if (level >= 2) return 'Apprenti'
  return 'Novice'
}

export interface PlayerProgress {
  totalXp: number
  level: number
  /** XP déjà acquise dans le niveau courant (0 → need-1). */
  xpInLevel: number
  /** XP nécessaire pour passer au niveau suivant. */
  xpToNext: number
  /** 0–100 pour la barre. */
  percent: number
  title: RankTitle
}

export function getPlayerProgress(stats: LifetimeStats): PlayerProgress {
  const totalXp = computeTotalXp(stats)
  const level = levelFromTotalXp(totalXp)
  const floorXp = cumulativeXpForLevel(level)
  const xpInLevel = totalXp - floorXp
  const xpToNext = xpToNextLevel(level)
  const percent = xpToNext > 0 ? Math.min(100, Math.round((xpInLevel / xpToNext) * 100)) : 100

  return {
    totalXp,
    level,
    xpInLevel,
    xpToNext,
    percent,
    title: rankTitleForLevel(level),
  }
}

/** Compat : ancienne formule purement basée sur les victoires (5 wins / niveau). */
export const LEGACY_WINS_PER_LEVEL = 5

export function legacyLevelFromWins(gamesWon: number): number {
  return 1 + Math.floor(Math.max(0, gamesWon) / LEGACY_WINS_PER_LEVEL)
}
