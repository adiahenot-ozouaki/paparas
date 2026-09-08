import { supabase } from '../supabase/client'
import type {
  Tournament,
  TournamentPrize,
  TournamentRegistration,
  TournamentEntrant,
  TournamentMatchTable,
} from './types'
import { MOCK_TOURNAMENTS } from './mock'
import type { KoraTournament } from '../supabase/database.types'

function mapPrizes(raw: unknown): TournamentPrize[] {
  if (!Array.isArray(raw)) return []
  return raw.map((p: Record<string, unknown>) => ({
    rank: Number(p.rank ?? 0),
    label: String(p.label ?? ''),
    amountFcfa: Number(p.amountFcfa ?? p.amount_fcfa ?? 0),
  }))
}

function mapWinners(raw: unknown): import('./types').TournamentWinner[] {
  if (!Array.isArray(raw)) return []
  return raw.map((w: Record<string, unknown>) => ({
    rank: Number(w.rank ?? 0),
    userId: String(w.userId ?? w.user_id ?? ''),
    username: String(w.username ?? 'Joueur'),
    amountFcfa: Number(w.amountFcfa ?? w.amount_fcfa ?? 0),
  }))
}

function mapRow(
  row: KoraTournament & { registered_count?: number },
  registeredCount: number,
): Tournament {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    format: row.format,
    entryFeeFcfa: row.entry_fee_fcfa,
    prizePoolFcfa: row.prize_pool_fcfa,
    prizes: mapPrizes(row.prizes),
    maxPlayers: row.max_players,
    registeredCount,
    startsAt: row.starts_at,
    tagline: row.tagline,
    rulesPreset: row.rules_preset,
    winners: mapWinners((row as { winners?: unknown }).winners),
  }
}

async function countsByTournament(ids: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (ids.length === 0) return map
  const { data, error } = await supabase
    .from('kora_tournament_registrations')
    .select('tournament_id')
    .in('tournament_id', ids)
  if (error || !data) return map
  for (const row of data) {
    const id = row.tournament_id as string
    map.set(id, (map.get(id) ?? 0) + 1)
  }
  return map
}

export async function listTournaments(): Promise<Tournament[]> {
  try {
    const { data, error } = await supabase
      .from('kora_tournaments')
      .select('*')
      .order('starts_at', { ascending: true })

    if (error || !data || data.length === 0) {
      if (error) console.warn('[tournaments] list fallback mock', error.message)
      return MOCK_TOURNAMENTS.map(t => ({ ...t }))
    }

    const rows = data as KoraTournament[]
    const counts = await countsByTournament(rows.map(r => r.id))
    return rows.map(r => mapRow(r, counts.get(r.id) ?? 0))
  } catch (e) {
    console.warn('[tournaments] list exception, mock', e)
    return MOCK_TOURNAMENTS.map(t => ({ ...t }))
  }
}

export async function getTournament(id: string): Promise<Tournament | null> {
  try {
    const { data, error } = await supabase.from('kora_tournaments').select('*').eq('id', id).maybeSingle()
    if (error || !data) {
      return MOCK_TOURNAMENTS.find(t => t.id === id) ?? null
    }
    const row = data as KoraTournament
    const counts = await countsByTournament([id])
    return mapRow(row, counts.get(id) ?? 0)
  } catch {
    return MOCK_TOURNAMENTS.find(t => t.id === id) ?? null
  }
}

export async function getMyRegistrations(): Promise<TournamentRegistration[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const uid = sessionData.session?.user?.id
    if (!uid) return []

    const { data, error } = await supabase
      .from('kora_tournament_registrations')
      .select('tournament_id, registered_at')
      .eq('user_id', uid)

    if (error || !data) return []
    return data.map(r => ({
      tournamentId: r.tournament_id as string,
      registeredAt: r.registered_at as string,
    }))
  } catch {
    return []
  }
}

export async function isRegistered(tournamentId: string): Promise<boolean> {
  const regs = await getMyRegistrations()
  return regs.some(r => r.tournamentId === tournamentId)
}

export type TournamentActionResult = {
  ok: boolean
  error?: string
  walletBalance?: number
  feePaidFcfa?: number
  refundedFcfa?: number
}

export async function registerForTournament(
  tournamentId: string,
): Promise<TournamentActionResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session?.user) {
      return { ok: false, error: 'Connectez-vous pour vous inscrire' }
    }

    const { data, error } = await supabase.rpc('kora_register_tournament', {
      p_tournament_id: tournamentId,
    })

    if (error) {
      const msg = error.message || ''
      if (msg.includes('WALLET') || msg.toLowerCase().includes('insuffisant')) {
        return { ok: false, error: 'Solde insuffisant' }
      }
      return { ok: false, error: msg }
    }

    const result = data as {
      ok?: boolean
      error?: string
      wallet_balance?: number
      fee_paid_fcfa?: number
    } | null
    if (!result?.ok) {
      return { ok: false, error: result?.error ?? 'Inscription impossible' }
    }
    return {
      ok: true,
      walletBalance: result.wallet_balance,
      feePaidFcfa: result.fee_paid_fcfa,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur reseau' }
  }
}

