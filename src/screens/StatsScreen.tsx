import { useMemo, useState } from 'react'
import type { Screen, ComboType, SpecialRuleType } from '../types'
import { useGame } from '../game/GameContext'
import { useAuth } from '../auth/AuthContext'
import { COMBO_LABEL, COMBO_MULTIPLIER } from '../game/combo'
import { loadGameHistory } from '../lib/persistence/gameHistory'
import { EmptyState, PageHeader, ScreenShell, SectionCard } from '../components/ui'

const COMBO_ORDER: ComboType[] = ['kmt', 'trinity', '33', 'kora', 'simple']
const COMBO_COLOR: Record<ComboType, string> = {
  kmt: '#C94B4B',
  trinity: '#9B59B6',
  '33': 'var(--kora-gold)',
  kora: 'var(--kora-success)',
  simple: 'var(--kora-muted)',
}

const SPECIAL_ORDER: SpecialRuleType[] = ['flush', '21', 't7']
const SPECIAL_LABEL: Record<SpecialRuleType, string> = { flush: 'Flush', '21': '21', t7: 'T7' }
const SPECIAL_COLOR: Record<SpecialRuleType, string> = {
  flush: 'var(--kora-gold)',
  '21': 'var(--kora-success)',
  t7: '#9B59B6',
}

type Scope = 'global' | 'solo'
type Section = 'perf' | 'finance' | 'combos'

