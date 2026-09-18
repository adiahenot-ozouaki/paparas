import { useEffect, useState } from 'react'
import PlayingCard from '../PlayingCard'
import type { Card, SpecialRuleType } from '../../types'
import type { SpecialWinner } from '../../game/specialRules'

const RULE_COLOR: Record<SpecialRuleType, string> = {
  flush: '#D6A84F',
  '21': '#4CAF76',
  t7: '#9B59B6',
}

const RULE_LABEL: Record<SpecialRuleType, string> = {
  flush: 'FLUSH',
  '21': '21',
  t7: 'T7',
}

const RULE_DESCRIPTION: Record<SpecialRuleType, string> = {
  flush: 'Les 5 cartes de la main sont de la même couleur.',
  '21': 'La somme des 5 cartes de la main vaut exactement 21.',
  t7: 'Au moins 3 des 5 cartes ont la valeur 7.',
}

type OverlayPhase = 'intro' | 'ruleShowcase' | 'result'

export interface SpecialWinOverlayProps {
  winners: SpecialWinner[]
  hands: Card[][]
  seatNames: string[]
  payoutLines: { name: string; amount: number }[]
  onContinue: () => void
  onHome?: () => void
  homeLabel?: string
  onQuit?: () => void
  quitLabel?: string
  continueLabel?: string
  continueDisabled?: boolean
}

function isVacantSeatName(name: string): boolean {
  return name === '-' || name === '—' || name.trim() === ''
}

