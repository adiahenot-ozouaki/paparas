import type { Card, ComboType, DeckVariant, Suit } from './types.ts'
import { buildDeck, dealHands, shuffleDeck } from './deck.ts'
import { checkForSpecialWin, SPECIAL_RULE_MULTIPLIER, type SpecialWinner } from './specialRules.ts'
import { determineTrickWinner, getTrickPlayOrder, isValidPlay, type PlayedCard } from './trick.ts'
import { determineCombo, getComboMultiplier, type RoundPlayLog } from './combo.ts'
import { computeRoundPayout, type GameStakeConfig, type RoundPayoutResult } from './payout.ts'

export type RoundPhase = 'specialWin' | 'playing' | 'trickWon' | 'roundEnd'

const BANKING_DEADLINE_TRICK = 3

export interface CurrentTrick {
  trickNumber: number
  starterIndex: number
  requestedSuit: Suit | null
  playedCards: PlayedCard[]
}

export type RoundOutcome =
  | {
      kind: 'specialWin'
      winners: SpecialWinner[]
      multiplier: number
      payout: RoundPayoutResult
    }
  | {
      kind: 'normal'
      roundWinnerIndex: number
      combo: ComboType
      multiplier: number
      payout: RoundPayoutResult
      bankedPlayerIndexes: number[]
      wonByClaim: boolean
    }

export interface RoundState {
  phase: RoundPhase
  variant: DeckVariant
  numPlayers: number
  hands: Card[][]
  currentTrick: CurrentTrick | null
  playLog: RoundPlayLog
  trickWinners: number[]
  lastTrickWinnerIndex: number | null
  bankedPlayers: number[]
  outcome: RoundOutcome | null
}

export function initRound(params: {
  variant: DeckVariant
  numPlayers: number
  startPlayerIndex: number
  stakeConfig: GameStakeConfig
  eliminatedPlayers?: number[]
}): RoundState {
  const { variant, numPlayers, startPlayerIndex, stakeConfig, eliminatedPlayers = [] } = params

  const deck = shuffleDeck(buildDeck(variant))
  const hands = dealHands(deck, numPlayers, startPlayerIndex)
  const allPlayerIndexes = Array.from({ length: numPlayers }, (_, i) => i)
  const activePlayerIndexes = allPlayerIndexes.filter(i => !eliminatedPlayers.includes(i))

  const specialCheckRaw = checkForSpecialWin(hands)
  const specialWinners = specialCheckRaw.winners.filter(w => activePlayerIndexes.includes(w.playerIndex))

  if (specialWinners.length > 0) {
    const winnerIndexes = specialWinners.map(w => w.playerIndex)
    const payout = computeRoundPayout({
      baseStake: stakeConfig.baseStake,
      multiplier: SPECIAL_RULE_MULTIPLIER,
      winnerIndexes,
      allPlayerIndexes,
      bankedPlayerIndexes: eliminatedPlayers,
    })

    return {
      phase: 'specialWin',
      variant,
      numPlayers,
      hands,
      currentTrick: null,
      playLog: Array.from({ length: numPlayers }, () => []),
      trickWinners: [],
      lastTrickWinnerIndex: null,
      bankedPlayers: eliminatedPlayers,
      outcome: {
        kind: 'specialWin',
        winners: specialWinners,
        multiplier: SPECIAL_RULE_MULTIPLIER,
        payout,
      },
    }
  }

  let actualStart = startPlayerIndex
  while (eliminatedPlayers.includes(actualStart)) {
    actualStart = (actualStart + 1) % numPlayers
  }

  return {
    phase: 'playing',
    variant,
    numPlayers,
    hands,
    currentTrick: {
      trickNumber: 1,
      starterIndex: actualStart,
      requestedSuit: null,
      playedCards: [],
    },
    playLog: Array.from({ length: numPlayers }, () => []),
    trickWinners: [],
    lastTrickWinnerIndex: null,
    bankedPlayers: eliminatedPlayers,
    outcome: null,
  }
}

export function getActivePlayerIndexes(state: RoundState): number[] {
  return Array.from({ length: state.numPlayers }, (_, i) => i).filter(i => !state.bankedPlayers.includes(i))
}

export function getCurrentPlayerIndex(state: RoundState): number | null {
  if (state.phase !== 'playing' || !state.currentTrick) return null
  const fullOrder = getTrickPlayOrder(state.currentTrick.starterIndex, state.numPlayers)
  const activeOrder = fullOrder.filter(i => !state.bankedPlayers.includes(i))
  return activeOrder[state.currentTrick.playedCards.length] ?? null
}

function computeNormalOutcome(
  state: RoundState,
  winnerIndex: number,
  stakeConfig: GameStakeConfig,
  opts: { wonByClaim: boolean },
): RoundState {
  const fullWinnerSequence = [...state.playLog[winnerIndex], ...state.hands[winnerIndex]]
  const combo = determineCombo(fullWinnerSequence)
  const multiplier = getComboMultiplier(combo)
  const allPlayerIndexes = Array.from({ length: state.numPlayers }, (_, i) => i)

  const payout = computeRoundPayout({
    baseStake: stakeConfig.baseStake,
    multiplier,
    winnerIndexes: [winnerIndex],
    allPlayerIndexes,
    bankedPlayerIndexes: state.bankedPlayers,
  })

  return {
    ...state,
    phase: 'roundEnd',
    currentTrick: null,
    outcome: {
      kind: 'normal',
      roundWinnerIndex: winnerIndex,
      combo,
      multiplier,
      payout,
      bankedPlayerIndexes: state.bankedPlayers,
      wonByClaim: opts.wonByClaim,
    },
  }
}

