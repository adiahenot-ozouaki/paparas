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
  const seats = await loadSeats(admin, tableId)
  if (seats.length < MIN_ACTIVE_PLAYERS) {
    return errorResponse(`Il faut au moins ${MIN_ACTIVE_PLAYERS} joueurs pour démarrer.`)
  }
  if (!seats.every(s => s.is_ready)) {
    return errorResponse('Tous les joueurs assis doivent être prêts.')
  }

  // Si déjà en jeu avec un round → renvoyer l'état
  {
    const table0 = await loadTable(admin, tableId)
    if (table0.status === 'playing') {
      for (let i = 0; i < 8; i++) {
        try {
          const { round, hands } = await loadLatestRound(admin, tableId)
          const state = reconstructRoundState(table0, round, hands)
          return jsonResponse({ state: toPublicState(state, seatIndex), alreadyStarted: true })
        } catch {
          await new Promise(r => setTimeout(r, 250))
        }
      }
      // playing sans round = état cassé → nettoyer et retenter plus bas
      await admin.from('kora_tables').update({ status: 'lobby', started_at: null }).eq('id', tableId)
    }
  }

  // Jusqu'à 5 tentatives claim + create (gère course + rollback concurrent)
  let lastError = 'Impossible de démarrer la table.'
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 300 * attempt))

    const table = await loadTable(admin, tableId)

    // Un concurrent a réussi entre-temps
    if (table.status === 'playing') {
      try {
        const { round, hands } = await loadLatestRound(admin, tableId)
        const state = reconstructRoundState(table, round, hands)
        return jsonResponse({ state: toPublicState(state, seatIndex), alreadyStarted: true })
      } catch {
        lastError = 'Table en jeu mais round indisponible.'
        continue
      }
    }
    if (table.status !== 'lobby') {
      return errorResponse('La table a déjà démarré ou n\'est plus disponible.')
    }

    // Claim
    const { data: claimed, error: claimErr } = await admin
      .from('kora_tables')
      .update({ status: 'playing', started_at: new Date().toISOString() })
      .eq('id', tableId)
      .eq('status', 'lobby')
      .select('*')
    if (claimErr) {
      lastError = `Échec démarrage : ${claimErr.message}`
      continue
    }
    if (!claimed || claimed.length === 0) {
      // Perdu le claim — attendre un round
      for (let w = 0; w < 6; w++) {
        await new Promise(r => setTimeout(r, 300))
        const t2 = await loadTable(admin, tableId)
        if (t2.status === 'playing') {
          try {
            const { round, hands } = await loadLatestRound(admin, tableId)
            const state = reconstructRoundState(t2, round, hands)
            return jsonResponse({ state: toPublicState(state, seatIndex), alreadyStarted: true })
          } catch {
            /* wait */
          }
        }
        if (t2.status === 'lobby') break // concurrent a rollback → retenter claim
      }
      continue
    }

    // On a le claim : réutiliser un round existant (orphelins) ou créer
    try {
      try {
        const existing = await loadLatestRound(admin, tableId)
        const state = reconstructRoundState(table, existing.round, existing.hands)
        await admin.from('kora_table_players').update({ is_ready: false }).eq('table_id', tableId)
        return jsonResponse({ state: toPublicState(state, seatIndex), alreadyStarted: true })
      } catch {
        /* create new */
      }

      const stakeConfig: GameStakeConfig = { baseStake: table.base_stake, startingCapital: table.starting_capital }
      const state = initRound({
        variant: table.deck_variant,
        numPlayers: NUM_PLAYERS,
        startPlayerIndex: 0,
        stakeConfig,
        eliminatedPlayers: computeVacantSeats(seats),
      })
      const round = await insertRound(admin, tableId, 1, state, seats)
      await admin.from('kora_table_players').update({ is_ready: false }).eq('table_id', tableId)
      const payoutResult = await applyPayoutAndStats(admin, table, round, state, seats)
      return jsonResponse({ state: toPublicState(state, seatIndex), eliminatedSeats: payoutResult.eliminatedSeats })
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      // Cleanup orphelins + rollback lobby pour retenter
      try {
        const { data: orphanRounds } = await admin.from('kora_rounds').select('id').eq('table_id', tableId)
        const ids = (orphanRounds ?? []).map((r: { id: string }) => r.id)
        if (ids.length > 0) {
          await admin.from('kora_round_hands').delete().in('round_id', ids)
          await admin.from('kora_rounds').delete().eq('table_id', tableId)
        }
      } catch {
        /* ignore */
      }
      await admin.from('kora_tables').update({ status: 'lobby', started_at: null }).eq('id', tableId)
    }
  }

  return errorResponse(lastError)
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
