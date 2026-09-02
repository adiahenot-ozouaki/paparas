// ==========================================================================
// payout.ts — Gains, pertes et élimination
//
// Étape 6/10 du plan. Dépend de types.ts (étape 1).
// Place ce fichier dans src/game/payout.ts.
//
// Rappel des règles (section 6 du document) :
//   - Le gagnant du round (normal ou par règle spéciale) gagne :
//       mise de base × multiplicateur × (nombre de joueurs − 1)
//   - Chaque joueur qui perd le round paie :
//       mise de base × multiplicateur
//   - Un joueur dont l'argent tombe sous [seuil d'élimination] est éliminé.
//   - La partie se termine dès qu'il ne reste plus qu'un joueur non éliminé.
//
// IMPORTANT : la mise de base (baseStake) et le capital de départ
// (startingCapital) sont configurables AVANT le début de la partie.
// 500 FCFA / 5 000 FCFA ne sont que des valeurs par défaut pour les tests
// (DEFAULT_STAKE_CONFIG), pas des constantes figées dans la logique.
//
// Généralisation aux gagnants multiples (règle spéciale déclenchée par
// plusieurs joueurs simultanément, section 3) : chaque perdant paie
// toujours `mise × multiplicateur` (montant inchangé, indépendant du
// nombre de gagnants). Le total ainsi collecté est réparti à parts égales
// entre tous les gagnants. Avec un seul gagnant, cette règle redonne
// exactement la formule `mise × multiplicateur × (joueurs − 1)` du
// document — c'est une généralisation, pas une règle différente.
// ==========================================================================

import type { Player } from '../types.ts'

export interface GameStakeConfig {
  /** Mise de base, définie avant le début de la partie. */
  baseStake: number
  /** Capital de départ de chaque joueur. */
  startingCapital: number
  /**
   * Seuil sous lequel un joueur est éliminé. Par défaut égal à baseStake
   * (voir note de design ci-dessus) ; peut être surchargé indépendamment
   * si besoin.
   */
  eliminationThreshold?: number
}

/** Valeurs par défaut UNIQUEMENT pour les tests / le mode démo. */
export const DEFAULT_STAKE_CONFIG: GameStakeConfig = {
  baseStake: 500,
  startingCapital: 5000,
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
 * Calcule les gains/pertes d'un round étant donné les joueurs gagnants
 * (un seul en temps normal, potentiellement plusieurs en cas de règle
 * spéciale simultanée) et le multiplicateur applicable.
 *
 * bankedPlayerIndexes (optionnel) : joueurs ayant été "en banque"
 * (abandon, voir round.ts::bankPlayer). Ils paient toujours exactement
 * baseStake ×1, INDÉPENDAMMENT du multiplicateur du round — contrairement
 * aux perdants actifs qui paient baseStake × multiplier. Leur mise
 * rejoint le pot du/des gagnant(s) comme n'importe quelle perte, ce qui
 * préserve la somme nulle globale.
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
  const lossPerBankedPlayer = baseStake // toujours ×1, quel que soit le combo final

  const totalPot = lossPerActiveLoser * activeLoserIndexes.length + lossPerBankedPlayer * bankedPlayerIndexes.length

  // Répartition ENTIÈRE du pot entre les gagnants — pas de division brute.
  // Avec plusieurs gagnants simultanés (règle spéciale déclenchée par
  // plusieurs joueurs), `totalPot / winnerIndexes.length` peut produire un
  // montant non entier (ex: 1500 FCFA / 3 gagnants aurait été exact, mais
  // 1000 / 3 ne l'est pas). Pour de l'argent réel, aucun FCFA fractionnaire
  // ne doit jamais apparaître, ET la somme distribuée doit rester
  // rigoureusement égale au pot collecté (somme nulle globale garantie).
  //
  // On distribue donc une part entière (Math.floor) à chacun, puis le
  // reliquat (0 à winnerIndexes.length - 1 FCFA) est donné 1 par 1 aux
  // premiers gagnants de la liste — ordre déterministe et reproductible,
  // pas d'aléa dans la répartition d'argent.
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

/**
 * Applique le résultat d'un round aux joueurs : met à jour le capital et
 * marque comme éliminés ceux passés sous le seuil. Retourne un nouveau
 * tableau de joueurs (ne mute pas l'entrée).
 */
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
}

/** Vérifie si la partie est terminée (un seul joueur non éliminé restant). */
export function checkGameOver(players: Player[]): GameOverCheck {
  const remaining = players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => !player.isEliminated)

  if (remaining.length <= 1) {
    return { isOver: true, winnerIndex: remaining[0]?.index }
  }
  return { isOver: false }
}
