// shared.ts — types, loaders, payout helpers for kora-game-engine
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import type { Card } from './engine/types.ts'
import type { RoundState } from './engine/round.ts'
import type { GameStakeConfig, PayoutPlayer } from './engine/payout.ts'
import { applyRoundPayout, computeRoundPayout } from './engine/payout.ts'

export const NUM_PLAYERS = 4
export const MIN_ACTIVE_PLAYERS = 2

export interface TableRow {
  id: string
  status: string
  base_stake: number
  starting_capital: number
  deck_variant: '9' | '10' | 'as'
  created_by: string
}

export interface SeatRow {
  table_id: string
  user_id: string
  seat_index: number
  capital: number
  is_ready: boolean
}

export interface RoundRow {
  id: string
  table_id: string
  round_number: number
  phase: string
  current_trick: unknown
  play_log: unknown
  trick_winners: number[]
  banked_players: number[]
  last_trick_winner_index: number | null
  outcome: RoundState['outcome']
  payout_applied?: boolean
}

export function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  })
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status)
}

export async function authenticate(req: Request, admin: SupabaseClient): Promise<{ userId: string }> {
  const auth = req.headers.get('Authorization')
  if (!auth) throw new Error('UNAUTHENTICATED')
  const token = auth.replace(/^Bearer\s+/i, '')
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new Error('UNAUTHENTICATED')
  return { userId: data.user.id }
}

export async function loadTable(admin: SupabaseClient, tableId: string): Promise<TableRow> {
  const { data, error } = await admin.from('kora_tables').select('*').eq('id', tableId).single()
  if (error || !data) throw new Error('Table introuvable.')
  return data as TableRow
}

export async function loadSeats(admin: SupabaseClient, tableId: string): Promise<SeatRow[]> {
  const { data, error } = await admin
    .from('kora_table_players')
    .select('*')
    .eq('table_id', tableId)
    .order('seat_index')
  if (error) throw new Error(`Échec chargement sièges : ${error.message}`)
  return (data ?? []) as SeatRow[]
}

export function computeVacantSeats(seats: SeatRow[]): number[] {
  const occupied = new Set(seats.map(s => s.seat_index))
  return Array.from({ length: NUM_PLAYERS }, (_, i) => i).filter(i => !occupied.has(i))
}

export async function loadLatestRound(
  admin: SupabaseClient,
  tableId: string,
): Promise<{ round: RoundRow; hands: Card[][] }> {
  const { data: round, error } = await admin
    .from('kora_rounds')
    .select('*')
    .eq('table_id', tableId)
    .order('round_number', { ascending: false })
    .limit(1)
    .single()
  if (error || !round) throw new Error('Aucun round actif.')
  const { data: handRows, error: handErr } = await admin
    .from('kora_round_hands')
    .select('seat_index, cards')
    .eq('round_id', round.id)
  if (handErr) throw new Error(`Échec chargement mains : ${handErr.message}`)
  const hands: Card[][] = Array.from({ length: NUM_PLAYERS }, () => [])
  for (const h of handRows ?? []) {
    hands[(h as { seat_index: number }).seat_index] = (h as { cards: Card[] }).cards ?? []
  }
  return { round: round as RoundRow, hands }
}

export function reconstructRoundState(table: TableRow, round: RoundRow, hands: Card[][]): RoundState {
  return {
    phase: round.phase as RoundState['phase'],
    variant: table.deck_variant,
    numPlayers: NUM_PLAYERS,
    hands,
    currentTrick: round.current_trick as RoundState['currentTrick'],
    playLog: (round.play_log as Card[][]) ?? Array.from({ length: NUM_PLAYERS }, () => []),
    trickWinners: round.trick_winners ?? [],
    bankedPlayers: round.banked_players ?? [],
    lastTrickWinnerIndex: round.last_trick_winner_index,
    outcome: round.outcome,
  }
}

export function toPublicState(state: RoundState, viewerSeat: number): RoundState {
  // Hands of other seats hidden unless revealed (outcome)
  const hide = state.phase === 'playing' || state.phase === 'trickWon'
  const hands = state.hands.map((hand, i) => {
    if (!hide || i === viewerSeat) return hand
    return hand.map(c => ({ ...c, state: 'back' as const }))
  })
  return { ...state, hands }
}

