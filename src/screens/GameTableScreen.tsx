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

  useEffect(() => {
    if (roundState.phase !== 'playing') return
    if (currentPlayerIndex === null || currentPlayerIndex === HUMAN_INDEX) return
    if (isPaused) return

    const timer = setTimeout(() => {
      setRoundState((prev: RoundState) => {
        if (prev.phase !== 'playing') return prev
        const index = getCurrentPlayerIndex(prev)
        if (index === null || index === HUMAN_INDEX) return prev

        if (canClaimVictory(prev, index)) {
          return claimVictory(prev, index, stakeConfig)
        }

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
    }, 950)

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
    <div className="felt-bg table-screen">
      <div className="table-screen-pattern" aria-hidden />

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

      <div className="table-screen-body">
        <GameTableArea
          players={players}
          roundState={roundState}
          currentPlayerIndex={currentPlayerIndex}
          compactMode={compactMode}
          dealId={roundNumber}
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
          dealId={roundNumber}
          onCardSelect={handleCardSelect}
          onAttemptPlay={attemptPlayCard}
          onPlayCard={handlePlayCard}
          onClaimVictory={handleClaimVictory}
        />
      </div>
    </div>
  )
}
