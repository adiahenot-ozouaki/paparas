import PlayingCard from './PlayingCard'
import { PlayedCardsStack } from './game/PlayedCardsStack'
import type { Card as GameCard } from '../types'

interface OpponentPanelProps {
  position: 'top' | 'left' | 'right'
  name: string
  avatar: string
  capital: number
  cardsLeft: number
  isActive: boolean
  isBanked: boolean
  isLeader: boolean
  isEliminated: boolean
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
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        // Halo discret quand c'est le tour de cet adversaire
        filter: isActive ? 'drop-shadow(0 0 12px rgba(214,168,79,0.35))' : undefined,
        transition: 'filter 0.25s ease',
      }}
    >
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
              border: isActive
                ? '1px solid rgba(214,168,79,0.45)'
                : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 9,
              padding: '3px 8px',
              textAlign: 'center',
              boxShadow: isActive ? '0 0 14px rgba(214,168,79,0.2)' : undefined,
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
          <Badge color="#F0D58A" bg="rgba(214,168,79,0.22)" border="rgba(214,168,79,0.55)" pulse>
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
        padding: '3px 10px',
        animation: pulse ? 'turnPulse 1s ease-in-out infinite' : undefined,
        boxShadow: pulse ? '0 0 12px rgba(214,168,79,0.3)' : undefined,
      }}
    >
      <span style={{ color, fontSize: 9, fontFamily: 'Plus Jakarta Sans', fontWeight: 700, letterSpacing: '0.06em' }}>
        {children}
      </span>
    </div>
  )
}
