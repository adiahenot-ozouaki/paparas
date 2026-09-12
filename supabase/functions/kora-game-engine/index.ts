// ==========================================================================
// index.ts — Edge Function `kora-game-engine`.
// ==========================================================================

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import type { Card, DeckVariant, ComboType } from './engine/types.ts'
import {
  bankPlayer,
  claimVictory,
  getCurrentPlayerIndex,
  initRound,
  playCard,
  resolveTrick,
  type RoundOutcome,
  type RoundState,
} from './engine/round.ts'
import type { GameStakeConfig } from './engine/payout.ts'
import { applyRoundPayout, computeRoundPayout, type PayoutPlayer } from './engine/payout.ts'
import { getComboMultiplier } from './engine/combo.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status)
}

interface TableRow {
  id: string
  status: 'lobby' | 'playing' | 'finished'
  base_stake: number
  starting_capital: number
  deck_variant: DeckVariant
  created_by: string
  min_buy_in: number
  max_buy_in: number
}

interface SeatRow {
  table_id: string
  user_id: string
  seat_index: number
  capital: number
  is_ready: boolean
}

interface RoundRow {
  id: string
  table_id: string
  round_number: number
  phase: RoundState['phase']
  current_trick: RoundState['currentTrick']
  play_log: RoundState['playLog']
  trick_winners: number[]
  banked_players: number[]
  last_trick_winner_index: number | null
  outcome: RoundOutcome | null
  payout_applied: boolean
}

interface HandRow {
  round_id: string
  user_id: string
  seat_index: number
  cards: Card[]
  revealed: boolean
}

const NUM_PLAYERS = 4
const MIN_ACTIVE_PLAYERS = 2

function reconstructRoundState(table: TableRow, round: RoundRow, hands: HandRow[]): RoundState {
  const handsBySeat: Card[][] = Array.from({ length: NUM_PLAYERS }, () => [])
  for (const h of hands) handsBySeat[h.seat_index] = h.cards
  return {
    phase: round.phase,
    variant: table.deck_variant,
    numPlayers: NUM_PLAYERS,
    hands: handsBySeat,
    currentTrick: round.current_trick,
    playLog: round.play_log,
    trickWinners: round.trick_winners,
    lastTrickWinnerIndex: round.last_trick_winner_index,
    bankedPlayers: round.banked_players,
    outcome: round.outcome,
  }
}

function toPublicState(state: RoundState, callerSeatIndex: number) {
  const handsRevealed = state.outcome?.kind === 'specialWin'
  return {
    ...state,
    hands: state.hands.map((h, i) => (i === callerSeatIndex || handsRevealed ? h : h.map(() => null))),
  }
}

async function loadTable(admin: SupabaseClient, tableId: string): Promise<TableRow> {
  const { data, error } = await admin.from('kora_tables').select('*').eq('id', tableId).single()
  if (error || !data) throw new Error('Table introuvable.')
  return data as TableRow
}

async function loadSeats(admin: SupabaseClient, tableId: string): Promise<SeatRow[]> {
  const { data, error } = await admin
    .from('kora_table_players')
    .select('*')
    .eq('table_id', tableId)
    .order('seat_index', { ascending: true })
  if (error) throw new Error(`Impossible de charger les sièges : ${error.message}`)
  return (data ?? []) as SeatRow[]
}

function computeVacantSeats(seats: SeatRow[]): number[] {
  const occupied = new Set(seats.map(s => s.seat_index))
  const vacant: number[] = []
  for (let i = 0; i < NUM_PLAYERS; i++) {
    if (!occupied.has(i)) vacant.push(i)
  }
  return vacant
}

async function loadLatestRound(admin: SupabaseClient, tableId: string): Promise<{ round: RoundRow; hands: HandRow[] }> {
  const { data: round, error } = await admin
    .from('kora_rounds')
    .select('*')
    .eq('table_id', tableId)
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !round) throw new Error('Aucun round en cours pour cette table.')
  const { data: hands, error: handsError } = await admin.from('kora_round_hands').select('*').eq('round_id', round.id)
  if (handsError) throw new Error(`Impossible de charger les mains : ${handsError.message}`)
  return { round: round as RoundRow, hands: (hands ?? []) as HandRow[] }
}

