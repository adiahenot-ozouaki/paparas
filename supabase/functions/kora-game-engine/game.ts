// game.ts — start_table, play, bank, claim, resolve, next round
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import type { Card } from './engine/types.ts'
import type { GameStakeConfig } from './engine/payout.ts'
import {
  bankPlayer,
  claimVictory,
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
  type RoundRow,
} from './shared.ts'

export async function handleStartTable(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
  const table = await loadTable(admin, tableId)
  // Idempotent : si déjà en jeu, renvoyer l'état courant (évite la course entre 2 clients prêts)
  if (table.status === 'playing') {
    try {
      const { round, hands } = await loadLatestRound(admin, tableId)
      const state = reconstructRoundState(table, round, hands)
      return jsonResponse({ state: toPublicState(state, seatIndex), alreadyStarted: true })
    } catch {
      return jsonResponse({ state: null, alreadyStarted: true, tableStatus: 'playing' })
    }
  }
  if (table.status !== 'lobby') return errorResponse('La table a déjà démarré ou n\'est plus disponible.')
  const seats = await loadSeats(admin, tableId)
  if (seats.length < MIN_ACTIVE_PLAYERS) {
    return errorResponse(`Il faut au moins ${MIN_ACTIVE_PLAYERS} joueurs pour démarrer.`)
  }
  if (!seats.every(s => s.is_ready)) return errorResponse('Tous les joueurs assis doivent être prêts.')

  // Claim atomique du lobby (un seul client gagne la course)
  const { data: claimed, error: claimErr } = await admin
    .from('kora_tables')
    .update({ status: 'playing', started_at: new Date().toISOString() })
    .eq('id', tableId)
    .eq('status', 'lobby')
    .select('*')
  if (claimErr) return errorResponse(`Échec démarrage : ${claimErr.message}`)
  if (!claimed || claimed.length === 0) {
    // Un autre client a claim entre-temps
    try {
      const t2 = await loadTable(admin, tableId)
      const { round, hands } = await loadLatestRound(admin, tableId)
      const state = reconstructRoundState(t2, round, hands)
      return jsonResponse({ state: toPublicState(state, seatIndex), alreadyStarted: true })
    } catch {
      return jsonResponse({ state: null, alreadyStarted: true, tableStatus: 'playing' })
    }
  }

  const stakeConfig: GameStakeConfig = { baseStake: table.base_stake, startingCapital: table.starting_capital }
  const state = initRound({
    variant: table.deck_variant,
    numPlayers: NUM_PLAYERS,
    startPlayerIndex: 0,
    stakeConfig,
    eliminatedPlayers: computeVacantSeats(seats),
  })
  try {
    const round = await insertRound(admin, tableId, 1, state, seats)
    await admin.from('kora_table_players').update({ is_ready: false }).eq('table_id', tableId)
    const payoutResult = await applyPayoutAndStats(admin, table, round, state, seats)
    return jsonResponse({ state: toPublicState(state, seatIndex), eliminatedSeats: payoutResult.eliminatedSeats })
  } catch (e) {
    // Rollback status si le round n'a pas pu être créé
    await admin.from('kora_tables').update({ status: 'lobby', started_at: null }).eq('id', tableId)
    const message = e instanceof Error ? e.message : String(e)
    return errorResponse(message)
  }
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
  const seats = await loadSeats(admin, tableId)
  try {
    const { round, hands } = await loadLatestRound(admin, tableId)
    const state = reconstructRoundState(table, round, hands)
    return jsonResponse({
      state: toPublicState(state, seatIndex),
      roundNumber: round.round_number,
      tableStatus: table.status,
      occupiedSeats: seats.length,
    })
  } catch {
    return jsonResponse({ state: null, tableStatus: table.status, occupiedSeats: seats.length })
  }
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
  await insertRound(admin, tableId, prevRound.round_number + 1, nextState, seatsAfter)
  return jsonResponse({
    state: toPublicState(nextState, seatIndex),
    roundNumber: prevRound.round_number + 1,
    nextRoundStarted: true,
  })
}
