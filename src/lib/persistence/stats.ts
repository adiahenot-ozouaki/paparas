// ==========================================================================
// persistence/stats.ts — LifetimeStats localStorage + merge pure.
// ==========================================================================

import type { ComboType, SpecialRuleType } from '../../types'

export const STORAGE_KEY_ACTIVE_GAME = 'kora:activeGame:v1'
export const STORAGE_KEY_LIFETIME_STATS = 'kora:lifetimeStats:v1'

export interface LifetimeStats {
  gamesPlayed: number
  gamesWon: number
  totalRoundsWon: number
  totalTricksWon: number
  bestComboEver: ComboType | null
  netGainTotal: number
  totalGains: number
  totalLosses: number
  maxCapitalEver: number
  minCapitalEver: number
  comboCounts: Record<ComboType, number>
  specialRuleCounts: Record<SpecialRuleType, number>
}

export const DEFAULT_LIFETIME_STATS: LifetimeStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalRoundsWon: 0,
  totalTricksWon: 0,
  bestComboEver: null,
  netGainTotal: 0,
  totalGains: 0,
  totalLosses: 0,
  maxCapitalEver: 0,
  minCapitalEver: 0,
  comboCounts: { simple: 0, kora: 0, '33': 0, trinity: 0, kmt: 0 },
  specialRuleCounts: { flush: 0, '21': 0, t7: 0 },
}

function comboMultiplier(c: ComboType | null): number {
  if (!c) return 0
  const map: Record<ComboType, number> = { simple: 1, kora: 2, '33': 4, trinity: 8, kmt: 16 }
  return map[c] ?? 0
}

/** Merge upward (max) — adapté reprise 1 appareil + cloud, pas addition multi-device. */
export function mergeLifetimeStats(a: LifetimeStats, b: LifetimeStats): LifetimeStats {
  const comboCounts = { ...DEFAULT_LIFETIME_STATS.comboCounts }
  for (const k of Object.keys(comboCounts) as ComboType[]) {
    comboCounts[k] = Math.max(a.comboCounts[k] ?? 0, b.comboCounts[k] ?? 0)
  }
  const specialRuleCounts = { ...DEFAULT_LIFETIME_STATS.specialRuleCounts }
  for (const k of Object.keys(specialRuleCounts) as SpecialRuleType[]) {
    specialRuleCounts[k] = Math.max(a.specialRuleCounts[k] ?? 0, b.specialRuleCounts[k] ?? 0)
  }

  let minCapitalEver = a.minCapitalEver
  if (b.minCapitalEver > 0) {
    minCapitalEver = minCapitalEver === 0 ? b.minCapitalEver : Math.min(minCapitalEver, b.minCapitalEver)
  }

  const bestComboEver =
    comboMultiplier(a.bestComboEver) >= comboMultiplier(b.bestComboEver) ? a.bestComboEver : b.bestComboEver

  return {
    gamesPlayed: Math.max(a.gamesPlayed, b.gamesPlayed),
    gamesWon: Math.max(a.gamesWon, b.gamesWon),
    totalRoundsWon: Math.max(a.totalRoundsWon, b.totalRoundsWon),
    totalTricksWon: Math.max(a.totalTricksWon, b.totalTricksWon),
    bestComboEver,
    netGainTotal: Math.max(a.netGainTotal, b.netGainTotal),
    totalGains: Math.max(a.totalGains, b.totalGains),
    totalLosses: Math.max(a.totalLosses, b.totalLosses),
    maxCapitalEver: Math.max(a.maxCapitalEver, b.maxCapitalEver),
    minCapitalEver,
    comboCounts,
    specialRuleCounts,
  }
}

export function normalizeLifetimeStats(raw: Partial<LifetimeStats> | null | undefined): LifetimeStats {
  if (!raw) return { ...DEFAULT_LIFETIME_STATS, comboCounts: { ...DEFAULT_LIFETIME_STATS.comboCounts }, specialRuleCounts: { ...DEFAULT_LIFETIME_STATS.specialRuleCounts } }
  return {
    ...DEFAULT_LIFETIME_STATS,
    ...raw,
    comboCounts: { ...DEFAULT_LIFETIME_STATS.comboCounts, ...(raw.comboCounts ?? {}) },
    specialRuleCounts: { ...DEFAULT_LIFETIME_STATS.specialRuleCounts, ...(raw.specialRuleCounts ?? {}) },
  }
}

export function loadLocalLifetimeStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIFETIME_STATS)
    if (!raw) return normalizeLifetimeStats(null)
    return normalizeLifetimeStats(JSON.parse(raw) as Partial<LifetimeStats>)
  } catch {
    return normalizeLifetimeStats(null)
  }
}

export function saveLocalLifetimeStats(stats: LifetimeStats): void {
  try {
    localStorage.setItem(STORAGE_KEY_LIFETIME_STATS, JSON.stringify(stats))
  } catch {
    // quota / mode privé
  }
}

/** Forme snake_case attendue par kora_merge_lifetime_stats. */
export function lifetimeStatsToDbPayload(stats: LifetimeStats): Record<string, unknown> {
  return {
    games_played: stats.gamesPlayed,
    games_won: stats.gamesWon,
    total_rounds_won: stats.totalRoundsWon,
    total_tricks_won: stats.totalTricksWon,
    best_combo: stats.bestComboEver,
    net_gain_total: stats.netGainTotal,
    total_gains: stats.totalGains,
    total_losses: stats.totalLosses,
    max_capital_ever: stats.maxCapitalEver,
    min_capital_ever: stats.minCapitalEver,
    combo_counts: stats.comboCounts,
    special_rule_counts: stats.specialRuleCounts,
  }
}

export function lifetimeStatsFromDbRow(row: {
  games_played: number
  games_won: number
  total_rounds_won: number
  total_tricks_won: number
  best_combo: string | null
  net_gain_total: number
  total_gains: number
  total_losses: number
  max_capital_ever: number
  min_capital_ever: number
  combo_counts: Record<string, number> | null
  special_rule_counts: Record<string, number> | null
}): LifetimeStats {
  return normalizeLifetimeStats({
    gamesPlayed: row.games_played,
    gamesWon: row.games_won,
    totalRoundsWon: row.total_rounds_won,
    totalTricksWon: row.total_tricks_won,
    bestComboEver: (row.best_combo as ComboType | null) ?? null,
    netGainTotal: row.net_gain_total,
    totalGains: row.total_gains,
    totalLosses: row.total_losses,
    maxCapitalEver: row.max_capital_ever,
    minCapitalEver: row.min_capital_ever,
    comboCounts: row.combo_counts as LifetimeStats['comboCounts'] | undefined,
    specialRuleCounts: row.special_rule_counts as LifetimeStats['specialRuleCounts'] | undefined,
  })
}
