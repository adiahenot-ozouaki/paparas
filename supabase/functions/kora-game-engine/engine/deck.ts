// ==========================================================================
// engine/deck.ts — SEULE différence fonctionnelle avec le deck.ts client :
// le mélange utilise l'API Web Crypto (disponible nativement dans Deno),
// pas Math.random(). C'est LA raison d'être de ce portage serveur : côté
// client, n'importe qui peut inspecter/prédire/manipuler Math.random()
// dans son propre navigateur — inacceptable pour un jeu à mise réelle.
// Le reste (buildDeck, dealHands, remainingAfterDeal) est identique au
// client, verbatim.
// ==========================================================================

import type { Card, Suit, CardValue, DeckVariant } from './types.ts'

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']

const VALUE_ORDER: Record<DeckVariant, CardValue[]> = {
  '9': ['3', '4', '5', '6', '7', '8', '9'],
  '10': ['3', '4', '5', '6', '7', '8', '9', '10'],
  as: ['3', '4', '5', '6', '7', '8', '9', '10', 'A'],
}

function pointValueOf(value: CardValue): number {
  return value === 'A' ? 11 : parseInt(value, 10)
}

export function buildDeck(variant: DeckVariant): Card[] {
  const values = VALUE_ORDER[variant]
  const highestValue = values[values.length - 1]
  const deck: Card[] = []

  for (const suit of SUITS) {
    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      if (suit === '♠' && value === highestValue) continue
      deck.push({
        suit,
        value,
        rank: i + 1,
        pointValue: pointValueOf(value),
      })
    }
  }
  return deck
}

/**
 * Entier uniforme dans [0, maxExclusive) tiré via crypto.getRandomValues,
 * avec rejet des valeurs hors plage (rejection sampling) pour éviter tout
 * biais modulo — important même pour un paquet de 35 cartes maximum : un
 * biais systématique, même minime, serait en théorie exploitable sur un
 * grand nombre de parties dans un jeu à mise réelle.
 */
function secureRandomInt(maxExclusive: number): number {
  const MAX_UINT32 = 0xffffffff
  const rejectionLimit = MAX_UINT32 - (MAX_UINT32 % maxExclusive)
  const buf = new Uint32Array(1)
  let x: number
  do {
    crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= rejectionLimit)
  return x % maxExclusive
}

/** Mélange Fisher-Yates cryptographiquement sûr. Ne mute pas le tableau passé en argument. */
export function shuffleDeck(deck: Card[]): Card[] {
  const result = [...deck]
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function dealHands(deck: Card[], numPlayers: number, startPlayerIndex: number): Card[][] {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => [])
  let cursor = 0

  const dealLaps = (cardsPerPlayer: number) => {
    for (let lap = 0; lap < cardsPerPlayer; lap++) {
      for (let seat = 0; seat < numPlayers; seat++) {
        const playerIndex = (startPlayerIndex + seat) % numPlayers
        hands[playerIndex].push(deck[cursor])
        cursor++
      }
    }
  }

  dealLaps(3)
  dealLaps(2)

  return hands
}

export function remainingAfterDeal(deck: Card[], numPlayers: number): Card[] {
  return deck.slice(numPlayers * 5)
}