export async function insertRound(
  admin: SupabaseClient,
  tableId: string,
  roundNumber: number,
  state: RoundState,
  seats: SeatRow[],
): Promise<RoundRow> {
  const { data, error } = await admin
    .from('kora_rounds')
    .insert({
      table_id: tableId,
      round_number: roundNumber,
      phase: state.phase,
      current_trick: state.currentTrick,
      play_log: state.playLog,
      trick_winners: state.trickWinners,
      banked_players: state.bankedPlayers,
      last_trick_winner_index: state.lastTrickWinnerIndex,
      outcome: state.outcome,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(`Échec création round : ${error?.message}`)
  for (const seat of seats) {
    const { error: handError } = await admin.from('kora_round_hands').insert({
      round_id: data.id,
      seat_index: seat.seat_index,
      user_id: seat.user_id,
      cards: state.hands[seat.seat_index] ?? [],
      revealed: false,
    })
    if (handError) throw new Error(`Échec insertion main : ${handError.message}`)
  }
  return data as RoundRow
}

export async function updateRound(admin: SupabaseClient, roundId: string, state: RoundState, seats: SeatRow[]): Promise<void> {
  const { error } = await admin
    .from('kora_rounds')
    .update({
      phase: state.phase,
      current_trick: state.currentTrick,
      play_log: state.playLog,
      trick_winners: state.trickWinners,
      banked_players: state.bankedPlayers,
      last_trick_winner_index: state.lastTrickWinnerIndex,
      outcome: state.outcome,
    })
    .eq('id', roundId)
  if (error) throw new Error(`Échec de mise à jour du round : ${error.message}`)

  if (state.phase === 'roundEnd' || state.phase === 'specialWin') {
    const tableId = seats[0]?.table_id
    if (tableId) {
      await admin.from('kora_table_players').update({ is_ready: false }).eq('table_id', tableId)
    }
  }

  const revealed = state.outcome?.kind === 'specialWin'
  for (const seat of seats) {
    const { error: handError } = await admin
      .from('kora_round_hands')
      .update({ cards: state.hands[seat.seat_index], revealed })
      .eq('round_id', roundId)
      .eq('seat_index', seat.seat_index)
    if (handError) throw new Error(`Échec de mise à jour de la main (siège ${seat.seat_index}) : ${handError.message}`)
  }
}

export async function applyPayoutAndStats(
  admin: SupabaseClient,
  table: TableRow,
  round: RoundRow,
  state: RoundState,
  seats: SeatRow[],
): Promise<{ eliminatedSeats: number[] }> {
  if (!state.outcome || round.payout_applied) {
    return { eliminatedSeats: [] }
  }
  const stakeConfig: GameStakeConfig = { baseStake: table.base_stake, startingCapital: table.starting_capital }
  const realSeatIndexes = seats.map(s => s.seat_index)
  const realBankedIndexes = state.bankedPlayers.filter(idx => realSeatIndexes.includes(idx))
  const winnerIndexes =
    state.outcome.kind === 'normal' ? [state.outcome.roundWinnerIndex] : state.outcome.winners.map(w => w.playerIndex)
  const correctedPayout = computeRoundPayout({
    baseStake: table.base_stake,
    multiplier: state.outcome.multiplier,
    winnerIndexes,
    allPlayerIndexes: realSeatIndexes,
    bankedPlayerIndexes: realBankedIndexes,
  })
  state.outcome!.payout = correctedPayout
  const payoutPlayers: PayoutPlayer[] = seats.map(s => ({ capital: s.capital }))
  const updatedPlayers = applyRoundPayout(payoutPlayers, correctedPayout, stakeConfig)
  const eliminatedSeats: number[] = []
  for (let i = 0; i < seats.length; i++) {
    const seatIdx = seats[i].seat_index
    if (updatedPlayers[i].isEliminated) {
      const { error } = await admin.from('kora_table_players').delete().eq('table_id', table.id).eq('seat_index', seatIdx)
      if (error) throw new Error(`Échec de libération du siège ${seatIdx} : ${error.message}`)
      eliminatedSeats.push(seatIdx)
    } else {
      const { error } = await admin
        .from('kora_table_players')
        .update({ capital: updatedPlayers[i].capital })
        .eq('table_id', table.id)
        .eq('seat_index', seatIdx)
      if (error) throw new Error(`Échec de mise à jour du capital (siège ${seatIdx}) : ${error.message}`)
    }
  }
  await admin.from('kora_rounds').update({ payout_applied: true, outcome: state.outcome }).eq('id', round.id)
  return { eliminatedSeats }
}

export function findCallerSeat(seats: SeatRow[], userId: string): SeatRow {
  const seat = seats.find(s => s.user_id === userId)
  if (!seat) throw new Error("Vous n'êtes pas assis à cette table.")
  return seat
}
