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

export interface EngineStateResponse {
  state: RoundState
  roundNumber?: number
  eliminatedSeats?: number[]
  error?: string
}

function edgeFunctionUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  return `${base.replace(/\/$/, '')}/functions/v1/kora-game-engine`
}

/** Appel authentifié à l'edge function. */
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

/**
 * L'edge renvoie les mains adverses en `null` par carte.
 * On conserve la longueur (cartes restantes) avec des stubs face cachée
 * pour l'UI, sans exposer les vraies valeurs.
 */
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
        // id synthétique pour éviter collisions UI
        ...( { _hidden: true, _i: i } as object),
      } as Card
    }),
  )

  // Garantir 4 sièges
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

export function tableInviteCode(tableId: string): string {
  return tableId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

/** Pivote les indices pour que mon siège soit en vue 0 (sud). */
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
