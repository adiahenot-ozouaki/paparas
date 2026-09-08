import PlayingCard from "../PlayingCard"
import type { Card as GameCard } from '../../types'

// Dimensions alignées sur les tailles réelles de PlayingCard (après
// réduction de 10%) pour que le calcul d'empilement reste cohérent.
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
  /** 'md' en mode compact (bulles nom/gains masquées) pour profiter de l'espace libéré. */
  size?: 'sm' | 'md'
  /** Petit curseur sur la carte la plus récente : c'est elle qui a fixé la couleur demandée de ce pli. */
  showLeadIndicator?: boolean
}) {
  const { width, height, offset: OFFSET } = DIMENSIONS[size]

  if (cards.length === 0) {
    return (
      <div
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

  const isHorizontal = orientation === 'horizontal'

  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        width: isHorizontal ? width + (cards.length - 1) * OFFSET : width,
        height: isHorizontal ? height : height + (cards.length - 1) * OFFSET,
      }}
    >
      {cards.map((card, i) => {
        const isLast = i === cards.length - 1
        return (
          <div
            key={i}
            className={isLast ? 'anim-deal-in' : undefined}
            style={{
              position: 'absolute',
              top: isHorizontal ? 0 : i * OFFSET,
              left: isHorizontal ? i * OFFSET : 0,
              zIndex: i,
              opacity: isLast ? 1 : 0.85,
              filter: isLast ? 'none' : 'brightness(0.85)',
            }}
          >
            <PlayingCard
              suit={card.suit}
              value={card.value}
              state={isLast && highlightLast ? 'winner' : 'played'}
              size={size}
            />
            {isLast && showLeadIndicator && (
              <div
                title="A fixé la couleur demandée de ce pli"
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
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
