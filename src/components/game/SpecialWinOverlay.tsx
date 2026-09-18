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
  flush: 'Les 5 cartes de même couleur',
  '21': 'Somme des valeurs = 21',
  t7: 'Trois 7 dans la main',
}

interface SpecialWinOverlayProps {
  winners: SpecialWinner[]
  hands: Card[][]
  onContinue: () => void
  onQuit?: () => void
  quitLabel?: string
  seatNames?: string[]
  amounts?: number[]
}

export function SpecialWinOverlay({
  winners,
  hands,
  onContinue,
  onQuit,
  quitLabel = 'ABANDONNER LA TABLE',
  seatNames,
  amounts,
}: SpecialWinOverlayProps) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(t)
  }, [])

  const primary = winners[0]
  const rule = primary?.rule
  const color = rule ? RULE_COLOR[rule] : '#D6A84F'

  return (
    <div className="reveal-overlay">
      <div className="reveal-rays" style={{ ['--reveal-accent' as string]: color }} aria-hidden />
      <div className={`anim-fade-in reveal-hands reveal-hands--wide reveal-hands--unified${ready ? ' is-ready' : ''}`}>
        <p className="reveal-kicker reveal-kicker--center">RÈGLE SPÉCIALE</p>
        {rule && (
          <p className="font-display reveal-hands-winner" style={{ color }}>
            {RULE_LABEL[rule]} — {RULE_DESCRIPTION[rule]}
          </p>
        )}
        <div className="reveal-hands-list">
          {winners.map((w, wi) => {
            const name = seatNames?.[w.playerIndex] ?? `Joueur ${w.playerIndex + 1}`
            const hand = hands[w.playerIndex] ?? []
            const amt = amounts?.[w.playerIndex]
            return (
              <div key={w.playerIndex} className="anim-fade-in-up reveal-hand-row is-winner-gold" style={{ animationDelay: `${wi * 0.06}s` }}>
                <div className="reveal-line-head">
                  <span className="font-display reveal-hand-name is-gold">{name}</span>
                  {amt != null && (
                    <span className={`font-display reveal-row-amt ${amt > 0 ? 'is-gain' : 'is-loss'}`}>
                      {amt > 0 ? '+' : ''}{amt.toLocaleString('fr-FR')}
                    </span>
                  )}
                </div>
                <div className="reveal-line-cards">
                  {hand.map((card, ci) => (
                    <PlayingCard key={ci} suit={card.suit} value={card.value} state="winner" size="sm" />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div className="reveal-actions">
          <button type="button" className="btn-primary glow-gold reveal-cta" onClick={onContinue} style={{ width: '100%' }}>
            CONTINUER
          </button>
          {onQuit && (
            <button type="button" className="reveal-quit-btn" onClick={onQuit}>
              {quitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
