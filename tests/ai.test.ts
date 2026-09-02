import assert from 'node:assert/strict'
import test from 'node:test'
import type { Card, Suit } from '../src/types.ts'
import { chooseAiCard } from '../src/game/ai.ts'
import type { PlayedCard } from '../src/game/trick.ts'

function card(suit: Suit, value: Card['value'], rank: number): Card {
  return { suit, value, rank, pointValue: value === 'A' ? 11 : Number(value) }
}

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.value === b.value && a.rank === b.rank
}

// ---------------------------------------------------------------------------
// Ouverture de pli (requestedSuit === null)
// ---------------------------------------------------------------------------

test('ouverture : joue la carte la plus forte hors 3', () => {
  const hand = [
    card('♥', '3', 1),
    card('♠', '5', 3),
    card('♦', '9', 7),
    card('♣', '7', 5),
  ]
  const chosen = chooseAiCard({ hand, requestedSuit: null, playedCardsThisTrick: [] })
  assert.ok(sameCard(chosen, card('♦', '9', 7)))
})

test('ouverture : si seulement des 3, joue le 3 le plus fort', () => {
  const hand = [card('♥', '3', 1), card('♠', '3', 1), card('♦', '3', 1)]
  // ranks all 1 — any 3 is fine; reduce picks first max so first one
  const chosen = chooseAiCard({ hand, requestedSuit: null, playedCardsThisTrick: [] })
  assert.equal(chosen.value, '3')
  assert.ok(hand.some(c => sameCard(c, chosen)))
})

test('ouverture : préfère un 10 à un 3 même si le 3 est seul dans sa couleur', () => {
  const hand = [card('♥', '3', 1), card('♠', '10', 8)]
  const chosen = chooseAiCard({ hand, requestedSuit: null, playedCardsThisTrick: [] })
  assert.ok(sameCard(chosen, card('♠', '10', 8)))
})

// ---------------------------------------------------------------------------
// Suivre la couleur — peut gagner → minimum nécessaire
// ---------------------------------------------------------------------------

test('suivi : joue la plus faible carte gagnante suffisante', () => {
  // Table : 5♥ (rank 3). Main : 7♥(5), 9♥(7), 3♠
  const hand = [card('♥', '7', 5), card('♥', '9', 7), card('♠', '3', 1)]
  const played: PlayedCard[] = [{ playerIndex: 0, card: card('♥', '5', 3) }]
  const chosen = chooseAiCard({ hand, requestedSuit: '♥', playedCardsThisTrick: played })
  assert.ok(sameCard(chosen, card('♥', '7', 5))) // pas le 9
})

test('suivi : si une seule carte bat, la joue', () => {
  const hand = [card('♥', '4', 2), card('♥', '9', 7), card('♠', '5', 3)]
  const played: PlayedCard[] = [{ playerIndex: 0, card: card('♥', '8', 6) }]
  const chosen = chooseAiCard({ hand, requestedSuit: '♥', playedCardsThisTrick: played })
  assert.ok(sameCard(chosen, card('♥', '9', 7)))
})

// ---------------------------------------------------------------------------
// Suivre la couleur — ne peut pas gagner → défausse faible, 3 en dernier
// ---------------------------------------------------------------------------

test('suivi sans gain : se défausse de la plus faible hors 3', () => {
  const hand = [card('♥', '3', 1), card('♥', '5', 3), card('♥', '7', 5)]
  const played: PlayedCard[] = [{ playerIndex: 0, card: card('♥', '10', 8) }]
  const chosen = chooseAiCard({ hand, requestedSuit: '♥', playedCardsThisTrick: played })
  assert.ok(sameCard(chosen, card('♥', '5', 3))) // pas le 3
})

test('suivi sans gain : joue un 3 seulement si aucune autre option', () => {
  const hand = [card('♥', '3', 1), card('♠', '9', 7)]
  // Doit suivre ♥ → seul le 3 est légal
  const played: PlayedCard[] = [{ playerIndex: 0, card: card('♥', '10', 8) }]
  const chosen = chooseAiCard({ hand, requestedSuit: '♥', playedCardsThisTrick: played })
  assert.ok(sameCard(chosen, card('♥', '3', 1)))
})

test('hors couleur (coupe/défausse) : jette la plus faible hors 3', () => {
  // Pas de ♥ en main → toute la main jouable
  const hand = [card('♠', '3', 1), card('♦', '4', 2), card('♣', '8', 6)]
  const played: PlayedCard[] = [{ playerIndex: 0, card: card('♥', '5', 3) }]
  const chosen = chooseAiCard({ hand, requestedSuit: '♥', playedCardsThisTrick: played })
  assert.ok(sameCard(chosen, card('♦', '4', 2)))
})

// ---------------------------------------------------------------------------
// Respect de getPlayableCards (obligation de couleur)
// ---------------------------------------------------------------------------

test('ne joue jamais une carte illégale quand la couleur est disponible', () => {
  const hand = [card('♥', '4', 2), card('♠', '10', 8), card('♦', '9', 7)]
  const played: PlayedCard[] = [{ playerIndex: 0, card: card('♥', '3', 1) }]
  const chosen = chooseAiCard({ hand, requestedSuit: '♥', playedCardsThisTrick: played })
  assert.equal(chosen.suit, '♥')
})

// ---------------------------------------------------------------------------
// Plusieurs cartes déjà jouées
// ---------------------------------------------------------------------------

test('bat le rank actuel le plus haut du pli, pas seulement la première carte', () => {
  // Table : 5♥ puis 8♥ → beatingRank = 6. Main : 7♥(5) ne bat pas, 9♥(7) bat
  const hand = [card('♥', '7', 5), card('♥', '9', 7), card('♠', '3', 1)]
  const played: PlayedCard[] = [
    { playerIndex: 0, card: card('♥', '5', 3) },
    { playerIndex: 1, card: card('♥', '8', 6) },
  ]
  const chosen = chooseAiCard({ hand, requestedSuit: '♥', playedCardsThisTrick: played })
  assert.ok(sameCard(chosen, card('♥', '9', 7)))
})

test('si personne n a suivi la couleur, beatingRank = -Infinity → la plus faible de la couleur suffit', () => {
  // Ouverture adverse en ♠, on a du ♥ demandé? requestedSuit is set from first card.
  // First card ♥, second played off-suit → contenders only first card.
  const hand = [card('♥', '4', 2), card('♥', '9', 7)]
  const played: PlayedCard[] = [
    { playerIndex: 0, card: card('♥', '3', 1) },
    { playerIndex: 1, card: card('♠', '10', 8) }, // off-suit
  ]
  const chosen = chooseAiCard({ hand, requestedSuit: '♥', playedCardsThisTrick: played })
  // beatingRank = 1 (the 3♥). Both 4 and 9 beat → pick weakest = 4♥
  assert.ok(sameCard(chosen, card('♥', '4', 2)))
})
