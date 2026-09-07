// ==========================================================================
// persistence/stats.ts — LifetimeStats localStorage + merge pure.
// ==========================================================================

import type { ComboType, SpecialRuleType } from '../../types'

export const STORAGE_KEY_ACTIVE_GAME = 'kora:activeGame:v1'
export const STORAGE_KEY_LIFETIME_STATS = 'kora:lifetimeStats:v1'

/** Adversaires IA solo (sièges 1–3). */
export const OPPONENT_IDS = ['binu', 'lebe', 'goju'] as const
export type OpponentId = (typeof OPPONENT_IDS)[number]

export const OPPONENT_META: Record<
  OpponentId,
  { name: string; seatIndex: number; avatar: string; personality: string }
> = {
  binu: { name: 'Binu', seatIndex: 1, avatar: 'cat', personality: 'Agressif' },
  lebe: { name: 'Lebe', seatIndex: 2, avatar: 'cat', personality: 'Conservateur' },
  goju: { name: 'Goju', seatIndex: 3, avatar: 'turtle', personality: 'Opportuniste' },
}

export interface OpponentStats {
  roundsWon: number
  gamesPlayed: number
  timesFinishedAhead: number
  timesFinishedBehind: number
}

export type OpponentStatsMap = Record<OpponentId, OpponentStats>

export const DEFAULT_OPPONENT_STATS: OpponentStats = {
  roundsWon: 0,
  gamesPlayed: 0,
  timesFinishedAhead: 0,
  timesFinishedBehind: 0,
}

export function defaultOpponentStatsMap(): OpponentStatsMap {
  return {
    binu: { ...DEFAULT_OPPONENT_STATS },
    lebe: { ...DEFAULT_OPPONENT_STATS },
    goju: { ...DEFAULT_OPPONENT_STATS },
  }
}

export function normalizeOpponentStatsMap(
  raw: Partial<Record<string, Partial<OpponentStats>>> | null | undefined,
): OpponentStatsMap {
  const base = defaultOpponentStatsMap()
  if (!raw) return base
  for (const id of OPPONENT_IDS) {
    const o = raw[id]
    if (!o) continue
    base[id] = {
      roundsWon: Math.max(0, Number(o.roundsWon) || 0),
      gamesPlayed: Math.max(0, Number(o.gamesPlayed) || 0),
      timesFinishedAhead: Math.max(0, Number(o.timesFinishedAhead) || 0),
      timesFinishedBehind: Math.max(0, Number(o.timesFinishedBehind) || 0),
    }
  }
  return base
}

export function mergeOpponentStatsMap(a: OpponentStatsMap, b: OpponentStatsMap): OpponentStatsMap {
  const out = defaultOpponentStatsMap()
  for (const id of OPPONENT_IDS) {
    out[id] = {
      roundsWon: Math.max(a[id].roundsWon, b[id].roundsWon),
      gamesPlayed: Math.max(a[id].gamesPlayed, b[id].gamesPlayed),
      timesFinishedAhead: Math.max(a[id].timesFinishedAhead, b[id].timesFinishedAhead),
      timesFinishedBehind: Math.max(a[id].timesFinishedBehind, b[id].timesFinishedBehind),
    }
  }
  return out
}

export function opponentIdFromSeat(seatIndex: number): OpponentId | null {
  for (const id of OPPONENT_IDS) {
    if (OPPONENT_META[id].seatIndex === seatIndex) return id
  }
  return null
}

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
  opponentStats: OpponentStatsMap
  eloRating: number
  eloGames: number
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
  opponentStats: defaultOpponentStatsMap(),
  eloRating: 1000,
  eloGames: 0,
}

function comboMultiplier(c: ComboType | null): number {
  if (!c) return 0
  const map: Record<ComboType, number> = { simple: 1, kora: 2, '33': 4, trinity: 8, kmt: 16 }
  return map[c] ?? 0
}

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
    opponentStats: mergeOpponentStatsMap(
      normalizeOpponentStatsMap(a.opponentStats),
      normalizeOpponentStatsMap(b.opponentStats),
    ),
    eloRating: Math.max(a.eloRating ?? 1000, b.eloRating ?? 1000),
    eloGames: Math.max(a.eloGames ?? 0, b.eloGames ?? 0),
  }
}

export function normalizeLifetimeStats(raw: Partial<LifetimeStats> | null | undefined): LifetimeStats {
  if (!raw) {
    return {
      ...DEFAULT_LIFETIME_STATS,
      comboCounts: { ...DEFAULT_LIFETIME_STATS.comboCounts },
      specialRuleCounts: { ...DEFAULT_LIFETIME_STATS.specialRuleCounts },
      opponentStats: defaultOpponentStatsMap(),
    }
  }
  return {
    ...DEFAULT_LIFETIME_STATS,
    ...raw,
    comboCounts: { ...DEFAULT_LIFETIME_STATS.comboCounts, ...(raw.comboCounts ?? {}) },
    specialRuleCounts: {
      ...DEFAULT_LIFETIME_STATS.specialRuleCounts,
      ...(raw.specialRuleCounts ?? {}),
    },
    opponentStats: normalizeOpponentStatsMap(raw.opponentStats),
    eloRating: Math.max(100, Number(raw.eloRating) || 1000),
    eloGames: Math.max(0, Number(raw.eloGames) || 0),
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
    elo_rating: stats.eloRating,
    elo_games: stats.eloGames,
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
  elo_rating?: number | null
  elo_games?: number | null
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
    eloRating: row.elo_rating ?? 1000,
    eloGames: row.elo_games ?? 0,
  })
}
