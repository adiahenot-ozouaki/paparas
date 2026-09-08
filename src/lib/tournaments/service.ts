import { supabase } from '../supabase/client'
import type { Tournament, TournamentPrize, TournamentRegistration } from './types'
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
