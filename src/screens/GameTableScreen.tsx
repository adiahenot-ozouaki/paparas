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
    const leaderIndex =
      roundState.currentTrick && roundState.currentTrick.requestedSuit !== null
        ? roundState.currentTrick.starterIndex
        : null
    if (isHumanTurn && !humanIsBanked) {
      statusMessage = isHumanLeader ? 'À toi de jouer · à la main' : 'À toi de jouer'
      statusTone = 'gold'
    } else if (currentPlayerIndex !== null && currentPlayerIndex !== HUMAN_INDEX) {
      const name = SEAT_NAMES[currentPlayerIndex]
      statusMessage =
        leaderIndex === currentPlayerIndex
          ? `${name} joue · à la main`
          : `${name} joue…`
      statusTone = 'muted'
    } else if (requestedSuit) {
      statusMessage = `Couleur demandée ${requestedSuit}`
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
            return bankPlayer(prev, index)
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
    }, 700)

    return () => clearTimeout(timer)
  }, [roundState, currentPlayerIndex, isPaused, setRoundState, players, stakeConfig])

  useEffect(() => {
    if (roundState.phase !== 'trickWon') return
    const timer = setTimeout(() => {
      setRoundState((prev: RoundState) =>
        prev.phase === 'trickWon' ? resolveTrick(prev, stakeConfig) : prev,
      )
    }, 900)
    return () => clearTimeout(timer)
  }, [roundState, setRoundState, stakeConfig])

  function handleCardSelect(index: number) {
    if (!isHumanTurn || humanIsBanked) return
    if (!isCardPlayable(humanHand[index])) return
    setSelectedCardIndex(prev => (prev === index ? null : index))
  }

  function handlePlayCard() {
    if (selectedCardIndex === null || !isHumanTurn) return
    const card = humanHand[selectedCardIndex]
    setRoundState(prev => playCard(prev, HUMAN_INDEX, card))
    setSelectedCardIndex(null)
  }

  function attemptPlayCard(index: number) {
    if (!isHumanTurn || humanIsBanked) return
    if (!isCardPlayable(humanHand[index])) return
    const card = humanHand[index]
    setRoundState(prev => playCard(prev, HUMAN_INDEX, card))
    setSelectedCardIndex(null)
  }

  function handleConfirmBank() {
    setConfirmingBank(false)
    bankPlayerAction()
  }

  function handleClaimVictory() {
    claimVictoryAction()
  }

  function handleRoundEndContinue() {
    applyCurrentPayout()
    const over = checkGameOverNow()
    if (over) {
      recordGameResult()
      onNavigate(over.humanWon ? 'victory' : 'defeat')
      return
    }
    startNextRound()
    setSelectedCardIndex(null)
  }

  const tricksWonThisRound = [0, 1, 2, 3].map(
    index => roundState.trickWinners.filter(winner => winner === index).length,
  )

  return (
    <div className="felt-bg table-screen">
      <div className="table-screen-pattern pattern-african" aria-hidden />
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
        />
        <PlayerHand
          players={players}
          humanHand={humanHand}
          selectedCardIndex={selectedCardIndex}
          isHumanTurn={isHumanTurn}
          humanIsBanked={humanIsBanked}
          isLeader={isHumanLeader}
          compactMode={compactMode}
          canClaim={canClaim}
          isCardPlayable={isCardPlayable}
          onSelectCard={handleCardSelect}
          onPlayCard={handlePlayCard}
          onAttemptPlayCard={attemptPlayCard}
          onClaimVictory={handleClaimVictory}
        />
      </div>

      {confirmingBank && (
        <BankConfirmOverlay
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

      {roundState.phase === 'specialWin' && roundState.specialWinners && (
        <SpecialWinOverlayWrapper
          roundState={roundState}
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
    </div>
  )
}
