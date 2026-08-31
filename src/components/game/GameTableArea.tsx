import type { Player } from '../../types'
import type { RoundState } from '../../game/round'
import {
  SEAT_NAMES,
  SEAT_AVATARS,
} from '../../game/GameContext'
import { OpponentPanel } from '../OpponentPanel'
import { PlayedCardsStack } from './PlayedCardsStack'

// ==========================================================================
// GameTableArea — refonte en grille CSS.
//
// Avant : les avatars (OpponentPanel) et les piles de cartes du tapis
// étaient positionnés en absolu, INDÉPENDAMMENT l'un de l'autre. Sur
// certaines largeurs d'écran, les deux se chevauchaient (retour
// utilisateur : "les cartes de la main des joueurs gauche et droite
// cachent une partie de leurs cartes du tapis").
//
// Maintenant : une seule grille CSS 3 colonnes × 2 lignes. Les colonnes
// gauche/droite ont une largeur FIXE, dans laquelle chaque OpponentPanel
// (qui contient désormais lui-même sa pile de cartes, empilée en colonne)
// est intégralement contenu. Le chevauchement devient structurellement
// impossible plutôt que dépendant d'un réglage de marges.
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

  // Le joueur "à la main" pour le pli en cours : celui dont la carte a
  // fixé la couleur demandée. Ne devient pertinent qu'une fois cette
  // carte effectivement posée.
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

      {/* Centre — tapis (décor) + indicateur de couleur demandée */}
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

        {showSuitIndicator && requestedSuit && (
          <div
            className="anim-scale-bounce"
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 5,
              pointerEvents: 'none',
              background: 'rgba(11,13,16,0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: 12,
              padding: '4px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid rgba(201,75,75,0.4)',
            }}
          >
            <span style={{ color: '#A9B0B7', fontSize: 9, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.08em' }}>
              COULEUR DEMANDÉE
            </span>
            <span style={{ color: '#C94B4B', fontSize: 18, lineHeight: 1 }}>{requestedSuit}</span>
          </div>
        )}
      </div>

      {/* Sud — pile "Vous" (pleine largeur, comme le Nord, pour éviter tout
          débordement sur petit écran quand la main s'accumule) */}
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
