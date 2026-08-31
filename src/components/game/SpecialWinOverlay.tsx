import { useEffect, useState } from 'react'
import PlayingCard from '../PlayingCard'
import type { Card, SpecialRuleType } from '../../types'
import type { SpecialWinner } from '../../game/specialRules'

// ==========================================================================
// SpecialWinOverlay — Étape 9/10 du plan.
//
// Mise en scène dédiée pour une victoire immédiate (Flush / 21 / T7),
// déclenchée juste après la distribution, avant tout pli. Reprend le
// langage visuel déjà établi dans RulesScreen.tsx pour chaque règle
// (mêmes couleurs, mêmes principes de mise en avant) pour rester cohérent
// avec le reste de l'app.
//
// Séquence en 4 temps, enchaînés automatiquement puis un bouton manuel
// pour la suite (cohérent avec les autres écrans de fin de round) :
//   1. intro         — bannière d'annonce
//   2. ruleShowcase   — détail de la ou des règles déclenchées, avec les
//                       vraies cartes du/des gagnant(s)
//   3. handsReveal    — les 4 mains sont révélées (conforme aux règles :
//                       "toutes les mains sont révélées")
//   4. payout         — décompte des gains/pertes + bouton Continuer
// ==========================================================================

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

type OverlayPhase = 'intro' | 'ruleShowcase' | 'handsReveal' | 'payout'

export interface SpecialWinOverlayProps {
  winners: SpecialWinner[]
  hands: Card[][]
  seatNames: string[]
  payoutLines: { name: string; amount: number }[]
  onContinue: () => void
}

export default function SpecialWinOverlay({
  winners,
  hands,
  seatNames,
  payoutLines,
  onContinue,
}: SpecialWinOverlayProps) {
  const [phase, setPhase] = useState<OverlayPhase>('intro')
  const winnerIndexes = winners.map(w => w.playerIndex)
  const primaryColor = RULE_COLOR[winners[0]?.rules[0] ?? 'flush']

  // La révélation des mains (handsReveal) n'a PAS de minuterie automatique
  // vers la suite : le joueur passe à l'écran des gains quand il le
  // souhaite (bouton "Voir les gains →" plus bas), pour avoir le temps de
  // vraiment regarder les 4 mains plutôt que de se les faire arracher par
  // un minuteur.
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('ruleShowcase'), 1200)
    const t2 = setTimeout(() => setPhase('handsReveal'), 1200 + 700 + winners.length * 1100)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      {/* Rayons dorés d'ambiance, communs à toutes les phases */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          width: 280,
          height: 280,
          transform: 'translate(-50%, -50%)',
          backgroundImage: `conic-gradient(from 0deg, transparent, ${primaryColor}14 20deg, transparent 40deg)`,
          animation: 'victoryRays 7s linear infinite',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      {/* --- Phase 1 : annonce --- */}
      {phase === 'intro' && (
        <div className="anim-scale-bounce" style={{ textAlign: 'center', position: 'relative' }}>
          <p
            style={{
              color: '#A9B0B7',
              fontSize: 12,
              fontFamily: 'Plus Jakarta Sans',
              letterSpacing: '0.14em',
              margin: '0 0 12px',
            }}
          >
            ROUND ARRÊTÉ — RÈGLE SPÉCIALE
          </p>
          <div
            className="font-display"
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: primaryColor,
              textShadow: `0 0 40px ${primaryColor}80`,
              letterSpacing: '0.06em',
            }}
          >
            VICTOIRE IMMÉDIATE
          </div>
        </div>
      )}

      {/* --- Phase 2 : détail de chaque règle déclenchée --- */}
      {phase === 'ruleShowcase' && (
        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
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

      {/* --- Phase 3 : révélation des 4 mains --- */}
      {phase === 'handsReveal' && (
        <div className="anim-fade-in" style={{ width: '100%', maxWidth: 360 }}>
          <p
            style={{
              color: '#A9B0B7',
              fontSize: 11,
              fontFamily: 'Plus Jakarta Sans',
              letterSpacing: '0.1em',
              textAlign: 'center',
              margin: '0 0 16px',
            }}
          >
            MAINS RÉVÉLÉES
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {seatNames.map((name, i) => {
              const isWinner = winnerIndexes.includes(i)
              return (
                <div
                  key={name}
                  className="anim-fade-in-up"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    animationDelay: `${i * 0.08}s`,
                    background: isWinner ? `${primaryColor}0F` : 'rgba(255,255,255,0.03)',
                    border: isWinner ? `1px solid ${primaryColor}40` : '1px solid rgba(255,255,255,0.06)',
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
                      color: isWinner ? primaryColor : '#A9B0B7',
                      fontWeight: isWinner ? 700 : 500,
                    }}
                  >
                    {name}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {hands[i].map((card, ci) => (
                      <PlayingCard
                        key={ci}
                        suit={card.suit}
                        value={card.value}
                        state={isWinner ? 'winner' : 'default'}
                        size="xs"
                      />
                    ))}
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

      {/* --- Phase 4 : gains / pertes + bouton --- */}
      {phase === 'payout' && (
        <div className="anim-fade-in-up" style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
          <p
            className="text-gold font-display"
            style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', letterSpacing: '0.04em' }}
          >
            {winners.map(w => seatNames[w.playerIndex]).join(' & ')} remporte{winners.length > 1 ? 'nt' : ''} le round
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
                key={p.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: i < payoutLines.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                <span style={{ color: '#fff', fontSize: 14 }}>{p.name}</span>
                <span
                  className="font-display"
                  style={{ color: p.amount > 0 ? '#4CAF76' : '#C94B4B', fontSize: 14, fontWeight: 700 }}
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
            style={{ padding: '14px 40px', fontSize: 14, borderRadius: 14, letterSpacing: '0.1em', width: '100%' }}
          >
            CONTINUER →
          </button>
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
      className="anim-scale-bounce"
      style={{
        background: `${color}0D`,
        border: `1.5px solid ${color}40`,
        borderRadius: 18,
        padding: '16px 18px',
        animationDelay: `${delay}s`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="font-display" style={{ color, fontSize: 24, fontWeight: 800 }}>
          {RULE_LABEL[rule]}
        </span>
        <span style={{ color: '#A9B0B7', fontSize: 12 }}>{playerName}</span>
      </div>
      <p style={{ color: '#A9B0B7', fontSize: 12, margin: '0 0 12px' }}>{RULE_DESCRIPTION[rule]}</p>

      <div style={{ display: 'flex', gap: 6 }}>
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
        <div
          style={{
            marginTop: 10,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 10,
            padding: '6px 12px',
            display: 'inline-block',
          }}
        >
          <span className="font-display" style={{ color, fontSize: 13, fontWeight: 700 }}>
            {hand.map(c => c.pointValue).join(' + ')} = {sum}
          </span>
        </div>
      )}
    </div>
  )
}
