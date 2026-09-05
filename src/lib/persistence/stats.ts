// ==========================================================================
// persistence/stats.ts — Merge solo (local/cloud) ↔ online (edge).
// ==========================================================================

import type { ComboType, SpecialRuleType } from '../../types'
import type { LifetimeStats } from '../../game/GameContext'
import { getComboMultiplier } from '../../game/combo'
import { supabase } from '../supabase/client'
import type { ComboCountsDb, SpecialRuleCountsDb } from '../supabase/database.types'

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

export interface LifetimeStatsRow {
  user_id: string
  games_played: number
  games_won: number
  total_rounds_won: number
  total_tricks_won: number
  best_combo: ComboType | null
  net_gain_total: number
  total_gains: number
  total_losses: number
  max_capital_ever: number
  min_capital_ever: number
  combo_counts: ComboCountsDb
  special_rule_counts: SpecialRuleCountsDb
  updated_at?: string
}

export function rowToLifetimeStats(row: Partial<LifetimeStatsRow> | null | undefined): LifetimeStats {
  if (!row) return { ...DEFAULT_LIFETIME_STATS, comboCounts: { ...DEFAULT_LIFETIME_STATS.comboCounts }, specialRuleCounts: { ...DEFAULT_LIFETIME_STATS.specialRuleCounts } }
  return {
    gamesPlayed: row.games_played ?? 0,
    gamesWon: row.games_won ?? 0,
    totalRoundsWon: row.total_rounds_won ?? 0,
    totalTricksWon: row.total_tricks_won ?? 0,
    bestComboEver: (row.best_combo as ComboType | null) ?? null,
    netGainTotal: row.net_gain_total ?? 0,
    totalGains: row.total_gains ?? 0,
    totalLosses: row.total_losses ?? 0,
    maxCapitalEver: row.max_capital_ever ?? 0,
    minCapitalEver: row.min_capital_ever ?? 0,
    comboCounts: {
      ...DEFAULT_LIFETIME_STATS.comboCounts,
      ...(row.combo_counts as Partial<Record<ComboType, number>> | undefined),
    },
    specialRuleCounts: {
      ...DEFAULT_LIFETIME_STATS.specialRuleCounts,
      ...(row.special_rule_counts as Partial<Record<SpecialRuleType, number>> | undefined),
    },
  }
}

export function lifetimeStatsToRow(stats: LifetimeStats, userId: string): Omit<LifetimeStatsRow, 'updated_at'> {
  return {
    user_id: userId,
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
    combo_counts: { ...stats.comboCounts },
    special_rule_counts: { ...stats.specialRuleCounts },
  }
}

/** Merge de deux snapshots SOLO (multi-appareils) : monotonic GREATEST. */
export function mergeSoloSnapshots(a: LifetimeStats, b: LifetimeStats): LifetimeStats {
  const bestCombo = (() => {
    const ma = a.bestComboEver ? getComboMultiplier(a.bestComboEver) : 0
    const mb = b.bestComboEver ? getComboMultiplier(b.bestComboEver) : 0
    if (mb > ma) return b.bestComboEver
    return a.bestComboEver
  })()

  const minCap = (() => {
    const vals = [a.minCapitalEver, b.minCapitalEver].filter(v => v > 0)
    return vals.length ? Math.min(...vals) : 0
  })()

  return {
    gamesPlayed: Math.max(a.gamesPlayed, b.gamesPlayed),
    gamesWon: Math.max(a.gamesWon, b.gamesWon),
    totalRoundsWon: Math.max(a.totalRoundsWon, b.totalRoundsWon),
    totalTricksWon: Math.max(a.totalTricksWon, b.totalTricksWon),
    bestComboEver: bestCombo,
    netGainTotal: Math.max(a.netGainTotal, b.netGainTotal),
    totalGains: Math.max(a.totalGains, b.totalGains),
    totalLosses: Math.max(a.totalLosses, b.totalLosses),
    maxCapitalEver: Math.max(a.maxCapitalEver, b.maxCapitalEver),
    minCapitalEver: minCap,
    comboCounts: {
      simple: Math.max(a.comboCounts.simple, b.comboCounts.simple),
      kora: Math.max(a.comboCounts.kora, b.comboCounts.kora),
      '33': Math.max(a.comboCounts['33'], b.comboCounts['33']),
      trinity: Math.max(a.comboCounts.trinity, b.comboCounts.trinity),
      kmt: Math.max(a.comboCounts.kmt, b.comboCounts.kmt),
    },
    specialRuleCounts: {
      flush: Math.max(a.specialRuleCounts.flush, b.specialRuleCounts.flush),
      '21': Math.max(a.specialRuleCounts['21'], b.specialRuleCounts['21']),
      t7: Math.max(a.specialRuleCounts.t7, b.specialRuleCounts.t7),
    },
  }
}

