import { memo } from 'react'
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

const SUIT_NAME: Record<Suit, string> = {
  '♥': 'Cœur',
  '♦': 'Carreau',
  '♣': 'Trèfle',
  '♠': 'Pique',
}

const SIZE = {
  xs: { width: 29, height: 41, fontSize: 9, centerSize: 16 },
  sm: { width: 43, height: 61, fontSize: 12, centerSize: 22 },
  md: { width: 65, height: 92, fontSize: 16, centerSize: 32 },
  lg: { width: 86, height: 122, fontSize: 20, centerSize: 43 },
}

function PlayingCard({
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
        aria-hidden="true"
        style={{
          width: s.width,
          height: s.height,
          transform: rotated ? 'rotate(90deg)' : undefined,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
        pointerEvents: isInteractive ? undefined : 'none',
        ...style,
      }}
      onClick={isInteractive ? onClick : undefined}
      role={isInteractive ? 'button' : undefined}
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
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'4\' height=\'4\'%3E%3Ccircle cx=\'1\' cy=\'1\' r=\'0.4\' fill=\'rgba(0,0,0,0.04)\'/%3E%3C/svg%3E")',
        borderRadius: 10,
        pointerEvents: 'none',
      }} />

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

export default memo(PlayingCard)
