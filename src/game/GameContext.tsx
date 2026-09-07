import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ComboType, DeckVariant, Player } from '../types'
import { bankPlayer, claimVictory, initRound, type RoundState } from './round'
import { getComboMultiplier } from './combo'
import {
  applyRoundPayout,
  checkGameOver,
  DEFAULT_STAKE_CONFIG,
  type GameOverCheck,
  type GameStakeConfig,
  type GameEndMode,
} from './payout'
import { useAuth } from '../auth/AuthContext'
import {
  type LifetimeStats,
  DEFAULT_LIFETIME_STATS,
  loadLocalLifetimeStats,
  saveLocalLifetimeStats,
  opponentIdFromSeat,
  normalizeOpponentStatsMap,
  OPPONENT_IDS,
  OPPONENT_META,
} from '../lib/persistence/stats'
import { syncLifetimeStatsWithCloud } from '../lib/persistence/cloud'
import { appendGameHistory } from '../lib/persistence/gameHistory'

export type { LifetimeStats } from '../lib/persistence/stats'
export { DEFAULT_LIFETIME_STATS } from '../lib/persistence/stats'

export const SEAT_NAMES = ['Vous', 'Binu', 'Lebe', 'Goju']
export const SEAT_AVATARS = ['bird', 'cat', 'cat', 'turtle']
export const HUMAN_INDEX = 0
export const DEFAULT_DECK_VARIANT: DeckVariant = 'as'

const STORAGE_KEY_ACTIVE_GAME = 'kora:activeGame:v1'

function createInitialPlayers(startingCapital: number): Player[] {
  return SEAT_NAMES.map((name, i) => ({
    id: String(i),
    name,
    avatar: SEAT_AVATARS[i],
    capital: startingCapital,
    level: 1,
    cardsLeft: 5,
    isActive: false,
    tricks: 0,
  }))
}

function buildFreshRoundState(
  startPlayerIndex: number,
  eliminatedPlayers: number[],
  stakeConfig: GameStakeConfig,
  deckVariant: DeckVariant,
): RoundState {
  return initRound({
    variant: deckVariant,
    numPlayers: 4,
    startPlayerIndex,
    stakeConfig,
    eliminatedPlayers,
  })
}

interface PersistedGameSnapshot {
  players: Player[]
  roundState: RoundState
  roundNumber: number
  roundsWon: number[]
  bestCombo: (ComboType | null)[]
  gameStartedAt: number
  stakeConfig: GameStakeConfig
  deckVariant: DeckVariant
  started: boolean
  lastGameOver?: GameOverCheck | null
}

function loadPersistedGame(): PersistedGameSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_GAME)
    if (!raw) return null
    return JSON.parse(raw) as PersistedGameSnapshot
  } catch {
    return null
  }
}

function savePersistedGame(snapshot: PersistedGameSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_GAME, JSON.stringify(snapshot))
  } catch {
    // ignore
  }
}

function clearPersistedGame() {
  try {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_GAME)
  } catch {
    // ignore
  }
}

interface GameContextValue {
  players: Player[]
  roundState: RoundState
  roundNumber: number
  payoutApplied: boolean
  roundsWon: number[]
  bestCombo: (ComboType | null)[]
  gameStartedAt: number
  stakeConfig: GameStakeConfig
  deckVariant: DeckVariant
  lifetimeStats: LifetimeStats
  lastGameOver: GameOverCheck | null
  statsSyncing: boolean
  setRoundState: (updater: RoundState | ((prev: RoundState) => RoundState)) => void
  configureGame: (
    config: Partial<{
      baseStake: number
      startingCapital: number
      deckVariant: DeckVariant
      endMode: GameEndMode
      maxRounds: number
      targetCapital: number
    }>,
  ) => void
  startNewGame: () => void
  ensureGameStarted: () => void
  applyCurrentPayout: () => void
  startNextRound: () => void
  checkGameOverNow: () => GameOverCheck
  bankPlayerAction: (playerIndex: number) => void
  claimVictoryAction: (playerIndex: number) => void
  recordGameResult: (won: boolean) => void
  refreshCloudStats: () => Promise<void>
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const persisted = useRef(loadPersistedGame()).current

