import { useState } from 'react'
import type { Screen, ComboType, SpecialRuleType } from '../types'
import { useGame } from '../game/GameContext'
import { COMBO_LABEL, COMBO_MULTIPLIER } from '../game/combo'

// ==========================================================================
// StatsScreen — entièrement rebranché sur lifetimeStats (game/GameContext).
//
// Avant : COMBOS et SPECIALS étaient des tableaux de nombres inventés,
// sans lien avec les parties réellement jouées. GameContext trace
// désormais ces compteurs en temps réel (voir applyCurrentPayout), donc
// cet écran peut simplement les lire.
// ==========================================================================

const COMBO_ORDER: ComboType[] = ['kmt', 'trinity', '33', 'kora', 'simple']
const COMBO_COLOR: Record<ComboType, string> = {
  kmt: '#C94B4B',
  trinity: '#9B59B6',
  '33': '#D6A84F',
  kora: '#4CAF76',
  simple: '#A9B0B7',
}

const SPECIAL_ORDER: SpecialRuleType[] = ['flush', '21', 't7']
const SPECIAL_LABEL: Record<SpecialRuleType, string> = { flush: 'Flush', '21': '21', t7: 'T7' }
const SPECIAL_COLOR: Record<SpecialRuleType, string> = { flush: '#D6A84F', '21': '#4CAF76', t7: '#9B59B6' }

