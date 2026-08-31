// ==========================================================================
// index.ts — Edge Function `kora-game-engine`.
//
// Point d'entrée HTTP unique, actions dispatchées par `action` dans le
// corps JSON. Toute la logique de jeu vient de engine/ (portage verbatim
// du moteur client, à une exception près : engine/deck.ts utilise un RNG
// cryptographique au lieu de Math.random()).
//
// Un seul client Supabase, en service role — utilisé à la fois pour
// vérifier l'identité de l'appelant (admin.auth.getUser(jwt) valide un JWT
// sans avoir besoin d'un client séparé construit avec ce JWT) ET pour lire/
// écrire kora_rounds / kora_round_hands / capital / stats. Ce contournement
// volontaire de RLS est sûr ICI précisément parce que chaque action
// revalide tout elle-même (siège occupé, tour du joueur, coup légal) avant
// d'écrire quoi que ce soit — jamais un accès direct non validé.
//
// Chaque action valide le coup en rejouant l'état à travers les fonctions
// pures de engine/round.ts, qui lèvent une erreur sur tout coup illégal
// (mauvais tour, couleur non suivie, etc.). C'est cette validation qui
// rend le serveur réellement autoritaire — impossible de tricher en
// modifiant l'état côté client, il n'y a plus d'état côté client qui
// compte.
//
// --- Modèle "table cash game" (pas de tournoi à élimination) ---
// Un siège dont le capital tombe sous le seuil d'élimination est SUPPRIMÉ
// de kora_table_players (pas juste marqué) : il se libère immédiatement
// pour qu'un nouveau joueur puisse le prendre avec le buy-in de son choix.
// Il n'y a donc plus de "fin de partie" côté serveur : gamesPlayed/
// gamesWon ne sont plus incrémentés pour ce modèle, seules les stats par
// round (déjà en place) comptent.
//
// Prendre un siège vacant (`join_table`) N'EST PAS une action de cette
// Edge Function : c'est un simple INSERT direct dans kora_table_players,
// gouverné par RLS (voir migration kora_cash_table_dynamic_seats), exactement
// comme l'assise initiale en lobby — seule différence, la policy autorise
// désormais status='playing' en plus de 'lobby', avec vérification du
// buy-in dans [min_buy_in, max_buy_in] de la table.
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

// ----------------------------------------------------------------------------
// Lignes DB (formes minimales — uniquement les colonnes qu'on lit/écrit ici)
// ----------------------------------------------------------------------------

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

/** Nombre total de sièges physiques à la table (0 à 3) — reste toujours 4,
 * peu importe combien sont réellement occupés à un instant donné. Un siège
 * vacant est traité comme un siège "banni" depuis le début du round (voir
 * computeVacantSeats plus bas) — c'est le même mécanisme que la banque
 * volontaire en cours de round, le moteur n'a besoin d'aucun changement. */
const NUM_PLAYERS = 4
/** En dessous de ce nombre de sièges occupés, un round ne peut pas être joué (un pli à un seul joueur n'a pas de sens). */
const MIN_ACTIVE_PLAYERS = 2

// ----------------------------------------------------------------------------
// Reconstruction / décomposition RoundState <-> lignes DB
// ----------------------------------------------------------------------------

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

/** Ne renvoie au joueur QUE sa propre main en clair — les autres sont masquées, sauf révélation explicite (victoire par règle spéciale). */
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

/**
 * Sièges 0..3 SANS occupant actuel — traités comme "bannis depuis le début
 * du round" (paramètre eliminatedPlayers de initRound), exactement comme
 * un joueur qui va en banque volontairement en cours de partie. C'est ce
 * mécanisme, déjà présent dans engine/round.ts sans le savoir, qui permet
 * à une table cash game de fonctionner à 2, 3 ou 4 joueurs sans AUCUNE
 * modification du moteur pur.
 */
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

/** Insère un nouveau round (première distribution ou round suivant) + les 4 mains associées. */
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

/** Met à jour un round existant (après playCard / resolveTrick / bankPlayer / claimVictory) + réécrit les 4 mains. */
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

