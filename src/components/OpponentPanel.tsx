import { motion, useReducedMotion } from 'framer-motion'
import PlayingCard from './PlayingCard'
import { PlayedCardsStack } from './game/PlayedCardsStack'
import type { Card as GameCard } from '../types'
import type { ReactNode } from 'react'
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
  const reduceMotion = useReducedMotion()
  const isVertical = position !== 'top'

  if (isEliminated) {
    return (
      <motion.div
        className="opp-panel opp-panel--out"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 0.3, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="opp-out-icon">
          <Skull size={28} className="kora-icon" aria-hidden />
        </div>
        <span className="opp-out-label">Éliminé</span>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`opp-panel${isActive ? ' is-active' : ''}`}
      animate={
        reduceMotion
          ? undefined
          : isActive
            ? { scale: 1.03, filter: 'drop-shadow(0 0 14px rgba(214, 168, 79, 0.4))' }
            : { scale: 1, filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' }
      }
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
    >
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

      <div className={`opp-backs opp-backs--${position}`}>
        {Array.from({ length: cardsLeft }).map((_, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={
              reduceMotion
                ? undefined
                : isActive
                  ? { y: isVertical ? 0 : -2, rotate: isVertical ? 0 : (i - cardsLeft / 2) * 2.2 }
                  : { y: 0, rotate: 0 }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.02 }}
            style={{
              display: 'inline-flex',
              marginTop: isVertical && i > 0 ? -20 : 0,
            }}
          >
            <PlayingCard
              suit="♠"
              value="A"
              state="back"
              size="xs"
              rotated={isVertical}
              style={
                position === 'top'
                  ? { transform: `rotate(${(i - Math.max(cardsLeft - 1, 1) / 2) * 3}deg)` }
                  : undefined
              }
            />
          </motion.div>
        ))}
      </div>

      <PlayedCardsStack
        cards={playedCards}
        orientation={position === 'top' ? 'horizontal' : 'vertical'}
        size={stackSize}
        highlightLast={playedCardsHighlightLast}
        showLeadIndicator={isLeader}
      />
    </motion.div>
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
    <div className={`opp-badge opp-badge--${tone}${pulse ? ' is-pulse' : ''}`}>
      <span>{children}</span>
    </div>
  )
}
