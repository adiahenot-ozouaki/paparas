import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Screen, Card as GameCard, Player } from '../types'
import { getCurrentPlayerIndex, type RoundState } from '../game/round'
import { getPlayableCards } from '../game/trick'
import { COMBO_LABEL } from '../game/combo'
import { useAuth } from '../auth/AuthContext'
import {
  callEngine,
  fetchSeatsWithProfiles,
  fetchTable,
  parsePublicState,
  rotateRoundStateForView,
  type SeatWithProfile,
} from '../lib/online/api'
import { getActiveOnlineTableId, setActiveOnlineTableId, getOnlineSpectate, setOnlineSpectate } from '../lib/online/session'
import { humanizeError } from '../lib/online/errors'
import { supabase } from '../lib/supabase/client'
import { GameTableHud } from '../components/game/GameTableHud'
import { GameTableArea } from '../components/game/GameTableArea'
import { PlayerHand } from '../components/game/PlayerHand'
import { SpecialWinOverlayWrapper } from '../components/game/SpecialWinOverlayWrapper'
import { RoundEndRevealOverlay } from '../components/game/RoundEndRevealOverlay'
import { BankConfirmOverlay } from '../components/game/BankConfirmOverlay'
import { PauseOverlay } from '../components/game/PauseOverlay'
import { TableChat } from '../components/game/TableChat'

const VIEW_HUMAN = 0
type ConnStatus = 'connected' | 'reconnecting' | 'offline'

function rejectMessage(action: string, raw: string | undefined): string {
  const base = humanizeError(raw, 'Action refusee par le serveur.')
  if (raw && /not your turn|pas votre tour|wrong turn/i.test(raw)) return 'Ce n est plus votre tour.'
  if (raw && /illegal|not playable|invalid card|carte/i.test(raw)) return 'Coup illegal.'
  if (action === 'play_card') return 'Coup rejete : ' + base
  if (action === 'bank_player') return 'Banque refusee : ' + base
  if (action === 'claim_victory') return 'Reclamation refusee : ' + base
  return base
}

