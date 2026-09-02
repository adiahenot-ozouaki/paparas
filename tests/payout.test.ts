import assert from 'node:assert/strict'
import test from 'node:test'
import type { Player } from '../src/types.ts'
import {
  DEFAULT_STAKE_CONFIG,
  applyRoundPayout,
  checkGameOver,
  computeRoundPayout,
  richestActiveIndex,
  type GameStakeConfig,
} from '../src/game/payout.ts'

function player(capital: number, opts: Partial<Player> = {}): Player {
  return {
    id: '0',
    name: 'P',
    avatar: '🦅',
    capital,
    level: 1,
    cardsLeft: 5,
    isActive: true,
    tricks: 0,
    ...opts,
  }
}

const ALL4 = [0, 1, 2, 3]
const STAKE: GameStakeConfig = { baseStake: 500, startingCapital: 5000 }

// ---------------------------------------------------------------------------
// computeRoundPayout — un gagnant
// ---------------------------------------------------------------------------

test('computeRoundPayout un gagnant ×1 : pot = 1500, gagnant +1500, 3 perdants −500', () => {
  const result = computeRoundPayout({
    baseStake: 500,
    multiplier: 1,
    winnerIndexes: [0],
    allPlayerIndexes: ALL4,
  })
  assert.deepEqual(result.winners, [{ playerIndex: 0, amount: 1500 }])
  assert.equal(result.losers.length, 3)
  for (const l of result.losers) {
    assert.equal(l.amount, -500)
  }
  assert.deepEqual(
    result.losers.map(l => l.playerIndex).sort(),
    [1, 2, 3],
  )
})

test('computeRoundPayout un gagnant ×2 (Kora) : pot = 3000', () => {
  const result = computeRoundPayout({
    baseStake: 500,
    multiplier: 2,
    winnerIndexes: [2],
    allPlayerIndexes: ALL4,
  })
  assert.deepEqual(result.winners, [{ playerIndex: 2, amount: 3000 }])
  assert.equal(result.losers.every(l => l.amount === -1000), true)
})

test('computeRoundPayout un gagnant ×16 (KMT) : pot = 24000', () => {
  const result = computeRoundPayout({
    baseStake: 500,
    multiplier: 16,
    winnerIndexes: [1],
    allPlayerIndexes: ALL4,
  })
  assert.deepEqual(result.winners, [{ playerIndex: 1, amount: 24000 }])
  assert.equal(result.losers.every(l => l.amount === -8000), true)
})

test('computeRoundPayout banked paient toujours ×1 indépendamment du multiplicateur', () => {
  const result = computeRoundPayout({
    baseStake: 500,
    multiplier: 4,
    winnerIndexes: [0],
    allPlayerIndexes: ALL4,
    bankedPlayerIndexes: [3],
  })
  assert.deepEqual(result.winners, [{ playerIndex: 0, amount: 4500 }])
  const byIndex = Object.fromEntries(result.losers.map(l => [l.playerIndex, l.amount]))
  assert.equal(byIndex[1], -2000)
  assert.equal(byIndex[2], -2000)
  assert.equal(byIndex[3], -500)
})

test('computeRoundPayout plusieurs banked + un gagnant', () => {
  const result = computeRoundPayout({
    baseStake: 500,
    multiplier: 2,
    winnerIndexes: [0],
    allPlayerIndexes: ALL4,
    bankedPlayerIndexes: [1, 2],
  })
  assert.deepEqual(result.winners, [{ playerIndex: 0, amount: 2000 }])
  const byIndex = Object.fromEntries(result.losers.map(l => [l.playerIndex, l.amount]))
  assert.equal(byIndex[1], -500)
  assert.equal(byIndex[2], -500)
  assert.equal(byIndex[3], -1000)
})

test('computeRoundPayout deux gagnants partagent le pot à parts égales', () => {
  const result = computeRoundPayout({
    baseStake: 500,
    multiplier: 1,
    winnerIndexes: [0, 1],
    allPlayerIndexes: ALL4,
  })
  assert.deepEqual(result.winners, [
    { playerIndex: 0, amount: 500 },
    { playerIndex: 1, amount: 500 },
  ])
  assert.equal(result.losers.length, 2)
  assert.equal(result.losers.every(l => l.amount === -500), true)
})