export default function StatsScreen({ onNavigate: _onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [section, setSection] = useState<'perf' | 'finance' | 'combos'>('perf')
  const { lifetimeStats } = useGame()

  const winRatio = lifetimeStats.gamesPlayed > 0 ? (lifetimeStats.gamesWon / lifetimeStats.gamesPlayed) * 100 : 0
  const maxComboCount = Math.max(1, ...COMBO_ORDER.map(c => lifetimeStats.comboCounts[c]))
  const hasAnyGame = lifetimeStats.gamesPlayed > 0

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: '#0B0D10',
      overflowY: 'auto',
      paddingBottom: 80,
    }}>
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      {/* Header */}
      <div style={{ padding: '20px 20px 0', position: 'relative' }}>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px' }}>
          Statistiques
        </h1>
        <p style={{ color: '#A9B0B7', fontSize: 14, margin: '0 0 20px' }}>Votre performance globale</p>

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {([
            { id: 'perf', label: 'Performances' },
            { id: 'finance', label: 'Finance' },
            { id: 'combos', label: 'Combos' },
          ] as { id: 'perf' | 'finance' | 'combos'; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setSection(t.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 12,
                border: section === t.id ? '1.5px solid rgba(214,168,79,0.5)' : '1px solid rgba(255,255,255,0.1)',
                background: section === t.id ? 'rgba(214,168,79,0.12)' : 'rgba(255,255,255,0.04)',
                color: section === t.id ? '#D6A84F' : '#A9B0B7',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>

        {!hasAnyGame && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '16px',
            marginBottom: 16,
            textAlign: 'center',
          }}>
            <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>
              Aucune partie jouée pour l'instant — jouez votre première partie pour voir vos statistiques ici.
            </p>
          </div>
        )}

        {/* Performance section */}
        {section === 'perf' && (
          <>
            {/* Win rate ring */}
            <div className="anim-scale-bounce" style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '24px',
              textAlign: 'center',
              marginBottom: 16,
            }}>
              <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 16px' }}>
                <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="url(#grad)"
                    strokeWidth="10"
                    strokeDasharray={`${(winRatio / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#176B50" />
                      <stop offset="100%" stopColor="#D6A84F" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span className="text-gold font-display" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
                    {winRatio.toFixed(1)}
                  </span>
                  <span style={{ color: '#A9B0B7', fontSize: 12 }}>%</span>
                </div>
              </div>
              <p className="font-display" style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>
                Taux de victoire
              </p>
              <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>
                {lifetimeStats.gamesWon} victoires sur {lifetimeStats.gamesPlayed} parties
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Parties jouées', value: String(lifetimeStats.gamesPlayed), color: '#fff' },
                { label: 'Parties gagnées', value: String(lifetimeStats.gamesWon), color: '#4CAF76' },
                { label: 'Rounds gagnés', value: String(lifetimeStats.totalRoundsWon), color: '#D6A84F' },
                { label: 'Plis gagnés', value: lifetimeStats.totalTricksWon.toLocaleString('fr-FR'), color: '#9B59B6' },
              ].map((s, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '14px',
                }}>
                  <p className="font-display" style={{ color: s.color, fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
                    {s.value}
                  </p>
                  <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Finance section */}
        {section === 'finance' && (
          <>
            <div style={{
              background: 'linear-gradient(135deg, rgba(18,60,50,0.5), rgba(16,21,26,0.8))',
              border: '1px solid rgba(214,168,79,0.2)',
              borderRadius: 20,
              padding: '20px',
              marginBottom: 16,
            }}>
              <p style={{ color: '#A9B0B7', fontSize: 11, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                GAIN NET TOTAL
              </p>
              <div className="text-gold font-display" style={{ fontSize: 36, fontWeight: 800 }}>
                {lifetimeStats.netGainTotal >= 0 ? '+' : ''}
                {lifetimeStats.netGainTotal.toLocaleString('fr-FR')} FCFA
              </div>
            </div>

            {[
              { label: 'Gains totaux', value: `+${lifetimeStats.totalGains.toLocaleString('fr-FR')}`, color: '#4CAF76' },
              { label: 'Pertes totales', value: `-${lifetimeStats.totalLosses.toLocaleString('fr-FR')}`, color: '#C94B4B' },
              {
                label: 'Gain net',
                value: `${lifetimeStats.netGainTotal >= 0 ? '+' : ''}${lifetimeStats.netGainTotal.toLocaleString('fr-FR')}`,
                color: '#D6A84F',
              },
              { label: 'Capital maximum', value: lifetimeStats.maxCapitalEver.toLocaleString('fr-FR'), color: '#fff' },
              { label: 'Capital minimum', value: lifetimeStats.minCapitalEver.toLocaleString('fr-FR'), color: '#fff' },
            ].map((s, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '14px 16px',
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ color: '#A9B0B7', fontSize: 14 }}>{s.label}</span>
                <span className="font-display" style={{ color: s.color, fontSize: 16, fontWeight: 700 }}>
                  {s.value} FCFA
                </span>
              </div>
            ))}
          </>
        )}

        {/* Combos section */}
        {section === 'combos' && (
          <>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '20px',
              marginBottom: 16,
            }}>
              <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#fff' }}>
                Combos réalisés
              </h3>
              {COMBO_ORDER.map((c, i) => {
                const count = lifetimeStats.comboCounts[c]
                const color = COMBO_COLOR[c]
                return (
                  <div key={c} style={{ marginBottom: i < COMBO_ORDER.length - 1 ? 14 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="font-display" style={{ color, fontSize: 15, fontWeight: 800 }}>{COMBO_LABEL[c]}</span>
                        <span style={{ color: '#A9B0B7', fontSize: 12 }}>×{COMBO_MULTIPLIER[c]}</span>
                      </div>
                      <span className="font-display" style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>×{count}</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        width: `${(count / maxComboCount) * 100}%`,
                        height: '100%',
                        background: color,
                        borderRadius: 99,
                        transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Special rules */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '20px',
            }}>
              <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#fff' }}>
                Règles spéciales
              </h3>
              <div style={{ display: 'flex', gap: 10 }}>
                {SPECIAL_ORDER.map(rule => (
                  <div key={rule} style={{
                    flex: 1,
                    background: `${SPECIAL_COLOR[rule]}10`,
                    border: `1.5px solid ${SPECIAL_COLOR[rule]}40`,
                    borderRadius: 16,
                    padding: '16px 8px',
                    textAlign: 'center',
                  }}>
                    <p className="font-display" style={{ color: SPECIAL_COLOR[rule], fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>
                      {lifetimeStats.specialRuleCounts[rule]}
                    </p>
                    <p className="font-display" style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>
                      {SPECIAL_LABEL[rule]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
