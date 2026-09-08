import { memo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import PlayingCard from '../PlayingCard'
import type { Card as GameCard } from '../../types'

const DIMENSIONS = {
  sm: { width: 43, height: 61, offset: 20 },
  md: { width: 65, height: 92, offset: 28 },
} as const

type Props = {
  cards: GameCard[]
  highlightLast: boolean
  orientation: 'horizontal' | 'vertical'
  size?: 'sm' | 'md'
  showLeadIndicator?: boolean
}

function PlayedCardsStack({
  cards,
  highlightLast,
  orientation,
  size = 'sm',
  showLeadIndicator = false,
}: Props) {
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
          const key = `${i}-${card.suit}-${card.value}`
          return (
            <motion.div
              key={key}
              className={`played-stack-card${isLast && highlightLast ? ' is-winner' : ''}${isLast ? '' : ' is-dim'}`}
              initial={
                reduceMotion || !isLast
                  ? false
                  : {
                      opacity: 0,
                      scale: 0.78,
                      y: isHorizontal ? -22 : -14,
                      rotate: isHorizontal ? -6 : 4,
                    }
              }
              animate={{
                opacity: 1,
                scale: isLast && highlightLast ? 1.04 : 1,
                y: 0,
                rotate: 0,
              }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : isLast
                    ? { type: 'spring', stiffness: 420, damping: 24, mass: 0.65 }
                    : { duration: 0.15 }
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
                <div className="played-stack-lead" title="A fixé la couleur demandée de ce pli" aria-hidden>
                  🧭
                </div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default memo(PlayedCardsStack)
export { PlayedCardsStack }