export function playCard(state: RoundState, playerIndex: number, card: Card): RoundState {
  if (state.phase !== 'playing' || !state.currentTrick) {
    throw new Error('playCard: aucun pli en cours.')
  }
  if (state.bankedPlayers.includes(playerIndex)) {
    throw new Error('playCard: ce joueur est en banque et ne peut plus jouer ce round.')
  }

  const expectedPlayer = getCurrentPlayerIndex(state)
  if (expectedPlayer !== playerIndex) {
    throw new Error(`playCard: ce n'est pas au tour du joueur ${playerIndex} (attendu ${expectedPlayer}).`)
  }

  const hand = state.hands[playerIndex]
  if (!isValidPlay(hand, state.currentTrick.requestedSuit, card)) {
    throw new Error('playCard: coup illégal (la couleur demandée doit être suivie si possible).')
  }

  const newHands = state.hands.map((h, i) =>
    i === playerIndex ? h.filter(c => !(c.suit === card.suit && c.value === card.value)) : h,
  )

  const newPlayLog = state.playLog.map((seq, i) => (i === playerIndex ? [...seq, card] : seq))

  const requestedSuit = state.currentTrick.requestedSuit ?? card.suit
  const newPlayedCards: PlayedCard[] = [...state.currentTrick.playedCards, { playerIndex, card }]

  const activeCount = state.numPlayers - state.bankedPlayers.length
  const trickComplete = newPlayedCards.length === activeCount

  if (!trickComplete) {
    return {
      ...state,
      hands: newHands,
      playLog: newPlayLog,
      currentTrick: {
        ...state.currentTrick,
        requestedSuit,
        playedCards: newPlayedCards,
      },
    }
  }

  const trickWinnerIndex = determineTrickWinner(newPlayedCards, requestedSuit)

  return {
    ...state,
    phase: 'trickWon',
    hands: newHands,
    playLog: newPlayLog,
    currentTrick: {
      ...state.currentTrick,
      requestedSuit,
      playedCards: newPlayedCards,
    },
    trickWinners: [...state.trickWinners, trickWinnerIndex],
    lastTrickWinnerIndex: trickWinnerIndex,
  }
}

export function resolveTrick(state: RoundState, stakeConfig: GameStakeConfig): RoundState {
  if (state.phase !== 'trickWon' || !state.currentTrick || state.lastTrickWinnerIndex === null) {
    throw new Error('resolveTrick: aucun pli résolu en attente.')
  }

  const isLastTrick = state.currentTrick.trickNumber === 5

  if (!isLastTrick) {
    return {
      ...state,
      phase: 'playing',
      currentTrick: {
        trickNumber: state.currentTrick.trickNumber + 1,
        starterIndex: state.lastTrickWinnerIndex,
        requestedSuit: null,
        playedCards: [],
      },
      lastTrickWinnerIndex: null,
    }
  }

  return computeNormalOutcome(state, state.lastTrickWinnerIndex, stakeConfig, { wonByClaim: false })
}

export function bankPlayer(state: RoundState, playerIndex: number, stakeConfig: GameStakeConfig): RoundState {
  if (state.phase !== 'playing' || !state.currentTrick) {
    throw new Error('bankPlayer: on ne peut aller en banque que pendant que le round se joue.')
  }
  if (state.currentTrick.trickNumber >= BANKING_DEADLINE_TRICK) {
    throw new Error(`bankPlayer: la banque n'est plus disponible à partir du ${BANKING_DEADLINE_TRICK}e pli.`)
  }
  if (state.bankedPlayers.includes(playerIndex)) {
    throw new Error('bankPlayer: ce joueur est déjà en banque.')
  }

  const newBankedPlayers = [...state.bankedPlayers, playerIndex]
  const activeIndexes = Array.from({ length: state.numPlayers }, (_, i) => i).filter(
    i => !newBankedPlayers.includes(i),
  )

  const stateAfterBank: RoundState = { ...state, bankedPlayers: newBankedPlayers }

  if (activeIndexes.length === 1) {
    return computeNormalOutcome(stateAfterBank, activeIndexes[0], stakeConfig, { wonByClaim: false })
  }

  const currentTrick = stateAfterBank.currentTrick
  if (currentTrick && currentTrick.requestedSuit && currentTrick.playedCards.length === activeIndexes.length) {
    const trickWinnerIndex = determineTrickWinner(currentTrick.playedCards, currentTrick.requestedSuit)
    return {
      ...stateAfterBank,
      phase: 'trickWon',
      trickWinners: [...stateAfterBank.trickWinners, trickWinnerIndex],
      lastTrickWinnerIndex: trickWinnerIndex,
    }
  }

  return stateAfterBank
}

export function canClaimVictory(state: RoundState, playerIndex: number): boolean {
  if (state.phase !== 'playing' || !state.currentTrick) return false
  if (state.currentTrick.playedCards.length !== 0) return false
  if (state.bankedPlayers.includes(playerIndex)) return false
  if (getCurrentPlayerIndex(state) !== playerIndex) return false

  const claimerHand = state.hands[playerIndex]
  if (claimerHand.length === 0) return false
  const claimerSuits = new Set(claimerHand.map(c => c.suit))

  const opponents = getActivePlayerIndexes(state).filter(i => i !== playerIndex)

  return opponents.every(opponentIndex => state.hands[opponentIndex].every(card => !claimerSuits.has(card.suit)))
}

export function claimVictory(state: RoundState, playerIndex: number, stakeConfig: GameStakeConfig): RoundState {
  if (!canClaimVictory(state, playerIndex)) {
    throw new Error('claimVictory: les conditions de la réclamation de victoire ne sont pas réunies.')
  }
  return computeNormalOutcome(state, playerIndex, stakeConfig, { wonByClaim: true })
}