// ----------------------------------------------------------------------------
// Paiement + statistiques — appelé chaque fois qu'un round se termine
// (outcome non nul) et n'a pas encore été payé (payout_applied=false).
// Idempotent par construction : la garde payout_applied empêche tout
// double paiement même en cas de retry réseau côté client.
//
// Modèle "table cash game" (voir migration kora_cash_table_dynamic_seats) :
// un siège dont le capital tombe sous le seuil d'élimination est SUPPRIMÉ
// (pas juste marqué) — il se libère immédiatement pour qu'un nouveau
// joueur puisse s'y asseoir avec le buy-in de son choix. Il n'y a donc
// plus de notion de "partie terminée" : gamesPlayed/gamesWon ne sont plus
// incrémentés pour ce modèle (décision produit actée), seules les stats
// par round (déjà en place) comptent.
// ----------------------------------------------------------------------------

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

  // --- Recalcul du paiement en excluant les sièges VACANTS du pot. ---
  // L'engine traite un siège vacant exactement comme un joueur banni
  // (mécanisme volontairement partagé avec la banque en cours de round,
  // voir computeVacantSeats) — mais son calcul de pot original
  // (state.outcome.payout) facture `baseStake` à CHAQUE siège banni, y
  // compris les vacants, comme s'il s'agissait d'un vrai joueur ayant
  // réellement perdu de l'argent. Sans cette correction, le(s) gagnant(s)
  // recevraient un pot gonflé par de l'argent fictif (siège vacant = pas
  // de joueur = pas de perte réelle à créditer à qui que ce soit).
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

  // Le round a déjà été persisté (insertRound/updateRound) AVANT cet appel,
  // avec le payout BRUT du moteur (incluant les sièges vacants). On corrige
  // ici l'enregistrement ET l'objet en mémoire (déjà référencé par la
  // réponse JSON en cours de construction chez l'appelant) pour que la
  // valeur vue par le client soit TOUJOURS celle réellement créditée —
  // sinon l'historique du round et les crédits réels divergeraient dès
  // qu'un siège vacant existait ce round-là.
  state.outcome!.payout = correctedPayout

  const payoutPlayers: PayoutPlayer[] = seats.map(s => ({ capital: s.capital }))
  const updatedPlayers = applyRoundPayout(payoutPlayers, correctedPayout, stakeConfig)

  // --- Capital, par siège. Sous le seuil : le siège se LIBÈRE (suppression
  // de la ligne), pas de simple flag — c'est tout le principe cash game. ---
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

  // --- Statistiques cumulées, par siège (chaque siège = un vrai joueur en
  // ligne). Calculées AVANT toute suppression de ligne ci-dessus — `seats`
  // référence toujours les occupants du round qui vient de se jouer, que
  // leur siège vienne d'être libéré ou non. ---
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

// ----------------------------------------------------------------------------
// Authentification de l'appelant
// ----------------------------------------------------------------------------

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

// ============================================================================
// Actions
// ============================================================================

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
    startPlayerIndex: 0, // initRound saute automatiquement les sièges vacants si besoin (voir eliminatedPlayers)
    stakeConfig,
    eliminatedPlayers: computeVacantSeats(seats),
  })

  const round = await insertRound(admin, tableId, 1, state, seats)
  await admin.from('kora_tables').update({ status: 'playing', started_at: new Date().toISOString() }).eq('id', tableId)

  const payoutResult = await applyPayoutAndStats(admin, table, round, state, seats)

  // BUG corrigé : renvoyait `state` brut (les 4 mains en clair, y compris
  // celles des autres joueurs) au lieu de le filtrer comme toutes les
  // autres actions — seule différence, ici, avec les autres handlers.
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
 * Quitte volontairement la table (table cash game — "cash out"). Le siège
 * se libère immédiatement pour un futur joueur, exactement comme une
 * élimination, sauf que le capital restant n'est pas remis en jeu — le
 * joueur l'emporte simplement avec lui (pas de wallet persistant pour
 * l'instant, voir README : le capital ne vit que pour la durée où le
 * joueur reste assis à CETTE table).
 *
 * Refusé si un round est en cours ET que ce siège n'est pas déjà banni
 * pour ce round (déjà "allé en banque" via bank_player) — quitter en plein
 * milieu d'un pli casserait le décompte activeCount du moteur (voir
 * engine/round.ts::playCard). Entre deux rounds (phase roundEnd/
 * specialWin) ou avant le tout premier round (table encore en lobby),
 * c'est toujours autorisé.
 */
