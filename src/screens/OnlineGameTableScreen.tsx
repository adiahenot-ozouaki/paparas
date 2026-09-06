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
import { getActiveOnlineTableId, setActiveOnlineTableId } from '../lib/online/session'
import { humanizeError } from '../lib/online/errors'
import { supabase } from '../lib/supabase/client'
import { GameTableHud } from '../components/game/GameTableHud'
import { GameTableArea } from '../components/game/GameTableArea'
import { PlayerHand } from '../components/game/PlayerHand'
import { SpecialWinOverlayWrapper } from '../components/game/SpecialWinOverlayWrapper'
import { RoundEndRevealOverlay } from '../components/game/RoundEndRevealOverlay'
import { BankConfirmOverlay } from '../components/game/BankConfirmOverlay'
import { PauseOverlay } from '../components/game/PauseOverlay'

// ==========================================================================
// OnlineGameTableScreen — serveur autoritaire (callEngine + Realtime).
// Vue pivotée : mon siège = sud (index 0).
// Feedback : coup rejeté, lag, reconnexion.
// ==========================================================================

const VIEW_HUMAN = 0

type ConnStatus = 'connected' | 'reconnecting' | 'offline'

function rejectMessage(action: string, raw: string | undefined): string {
  const base = humanizeError(raw, 'Action refusée par le serveur.')
  if (raw && /not your turn|pas votre tour|wrong turn/i.test(raw)) {
    return 'Ce n’est plus votre tour — état resynchronisé.'
  }
  if (raw && /illegal|not playable|invalid card|carte/i.test(raw)) {
    return 'Coup illégal — carte non jouable dans ce contexte.'
  }
  if (raw && /already|déjà/i.test(raw)) {
    return 'Action déjà prise en compte (un autre client l’a validée).'
  }
  if (action === 'play_card') return `Coup rejeté : ${base}`
  if (action === 'bank_player') return `Banque refusée : ${base}`
  if (action === 'claim_victory') return `Réclamation refusée : ${base}`
  return base
}

