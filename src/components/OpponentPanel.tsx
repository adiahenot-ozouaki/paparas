import PlayingCard from './PlayingCard'
import { PlayedCardsStack } from './game/PlayedCardsStack'
import type { Card as GameCard } from '../types'

// ==========================================================================
// OpponentPanel — un "siège" complet (badges + main face cachée + pile de
// cartes jouées), positionné par le PARENT via une grille CSS.
//
// L'avatar (emoji) a été retiré de l'écran de jeu à la demande du
// produit : seules les cartes doivent y être visibles. Le statut "à qui
// le tour" reste communiqué par le badge textuel "JOUE..." plus bas, donc
// aucune information n'est perdue.
//
// Ne se positionne plus lui-même en absolu : les éléments vivent dans le
// MÊME conteneur flex, donc ne peuvent plus se chevaucher par construction
// (avant, deux systèmes de positionnement indépendants pouvaient entrer en
// collision selon la largeur de l'écran).
// ==========================================================================

interface OpponentPanelProps {
  position: 'top' | 'left' | 'right'
  name: string
  /** Conservé dans l'interface pour ne pas casser les appelants (GameTableArea), mais plus affiché — voir en-tête du fichier. */
  avatar: string
  capital: number
  cardsLeft: number
  isActive: boolean
  isBanked: boolean
  /** A posé la carte qui a fixé la couleur demandée du pli en cours. */
  isLeader: boolean
  isEliminated: boolean
  /** Masque la bulle nom/capital (voir bouton de compaction dans GameTableHud). */
  compactMode?: boolean
  playedCards: GameCard[]
  playedCardsHighlightLast: boolean
  stackSize: 'sm' | 'md'
}

export function OpponentPanel({
  position,
  name,
  capital,
  cardsLeft,
  isActive,
  isBanked,
  isLeader,
  isEliminated,
  compactMode = false,
  playedCards,
  playedCardsHighlightLast,
  stackSize,
}: OpponentPanelProps) {
  const isVertical = position !== 'top'

  if (isEliminated) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          opacity: 0.3,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 14,
            border: '1.5px dashed rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}
        >
          💀
        </div>
        <span style={{ color: '#5b636b', fontSize: 9, fontFamily: 'Plus Jakarta Sans' }}>Éliminé</span>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        // Toujours en colonne : sur les côtés (colonne étroite réservée),
        // un empilement horizontal [avatar + main + pile] déborderait.
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {/* Badges de statut (le tour actif est déjà signalé par le badge "JOUE..." plus bas — plus besoin d'un avatar pour ça) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 5,
          flexShrink: 0,
        }}
      >
        {!compactMode && (
          <div
            style={{
              background: 'rgba(11,13,16,0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 9,
              padding: '3px 8px',
              textAlign: 'center',
            }}
          >
            <p className="font-display" style={{ color: '#fff', fontSize: 11, fontWeight: 700, margin: 0 }}>
              {name}
            </p>
            <p style={{ color: '#D6A84F', fontSize: 10, margin: 0, fontWeight: 600 }}>
              {capital.toLocaleString('fr-FR')} · {cardsLeft}c
            </p>
          </div>
        )}

        {isBanked ? (
          <Badge color="#A9B0B7" bg="rgba(255,255,255,0.06)" border="rgba(255,255,255,0.15)">
            🏦 BANQUE
          </Badge>
        ) : isActive ? (
          <Badge color="#F0D58A" bg="rgba(214,168,79,0.15)" border="rgba(214,168,79,0.4)" pulse>
            JOUE...
          </Badge>
        ) : (
          isLeader && (
            <Badge color="#4CAF76" bg="rgba(76,175,118,0.12)" border="rgba(76,175,118,0.4)">
              🧭 A LA MAIN
            </Badge>
          )
        )}
      </div>

      {/* Main face cachée (cartes restantes) */}
      <div
        style={{
          display: 'flex',
          gap: 3,
          flexDirection: position === 'top' ? 'row' : 'column',
          flexShrink: 0,
        }}
      >
        {Array.from({ length: cardsLeft }).map((_, i) => (
          <PlayingCard
            key={i}
            suit="♠"
            value="A"
            state="back"
            size="xs"
            rotated={isVertical}
            style={position === 'top' ? { transform: `rotate(${(i - 1.5) * 3}deg)` } : { marginTop: i > 0 ? -20 : 0 }}
          />
        ))}
      </div>

      {/* Cartes jouées ce round */}
      <PlayedCardsStack
        cards={playedCards}
        orientation={position === 'top' ? 'horizontal' : 'vertical'}
        size={stackSize}
        highlightLast={playedCardsHighlightLast}
        showLeadIndicator={isLeader}
      />
    </div>
  )
}

function Badge({
  color,
  bg,
  border,
  pulse,
  children,
}: {
  color: string
  bg: string
  border: string
  pulse?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 7,
        padding: '2px 8px',
        animation: pulse ? 'turnPulse 1s ease-in-out infinite' : undefined,
      }}
    >
      <span style={{ color, fontSize: 9, fontFamily: 'Plus Jakarta Sans', fontWeight: 700, letterSpacing: '0.05em' }}>
        {children}
      </span>
    </div>
  )
}
