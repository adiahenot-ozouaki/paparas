import { useMemo, useState } from 'react'
import type { Screen, ComboType, SpecialRuleType } from '../types'
import { useGame } from '../game/GameContext'
import { useAuth } from '../auth/AuthContext'
import { COMBO_LABEL, COMBO_MULTIPLIER } from '../game/combo'
import { loadGameHistory } from '../lib/persistence/gameHistory'

// ==========================================================================
// StatsScreen — lifetimeStats (fusion local ↔ cloud) + vue Solo récente
// dérivée de gameHistory (sans 2e table SQL pour l’instant).
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

type Scope = 'global' | 'solo'
type Section = 'perf' | 'finance' | 'combos'

type DisplayStats = {
  gamesPlayed: number
  gamesWon: number
  totalRoundsWon: number
  totalTricksWon: number
  netGainTotal: number
  totalGains: number
  totalLosses: number
  maxCapitalEver: number
  minCapitalEver: number
  comboCounts: Record<ComboType, number>
  specialRuleCounts: Record<SpecialRuleType, number>
  sourceNote: string
}

export default function StatsScreen({ onNavigate: _onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [section, setSection] = useState<Section>('perf')
  const [scope, setScope] = useState<Scope>('global')
  const { lifetimeStats } = useGame()
  const { user } = useAuth()

  const display: DisplayStats = useMemo(() => {
    if (scope === 'global') {
      return {
        gamesPlayed: lifetimeStats.gamesPlayed,
        gamesWon: lifetimeStats.gamesWon,
        totalRoundsWon: lifetimeStats.totalRoundsWon,
        totalTricksWon: lifetimeStats.totalTricksWon,
        netGainTotal: lifetimeStats.netGainTotal,
        totalGains: lifetimeStats.totalGains,
        totalLosses: lifetimeStats.totalLosses,
        maxCapitalEver: lifetimeStats.maxCapitalEver,
        minCapitalEver: lifetimeStats.minCapitalEver,
        comboCounts: lifetimeStats.comboCounts,
        specialRuleCounts: lifetimeStats.specialRuleCounts,
        sourceNote: user
          ? 'Global = stats locales fusionnées avec le compte (kora_lifetime_stats).'
          : 'Global = stats locales (connectez-vous pour synchroniser le cloud).',
      }
    }

    // Solo récent : agrégat de l’historique local (30 dernières parties solo)
    const hist = loadGameHistory().filter(h => h.mode === 'solo')
    const gamesPlayed = hist.length
    const gamesWon = hist.filter(h => h.won).length
    const totalRoundsWon = hist.reduce((s, h) => s + h.roundsWon, 0)
    const netGainTotal = hist.reduce((s, h) => s + h.netGain, 0)
    const totalGains = hist.reduce((s, h) => s + Math.max(0, h.netGain), 0)
    const totalLosses = hist.reduce((s, h) => s + Math.max(0, -h.netGain), 0)
    const maxCapitalEver = hist.reduce((m, h) => Math.max(m, h.finalCapital), 0)
    const minCapitalEver =
      hist.length === 0 ? 0 : hist.reduce((m, h) => Math.min(m, h.finalCapital), hist[0].finalCapital)

    const comboCounts: Record<ComboType, number> = {
      simple: 0,
      kora: 0,
      '33': 0,
      trinity: 0,
      kmt: 0,
    }
    for (const h of hist) {
      if (h.bestCombo && h.bestCombo in comboCounts) {
        comboCounts[h.bestCombo as ComboType] += 1
      }
    }

    return {
      gamesPlayed,
      gamesWon,
      totalRoundsWon,
      totalTricksWon: 0, // non journalisé dans history
      netGainTotal,
      totalGains,
      totalLosses,
      maxCapitalEver,
      minCapitalEver,
      comboCounts,
      specialRuleCounts: { flush: 0, '21': 0, t7: 0 },
      sourceNote:
        'Solo récent = 30 dernières parties solo (historique local). Combos = meilleur combo de la partie. Plis / règles spéciales non détaillés ici.',
    }
  }, [scope, lifetimeStats, user])

  const winRatio = display.gamesPlayed > 0 ? (display.gamesWon / display.gamesPlayed) * 100 : 0
  const maxComboCount = Math.max(1, ...COMBO_ORDER.map(c => display.comboCounts[c]))
  const hasAnyGame = display.gamesPlayed > 0

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#0B0D10',
        overflowY: 'auto',
        paddingBottom: 80,
      }}
    >
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      <div style={{ padding: '20px 20px 0', position: 'relative' }}>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px' }}>
          Statistiques
        </h1>
        <p style={{ color: '#A9B0B7', fontSize: 14, margin: '0 0 14px' }}>Performance et combos</p>

        {/* Scope Global / Solo */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: 4,
            marginBottom: 12,
          }}
        >
          {(
            [
              { id: 'global' as const, label: 'Global' },
              { id: 'solo' as const, label: 'Solo récent' },
            ] as const
          ).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setScope(t.id)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                border: 'none',
                background: scope === t.id ? 'rgba(214,168,79,0.18)' : 'transparent',
                color: scope === t.id ? '#D6A84F' : '#A9B0B7',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p style={{ color: '#5b636b', fontSize: 11, margin: '0 0 14px', lineHeight: 1.4 }}>{display.sourceNote}</p>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {(
            [
              { id: 'perf' as const, label: 'Performances' },
              { id: 'finance' as const, label: 'Finance' },
              { id: 'combos' as const, label: 'Combos' },
            ] as const
          ).map(t => (
            <button
              key={t.id}
              type="button"
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
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {!hasAnyGame && (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: '16px',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>
              {scope === 'solo'
                ? 'Aucune partie solo récente — terminez une partie pour alimenter cet historique.'
                : 'Aucune partie jouée pour l’instant — jouez pour voir vos statistiques ici.'}
            </p>
          </div>
        )}

        {section === 'perf' && (
          <>
            <div
              className="anim-scale-bounce"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: '24px',
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 16px' }}>
                <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
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
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
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
                {display.gamesWon} victoires sur {display.gamesPlayed} parties
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Parties jouées', value: String(display.gamesPlayed), color: '#fff' },
                { label: 'Parties gagnées', value: String(display.gamesWon), color: '#4CAF76' },
                { label: 'Rounds gagnés', value: String(display.totalRoundsWon), color: '#D6A84F' },
                {
                  label: 'Plis gagnés',
                  value: scope === 'solo' ? '—' : display.totalTricksWon.toLocaleString('fr-FR'),
                  color: '#9B59B6',
                },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 14,
                    padding: '14px',
                  }}
                >
                  <p className="font-display" style={{ color: s.color, fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
                    {s.value}
                  </p>
                  <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {section === 'finance' && (
          <>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(18,60,50,0.5), rgba(16,21,26,0.8))',
                border: '1px solid rgba(214,168,79,0.2)',
                borderRadius: 20,
                padding: '20px',
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  color: '#A9B0B7',
                  fontSize: 11,
                  fontFamily: 'Plus Jakarta Sans',
                  letterSpacing: '0.1em',
                  margin: '0 0 8px',
                }}
              >
                GAIN NET {scope === 'solo' ? 'SOLO RÉCENT' : 'TOTAL'}
              </p>
              <div className="text-gold font-display" style={{ fontSize: 36, fontWeight: 800 }}>
                {display.netGainTotal >= 0 ? '+' : ''}
                {display.netGainTotal.toLocaleString('fr-FR')} FCFA
              </div>
            </div>

            {[
              { label: 'Gains totaux', value: `+${display.totalGains.toLocaleString('fr-FR')}`, color: '#4CAF76' },
              { label: 'Pertes totales', value: `-${display.totalLosses.toLocaleString('fr-FR')}`, color: '#C94B4B' },
              {
                label: 'Gain net',
                value: `${display.netGainTotal >= 0 ? '+' : ''}${display.netGainTotal.toLocaleString('fr-FR')}`,
                color: '#D6A84F',
              },
              {
                label: 'Capital maximum',
                value: display.maxCapitalEver.toLocaleString('fr-FR'),
                color: '#fff',
              },
              {
                label: 'Capital minimum',
                value: display.minCapitalEver.toLocaleString('fr-FR'),
                color: '#fff',
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: '#A9B0B7', fontSize: 14 }}>{s.label}</span>
                <span className="font-display" style={{ color: s.color, fontSize: 16, fontWeight: 700 }}>
                  {s.value} FCFA
                </span>
              </div>
            ))}
          </>
        )}

        {section === 'combos' && (
          <>
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: '20px',
                marginBottom: 16,
              }}
            >
              <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#fff' }}>
                {scope === 'solo' ? 'Meilleurs combos (parties solo)' : 'Combos réalisés'}
              </h3>
              {COMBO_ORDER.map((c, i) => {
                const count = display.comboCounts[c]
                const color = COMBO_COLOR[c]
                return (
                  <div key={c} style={{ marginBottom: i < COMBO_ORDER.length - 1 ? 14 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="font-display" style={{ color, fontSize: 15, fontWeight: 800 }}>
                          {COMBO_LABEL[c]}
                        </span>
                        <span style={{ color: '#A9B0B7', fontSize: 12 }}>×{COMBO_MULTIPLIER[c]}</span>
                      </div>
                      <span className="font-display" style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
                        ×{count}
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(count / maxComboCount) * 100}%`,
                          height: '100%',
                          background: color,
                          borderRadius: 99,
                          transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {scope === 'global' && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20,
                  padding: '20px',
                }}
              >
                <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#fff' }}>
                  Règles spéciales
                </h3>
                <div style={{ display: 'flex', gap: 10 }}>
                  {SPECIAL_ORDER.map(rule => (
                    <div
                      key={rule}
                      style={{
                        flex: 1,
                        background: `${SPECIAL_COLOR[rule]}10`,
                        border: `1.5px solid ${SPECIAL_COLOR[rule]}40`,
                        borderRadius: 16,
                        padding: '16px 8px',
                        textAlign: 'center',
                      }}
                    >
                      <p
                        className="font-display"
                        style={{ color: SPECIAL_COLOR[rule], fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}
                      >
                        {display.specialRuleCounts[rule]}
                      </p>
                      <p className="font-display" style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>
                        {SPECIAL_LABEL[rule]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scope === 'solo' && (
              <p style={{ color: '#5b636b', fontSize: 11, margin: 0, lineHeight: 1.4 }}>
                Les règles spéciales et le détail des plis restent dans la vue Global (compteurs lifetime complets).
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