async function handleLeaveTable(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
  const table = await loadTable(admin, tableId)

  if (table.status === 'playing') {
    const { round, hands } = await loadLatestRound(admin, tableId)
    const state = reconstructRoundState(table, round, hands)
    const roundInProgress = state.phase === 'playing' || state.phase === 'trickWon'
    const alreadyBanked = state.bankedPlayers.includes(seatIndex)

    if (roundInProgress && !alreadyBanked) {
      return errorResponse(
        'Impossible de quitter en plein round — terminez-le ou allez en banque (bank_player) avant de quitter.',
      )
    }
  }

  const { error } = await admin.from('kora_table_players').delete().eq('table_id', tableId).eq('seat_index', seatIndex)
  if (error) throw new Error(`Échec pour quitter la table : ${error.message}`)

  return jsonResponse({ left: true })
}

async function handleGetState(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
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

async function handleStartNextRound(admin: SupabaseClient, tableId: string, seatIndex: number): Promise<Response> {
  const table = await loadTable(admin, tableId)
  if (table.status !== 'playing') return errorResponse('Cette table n\'est plus en cours.')

  const seats = await loadSeats(admin, tableId)
  const { round: prevRound, hands } = await loadLatestRound(admin, tableId)
  const prevState = reconstructRoundState(table, prevRound, hands)

  if (!prevState.outcome) return errorResponse('Le round précédent n\'est pas encore terminé.')

  // Table cash game : si trop de sièges se sont libérés (éliminations), on
  // NE force plus la fin de la table — on attend simplement qu'un nouveau
  // joueur s'assoie. Ce n'est pas une erreur, juste un état normal entre
  // deux mains tant qu'il n'y a pas assez de monde pour jouer un pli.
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

// ============================================================================
// Router HTTP
// ============================================================================

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return errorResponse('Méthode non supportée.', 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceRoleKey)

  let body: { action?: string; tableId?: string; card?: Card }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Corps de requête JSON invalide.')
  }

  const { action, tableId } = body
  if (!action) return errorResponse('Champ "action" manquant.')

  try {
    // L'appelant doit être assis à la table pour TOUTE action, y compris
    // start_table (seul un joueur assis peut démarrer sa propre table) —
    // c'est aussi ce qui permet de filtrer la réponse sur SA main.
    const { userId } = await authenticate(req, admin)

    if (!tableId) return errorResponse('Champ "tableId" manquant.')

    const seats = await loadSeats(admin, tableId)
    const callerSeat = findCallerSeat(seats, userId)

    switch (action) {
      case 'start_table':
        return await handleStartTable(admin, tableId, callerSeat.seat_index)
      case 'get_state':
        return await handleGetState(admin, tableId, callerSeat.seat_index)
      case 'play_card': {
        if (!body.card) return errorResponse('Champ "card" manquant.')
        return await handlePlayCard(admin, tableId, callerSeat.seat_index, body.card)
      }
      case 'resolve_trick':
        return await handleResolveTrick(admin, tableId, callerSeat.seat_index)
      case 'bank_player':
        return await handleBankPlayer(admin, tableId, callerSeat.seat_index)
      case 'claim_victory':
        return await handleClaimVictory(admin, tableId, callerSeat.seat_index)
      case 'start_next_round':
        return await handleStartNextRound(admin, tableId, callerSeat.seat_index)
      case 'leave_table':
        return await handleLeaveTable(admin, tableId, callerSeat.seat_index)
      default:
        return errorResponse(`Action inconnue : "${action}".`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === 'UNAUTHENTICATED') return errorResponse('Authentification requise.', 401)
    // Les erreurs levées par engine/round.ts (coup illégal, mauvais tour...)
    // remontent ici telles quelles — ce sont déjà des messages destinés à
    // être lus, pas des détails d'implémentation à cacher.
    return errorResponse(message, 400)
  }
})