test('computeRoundPayout reliquat distribué aux premiers gagnants (somme nulle)', () => {
  const result = computeRoundPayout({
    baseStake: 500,
    multiplier: 1,
    winnerIndexes: [0, 1, 2],
    allPlayerIndexes: ALL4,
  })
  assert.deepEqual(result.winners, [
    { playerIndex: 0, amount: 167 },
    { playerIndex: 1, amount: 167 },
    { playerIndex: 2, amount: 166 },
  ])
  const totalIn = result.winners.reduce((s, w) => s + w.amount, 0)
  const totalOut = result.losers.reduce((s, l) => s + Math.abs(l.amount), 0)
  assert.equal(totalIn, totalOut)
  assert.equal(totalIn, 500)
})

test('computeRoundPayout rejette une liste de gagnants vide', () => {
  assert.throws(
    () =>
      computeRoundPayout({
        baseStake: 500,
        multiplier: 1,
        winnerIndexes: [],
        allPlayerIndexes: ALL4,
      }),
    /au moins un gagnant/,
  )
})

// ---------------------------------------------------------------------------
// applyRoundPayout
// ---------------------------------------------------------------------------

test('applyRoundPayout met à jour les capitaux sans muter l entrée', () => {
  const players = [player(5000), player(5000), player(5000), player(5000)]
  const payout = computeRoundPayout({
    baseStake: 500,
    multiplier: 1,
    winnerIndexes: [0],
    allPlayerIndexes: ALL4,
  })
  const next = applyRoundPayout(players, payout, STAKE)
  assert.equal(players[0].capital, 5000)
  assert.equal(next[0].capital, 6500)
  assert.equal(next[1].capital, 4500)
  assert.equal(next[2].capital, 4500)
  assert.equal(next[3].capital, 4500)
  assert.equal(next.every(p => !p.isEliminated), true)
})

test('applyRoundPayout marque éliminé si capital < seuil (baseStake par défaut)', () => {
  const players = [player(5000), player(400), player(5000), player(5000)]
  const payout = computeRoundPayout({
    baseStake: 500,
    multiplier: 1,
    winnerIndexes: [0],
    allPlayerIndexes: ALL4,
  })
  const next = applyRoundPayout(players, payout, STAKE)
  assert.equal(next[1].capital, -100)
  assert.equal(next[1].isEliminated, true)
  assert.ok(!next[0].isEliminated)
})

test('applyRoundPayout respecte eliminationThreshold custom', () => {
  const config: GameStakeConfig = { baseStake: 500, startingCapital: 5000, eliminationThreshold: 1000 }
  const players = [player(5000), player(1200), player(5000), player(5000)]
  const payout = computeRoundPayout({
    baseStake: 500,
    multiplier: 1,
    winnerIndexes: [0],
    allPlayerIndexes: ALL4,
  })
  const next = applyRoundPayout(players, payout, config)
  assert.equal(next[1].capital, 700)
  assert.equal(next[1].isEliminated, true)
})

test('applyRoundPayout conserve isEliminated déjà true', () => {
  const players = [
    player(5000),
    player(0, { isEliminated: true }),
    player(5000),
    player(5000),
  ]
  const payout = computeRoundPayout({
    baseStake: 500,
    multiplier: 1,
    winnerIndexes: [0],
    allPlayerIndexes: ALL4,
    bankedPlayerIndexes: [1],
  })
  const next = applyRoundPayout(players, payout, STAKE)
  assert.equal(next[1].isEliminated, true)
})

// ---------------------------------------------------------------------------
// checkGameOver — élimination
// ---------------------------------------------------------------------------

test('checkGameOver false tant qu il reste au moins 2 joueurs', () => {
  const players = [player(5000), player(3000), player(0, { isEliminated: true }), player(2000)]
  assert.deepEqual(checkGameOver(players), { isOver: false })
})

