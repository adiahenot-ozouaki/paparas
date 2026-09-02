import type { Suit, CardValue, CardState } from '../types'

interface PlayingCardProps {
  suit?: Suit
  value?: CardValue
  state?: CardState
  size?: 'xs' | 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
  onClick?: () => void
  rotated?: boolean
}

const SUIT_COLOR: Record<Suit, string> = {
  '♥': '#C94B4B',
  '♦': '#C94B4B',
  '♣': '#1a1a1a',
  '♠': '#1a1a1a',
}

/** Nom complet de la couleur, pour les lecteurs d'écran (le symbole seul n'est pas annoncé de façon fiable). */
const SUIT_NAME: Record<Suit, string> = {
  '♥': 'Cœur',
  '♦': 'Carreau',
  '♣': 'Trèfle',
  '♠': 'Pique',
}

// Tailles réduites de 10% par rapport à l'original (retour utilisateur :
// "les cartes sont grandes, diminue d'un dixième la taille").
const SIZE = {
  xs: { width: 29, height: 41, fontSize: 9, centerSize: 16 },
  sm: { width: 43, height: 61, fontSize: 12, centerSize: 22 },
  md: { width: 65, height: 92, fontSize: 16, centerSize: 32 },
  lg: { width: 86, height: 122, fontSize: 20, centerSize: 43 },
}

export default function PlayingCard({
  suit = '♥',
  value = 'A',
  state = 'default',
  size = 'md',
  style,
  onClick,
  rotated = false,
}: PlayingCardProps) {
  const s = SIZE[size]
  const color = SUIT_COLOR[suit]
  const cardLabel = `${value} de ${SUIT_NAME[suit]}`

  if (state === 'back') {
    return (
      <div
        className="card-back pattern-african"
        // Carte face cachée : purement décorative — le compte de cartes
        // est annoncé ailleurs. Pas de tabIndex : évite focus + aria-hidden.
        aria-hidden="true"
        style={{
          width: s.width,
          height: s.height,
          transform: rotated ? 'rotate(90deg)' : undefined,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Les clics passent au parent (OpponentPanel, etc.) si besoin.
          pointerEvents: onClick ? undefined : 'none',
          ...style,
        }}
        onClick={onClick}
      >
        <div style={{
          width: '78%',
          height: '78%',
          border: '1.5px solid rgba(214,168,79,0.35)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: s.centerSize * 0.55, opacity: 0.6, color: '#D6A84F' }}>G</span>
        </div>
      </div>
    )
  }

  const isSelected = state === 'selected'
  const isDisabled = state === 'disabled'
  const isWinner = state === 'winner'
  // Interactive UNIQUEMENT si un onClick est fourni directement sur ce
  // composant (PlayerHand gère l'interaction sur un wrapper parent).
  const isInteractive = !!onClick && !isDisabled

  return (
    <div
      className={[
        'card-base',
        state === 'playable' ? 'card-playable' : '',
        isSelected ? 'card-selected' : '',
        isDisabled ? 'card-disabled' : '',
        isWinner ? 'card-winner' : '',
      ].join(' ')}
      style={{
        width: s.width,
        height: s.height,
        transform: rotated ? 'rotate(90deg)' : undefined,
        flexShrink: 0,
        // Décoratif : ne prend jamais le focus (le wrapper parent est le bouton).
        // Évite l'avertissement « aria-hidden on focused element ».
        pointerEvents: isInteractive ? undefined : 'none',
        ...style,
      }}
      onClick={isInteractive ? onClick : undefined}
      role={isInteractive ? 'button' : undefined}
      // Pas de tabIndex={-1} : un élément avec tabIndex peut encore recevoir
      // le focus programmatique / au clic, ce qui entre en conflit avec aria-hidden.
      tabIndex={isInteractive ? 0 : undefined}
      aria-hidden={isInteractive ? undefined : true}
      aria-label={isInteractive ? cardLabel : undefined}
      aria-disabled={onClick && isDisabled ? true : undefined}
      onKeyDown={
        isInteractive
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
    >
      {/* Paper micro texture */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'4\' height=\'4\'%3E%3Ccircle cx=\'1\' cy=\'1\' r=\'0.4\' fill=\'rgba(0,0,0,0.04)\'/%3E%3C/svg%3E")',
        borderRadius: 10,
        pointerEvents: 'none',
      }} />

      {/* Top-left */}
      <div style={{
        position: 'absolute',
        top: 5,
        left: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        lineHeight: 1,
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: s.fontSize, fontWeight: 800, color, fontFamily: 'Plus Jakarta Sans', lineHeight: 1 }}>
          {value}
        </span>
        <span style={{ fontSize: s.fontSize * 0.85, color, lineHeight: 1 }}>{suit}</span>
      </div>

      {/* Center suit */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: s.centerSize, color, opacity: 0.85 }}>{suit}</span>
      </div>

      {/* Bottom-right (rotated 180) */}
      <div style={{
        position: 'absolute',
        bottom: 5,
        right: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        lineHeight: 1,
        transform: 'rotate(180deg)',
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: s.fontSize, fontWeight: 800, color, fontFamily: 'Plus Jakarta Sans', lineHeight: 1 }}>
          {value}
        </span>
        <span style={{ fontSize: s.fontSize * 0.85, color, lineHeight: 1 }}>{suit}</span>
      </div>

      {/* Winner shimmer overlay */}
      {isWinner && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(240,213,138,0.25) 0%, transparent 60%)',
          borderRadius: 10,
          pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}
