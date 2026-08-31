import type { Card, Suit } from './types.ts'

export interface PlayedCard {
  playerIndex: number
  card: Card
}

export function getPlayableCards(hand: Card[], requestedSuit: Suit | null): Card[] {
  if (requestedSuit === null) return hand
  const matching = hand.filter(card => card.suit === requestedSuit)
  return matching.length > 0 ? matching : hand
}

export function isValidPlay(hand: Card[], requestedSuit: Suit | null, card: Card): boolean {
  return getPlayableCards(hand, requestedSuit).some(
    playable => playable.suit === card.suit && playable.value === card.value,
  )
}

export function determineTrickWinner(playedCards: PlayedCard[], requestedSuit: Suit): number {
  const contenders = playedCards.filter(played => played.card.suit === requestedSuit)

  if (contenders.length === 0) {
    throw new Error('Pli invalide : aucune carte de la couleur demandée n\'a été jouée.')
  }

  const winner = contenders.reduce((best, current) => (current.card.rank > best.card.rank ? current : best))
  return winner.playerIndex
}

export function nextPlayerIndex(currentIndex: number, numPlayers: number): number {
  return (currentIndex + 1) % numPlayers
}

export function getTrickPlayOrder(starterIndex: number, numPlayers: number): number[] {
  return Array.from({ length: numPlayers }, (_, i) => (starterIndex + i) % numPlayers)
}
