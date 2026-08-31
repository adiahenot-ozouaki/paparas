// ==========================================================================
// ai.ts — Stratégie IA pour les adversaires (Binu, Lebe, Goju)
//
// Heuristique (pas de recherche en profondeur / minimax) mais nettement
// plus stratégique que le choix aléatoire précédent :
//
//   1. À l'ouverture d'un pli : joue la carte la plus forte possible
//      (hors 3) pour maximiser les chances de remporter le pli et donc de
//      garder la main — condition nécessaire pour pouvoir un jour aligner
//      ses 3 en fin de manche.
//   2. En suivant la couleur demandée : si une carte permet de gagner le
//      pli, joue la PLUS FAIBLE carte gagnante suffisante (ne gâche pas
//      une carte forte inutilement).
//   3. Si aucune carte ne peut gagner (ou hors couleur) : se défausse de
//      la carte la plus faible, en évitant de jouer un 3 tant qu'une
//      autre carte perdante est disponible — les 3 sont réservés pour la
//      fin de manche (combo Kora/33/Trinity/KMT).
//
// Ne gère pas (encore) la banque ni la réclamation de victoire — cette
// dernière est déclenchée séparément dans GameTableScreen car elle est
// toujours avantageuse dès qu'elle est possible (voir round.ts::canClaimVictory).
// ==========================================================================

import type { Card, Suit } from '../types'
import { getPlayableCards, type PlayedCard } from './trick'

function isThree(card: Card): boolean {
  return card.value === '3'
}

/** Rank le plus élevé actuellement en tête pour la couleur demandée dans le pli en cours. */
function currentWinningRank(playedCardsThisTrick: PlayedCard[], requestedSuit: Suit): number {
  const contenders = playedCardsThisTrick.filter(p => p.card.suit === requestedSuit)
  if (contenders.length === 0) return -Infinity
  return Math.max(...contenders.map(p => p.card.rank))
}

export function chooseAiCard(params: {
  hand: Card[]
  requestedSuit: Suit | null
  /** Cartes déjà posées dans le pli EN COURS (pas l'historique du round). */
  playedCardsThisTrick: PlayedCard[]
}): Card {
  const { hand, requestedSuit, playedCardsThisTrick } = params
  const legal = getPlayableCards(hand, requestedSuit)

  // --- Ouverture du pli : mener avec la carte la plus forte (hors 3) ---
  if (requestedSuit === null) {
    const nonThrees = legal.filter(c => !isThree(c))
    const pool = nonThrees.length > 0 ? nonThrees : legal
    return pool.reduce((best, c) => (c.rank > best.rank ? c : best))
  }

  // --- Peut-on gagner ce pli ? Si oui, avec le minimum nécessaire ---
  const beatingRank = currentWinningRank(playedCardsThisTrick, requestedSuit)
  const winningOptions = legal.filter(c => c.suit === requestedSuit && c.rank > beatingRank)

  if (winningOptions.length > 0) {
    return winningOptions.reduce((best, c) => (c.rank < best.rank ? c : best))
  }

  // --- Impossible de gagner : défausse la carte la plus faible, 3 en dernier recours ---
  const nonThreeOptions = legal.filter(c => !isThree(c))
  const pool = nonThreeOptions.length > 0 ? nonThreeOptions : legal
  return pool.reduce((best, c) => (c.rank < best.rank ? c : best))
}
