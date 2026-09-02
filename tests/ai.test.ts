import assert from 'node:assert/strict'
import test from 'node:test'
import type { Card, Suit } from '../src/types.ts'
import { chooseAiCard, shouldAiBank, SEAT_PERSONALITY } from '../src/game/ai.ts'
import type { PlayedCard } from '../src/game/trick.ts'

function card(suit: Suit, value: Card['value'], rank: number): Card {
  return { suit, value, rank, pointValue: value === 'A' ? 11 : Number(value) }
}

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.value === b.value && a.rank === b.rank
}

const BINU = 1 // aggressive
const LEBE = 2 // conservative
const GOJU = 3 // opportunist

// ---------------------------------------------------------------------------
// Personnalités
// ---------------------------------------------------------------------------

test('personnalités assignées aux sièges IA', () => {
  assert.equal(SEAT_PERSONALITY[1], 'aggressive')
  assert.equal(SEAT_PERSONALITY[2], 'conservative')
  assert.equal(SEAT_PERSONALITY[3], 'opportunist')
})

// ---------------------------------------------------------------------------
// Ouverture de pli (requestedSuit === null)
// ---------------------------------------------------------------------------

test('ouverture agressive (Binu) : joue la carte la plus forte hors 3', () => {
  const hand = [
    card('♥', '3', 1),
    card('♠', '5', 3),
    card('♦', '9', 7),
    card('♣', '7', 5),
  ]
  const chosen = chooseAiCard({
    hand,
    requestedSuit: null,
    playedCardsThisTrick: [],
    playerIndex: BINU,
  })
  assert.ok(sameCard(chosen, card('♦', '9', 7)))
})

test('ouverture : si seulement des 3, joue un 3', () => {
  const hand = [card('♥', '3', 1), card('♠', '3', 1), card('♦', '3', 1)]
  const chosen = chooseAiCard({
    hand,
    requestedSuit: null,
    playedCardsThisTrick: [],
    playerIndex: BINU,
  })
  assert.equal(chosen.value, '3')
  assert.ok(hand.some(c => sameCard(c, chosen)))
})

test('ouverture : préfère un 10 à un 3', () => {
  const hand = [card('♥', '3', 1), card('♠', '10', 8)]
  const chosen = chooseAiCard({
    hand,
    requestedSuit: null,
    playedCardsThisTrick: [],
    playerIndex: LEBE,
  })
  assert.ok(sameCard(chosen, card('♠', '10', 8)))
})

// ---------------------------------------------------------------------------
// Suivre la couleur — peut gagner → minimum nécessaire
// ---------------------------------------------------------------------------

test('suivi : joue la plus faible carte gagnante suffisante', () => {
  const hand = [card('♥', '7', 5), card('♥', '9', 7), card('♠', '3', 1)]
  const played: PlayedCard[] = [{ playerIndex: 0, card: card('♥', '5', 3) }]
  const chosen = chooseAiCard({
    hand,
    requestedSuit: '♥',
    playedCardsThisTrick: played,
    playerIndex: LEBE,
  })
  assert.ok(sameCard(chosen, card('♥', '7', 5)))
})

test('suivi : si une seule carte bat, la joue', () => {
  const hand = [card('♥', '4', 2), card('♥', '9', 7), card('♠', '5', 3)]
  const played: PlayedCard[] = [{ playerIndex: 0, card: card('♥', '8', 6) }]
  const chosen = chooseAiCard({
    hand,
    requestedSuit: '♥',
    playedCardsThisTrick: played,
    playerIndex: GOJU,
  })
  assert.ok(sameCard(chosen, card('♥', '9', 7)))
})

// ---------------------------------------------------------------------------
// Suivre la couleur — ne peut pas gagner → défausse faible, 3 en dernier
// ---------------------------------------------------------------------------

test('suivi sans gain : se défausse de la plus faible hors 3', () => {
  const hand = [card('♥', '3', 1), card('♥', '5', 3), card('♥', '7', 5)]
  const played: PlayedCard[] = [{ playerIndex: 0, card: card('♥', '10', 8) }]
  const chosen = chooseAiCard({
    hand,
    requestedSuit: '♥',
    playedCardsThisTrick: played,
    playerIndex: BINU,
  })
  assert.ok(sameCard(chosen, card('♥', '5', 3)))
})

test('suivi sans gain : joue un 3 seulement si aucune autre option', () => {
  const hand = [card('♥', '3', 1), card('♠', '9', 7)]
  const played: PlayedCard[] = [{ playerIndex: 0, card: card('♥', '10', 8) }]
  const chosen = chooseAiCard({
    hand,
    requestedSuit: '♥',
    playedCardsThisTrick: played,
    playerIndex: LEBE,
  })
  assert.ok(sameCard(chosen, card('♥', '3', 1)))
})

