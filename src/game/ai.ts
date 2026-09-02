// ==========================================================================
// ai.ts — Stratégie IA pour les adversaires (Binu, Lebe, Goju)
//
// Heuristique (pas de recherche en profondeur / minimax) mais stratégique :
//
//   Personnalités par siège :
//     1 Binu  — agressif   : ouvre fort, prend les plis, bank rarement
//     2 Lebe  — conservateur: protège les 3, bank plus volontiers si main faible
//     3 Goju  — opportuniste: pèse les plis déjà pris et le potentiel de combo
//
//   Choix de carte :
//     1. Ouverture : carte forte (hors 3), calibrée par personnalité
//     2. Suivi gagnant : plus faible carte suffisante (agressif peut "surjouer"
//        s'il veut sécuriser un pli clé)
//     3. Défausse : plus faible hors 3 ; les 3 réservés en fin de manche
//
//   Banque IA (shouldAiBank) : disponible avant le 3e pli, selon force de main,
//   capital relatif et personnalité.
//
//   Réclamation de victoire : toujours prise dès que possible (hors de ce
//   module — voir GameTableScreen + round.ts::canClaimVictory).
// ==========================================================================

import type { Card, Suit } from '../types.ts'
import { getPlayableCards, type PlayedCard } from './trick.ts'

export type AiPersonality = 'aggressive' | 'conservative' | 'opportunist'

/** Sièges IA → personnalité (0 = humain). */
export const SEAT_PERSONALITY: Record<number, AiPersonality> = {
  1: 'aggressive', // Binu
  2: 'conservative', // Lebe
  3: 'opportunist', // Goju
}

function personalityOf(playerIndex: number): AiPersonality {
  return SEAT_PERSONALITY[playerIndex] ?? 'opportunist'
}

function isThree(card: Card): boolean {
  return card.value === '3'
}

function countThrees(hand: Card[]): number {
  return hand.filter(isThree).length
}

/** Force brute de la main (somme des ranks hors 3 + bonus léger par 3). */
function handStrength(hand: Card[]): number {
  let score = 0
  for (const c of hand) {
    score += isThree(c) ? 1.5 : c.rank
  }
  return score
}

/** Rank le plus élevé actuellement en tête pour la couleur demandée. */
function currentWinningRank(playedCardsThisTrick: PlayedCard[], requestedSuit: Suit): number {
  const contenders = playedCardsThisTrick.filter(p => p.card.suit === requestedSuit)
  if (contenders.length === 0) return -Infinity
  return Math.max(...contenders.map(p => p.card.rank))
}

function pickHighest(cards: Card[]): Card {
  return cards.reduce((best, c) => (c.rank > best.rank ? c : best))
}

function pickLowest(cards: Card[]): Card {
  return cards.reduce((best, c) => (c.rank < best.rank ? c : best))
}

/**
 * Parmi les options triées par rank croissant, choisit un percentile
 * (0 = plus faible, 1 = plus fort). Utile pour nuancer l'ouverture.
 */
function pickByPercentile(cards: Card[], percentile: number): Card {
  if (cards.length === 1) return cards[0]
  const sorted = [...cards].sort((a, b) => a.rank - b.rank)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(percentile * (sorted.length - 1))))
  return sorted[idx]
}

export interface ChooseAiCardParams {
  hand: Card[]
  requestedSuit: Suit | null
  /** Cartes déjà posées dans le pli EN COURS. */
  playedCardsThisTrick: PlayedCard[]
  /** Index du siège IA (1=Binu, 2=Lebe, 3=Goju). */
  playerIndex: number
  /** Plis déjà remportés par ce joueur dans le round. */
  tricksWonByMe?: number
  /** Nombre de cartes encore en main (proxy fin de manche). */
  cardsLeftInHand?: number
}

