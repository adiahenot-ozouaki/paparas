import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ComboType, DeckVariant, Player, SpecialRuleType } from '../types'
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
  DEFAULT_LIFETIME_STATS,
  mergeSoloAndOnline,
  pushSoloLifetimeStats,
  syncOnLogin,
} from '../lib/persistence/stats'

// ==========================================================================
// GameContext — état de partie partagé entre écrans.
//
// Stats :
//  - soloStats  → localStorage + kora_solo_lifetime_stats (si connecté)
//  - onlineStats → kora_lifetime_stats (edge function only)
//  - lifetimeStats (exposé) = mergeSoloAndOnline(solo, online)
// Achievements / profil / stats UI lisent lifetimeStats (déjà dérivés).
// ==========================================================================

export const SEAT_NAMES = ['Vous', 'Binu', 'Lebe', 'Goju']
export const SEAT_AVATARS = ['🦅', '🐆', '🦁', '🐊']
export const HUMAN_INDEX = 0
export const DEFAULT_DECK_VARIANT: DeckVariant = 'as'

const STORAGE_KEY_ACTIVE_GAME = 'kora:activeGame:v1'
const STORAGE_KEY_LIFETIME_STATS = 'kora:lifetimeStats:v1'

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
    // ignore (quota / mode privé)
  }
}

function clearPersistedGame() {
  try {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_GAME)
  } catch {
    // ignore
  }
}

export interface LifetimeStats {
  gamesPlayed: number
  gamesWon: number
  totalRoundsWon: number
  totalTricksWon: number
  bestComboEver: ComboType | null
  netGainTotal: number
  totalGains: number
  totalLosses: number
  maxCapitalEver: number
  minCapitalEver: number
  comboCounts: Record<ComboType, number>
  specialRuleCounts: Record<SpecialRuleType, number>
}

function loadSoloStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIFETIME_STATS)
    if (!raw) {
      return {
        ...DEFAULT_LIFETIME_STATS,
        comboCounts: { ...DEFAULT_LIFETIME_STATS.comboCounts },
        specialRuleCounts: { ...DEFAULT_LIFETIME_STATS.specialRuleCounts },
      }
    }
    const parsed = JSON.parse(raw) as Partial<LifetimeStats>
    return {
      ...DEFAULT_LIFETIME_STATS,
      ...parsed,
      comboCounts: { ...DEFAULT_LIFETIME_STATS.comboCounts, ...(parsed.comboCounts ?? {}) },
      specialRuleCounts: { ...DEFAULT_LIFETIME_STATS.specialRuleCounts, ...(parsed.specialRuleCounts ?? {}) },
    }
  } catch {
    return {
      ...DEFAULT_LIFETIME_STATS,
      comboCounts: { ...DEFAULT_LIFETIME_STATS.comboCounts },
      specialRuleCounts: { ...DEFAULT_LIFETIME_STATS.specialRuleCounts },
    }
  }
}

