import type { Player } from '../../types'
import type { RoundState } from '../../game/round'
import {
  SEAT_NAMES,
  SEAT_AVATARS,
} from '../../game/GameContext'
import { OpponentPanel } from '../OpponentPanel'
import { PlayedCardsStack } from './PlayedCardsStack'

// ==========================================================================
// GameTableArea — grille CSS. Les cartes jouées restent dans les piles de
// chaque siège (playLog). Aucun doublon au centre du tapis.
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
      {/* Nord — Lebe */}
      <div style={{ gridArea: 'north', justifySelf: 'center', alignSelf: 'start' }}>
        <OpponentPanel
          position="top"
          name={SEAT_NAMES[2]}
          avatar={SEAT_AVATARS[2]}
          capital={players[2].capital}
          cardsLeft={roundState.hands[2].length}
          isActive={currentPlayerIndex === 2}
          isBanked={roundState.bankedPlayers.includes(2)}
          isLeader={trickLeaderIndex === 2}
          isEliminated={!!players[2].isEliminated}
          compactMode={compactMode}
          playedCards={roundState.playLog[2]}
          playedCardsHighlightLast={roundState.phase === 'trickWon' && roundState.lastTrickWinnerIndex === 2}
          stackSize={stackSize}
        />
      </div>

      {/* Ouest — Goju */}
      <div style={{ gridArea: 'west', alignSelf: 'center', justifySelf: 'center' }}>
        <OpponentPanel
          position="left"
          name={SEAT_NAMES[3]}
          avatar={SEAT_AVATARS[3]}
          capital={players[3].capital}
          cardsLeft={roundState.hands[3].length}
          isActive={currentPlayerIndex === 3}
          isBanked={roundState.bankedPlayers.includes(3)}
          isLeader={trickLeaderIndex === 3}
          isEliminated={!!players[3].isEliminated}
          compactMode={compactMode}
          playedCards={roundState.playLog[3]}
          playedCardsHighlightLast={roundState.phase === 'trickWon' && roundState.lastTrickWinnerIndex === 3}
          stackSize={stackSize}
        />
      </div>

      {/* Est — Binu */}
      <div style={{ gridArea: 'east', alignSelf: 'center', justifySelf: 'center' }}>
        <OpponentPanel
          position="right"
          name={SEAT_NAMES[1]}
          avatar={SEAT_AVATARS[1]}
          capital={players[1].capital}
          cardsLeft={roundState.hands[1].length}
          isActive={currentPlayerIndex === 1}
          isBanked={roundState.bankedPlayers.includes(1)}
          isLeader={trickLeaderIndex === 1}
          isEliminated={!!players[1].isEliminated}
          compactMode={compactMode}
          playedCards={roundState.playLog[1]}
          playedCardsHighlightLast={roundState.phase === 'trickWon' && roundState.lastTrickWinnerIndex === 1}
          stackSize={stackSize}
        />
      </div>

      {/* Centre — décor de tapis uniquement */}
      <div
        style={{
          gridArea: 'center',
          position: 'relative',
          minWidth: 0,
          minHeight: 0,
        }}
      >
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

      {/* Sud — pile "Vous" */}
      <div style={{ gridArea: 'south', justifySelf: 'center', alignSelf: 'end', marginTop: 6 }}>
        <PlayedCardsStack
          cards={roundState.playLog[0]}
          orientation="horizontal"
          size={stackSize}
          showLeadIndicator={trickLeaderIndex === 0}
          highlightLast={roundState.phase === 'trickWon' && roundState.lastTrickWinnerIndex === 0}
        />
      </div>
    </div>
  )
}
