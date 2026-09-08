import { useEffect, useState } from 'react'
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
 * Table freestyle — bac à sable UI.
 * Cartes + 4 sièges uniquement : pas de points, cash, banque, claim, ni textes de statut.
 */
export default function FreestyleGameTableScreen({
  onNavigate,
}: {
  onNavigate: (s: Screen) => void
}) {
  const {
    players,
    roundState,
    stakeConfig,
    setRoundState,
    startNextRound,
    startNewGame,
  } = useGame()

  const reduceMotion = useReducedMotion()
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)

  const currentPlayerIndex = getCurrentPlayerIndex(roundState)
  const isHumanTurn =
    roundState.phase === 'playing' && currentPlayerIndex === HUMAN_INDEX
  const requestedSuit = roundState.currentTrick?.requestedSuit ?? null
  const humanHand = roundState.hands[HUMAN_INDEX] ?? []
  const humanIsBanked = roundState.bankedPlayers.includes(HUMAN_INDEX)
  const isHumanLeader =
    roundState.currentTrick !== null &&
    roundState.currentTrick.requestedSuit !== null &&
    roundState.currentTrick.starterIndex === HUMAN_INDEX

  const playableCards = isHumanTurn ? getPlayableCards(humanHand, requestedSuit) : []
  const isCardPlayable = (card: GameCard) =>
    playableCards.some(c => c.suit === card.suit && c.value === card.value)

  useEffect(() => {
    startNewGame()
    setSelectedCardIndex(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (roundState.phase !== 'playing') return
    if (currentPlayerIndex === null || currentPlayerIndex === HUMAN_INDEX) return

    const timer = setTimeout(() => {
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
    }, 700)

    return () => clearTimeout(timer)
  }, [roundState, currentPlayerIndex, setRoundState])

  useEffect(() => {
    if (roundState.phase !== 'trickWon') return
    const timer = setTimeout(() => {
      setRoundState((prev: RoundState) =>
        prev.phase === 'trickWon' ? resolveTrick(prev, stakeConfig) : prev,
      )
    }, 900)
    return () => clearTimeout(timer)
  }, [roundState, setRoundState, stakeConfig])

  useEffect(() => {
    if (roundState.phase !== 'roundEnd' && roundState.phase !== 'specialWin') return
    const timer = setTimeout(() => {
      startNextRound()
      setSelectedCardIndex(null)
    }, 1100)
    return () => clearTimeout(timer)
  }, [roundState.phase, startNextRound])

  function playCardAtIndex(index: number) {
    const card = humanHand[index]
    setRoundState((prev: RoundState) => playCard(prev, HUMAN_INDEX, card))
    setSelectedCardIndex(null)
  }

  function handleCardSelect(index: number) {
    if (!isHumanTurn) return
    if (!isCardPlayable(humanHand[index])) return
    setSelectedCardIndex(prev => (prev === index ? null : index))
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

  function handleRedeal() {
    startNewGame()
    setSelectedCardIndex(null)
  }

  return (
    <motion.div
      className="felt-bg table-screen freestyle-table"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="table-screen-pattern" aria-hidden />

      <header className="freestyle-hud">
        <IconButton size="sm" aria-label="Quitter le freestyle" title="Quitter" onClick={() => onNavigate('gameMode')}>
          <X size={16} strokeWidth={2} className="kora-icon" aria-hidden />
        </IconButton>
        <span className="freestyle-hud-label font-display">FREESTYLE</span>
        <IconButton size="sm" aria-label="Nouvelle donne" title="Nouvelle donne" onClick={handleRedeal}>
          <RotateCcw size={16} strokeWidth={2} className="kora-icon" aria-hidden />
        </IconButton>
      </header>

      <div className="table-screen-body">
        <GameTableArea
          players={players}
          roundState={roundState}
          currentPlayerIndex={currentPlayerIndex}
          compactMode
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
          isPlaying={roundState.phase === 'playing'}
          compactMode
          onCardSelect={handleCardSelect}
          onAttemptPlay={attemptPlayCard}
          onPlayCard={handlePlayCard}
          onClaimVictory={() => undefined}
        />
      </div>
    </motion.div>
  )
}
