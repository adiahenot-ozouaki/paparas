// ==========================================================================
// api.ts — Client online Garam (lobby + edge function).
// ==========================================================================

import { supabase } from '../supabase/client'
import type { Card } from '../../types'
import type { RoundState } from '../../game/round'
import type { DeckVariantDb, KoraProfile, KoraTable, KoraTablePlayer } from '../supabase/database.types'

const NUM_SEATS = 4

export type OnlineEngineAction =
  | 'start_table'
  | 'get_state'
  | 'play_card'
  | 'resolve_trick'
  | 'bank_player'
  | 'claim_victory'
  | 'start_next_round'
  | 'leave_table'

export interface SeatWithProfile extends KoraTablePlayer {
  profile: Pick<KoraProfile, 'username' | 'avatar'> | null
}

export interface OpenLobbyTable {
  table: KoraTable
  seatCount: number
  code: string
}

export interface MyActiveTable {
  tableId: string
  status: KoraTable['status']
  baseStake: number
  seatIndex: number
  code: string
}

export interface LeaderboardEntry {
  userId: string
  username: string
  avatar: string
  netGainTotal: number
  totalRoundsWon: number
  gamesWon: number
}

function edgeFunctionUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  return `${base.replace(/\/$/, '')}/functions/v1/kora-game-engine`
}

export async function callEngine(
  action: OnlineEngineAction,
  tableId: string,
  extra: Record<string, unknown> = {},
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) {
    return { ok: false, status: 401, body: { error: 'Authentification requise.' } }
  }

  const res = await fetch(edgeFunctionUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify({ action, tableId, ...extra }),
  })

  let body: Record<string, unknown> = {}
  try {
    body = (await res.json()) as Record<string, unknown>
  } catch {
    body = { error: 'Réponse non JSON du serveur.' }
  }
  return { ok: res.ok, status: res.status, body }
}

export function parsePublicState(raw: unknown): RoundState {
  const s = raw as RoundState & { hands: (Card | null)[][] }
  const hands: Card[][] = (s.hands ?? []).map(hand =>
    (hand ?? []).map((c, i) => {
      if (c && typeof c === 'object' && 'suit' in c && c.suit) return c as Card
      return {
        suit: '♠' as const,
        value: '3' as const,
        rank: 0,
        pointValue: 0,
        state: 'back' as const,
        ...({ _hidden: true, _i: i } as object),
      } as Card
    }),
  )

  while (hands.length < NUM_SEATS) hands.push([])

  return {
    phase: s.phase,
    variant: s.variant,
    numPlayers: s.numPlayers ?? NUM_SEATS,
    hands,
    currentTrick: s.currentTrick,
    playLog: s.playLog ?? [[], [], [], []],
    trickWinners: s.trickWinners ?? [],
    lastTrickWinnerIndex: s.lastTrickWinnerIndex ?? null,
    bankedPlayers: s.bankedPlayers ?? [],
    outcome: s.outcome ?? null,
  }
}

export async function createOnlineTable(params: {
  userId: string
  baseStake: number
  startingCapital: number
  deckVariant?: DeckVariantDb
  minBuyIn?: number
  maxBuyIn?: number
}): Promise<{ table: KoraTable; error: string | null }> {
  const {
    userId,
    baseStake,
    startingCapital,
    deckVariant = 'as',
    minBuyIn = startingCapital,
    maxBuyIn = startingCapital * 3,
  } = params

  const { data, error } = await supabase
    .from('kora_tables')
    .insert({
      base_stake: baseStake,
      starting_capital: startingCapital,
      deck_variant: deckVariant,
      created_by: userId,
      min_buy_in: minBuyIn,
      max_buy_in: maxBuyIn,
      status: 'lobby',
    })
    .select('*')
    .single()

  if (error || !data) {
    return { table: null as unknown as KoraTable, error: error?.message ?? 'Création de table impossible.' }
  }
  return { table: data as KoraTable, error: null }
}

