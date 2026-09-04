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
// ==========================================================================

const VIEW_HUMAN = 0

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
  const [loading, setLoading] = useState(true)

  const resolvingTrickRef = useRef(false)
  const syncingRef = useRef(false)

  const applyEngineBody = useCallback((body: Record<string, unknown>) => {
    if (body.state) {
      setPhysicalState(parsePublicState(body.state))
    }
    if (typeof body.roundNumber === 'number') {
      setRoundNumber(body.roundNumber)
    }
  }, [])

  const pullState = useCallback(async () => {
    if (!tableId || syncingRef.current) return
    syncingRef.current = true
    try {
      const { ok, body } = await callEngine('get_state', tableId)
      if (ok) applyEngineBody(body)
      else if (body.error) setError(String(body.error))
    } finally {
      syncingRef.current = false
    }
  }, [tableId, applyEngineBody])

  const refreshSeats = useCallback(async () => {
    if (!tableId || !user) return
    const [seatRes, tableRes] = await Promise.all([fetchSeatsWithProfiles(tableId), fetchTable(tableId)])
    if (!seatRes.error) {
      setSeats(seatRes.seats)
      const mine = seatRes.seats.find(s => s.user_id === user.id)
      if (mine) setMySeat(mine.seat_index)
    }
    if (tableRes.table) setBaseStake(tableRes.table.base_stake)
  }, [tableId, user])

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

  // Auto resolve_trick (un seul appel à la fois)
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
      else {
        // Un autre client a peut‑être déjà résolu — resync
        await pullState()
      }
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
      <div className="felt-bg" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#A9B0B7', fontSize: 14 }}>Chargement de la table…</span>
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
    (viewState.currentTrick.playedCards.length === 0)

  // Claim : le serveur valide (mains adverses masquées côté client)
  const canClaim =
    viewState.phase === 'playing' &&
    isHumanTurn &&
    !!viewState.currentTrick &&
    viewState.currentTrick.playedCards.length === 0 &&
    !humanIsBanked

  let statusMessage: string | null = null
  let statusTone: 'gold' | 'green' | 'muted' = 'muted'

  if (viewState.phase === 'roundEnd' && viewState.outcome?.kind === 'normal') {
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
    setBusy(true)
    setError(null)
    const { ok, body } = await callEngine(action, tableId, extra)
    if (ok) applyEngineBody(body)
    else setError(String(body.error ?? 'Action refusée'))
    setBusy(false)
    await refreshSeats()
  }

  async function playCardAtIndex(index: number) {
    const card = humanHand[index]
    if (!card || card.state === 'back') return
    setSelectedCardIndex(null)
    await runAction('play_card', { card: { suit: card.suit, value: card.value, rank: card.rank, pointValue: card.pointValue } })
  }

  function handleCardSelect(index: number) {
    if (!isHumanTurn || busy) return
    if (!isCardPlayable(humanHand[index])) return
    setSelectedCardIndex(prev => (prev === index ? null : index))
  }

  function handlePlayCard() {
    if (selectedCardIndex === null || !isHumanTurn) return
    void playCardAtIndex(selectedCardIndex)
  }

  function attemptPlayCard(index: number) {
    if (!isHumanTurn || busy) return
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

  const tricksWonThisRound = [0, 1, 2, 3].map(
    index => viewState.trickWinners.filter(winner => winner === index).length,
  )

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

      {error && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            top: 72,
            left: 12,
            right: 12,
            zIndex: 40,
            background: 'rgba(201,75,75,0.92)',
            color: '#fff',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 13,
          }}
          onClick={() => setError(null)}
        >
          {error}
        </div>
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
        <PauseOverlay
          onResume={() => setIsPaused(false)}
          onQuit={() => void handleLeave()}
        />
      )}

      <GameTableHud
        roundNumber={roundNumber}
        tricksWonThisRound={tricksWonThisRound}
        statusMessage={statusMessage}
        statusTone={statusTone}
        compactMode={compactMode}
        canBank={canBank && !busy}
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
          isHumanTurn={isHumanTurn && !busy}
          humanIsBanked={humanIsBanked}
          isLeader={isHumanLeader}
          selectedCardIndex={selectedCardIndex}
          canClaim={canClaim && !busy}
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
