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
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: 12,
        zIndex: 20,
      }}
    >
      {!compactMode && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
            background: 'rgba(11,13,16,0.8)',
            backdropFilter: 'blur(8px)',
            borderRadius: 14,
            padding: '8px 14px',
            border: `1.5px solid ${
              isHumanTurn ? 'rgba(214,168,79,0.5)' : 'rgba(255,255,255,0.08)'
            }`,
            boxShadow: isHumanTurn ? '0 0 20px rgba(214,168,79,0.2)' : 'none',
          }}
        >
          <div>
            <p
              className="font-display"
              style={{
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Vous{' '}
              {humanIsBanked && (
                <span style={{ color: '#A9B0B7', fontWeight: 500 }}>(en banque)</span>
              )}
            </p>

            <p
              style={{
                color: '#D6A84F',
                fontSize: 11,
                margin: 0,
                fontWeight: 600,
              }}
            >
              {players[HUMAN_INDEX].capital.toLocaleString('fr-FR')} FCFA · {hand.length} cartes
            </p>
          </div>
        </div>
      )}

      {humanIsBanked && (
        <div
          style={{
            position: 'absolute',
            bottom: 110,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.06)',
            border: '1.5px solid rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: '6px 20px',
            whiteSpace: 'nowrap',
            zIndex: 20,
          }}
        >
          <span
            style={{
              color: '#A9B0B7',
              fontSize: 12,
              fontFamily: 'Plus Jakarta Sans',
              letterSpacing: '0.06em',
            }}
          >
            🏦 Vous êtes en banque — vous ne jouez plus ce round
          </span>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          position: 'relative',
          height: compactMode ? 150 : 115,
          width: '100%',
          touchAction: 'none',
        }}
      >
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
              key={`${card.suit}-${card.value}-${index}`}
              role="button"
              tabIndex={playable ? 0 : -1}
              aria-label={`${card.value} de ${SUIT_NAME[card.suit]}${playable ? '' : ' — non jouable'}`}
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
              style={{
                position: 'absolute',
                left: `calc(50% + ${translateX}px - 36px)`,
                bottom: isSelected ? 28 : playable ? 12 : 6,
                transform: `translate(${dragDx}px, ${dragDy}px) rotate(${isDragging ? 0 : rotate}deg) translateY(${isDragging ? 0 : translateY}px) scale(${liftedByDrag ? 1.08 : playable && !isSelected ? 1.02 : 1})`,
                transition: isDragging
                  ? 'none'
                  : 'bottom 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                zIndex: isDragging ? 30 : isSelected ? 20 : index + 1,
                cursor: playable ? 'grab' : 'default',
                filter: liftedByDrag
                  ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))'
                  : playable
                    ? 'drop-shadow(0 4px 10px rgba(214,168,79,0.25))'
                    : undefined,
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

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          marginTop: 8,
        }}
      >
        {selectedCardIndex !== null && isHumanTurn && (
          <button
            className="btn-primary glow-gold anim-scale-bounce"
            onClick={onPlayCard}
            style={{
              padding: '12px 32px',
              fontSize: 14,
              borderRadius: 14,
              letterSpacing: '0.1em',
            }}
          >
            JOUER CETTE CARTE
          </button>
        )}

        {isHumanTurn && selectedCardIndex === null && !canClaim && (
          <p
            style={{
              color: '#A9B0B7',
              fontSize: 11,
              margin: 0,
              letterSpacing: '0.04em',
              opacity: 0.85,
            }}
          >
            Tape une carte · double-tape ou glisse vers le haut pour jouer
          </p>
        )}

        {canClaim && (
          <button
            className="btn-primary anim-scale-bounce"
            onClick={onClaimVictory}
            style={{
              padding: '10px 24px',
              fontSize: 12,
              borderRadius: 12,
              letterSpacing: '0.06em',
              background: 'linear-gradient(135deg, #9B59B6, #6f3d82)',
              boxShadow: '0 4px 16px rgba(155,89,182,0.4)',
            }}
          >
            👑 RÉCLAMER LA VICTOIRE
          </button>
        )}
      </div>
    </div>
  )
}