export function chooseAiCard(params: ChooseAiCardParams): Card {
  const {
    hand,
    requestedSuit,
    playedCardsThisTrick,
    playerIndex,
    tricksWonByMe = 0,
    cardsLeftInHand = hand.length,
  } = params

  const style = personalityOf(playerIndex)
  const legal = getPlayableCards(hand, requestedSuit)
  const threesInHand = countThrees(hand)
  const lateGame = cardsLeftInHand <= 2

  // --- Ouverture du pli ---
  if (requestedSuit === null) {
    const nonThrees = legal.filter(c => !isThree(c))
    const pool = nonThrees.length > 0 ? nonThrees : legal

    // En fin de manche avec des 3 : ne pas ouvrir un 3 si on a autre chose
    // (sauf si uniquement des 3).
    if (lateGame && threesInHand > 0 && nonThrees.length > 0) {
      // Opportuniste avec déjà ≥1 pli : ouvre un peu moins fort pour garder
      // de la puissance pour sécuriser la fin.
      if (style === 'opportunist' && tricksWonByMe >= 1) {
        return pickByPercentile(nonThrees, 0.55)
      }
      if (style === 'conservative') {
        return pickByPercentile(nonThrees, 0.45)
      }
      // Agressif : continue d'ouvrir fort
      return pickHighest(nonThrees)
    }

    if (style === 'aggressive') {
      return pickHighest(pool)
    }
    if (style === 'conservative') {
      // Ouvre en milieu/haut de gamme plutôt qu'au maximum (moins prévisible).
      return pickByPercentile(pool, 0.7)
    }
    // Opportuniste : si déjà des plis, ouvre un cran moins fort ; sinon fort.
    return pickByPercentile(pool, tricksWonByMe >= 1 ? 0.6 : 0.9)
  }

  // --- Suivi : peut-on gagner ? ---
  const beatingRank = currentWinningRank(playedCardsThisTrick, requestedSuit)
  const winningOptions = legal.filter(c => c.suit === requestedSuit && c.rank > beatingRank)

  if (winningOptions.length > 0) {
    const nonThreeWinners = winningOptions.filter(c => !isThree(c))
    const preferPool =
      lateGame && threesInHand > 0 && nonThreeWinners.length > 0 ? nonThreeWinners : winningOptions

    // Agressif : si peu d'options ou pli "important" (déjà 1+ plis / fin de manche),
    // peut jouer plus fort pour sécuriser.
    if (style === 'aggressive' && (tricksWonByMe >= 1 || lateGame) && preferPool.length > 1) {
      return pickByPercentile(preferPool, 0.65)
    }

    // Conservateur / défaut : minimum nécessaire
    return pickLowest(preferPool)
  }

  // --- Impossible de gagner : défausse ---
  // Hors couleur ou rang insuffisant : jeter le plus faible hors 3.
  // En fin de manche, protéger encore plus les 3 (surtout conservateur / opportuniste
  // qui vise un combo).
  const nonThreeOptions = legal.filter(c => !isThree(c))
  const protectThreesHard =
    threesInHand > 0 && (lateGame || style === 'conservative' || (style === 'opportunist' && tricksWonByMe >= 1))

  if (protectThreesHard && nonThreeOptions.length > 0) {
    return pickLowest(nonThreeOptions)
  }

  const pool = nonThreeOptions.length > 0 ? nonThreeOptions : legal
  return pickLowest(pool)
}

// --------------------------------------------------------------------------
// Banque IA
// --------------------------------------------------------------------------

export interface ShouldAiBankParams {
  hand: Card[]
  playerIndex: number
  /** Numéro du pli en cours (1-based). Banque interdite à partir de 3. */
  trickNumber: number
  capital: number
  startingCapital: number
  baseStake: number
}

/**
 * Décide si l'IA doit aller en banque.
 * Règles :
 *  - Impossible à partir du 3e pli (même règle métier que le joueur humain).
 *  - Main très faible (peu/pas de 3, ranks bas) → plus enclin à banker.
 *  - Capital bas vs mise → plus enclin (éviter une grosse perte).
 *  - Personnalité module le seuil.
 */
export function shouldAiBank(params: ShouldAiBankParams): boolean {
  const { hand, playerIndex, trickNumber, capital, startingCapital, baseStake } = params

  if (trickNumber >= 3) return false
  if (hand.length === 0) return false

  const style = personalityOf(playerIndex)
  const threes = countThrees(hand)
  const strength = handStrength(hand)
  // Force moyenne attendue ~ rank moyen * n + bonus 3 ; seuil empirique bas.
  const weakHand = threes === 0 && strength < hand.length * 4.5
  const veryWeakHand = threes === 0 && strength < hand.length * 3.5
  const capitalPressure = capital < startingCapital * 0.45 || capital < baseStake * 4

  if (style === 'conservative') {
    // Bank dès qu'il n'y a aucun 3 et main mediocre, ou pression capital.
    return veryWeakHand || (weakHand && capitalPressure) || (threes === 0 && capitalPressure)
  }

  if (style === 'aggressive') {
    // Bank seulement en détresse claire.
    return veryWeakHand && capitalPressure
  }

  // Opportuniste : bank si main sans 3 et (faible ou sous pression).
  return (threes === 0 && weakHand) || (veryWeakHand && capitalPressure)
}