function saveSoloStatsLocal(stats: LifetimeStats) {
  try {
    localStorage.setItem(STORAGE_KEY_LIFETIME_STATS, JSON.stringify(stats))
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
  /** Stats affichées = solo + online mergés. */
  lifetimeStats: LifetimeStats
  /** Stats solo uniquement (localStorage / kora_solo_lifetime_stats). */
  soloStats: LifetimeStats
  /** Stats online uniquement (kora_lifetime_stats). */
  onlineStats: LifetimeStats
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
  const initialSnapshot = useRef<PersistedGameSnapshot | null>(loadPersistedGame()).current
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSyncedUser = useRef<string | null>(null)

  const [players, setPlayers] = useState<Player[]>(
    () => initialSnapshot?.players ?? createInitialPlayers(DEFAULT_STAKE_CONFIG.startingCapital),
  )
  const [roundState, setRoundStateInternal] = useState<RoundState>(
    () => initialSnapshot?.roundState ?? buildFreshRoundState(0, [], DEFAULT_STAKE_CONFIG, DEFAULT_DECK_VARIANT),
  )
  const [roundNumber, setRoundNumber] = useState(initialSnapshot?.roundNumber ?? 1)
  const [payoutApplied, setPayoutApplied] = useState(false)
  const [roundsWon, setRoundsWon] = useState<number[]>(initialSnapshot?.roundsWon ?? [0, 0, 0, 0])
  const [bestCombo, setBestCombo] = useState<(ComboType | null)[]>(
    initialSnapshot?.bestCombo ?? [null, null, null, null],
  )
  const [gameStartedAt, setGameStartedAt] = useState<number>(() => initialSnapshot?.gameStartedAt ?? Date.now())
  const [stakeConfig, setStakeConfig] = useState<GameStakeConfig>(initialSnapshot?.stakeConfig ?? DEFAULT_STAKE_CONFIG)
  const [deckVariant, setDeckVariant] = useState<DeckVariant>(initialSnapshot?.deckVariant ?? DEFAULT_DECK_VARIANT)
  const [started, setStarted] = useState(initialSnapshot?.started ?? false)
  const [soloStats, setSoloStats] = useState<LifetimeStats>(() => loadSoloStats())
  const [onlineStats, setOnlineStats] = useState<LifetimeStats>(() => ({
    ...DEFAULT_LIFETIME_STATS,
    comboCounts: { ...DEFAULT_LIFETIME_STATS.comboCounts },
    specialRuleCounts: { ...DEFAULT_LIFETIME_STATS.specialRuleCounts },
  }))
  const [statsSyncing, setStatsSyncing] = useState(false)
  const [lastGameOver, setLastGameOver] = useState<GameOverCheck | null>(initialSnapshot?.lastGameOver ?? null)

  const lifetimeStats = useMemo(() => mergeSoloAndOnline(soloStats, onlineStats), [soloStats, onlineStats])

  const persistSolo = useCallback(
    (next: LifetimeStats) => {
      saveSoloStatsLocal(next)
      const uid = user?.id
      if (!uid) return
      if (syncTimer.current) clearTimeout(syncTimer.current)
      syncTimer.current = setTimeout(() => {
        void pushSoloLifetimeStats(uid, next).then(({ error }) => {
          if (error) console.warn('[GameContext] push solo stats:', error)
        })
      }, 600)
    },
    [user?.id],
  )

  const refreshCloudStats = useCallback(async () => {
    if (!user?.id) return
    setStatsSyncing(true)
    try {
      const result = await syncOnLogin(user.id, soloStats)
      setSoloStats(result.solo)
      saveSoloStatsLocal(result.solo)
      setOnlineStats(result.online)
      if (result.error) console.warn('[GameContext] syncOnLogin:', result.error)
    } finally {
      setStatsSyncing(false)
    }
  }, [user?.id, soloStats])

  // Login / changement de compte → merge local ↔ cloud
  useEffect(() => {
    if (!user?.id) {
      lastSyncedUser.current = null
      setOnlineStats({
        ...DEFAULT_LIFETIME_STATS,
        comboCounts: { ...DEFAULT_LIFETIME_STATS.comboCounts },
        specialRuleCounts: { ...DEFAULT_LIFETIME_STATS.specialRuleCounts },
      })
      return
    }
    if (lastSyncedUser.current === user.id) return
    lastSyncedUser.current = user.id
    let cancelled = false
    setStatsSyncing(true)
    void syncOnLogin(user.id, loadSoloStats()).then(result => {
      if (cancelled) return
      setSoloStats(result.solo)
      saveSoloStatsLocal(result.solo)
      setOnlineStats(result.online)
      setStatsSyncing(false)
      if (result.error) console.warn('[GameContext] syncOnLogin:', result.error)
    })
    return () => {
      cancelled = true
    }
  }, [user?.id])

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
        baseStake: config.baseStake ?? prev.baseStake,
        startingCapital: config.startingCapital ?? prev.startingCapital,
        eliminationThreshold: prev.eliminationThreshold,
        endMode: config.endMode ?? prev.endMode,
        maxRounds: config.maxRounds ?? prev.maxRounds,
        targetCapital: config.targetCapital ?? prev.targetCapital,
      }))
      if (config.deckVariant !== undefined) {
        setDeckVariant(config.deckVariant)
      }
    },
    [],
  )

  const startNewGame = useCallback(() => {
    setPlayers(createInitialPlayers(stakeConfig.startingCapital))
    setRoundStateInternal(buildFreshRoundState(0, [], stakeConfig, deckVariant))
    setRoundNumber(1)
    setPayoutApplied(false)
    setRoundsWon([0, 0, 0, 0])
    setBestCombo([null, null, null, null])
    setGameStartedAt(Date.now())
    setStarted(true)
    setLastGameOver(null)
  }, [stakeConfig, deckVariant])

  const ensureGameStarted = useCallback(() => {
    if (!started) startNewGame()
  }, [started, startNewGame])

  const setRoundState = useCallback((updater: RoundState | ((prev: RoundState) => RoundState)) => {
    setRoundStateInternal(prev => (typeof updater === 'function' ? (updater as (p: RoundState) => RoundState)(prev) : updater))
  }, [])

  const applyCurrentPayout = useCallback(() => {
    if (payoutApplied || !roundState.outcome) return

    const outcome = roundState.outcome
    setPlayers(prev => applyRoundPayout(prev, outcome.payout, stakeConfig))

    const winnerIndexes = outcome.kind === 'normal' ? [outcome.roundWinnerIndex] : outcome.winners.map(w => w.playerIndex)
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

    const humanPayoutLine = [...outcome.payout.winners, ...outcome.payout.losers].find(p => p.playerIndex === HUMAN_INDEX)
    const humanDelta = humanPayoutLine?.amount ?? 0
    const newHumanCapital = players[HUMAN_INDEX].capital + humanDelta
    const humanTricksThisRound = roundState.trickWinners.filter(w => w === HUMAN_INDEX).length

    setSoloStats(prev => {
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

      const next: LifetimeStats = {
        ...prev,
        totalTricksWon: prev.totalTricksWon + humanTricksThisRound,
        totalGains: prev.totalGains + Math.max(0, humanDelta),
        totalLosses: prev.totalLosses + Math.max(0, -humanDelta),
        maxCapitalEver: Math.max(prev.maxCapitalEver, newHumanCapital),
        minCapitalEver: prev.minCapitalEver === 0 ? newHumanCapital : Math.min(prev.minCapitalEver, newHumanCapital),
        comboCounts,
        specialRuleCounts,
      }
      persistSolo(next)
      return next
    })

    setPayoutApplied(true)
  }, [payoutApplied, roundState, stakeConfig, players, persistSolo])

  const startNextRound = useCallback(() => {
    if (!roundState.outcome) return
    const winnerIndex =
      roundState.outcome.kind === 'normal' ? roundState.outcome.roundWinnerIndex : roundState.outcome.winners[0].playerIndex
    const nextStarter = (winnerIndex + 1) % 4
    const eliminatedIndexes = players.reduce<number[]>((acc, p, i) => (p.isEliminated ? [...acc, i] : acc), [])
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
      setSoloStats(prev => {
        const comboMultiplierOf = (c: ComboType | null) => (c === null ? 0 : getComboMultiplier(c))
        const humanBest = bestCombo[HUMAN_INDEX]
        const bestComboEver =
          comboMultiplierOf(humanBest) > comboMultiplierOf(prev.bestComboEver) ? humanBest : prev.bestComboEver
        const netGain = players[HUMAN_INDEX].capital - stakeConfig.startingCapital

        const next: LifetimeStats = {
          ...prev,
          gamesPlayed: prev.gamesPlayed + 1,
          gamesWon: prev.gamesWon + (won ? 1 : 0),
          totalRoundsWon: prev.totalRoundsWon + roundsWon[HUMAN_INDEX],
          bestComboEver,
          netGainTotal: prev.netGainTotal + netGain,
        }
        persistSolo(next)
        return next
      })
      clearPersistedGame()
    },
    [players, roundsWon, bestCombo, stakeConfig, persistSolo],
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
  }, [players, roundState, roundNumber, roundsWon, bestCombo, gameStartedAt, stakeConfig, deckVariant, started, lastGameOver])

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
      soloStats,
      onlineStats,
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
      soloStats,
      onlineStats,
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
  if (!ctx) throw new Error('useGame doit être utilisé à l\'intérieur de <GameProvider>.')
  return ctx
}