export default function SpecialWinOverlay({
  winners,
  hands,
  seatNames,
  payoutLines,
  onContinue,
  onHome,
  homeLabel = "Retour à l'accueil",
  onQuit,
  quitLabel = 'ABANDONNER LA TABLE',
  continueLabel,
  continueDisabled,
}: SpecialWinOverlayProps) {
  const [phase, setPhase] = useState<OverlayPhase>('intro')
  const winnerIndexes = winners.map(w => w.playerIndex)
  const primaryColor = RULE_COLOR[winners[0]?.rules[0] ?? 'flush']

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('ruleShowcase'), 1200)
    const t2 = setTimeout(() => setPhase('result'), 1200 + 700 + winners.length * 1100)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="reveal-overlay" style={{ ['--reveal-accent' as string]: primaryColor }}>
      <div className="reveal-rays" aria-hidden />

      {phase === 'intro' && (
        <div className="anim-scale-bounce reveal-intro">
          <p className="reveal-kicker">ROUND ARRÊTÉ — RÈGLE SPÉCIALE</p>
          <div className="font-display reveal-intro-title">VICTOIRE IMMÉDIATE</div>
        </div>
      )}

      {phase === 'ruleShowcase' && (
        <div className="reveal-showcase">
          {winners.map((winner, wi) => (
            <div key={winner.playerIndex}>
              {winner.rules.map((rule, ri) => (
                <RuleShowcaseCard
                  key={rule}
                  rule={rule}
                  playerName={seatNames[winner.playerIndex]}
                  hand={hands[winner.playerIndex]}
                  delay={(wi * winner.rules.length + ri) * 0.15}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {phase === 'result' && (
        <div className="anim-fade-in reveal-hands reveal-hands--unified">
          <p className="reveal-kicker reveal-kicker--center">MAINS RÉVÉLÉES · BILAN</p>
          <div className="reveal-hands-list" style={{ gap: 12 }}>
            {seatNames.map((name, i) => {
              const isWinner = winnerIndexes.includes(i)
              const hand = hands[i] ?? []
              if (!isWinner && hand.length === 0 && isVacantSeatName(name)) {
                return null
              }
              const line = payoutLines.find(p => p.name === name)
              return (
                <div
                  key={name + '-' + i}
                  className="anim-fade-in-up reveal-hand-row"
                  style={{
                    animationDelay: `${i * 0.08}s`,
                    ...(isWinner
                      ? {
                          background: `${primaryColor}0F`,
                          border: `1px solid ${primaryColor}40`,
                        }
                      : {}),
                  }}
                >
                  <div className="reveal-line-head" style={{ marginBottom: 8 }}>
                    <span
                      className={`font-display reveal-hand-name${isWinner ? ' is-gold' : ''}`}
                      style={isWinner ? { color: primaryColor } : undefined}
                    >
                      {name}
                    </span>
                    {line && (
                      <span
                        className={`font-display reveal-row-amt ${line.amount > 0 ? 'is-gain' : 'is-loss'}`}
                      >
                        {line.amount > 0 ? '+' : ''}
                        {line.amount.toLocaleString('fr-FR')}
                      </span>
                    )}
                  </div>
                  <div className="reveal-hand-cards">
                    {hand.map((card, ci) => (
                      <PlayingCard
                        key={ci}
                        suit={card.suit}
                        value={card.value}
                        state={isWinner ? 'winner' : 'default'}
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="reveal-payout reveal-payout--inline">
            <p className="text-gold font-display reveal-payout-title" style={{ fontSize: 14, marginBottom: 8 }}>
              {winners.map(w => seatNames[w.playerIndex]).join(' & ')} remporte
              {winners.length > 1 ? 'nt' : ''} le round
            </p>
            <div className="reveal-payout-list">
              {payoutLines
                .filter(p => !isVacantSeatName(p.name))
                .map((p, i, arr) => (
                  <div
                    key={p.name}
                    className={`reveal-payout-row${i < arr.length - 1 ? ' has-border' : ''}`}
                  >
                    <span className="reveal-payout-name">{p.name}</span>
                    <span
                      className={`font-display reveal-payout-amt ${p.amount > 0 ? 'is-gain' : 'is-loss'}`}
                    >
                      {p.amount > 0 ? '+' : ''}
                      {p.amount.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="reveal-actions">
            <button
              type="button"
              className="btn-primary glow-gold reveal-cta"
              onClick={onContinue}
              style={{ width: '100%' }}
              disabled={continueDisabled}
            >
              {continueLabel ?? 'CONTINUER →'}
            </button>
            {onHome && (
              <button type="button" className="reveal-home-btn" onClick={onHome}>
                {homeLabel}
              </button>
            )}
            {onQuit && (
              <button type="button" className="reveal-quit-btn" onClick={onQuit}>
                {quitLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function RuleShowcaseCard({
  rule,
  playerName,
  hand,
  delay,
}: {
  rule: SpecialRuleType
  playerName: string
  hand: Card[]
  delay: number
}) {
  const color = RULE_COLOR[rule]
  const sum = hand.reduce((total, c) => total + c.pointValue, 0)

  return (
    <div
      className="anim-scale-bounce reveal-rule-card"
      style={{
        background: `${color}0D`,
        borderColor: `${color}40`,
        animationDelay: `${delay}s`,
      }}
    >
      <div className="reveal-rule-head">
        <span className="font-display reveal-rule-label" style={{ color }}>
          {RULE_LABEL[rule]}
        </span>
        <span className="reveal-rule-player">{playerName}</span>
      </div>
      <p className="reveal-rule-desc">{RULE_DESCRIPTION[rule]}</p>

      <div className="reveal-hand-cards" style={{ gap: 6 }}>
        {hand.map((card, i) => {
          const isHighlighted =
            rule === 'flush' || rule === '21' || (rule === 't7' && card.value === '7')
          return (
            <PlayingCard
              key={i}
              suit={card.suit}
              value={card.value}
              state={isHighlighted ? 'winner' : 'disabled'}
              size="sm"
            />
          )
        })}
      </div>

      {rule === '21' && (
        <div className="reveal-rule-sum">
          <span className="font-display" style={{ color }}>
            {hand.map(c => c.pointValue).join(' + ')} = {sum}
          </span>
        </div>
      )}
    </div>
  )
}