  const [players, setPlayers] = useState<Player[]>(
    () => persisted?.players ?? createInitialPlayers(DEFAULT_STAKE_CONFIG.startingCapital),
  )
  const [roundState, setRoundStateInternal] = useState<RoundState>(
    () =>
      persisted?.roundState ??
      buildFreshRoundState(0, [], DEFAULT_STAKE_CONFIG, DEFAULT_DECK_VARIANT),
  )
  const [roundNumber, setRoundNumber] = useState(() => persisted?.roundNumber ?? 1)
  const [payoutApplied, setPayoutApplied] = useState(false)
  const [roundsWon, setRoundsWon] = useState<number[]>(() => persisted?.roundsWon ?? [0, 0, 0, 0])
  const [bestCombo, setBestCombo] = useState<(ComboType | null)[]>(
    () => persisted?.bestCombo ?? [null, null, null, null],
  )
  const [gameStartedAt, setGameStartedAt] = useState(() => persisted?.gameStartedAt ?? Date.now())
  const [stakeConfig, setStakeConfig] = useState<GameStakeConfig>(
    () => persisted?.stakeConfig ?? { ...DEFAULT_STAKE_CONFIG },
  )
  const [deckVariant, setDeckVariant] = useState<DeckVariant>(
    () => persisted?.deckVariant ?? DEFAULT_DECK_VARIANT,
  )
  const [started, setStarted] = useState(() => persisted?.started ?? false)
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats>(() => loadLocalLifetimeStats())
  const [lastGameOver, setLastGameOver] = useState<GameOverCheck | null>(
    () => persisted?.lastGameOver ?? null,
  )
  const [statsSyncing, setStatsSyncing] = useState(false)

  const persistStats = useCallback(
    (next: LifetimeStats) => {
      saveLocalLifetimeStats(next)
      if (user) {
        setStatsSyncing(true)
        void syncLifetimeStatsWithCloud(next).then(({ stats, error }) => {
          if (error) console.warn('[stats] cloud sync:', error)
          else setLifetimeStats(stats)
          setStatsSyncing(false)
        })
      }
    },
    [user],
  )