test('hors couleur : jette la plus faible hors 3', () => {
  const hand = [card('♠', '3', 1), card('♦', '4', 2), card('♣', '8', 6)]
  const played: PlayedCard[] = [{ playerIndex: 0, card: card('♥', '5', 3) }]
  const chosen = chooseAiCard({
    hand,
    requestedSuit: '♥',
    playedCardsThisTrick: played,
    playerIndex: GOJU,
  })
  assert.ok(sameCard(chosen, card('♦', '4', 2)))
})

// ---------------------------------------------------------------------------
// Respect de getPlayableCards
// ---------------------------------------------------------------------------

test('ne joue jamais une carte illégale quand la couleur est disponible', () => {
  const hand = [card('♥', '4', 2), card('♠', '10', 8), card('♦', '9', 7)]
  const played: PlayedCard[] = [{ playerIndex: 0, card: card('♥', '3', 1) }]
  const chosen = chooseAiCard({
    hand,
    requestedSuit: '♥',
    playedCardsThisTrick: played,
    playerIndex: BINU,
  })
  assert.equal(chosen.suit, '♥')
})

// ---------------------------------------------------------------------------
// Plusieurs cartes déjà jouées
// ---------------------------------------------------------------------------

test('bat le rank actuel le plus haut du pli', () => {
  const hand = [card('♥', '7', 5), card('♥', '9', 7), card('♠', '3', 1)]
  const played: PlayedCard[] = [
    { playerIndex: 0, card: card('♥', '5', 3) },
    { playerIndex: 1, card: card('♥', '8', 6) },
  ]
  const chosen = chooseAiCard({
    hand,
    requestedSuit: '♥',
    playedCardsThisTrick: played,
    playerIndex: LEBE,
  })
  assert.ok(sameCard(chosen, card('♥', '9', 7)))
})

test('si off-suit sur table, beatingRank = rank de la couleur demandée seulement', () => {
  const hand = [card('♥', '4', 2), card('♥', '9', 7)]
  const played: PlayedCard[] = [
    { playerIndex: 0, card: card('♥', '3', 1) },
    { playerIndex: 1, card: card('♠', '10', 8) },
  ]
  const chosen = chooseAiCard({
    hand,
    requestedSuit: '♥',
    playedCardsThisTrick: played,
    playerIndex: GOJU,
  })
  assert.ok(sameCard(chosen, card('♥', '4', 2)))
})

// ---------------------------------------------------------------------------
// Fin de manche — protection des 3
// ---------------------------------------------------------------------------

test('fin de manche : préfère gagner sans 3 si possible', () => {
  const hand = [card('♥', '3', 1), card('♥', '8', 6), card('♥', '9', 7)]
  const played: PlayedCard[] = [{ playerIndex: 0, card: card('♥', '5', 3) }]
  const chosen = chooseAiCard({
    hand,
    requestedSuit: '♥',
    playedCardsThisTrick: played,
    playerIndex: LEBE,
    cardsLeftInHand: 2,
    tricksWonByMe: 1,
  })
  // 8 suffit, ne doit pas brûler le 3 ni le 9 inutilement
  assert.ok(sameCard(chosen, card('♥', '8', 6)))
})

// ---------------------------------------------------------------------------
// Banque IA
// ---------------------------------------------------------------------------

test('banque : refusée à partir du 3e pli', () => {
  const hand = [card('♥', '4', 2), card('♠', '5', 3)]
  assert.equal(
    shouldAiBank({
      hand,
      playerIndex: LEBE,
      trickNumber: 3,
      capital: 5000,
      startingCapital: 20000,
      baseStake: 1000,
    }),
    false,
  )
})

test('banque : Lebe (conservateur) bank sur main très faible sans 3', () => {
  const hand = [card('♥', '4', 2), card('♠', '5', 3), card('♦', '4', 2)]
  assert.equal(
    shouldAiBank({
      hand,
      playerIndex: LEBE,
      trickNumber: 1,
      capital: 20000,
      startingCapital: 20000,
      baseStake: 1000,
    }),
    true,
  )
})

test('banque : Binu (agressif) ne bank pas une main mediocre sans pression capital', () => {
  const hand = [card('♥', '4', 2), card('♠', '5', 3), card('♦', '6', 4)]
  assert.equal(
    shouldAiBank({
      hand,
      playerIndex: BINU,
      trickNumber: 1,
      capital: 20000,
      startingCapital: 20000,
      baseStake: 1000,
    }),
    false,
  )
})

test('banque : Binu bank en détresse (main très faible + capital bas)', () => {
  const hand = [card('♥', '4', 2), card('♠', '5', 3)]
  assert.equal(
    shouldAiBank({
      hand,
      playerIndex: BINU,
      trickNumber: 1,
      capital: 3000,
      startingCapital: 20000,
      baseStake: 1000,
    }),
    true,
  )
})

test('banque : main avec des 3 → en général pas de banque', () => {
  const hand = [card('♥', '3', 1), card('♠', '4', 2), card('♦', '5', 3)]
  assert.equal(
    shouldAiBank({
      hand,
      playerIndex: GOJU,
      trickNumber: 1,
      capital: 8000,
      startingCapital: 20000,
      baseStake: 1000,
    }),
    false,
  )
})
