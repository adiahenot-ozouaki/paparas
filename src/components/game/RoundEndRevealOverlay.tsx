import { useState } from 'react'
import PlayingCard from '../PlayingCard'
import type { Card } from '../../types'
import type { RoundState } from '../../game/round'
import { COMBO_LABEL, countTrailingThrees } from '../../game/combo'
import { SEAT_NAMES } from '../../game/GameContext'

// ==========================================================================
// Fin de round « normale » (plis + éventuelle victoire réclamée).
// Même esprit que SpecialWinOverlay : mains révélées → gains → continuer.
// ==========================================================================

type Phase = 'handsReveal' | 'payout'

interface RoundEndRevealOverlayProps {
  outcome: Extract<NonNullable<RoundState['outcome']>, { kind: 'normal' }>
  hands: Card[][]
  playLog: Card[][]
  onContinue: () => void
}

export function RoundEndRevealOverlay({
  outcome,
  hands,
  playLog,
  onContinue,
}: RoundEndRevealOverlayProps) {
  const [phase, setPhase] = useState<Phase>('handsReveal')
  const winnerIndex = outcome.roundWinnerIndex
  const comboLabel = COMBO_LABEL[outcome.combo]
  const payoutLines = [...outcome.payout.winners, ...outcome.payout.losers].sort(
    (a, b) => a.playerIndex - b.playerIndex,
  )

  const winnerSequence = playLog[winnerIndex] ?? []
  const trailingCount = countTrailingThrees(winnerSequence)
  const trailingCards =
    trailingCount > 0 ? winnerSequence.slice(winnerSequence.length - trailingCount) : []

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(11,13,16,0.95)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          width: 280,
          height: 280,
          transform: 'translate(-50%, -50%)',
          backgroundImage:
            'conic-gradient(from 0deg, transparent, rgba(214,168,79,0.08) 20deg, transparent 40deg)',
          animation: 'victoryRays 7s linear infinite',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      {phase === 'handsReveal' && (
        <div className="anim-fade-in" style={{ width: '100%', maxWidth: 360, position: 'relative' }}>
          <p
            style={{
              color: '#A9B0B7',
              fontSize: 11,
              fontFamily: 'Plus Jakarta Sans',
              letterSpacing: '0.1em',
              textAlign: 'center',
              margin: '0 0 6px',
            }}
          >
            MAINS RÉVÉLÉES
          </p>
          <p
            className="text-gold font-display"
            style={{
              textAlign: 'center',
              fontSize: 16,
              fontWeight: 700,
              margin: '0 0 14px',
            }}
          >
            {SEAT_NAMES[winnerIndex]} — {comboLabel}
            {outcome.wonByClaim ? ' · 👑' : ''}
          </p>

          {trailingCards.length > 0 && (
            <div style={{ marginBottom: 14, textAlign: 'center' }}>
              <p style={{ color: '#A9B0B7', fontSize: 11, margin: '0 0 8px' }}>
                Séquence gagnante (fin de manche)
              </p>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                {trailingCards.map((c, i) => (
                  <PlayingCard
                    key={i}
                    suit={c.suit}
                    value={c.value}
                    state="winner"
                    size="sm"
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {SEAT_NAMES.map((name, i) => {
              const isWinner = i === winnerIndex
              const remaining = hands[i] ?? []
              return (
                <div
                  key={name}
                  className="anim-fade-in-up"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    animationDelay: `${i * 0.08}s`,
                    background: isWinner ? 'rgba(214,168,79,0.08)' : 'rgba(255,255,255,0.03)',
                    border: isWinner
                      ? '1px solid rgba(214,168,79,0.35)'
                      : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12,
                    padding: '8px 10px',
                  }}
                >
                  <span
                    className="font-display"
                    style={{
                      width: 56,
                      fontSize: 12,
                      flexShrink: 0,
                      color: isWinner ? '#D6A84F' : '#A9B0B7',
                      fontWeight: isWinner ? 700 : 500,
                    }}
                  >
                    {name}
                  </span>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {remaining.length === 0 ? (
                      <span style={{ color: '#5b636b', fontSize: 11 }}>Main vide</span>
                    ) : (
                      remaining.map((card, ci) => (
                        <PlayingCard
                          key={ci}
                          suit={card.suit}
                          value={card.value}
                          state={isWinner ? 'winner' : 'default'}
                          size="xs"
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            className="btn-primary glow-gold"
            onClick={() => setPhase('payout')}
            style={{
              marginTop: 20,
              width: '100%',
              padding: '14px',
              fontSize: 13,
              borderRadius: 14,
              letterSpacing: '0.08em',
            }}
          >
            VOIR LES GAINS →
          </button>
        </div>
      )}

      {phase === 'payout' && (
        <div className="anim-fade-in-up" style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
          <p
            className="text-gold font-display"
            style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', letterSpacing: '0.04em' }}
          >
            {SEAT_NAMES[winnerIndex]} remporte le round
          </p>
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              overflow: 'hidden',
              marginBottom: 20,
            }}
          >
            {payoutLines.map((p, i) => (
              <div
                key={p.playerIndex}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom:
                    i < payoutLines.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                <span style={{ color: '#fff', fontSize: 14 }}>
                  {SEAT_NAMES[p.playerIndex]}
                  {outcome.bankedPlayerIndexes.includes(p.playerIndex) ? ' 🏦' : ''}
                </span>
                <span
                  className="font-display"
                  style={{
                    color: p.amount > 0 ? '#4CAF76' : '#C94B4B',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {p.amount > 0 ? '+' : ''}
                  {p.amount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            ))}
          </div>
          <button
            className="btn-primary glow-gold"
            onClick={onContinue}
            style={{
              padding: '14px 40px',
              fontSize: 14,
              borderRadius: 14,
              letterSpacing: '0.1em',
              width: '100%',
            }}
          >
            CONTINUER →
          </button>
        </div>
      )}
    </div>
  )
}
