// leave.ts — leave_table + suppression table vide
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import type { RoundState } from './engine/round.ts'
import type { GameStakeConfig } from './engine/payout.ts'
import { bankPlayer } from './engine/round.ts'
import { computeRoundPayout } from './engine/payout.ts'
import {
  applyPayoutAndStats,
  jsonResponse,
  loadLatestRound,
  loadSeats,
  loadTable,
  reconstructRoundState,
  updateRound,
  type RoundRow,
  type SeatRow,
  type TableRow,
} from './shared.ts'

/**
 * Quitte volontairement la table (table cash game — "cash out").
 *
 * - Round en cours + pas encore banké → forfait (force bank, même après le 3e pli)
 * - Capital restant du siège → crédit wallet_balance du compte
 * - Siège supprimé (libère la place)
 * - Plus personne à table → suppression de la table et données liées
 * - < 2 joueurs restants en partie → cash-out des restants + dissolution
 */
export async function handleLeaveTable(
  admin: SupabaseClient,
  tableId: string,
  seatIndex: number,
  userId: string,
): Promise<Response> {
  const table = await loadTable(admin, tableId)
  const seats = await loadSeats(admin, tableId)
  const seat = seats.find(s => s.seat_index === seatIndex)
  const cashOut = seat?.capital ?? 0
  let forfeited = false

  if (table.status === 'playing') {
    try {
      const { round, hands } = await loadLatestRound(admin, tableId)
      const state = reconstructRoundState(table, round, hands)
      const roundInProgress = state.phase === 'playing' || state.phase === 'trickWon'
      const alreadyBanked = state.bankedPlayers.includes(seatIndex)

      if (roundInProgress && !alreadyBanked) {
        forfeited = true
        const stakeConfig: GameStakeConfig = {
          baseStake: table.base_stake,
          startingCapital: table.starting_capital,
        }

        let nextState: RoundState
        const canLegalBank =
          state.phase === 'playing' &&
          !!state.currentTrick &&
          state.currentTrick.trickNumber < 3

        if (canLegalBank) {
          try {
            nextState = bankPlayer(state, seatIndex, stakeConfig)
          } catch {
            nextState = forceForfeitBank(state, seatIndex, stakeConfig)
          }
        } else {
          nextState = forceForfeitBank(state, seatIndex, stakeConfig)
        }

        await updateRound(admin, round.id, nextState, seats)

        if (nextState.outcome) {
          const updatedRound: RoundRow = {
            ...round,
            phase: nextState.phase,
            outcome: nextState.outcome,
          }
          await applyPayoutAndStats(admin, table, updatedRound, nextState, seats)
        }
      }
    } catch {
      // Pas de round chargeable — on libère quand même le siège
    }
  }

  // Cash-out : capital siège → wallet compte
  if (cashOut > 0) {
    const { data: profile, error: profErr } = await admin
      .from('kora_profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single()
    if (profErr || !profile) {
      console.error('[leave_table] profil cash-out:', profErr?.message)
    } else {
      const nextWallet = (profile.wallet_balance ?? 0) + cashOut
      const { error: walletErr } = await admin
        .from('kora_profiles')
        .update({ wallet_balance: nextWallet })
        .eq('id', userId)
      if (walletErr) {
        console.error('[leave_table] crédit wallet:', walletErr.message)
      }
    }
  }

  const { error } = await admin
    .from('kora_table_players')
    .delete()
    .eq('table_id', tableId)
    .eq('seat_index', seatIndex)
  if (error) throw new Error(`Échec pour quitter la table : ${error.message}`)

  const remaining = await loadSeats(admin, tableId)
  let tableDissolved = false

  if (remaining.length === 0) {
    await deleteEmptyTable(admin, tableId)
    tableDissolved = true
  } else if (remaining.length < 2 && table.status === 'playing') {
    // Moins de 2 joueurs → la table ne peut plus continuer : cash-out des restants + dissolution
    for (const s of remaining) {
      const cap = s.capital ?? 0
      if (cap > 0) {
        const { data: profile } = await admin
          .from('kora_profiles')
          .select('wallet_balance')
          .eq('id', s.user_id)
          .maybeSingle()
        if (profile) {
          await admin
            .from('kora_profiles')
            .update({ wallet_balance: (profile.wallet_balance ?? 0) + cap })
            .eq('id', s.user_id)
        }
      }
      await admin.from('kora_table_players').delete().eq('table_id', tableId).eq('user_id', s.user_id)
    }
    await deleteEmptyTable(admin, tableId)
    tableDissolved = true
  }

  return jsonResponse({ left: true, cashOut, forfeited, tableDissolved })
}

/** Supprime une table vide (aucun siège) et ses données associées. */
async function deleteEmptyTable(admin: SupabaseClient, tableId: string): Promise<void> {
  const { data: rounds } = await admin.from('kora_rounds').select('id').eq('table_id', tableId)
  const roundIds = (rounds ?? []).map((r: { id: string }) => r.id)
  if (roundIds.length > 0) {
    const { error: handsErr } = await admin.from('kora_round_hands').delete().in('round_id', roundIds)
    if (handsErr) console.error('[leave_table] delete hands:', handsErr.message)
    const { error: roundsErr } = await admin.from('kora_rounds').delete().eq('table_id', tableId)
    if (roundsErr) console.error('[leave_table] delete rounds:', roundsErr.message)
  }
  const { error: playersErr } = await admin.from('kora_table_players').delete().eq('table_id', tableId)
  if (playersErr) console.error('[leave_table] delete players:', playersErr.message)
  const { error: tableErr } = await admin.from('kora_tables').delete().eq('id', tableId)
  if (tableErr) console.error('[leave_table] delete table:', tableErr.message)
}

/** Forfait hors fenêtre de banque légale (après 3e pli ou phase trickWon). */
function forceForfeitBank(
  state: RoundState,
  seatIndex: number,
  stakeConfig: GameStakeConfig,
): RoundState {
  if (state.bankedPlayers.includes(seatIndex)) return state

  const newBanked = [...state.bankedPlayers, seatIndex]
  const activeIndexes = Array.from({ length: state.numPlayers }, (_, i) => i).filter(
    i => !newBanked.includes(i),
  )
  const stateAfter: RoundState = { ...state, bankedPlayers: newBanked }

  if (activeIndexes.length === 1 && (state.phase === 'playing' || state.phase === 'trickWon')) {
    const winnerIndex = activeIndexes[0]
    const payout = computeRoundPayout({
      baseStake: stakeConfig.baseStake,
      multiplier: 1,
      winnerIndexes: [winnerIndex],
      allPlayerIndexes: Array.from({ length: state.numPlayers }, (_, i) => i),
      bankedPlayerIndexes: newBanked,
    })
    return {
      ...stateAfter,
      phase: 'roundEnd',
      currentTrick: null,
      outcome: {
        kind: 'normal',
        roundWinnerIndex: winnerIndex,
        combo: 'simple',
        multiplier: 1,
        payout,
        bankedPlayerIndexes: newBanked,
        wonByClaim: false,
      },
    }
  }

  return stateAfter
}