async function insertRound(
  admin: SupabaseClient,
  tableId: string,
  roundNumber: number,
  state: RoundState,
  seats: SeatRow[],
): Promise<RoundRow> {
  const { data: round, error } = await admin
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
      payout_applied: false,
    })
    .select('*')
    .single()
  if (error || !round) throw new Error(`Échec de création du round : ${error?.message}`)
  const revealed = state.outcome?.kind === 'specialWin'
  const handRows = seats.map(seat => ({
    round_id: round.id,
    user_id: seat.user_id,
    seat_index: seat.seat_index,
    cards: state.hands[seat.seat_index],
    revealed,
  }))
  const { error: handsError } = await admin.from('kora_round_hands').insert(handRows)
  if (handsError) throw new Error(`Échec de création des mains : ${handsError.message}`)
  return round as RoundRow
}

async function updateRound(admin: SupabaseClient, roundId: string, state: RoundState, seats: SeatRow[]): Promise<void> {
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

async function applyPayoutAndStats(
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
  const payoutLines = [...correctedPayout.winners, ...correctedPayout.losers]
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
  const isRoundWinner = (seatIndex: number) =>
    state.outcome!.kind === 'normal'
      ? state.outcome!.roundWinnerIndex === seatIndex
      : state.outcome!.winners.some(w => w.playerIndex === seatIndex)
  for (let i = 0; i < seats.length; i++) {
    const seat = seats[i]
    const seatIdx = seat.seat_index
    const line = payoutLines.find(p => p.playerIndex === seatIdx)
    const delta = line?.amount ?? 0
    const tricksWonThisRound = state.trickWinners.filter(w => w === seatIdx).length
    const newCapital = updatedPlayers[i].capital
    const { data: statsRow, error: statsError } = await admin
      .from('kora_lifetime_stats')
      .select('*')
      .eq('user_id', seat.user_id)
      .single()
    if (statsError || !statsRow) throw new Error(`Statistiques introuvables pour ${seat.user_id} : ${statsError?.message}`)
    const comboCounts = { ...statsRow.combo_counts }
    const specialRuleCounts = { ...statsRow.special_rule_counts }
    let bestCombo = statsRow.best_combo as string | null
    if (state.outcome!.kind === 'normal' && isRoundWinner(seatIdx)) {
      const combo = state.outcome!.combo
      comboCounts[combo] = (comboCounts[combo] ?? 0) + 1
      const currentBestMultiplier = bestCombo ? getComboMultiplier(bestCombo as ComboType) : 0
      if (getComboMultiplier(combo) > currentBestMultiplier) bestCombo = combo
    }
    if (state.outcome!.kind === 'specialWin') {
      const winnerEntry = state.outcome!.winners.find(w => w.playerIndex === seatIdx)
      if (winnerEntry) {
        for (const rule of winnerEntry.rules) {
          specialRuleCounts[rule] = (specialRuleCounts[rule] ?? 0) + 1
        }
      }
    }
    const { error: updateStatsError } = await admin
      .from('kora_lifetime_stats')
      .update({
        total_rounds_won: statsRow.total_rounds_won + (isRoundWinner(seatIdx) ? 1 : 0),
        total_tricks_won: statsRow.total_tricks_won + tricksWonThisRound,
        total_gains: statsRow.total_gains + Math.max(0, delta),
        total_losses: statsRow.total_losses + Math.max(0, -delta),
        net_gain_total: statsRow.net_gain_total + delta,
        max_capital_ever: Math.max(statsRow.max_capital_ever, newCapital),
        min_capital_ever: statsRow.min_capital_ever === 0 ? newCapital : Math.min(statsRow.min_capital_ever, newCapital),
        combo_counts: comboCounts,
        special_rule_counts: specialRuleCounts,
        best_combo: bestCombo,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', seat.user_id)
    if (updateStatsError) throw new Error(`Échec de mise à jour des stats (${seat.user_id}) : ${updateStatsError.message}`)
  }
  await admin.from('kora_rounds').update({ payout_applied: true, outcome: state.outcome }).eq('id', round.id)
  return { eliminatedSeats }
}

async function authenticate(req: Request, admin: SupabaseClient): Promise<{ userId: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('UNAUTHENTICATED')
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  const { data, error } = await admin.auth.getUser(jwt)
  if (error || !data.user) throw new Error('UNAUTHENTICATED')
  return { userId: data.user.id }
}

function findCallerSeat(seats: SeatRow[], userId: string): SeatRow {
  const seat = seats.find(s => s.user_id === userId)
  if (!seat) throw new Error("Vous n'êtes pas assis à cette table.")
  return seat
}

async function handleStartTable(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
  const table = await loadTable(admin, tableId)
  if (table.status !== 'lobby') return errorResponse('Cette table a déjà démarré ou est terminée.')
  const seats = await loadSeats(admin, tableId)
  if (seats.length < MIN_ACTIVE_PLAYERS) {
    return errorResponse(`Il faut au moins ${MIN_ACTIVE_PLAYERS} joueurs pour démarrer (actuellement ${seats.length}).`)
  }
  if (!seats.every(s => s.is_ready)) return errorResponse('Tous les joueurs assis doivent être prêts.')
  const stakeConfig: GameStakeConfig = { baseStake: table.base_stake, startingCapital: table.starting_capital }
  const state = initRound({
    variant: table.deck_variant,
    numPlayers: NUM_PLAYERS,
    startPlayerIndex: 0,
    stakeConfig,
    eliminatedPlayers: computeVacantSeats(seats),
  })
  const round = await insertRound(admin, tableId, 1, state, seats)
  await admin.from('kora_tables').update({ status: 'playing', started_at: new Date().toISOString() }).eq('id', tableId)
  const payoutResult = await applyPayoutAndStats(admin, table, round, state, seats)
  return jsonResponse({ state: toPublicState(state, seatIndex), eliminatedSeats: payoutResult.eliminatedSeats })
}

async function handlePlayCard(admin: SupabaseClient, tableId: string, seatIndex: number, card: Card): Promise<Response> {
  const table = await loadTable(admin, tableId)
  const seats = await loadSeats(admin, tableId)
  const { round, hands } = await loadLatestRound(admin, tableId)
  const prevState = reconstructRoundState(table, round, hands)
  const nextState = playCard(prevState, seatIndex, card)
  await updateRound(admin, round.id, nextState, seats)
  return jsonResponse({ state: toPublicState(nextState, seatIndex) })
}

async function handleResolveTrick(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
  const table = await loadTable(admin, tableId)
  const seats = await loadSeats(admin, tableId)
  const { round, hands } = await loadLatestRound(admin, tableId)
  const prevState = reconstructRoundState(table, round, hands)
  const stakeConfig: GameStakeConfig = { baseStake: table.base_stake, startingCapital: table.starting_capital }
  const nextState = resolveTrick(prevState, stakeConfig)
  await updateRound(admin, round.id, nextState, seats)
  const updatedRound: RoundRow = { ...round, phase: nextState.phase, outcome: nextState.outcome }
  const payoutResult = await applyPayoutAndStats(admin, table, updatedRound, nextState, seats)
  return jsonResponse({ state: toPublicState(nextState, seatIndex), eliminatedSeats: payoutResult.eliminatedSeats })
}

async function handleBankPlayer(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
  const table = await loadTable(admin, tableId)
  const seats = await loadSeats(admin, tableId)
  const { round, hands } = await loadLatestRound(admin, tableId)
  const prevState = reconstructRoundState(table, round, hands)
  const stakeConfig: GameStakeConfig = { baseStake: table.base_stake, startingCapital: table.starting_capital }
  const nextState = bankPlayer(prevState, seatIndex, stakeConfig)
  await updateRound(admin, round.id, nextState, seats)
  const updatedRound: RoundRow = { ...round, phase: nextState.phase, outcome: nextState.outcome }
  const payoutResult = await applyPayoutAndStats(admin, table, updatedRound, nextState, seats)
  return jsonResponse({ state: toPublicState(nextState, seatIndex), eliminatedSeats: payoutResult.eliminatedSeats })
}

async function handleClaimVictory(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
  const table = await loadTable(admin, tableId)
  const seats = await loadSeats(admin, tableId)
  const { round, hands } = await loadLatestRound(admin, tableId)
  const prevState = reconstructRoundState(table, round, hands)
  const stakeConfig: GameStakeConfig = { baseStake: table.base_stake, startingCapital: table.starting_capital }
  const nextState = claimVictory(prevState, seatIndex, stakeConfig)
  await updateRound(admin, round.id, nextState, seats)
  const updatedRound: RoundRow = { ...round, phase: nextState.phase, outcome: nextState.outcome }
  const payoutResult = await applyPayoutAndStats(admin, table, updatedRound, nextState, seats)
  return jsonResponse({ state: toPublicState(nextState, seatIndex), eliminatedSeats: payoutResult.eliminatedSeats })
}

/**
 * Quitte volontairement la table (table cash game — "cash out").
 *
 * - Round en cours + pas encore banké → forfait (force bank, même après le 3e pli)
 * - Capital restant du siège → crédit wallet_balance du compte
 * - Siège supprimé (libère la place)
 * - Plus personne à table → suppression de la table et données liées
 */
async function handleLeaveTable(
  admin: SupabaseClient,
  tableId: string,
  userId: string,
  seatIndex: number,
): Promise<Response> {