export async function joinOnlineTable(params: {
  tableId: string
  userId: string
  buyIn: number
  preferredSeat?: number
}): Promise<{ seat: KoraTablePlayer | null; error: string | null }> {
  const { tableId, userId, buyIn, preferredSeat } = params

  const { data: existing } = await supabase
    .from('kora_table_players')
    .select('seat_index')
    .eq('table_id', tableId)

  const occupied = new Set((existing ?? []).map(s => s.seat_index))
  let seatIndex = preferredSeat
  if (seatIndex === undefined || occupied.has(seatIndex)) {
    seatIndex = undefined
    for (let i = 0; i < NUM_SEATS; i++) {
      if (!occupied.has(i)) {
        seatIndex = i
        break
      }
    }
  }
  if (seatIndex === undefined) {
    return { seat: null, error: 'Table complète (4/4).' }
  }

  const { data, error } = await supabase
    .from('kora_table_players')
    .insert({
      table_id: tableId,
      user_id: userId,
      seat_index: seatIndex,
      capital: buyIn,
      is_ready: false,
    })
    .select('*')
    .single()

  if (error || !data) {
    return { seat: null, error: error?.message ?? 'Impossible de rejoindre la table.' }
  }
  return { seat: data as KoraTablePlayer, error: null }
}

export async function setSeatReady(
  tableId: string,
  userId: string,
  ready: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('kora_table_players')
    .update({ is_ready: ready })
    .eq('table_id', tableId)
    .eq('user_id', userId)
  return { error: error?.message ?? null }
}

export async function fetchTable(tableId: string): Promise<{ table: KoraTable | null; error: string | null }> {
  const { data, error } = await supabase.from('kora_tables').select('*').eq('id', tableId).maybeSingle()
  if (error) return { table: null, error: error.message }
  return { table: (data as KoraTable) ?? null, error: data ? null : 'Table introuvable.' }
}

export async function fetchSeatsWithProfiles(tableId: string): Promise<{
  seats: SeatWithProfile[]
  error: string | null
}> {
  const { data: seats, error } = await supabase
    .from('kora_table_players')
    .select('*')
    .eq('table_id', tableId)
    .order('seat_index', { ascending: true })

  if (error) return { seats: [], error: error.message }
  const rows = (seats ?? []) as KoraTablePlayer[]
  if (rows.length === 0) return { seats: [], error: null }

  const userIds = rows.map(r => r.user_id)
  const { data: profiles } = await supabase.from('kora_profiles').select('id, username, avatar').in('id', userIds)
  const byId = new Map((profiles ?? []).map(p => [p.id, p]))

  return {
    seats: rows.map(r => ({
      ...r,
      profile: byId.has(r.user_id)
        ? { username: byId.get(r.user_id)!.username, avatar: byId.get(r.user_id)!.avatar }
        : null,
    })),
    error: null,
  }
}

export async function listOpenLobbyTables(limit = 12): Promise<{
  tables: OpenLobbyTable[]
  error: string | null
}> {
  const { data: rows, error } = await supabase
    .from('kora_tables')
    .select('*')
    .eq('status', 'lobby')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { tables: [], error: error.message }
  const tables = (rows ?? []) as KoraTable[]
  if (tables.length === 0) return { tables: [], error: null }

  const ids = tables.map(t => t.id)
  const { data: seats } = await supabase.from('kora_table_players').select('table_id').in('table_id', ids)
  const counts = new Map<string, number>()
  for (const s of seats ?? []) {
    counts.set(s.table_id, (counts.get(s.table_id) ?? 0) + 1)
  }

  return {
    tables: tables
      .map(t => ({
        table: t,
        seatCount: counts.get(t.id) ?? 0,
        code: tableInviteCode(t.id),
      }))
      .filter(t => t.seatCount < NUM_SEATS),
    error: null,
  }
}

export async function findMyActiveTables(userId: string): Promise<{
  tables: MyActiveTable[]
  error: string | null
}> {
  const { data: seats, error } = await supabase
    .from('kora_table_players')
    .select('table_id, seat_index')
    .eq('user_id', userId)

  if (error) return { tables: [], error: error.message }
  const seatRows = seats ?? []
  if (seatRows.length === 0) return { tables: [], error: null }

  const ids = seatRows.map(s => s.table_id)
  const { data: tables, error: tErr } = await supabase
    .from('kora_tables')
    .select('*')
    .in('id', ids)
    .in('status', ['lobby', 'playing'])

  if (tErr) return { tables: [], error: tErr.message }

  const byId = new Map((tables ?? []).map(t => [t.id, t as KoraTable]))
  const result: MyActiveTable[] = []
  for (const s of seatRows) {
    const t = byId.get(s.table_id)
    if (!t) continue
    result.push({
      tableId: t.id,
      status: t.status,
      baseStake: t.base_stake,
      seatIndex: s.seat_index,
      code: tableInviteCode(t.id),
    })
  }
  result.sort((a, b) => (a.status === 'playing' ? -1 : 1) - (b.status === 'playing' ? -1 : 1))
  return { tables: result, error: null }
}

