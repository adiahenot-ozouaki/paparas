import assert from 'node:assert/strict'
import test from 'node:test'
import type { Card } from '../src/types.ts'
import {
  determineTrickWinner,
  getPlayableCards,
  getTrickPlayOrder,
  isValidPlay,
  nextPlayerIndex,
} from '../src/game/trick.ts'

function card(suit: Card['suit'], value: Card['value'], rank: number): Card {
  return { suit, value, rank, pointValue: value === 'A' ? 11 : Number(value) }
}

const threeHearts = card('♥', '3', 1)
const sevenHearts = card('♥', '7', 5)
const nineHearts = card('♥', '9', 7)
const tenSpades = card('♠', '10', 8)
const fiveDiamonds = card('♦', '5', 3)


test('getPlayableCards retourne toute la main sans couleur demandée', () => {
  const hand = [threeHearts, tenSpades]
  assert.deepEqual(getPlayableCards(hand, null), hand)
})

test('getPlayableCards impose la couleur demandée quand elle est disponible', () => {
  const hand = [threeHearts, sevenHearts, tenSpades]
  assert.deepEqual(getPlayableCards(hand, '♥'), [threeHearts, sevenHearts])
})

test('getPlayableCards autorise toute la main si la couleur demandée est absente', () => {
  const hand = [tenSpades, fiveDiamonds]
  assert.deepEqual(getPlayableCards(hand, '♥'), hand)
})

test('isValidPlay respecte la règle de suivi de couleur', () => {
  const hand = [threeHearts, tenSpades]
  assert.equal(isValidPlay(hand, '♥', threeHearts), true)
  assert.equal(isValidPlay(hand, '♥', tenSpades), false)
  assert.equal(isValidPlay(hand, '♣', tenSpades), true)
})

test('determineTrickWinner choisit la carte la plus forte dans la couleur demandée', () => {
  const played = [
    { playerIndex: 0, card: sevenHearts },
    { playerIndex: 1, card: tenSpades },
    { playerIndex: 2, card: nineHearts },
    { playerIndex: 3, card: fiveDiamonds },
  ]
  assert.equal(determineTrickWinner(played, '♥'), 2)
})

test('determineTrickWinner rejette un pli sans carte de la couleur demandée', () => {
  assert.throws(
    () => determineTrickWinner([{ playerIndex: 0, card: tenSpades }], '♥'),
    /aucune carte de la couleur demandée/,
  )
})

test('nextPlayerIndex boucle autour de la table', () => {
  assert.equal(nextPlayerIndex(0, 4), 1)
  assert.equal(nextPlayerIndex(3, 4), 0)
})

test('getTrickPlayOrder construit l ordre circulaire', () => {
  assert.deepEqual(getTrickPlayOrder(2, 4), [2, 3, 0, 1])
})