export default function StatsScreen({ onNavigate: _onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [section, setSection] = useState<Section>('perf')
  const [scope, setScope] = useState<Scope>('global')
  const { lifetimeStats } = useGame()
  const { user } = useAuth()

  const display = useMemo(() => {
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
          ? 'Global = stats locales fusionnées avec le compte.'
          : 'Global = stats locales (connectez-vous pour synchroniser).',
      }
    }

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
      totalTricksWon: 0,
      netGainTotal,
      totalGains,
      totalLosses,
      maxCapitalEver,
      minCapitalEver,
      comboCounts,
      specialRuleCounts: { flush: 0, '21': 0, t7: 0 } as Record<SpecialRuleType, number>,
      sourceNote: 'Solo récent = 30 dernières parties solo (historique local).',
    }
  }, [scope, lifetimeStats, user])

  const winRatio = display.gamesPlayed > 0 ? (display.gamesWon / display.gamesPlayed) * 100 : 0
  const maxComboCount = Math.max(1, ...COMBO_ORDER.map(c => display.comboCounts[c]))
  const hasAnyGame = display.gamesPlayed > 0

  return (
    <ScreenShell>
      <div style={{ padding: '20px 20px 0' }}>
        <PageHeader title="Statistiques" subtitle="Performance et combos" />

        <div className="segmented" style={{ marginBottom: 12 }}>
          {(
            [
              { id: 'global' as const, label: 'Global' },
              { id: 'solo' as const, label: 'Solo récent' },
            ] as const
          ).map(t => (
            <button
              key={t.id}
              type="button"
              className={`segmented-btn${scope === t.id ? ' is-active' : ''}`}
              onClick={() => setScope(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p style={{ color: 'var(--kora-muted-2)', fontSize: 11, margin: '0 0 14px', lineHeight: 1.4 }}>
          {display.sourceNote}
        </p>

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
                border:
                  section === t.id ? '1.5px solid var(--kora-border-gold)' : '1px solid var(--kora-card-border)',
                background: section === t.id ? 'rgba(214,168,79,0.12)' : 'var(--kora-card-bg)',
                color: section === t.id ? 'var(--kora-gold)' : 'var(--kora-muted)',
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
          <div style={{ marginBottom: 16 }}>
            <EmptyState
              title={scope === 'solo' ? 'Aucune partie solo récente' : 'Aucune partie jouée'}
              description={
                scope === 'solo'
                  ? 'Terminez une partie pour alimenter cet historique.'
                  : 'Jouez pour voir vos statistiques ici.'
              }
            />
          </div>
        )}

        {section === 'perf' && (
          <>
            <SectionCard className="anim-scale-bounce" style={{ textAlign: 'center', marginBottom: 16, borderRadius: 20, padding: 24 }}>
              <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 16px' }}>
                <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--kora-card-border)" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="url(#gradStats)"
                    strokeWidth="10"
                    strokeDasharray={`${(winRatio / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradStats" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="var(--kora-green)" />
                      <stop offset="100%" stopColor="var(--kora-gold)" />
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
                  <span style={{ color: 'var(--kora-muted)', fontSize: 12 }}>%</span>
                </div>
              </div>
              <p className="font-display" style={{ color: 'var(--kora-text)', fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>
                Taux de victoire
              </p>
              <p style={{ color: 'var(--kora-muted)', fontSize: 13, margin: 0 }}>
                {display.gamesWon} victoires sur {display.gamesPlayed} parties
              </p>
            </SectionCard>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Parties jouées', value: String(display.gamesPlayed), color: 'var(--kora-text)' },
                { label: 'Parties gagnées', value: String(display.gamesWon), color: 'var(--kora-success)' },
                { label: 'Rounds gagnés', value: String(display.totalRoundsWon), color: 'var(--kora-gold)' },
                {
                  label: 'Plis gagnés',
                  value: scope === 'solo' ? '—' : display.totalTricksWon.toLocaleString('fr-FR'),
                  color: '#9B59B6',
                },
              ].map((s, i) => (
                <SectionCard key={i} style={{ borderRadius: 14, padding: 14 }}>
                  <p className="font-display" style={{ color: s.color, fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
                    {s.value}
                  </p>
                  <p style={{ color: 'var(--kora-muted)', fontSize: 12, margin: 0 }}>{s.label}</p>
                </SectionCard>
              ))}
            </div>
          </>
        )}

        {section === 'finance' && (
          <>
            <SectionCard variant="green" style={{ borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <p
                style={{
                  color: 'var(--kora-muted)',
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
            </SectionCard>

            {[
              { label: 'Gains totaux', value: `+${display.totalGains.toLocaleString('fr-FR')}`, color: 'var(--kora-success)' },
              { label: 'Pertes totales', value: `-${display.totalLosses.toLocaleString('fr-FR')}`, color: 'var(--kora-danger)' },
              {
                label: 'Gain net',
                value: `${display.netGainTotal >= 0 ? '+' : ''}${display.netGainTotal.toLocaleString('fr-FR')}`,
                color: 'var(--kora-gold)',
              },
              { label: 'Capital maximum', value: display.maxCapitalEver.toLocaleString('fr-FR'), color: 'var(--kora-text)' },
              { label: 'Capital minimum', value: display.minCapitalEver.toLocaleString('fr-FR'), color: 'var(--kora-text)' },
            ].map((s, i) => (
              <SectionCard
                key={i}
                style={{
                  borderRadius: 14,
                  padding: '14px 16px',
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: 'var(--kora-muted)', fontSize: 14 }}>{s.label}</span>
                <span className="font-display" style={{ color: s.color, fontSize: 16, fontWeight: 700 }}>
                  {s.value} FCFA
                </span>
              </SectionCard>
            ))}
          </>
        )}

        {section === 'combos' && (
          <>
            <SectionCard style={{ borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: 'var(--kora-text)' }}>
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
                        <span style={{ color: 'var(--kora-muted)', fontSize: 12 }}>×{COMBO_MULTIPLIER[c]}</span>
                      </div>
                      <span className="font-display" style={{ color: 'var(--kora-text)', fontSize: 14, fontWeight: 700 }}>
                        ×{count}
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'var(--kora-card-bg)', borderRadius: 99, overflow: 'hidden' }}>
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
            </SectionCard>

            {scope === 'global' && (
              <SectionCard style={{ borderRadius: 20, padding: 20 }}>
                <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: 'var(--kora-text)' }}>
                  Règles spéciales
                </h3>
                <div style={{ display: 'flex', gap: 10 }}>
                  {SPECIAL_ORDER.map(rule => (
                    <div
                      key={rule}
                      style={{
                        flex: 1,
                        background: 'var(--kora-card-bg)',
                        border: `1.5px solid ${SPECIAL_COLOR[rule]}`,
                        borderRadius: 16,
                        padding: '16px 8px',
                        textAlign: 'center',
                        opacity: 0.95,
                      }}
                    >
                      <p
                        className="font-display"
                        style={{ color: SPECIAL_COLOR[rule], fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}
                      >
                        {display.specialRuleCounts[rule]}
                      </p>
                      <p className="font-display" style={{ color: 'var(--kora-text)', fontSize: 14, fontWeight: 700, margin: 0 }}>
                        {SPECIAL_LABEL[rule]}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {scope === 'solo' && (
              <p style={{ color: 'var(--kora-muted-2)', fontSize: 11, margin: 0, lineHeight: 1.4 }}>
                Les règles spéciales et le détail des plis restent dans la vue Global.
              </p>
            )}
          </>
        )}
      </div>
    </ScreenShell>
  )
}