/** Classement réel depuis kora_lifetime_stats + kora_profiles (nécessite session). */
export async function fetchOnlineLeaderboard(limit = 30): Promise<{
  entries: LeaderboardEntry[]
  error: string | null
}> {
  const { data: stats, error } = await supabase
    .from('kora_lifetime_stats')
    .select('user_id, net_gain_total, total_rounds_won, games_won')
    .order('net_gain_total', { ascending: false })
    .limit(limit)

  if (error) return { entries: [], error: error.message }
  const rows = stats ?? []
  if (rows.length === 0) return { entries: [], error: null }

  const ids = rows.map(r => r.user_id)
  const { data: profiles } = await supabase.from('kora_profiles').select('id, username, avatar').in('id', ids)
  const byId = new Map((profiles ?? []).map(p => [p.id, p]))

  return {
    entries: rows.map(r => {
      const p = byId.get(r.user_id)
      return {
        userId: r.user_id,
        username: p?.username ?? 'Joueur',
        avatar: p?.avatar ?? '🦅',
        netGainTotal: r.net_gain_total ?? 0,
        totalRoundsWon: r.total_rounds_won ?? 0,
        gamesWon: r.games_won ?? 0,
      }
    }),
    error: null,
  }
}

export function tableInviteCode(tableId: string): string {
  return tableId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export function toViewIndex(physicalIndex: number, mySeat: number): number {
  return (physicalIndex - mySeat + NUM_SEATS) % NUM_SEATS
}

export function rotateRoundStateForView(state: RoundState, mySeat: number): RoundState {
  const mapArr = <T,>(arr: T[]): T[] => {
    const out = new Array(NUM_SEATS) as T[]
    for (let p = 0; p < NUM_SEATS; p++) out[toViewIndex(p, mySeat)] = arr[p]
    return out
  }

  const mapIdx = (i: number | null) => (i === null ? null : toViewIndex(i, mySeat))

  return {
    ...state,
    hands: mapArr(state.hands),
    playLog: mapArr(state.playLog),
    bankedPlayers: state.bankedPlayers.map(i => toViewIndex(i, mySeat)),
    trickWinners: state.trickWinners.map(i => toViewIndex(i, mySeat)),
    lastTrickWinnerIndex: mapIdx(state.lastTrickWinnerIndex),
    currentTrick: state.currentTrick
      ? {
          ...state.currentTrick,
          starterIndex: toViewIndex(state.currentTrick.starterIndex, mySeat),
          playedCards: state.currentTrick.playedCards.map(pc => ({
            ...pc,
            playerIndex: toViewIndex(pc.playerIndex, mySeat),
          })),
        }
      : null,
    outcome: state.outcome
      ? state.outcome.kind === 'normal'
        ? {
            ...state.outcome,
            roundWinnerIndex: toViewIndex(state.outcome.roundWinnerIndex, mySeat),
            bankedPlayerIndexes: state.outcome.bankedPlayerIndexes.map(i => toViewIndex(i, mySeat)),
            payout: {
              ...state.outcome.payout,
              winners: state.outcome.payout.winners.map(w => ({
                ...w,
                playerIndex: toViewIndex(w.playerIndex, mySeat),
              })),
              losers: state.outcome.payout.losers.map(w => ({
                ...w,
                playerIndex: toViewIndex(w.playerIndex, mySeat),
              })),
            },
          }
        : {
            ...state.outcome,
            winners: state.outcome.winners.map(w => ({
              ...w,
              playerIndex: toViewIndex(w.playerIndex, mySeat),
            })),
            payout: {
              ...state.outcome.payout,
              winners: state.outcome.payout.winners.map(w => ({
                ...w,
                playerIndex: toViewIndex(w.playerIndex, mySeat),
              })),
              losers: state.outcome.payout.losers.map(w => ({
                ...w,
                playerIndex: toViewIndex(w.playerIndex, mySeat),
              })),
            },
          }
      : null,
  }
}
