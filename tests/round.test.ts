import assert from 'node:assert/strict'
import test from 'node:test'
import type { Card, Suit } from '../src/types.ts'
import { DEFAULT_STAKE_CONFIG, type GameStakeConfig } from '../src/game/payout.ts'
import {
  bankPlayer,
  canClaimVictory,
  claimVictory,
  getActivePlayerIndexes,
  getCurrentPlayerIndex,
  initRound,
  playCard,
  resolveTrick,
  type RoundState,
} from '../src/game/round.ts'

const STAKE: GameStakeConfig = { ...DEFAULT_STAKE_CONFIG }

function card(suit: Suit, value: Card['value'], rank: number): Card {
  return { suit, value, rank, pointValue: value === 'A' ? 11 : Number(value) }
}

/** État de round contrôlé, phase playing, 4 joueurs, pli 1, starter 0. */
function basePlayingState(overrides: Partial<RoundState> = {}): RoundState {
  const hands: Card[][] = [
    [card('♥', '3', 1), card('♥', '7', 5), card('♠', '5', 3), card('♦', '4', 2), card('♣', '6', 4)],
    [card('♥', '5', 3), card('♠', '7', 5), card('♦', '8', 6), card('♣', '3', 1), card('♠', '4', 2)],
    [card('♥', '9', 7), card('♠', '8', 6), card('♦', '3', 1), card('♣', '9', 7), card('♦', '6', 4)],
    [card('♥', '8', 6), card('♠', '6', 4), card('♦', '9', 7), card('♣', '5', 3), card('♣', '8', 6)],
  ]

  return {
    phase: 'playing',
    variant: 'as',
    numPlayers: 4,
    hands,
    currentTrick: {
      trickNumber: 1,
      starterIndex: 0,
      requestedSuit: null,
      playedCards: [],
    },
    playLog: [[], [], [], []],
    trickWinners: [],
    lastTrickWinnerIndex: null,
    bankedPlayers: [],
    outcome: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// initRound — invariants structurels (le shuffle empêche de figer les mains)
// ---------------------------------------------------------------------------

test('initRound distribue 5 cartes à chaque joueur et démarre en playing ou specialWin', () => {
  const state = initRound({
    variant: 'as',
    numPlayers: 4,
    startPlayerIndex: 0,
    stakeConfig: STAKE,
  })

  assert.equal(state.numPlayers, 4)
  assert.equal(state.variant, 'as')
  assert.equal(state.hands.length, 4)
  for (const hand of state.hands) {
    assert.equal(hand.length, 5)
  }
  assert.ok(state.phase === 'playing' || state.phase === 'specialWin')

  if (state.phase === 'playing') {
    assert.ok(state.currentTrick)
    assert.equal(state.currentTrick!.trickNumber, 1)
    assert.equal(state.currentTrick!.requestedSuit, null)
    assert.equal(state.currentTrick!.playedCards.length, 0)
    assert.equal(state.outcome, null)
  } else {
    assert.equal(state.currentTrick, null)
    assert.ok(state.outcome)
    assert.equal(state.outcome!.kind, 'specialWin')
  }
})

test('initRound saute les joueurs éliminés pour choisir le starter', () => {
  // Plusieurs essais pour éviter le cas rare specialWin
  let found = false
  for (let i = 0; i < 20 && !found; i++) {
    const state = initRound({
      variant: '9',
      numPlayers: 4,
      startPlayerIndex: 0,
      stakeConfig: STAKE,
      eliminatedPlayers: [0, 1],
    })
    if (state.phase === 'playing') {
      assert.ok(![0, 1].includes(state.currentTrick!.starterIndex))
      assert.deepEqual(state.bankedPlayers, [0, 1])
      found = true
    }
  }
  assert.ok(found, 'devrait trouver au moins un round sans special win')
})

// ---------------------------------------------------------------------------
// getActivePlayerIndexes / getCurrentPlayerIndex
// ---------------------------------------------------------------------------

test('getActivePlayerIndexes exclut les joueurs en banque', () => {
  const state = basePlayingState({ bankedPlayers: [1, 3] })
  assert.deepEqual(getActivePlayerIndexes(state), [0, 2])
})

test('getCurrentPlayerIndex suit l ordre du pli en ignorant les banked', () => {
  const state = basePlayingState({
    bankedPlayers: [1],
    currentTrick: {
      trickNumber: 1,
      starterIndex: 0,
      requestedSuit: '♥',
      playedCards: [{ playerIndex: 0, card: card('♥', '3', 1) }],
    },
  })
  // Ordre complet 0,1,2,3 → actifs 0,2,3 → après 1 carte jouée → index 1 dans actifs = 2
  assert.equal(getCurrentPlayerIndex(state), 2)
})

test('getCurrentPlayerIndex retourne null hors phase playing', () => {
  const state = basePlayingState({ phase: 'trickWon' })
  assert.equal(getCurrentPlayerIndex(state), null)
})

// ---------------------------------------------------------------------------
// playCard
// ---------------------------------------------------------------------------

test('playCard ouvre le pli et fixe la couleur demandée', () => {
  const state = basePlayingState()
  const lead = state.hands[0][1] // 7♥
  const next = playCard(state, 0, lead)

  assert.equal(next.phase, 'playing')
  assert.equal(next.currentTrick!.requestedSuit, '♥')
  assert.equal(next.currentTrick!.playedCards.length, 1)
  assert.equal(next.hands[0].length, 4)
  assert.deepEqual(next.playLog[0], [lead])
  assert.equal(getCurrentPlayerIndex(next), 1)
})

test('playCard rejette un coup hors tour', () => {
  const state = basePlayingState()
  assert.throws(
    () => playCard(state, 2, state.hands[2][0]),
    /ce n'est pas au tour/,
  )
})

test('playCard rejette un coup illégal (ne suit pas la couleur)', () => {
  let state = basePlayingState()
  state = playCard(state, 0, card('♥', '7', 5))
  // Joueur 1 a du ♥ (5♥) — doit suivre, pas jouer ♠
  assert.throws(
    () => playCard(state, 1, card('♠', '7', 5)),
    /coup illégal/,
  )
})

test('playCard complète le pli et passe en trickWon avec le bon gagnant', () => {
  let state = basePlayingState()
  // 0 mène 7♥, 1 suit 5♥, 2 suit 9♥ (gagne), 3 suit 8♥
  state = playCard(state, 0, card('♥', '7', 5))
  state = playCard(state, 1, card('♥', '5', 3))
  state = playCard(state, 2, card('♥', '9', 7))
  state = playCard(state, 3, card('♥', '8', 6))

  assert.equal(state.phase, 'trickWon')
  assert.equal(state.lastTrickWinnerIndex, 2)
  assert.deepEqual(state.trickWinners, [2])
  assert.equal(state.currentTrick!.playedCards.length, 4)
})

// ---------------------------------------------------------------------------
// resolveTrick
// ---------------------------------------------------------------------------

test('resolveTrick ouvre le pli suivant avec le gagnant comme starter', () => {
  let state = basePlayingState()
  state = playCard(state, 0, card('♥', '7', 5))
  state = playCard(state, 1, card('♥', '5', 3))
  state = playCard(state, 2, card('♥', '9', 7))
  state = playCard(state, 3, card('♥', '8', 6))

  const next = resolveTrick(state, STAKE)
  assert.equal(next.phase, 'playing')
  assert.equal(next.currentTrick!.trickNumber, 2)
  assert.equal(next.currentTrick!.starterIndex, 2)
  assert.equal(next.currentTrick!.requestedSuit, null)
  assert.equal(next.currentTrick!.playedCards.length, 0)
  assert.equal(next.lastTrickWinnerIndex, null)
})

test('resolveTrick sur le 5e pli termine le round (combo simple)', () => {
  // État minimal : pli 5 déjà résolu en trickWon, gagnant 0, pas de 3 en fin
  const state = basePlayingState({
    phase: 'trickWon',
    hands: [[], [], [], []],
    playLog: [
      [card('♠', '5', 3), card('♠', '6', 4), card('♠', '7', 5), card('♠', '8', 6), card('♠', '9', 7)],
      [],
      [],
      [],
    ],
    currentTrick: {
      trickNumber: 5,
      starterIndex: 0,
      requestedSuit: '♠',
      playedCards: [{ playerIndex: 0, card: card('♠', '9', 7) }],
    },
    trickWinners: [0, 0, 0, 0, 0],
    lastTrickWinnerIndex: 0,
  })

  const ended = resolveTrick(state, STAKE)
  assert.equal(ended.phase, 'roundEnd')
  assert.ok(ended.outcome)
  assert.equal(ended.outcome!.kind, 'normal')
  if (ended.outcome!.kind === 'normal') {
    assert.equal(ended.outcome.roundWinnerIndex, 0)
    assert.equal(ended.outcome.combo, 'simple')
    assert.equal(ended.outcome.multiplier, 1)
    assert.equal(ended.outcome.wonByClaim, false)
  }
})

test('resolveTrick sur le 5e pli détecte un combo Kora (un 3 final)', () => {
  const three = card('♥', '3', 1)
  const state = basePlayingState({
    phase: 'trickWon',
    hands: [[], [], [], []],
    playLog: [
      [card('♠', '5', 3), card('♠', '6', 4), card('♠', '7', 5), card('♠', '8', 6), three],
      [],
      [],
      [],
    ],
    currentTrick: {
      trickNumber: 5,
      starterIndex: 0,
      requestedSuit: '♥',
      playedCards: [{ playerIndex: 0, card: three }],
    },
    trickWinners: [0, 0, 0, 0, 0],
    lastTrickWinnerIndex: 0,
  })

  const ended = resolveTrick(state, STAKE)
  assert.equal(ended.phase, 'roundEnd')
  if (ended.outcome?.kind === 'normal') {
    assert.equal(ended.outcome.combo, 'kora')
    assert.equal(ended.outcome.multiplier, 2)
  } else {
    assert.fail('outcome normal attendu')
  }
})

// ---------------------------------------------------------------------------
// bankPlayer
// ---------------------------------------------------------------------------

test('bankPlayer ajoute le joueur en banque avant le 3e pli', () => {
  const state = basePlayingState()
  const next = bankPlayer(state, 2, STAKE)
  assert.deepEqual(next.bankedPlayers, [2])
  assert.equal(next.phase, 'playing')
})

test('bankPlayer refuse à partir du 3e pli', () => {
  const state = basePlayingState({
    currentTrick: {
      trickNumber: 3,
      starterIndex: 0,
      requestedSuit: null,
      playedCards: [],
    },
  })
  assert.throws(() => bankPlayer(state, 1, STAKE), /banque n'est plus disponible/)
})

test('bankPlayer termine le round s il ne reste qu un joueur actif', () => {
  const state = basePlayingState({ bankedPlayers: [1, 2] })
  const next = bankPlayer(state, 3, STAKE)
  assert.equal(next.phase, 'roundEnd')
  if (next.outcome?.kind === 'normal') {
    assert.equal(next.outcome.roundWinnerIndex, 0)
    assert.deepEqual(next.outcome.bankedPlayerIndexes, [1, 2, 3])
  } else {
    assert.fail('outcome normal attendu')
  }
})

// ---------------------------------------------------------------------------
// canClaimVictory / claimVictory
// ---------------------------------------------------------------------------

test('canClaimVictory est vrai quand les adversaires n ont aucune couleur du claimer', () => {
  // Joueur 0 a uniquement du ♥ ; adversaires n'ont pas de ♥
  const state = basePlayingState({
    hands: [
      [card('♥', '9', 7), card('♥', '8', 6)],
      [card('♠', '5', 3), card('♠', '6', 4)],
      [card('♦', '3', 1), card('♦', '4', 2)],
      [card('♣', '7', 5), card('♣', '8', 6)],
    ],
    currentTrick: {
      trickNumber: 2,
      starterIndex: 0,
      requestedSuit: null,
      playedCards: [],
    },
  })
  assert.equal(canClaimVictory(state, 0), true)
})

test('canClaimVictory est faux si un adversaire possède encore la couleur', () => {
  const state = basePlayingState({
    hands: [
      [card('♥', '9', 7)],
      [card('♥', '5', 3)], // encore du ♥
      [card('♦', '3', 1)],
      [card('♣', '7', 5)],
    ],
  })
  assert.equal(canClaimVictory(state, 0), false)
})

test('canClaimVictory est faux au milieu d un pli', () => {
  const state = basePlayingState({
    hands: [
      [card('♥', '9', 7)],
      [card('♠', '5', 3)],
      [card('♦', '3', 1)],
      [card('♣', '7', 5)],
    ],
    currentTrick: {
      trickNumber: 2,
      starterIndex: 0,
      requestedSuit: '♥',
      playedCards: [{ playerIndex: 0, card: card('♥', '8', 6) }],
    },
  })
  assert.equal(canClaimVictory(state, 0), false)
})

test('claimVictory termine le round avec wonByClaim', () => {
  const state = basePlayingState({
    hands: [
      [card('♥', '9', 7), card('♥', '3', 1)],
      [card('♠', '5', 3)],
      [card('♦', '4', 2)],
      [card('♣', '7', 5)],
    ],
    playLog: [
      [card('♥', '8', 6), card('♥', '7', 5)],
      [],
      [],
      [],
    ],
    currentTrick: {
      trickNumber: 3,
      starterIndex: 0,
      requestedSuit: null,
      playedCards: [],
    },
  })

  const ended = claimVictory(state, 0, STAKE)
  assert.equal(ended.phase, 'roundEnd')
  if (ended.outcome?.kind === 'normal') {
    assert.equal(ended.outcome.roundWinnerIndex, 0)
    assert.equal(ended.outcome.wonByClaim, true)
    // séquence finale se termine par 3 → kora
    assert.equal(ended.outcome.combo, 'kora')
  } else {
    assert.fail('outcome normal attendu')
  }
})

test('claimVictory rejette si les conditions ne sont pas réunies', () => {
  const state = basePlayingState()
  assert.throws(() => claimVictory(state, 0, STAKE), /conditions de la réclamation/)
})
