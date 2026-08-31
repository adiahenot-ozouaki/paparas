import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDeck, dealHands, remainingAfterDeal, shuffleDeck } from '../src/game/deck.ts'

const VARIANTS = [
  { variant: '9' as const, expectedSize: 27, highestValue: '9' },
  { variant: '10' as const, expectedSize: 31, highestValue: '10' },
  { variant: 'as' as const, expectedSize: 35, highestValue: 'A' },
]

test('buildDeck crée les bonnes tailles de paquet', () => {
  for (const { variant, expectedSize } of VARIANTS) assert.equal(buildDeck(variant).length, expectedSize)
})

test('buildDeck retire le plus gros pique et conserve des cartes uniques', () => {
  for (const { variant, expectedSize, highestValue } of VARIANTS) {
    const deck = buildDeck(variant)
    const keys = deck.map((card) => `${card.suit}-${card.value}`)
    assert.equal(deck.length, expectedSize)
    assert.equal(new Set(keys).size, expectedSize)
    assert.ok(!deck.some((card) => card.suit === '♠' && card.value === highestValue))
  }
})

test('dealHands distribue 5 cartes à chaque joueur sans perte de cartes', () => {
  const deck = buildDeck('as')
  const hands = dealHands(deck, 4, 0)
  assert.equal(hands.length, 4)
  assert.deepEqual(hands.map((hand) => hand.length), [5, 5, 5, 5])
  assert.deepEqual(hands.flat(), deck.slice(0, 20))
})

test('dealHands respecte le joueur de départ', () => {
  const deck = buildDeck('9')
  const hands = dealHands(deck, 4, 2)
  assert.deepEqual(hands[2][0], deck[0])
  assert.deepEqual(hands[3][0], deck[1])
  assert.deepEqual(hands[0][0], deck[2])
  assert.deepEqual(hands[1][0], deck[3])
})

test('remainingAfterDeal retourne les cartes après les 5 cartes par joueur', () => {
  const deck = buildDeck('10')
  const remaining = remainingAfterDeal(deck, 4)
  assert.equal(remaining.length, deck.length - 20)
  assert.deepEqual(remaining, deck.slice(20))
})

test('shuffleDeck conserve toutes les cartes et ne mute pas le deck source', () => {
  const deck = buildDeck('as')
  const original = [...deck]
  const shuffled = shuffleDeck(deck)
  assert.notStrictEqual(shuffled, deck)
  assert.deepEqual(deck, original)
  assert.equal(shuffled.length, deck.length)
  assert.deepEqual(
    [...shuffled].sort((a, b) => `${a.suit}-${a.value}`.localeCompare(`${b.suit}-${b.value}`)),
    [...deck].sort((a, b) => `${a.suit}-${a.value}`.localeCompare(`${b.suit}-${b.value}`)),
  )
})

test('shuffleDeck produit des ordres différents sur plusieurs mélanges', () => {
  const deck = buildDeck('as')
  const signatures = new Set(Array.from({ length: 5 }, () => shuffleDeck(deck).map((card) => `${card.suit}-${card.value}`).join('|')))
  assert.ok(signatures.size > 1)
})
