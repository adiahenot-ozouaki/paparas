import { memo, type CSSProperties, type KeyboardEvent } from 'react'
import type { Suit, CardValue, CardState } from '../types'

interface PlayingCardProps {
  suit?: Suit
  value?: CardValue
  state?: CardState
  size?: 'xs' | 'sm' | 'md' | 'lg'
  style?: CSSProperties
  onClick?: () => void
  rotated?: boolean
}

const SUIT_NAME: Record<Suit, string> = {
  '♥': 'Cœur',
  '♦': 'Carreau',
  '♣': 'Trèfle',
  '♠': 'Pique',
}

const RED: ReadonlySet<Suit> = new Set(['♥', '♦'])

function PlayingCard({
  suit = '♥',
  value = 'A',
  state = 'default',
  size = 'md',
  style,
  onClick,
  rotated = false,
}: PlayingCardProps) {
  if (state === 'back') {
    return (
      <div
        className={`card-back card-sz-${size}${rotated ? ' is-rotated' : ''}`}
        aria-hidden
        style={style}
        onClick={onClick}
      >
        <span className="card-back-mark">G</span>
      </div>
    )
  }

  const isDisabled = state === 'disabled'
  const isInteractive = !!onClick && !isDisabled
  const ink = RED.has(suit) ? 'is-red' : 'is-black'
  const className = [
    'card-base',
    `card-sz-${size}`,
    ink,
    state !== 'default' ? `card-${state}` : '',
    rotated ? 'is-rotated' : '',
    isInteractive ? 'is-interactive' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const label = `${value} de ${SUIT_NAME[suit]}`

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!isInteractive) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <div
      className={className}
      style={style}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={isInteractive ? onKeyDown : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-hidden={isInteractive ? undefined : true}
      aria-label={isInteractive ? label : undefined}
      aria-disabled={onClick && isDisabled ? true : undefined}
    >
      <span className="card-corner card-corner--tl">
        <span className="card-rank">{value}</span>
        <span className="card-suit">{suit}</span>
      </span>
      <span className="card-suit-center" aria-hidden>
        {suit}
      </span>
      <span className="card-corner card-corner--br" aria-hidden>
        <span className="card-rank">{value}</span>
        <span className="card-suit">{suit}</span>
      </span>
      {state === 'winner' && <span className="card-winner-sheen" aria-hidden />}
    </div>
  )
}

function sameProps(a: PlayingCardProps, b: PlayingCardProps) {
  return (
    a.suit === b.suit &&
    a.value === b.value &&
    a.state === b.state &&
    a.size === b.size &&
    a.rotated === b.rotated &&
    a.onClick === b.onClick &&
    a.style === b.style
  )
}

export default memo(PlayingCard, sameProps)