export default function OnlineGameTableScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { user, isLoading: authLoading } = useAuth()
  const tableId = getActiveOnlineTableId()

  const [physicalState, setPhysicalState] = useState<RoundState | null>(null)
  const [roundNumber, setRoundNumber] = useState(1)
  const [seats, setSeats] = useState<SeatWithProfile[]>([])
  const [mySeat, setMySeat] = useState<number | null>(null)
  const [isSpectating, setIsSpectating] = useState(() => getOnlineSpectate())
  const [baseStake, setBaseStake] = useState(500)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [confirmingBank, setConfirmingBank] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [compactMode, setCompactMode] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [connStatus, setConnStatus] = useState<ConnStatus>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connected',
  )
  const [lastSyncAt, setLastSyncAt] = useState<number>(Date.now())
  const [actionLagMs, setActionLagMs] = useState<number | null>(null)

  const resolvingTrickRef = useRef(false)
  const syncingRef = useRef(false)
  const failStreakRef = useRef(0)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string, ms = 2800) => {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), ms)
  }, [])

  const showError = useCallback((msg: string, ms = 4500) => {
    setError(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setError(null), ms)
  }, [])

  const applyEngineBody = useCallback((body: Record<string, unknown>) => {
    if (body.state) setPhysicalState(parsePublicState(body.state))
    if (typeof body.roundNumber === 'number') setRoundNumber(body.roundNumber)
    setLastSyncAt(Date.now())
    failStreakRef.current = 0
    setConnStatus(prev => (prev === 'offline' ? prev : 'connected'))
  }, [])

  const pullState = useCallback(async () => {
    if (!tableId || syncingRef.current) return
    syncingRef.current = true
    try {
      const { ok, body, status } = await callEngine('get_state', tableId)
      if (ok) applyEngineBody(body)
      else {
        failStreakRef.current += 1
        if (status === 401) showError('Session expiree.')
        else if (failStreakRef.current >= 2) setConnStatus(navigator.onLine ? 'reconnecting' : 'offline')
      }
    } catch (e) {
      failStreakRef.current += 1
      setConnStatus(navigator.onLine ? 'reconnecting' : 'offline')
    } finally {
      syncingRef.current = false
    }
  }, [tableId, applyEngineBody, showError])

  const refreshSeats = useCallback(async () => {
    if (!tableId || !user) return
    try {
      const [seatRes, tableRes] = await Promise.all([fetchSeatsWithProfiles(tableId), fetchTable(tableId)])
      if (!seatRes.error) {
        setSeats(seatRes.seats)
        const mine = seatRes.seats.find(s => s.user_id === user.id)
        if (mine) {
          setMySeat(mine.seat_index)
          setIsSpectating(false)
          setOnlineSpectate(false)
        } else if (getOnlineSpectate()) {
          setMySeat(0)
          setIsSpectating(true)
        }
      }
      if (tableRes.table) setBaseStake(tableRes.table.base_stake)
    } catch {
      /* ignore */
    }
  }, [tableId, user])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      onNavigate('auth')
      return
    }
    if (!tableId) {
      onNavigate(getOnlineSpectate() ? 'tournaments' : 'onlineLobby')
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await refreshSeats()
      await pullState()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, tableId, onNavigate, refreshSeats, pullState])

  useEffect(() => {
    if (!tableId) return
    const channel = supabase
      .channel('table:' + tableId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kora_rounds', filter: 'table_id=eq.' + tableId }, () => {
        void pullState()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kora_table_players', filter: 'table_id=eq.' + tableId }, () => {
        void refreshSeats()
      })
      .subscribe()
    const poll = setInterval(() => {
      void pullState()
      void refreshSeats()
    }, 2500)
    return () => {
      clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [tableId, pullState, refreshSeats])

  useEffect(() => {
    if (!tableId || !physicalState || isPaused || isSpectating) return
    if (physicalState.phase !== 'trickWon') {
      resolvingTrickRef.current = false
      return
    }
    if (resolvingTrickRef.current) return
    resolvingTrickRef.current = true
    const timer = setTimeout(async () => {
      const { ok, body } = await callEngine('resolve_trick', tableId)
      if (ok) applyEngineBody(body)
      else await pullState()
      resolvingTrickRef.current = false
    }, 1200)
    return () => clearTimeout(timer)
  }, [physicalState?.phase, tableId, isPaused, isSpectating, applyEngineBody, pullState])

  const viewState = useMemo(() => {
    if (!physicalState || mySeat === null) return null
    return rotateRoundStateForView(physicalState, mySeat)
  }, [physicalState, mySeat])

  const players: Player[] = useMemo(() => {
    return [0, 1, 2, 3].map(viewIdx => {
      const physicalIdx = mySeat === null ? viewIdx : (viewIdx + mySeat) % 4
      const seat = seats.find(s => s.seat_index === physicalIdx)
      const isMe = viewIdx === VIEW_HUMAN
      return {
        id: String(physicalIdx),
        name: isMe ? (isSpectating ? 'Spectateur' : 'Vous') : seat?.profile?.username ?? (seat ? 'Joueur' : '—'),
        avatar: seat?.profile?.avatar ?? '',
        capital: seat?.capital ?? 0,
        level: 1,
        cardsLeft: viewState?.hands[viewIdx]?.length ?? 0,
        isActive: false,
        isEliminated: !seat,
        tricks: viewState?.trickWinners.filter(w => w === viewIdx).length ?? 0,
      }
    })
  }, [seats, mySeat, viewState, isSpectating])

  if (authLoading || loading || !viewState || (mySeat === null && !isSpectating)) {
    return (
      <div className="felt-bg table-screen table-screen--loading">
        <span className="table-loading-text">Chargement de la table…</span>
      </div>
    )
  }

  const currentViewPlayer = getCurrentPlayerIndex(viewState)
  const isHumanTurn = !isSpectating && viewState.phase === 'playing' && currentViewPlayer === VIEW_HUMAN
  const requestedSuit = viewState.currentTrick?.requestedSuit ?? null
  const humanHand = viewState.hands[VIEW_HUMAN]
  const humanIsBanked = viewState.bankedPlayers.includes(VIEW_HUMAN)
  const isHumanLeader =
    !!viewState.currentTrick &&
    viewState.currentTrick.requestedSuit !== null &&
    viewState.currentTrick.starterIndex === VIEW_HUMAN

  const playableCards = isHumanTurn
    ? getPlayableCards(
        humanHand.filter(c => c.state !== 'back'),
        requestedSuit,
      )
    : []
  const isCardPlayable = (card: GameCard) =>
    playableCards.some(c => c.suit === card.suit && c.value === card.value)

  const canBank =
    !isSpectating &&
    viewState.phase === 'playing' &&
    !!viewState.currentTrick &&
    viewState.currentTrick.trickNumber < 3 &&
    !humanIsBanked &&
    isHumanTurn &&
    viewState.currentTrick.playedCards.length === 0

  const canClaim =
    !isSpectating &&
    viewState.phase === 'playing' &&
    isHumanTurn &&
    !!viewState.currentTrick &&
    viewState.currentTrick.playedCards.length === 0 &&
    !humanIsBanked

  const statusMessage = isSpectating
    ? 'Mode spectateur — lecture seule'
    : busy
      ? 'Envoi…'
      : isHumanTurn
        ? 'A toi de jouer'
        : null

  async function runAction(action: Parameters<typeof callEngine>[0], extra: Record<string, unknown> = {}) {
    if (!tableId || busy || isSpectating) return
    setBusy(true)
    try {
      const { ok, body } = await callEngine(action, tableId, extra)
      if (ok) applyEngineBody(body)
      else {
        await pullState()
        showError(rejectMessage(action, body.error != null ? String(body.error) : undefined))
      }
    } catch (e) {
      showError(humanizeError(e instanceof Error ? e.message : String(e), 'Echec reseau.'))
    }
    setBusy(false)
    await refreshSeats()
  }

  async function playCardAtIndex(index: number) {
    const card = humanHand[index]
    if (!card || card.state === 'back') return
    setSelectedCardIndex(null)
    await runAction('play_card', {
      card: { suit: card.suit, value: card.value, rank: card.rank, pointValue: card.pointValue },
    })
  }

  function handleCardSelect(index: number) {
    if (!isHumanTurn || busy || connStatus === 'offline') return
    if (!isCardPlayable(humanHand[index])) return
    setSelectedCardIndex(prev => (prev === index ? null : index))
  }

  function handlePlayCard() {
    if (selectedCardIndex === null || !isHumanTurn) return
    void playCardAtIndex(selectedCardIndex)
  }

  function attemptPlayCard(index: number) {
    if (!isHumanTurn || busy || connStatus === 'offline') return
    if (!isCardPlayable(humanHand[index])) return
    void playCardAtIndex(index)
  }

  async function handleConfirmBank() {
    setConfirmingBank(false)
    await runAction('bank_player')
  }

  async function handleClaimVictory() {
    await runAction('claim_victory')
  }

  async function handleRoundEndContinue() {
    if (isSpectating) return
    await runAction('start_next_round')
    setSelectedCardIndex(null)
    await refreshSeats()
  }

  async function handleLeave() {
    if (tableId && !isSpectating) await callEngine('leave_table', tableId)
    setOnlineSpectate(false)
    setActiveOnlineTableId(null)
    onNavigate(isSpectating ? 'tournaments' : 'onlineLobby')
  }

  const tricksWonThisRound = [0, 1, 2, 3].map(
    index => viewState.trickWinners.filter(winner => winner === index).length,
  )

  return (
    <div className="felt-bg table-screen">
      <div className="table-screen-pattern" aria-hidden />

      {isSpectating && (
        <div className="online-conn-banner is-reconnect" role="status">
          <span>Mode spectateur — lecture seule</span>
          <button type="button" className="online-conn-retry" onClick={() => void handleLeave()}>
            Quitter
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="online-error-toast" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      {toast && <div className="online-info-toast">{toast}</div>}

      {viewState.phase === 'specialWin' && viewState.outcome?.kind === 'specialWin' && !isSpectating && (
        <SpecialWinOverlayWrapper
          outcome={viewState.outcome}
          hands={viewState.hands}
          onContinue={() => void handleRoundEndContinue()}
        />
      )}

      {viewState.phase === 'roundEnd' && viewState.outcome?.kind === 'normal' && !isSpectating && (
        <RoundEndRevealOverlay
          outcome={viewState.outcome}
          hands={viewState.hands}
          playLog={viewState.playLog}
          onContinue={() => void handleRoundEndContinue()}
        />
      )}

      {confirmingBank && !isSpectating && (
        <BankConfirmOverlay
          baseStake={baseStake}
          onConfirm={() => void handleConfirmBank()}
          onCancel={() => setConfirmingBank(false)}
        />
      )}

      {isPaused && <PauseOverlay onResume={() => setIsPaused(false)} onQuit={() => void handleLeave()} />}

      <GameTableHud
        roundNumber={roundNumber}
        tricksWonThisRound={tricksWonThisRound}
        statusMessage={statusMessage}
        statusTone="muted"
        compactMode={compactMode}
        canBank={canBank && !busy && connStatus !== 'offline'}
        onPause={() => setIsPaused(true)}
        onQuit={() => void handleLeave()}
        onToggleCompact={() => setCompactMode(v => !v)}
        onOpenRules={() => onNavigate('rules')}
        onRequestBank={() => setConfirmingBank(true)}
      />

      <GameTableArea
        players={players}
        roundState={viewState}
        currentPlayerIndex={currentViewPlayer}
        compactMode={compactMode}
      />

      {!isSpectating && (
        <PlayerHand
          players={players}
          hand={humanHand}
          isHumanTurn={isHumanTurn && !busy && connStatus !== 'offline'}
          humanIsBanked={humanIsBanked}
          isLeader={isHumanLeader}
          selectedCardIndex={selectedCardIndex}
          canClaim={canClaim && !busy && connStatus !== 'offline'}
          isCardPlayable={isCardPlayable}
          isPlaying={busy}
          compactMode={compactMode}
          onCardSelect={handleCardSelect}
          onAttemptPlay={attemptPlayCard}
          onPlayCard={handlePlayCard}
          onClaimVictory={() => void handleClaimVictory()}
        />
      )}

      {tableId && (
        <TableChat tableId={tableId} myUserId={user?.id ?? null} title="Discussion table" />
      )}
    </div>
  )
}
