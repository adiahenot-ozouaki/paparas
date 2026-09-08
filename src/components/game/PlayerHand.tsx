import { useRef, useState } from 'react'
import type { Card as GameCard } from '../../types'
import { HUMAN_INDEX } from '../../game/GameContext'
import PlayingCard from '../PlayingCard'

interface Player {
  capital: number
}

interface PlayerHandProps {
  players: Player[]
  hand: GameCard[]
  isHumanTurn: boolean
  humanIsBanked: boolean
  isLeader: boolean
  selectedCardIndex: number | null
  canClaim: boolean
  isCardPlayable: (card: GameCard) => boolean
  isPlaying: boolean
  compactMode: boolean
  onCardSelect: (index: number) => void
  onAttemptPlay: (index: number) => void
  onPlayCard: () => void
  onClaimVictory: () => void
}

const DOUBLE_TAP_DELAY = 350
const DRAG_PLAY_THRESHOLD = 64
const DRAG_MOVE_THRESHOLD = 8

const SUIT_NAME: Record<GameCard['suit'], string> = {
  '♥': 'Cœur',
  '♦': 'Carreau',
  '♣': 'Trèfle',
  '♠': 'Pique',
}

interface DragInfo {
  index: number
  dx: number
  dy: number
}

export function PlayerHand({
  players,
  hand,
  isHumanTurn,
  humanIsBanked,
  selectedCardIndex,
  canClaim,
  isCardPlayable,
  compactMode,
  onCardSelect,
  onAttemptPlay,
  onPlayCard,
  onClaimVictory,
}: PlayerHandProps) {
  const lastTapRef = useRef<{ index: number; time: number } | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const [drag, setDrag] = useState<DragInfo | null>(null)
  const handCardSize = compactMode ? 'lg' : 'md'

  function handleTap(index: number) {
    const now = Date.now()
    const last = lastTapRef.current

    if (last && last.index === index && now - last.time < DOUBLE_TAP_DELAY) {
      lastTapRef.current = null
      onAttemptPlay(index)
      return
    }

    lastTapRef.current = { index, time: now }
    onCardSelect(index)
  }

  function handlePointerDown(index: number, playable: boolean, e: React.PointerEvent<HTMLDivElement>) {
    if (!playable) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    setDrag({ index, dx: 0, dy: 0 })
  }

  function handlePointerMove(index: number, e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current || !drag || drag.index !== index) return
    setDrag({
      index,
      dx: e.clientX - dragStartRef.current.x,
      dy: e.clientY - dragStartRef.current.y,
    })
  }

  function handlePointerUp(index: number) {
    const info = drag
    setDrag(null)
    dragStartRef.current = null
    if (!info || info.index !== index) return

    const distance = Math.hypot(info.dx, info.dy)
    if (distance < DRAG_MOVE_THRESHOLD) {
      handleTap(index)
      return
    }
    if (info.dy < -DRAG_PLAY_THRESHOLD) {
      onAttemptPlay(index)
    }
  }

  return (
    <div className="player-hand">
      {!compactMode && (
        <div className={'player-hand-info' + (isHumanTurn ? ' is-turn' : '')}>
          <div>
            <p className="font-display player-hand-you">
              Vous{' '}
              {humanIsBanked && <span className="player-hand-banked">(en banque)</span>}
            </p>
            <p className="player-hand-cap">
              {players[HUMAN_INDEX].capital.toLocaleString('fr-FR')} FCFA · {hand.length} cartes
            </p>
          </div>
        </div>
      )}

      {humanIsBanked && (
        <div className="player-hand-bank-banner">
          🏦 Vous êtes en banque — vous ne jouez plus ce round
        </div>
      )}

      <div className={'player-hand-fan' + (compactMode ? ' is-compact' : '')}>
        {hand.map((card, index) => {
          const total = hand.length
          const center = (total - 1) / 2
          const offset = index - center

          const rotate = offset * 6
          const translateX = offset * (compactMode ? 56 : 44)
          const translateY = Math.abs(offset) * 3

          const isSelected = selectedCardIndex === index
          const playable = isHumanTurn && isCardPlayable(card)
          const isDragging = drag?.index === index
          const cardState = isSelected ? 'selected' : playable ? 'playable' : 'disabled'

          const dragDx = isDragging ? drag!.dx : 0
          const dragDy = isDragging ? drag!.dy : 0
          const liftedByDrag = isDragging && drag!.dy < -20

          return (
            <div
              key={card.suit + '-' + card.value + '-' + index}
              role="button"
              tabIndex={playable ? 0 : -1}
              aria-label={card.value + ' de ' + SUIT_NAME[card.suit] + (playable ? '' : ' — non jouable')}
              aria-pressed={isSelected}
              aria-disabled={!playable}
              onPointerDown={e => handlePointerDown(index, playable, e)}
              onPointerMove={e => handlePointerMove(index, e)}
              onPointerUp={() => handlePointerUp(index)}
              onPointerCancel={() => {
                setDrag(null)
                dragStartRef.current = null
              }}
              onClick={() => {
                if (!playable && !isDragging) handleTap(index)
              }}
              onKeyDown={e => {
                if ((e.key === 'Enter' || e.key === ' ') && playable) {
                  e.preventDefault()
                  handleTap(index)
                }
              }}
              className={[
                'player-hand-card',
                playable ? 'is-playable' : '',
                isDragging ? 'is-dragging' : '',
                liftedByDrag ? 'is-lifted' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                left: 'calc(50% + ' + translateX + 'px - 36px)',
                bottom: isSelected ? 28 : playable ? 12 : 6,
                transform: 'translate(' + dragDx + 'px, ' + dragDy + 'px) rotate(' + (isDragging ? 0 : rotate) + 'deg) translateY(' + (isDragging ? 0 : translateY) + 'px) scale(' + (liftedByDrag ? 1.08 : playable && !isSelected ? 1.02 : 1) + ')',
                zIndex: isDragging ? 30 : isSelected ? 20 : index + 1,
              }}
            >
              <PlayingCard
                suit={card.suit}
                value={card.value}
                state={cardState}
                size={handCardSize}
              />
            </div>
          )
        })}
      </div>

      <div className="player-hand-actions">
        {selectedCardIndex !== null && isHumanTurn && (
          <button className="btn-primary glow-gold anim-scale-bounce player-hand-play-btn" onClick={onPlayCard}>
            JOUER CETTE CARTE
          </button>
        )}

        {isHumanTurn && selectedCardIndex === null && !canClaim && (
          <p className="player-hand-hint">
            Tape une carte · double-tape ou glisse vers le haut pour jouer
          </p>
        )}

        {canClaim && (
          <button className="btn-primary anim-scale-bounce player-hand-claim-btn" onClick={onClaimVictory}>
            👑 RÉCLAMER LA VICTOIRE
          </button>
        )}
      </div>
    </div>
  )
}
