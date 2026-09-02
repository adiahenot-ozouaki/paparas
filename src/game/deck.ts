// ==========================================================================
// deck.ts — construction, mélange et distribution du paquet Kora
// ==========================================================================

import type { Card, Suit, CardValue, DeckVariant } from './types.ts'

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']

const VALUE_ORDER: Record<DeckVariant, CardValue[]> = {
  '8': ['3', '4', '5', '6', '7', '8'],
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

function secureRandomInt(maxExclusive: number): number {
  const UINT32_RANGE = 0x1_0000_0000
  const rejectionLimit = UINT32_RANGE - (UINT32_RANGE % maxExclusive)
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
