import { memo, useEffect, useState, type ReactNode } from 'react'
import PlayingCard from './PlayingCard'
import { PlayedCardsStack } from './game/PlayedCardsStack'
import type { Card as GameCard } from '../types'
import { Skull, Landmark, Compass } from 'lucide-react'

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
  dealId?: number
}

function OpponentPanel({
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
  dealId = 0,
}: OpponentPanelProps) {
  const isVertical = position !== 'top'
  const [isDealing, setIsDealing] = useState(false)

  useEffect(() => {
    if (cardsLeft <= 0) {
      setIsDealing(false)
      return
    }
    setIsDealing(true)
    const ms = 380 + cardsLeft * 50
    const t = window.setTimeout(() => setIsDealing(false), ms)
    return () => window.clearTimeout(t)
  }, [dealId, cardsLeft])

  if (isEliminated) {
    return (
      <div className="opp-panel opp-panel--out">
        <div className="opp-out-icon">
          <Skull size={28} className="kora-icon" aria-hidden />
        </div>
        <span className="opp-out-label">Éliminé</span>
      </div>
    )
  }

  return (
    <div className={`opp-panel${isActive ? ' is-active' : ''}`}>
      <div className="opp-panel-meta">
        {!compactMode && (
          <div className={`opp-info${isActive ? ' is-active' : ''}`}>
            <p className="font-display opp-name">{name}</p>
            <p className="opp-stats">
              {capital.toLocaleString('fr-FR')} · {cardsLeft}c
            </p>
          </div>
        )}

        {isBanked ? (
          <Badge tone="muted">
            <Landmark size={12} className="kora-icon" aria-hidden /> BANQUE
          </Badge>
        ) : isActive ? (
          <Badge tone="gold" pulse>
            JOUE...
          </Badge>
        ) : (
          isLeader && (
            <Badge tone="green">
              <Compass size={12} className="kora-icon" aria-hidden /> À LA MAIN
            </Badge>
          )
        )}
      </div>

      <div className={`opp-backs opp-backs--${position}${isDealing ? ' is-dealing' : ''}`}>
        {Array.from({ length: cardsLeft }).map((_, i) => (
          <div
            key={`${dealId}-${i}`}
            className={isDealing ? 'opp-deal-card is-dealing' : 'opp-deal-card'}
            style={{ ['--deal-i' as string]: i }}
          >
            <PlayingCard suit="♠" value="A" state="back" size="xs" rotated={isVertical} />
          </div>
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
  tone,
  pulse,
  children,
}: {
  tone: 'gold' | 'green' | 'muted'
  pulse?: boolean
  children: ReactNode
}) {
  return (
    <div className={`opp-badge opp-badge--${tone}${pulse ? ' is-pulse' : ''`}>
      <span>{children}</span>
    </div>
  )
}

export default memo(OpponentPanel)
export { OpponentPanel }