  const refreshCloudStats = useCallback(async () => {
    setStatsSyncing(true)
    try {
      const { stats, error } = await syncLifetimeStatsWithCloud()
      setLifetimeStats(stats)
      if (error) console.warn('[stats] refresh:', error)
    } finally {
      setStatsSyncing(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void syncLifetimeStatsWithCloud(loadLocalLifetimeStats()).then(({ stats, error }) => {
      if (error) console.warn('[stats] initial sync:', error)
      setLifetimeStats(stats)
    })
  }, [user])

  const configureGame = useCallback(
    (
      config: Partial<{
        baseStake: number
        startingCapital: number
        deckVariant: DeckVariant
        endMode: GameEndMode
        maxRounds: number
        targetCapital: number
      }>,
    ) => {
      setStakeConfig(prev => ({
        ...prev,
        ...(config.baseStake !== undefined ? { baseStake: config.baseStake } : {}),
        ...(config.startingCapital !== undefined ? { startingCapital: config.startingCapital } : {}),
        ...(config.endMode !== undefined ? { endMode: config.endMode } : {}),
        ...(config.maxRounds !== undefined ? { maxRounds: config.maxRounds } : {}),
        ...(config.targetCapital !== undefined ? { targetCapital: config.targetCapital } : {}),
      }))
      if (config.deckVariant) setDeckVariant(config.deckVariant)
    },
    [],
  )

  const startNewGame = useCallback(() => {
    const fresh = createInitialPlayers(stakeConfig.startingCapital)
    const rs = buildFreshRoundState(0, [], stakeConfig, deckVariant)
    setPlayers(fresh)
    setRoundStateInternal(rs)
    setRoundNumber(1)
    setPayoutApplied(false)
    setRoundsWon([0, 0, 0, 0])
    setBestCombo([null, null, null, null])
    setGameStartedAt(Date.now())
    setLastGameOver(null)
    setStarted(true)
    clearPersistedGame()
  }, [stakeConfig, deckVariant])

  const ensureGameStarted = useCallback(() => {
    if (!started) startNewGame()
  }, [started, startNewGame])

  const setRoundState = useCallback((updater: RoundState | ((prev: RoundState) => RoundState)) => {
    setRoundStateInternal(prev =>
      typeof updater === 'function' ? (updater as (p: RoundState) => RoundState)(prev) : updater,
    )
  }, [])

  const applyCurrentPayout = useCallback(() => {
    if (payoutApplied || !roundState.outcome) return

    const outcome = roundState.outcome
    setPlayers(prev => applyRoundPayout(prev, outcome.payout, stakeConfig))

    const winnerIndexes =
      outcome.kind === 'normal' ? [outcome.roundWinnerIndex] : outcome.winners.map(w => w.playerIndex)
    setRoundsWon(prev => prev.map((count, i) => (winnerIndexes.includes(i) ? count + 1 : count)))

    if (outcome.kind === 'normal') {
      const { roundWinnerIndex, combo } = outcome
      const comboMultiplierOf = (c: ComboType | null) => (c === null ? 0 : getComboMultiplier(c))
      setBestCombo(prev =>
        prev.map((current, i) =>
          i === roundWinnerIndex && comboMultiplierOf(combo) > comboMultiplierOf(current) ? combo : current,
        ),
      )
    }

    const humanPayoutLine = [...outcome.payout.winners, ...outcome.payout.losers].find(
      p => p.playerIndex === HUMAN_INDEX,
    )
    const humanDelta = humanPayoutLine?.amount ?? 0
    const newHumanCapital = players[HUMAN_INDEX].capital + humanDelta
    const humanTricksThisRound = roundState.trickWinners.filter(w => w === HUMAN_INDEX).length

    setLifetimeStats(prev => {
      const comboCounts =
        outcome.kind === 'normal' && outcome.roundWinnerIndex === HUMAN_INDEX
          ? { ...prev.comboCounts, [outcome.combo]: prev.comboCounts[outcome.combo] + 1 }
          : prev.comboCounts

      const humanSpecialWin =
        outcome.kind === 'specialWin' ? outcome.winners.find(w => w.playerIndex === HUMAN_INDEX) : undefined
      const specialRuleCounts = humanSpecialWin
        ? humanSpecialWin.rules.reduce(
            (acc, rule) => ({ ...acc, [rule]: acc[rule] + 1 }),
            prev.specialRuleCounts,
          )
        : prev.specialRuleCounts

      const opponentStats = normalizeOpponentStatsMap(prev.opponentStats)
      for (const wi of winnerIndexes) {
        const oid = opponentIdFromSeat(wi)
        if (oid) opponentStats[oid] = { ...opponentStats[oid], roundsWon: opponentStats[oid].roundsWon + 1 }
      }

      const next: LifetimeStats = {
        ...prev,
        totalTricksWon: prev.totalTricksWon + humanTricksThisRound,
        totalGains: prev.totalGains + Math.max(0, humanDelta),
        totalLosses: prev.totalLosses + Math.max(0, -humanDelta),
        maxCapitalEver: Math.max(prev.maxCapitalEver, newHumanCapital),
        minCapitalEver:
          prev.minCapitalEver === 0 ? newHumanCapital : Math.min(prev.minCapitalEver, newHumanCapital),
        comboCounts,
        specialRuleCounts,
        opponentStats,
      }
      persistStats(next)
      return next
    })

    setPayoutApplied(true)
  }, [payoutApplied, roundState, stakeConfig, players, persistStats])

  const startNextRound = useCallback(() => {
    if (!roundState.outcome) return
    const winnerIndex =
      roundState.outcome.kind === 'normal'
        ? roundState.outcome.roundWinnerIndex
        : roundState.outcome.winners[0].playerIndex
    const nextStarter = (winnerIndex + 1) % 4
    const eliminatedIndexes = players.reduce<number[]>(
      (acc, p, i) => (p.isEliminated ? [...acc, i] : acc),
      [],
    )
    setRoundStateInternal(buildFreshRoundState(nextStarter, eliminatedIndexes, stakeConfig, deckVariant))
    setPayoutApplied(false)
    setRoundNumber(n => n + 1)
  }, [roundState.outcome, players, stakeConfig, deckVariant])

  const checkGameOverNow = useCallback(() => {
    const result = checkGameOver(players, stakeConfig, roundNumber)
    setLastGameOver(result)
    return result
  }, [players, stakeConfig, roundNumber])

  const bankPlayerAction = useCallback(
    (playerIndex: number) => {
      setRoundStateInternal(prev => bankPlayer(prev, playerIndex, stakeConfig))
    },
    [stakeConfig],
  )

  const claimVictoryAction = useCallback(
    (playerIndex: number) => {
      setRoundStateInternal(prev => claimVictory(prev, playerIndex, stakeConfig))
    },
    [stakeConfig],
  )

  const recordGameResult = useCallback(
    (won: boolean) => {
      const netGain = players[HUMAN_INDEX].capital - stakeConfig.startingCapital
      const humanBest = bestCombo[HUMAN_INDEX]

      appendGameHistory({
        won,
        netGain,
        finalCapital: players[HUMAN_INDEX].capital,
        startingCapital: stakeConfig.startingCapital,
        roundsWon: roundsWon[HUMAN_INDEX],
        bestCombo: humanBest,
        endReason: lastGameOver?.reason ?? null,
        mode: 'solo',
      })

      setLifetimeStats(prev => {
        const comboMultiplierOf = (c: ComboType | null) => (c === null ? 0 : getComboMultiplier(c))
        const bestComboEver =
          comboMultiplierOf(humanBest) > comboMultiplierOf(prev.bestComboEver) ? humanBest : prev.bestComboEver

        const humanCapital = players[HUMAN_INDEX].capital
        const opponentStats = normalizeOpponentStatsMap(prev.opponentStats)
        for (const oid of OPPONENT_IDS) {
          const seat = OPPONENT_META[oid].seatIndex
          const theirCapital = players[seat]?.capital ?? 0
          const cur = opponentStats[oid]
          opponentStats[oid] = {
            ...cur,
            gamesPlayed: cur.gamesPlayed + 1,
            timesFinishedAhead: cur.timesFinishedAhead + (theirCapital > humanCapital ? 1 : 0),
            timesFinishedBehind: cur.timesFinishedBehind + (theirCapital < humanCapital ? 1 : 0),
          }
        }

        const next: LifetimeStats = {
          ...prev,
          gamesPlayed: prev.gamesPlayed + 1,
          gamesWon: prev.gamesWon + (won ? 1 : 0),
          totalRoundsWon: prev.totalRoundsWon + roundsWon[HUMAN_INDEX],
          bestComboEver,
          netGainTotal: prev.netGainTotal + netGain,
          opponentStats,
        }
        persistStats(next)
        return next
      })
      clearPersistedGame()
    },
    [players, roundsWon, bestCombo, stakeConfig, persistStats, lastGameOver],
  )

  useEffect(() => {
    if (!started) return
    savePersistedGame({
      players,
      roundState,
      roundNumber,
      roundsWon,
      bestCombo,
      gameStartedAt,
      stakeConfig,
      deckVariant,
      started,
      lastGameOver,
    })
  }, [
    players,
    roundState,
    roundNumber,
    roundsWon,
    bestCombo,
    gameStartedAt,
    stakeConfig,
    deckVariant,
    started,
    lastGameOver,
  ])

  const value = useMemo<GameContextValue>(
    () => ({
      players,
      roundState,
      roundNumber,
      payoutApplied,
      roundsWon,
      bestCombo,
      gameStartedAt,
      stakeConfig,
      deckVariant,
      lifetimeStats,
      lastGameOver,
      statsSyncing,
      setRoundState,
      configureGame,
      startNewGame,
      ensureGameStarted,
      applyCurrentPayout,
      startNextRound,
      checkGameOverNow,
      bankPlayerAction,
      claimVictoryAction,
      recordGameResult,
      refreshCloudStats,
    }),
    [
      players,
      roundState,
      roundNumber,
      payoutApplied,
      roundsWon,
      bestCombo,
      gameStartedAt,
      stakeConfig,
      deckVariant,
      lifetimeStats,
      lastGameOver,
      statsSyncing,
      setRoundState,
      configureGame,
      startNewGame,
      ensureGameStarted,
      applyCurrentPayout,
      startNextRound,
      checkGameOverNow,
      bankPlayerAction,
      claimVictoryAction,
      recordGameResult,
      refreshCloudStats,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
