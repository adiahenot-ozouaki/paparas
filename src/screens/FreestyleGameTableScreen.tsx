import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { Screen, Card as GameCard } from '../types'
import {
  playCard,
  resolveTrick,
  getCurrentPlayerIndex,
  type RoundState,
} from '../game/round'
import { getPlayableCards } from '../game/trick'
import { chooseAiCard } from '../game/ai'
import { useGame, HUMAN_INDEX } from '../game/GameContext'
import { GameTableArea } from '../components/game/GameTableArea'
import { PlayerHand } from '../components/game/PlayerHand'
import { IconButton } from '../components/ui'
import { X, RotateCcw } from 'lucide-react'

/**
 * Table freestyle — bac à sable UI sans aucun texte visible.
 * Cartes + 4 sièges uniquement. Jouer : double-tap ou glisser vers le haut.
 */
export default function FreestyleGameTableScreen({
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
    startNextRound,
    startNewGame,
  } = useGame()

  const reduceMotion = useReducedMotion()
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)

  const phase = roundState.phase
  const currentPlayerIndex = getCurrentPlayerIndex(roundState)
  const isHumanTurn = phase === 'playing' && currentPlayerIndex === HUMAN_INDEX
  const requestedSuit = roundState.currentTrick?.requestedSuit ?? null
  const humanHand = roundState.hands[HUMAN_INDEX] ?? []
  const humanIsBanked = roundState.bankedPlayers.includes(HUMAN_INDEX)
  const isHumanLeader =
    roundState.currentTrick !== null &&
    roundState.currentTrick.requestedSuit !== null &&
    roundState.currentTrick.starterIndex === HUMAN_INDEX

  const playableCards = useMemo(
    () => (isHumanTurn ? getPlayableCards(humanHand, requestedSuit) : []),
    [isHumanTurn, humanHand, requestedSuit],
  )

  const isCardPlayable = useCallback(
    (card: GameCard) => playableCards.some(c => c.suit === card.suit && c.value === card.value),
    [playableCards],
  )

  useEffect(() => {
    startNewGame()
    setSelectedCardIndex(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    if (currentPlayerIndex === null || currentPlayerIndex === HUMAN_INDEX) return

    const timer = window.setTimeout(() => {
      setRoundState((prev: RoundState) => {
        if (prev.phase !== 'playing') return prev
        const index = getCurrentPlayerIndex(prev)
        if (index === null || index === HUMAN_INDEX) return prev

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

    return () => window.clearTimeout(timer)
  }, [phase, currentPlayerIndex, setRoundState])

  useEffect(() => {
    if (phase !== 'trickWon') return
    const timer = window.setTimeout(() => {
      setRoundState((prev: RoundState) =>
        prev.phase === 'trickWon' ? resolveTrick(prev, stakeConfig) : prev,
      )
    }, 900)
    return () => window.clearTimeout(timer)
  }, [phase, setRoundState, stakeConfig])

  useEffect(() => {
    if (phase !== 'roundEnd' && phase !== 'specialWin') return
    const timer = window.setTimeout(() => {
      startNextRound()
      setSelectedCardIndex(null)
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [phase, startNextRound])

  const playCardAtIndex = useCallback(
    (index: number) => {
      const card = humanHand[index]
      setRoundState((prev: RoundState) => playCard(prev, HUMAN_INDEX, card))
      setSelectedCardIndex(null)
    },
    [humanHand, setRoundState],
  )

  /** Sélection = joue immédiatement (pas de bouton texte). */
  const handleCardSelect = useCallback(
    (index: number) => {
      if (!isHumanTurn) return
      if (!isCardPlayable(humanHand[index])) return
      playCardAtIndex(index)
    },
    [isHumanTurn, isCardPlayable, humanHand, playCardAtIndex],
  )

  const handlePlayCard = useCallback(() => {
    if (selectedCardIndex === null || !isHumanTurn) return
    playCardAtIndex(selectedCardIndex)
  }, [selectedCardIndex, isHumanTurn, playCardAtIndex])

  const attemptPlayCard = useCallback(
    (index: number) => {
      if (!isHumanTurn) return
      if (!isCardPlayable(humanHand[index])) return
      playCardAtIndex(index)
    },
    [isHumanTurn, isCardPlayable, humanHand, playCardAtIndex],
  )

  const handleRedeal = useCallback(() => {
    startNewGame()
    setSelectedCardIndex(null)
  }, [startNewGame])

  const handleQuit = useCallback(() => onNavigate('gameMode'), [onNavigate])

  return (
    <motion.div
      className="felt-bg table-screen freestyle-table"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="table-screen-pattern" aria-hidden />

      <header className="freestyle-hud">
        <IconButton size="sm" aria-label="Quitter" onClick={handleQuit}>
          <X size={16} strokeWidth={2} className="kora-icon" aria-hidden />
        </IconButton>
        <span className="freestyle-hud-spacer" aria-hidden />
        <IconButton size="sm" aria-label="Nouvelle donne" onClick={handleRedeal}>
          <RotateCcw size={16} strokeWidth={2} className="kora-icon" aria-hidden />
        </IconButton>
      </header>

      <div className="table-screen-body">
        <GameTableArea
          players={players}
          roundState={roundState}
          currentPlayerIndex={currentPlayerIndex}
          compactMode
          dealId={roundNumber}
        />

        <PlayerHand
          players={players}
          hand={humanHand}
          isHumanTurn={isHumanTurn}
          humanIsBanked={humanIsBanked}
          isLeader={isHumanLeader}
          selectedCardIndex={selectedCardIndex}
          canClaim={false}
          isCardPlayable={isCardPlayable}
          isPlaying={phase === 'playing'}
          compactMode
          dealId={roundNumber}
          onCardSelect={handleCardSelect}
          onAttemptPlay={attemptPlayCard}
          onPlayCard={handlePlayCard}
          onClaimVictory={noop}
        />
      </div>
    </motion.div>
  )
}

function noop() {}
