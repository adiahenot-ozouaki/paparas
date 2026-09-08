import { motion, useReducedMotion } from 'framer-motion'
import type { Player } from '../../types'
import type { RoundState } from '../../game/round'
import { OpponentPanel } from '../OpponentPanel'
import { PlayedCardsStack } from './PlayedCardsStack'

interface GameTableAreaProps {
  players: Player[]
  roundState: RoundState
  currentPlayerIndex: number | null
  compactMode: boolean
}

export function GameTableArea({
  players,
  roundState,
  currentPlayerIndex,
  compactMode,
}: GameTableAreaProps) {
  const reduceMotion = useReducedMotion()
  const stackSize = compactMode ? 'md' : 'sm'
  const sideColumnWidth = compactMode ? 88 : 78

  const trickLeaderIndex =
    roundState.currentTrick && roundState.currentTrick.requestedSuit !== null
      ? roundState.currentTrick.starterIndex
      : null

  const seat = (i: number) => ({
    name: players[i]?.name ?? `Siège ${i + 1}`,
    avatar: players[i]?.avatar ?? '∅',
    capital: players[i]?.capital ?? 0,
    eliminated: !!players[i]?.isEliminated,
  })

  const north = seat(2)
  const west = seat(3)
  const east = seat(1)

  return (
    <div
      className={`table-area${compactMode ? ' is-compact' : ''}`}
      style={{
        gridTemplateColumns: `${sideColumnWidth}px 1fr ${sideColumnWidth}px`,
      }}
    >
      <div className="table-area-north">
        <OpponentPanel
          position="top"
          name={north.name}
          avatar={north.avatar}
          capital={north.capital}
          cardsLeft={roundState.hands[2]?.length ?? 0}
          isActive={currentPlayerIndex === 2}
          isBanked={roundState.bankedPlayers.includes(2)}
          isLeader={trickLeaderIndex === 2}
          isEliminated={north.eliminated}
          compactMode={compactMode}
          playedCards={roundState.playLog[2] ?? []}
          playedCardsHighlightLast={roundState.phase === 'trickWon' && roundState.lastTrickWinnerIndex === 2}
          stackSize={stackSize}
        />
      </div>

      <div className="table-area-west">
        <OpponentPanel
          position="left"
          name={west.name}
          avatar={west.avatar}
          capital={west.capital}
          cardsLeft={roundState.hands[3]?.length ?? 0}
          isActive={currentPlayerIndex === 3}
          isBanked={roundState.bankedPlayers.includes(3)}
          isLeader={trickLeaderIndex === 3}
          isEliminated={west.eliminated}
          compactMode={compactMode}
          playedCards={roundState.playLog[3] ?? []}
          playedCardsHighlightLast={roundState.phase === 'trickWon' && roundState.lastTrickWinnerIndex === 3}
          stackSize={stackSize}
        />
      </div>

      <div className="table-area-east">
        <OpponentPanel
          position="right"
          name={east.name}
          avatar={east.avatar}
          capital={east.capital}
          cardsLeft={roundState.hands[1]?.length ?? 0}
          isActive={currentPlayerIndex === 1}
          isBanked={roundState.bankedPlayers.includes(1)}
          isLeader={trickLeaderIndex === 1}
          isEliminated={east.eliminated}
          compactMode={compactMode}
          playedCards={roundState.playLog[1] ?? []}
          playedCardsHighlightLast={roundState.phase === 'trickWon' && roundState.lastTrickWinnerIndex === 1}
          stackSize={stackSize}
        />
      </div>

      <div className="table-area-center">
        <motion.div
          className="table-oval table-area-oval"
          animate={
            reduceMotion
              ? undefined
              : currentPlayerIndex !== null
                ? { opacity: [0.55, 0.85, 0.55], scale: [1, 1.015, 1] }
                : { opacity: 0.55, scale: 1 }
          }
          transition={
            currentPlayerIndex !== null && !reduceMotion
              ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.3 }
          }
        />
      </div>

      <div className="table-area-south">
        <PlayedCardsStack
          cards={roundState.playLog[0] ?? []}
          orientation="horizontal"
          size={stackSize}
          showLeadIndicator={trickLeaderIndex === 0}
          highlightLast={roundState.phase === 'trickWon' && roundState.lastTrickWinnerIndex === 0}
        />
      </div>
    </div>
  )
}