export default function OnlineGameTableScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { user, isLoading: authLoading } = useAuth()
  const tableId = getActiveOnlineTableId()

  const [physicalState, setPhysicalState] = useState<RoundState | null>(null)
  const [roundNumber, setRoundNumber] = useState(1)
  const [seats, setSeats] = useState<SeatWithProfile[]>([])
  const [mySeat, setMySeat] = useState<number | null>(null)
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
    if (body.state) {
      setPhysicalState(parsePublicState(body.state))
    }
    if (typeof body.roundNumber === 'number') {
      setRoundNumber(body.roundNumber)
    }
    setLastSyncAt(Date.now())
    failStreakRef.current = 0
    setConnStatus(prev => (prev === 'offline' ? prev : 'connected'))
  }, [])

  const pullState = useCallback(async () => {
    if (!tableId || syncingRef.current) return
    syncingRef.current = true
    const t0 = performance.now()
    try {
      const { ok, body, status } = await callEngine('get_state', tableId)
      if (ok) {
        applyEngineBody(body)
      } else {
        failStreakRef.current += 1
        if (status === 401) {
          showError('Session expirée. Reconnectez-vous.')
        } else if (failStreakRef.current >= 2) {
          setConnStatus(navigator.onLine ? 'reconnecting' : 'offline')
        }
        if (body.error) {
          // ne spamme pas l’UI à chaque poll — seulement après plusieurs échecs
          if (failStreakRef.current >= 3) {
            showError(humanizeError(String(body.error), 'Synchronisation impossible.'))
          }
        }
      }
      const lag = Math.round(performance.now() - t0)
      if (lag > 800) setActionLagMs(lag)
      else setActionLagMs(null)
    } catch (e) {
      failStreakRef.current += 1
      setConnStatus(navigator.onLine ? 'reconnecting' : 'offline')
      if (failStreakRef.current >= 3) {
        showError(humanizeError(e instanceof Error ? e.message : String(e), 'Connexion perdue.'))
      }
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
        if (mine) setMySeat(mine.seat_index)
      }
      if (tableRes.table) setBaseStake(tableRes.table.base_stake)
    } catch {
      // seats non bloquant
    }
  }, [tableId, user])

  // Online / offline navigateur
  useEffect(() => {
    const onOff = () => setConnStatus('offline')
    const onOn = () => {
      setConnStatus('reconnecting')
      void pullState()
      void refreshSeats()
    }
    window.addEventListener('offline', onOff)
    window.addEventListener('online', onOn)
    return () => {
      window.removeEventListener('offline', onOff)
      window.removeEventListener('online', onOn)
    }
  }, [pullState, refreshSeats])

  // Bootstrap
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      onNavigate('auth')
      return
    }
    if (!tableId) {
      onNavigate('onlineLobby')
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

  // Realtime + poll
  useEffect(() => {
    if (!tableId) return

    const channel = supabase
      .channel(`table:${tableId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kora_rounds', filter: `table_id=eq.${tableId}` },
        () => {
          void pullState()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kora_table_players', filter: `table_id=eq.${tableId}` },
        () => {
          void refreshSeats()
        },
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setConnStatus(prev => (prev === 'offline' ? prev : 'connected'))
          failStreakRef.current = 0
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnStatus(navigator.onLine ? 'reconnecting' : 'offline')
        } else if (status === 'CLOSED') {
          setConnStatus(navigator.onLine ? 'reconnecting' : 'offline')
        }
      })

    const poll = setInterval(() => {
      void pullState()
      void refreshSeats()
    }, 2500)

    return () => {
      clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [tableId, pullState, refreshSeats])

  // Auto resolve_trick
  useEffect(() => {
    if (!tableId || !physicalState || isPaused) return
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
  }, [physicalState?.phase, tableId, isPaused, applyEngineBody, pullState])

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
        name: isMe ? 'Vous' : seat?.profile?.username ?? (seat ? 'Joueur' : '—'),
        avatar: seat?.profile?.avatar ?? (isMe ? '🦅' : '∅'),
        capital: seat?.capital ?? 0,
        level: 1,
        cardsLeft: viewState?.hands[viewIdx]?.length ?? 0,
        isActive: false,
        isEliminated: !seat,
        tricks: viewState?.trickWinners.filter(w => w === viewIdx).length ?? 0,
      }
    })
  }, [seats, mySeat, viewState])

  if (authLoading || loading || !viewState || mySeat === null) {
    return (
      <div className="felt-bg" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <span style={{ color: '#A9B0B7', fontSize: 14 }}>Chargement de la table…</span>
        {connStatus !== 'connected' && (
          <span style={{ color: '#D6A84F', fontSize: 12 }}>
            {connStatus === 'offline' ? 'Hors ligne' : 'Reconnexion…'}
          </span>
        )}
      </div>
    )
  }

  const currentViewPlayer = getCurrentPlayerIndex(viewState)
  const isHumanTurn = viewState.phase === 'playing' && currentViewPlayer === VIEW_HUMAN
  const requestedSuit = viewState.currentTrick?.requestedSuit ?? null
  const humanHand = viewState.hands[VIEW_HUMAN]
  const humanIsBanked = viewState.bankedPlayers.includes(VIEW_HUMAN)
  const isHumanLeader =
    viewState.currentTrick !== null &&
    viewState.currentTrick.requestedSuit !== null &&
    viewState.currentTrick.starterIndex === VIEW_HUMAN

  const playableCards = isHumanTurn ? getPlayableCards(humanHand.filter(c => c.state !== 'back'), requestedSuit) : []
  const isCardPlayable = (card: GameCard) =>
    playableCards.some(c => c.suit === card.suit && c.value === card.value)

  const canBank =
    viewState.phase === 'playing' &&
    !!viewState.currentTrick &&
    viewState.currentTrick.trickNumber < 3 &&
    !humanIsBanked &&
    isHumanTurn &&
    viewState.currentTrick.playedCards.length === 0

  const canClaim =
    viewState.phase === 'playing' &&
    isHumanTurn &&
    !!viewState.currentTrick &&
    viewState.currentTrick.playedCards.length === 0 &&
    !humanIsBanked

  let statusMessage: string | null = null
  let statusTone: 'gold' | 'green' | 'muted' = 'muted'

  if (busy) {
    statusMessage = 'Envoi au serveur…'
    statusTone = 'muted'
  } else if (viewState.phase === 'roundEnd' && viewState.outcome?.kind === 'normal') {
    const w = viewState.outcome.roundWinnerIndex
    const name = w === VIEW_HUMAN ? 'Vous' : players[w]?.name ?? `Siège ${w}`
    statusMessage = viewState.outcome.wonByClaim
      ? '👑 Victoire réclamée · Round terminé'
      : `${name} gagne · ${COMBO_LABEL[viewState.outcome.combo]}`
    statusTone = 'gold'
  } else if (viewState.phase === 'specialWin') {
    statusMessage = 'Règle spéciale · Round arrêté'
    statusTone = 'gold'
  } else if (viewState.phase === 'trickWon' && viewState.lastTrickWinnerIndex !== null) {
    const w = viewState.lastTrickWinnerIndex
    statusMessage = w === VIEW_HUMAN ? 'Vous gagnez le pli' : `${players[w]?.name ?? 'Joueur'} gagne le pli`
    statusTone = 'gold'
  } else if (viewState.phase === 'playing') {
    if (isHumanTurn && !humanIsBanked) {
      statusMessage = isHumanLeader ? 'À toi de jouer · à la main' : 'À toi de jouer'
      statusTone = 'gold'
    } else if (requestedSuit) {
      statusMessage = `Couleur demandée ${requestedSuit}`
      statusTone = 'muted'
    } else if (currentViewPlayer !== null && currentViewPlayer !== VIEW_HUMAN) {
      statusMessage = `${players[currentViewPlayer]?.name ?? 'Joueur'} joue…`
      statusTone = 'muted'
    }
  }

  async function runAction(action: Parameters<typeof callEngine>[0], extra: Record<string, unknown> = {}) {
    if (!tableId || busy) return
    if (connStatus === 'offline') {
      showError('Hors ligne — impossible d’envoyer le coup. Réessayez quand la connexion revient.')
      return
    }
    setBusy(true)
    setError(null)
    const t0 = performance.now()
    try {
      const { ok, body, status } = await callEngine(action, tableId, extra)
      const lag = Math.round(performance.now() - t0)
      setActionLagMs(lag > 600 ? lag : null)

      if (ok) {
        applyEngineBody(body)
        if (lag > 1200) showToast(`Réponse lente (${lag} ms)`)
      } else {
        // Resync systématique après rejet
        await pullState()
        const msg = rejectMessage(action, body.error != null ? String(body.error) : undefined)
        showError(msg)
        if (status === 401) showToast('Reconnectez-vous')
        else showToast('Coup non pris en compte')
      }
    } catch (e) {
      setConnStatus(navigator.onLine ? 'reconnecting' : 'offline')
      showError(humanizeError(e instanceof Error ? e.message : String(e), 'Échec réseau — coup non envoyé.'))
      showToast('Échec d’envoi')
      await pullState()
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
    await runAction('start_next_round')
    setSelectedCardIndex(null)
    await refreshSeats()
  }

  async function handleLeave() {
    if (tableId) await callEngine('leave_table', tableId)
    setActiveOnlineTableId(null)
    onNavigate('onlineLobby')
  }

  async function handleManualReconnect() {
    setConnStatus('reconnecting')
    failStreakRef.current = 0
    showToast('Resynchronisation…')
    await pullState()
    await refreshSeats()
    if (failStreakRef.current === 0) {
      setConnStatus('connected')
      showToast('Reconnecté')
    }
  }

  const tricksWonThisRound = [0, 1, 2, 3].map(
    index => viewState.trickWinners.filter(winner => winner === index).length,
  )

  const secondsSinceSync = Math.max(0, Math.round((Date.now() - lastSyncAt) / 1000))

  return (
    <div
      className="felt-bg"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\'%3E%3Cpolygon points=\'16,0 32,16 16,32 0,16\' fill=\'none\' stroke=\'rgba(214,168,79,0.04)\' stroke-width=\'0.8\'/%3E%3C/svg%3E")',
          opacity: 0.8,
        }}
      />

      {/* Bannière connexion */}
      {connStatus !== 'connected' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: connStatus === 'offline' ? 'rgba(201,75,75,0.95)' : 'rgba(214,168,79,0.92)',
            color: connStatus === 'offline' ? '#fff' : '#0B0D10',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            fontSize: 13,
            fontFamily: 'Plus Jakarta Sans',
            fontWeight: 600,
          }}
        >
          <span>
            {connStatus === 'offline'
              ? 'Hors ligne — coups bloqués'
              : `Reconnexion… (dernier sync il y a ${secondsSinceSync}s)`}
          </span>
          <button
            type="button"
            onClick={() => void handleManualReconnect()}
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              color: 'inherit',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Lag subtil */}
      {connStatus === 'connected' && actionLagMs !== null && actionLagMs > 800 && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 10,
            zIndex: 45,
            background: 'rgba(0,0,0,0.55)',
            color: '#D6A84F',
            fontSize: 10,
            fontWeight: 700,
            padding: '4px 8px',
            borderRadius: 8,
            letterSpacing: '0.04em',
          }}
        >
          LAG {actionLagMs} ms
        </div>
      )}

      {/* Erreur coup rejeté */}
      {error && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            top: connStatus !== 'connected' ? 48 : 72,
            left: 12,
            right: 12,
            zIndex: 40,
            background: 'rgba(201,75,75,0.94)',
            color: '#fff',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 13,
            lineHeight: 1.4,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
          onClick={() => setError(null)}
        >
          <strong style={{ display: 'block', marginBottom: 4 }}>Action refusée</strong>
          {error}
          <span style={{ display: 'block', marginTop: 6, opacity: 0.8, fontSize: 11 }}>Toucher pour fermer</span>
        </div>
      )}

      {/* Toast léger */}
      {toast && !error && (
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            background: 'rgba(16,21,26,0.92)',
            border: '1px solid rgba(214,168,79,0.35)',
            color: '#F0D58A',
            borderRadius: 12,
            padding: '10px 16px',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            maxWidth: '90%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {toast}
        </div>
      )}

      {/* Busy overlay discret sur la main */}
      {busy && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            zIndex: 35,
            background: 'linear-gradient(90deg, transparent, #D6A84F, transparent)',
            backgroundSize: '200% 100%',
            animation: 'none',
            opacity: 0.9,
          }}
        />
      )}

      {viewState.phase === 'specialWin' && viewState.outcome?.kind === 'specialWin' && (
        <SpecialWinOverlayWrapper
          outcome={viewState.outcome}
          hands={viewState.hands}
          onContinue={() => void handleRoundEndContinue()}
        />
      )}

      {viewState.phase === 'roundEnd' && viewState.outcome?.kind === 'normal' && (
        <RoundEndRevealOverlay
          outcome={viewState.outcome}
          hands={viewState.hands}
          playLog={viewState.playLog}
          onContinue={() => void handleRoundEndContinue()}
        />
      )}

      {confirmingBank && (
        <BankConfirmOverlay
          baseStake={baseStake}
          onConfirm={() => void handleConfirmBank()}
          onCancel={() => setConfirmingBank(false)}
        />
      )}

      {isPaused && (
        <PauseOverlay onResume={() => setIsPaused(false)} onQuit={() => void handleLeave()} />
      )}

      <GameTableHud
        roundNumber={roundNumber}
        tricksWonThisRound={tricksWonThisRound}
        statusMessage={statusMessage}
        statusTone={statusTone}
        compactMode={compactMode}
        canBank={canBank && !busy && connStatus !== 'offline'}
        onPause={() => setIsPaused(true)}
        onQuit={() => void handleLeave()}
        onToggleCompact={() => setCompactMode(v => !v)}
        onOpenRules={() => onNavigate('rules')}
        onRequestBank={() => setConfirmingBank(true)}
      />

      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <GameTableArea
          players={players}
          roundState={viewState}
          currentPlayerIndex={currentViewPlayer}
          compactMode={compactMode}
        />

        <PlayerHand
          players={players}
          hand={humanHand}
          isHumanTurn={isHumanTurn && !busy && connStatus !== 'offline'}
          humanIsBanked={humanIsBanked}
          isLeader={isHumanLeader}
          selectedCardIndex={selectedCardIndex}
          canClaim={canClaim && !busy && connStatus !== 'offline'}
          isCardPlayable={isCardPlayable}
          isPlaying={viewState.phase === 'playing'}
          compactMode={compactMode}
          onCardSelect={handleCardSelect}
          onAttemptPlay={attemptPlayCard}
          onPlayCard={handlePlayCard}
          onClaimVictory={() => void handleClaimVictory()}
        />
      </div>
    </div>
  )
}
