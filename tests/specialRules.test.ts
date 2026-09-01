import assert from 'node:assert/strict'
import test from 'node:test'
import type { Card, Suit } from '../src/types.ts'
import {
  SPECIAL_RULE_MULTIPLIER,
  checkForSpecialWin,
  detectSpecialRules,
} from '../src/game/specialRules.ts'

function card(suit: Suit, value: Card['value'], rank = 1): Card {
  return {
    suit,
    value,
    rank,
    pointValue: value === 'A' ? 11 : Number(value),
  }
}

// ---------------------------------------------------------------------------
// detectSpecialRules — flush
// ---------------------------------------------------------------------------

test('detectSpecialRules détecte un flush (5 cartes même couleur)', () => {
  const hand = [
    card('♥', '3'),
    card('♥', '5'),
    card('♥', '7'),
    card('♥', '9'),
    card('♥', 'A'),
  ]
  assert.deepEqual(detectSpecialRules(hand), ['flush'])
})

test('detectSpecialRules ne détecte pas de flush si couleurs mélangées', () => {
  const hand = [
    card('♥', '3'),
    card('♥', '5'),
    card('♠', '7'),
    card('♥', '9'),
    card('♥', 'A'),
  ]
  assert.ok(!detectSpecialRules(hand).includes('flush'))
})

test('detectSpecialRules ne détecte pas de flush sur main vide', () => {
  assert.deepEqual(detectSpecialRules([]), [])
})

// ---------------------------------------------------------------------------
// detectSpecialRules — 21
// ---------------------------------------------------------------------------

test('detectSpecialRules détecte la règle 21 (somme exacte)', () => {
  // 3+4+5+4+5 = 21
  const hand = [
    card('♥', '3'),
    card('♠', '4'),
    card('♦', '5'),
    card('♣', '4'),
    card('♥', '5'),
  ]
  assert.deepEqual(detectSpecialRules(hand), ['21'])
})

test('detectSpecialRules détecte 21 sur une autre combinaison (6+5+4+3+3)', () => {
  // Avec ce paquet (3–10 + A), un As ne peut pas entrer dans un 21 à 5 cartes :
  // les 4 autres devraient sommer à 10, or le minimum est 3+3+3+3 = 12.
  const hand = [
    card('♥', '6'),
    card('♠', '5'),
    card('♦', '4'),
    card('♣', '3'),
    card('♥', '3'),
  ]
  assert.deepEqual(detectSpecialRules(hand), ['21'])
})

test('detectSpecialRules ne détecte pas 21 si somme ≠ 21', () => {
  const hand = [
    card('♥', '10'),
    card('♠', '10'),
    card('♦', '10'),
    card('♣', '5'),
    card('♥', '5'),
  ] // 40
  assert.ok(!detectSpecialRules(hand).includes('21'))
})

// ---------------------------------------------------------------------------
// detectSpecialRules — T7
// ---------------------------------------------------------------------------

test('detectSpecialRules détecte T7 (au moins trois 7)', () => {
  const hand = [
    card('♥', '7'),
    card('♠', '7'),
    card('♦', '7'),
    card('♣', '3'),
    card('♥', '5'),
  ]
  assert.deepEqual(detectSpecialRules(hand), ['t7'])
})

test('detectSpecialRules détecte T7 avec quatre 7', () => {
  const hand = [
    card('♥', '7'),
    card('♠', '7'),
    card('♦', '7'),
    card('♣', '7'),
    card('♥', '5'),
  ]
  assert.deepEqual(detectSpecialRules(hand), ['t7'])
})

test('detectSpecialRules ne détecte pas T7 avec seulement deux 7', () => {
  const hand = [
    card('♥', '7'),
    card('♠', '7'),
    card('♦', '3'),
    card('♣', '5'),
    card('♥', '9'),
  ]
  assert.ok(!detectSpecialRules(hand).includes('t7'))
})

// ---------------------------------------------------------------------------
// detectSpecialRules — cumuls
// ---------------------------------------------------------------------------

test('detectSpecialRules peut cumuler flush + 21', () => {
  // ♥3+♥4+♥5+♥6+♥3 = 21, même couleur
  const hand = [
    card('♥', '3'),
    card('♥', '4'),
    card('♥', '5'),
    card('♥', '6'),
    card('♥', '3'),
  ]
  const rules = detectSpecialRules(hand)
  assert.ok(rules.includes('flush'))
  assert.ok(rules.includes('21'))
  assert.equal(rules.length, 2)
})

test('detectSpecialRules peut cumuler T7 + flush', () => {
  // Logique pure : on autorise plusieurs 7 de même couleur pour tester le cumul.
  // (Le vrai paquet n'a qu'un 7 par couleur.)
  const hand = [
    card('♠', '7'),
    card('♠', '7'),
    card('♠', '7'),
    card('♠', '3'),
    card('♠', '5'),
  ]
  const rules = detectSpecialRules(hand)
  assert.ok(rules.includes('t7'))
  assert.ok(rules.includes('flush'))
})

// ---------------------------------------------------------------------------
// checkForSpecialWin
// ---------------------------------------------------------------------------

test('checkForSpecialWin retourne aucun gagnant si aucune règle', () => {
  const hands = [
    [card('♥', '3'), card('♠', '5'), card('♦', '7'), card('♣', '9'), card('♥', '10')],
    [card('♠', '3'), card('♥', '5'), card('♣', '7'), card('♦', '9'), card('♠', '10')],
  ]
  const result = checkForSpecialWin(hands)
  assert.equal(result.hasSpecialWin, false)
  assert.deepEqual(result.winners, [])
})

test('checkForSpecialWin identifie un seul gagnant flush', () => {
  const flushHand = [
    card('♦', '3'),
    card('♦', '5'),
    card('♦', '7'),
    card('♦', '9'),
    card('♦', '10'),
  ]
  const normalHand = [
    card('♥', '3'),
    card('♠', '5'),
    card('♣', '7'),
    card('♦', '9'),
    card('♥', '10'),
  ]
  const result = checkForSpecialWin([normalHand, flushHand, normalHand, normalHand])
  assert.equal(result.hasSpecialWin, true)
  assert.equal(result.winners.length, 1)
  assert.equal(result.winners[0].playerIndex, 1)
  assert.deepEqual(result.winners[0].rules, ['flush'])
})

test('checkForSpecialWin identifie plusieurs gagnants simultanés', () => {
  const t7Hand = [
    card('♥', '7'),
    card('♠', '7'),
    card('♦', '7'),
    card('♣', '3'),
    card('♥', '5'),
  ]
  const twentyOne = [
    card('♥', '6'),
    card('♠', '5'),
    card('♦', '4'),
    card('♣', '3'),
    card('♥', '3'),
  ]
  const normal = [
    card('♠', '10'),
    card('♥', '9'),
    card('♦', '8'),
    card('♣', '6'),
    card('♠', '5'),
  ]
  const result = checkForSpecialWin([t7Hand, normal, twentyOne, normal])
  assert.equal(result.hasSpecialWin, true)
  assert.equal(result.winners.length, 2)
  assert.equal(result.winners[0].playerIndex, 0)
  assert.deepEqual(result.winners[0].rules, ['t7'])
  assert.equal(result.winners[1].playerIndex, 2)
  assert.deepEqual(result.winners[1].rules, ['21'])
})

test('SPECIAL_RULE_MULTIPLIER vaut 1', () => {
  assert.equal(SPECIAL_RULE_MULTIPLIER, 1)
})
