import { useEffect, useState } from 'react'
import type { Screen, Card as GameCard } from '../types'
import { playCard, resolveTrick, getCurrentPlayerIndex, canClaimVictory, claimVictory, bankPlayer, type RoundState } from '../game/round'
import { getPlayableCards } from '../game/trick'
import { chooseAiCard, shouldAiBank } from '../game/ai'
import { useGame, HUMAN_INDEX, SEAT_NAMES } from '../game/GameContext'
import { COMBO_LABEL } from '../game/combo'
import { GameTableHud } from '../components/game/GameTableHud'
import { GameTableArea } from '../components/game/GameTableArea'
import { PlayerHand } from '../components/game/PlayerHand'
import { SpecialWinOverlayWrapper } from '../components/game/SpecialWinOverlayWrapper'
import { RoundEndRevealOverlay } from '../components/game/RoundEndRevealOverlay'
import { BankConfirmOverlay } from '../components/game/BankConfirmOverlay'
import { PauseOverlay } from '../components/game/PauseOverlay'

export default function GameTableScreen({
  onNavigate,
}: {
  onNavigate: (s: Screen) => void
}) {
  const {
    players,
    roundState,
    roundNumber,
    stakeConfig,
    setRoundState,
    ensureGameStarted,
    applyCurrentPayout,
    startNextRound,
    checkGameOverNow,
    bankPlayerAction,
    claimVictoryAction,
    recordGameResult,
  } = useGame()

  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [confirmingBank, setConfirmingBank] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [compactMode, setCompactMode] = useState(true)

  const currentPlayerIndex = getCurrentPlayerIndex(roundState)

  const isHumanTurn =
    roundState.phase === 'playing' &&
    currentPlayerIndex === HUMAN_INDEX

  const requestedSuit =
    roundState.currentTrick?.requestedSuit ?? null

  const humanHand = roundState.hands[HUMAN_INDEX]

  const humanIsBanked =
    roundState.bankedPlayers.includes(HUMAN_INDEX)

  const isHumanLeader =
    roundState.currentTrick !== null &&
    roundState.currentTrick.requestedSuit !== null &&
    roundState.currentTrick.starterIndex === HUMAN_INDEX

  const playableCards = isHumanTurn
    ? getPlayableCards(humanHand, requestedSuit)
    : []

  const canBank =
    roundState.phase === 'playing' &&
    !!roundState.currentTrick &&
    roundState.currentTrick.trickNumber < 3 &&
    !humanIsBanked

  const canClaim =
    roundState.phase === 'playing' &&
    canClaimVictory(roundState, HUMAN_INDEX)

  const isCardPlayable = (card: GameCard) =>
    playableCards.some(
      c => c.suit === card.suit && c.value === card.value,
    )

  // Status centralisé dans le HUD
  let statusMessage: string | null = null
  let statusTone: 'gold' | 'green' | 'muted' = 'muted'

  if (roundState.phase === 'roundEnd' && roundState.outcome?.kind === 'normal') {
    if (roundState.outcome.wonByClaim) {
      statusMessage = '👑 Victoire réclamée · Round terminé'
      statusTone = 'gold'
    } else {
      const w = roundState.outcome.roundWinnerIndex
      const name = w === HUMAN_INDEX ? 'Vous' : SEAT_NAMES[w]
      statusMessage = `${name} gagne · ${COMBO_LABEL[roundState.outcome.combo]}`
      statusTone = 'gold'
    }
  } else if (roundState.phase === 'specialWin') {
    statusMessage = 'Règle spéciale · Round arrêté'
    statusTone = 'gold'
  } else if (roundState.phase === 'trickWon' && roundState.lastTrickWinnerIndex !== null) {
    const w = roundState.lastTrickWinnerIndex
    statusMessage =
      w === HUMAN_INDEX ? 'Vous gagnez le pli' : `${SEAT_NAMES[w]} gagne le pli`
    statusTone = 'gold'
  } else if (roundState.phase === 'playing') {
    if (isHumanTurn && !humanIsBanked) {
      statusMessage = isHumanLeader ? 'À toi de jouer · à la main' : 'À toi de jouer'
      statusTone = 'gold'
    } else if (requestedSuit) {
      statusMessage = `Couleur demandée ${requestedSuit}`
      statusTone = 'muted'
    } else if (currentPlayerIndex !== null && currentPlayerIndex !== HUMAN_INDEX) {
      statusMessage = `${SEAT_NAMES[currentPlayerIndex]} joue…`
      statusTone = 'muted'
    }
  }

  useEffect(() => {
    ensureGameStarted()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tour IA : claim > banque > choix de carte
  useEffect(() => {
    if (roundState.phase !== 'playing') return
    if (currentPlayerIndex === null || currentPlayerIndex === HUMAN_INDEX) return
    if (isPaused) return

    const timer = setTimeout(() => {
      setRoundState((prev: RoundState) => {
        if (prev.phase !== 'playing') return prev
        const index = getCurrentPlayerIndex(prev)
        if (index === null || index === HUMAN_INDEX) return prev

        // 1. Réclamation de victoire dès que légale
        if (canClaimVictory(prev, index)) {
          return claimVictory(prev, index, stakeConfig)
        }

        // 2. Banque IA (uniquement en début de tour de pli, avant d'avoir joué)
        const trick = prev.currentTrick
        if (
          trick &&
          trick.playedCards.length === 0 &&
          trick.trickNumber < 3 &&
          !prev.bankedPlayers.includes(index)
        ) {
          const player = players[index]
          if (
            player &&
            shouldAiBank({
              hand: prev.hands[index],
              playerIndex: index,
              trickNumber: trick.trickNumber,
              capital: player.capital,
              startingCapital: stakeConfig.startingCapital,
              baseStake: stakeConfig.baseStake,
            })
          ) {
            return bankPlayer(prev, index, stakeConfig)
          }
        }

        // 3. Choix de carte selon personnalité
        const hand = prev.hands[index]
        const tricksWonByMe = prev.trickWinners.filter(w => w === index).length
        const card = chooseAiCard({
          hand,
          requestedSuit: prev.currentTrick?.requestedSuit ?? null,
          playedCardsThisTrick: prev.currentTrick?.playedCards ?? [],
          playerIndex: index,
          tricksWonByMe,
          cardsLeftInHand: hand.length,
        })
        return playCard(prev, index, card)
      })
    }, 900)

    return () => clearTimeout(timer)
  }, [roundState, currentPlayerIndex, setRoundState, stakeConfig, isPaused, players])

  useEffect(() => {
    if (roundState.phase !== 'trickWon') return
    if (isPaused) return

    const timer = setTimeout(() => {
      setRoundState((prev: RoundState) =>
        prev.phase === 'trickWon' ? resolveTrick(prev, stakeConfig) : prev,
      )
    }, 1400)

    return () => clearTimeout(timer)
  }, [roundState, setRoundState, stakeConfig, isPaused])

  useEffect(() => {
    if (roundState.phase !== 'roundEnd' && roundState.phase !== 'specialWin') return
    applyCurrentPayout()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundState.phase, roundState.outcome])

  useEffect(() => {
    if (!canBank && confirmingBank) setConfirmingBank(false)
  }, [canBank, confirmingBank])

  /** Après révélation + gains : partie suivante ou écran victory/defeat. */
  function handleRoundEndContinue() {
    const result = checkGameOverNow()
    if (result.isOver && result.winnerIndex !== undefined) {
      recordGameResult(result.winnerIndex === HUMAN_INDEX)
      onNavigate(result.winnerIndex === HUMAN_INDEX ? 'victory' : 'defeat')
      return
    }
    startNextRound()
    setSelectedCardIndex(null)
  }

  function handleCardSelect(index: number) {
    if (!isHumanTurn) return
    if (!isCardPlayable(humanHand[index])) return
    setSelectedCardIndex(prev => (prev === index ? null : index))
  }

  function playCardAtIndex(index: number) {
    const card = humanHand[index]
    setRoundState((prev: RoundState) => playCard(prev, HUMAN_INDEX, card))
    setSelectedCardIndex(null)
  }

  function handlePlayCard() {
    if (selectedCardIndex === null || !isHumanTurn) return
    playCardAtIndex(selectedCardIndex)
  }

  function attemptPlayCard(index: number) {
    if (!isHumanTurn) return
    if (!isCardPlayable(humanHand[index])) return
    playCardAtIndex(index)
  }

  function handleConfirmBank() {
    bankPlayerAction(HUMAN_INDEX)
    setConfirmingBank(false)
    setSelectedCardIndex(null)
  }

  function handleClaimVictory() {
    claimVictoryAction(HUMAN_INDEX)
  }

  const tricksWonThisRound = [0, 1, 2, 3].map(
    index => roundState.trickWinners.filter(winner => winner === index).length,
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

      {roundState.phase === 'specialWin' &&
        roundState.outcome?.kind === 'specialWin' && (
          <SpecialWinOverlayWrapper
            outcome={roundState.outcome}
            hands={roundState.hands}
            onContinue={handleRoundEndContinue}
          />
        )}

      {roundState.phase === 'roundEnd' &&
        roundState.outcome?.kind === 'normal' && (
          <RoundEndRevealOverlay
            outcome={roundState.outcome}
            hands={roundState.hands}
            playLog={roundState.playLog}
            onContinue={handleRoundEndContinue}
          />
        )}

      {confirmingBank && (
        <BankConfirmOverlay
          baseStake={stakeConfig.baseStake}
          onConfirm={handleConfirmBank}
          onCancel={() => setConfirmingBank(false)}
        />
      )}

      {isPaused && (
        <PauseOverlay
          onResume={() => setIsPaused(false)}
          onQuit={() => onNavigate('home')}
        />
      )}

      <GameTableHud
        roundNumber={roundNumber}
        tricksWonThisRound={tricksWonThisRound}
        statusMessage={statusMessage}
        statusTone={statusTone}
        compactMode={compactMode}
        canBank={canBank}
        onPause={() => setIsPaused(true)}
        onQuit={() => onNavigate('home')}
        onToggleCompact={() => setCompactMode(v => !v)}
        onOpenRules={() => onNavigate('rules')}
        onRequestBank={() => setConfirmingBank(true)}
      />

      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <GameTableArea
          players={players}
          roundState={roundState}
          currentPlayerIndex={currentPlayerIndex}
          compactMode={compactMode}
        />

        <PlayerHand
          players={players}
          hand={humanHand}
          isHumanTurn={isHumanTurn}
          humanIsBanked={humanIsBanked}
          isLeader={isHumanLeader}
          selectedCardIndex={selectedCardIndex}
          canClaim={canClaim}
          isCardPlayable={isCardPlayable}
          isPlaying={roundState.phase === 'playing'}
          compactMode={compactMode}
          onCardSelect={handleCardSelect}
          onAttemptPlay={attemptPlayCard}
          onPlayCard={handlePlayCard}
          onClaimVictory={handleClaimVictory}
        />
      </div>
    </div>
  )
}
