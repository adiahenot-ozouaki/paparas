import type { Player } from '../../types'
import type { RoundState } from '../../game/round'
import { OpponentPanel } from '../OpponentPanel'
import { PlayedCardsStack } from './PlayedCardsStack'

// ==========================================================================
// GameTableArea — grille CSS. Pseudos / avatars viennent de `players`
// (solo IA ou online). Les cartes jouées restent dans les piles de siège.
// ==========================================================================

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
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateAreas: `"north north north" "west center east" "south south south"`,
        gridTemplateColumns: `${sideColumnWidth}px 1fr ${sideColumnWidth}px`,
        gridTemplateRows: 'auto 1fr auto',
        paddingTop: 8,
        paddingBottom: compactMode ? 185 : 210,
        paddingLeft: 4,
        paddingRight: 4,
      }}
    >
      <div style={{ gridArea: 'north', justifySelf: 'center', alignSelf: 'start' }}>
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

      <div style={{ gridArea: 'west', alignSelf: 'center', justifySelf: 'center' }}>
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

      <div style={{ gridArea: 'east', alignSelf: 'center', justifySelf: 'center' }}>
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

      <div style={{ gridArea: 'center', position: 'relative', minWidth: 0, minHeight: 0 }}>
        <div
          className="table-oval"
          style={{
            position: 'absolute',
            inset: '6% 2%',
            borderRadius: '50%',
            zIndex: 0,
          }}
        />
      </div>

      <div style={{ gridArea: 'south', justifySelf: 'center', alignSelf: 'end', marginTop: 6 }}>
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