export async function unregisterFromTournament(
  tournamentId: string,
): Promise<TournamentActionResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session?.user) {
      return { ok: false, error: 'Authentification requise' }
    }

    const { data, error } = await supabase.rpc('kora_unregister_tournament', {
      p_tournament_id: tournamentId,
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    const result = data as {
      ok?: boolean
      error?: string
      wallet_balance?: number
      refunded_fcfa?: number
    } | null
    if (!result?.ok) {
      return { ok: false, error: result?.error ?? 'Desinscription impossible' }
    }
    return {
      ok: true,
      walletBalance: result.wallet_balance,
      refundedFcfa: result.refunded_fcfa,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur reseau' }
  }
}

export function formatTournamentDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function statusLabel(status: Tournament['status']): string {
  switch (status) {
    case 'upcoming':
      return 'Bientot'
    case 'open':
      return 'Inscriptions'
    case 'live':
      return 'En cours'
    case 'completed':
      return 'Termine'
  }
}

export async function listTournamentEntrants(
  tournamentId: string,
): Promise<{ entrants: TournamentEntrant[]; error: string | null }> {
  try {
    let { data: regs, error } = await supabase
      .from('kora_tournament_registrations')
      .select('user_id, registered_at, fee_paid_fcfa')
      .eq('tournament_id', tournamentId)
      .order('registered_at', { ascending: true })

    if (error) {
      const retry = await supabase
        .from('kora_tournament_registrations')
        .select('user_id, registered_at')
        .eq('tournament_id', tournamentId)
        .order('registered_at', { ascending: true })
      if (retry.error) return { entrants: [], error: retry.error.message }
      regs = (retry.data ?? []).map(r => ({ ...r, fee_paid_fcfa: 0 }))
      error = null
    }
    const rows = regs ?? []
    if (rows.length === 0) return { entrants: [], error: null }

    const ids = rows.map(r => r.user_id as string)
    const { data: profiles } = await supabase
      .from('kora_profiles')
      .select('id, username, avatar')
      .in('id', ids)

    const byId = new Map((profiles ?? []).map(p => [p.id as string, p]))
    const entrants: TournamentEntrant[] = rows.map(r => {
      const p = byId.get(r.user_id as string)
      return {
        userId: r.user_id as string,
        username: (p?.username as string) ?? 'Joueur',
        avatar: (p?.avatar as string) ?? '',
        registeredAt: r.registered_at as string,
        feePaidFcfa: Number((r as { fee_paid_fcfa?: number }).fee_paid_fcfa ?? 0),
      }
    })
    return { entrants, error: null }
  } catch (e) {
    return { entrants: [], error: e instanceof Error ? e.message : 'Erreur reseau' }
  }
}

export async function listTournamentTables(
  tournamentId: string,
): Promise<{ tables: TournamentMatchTable[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('kora_tables')
      .select('id, status, base_stake')
      .eq('tournament_id', tournamentId)
      .in('status', ['lobby', 'playing'])
      .order('created_at', { ascending: false })
      .limit(24)

    if (error) {
      return { tables: [], error: null }
    }

    const tablesRaw = data ?? []
    if (tablesRaw.length === 0) return { tables: [], error: null }

    const ids = tablesRaw.map(t => t.id as string)
    const { data: seats } = await supabase
      .from('kora_table_players')
      .select('table_id')
      .in('table_id', ids)

    const counts = new Map<string, number>()
    for (const s of seats ?? []) {
      const tid = s.table_id as string
      counts.set(tid, (counts.get(tid) ?? 0) + 1)
    }

    const tables: TournamentMatchTable[] = tablesRaw.map(t => {
      const id = t.id as string
      const short = id.replace(/-/g, '').slice(0, 6).toUpperCase()
      return {
        tableId: id,
        status: t.status as TournamentMatchTable['status'],
        baseStake: Number(t.base_stake ?? 0),
        seatCount: counts.get(id) ?? 0,
        code: short,
      }
    })
    return { tables, error: null }
  } catch {
    return { tables: [], error: null }
  }
}

export type SpawnTablesResult = {
  ok: boolean
  error?: string
  already?: boolean
  tablesCreated?: number
  tablesExisting?: number
  playerCount?: number
  tableIds?: string[]
  status?: string
}

/** Genere les tables de match a partir des inscrits (RPC). */
export async function spawnTournamentTables(
  tournamentId: string,
): Promise<SpawnTablesResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session?.user) {
      return { ok: false, error: 'Connectez-vous pour lancer les tables' }
    }

    const { data, error } = await supabase.rpc('kora_tournament_spawn_tables', {
      p_tournament_id: tournamentId,
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    const result = data as {
      ok?: boolean
      error?: string
      already?: boolean
      tables_created?: number
      tables_existing?: number
      player_count?: number
      table_ids?: string[]
      status?: string
    } | null

    if (!result?.ok) {
      return { ok: false, error: result?.error ?? 'Generation impossible' }
    }

    return {
      ok: true,
      already: result.already,
      tablesCreated: result.tables_created,
      tablesExisting: result.tables_existing,
      playerCount: result.player_count,
      tableIds: result.table_ids,
      status: result.status,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur reseau' }
  }
}
