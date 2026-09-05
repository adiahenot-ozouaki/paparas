// ==========================================================================
// persistence/cloud.ts — Sync stats + wallet Supabase.
// ==========================================================================

import { supabase } from '../supabase/client'
import {
  lifetimeStatsFromDbRow,
  lifetimeStatsToDbPayload,
  loadLocalLifetimeStats,
  mergeLifetimeStats,
  saveLocalLifetimeStats,
  type LifetimeStats,
} from './stats'

/** Aligné sur kora_profiles.wallet_balance DEFAULT et startingCapital solo. */
export const DEFAULT_WALLET_BALANCE = 5000

export interface WalletInfo {
  balance: number
  username: string
  avatar: string
}

/** Assure profil + ligne stats côté serveur, puis merge local ↔ cloud. */
export async function syncLifetimeStatsWithCloud(
  localOverride?: LifetimeStats,
): Promise<{ stats: LifetimeStats; error: string | null }> {
  const local = localOverride ?? loadLocalLifetimeStats()

  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user?.id
  if (!userId) {
    return { stats: local, error: null }
  }

  const { error: ensureError } = await supabase.rpc('kora_ensure_player_rows', {
    p_user_id: userId,
  })
  if (ensureError) {
    console.warn('[persistence] kora_ensure_player_rows:', ensureError.message)
  }

  const { data: cloudRow, error: fetchError } = await supabase
    .from('kora_lifetime_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) {
    return { stats: local, error: fetchError.message }
  }

  const cloud = cloudRow ? lifetimeStatsFromDbRow(cloudRow) : local
  const merged = mergeLifetimeStats(local, cloud)
  saveLocalLifetimeStats(merged)

  const { data: mergedRow, error: mergeError } = await supabase.rpc('kora_merge_lifetime_stats', {
    p_stats: lifetimeStatsToDbPayload(merged),
  })

  if (mergeError) {
    return { stats: merged, error: mergeError.message }
  }

  if (mergedRow) {
    const fromServer = lifetimeStatsFromDbRow(mergedRow as Parameters<typeof lifetimeStatsFromDbRow>[0])
    saveLocalLifetimeStats(fromServer)
    return { stats: fromServer, error: null }
  }

  return { stats: merged, error: null }
}

export async function fetchWallet(): Promise<{ wallet: WalletInfo | null; error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user?.id
  if (!userId) return { wallet: null, error: null }

  const { data, error } = await supabase
    .from('kora_profiles')
    .select('username, avatar, wallet_balance')
    .eq('id', userId)
    .maybeSingle()

  if (error) return { wallet: null, error: error.message }
  if (!data) return { wallet: null, error: null }

  return {
    wallet: {
      balance: (data as { wallet_balance?: number }).wallet_balance ?? DEFAULT_WALLET_BALANCE,
      username: data.username,
      avatar: data.avatar,
    },
    error: null,
  }
}

/** Débite le wallet (buy-in). Retourne le nouveau solde. */
export async function walletDebit(amount: number): Promise<{ balance: number | null; error: string | null }> {
  if (amount <= 0) return { balance: null, error: 'Montant invalide.' }
  const { data, error } = await supabase.rpc('kora_wallet_adjust', {
    p_delta: -amount,
    p_reason: 'buy_in',
  })
  if (error) return { balance: null, error: error.message }
  return { balance: data as number, error: null }
}

/** Crédite le wallet (cash-out côté client si besoin). */
export async function walletCredit(amount: number): Promise<{ balance: number | null; error: string | null }> {
  if (amount <= 0) return { balance: null, error: 'Montant invalide.' }
  const { data, error } = await supabase.rpc('kora_wallet_adjust', {
    p_delta: amount,
    p_reason: 'cash_out',
  })
  if (error) return { balance: null, error: error.message }
  return { balance: data as number, error: null }
}
