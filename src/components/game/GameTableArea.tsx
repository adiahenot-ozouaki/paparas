import type { Player, Suit } from '../../types'
import type { RoundState } from '../../game/round'
import {
  SEAT_NAMES,
  SEAT_AVATARS,
} from '../../game/GameContext'
import { OpponentPanel } from '../OpponentPanel'
import { PlayedCardsStack } from './PlayedCardsStack'
import PlayingCard from '../PlayingCard'

// ==========================================================================
// GameTableArea — grille CSS + zone centrale du pli en cours.
// ==========================================================================

interface GameTableAreaProps {
  players: Player[]
  roundState: RoundState
  currentPlayerIndex: number | null
  showSuitIndicator: boolean
  requestedSuit: string | null
  /** Masque les bulles nom/gains et agrandit les cartes du tapis. */
  compactMode: boolean
}

const SUIT_COLOR: Record<string, string> = {
  '♥': '#C94B4B',
  '♦': '#C94B4B',
  '♣': '#E8ECF0',
  '♠': '#E8ECF0',
}

/** Légère rotation / offset selon le siège, pour un éventail lisible au centre. */
const SEAT_CENTER_STYLE: Record<number, { rotate: number; x: number; y: number }> = {
  0: { rotate: 0, x: 0, y: 18 }, // Vous (bas)
  1: { rotate: 8, x: 28, y: 0 }, // Binu (droite)
  2: { rotate: 0, x: 0, y: -18 }, // Lebe (haut)
  3: { rotate: -8, x: -28, y: 0 }, // Goju (gauche)
}

export function GameTableArea({
  players,
  roundState,
  currentPlayerIndex,
  showSuitIndicator,
  requestedSuit,
  compactMode,
}: GameTableAreaProps) {
  const stackSize = compactMode ? 'md' : 'sm'
  const sideColumnWidth = compactMode ? 88 : 78
  const centerCardSize = compactMode ? 'md' : 'sm'

  const trickLeaderIndex =
    roundState.currentTrick && roundState.currentTrick.requestedSuit !== null
      ? roundState.currentTrick.starterIndex
      : null

  const currentTrickCards = roundState.currentTrick?.playedCards ?? []
  const showCenterTrick =
    (roundState.phase === 'playing' || roundState.phase === 'trickWon') &&
    currentTrickCards.length > 0

  const suitVisible =
    (showSuitIndicator || !!requestedSuit) &&
    !!requestedSuit &&
    (roundState.phase === 'playing' || roundState.phase === 'trickWon')

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

      {/* Centre — tapis + pli en cours + couleur demandée */}
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

        {/* Couleur demandée — visible tant que le pli est ouvert */}
        {suitVisible && requestedSuit && (
          <div
            className="anim-scale-bounce"
            style={{
              position: 'absolute',
              top: 6,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 6,
              pointerEvents: 'none',
              background: 'rgba(11,13,16,0.92)',
              backdropFilter: 'blur(12px)',
              borderRadius: 14,
              padding: '6px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              border: `1.5px solid ${SUIT_COLOR[requestedSuit] ?? '#C94B4B'}55`,
              boxShadow: `0 0 20px ${SUIT_COLOR[requestedSuit] ?? '#C94B4B'}22`,
            }}
          >
            <span
              style={{
                color: '#A9B0B7',
                fontSize: 9,
                fontFamily: 'Plus Jakarta Sans',
                letterSpacing: '0.1em',
                fontWeight: 600,
              }}
            >
              COULEUR DEMANDÉE
            </span>
            <span
              style={{
                color: SUIT_COLOR[requestedSuit] ?? '#C94B4B',
                fontSize: 22,
                lineHeight: 1,
                fontWeight: 700,
              }}
            >
              {requestedSuit}
            </span>
          </div>
        )}

        {/* Pli en cours au centre de la table */}
        {showCenterTrick && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 4,
              pointerEvents: 'none',
            }}
          >
            <div style={{ position: 'relative', width: 120, height: 110 }}>
              {currentTrickCards.map((played, i) => {
                const layout = SEAT_CENTER_STYLE[played.playerIndex] ?? { rotate: 0, x: 0, y: 0 }
                const isTrickWinner =
                  roundState.phase === 'trickWon' &&
                  roundState.lastTrickWinnerIndex === played.playerIndex
                return (
                  <div
                    key={`${played.playerIndex}-${played.card.suit}-${played.card.value}-${i}`}
                    className="anim-deal-in"
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${layout.x}px), calc(-50% + ${layout.y}px)) rotate(${layout.rotate}deg)`,
                      zIndex: isTrickWinner ? 10 : i + 1,
                      transition: 'transform 0.25s ease',
                    }}
                  >
                    <PlayingCard
                      suit={played.card.suit as Suit}
                      value={played.card.value}
                      state={isTrickWinner ? 'winner' : 'played'}
                      size={centerCardSize}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
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