test('checkGameOver true avec un seul survivant', () => {
  const players = [
    player(8000),
    player(0, { isEliminated: true }),
    player(0, { isEliminated: true }),
    player(0, { isEliminated: true }),
  ]
  const result = checkGameOver(players)
  assert.equal(result.isOver, true)
  assert.equal(result.winnerIndex, 0)
  assert.equal(result.reason, 'last_standing')
})

test('checkGameOver true si tous éliminés (edge)', () => {
  const players = [
    player(0, { isEliminated: true }),
    player(0, { isEliminated: true }),
  ]
  const result = checkGameOver(players)
  assert.equal(result.isOver, true)
  assert.equal(result.winnerIndex, undefined)
  assert.equal(result.reason, 'all_eliminated')
})

// ---------------------------------------------------------------------------
// checkGameOver — fixedRounds (hybride)
// ---------------------------------------------------------------------------

test('fixedRounds : pas de fin avant maxRounds si plusieurs actifs', () => {
  const config: GameStakeConfig = { ...STAKE, endMode: 'fixedRounds', maxRounds: 10 }
  const players = [player(6000), player(4000), player(5000), player(3000)]
  assert.deepEqual(checkGameOver(players, config, 9), { isOver: false })
})

test('fixedRounds : fin au maxRounds → plus riche gagne', () => {
  const config: GameStakeConfig = { ...STAKE, endMode: 'fixedRounds', maxRounds: 8 }
  const players = [player(6000), player(9000), player(5000), player(3000)]
  const result = checkGameOver(players, config, 8)
  assert.equal(result.isOver, true)
  assert.equal(result.winnerIndex, 1)
  assert.equal(result.reason, 'max_rounds')
})

test('fixedRounds : élimination prioritaire même avant maxRounds', () => {
  const config: GameStakeConfig = { ...STAKE, endMode: 'fixedRounds', maxRounds: 10 }
  const players = [
    player(8000),
    player(0, { isEliminated: true }),
    player(0, { isEliminated: true }),
    player(0, { isEliminated: true }),
  ]
  const result = checkGameOver(players, config, 3)
  assert.equal(result.isOver, true)
  assert.equal(result.reason, 'last_standing')
  assert.equal(result.winnerIndex, 0)
})

// ---------------------------------------------------------------------------
// checkGameOver — raceToCapital
// ---------------------------------------------------------------------------

test('raceToCapital : fin si un joueur atteint la cible', () => {
  const config: GameStakeConfig = {
    ...STAKE,
    endMode: 'raceToCapital',
    targetCapital: 12000,
  }
  const players = [player(5000), player(12500), player(4000), player(3000)]
  const result = checkGameOver(players, config, 4)
  assert.equal(result.isOver, true)
  assert.equal(result.winnerIndex, 1)
  assert.equal(result.reason, 'race_target')
})

test('raceToCapital : pas de fin sous la cible', () => {
  const config: GameStakeConfig = {
    ...STAKE,
    endMode: 'raceToCapital',
    targetCapital: 20000,
  }
  const players = [player(8000), player(9000), player(7000), player(6000)]
  assert.deepEqual(checkGameOver(players, config, 5), { isOver: false })
})

test('richestActiveIndex ignore les éliminés', () => {
  const players = [
    player(1000),
    player(50000, { isEliminated: true }),
    player(8000),
    player(2000),
  ]
  assert.equal(richestActiveIndex(players), 2)
})

// ---------------------------------------------------------------------------
// DEFAULT_STAKE_CONFIG
// ---------------------------------------------------------------------------

test('DEFAULT_STAKE_CONFIG hybride 500 / 5000 / fixedRounds 10', () => {
  assert.equal(DEFAULT_STAKE_CONFIG.baseStake, 500)
  assert.equal(DEFAULT_STAKE_CONFIG.startingCapital, 5000)
  assert.equal(DEFAULT_STAKE_CONFIG.endMode, 'fixedRounds')
  assert.equal(DEFAULT_STAKE_CONFIG.maxRounds, 10)
})
