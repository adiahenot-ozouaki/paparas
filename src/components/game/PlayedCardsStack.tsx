import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import PlayingCard from '../PlayingCard'
import type { Card as GameCard } from '../../types'

const DIMENSIONS = {
  sm: { width: 43, height: 61, offset: 20 },
  md: { width: 65, height: 92, offset: 28 },
} as const

export function PlayedCardsStack({
  cards,
  highlightLast,
  orientation,
  size = 'sm',
  showLeadIndicator = false,
}: {
  cards: GameCard[]
  highlightLast: boolean
  orientation: 'horizontal' | 'vertical'
  size?: 'sm' | 'md'
  showLeadIndicator?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const { width, height, offset: OFFSET } = DIMENSIONS[size]
  const isHorizontal = orientation === 'horizontal'

  if (cards.length === 0) {
    return (
      <div
        className="played-stack played-stack--empty"
        style={{
          width,
          height,
          borderRadius: 7,
          border: '1.5px dashed rgba(255,255,255,0.12)',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div
      className="played-stack"
      style={{
        position: 'relative',
        flexShrink: 0,
        width: isHorizontal ? width + (cards.length - 1) * OFFSET : width,
        height: isHorizontal ? height : height + (cards.length - 1) * OFFSET,
      }}
    >
      <AnimatePresence initial={false}>
        {cards.map((card, i) => {
          const isLast = i === cards.length - 1
          const key = `${card.suit}-${card.value}-${i}`
          return (
            <motion.div
              key={key}
              className="played-stack-card"
              initial={
                reduceMotion
                  ? false
                  : isLast
                    ? {
                        opacity: 0,
                        scale: 0.72,
                        y: isHorizontal ? -28 : -18,
                        x: isHorizontal ? 12 : 0,
                        rotate: isHorizontal ? -8 : 6,
                      }
                    : false
              }
              animate={{
                opacity: isLast ? 1 : 0.88,
                scale: isLast && highlightLast ? 1.04 : 1,
                y: 0,
                x: 0,
                rotate: 0,
                filter: isLast ? 'brightness(1)' : 'brightness(0.88)',
              }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.85, y: -12, transition: { duration: 0.18 } }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : isLast
                    ? { type: 'spring', stiffness: 420, damping: 22, mass: 0.7 }
                    : { duration: 0.2 }
              }
              style={{
                position: 'absolute',
                top: isHorizontal ? 0 : i * OFFSET,
                left: isHorizontal ? i * OFFSET : 0,
                zIndex: i + 1,
              }}
            >
              <PlayingCard
                suit={card.suit}
                value={card.value}
                state={isLast && highlightLast ? 'winner' : 'played'}
                size={size}
              />
              {isLast && showLeadIndicator && (
                <motion.div
                  className="played-stack-lead"
                  title="A fixé la couleur demandée de ce pli"
                  initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.05 }}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 15,
                    height: 15,
                    borderRadius: '50%',
                    background: '#4CAF76',
                    border: '1.5px solid #0B0D10',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    boxShadow: '0 0 6px rgba(76,175,118,0.7)',
                  }}
                >
                  🧭
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
