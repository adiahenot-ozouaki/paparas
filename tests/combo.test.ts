import assert from 'node:assert/strict'
import test from 'node:test'
import type { Card, Suit } from '../src/types.ts'
import {
  COMBO_LABEL,
  COMBO_MULTIPLIER,
  countTrailingThrees,
  determineCombo,
  determineRoundCombo,
  getComboMultiplier,
} from '../src/game/combo.ts'

function card(suit: Suit, value: Card['value'], rank = 1): Card {
  return { suit, value, rank, pointValue: value === 'A' ? 11 : Number(value) }
}

const c3 = (suit: Suit = '♥') => card(suit, '3', 1)
const c5 = (suit: Suit = '♠') => card(suit, '5', 3)
const c7 = (suit: Suit = '♦') => card(suit, '7', 5)
const c9 = (suit: Suit = '♣') => card(suit, '9', 7)

// ---------------------------------------------------------------------------
// countTrailingThrees
// ---------------------------------------------------------------------------

test('countTrailingThrees retourne 0 sur séquence vide', () => {
  assert.equal(countTrailingThrees([]), 0)
})

test('countTrailingThrees retourne 0 sans 3 en fin', () => {
  assert.equal(countTrailingThrees([c3(), c5(), c7()]), 0)
  assert.equal(countTrailingThrees([c9()]), 0)
})

test('countTrailingThrees compte les 3 consécutifs en fin uniquement', () => {
  assert.equal(countTrailingThrees([c5(), c3()]), 1)
  assert.equal(countTrailingThrees([c5(), c3(), c3()]), 2)
  assert.equal(countTrailingThrees([c7(), c3(), c3(), c3()]), 3)
  assert.equal(countTrailingThrees([c9(), c3(), c3(), c3(), c3()]), 4)
})

test('countTrailingThrees ignore les 3 non finaux', () => {
  // 3 au milieu puis autre carte → 0
  assert.equal(countTrailingThrees([c3(), c3(), c5()]), 0)
  // 3, puis non-3, puis 3 → 1 seulement
  assert.equal(countTrailingThrees([c3(), c5(), c3()]), 1)
})

test('countTrailingThrees plafonne à 4', () => {
  assert.equal(countTrailingThrees([c3(), c3(), c3(), c3(), c3()]), 4)
  assert.equal(countTrailingThrees([c5(), c3(), c3(), c3(), c3(), c3(), c3()]), 4)
})

// ---------------------------------------------------------------------------
// determineCombo
// ---------------------------------------------------------------------------

test('determineCombo mappe 0→simple, 1→kora, 2→33, 3→trinity, 4→kmt', () => {
  assert.equal(determineCombo([c5(), c7()]), 'simple')
  assert.equal(determineCombo([c5(), c3()]), 'kora')
  assert.equal(determineCombo([c5(), c3(), c3()]), '33')
  assert.equal(determineCombo([c5(), c3(), c3(), c3()]), 'trinity')
  assert.equal(determineCombo([c5(), c3(), c3(), c3(), c3()]), 'kmt')
})

test('determineCombo sur séquence vide est simple', () => {
  assert.equal(determineCombo([]), 'simple')
})

test('determineCombo reste simple si les 3 ne sont pas en fin', () => {
  assert.equal(determineCombo([c3(), c3(), c3(), c7()]), 'simple')
})

// ---------------------------------------------------------------------------
// determineRoundCombo
// ---------------------------------------------------------------------------

test('determineRoundCombo lit la séquence du gagnant du round', () => {
  const playLog = [
    [c5(), c7()],           // joueur 0 — simple
    [c9(), c3(), c3()],     // joueur 1 — 33
    [c7()],                 // joueur 2
    [c3()],                 // joueur 3 — kora
  ]
  assert.equal(determineRoundCombo(0, playLog), 'simple')
  assert.equal(determineRoundCombo(1, playLog), '33')
  assert.equal(determineRoundCombo(3, playLog), 'kora')
})

// ---------------------------------------------------------------------------
// getComboMultiplier + tables
// ---------------------------------------------------------------------------

test('getComboMultiplier retourne les multiplicateurs attendus', () => {
  assert.equal(getComboMultiplier('simple'), 1)
  assert.equal(getComboMultiplier('kora'), 2)
  assert.equal(getComboMultiplier('33'), 4)
  assert.equal(getComboMultiplier('trinity'), 8)
  assert.equal(getComboMultiplier('kmt'), 16)
})

test('COMBO_MULTIPLIER et COMBO_LABEL couvrent tous les combos', () => {
  const combos = ['simple', 'kora', '33', 'trinity', 'kmt'] as const
  for (const c of combos) {
    assert.ok(c in COMBO_MULTIPLIER)
    assert.ok(c in COMBO_LABEL)
    assert.equal(typeof COMBO_LABEL[c], 'string')
    assert.ok(COMBO_LABEL[c].length > 0)
  }
})
