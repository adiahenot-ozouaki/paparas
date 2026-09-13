// game.ts — start / play / resolve / bank / claim / get_state / next_round
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import type { Card } from './engine/types.ts'
import {
  bankPlayer,
  claimVictory,
  getCurrentPlayerIndex,
  initRound,
  playCard,
  resolveTrick,
  type RoundState,
} from './engine/round.ts'
import type { GameStakeConfig } from './engine/payout.ts'
import {
  applyPayoutAndStats,
  computeVacantSeats,
  errorResponse,
  insertRound,
  jsonResponse,
  loadLatestRound,
  loadSeats,
  loadTable,
  reconstructRoundState,
  toPublicState,
  updateRound,
  type RoundRow,
  type TableRow,
  NUM_PLAYERS,
  MIN_ACTIVE_PLAYERS,
} from './shared.ts'

export async function handleStartTable(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
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

export async function handlePlayCard(admin: SupabaseClient, tableId: string, seatIndex: number, card: Card): Promise<Response> {
  const table = await loadTable(admin, tableId)
  const seats = await loadSeats(admin, tableId)
  const { round, hands } = await loadLatestRound(admin, tableId)
  const prevState = reconstructRoundState(table, round, hands)
  const nextState = playCard(prevState, seatIndex, card)
  await updateRound(admin, round.id, nextState, seats)
  return jsonResponse({ state: toPublicState(nextState, seatIndex) })
}

export async function handleResolveTrick(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
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

export async function handleBankPlayer(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
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

export async function handleClaimVictory(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
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

export async function handleGetState(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
  const table = await loadTable(admin, tableId)
  if (table.status === 'lobby') {
    return jsonResponse({ tableStatus: 'lobby', roundNumber: 0, state: null, isYourTurn: false })
  }
  const { round, hands } = await loadLatestRound(admin, tableId)
  const state = reconstructRoundState(table, round, hands)
  return jsonResponse({
    tableStatus: table.status,
    roundNumber: round.round_number,
    state: toPublicState(state, seatIndex),
    isYourTurn: getCurrentPlayerIndex(state) === seatIndex,
  })
}

export async function handleStartNextRound(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
  const table = await loadTable(admin, tableId)
  if (table.status !== 'playing') return errorResponse('Cette table n\'est plus en cours.')
  const seats = await loadSeats(admin, tableId)
  const { round: prevRound, hands } = await loadLatestRound(admin, tableId)
  const prevState = reconstructRoundState(table, prevRound, hands)
  if (!prevState.outcome) return errorResponse('Le round précédent n\'est pas encore terminé.')
  if (seats.length < MIN_ACTIVE_PLAYERS) {
    return jsonResponse({
      waitingForPlayers: true,
      occupiedSeats: seats.length,
      message: `En attente d'au moins ${MIN_ACTIVE_PLAYERS} joueurs pour continuer (actuellement ${seats.length}).`,
    })
  }
  const winnerIndex =
    prevState.outcome.kind === 'normal' ? prevState.outcome.roundWinnerIndex : prevState.outcome.winners[0].playerIndex
  const nextStarter = (winnerIndex + 1) % NUM_PLAYERS
  const stakeConfig: GameStakeConfig = { baseStake: table.base_stake, startingCapital: table.starting_capital }
  const nextState = initRound({
    variant: table.deck_variant,
    numPlayers: NUM_PLAYERS,
    startPlayerIndex: nextStarter,
    stakeConfig,
    eliminatedPlayers: computeVacantSeats(seats),
  })
  const round = await insertRound(admin, tableId, prevRound.round_number + 1, nextState, seats)
  const payoutResult = await applyPayoutAndStats(admin, table, round, nextState, seats)
  return jsonResponse({ state: toPublicState(nextState, seatIndex), eliminatedSeats: payoutResult.eliminatedSeats })
}
