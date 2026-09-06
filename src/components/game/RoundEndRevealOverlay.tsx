import { useState } from 'react'
import PlayingCard from '../PlayingCard'
import type { Card } from '../../types'
import type { RoundState } from '../../game/round'
import { COMBO_LABEL, countTrailingThrees } from '../../game/combo'
import { SEAT_NAMES } from '../../game/GameContext'

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

  const winnerCause = outcome.wonByClaim
    ? `👑 Victoire réclamée · ${comboLabel}`
    : `Combo ${comboLabel}`

  return (
    <div className="reveal-overlay">
      <div className="reveal-rays reveal-rays--gold" aria-hidden />

      {phase === 'handsReveal' && (
        <div className="anim-fade-in reveal-hands reveal-hands--wide">
          <p className="reveal-kicker reveal-kicker--center" style={{ marginBottom: 6 }}>
            CARTES DU ROUND
          </p>
          <p className="text-gold font-display reveal-hands-winner">
            {SEAT_NAMES[winnerIndex]} — {comboLabel}
            {outcome.wonByClaim ? ' · 👑' : ''}
          </p>

          <div className="reveal-hands-list">
            {SEAT_NAMES.map((name, i) => {
              const isWinner = i === winnerIndex
              const isBanked = outcome.bankedPlayerIndexes.includes(i)
              const played = playLog[i] ?? []
              const remaining = hands[i] ?? []
              const lineCards: { card: Card; fromHand: boolean; index: number }[] = [
                ...played.map((card, index) => ({ card, fromHand: false, index })),
                ...remaining.map((card, index) => ({ card, fromHand: true, index })),
              ]

              return (
                <div
                  key={name}
                  className={`anim-fade-in-up reveal-hand-row${isWinner ? ' is-winner-gold' : ''}`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div
                    className="reveal-line-head"
                    style={{ marginBottom: lineCards.length > 0 || isWinner ? 8 : 0 }}
                  >
                    <span
                      className={`font-display reveal-hand-name${isWinner ? ' is-gold' : ''}`}
                      style={
                        !isWinner
                          ? { color: '#fff', fontWeight: 600, width: 'auto', fontSize: 13 }
                          : undefined
                      }
                    >
                      {name}
                    </span>
                    {isBanked && <span className="reveal-bank-icon">🏦</span>}
                    {isWinner && (
                      <span className={`reveal-cause${outcome.wonByClaim ? ' is-claim' : ''}`}>
                        {winnerCause}
                      </span>
                    )}
                  </div>

                  {lineCards.length > 0 ? (
                    <div className="reveal-line-cards">
                      {played.length > 0 && remaining.length > 0 && (
                        <span className="reveal-seg-label">TAPIS</span>
                      )}
                      {played.map((card, ci) => {
                        const isTrailing =
                          isWinner && trailingCount > 0 && ci >= played.length - trailingCount
                        return (
                          <PlayingCard
                            key={`p-${ci}`}
                            suit={card.suit}
                            value={card.value}
                            state={isTrailing ? 'winner' : 'default'}
                            size="xs"
                          />
                        )
                      })}
                      {played.length > 0 && remaining.length > 0 && (
                        <span className="reveal-seg-sep" />
                      )}
                      {remaining.length > 0 && played.length > 0 && (
                        <span className="reveal-seg-label">MAIN</span>
                      )}
                      {remaining.map((card, ci) => (
                        <PlayingCard
                          key={`h-${ci}`}
                          suit={card.suit}
                          value={card.value}
                          state="default"
                          size="xs"
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="reveal-empty">Aucune carte</span>
                  )}
                </div>
              )
            })}
          </div>

          <button
            className="btn-primary glow-gold reveal-cta"
            onClick={() => setPhase('payout')}
            style={{ width: '100%' }}
          >
            VOIR LES GAINS →
          </button>
        </div>
      )}

      {phase === 'payout' && (
        <div className="anim-fade-in-up reveal-payout">
          <p className="text-gold font-display reveal-payout-title">
            {SEAT_NAMES[winnerIndex]} remporte le round
          </p>
          <div className="reveal-payout-list">
            {payoutLines.map((p, i) => (
              <div
                key={p.playerIndex}
                className={`reveal-payout-row${i < payoutLines.length - 1 ? ' has-border' : ''}`}
              >
                <span className="reveal-payout-name">
                  {SEAT_NAMES[p.playerIndex]}
                  {outcome.bankedPlayerIndexes.includes(p.playerIndex) ? ' 🏦' : ''}
                </span>
                <span
                  className={`font-display reveal-payout-amt ${p.amount > 0 ? 'is-gain' : 'is-loss'}`}
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
