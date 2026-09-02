// ==========================================================================
// payout.ts — Gains, pertes, élimination et fin de partie
//
// Modes de fin (endMode) :
//   - elimination   : dernier survivant (comportement historique)
//   - fixedRounds   : après maxRounds, le plus riche gagne (élimination active)
//   - raceToCapital : premier à atteindre targetCapital, sinon élimination
//
// Hybride recommandé : fixedRounds (élimination OU plafond de rounds).
// ==========================================================================

import type { Player } from '../types.ts'

/** Comment la partie peut se terminer. */
export type GameEndMode = 'elimination' | 'fixedRounds' | 'raceToCapital'

export type GameOverReason =
  | 'last_standing'
  | 'max_rounds'
  | 'race_target'
  | 'all_eliminated'

export interface GameStakeConfig {
  /** Mise de base, définie avant le début de la partie. */
  baseStake: number
  /** Capital de départ de chaque joueur. */
  startingCapital: number
  /**
   * Seuil sous lequel un joueur est éliminé. Par défaut égal à baseStake.
   */
  eliminationThreshold?: number
  /** Mode de fin de partie. Défaut : élimination pure. */
  endMode?: GameEndMode
  /** Nombre max de rounds (mode fixedRounds). Défaut 10. */
  maxRounds?: number
  /** Capital cible (mode raceToCapital). */
  targetCapital?: number
}

/** Valeurs par défaut UNIQUEMENT pour les tests / le mode démo. */
export const DEFAULT_STAKE_CONFIG: GameStakeConfig = {
  baseStake: 500,
  startingCapital: 5000,
  endMode: 'fixedRounds',
  maxRounds: 10,
}

export function resolveEndMode(config: GameStakeConfig): GameEndMode {
  return config.endMode ?? 'elimination'
}

export function resolveMaxRounds(config: GameStakeConfig): number {
  return config.maxRounds ?? 10
}

export function resolveTargetCapital(config: GameStakeConfig): number {
  return config.targetCapital ?? config.startingCapital * 3
}

function resolveEliminationThreshold(config: GameStakeConfig): number {
  return config.eliminationThreshold ?? config.baseStake
}

export interface PlayerPayout {
  playerIndex: number
  amount: number // positif pour un gain, négatif pour une perte
}

export interface RoundPayoutResult {
  winners: PlayerPayout[]
  losers: PlayerPayout[]
}

/**
 * Calcule les gains/pertes d'un round.
 * bankedPlayerIndexes paient toujours baseStake ×1.
 */
export function computeRoundPayout(params: {
  baseStake: number
  multiplier: number
  winnerIndexes: number[]
  allPlayerIndexes: number[]
  bankedPlayerIndexes?: number[]
}): RoundPayoutResult {
  const { baseStake, multiplier, winnerIndexes, allPlayerIndexes, bankedPlayerIndexes = [] } = params

  if (winnerIndexes.length === 0) {
    throw new Error('computeRoundPayout: au moins un gagnant est requis.')
  }

  const activeLoserIndexes = allPlayerIndexes.filter(
    i => !winnerIndexes.includes(i) && !bankedPlayerIndexes.includes(i),
  )
  const lossPerActiveLoser = baseStake * multiplier
  const lossPerBankedPlayer = baseStake

  const totalPot = lossPerActiveLoser * activeLoserIndexes.length + lossPerBankedPlayer * bankedPlayerIndexes.length

  const baseShare = Math.floor(totalPot / winnerIndexes.length)
  const remainder = totalPot - baseShare * winnerIndexes.length

  return {
    winners: winnerIndexes.map((playerIndex, i) => ({
      playerIndex,
      amount: baseShare + (i < remainder ? 1 : 0),
    })),
    losers: [
      ...activeLoserIndexes.map(playerIndex => ({ playerIndex, amount: -lossPerActiveLoser })),
      ...bankedPlayerIndexes.map(playerIndex => ({ playerIndex, amount: -lossPerBankedPlayer })),
    ],
  }
}

export function applyRoundPayout(
  players: Player[],
  payout: RoundPayoutResult,
  config: GameStakeConfig,
): Player[] {
  const threshold = resolveEliminationThreshold(config)
  const allMoves = [...payout.winners, ...payout.losers]

  return players.map((player, index) => {
    const move = allMoves.find(m => m.playerIndex === index)
    if (!move) return player

    const newCapital = player.capital + move.amount
    const isEliminated = newCapital < threshold

    return {
      ...player,
      capital: newCapital,
      isEliminated: isEliminated || player.isEliminated,
    }
  })
}

export interface GameOverCheck {
  isOver: boolean
  winnerIndex?: number
  reason?: GameOverReason
}

/** Index du joueur non éliminé au capital le plus élevé (égalité → plus petit index). */
export function richestActiveIndex(players: Player[]): number | undefined {
  let bestIndex: number | undefined
  let bestCapital = -Infinity
  for (let i = 0; i < players.length; i++) {
    const p = players[i]
    if (p.isEliminated) continue
    if (p.capital > bestCapital) {
      bestCapital = p.capital
      bestIndex = i
    }
  }
  return bestIndex
}

/**
 * Vérifie si la partie est terminée selon le mode configuré.
 *
 * @param players état après application du payout du round courant
 * @param config  mise / mode de fin
 * @param roundNumber numéro du round qui vient de se terminer (1-based)
 */
export function checkGameOver(
  players: Player[],
  config: GameStakeConfig = DEFAULT_STAKE_CONFIG,
  roundNumber = 0,
): GameOverCheck {
  const remaining = players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => !player.isEliminated)

  // Toujours : 0 ou 1 survivant → fin
  if (remaining.length === 0) {
    return { isOver: true, reason: 'all_eliminated' }
  }
  if (remaining.length === 1) {
    return { isOver: true, winnerIndex: remaining[0].index, reason: 'last_standing' }
  }

  const mode = resolveEndMode(config)

  if (mode === 'raceToCapital') {
    const target = resolveTargetCapital(config)
    const reached = remaining
      .filter(({ player }) => player.capital >= target)
      .sort((a, b) => b.player.capital - a.player.capital || a.index - b.index)
    if (reached.length > 0) {
      return { isOver: true, winnerIndex: reached[0].index, reason: 'race_target' }
    }
  }

  if (mode === 'fixedRounds') {
    const maxRounds = resolveMaxRounds(config)
    if (roundNumber >= maxRounds) {
      return {
        isOver: true,
        winnerIndex: richestActiveIndex(players),
        reason: 'max_rounds',
      }
    }
  }

  return { isOver: false }
}

/** Libellé UX de la raison de fin. */
export function gameOverReasonLabel(reason: GameOverReason | undefined, config?: GameStakeConfig): string {
  switch (reason) {
    case 'last_standing':
      return 'Dernier joueur en lice'
    case 'max_rounds':
      return `Plafond de ${resolveMaxRounds(config ?? DEFAULT_STAKE_CONFIG)} rounds atteint — plus riche gagne`
    case 'race_target':
      return `Objectif de ${(config ? resolveTargetCapital(config) : 0).toLocaleString('fr-FR')} FCFA atteint`
    case 'all_eliminated':
      return 'Tous les joueurs sont éliminés'
    default:
      return 'Partie terminée'
  }
}
