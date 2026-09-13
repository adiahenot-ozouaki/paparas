// game.ts — handlers de jeu (start, play, bank, claim, next round)
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import type { Card } from './engine/types.ts'
import type { RoundState } from './engine/round.ts'
import type { GameStakeConfig } from './engine/payout.ts'
import {
  bankPlayer,
  claimVictory,
  getCurrentPlayerIndex,
  initRound,
  playCard,
  resolveTrick,
} from './engine/round.ts'
import {
  applyPayoutAndStats,
  computeVacantSeats,
  errorResponse,
  insertRound,
  jsonResponse,
  loadLatestRound,
  loadSeats,
  loadTable,
  NUM_PLAYERS,
  MIN_ACTIVE_PLAYERS,
  reconstructRoundState,
  toPublicState,
  updateRound,
} from './shared.ts'

export async function handleStartTable(admin: SupabaseClient, tableId: string, _seatIndex: number): Promise<Response> {
  const table = await loadTable(admin, tableId)
  if (table.status !== 'lobby') return errorResponse('La table a déjà démarré ou n\'est plus disponible.')
  const seats = await loadSeats(admin, tableId)
  if (seats.length < MIN_ACTIVE_PLAYERS) {
    return errorResponse(`Il faut au moins ${MIN_ACTIVE_PLAYERS} joueurs pour démarrer.`)
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
  await insertRound(admin, tableId, 1, state, seats)
  await admin.from('kora_tables').update({ status: 'playing' }).eq('id', tableId)
  // Après le lancement, is_ready servira pour confirmer le round suivant
  await admin.from('kora_table_players').update({ is_ready: false }).eq('table_id', tableId)
  return jsonResponse({ started: true, state: toPublicState(state, seats[0]?.seat_index ?? 0), roundNumber: 1 })
}

export async function handleGetState(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
  const table = await loadTable(admin, tableId)
  const seats = await loadSeats(admin, tableId)
  const { round, hands } = await loadLatestRound(admin, tableId)
  const state = reconstructRoundState(table, round, hands)
  return jsonResponse({
    state: toPublicState(state, seatIndex),
    roundNumber: round.round_number,
    tableStatus: table.status,
    occupiedSeats: seats.length,
  })
}

export async function handlePlayCard(
  admin: SupabaseClient,
  tableId: string,
  seatIndex: number,
  card: Card,
): Promise<Response> {
  const table = await loadTable(admin, tableId)
  const seats = await loadSeats(admin, tableId)
  const { round, hands } = await loadLatestRound(admin, tableId)
  const state = reconstructRoundState(table, round, hands)
  const stakeConfig: GameStakeConfig = { baseStake: table.base_stake, startingCapital: table.starting_capital }
  const next = playCard(state, seatIndex, card)
  await updateRound(admin, round.id, next, seats)
  if (next.outcome) {
    await applyPayoutAndStats(admin, table, { ...round, phase: next.phase, outcome: next.outcome }, next, seats)
  }
  return jsonResponse({ state: toPublicState(next, seatIndex) })
}

export async function handleResolveTrick(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
  const table = await loadTable(admin, tableId)
  const seats = await loadSeats(admin, tableId)
  const { round, hands } = await loadLatestRound(admin, tableId)
  const state = reconstructRoundState(table, round, hands)
  const stakeConfig: GameStakeConfig = { baseStake: table.base_stake, startingCapital: table.starting_capital }
  const next = resolveTrick(state, stakeConfig)
  await updateRound(admin, round.id, next, seats)
  if (next.outcome) {
    await applyPayoutAndStats(admin, table, { ...round, phase: next.phase, outcome: next.outcome }, next, seats)
  }
  return jsonResponse({ state: toPublicState(next, seatIndex) })
}

export async function handleBankPlayer(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
  const table = await loadTable(admin, tableId)
  const seats = await loadSeats(admin, tableId)
  const { round, hands } = await loadLatestRound(admin, tableId)
  const state = reconstructRoundState(table, round, hands)
  const stakeConfig: GameStakeConfig = { baseStake: table.base_stake, startingCapital: table.starting_capital }
  const next = bankPlayer(state, seatIndex, stakeConfig)
  await updateRound(admin, round.id, next, seats)
  if (next.outcome) {
    await applyPayoutAndStats(admin, table, { ...round, phase: next.phase, outcome: next.outcome }, next, seats)
  }
  return jsonResponse({ state: toPublicState(next, seatIndex) })
}

export async function handleClaimVictory(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
  const table = await loadTable(admin, tableId)
  const seats = await loadSeats(admin, tableId)
  const { round, hands } = await loadLatestRound(admin, tableId)
  const state = reconstructRoundState(table, round, hands)
  const stakeConfig: GameStakeConfig = { baseStake: table.base_stake, startingCapital: table.starting_capital }
  const next = claimVictory(state, seatIndex, stakeConfig)
  await updateRound(admin, round.id, next, seats)
  if (next.outcome) {
    await applyPayoutAndStats(admin, table, { ...round, phase: next.phase, outcome: next.outcome }, next, seats)
  }
  return jsonResponse({ state: toPublicState(next, seatIndex) })
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
      state: toPublicState(prevState, seatIndex),
    })
  }

  // Confirmer ce joueur pour le prochain round (ne démarre pas tout seul)
  await admin
    .from('kora_table_players')
    .update({ is_ready: true })
    .eq('table_id', tableId)
    .eq('seat_index', seatIndex)

  const seatsAfter = await loadSeats(admin, tableId)
  const readyCount = seatsAfter.filter(s => s.is_ready).length
  const allReady = seatsAfter.length >= MIN_ACTIVE_PLAYERS && seatsAfter.every(s => s.is_ready)

  if (!allReady) {
    return jsonResponse({
      waitingForReady: true,
      readyCount,
      total: seatsAfter.length,
      message: `En attente des autres joueurs (${readyCount}/${seatsAfter.length}).`,
      state: toPublicState(prevState, seatIndex),
    })
  }

  // Tous prêts → reset flags puis nouveau round
  await admin.from('kora_table_players').update({ is_ready: false }).eq('table_id', tableId)

  const winnerIndex =
    prevState.outcome.kind === 'normal' ? prevState.outcome.roundWinnerIndex : prevState.outcome.winners[0].playerIndex
  const nextStarter = (winnerIndex + 1) % NUM_PLAYERS
  const stakeConfig: GameStakeConfig = { baseStake: table.base_stake, startingCapital: table.starting_capital }
  const nextState = initRound({
    variant: table.deck_variant,
    numPlayers: NUM_PLAYERS,
    startPlayerIndex: nextStarter,
    stakeConfig,
    eliminatedPlayers: computeVacantSeats(seatsAfter),
  })
  const round = await insertRound(admin, tableId, prevRound.round_number + 1, nextState, seatsAfter)
  return jsonResponse({
    state: toPublicState(nextState, seatIndex),
    roundNumber: prevRound.round_number + 1,
    nextRoundStarted: true,
  })
}
