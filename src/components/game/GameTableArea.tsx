import { memo, useMemo } from 'react'
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

function GameTableArea({
  players,
  roundState,
  currentPlayerIndex,
  compactMode,
}: GameTableAreaProps) {
  const stackSize = compactMode ? 'md' : 'sm'
  const sideColumnWidth = compactMode ? 88 : 78

  const trickLeaderIndex =
    roundState.currentTrick && roundState.currentTrick.requestedSuit !== null
      ? roundState.currentTrick.starterIndex
      : null

  const seats = useMemo(
    () =>
      [0, 1, 2, 3].map(i => ({
        name: players[i]?.name ?? `Siège ${i + 1}`,
        avatar: players[i]?.avatar ?? '∅',
        capital: players[i]?.capital ?? 0,
        eliminated: !!players[i]?.isEliminated,
      })),
    [players],
  )

  const north = seats[2]
  const west = seats[3]
  const east = seats[1]
  const phase = roundState.phase
  const lastWinner = roundState.lastTrickWinnerIndex
  const hands = roundState.hands
  const playLog = roundState.playLog
  const banked = roundState.bankedPlayers

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
          cardsLeft={hands[2]?.length ?? 0}
          isActive={currentPlayerIndex === 2}
          isBanked={banked.includes(2)}
          isLeader={trickLeaderIndex === 2}
          isEliminated={north.eliminated}
          compactMode={compactMode}
          playedCards={playLog[2] ?? []}
          playedCardsHighlightLast={phase === 'trickWon' && lastWinner === 2}
          stackSize={stackSize}
        />
      </div>

      <div className="table-area-west">
        <OpponentPanel
          position="left"
          name={west.name}
          avatar={west.avatar}
          capital={west.capital}
          cardsLeft={hands[3]?.length ?? 0}
          isActive={currentPlayerIndex === 3}
          isBanked={banked.includes(3)}
          isLeader={trickLeaderIndex === 3}
          isEliminated={west.eliminated}
          compactMode={compactMode}
          playedCards={playLog[3] ?? []}
          playedCardsHighlightLast={phase === 'trickWon' && lastWinner === 3}
          stackSize={stackSize}
        />
      </div>

      <div className="table-area-east">
        <OpponentPanel
          position="right"
          name={east.name}
          avatar={east.avatar}
          capital={east.capital}
          cardsLeft={hands[1]?.length ?? 0}
          isActive={currentPlayerIndex === 1}
          isBanked={banked.includes(1)}
          isLeader={trickLeaderIndex === 1}
          isEliminated={east.eliminated}
          compactMode={compactMode}
          playedCards={playLog[1] ?? []}
          playedCardsHighlightLast={phase === 'trickWon' && lastWinner === 1}
          stackSize={stackSize}
        />
      </div>

      <div className="table-area-center">
        <div
          className={`table-oval table-area-oval${currentPlayerIndex !== null ? ' is-live' : ''}`}
        />
      </div>

      <div className="table-area-south">
        <PlayedCardsStack
          cards={playLog[0] ?? []}
          orientation="horizontal"
          size={stackSize}
          showLeadIndicator={trickLeaderIndex === 0}
          highlightLast={phase === 'trickWon' && lastWinner === 0}
        />
      </div>
    </div>
  )
}

export default memo(GameTableArea)
export { GameTableArea }