/** Solo + online = vue globale (sources complémentaires → SUM). */
export function mergeSoloAndOnline(solo: LifetimeStats, online: LifetimeStats): LifetimeStats {
  const bestCombo = (() => {
    const ms = solo.bestComboEver ? getComboMultiplier(solo.bestComboEver) : 0
    const mo = online.bestComboEver ? getComboMultiplier(online.bestComboEver) : 0
    if (mo > ms) return online.bestComboEver
    return solo.bestComboEver
  })()

  const minCap = (() => {
    const vals = [solo.minCapitalEver, online.minCapitalEver].filter(v => v > 0)
    return vals.length ? Math.min(...vals) : 0
  })()

  return {
    gamesPlayed: solo.gamesPlayed + online.gamesPlayed,
    gamesWon: solo.gamesWon + online.gamesWon,
    totalRoundsWon: solo.totalRoundsWon + online.totalRoundsWon,
    totalTricksWon: solo.totalTricksWon + online.totalTricksWon,
    bestComboEver: bestCombo,
    netGainTotal: solo.netGainTotal + online.netGainTotal,
    totalGains: solo.totalGains + online.totalGains,
    totalLosses: solo.totalLosses + online.totalLosses,
    maxCapitalEver: Math.max(solo.maxCapitalEver, online.maxCapitalEver),
    minCapitalEver: minCap,
    comboCounts: {
      simple: solo.comboCounts.simple + online.comboCounts.simple,
      kora: solo.comboCounts.kora + online.comboCounts.kora,
      '33': solo.comboCounts['33'] + online.comboCounts['33'],
      trinity: solo.comboCounts.trinity + online.comboCounts.trinity,
      kmt: solo.comboCounts.kmt + online.comboCounts.kmt,
    },
    specialRuleCounts: {
      flush: solo.specialRuleCounts.flush + online.specialRuleCounts.flush,
      '21': solo.specialRuleCounts['21'] + online.specialRuleCounts['21'],
      t7: solo.specialRuleCounts.t7 + online.specialRuleCounts.t7,
    },
  }
}

export async function fetchOnlineLifetimeStats(userId: string): Promise<LifetimeStats> {
  const { data, error } = await supabase.from('kora_lifetime_stats').select('*').eq('user_id', userId).maybeSingle()
  if (error) {
    console.warn('[persistence] fetch online stats:', error.message)
    return { ...DEFAULT_LIFETIME_STATS, comboCounts: { ...DEFAULT_LIFETIME_STATS.comboCounts }, specialRuleCounts: { ...DEFAULT_LIFETIME_STATS.specialRuleCounts } }
  }
  return rowToLifetimeStats(data as LifetimeStatsRow | null)
}

export async function fetchSoloLifetimeStatsCloud(userId: string): Promise<LifetimeStats> {
  const { data, error } = await supabase.from('kora_solo_lifetime_stats').select('*').eq('user_id', userId).maybeSingle()
  if (error) {
    console.warn('[persistence] fetch solo stats:', error.message)
    return { ...DEFAULT_LIFETIME_STATS, comboCounts: { ...DEFAULT_LIFETIME_STATS.comboCounts }, specialRuleCounts: { ...DEFAULT_LIFETIME_STATS.specialRuleCounts } }
  }
  return rowToLifetimeStats(data as LifetimeStatsRow | null)
}

/** Upsert des stats solo vers le cloud (RLS : own row). */
export async function pushSoloLifetimeStats(userId: string, stats: LifetimeStats): Promise<{ error: string | null }> {
  const row = {
    ...lifetimeStatsToRow(stats, userId),
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('kora_solo_lifetime_stats').upsert(row, { onConflict: 'user_id' })
  return { error: error?.message ?? null }
}

/**
 * Au login : fusionne local solo + cloud solo (GREATEST), pousse le résultat,
 * charge les stats online, renvoie { solo, online, merged }.
 */
export async function syncOnLogin(userId: string, localSolo: LifetimeStats): Promise<{
  solo: LifetimeStats
  online: LifetimeStats
  merged: LifetimeStats
  error: string | null
}> {
  const cloudSolo = await fetchSoloLifetimeStatsCloud(userId)
  const solo = mergeSoloSnapshots(localSolo, cloudSolo)
  const push = await pushSoloLifetimeStats(userId, solo)
  const online = await fetchOnlineLifetimeStats(userId)
  return {
    solo,
    online,
    merged: mergeSoloAndOnline(solo, online),
    error: push.error,
  }
}
