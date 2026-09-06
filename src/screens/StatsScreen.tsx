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
    <ScreenShell className="stats-screen">
      <div className="stats-header">
        <PageHeader title="Statistiques" subtitle="Performance et combos" />

        <div className="segmented stats-scope">
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

        <p className="stats-source-note">{display.sourceNote}</p>

        <div className="stats-section-tabs">
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
              className={`stats-tab${section === t.id ? ' is-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-body">
        {!hasAnyGame && (
          <div className="stats-empty">
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
            <SectionCard className="anim-scale-bounce stats-win-card">
              <div className="stats-ring-wrap">
                <svg width="120" height="120" className="stats-ring-svg">
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
                <div className="stats-ring-center">
                  <span className="text-gold font-display stats-ring-value">{winRatio.toFixed(1)}</span>
                  <span className="stats-ring-unit">%</span>
                </div>
              </div>
              <p className="font-display stats-ring-label">Taux de victoire</p>
              <p className="stats-ring-sub">
                {display.gamesWon} victoires sur {display.gamesPlayed} parties
              </p>
            </SectionCard>

            <div className="stats-perf-grid">
              {[
                { label: 'Parties jouées', value: String(display.gamesPlayed), tone: 'text' },
                { label: 'Parties gagnées', value: String(display.gamesWon), tone: 'success' },
                { label: 'Rounds gagnés', value: String(display.totalRoundsWon), tone: 'gold' },
                {
                  label: 'Plis gagnés',
                  value: scope === 'solo' ? '—' : display.totalTricksWon.toLocaleString('fr-FR'),
                  tone: 'purple',
                },
              ].map(s => (
                <SectionCard key={s.label} className="stats-metric">
                  <p className={`font-display stats-metric-value tone-${s.tone}`}>{s.value}</p>
                  <p className="stats-metric-label">{s.label}</p>
                </SectionCard>
              ))}
            </div>
          </>
        )}

        {section === 'finance' && (
          <>
            <SectionCard variant="green" className="stats-net-card">
              <p className="stats-net-kicker">
                GAIN NET {scope === 'solo' ? 'SOLO RÉCENT' : 'TOTAL'}
              </p>
              <div className="text-gold font-display stats-net-value">
                {display.netGainTotal >= 0 ? '+' : ''}
                {display.netGainTotal.toLocaleString('fr-FR')} FCFA
              </div>
            </SectionCard>

            {[
              { label: 'Gains totaux', value: `+${display.totalGains.toLocaleString('fr-FR')}`, tone: 'success' },
              { label: 'Pertes totales', value: `-${display.totalLosses.toLocaleString('fr-FR')}`, tone: 'danger' },
              {
                label: 'Gain net',
                value: `${display.netGainTotal >= 0 ? '+' : ''}${display.netGainTotal.toLocaleString('fr-FR')}`,
                tone: 'gold',
              },
              { label: 'Capital maximum', value: display.maxCapitalEver.toLocaleString('fr-FR'), tone: 'text' },
              { label: 'Capital minimum', value: display.minCapitalEver.toLocaleString('fr-FR'), tone: 'text' },
            ].map(s => (
              <SectionCard key={s.label} className="stats-finance-row">
                <span className="stats-finance-label">{s.label}</span>
                <span className={`font-display stats-finance-value tone-${s.tone}`}>{s.value} FCFA</span>
              </SectionCard>
            ))}
          </>
        )}

        {section === 'combos' && (
          <>
            <SectionCard className="stats-combo-card">
              <h3 className="font-display stats-combo-title">
                {scope === 'solo' ? 'Meilleurs combos (parties solo)' : 'Combos réalisés'}
              </h3>
              {COMBO_ORDER.map((c, i) => {
                const count = display.comboCounts[c]
                const color = COMBO_COLOR[c]
                return (
                  <div key={c} className={`stats-combo-row${i < COMBO_ORDER.length - 1 ? ' has-gap' : ''}`}>
                    <div className="stats-combo-head">
                      <div className="stats-combo-name-row">
                        <span className="font-display stats-combo-name" style={{ color }}>
                          {COMBO_LABEL[c]}
                        </span>
                        <span className="stats-combo-mult">×{COMBO_MULTIPLIER[c]}</span>
                      </div>
                      <span className="font-display stats-combo-count">×{count}</span>
                    </div>
                    <div className="stats-combo-bar">
                      <div
                        className="stats-combo-fill"
                        style={{ width: `${(count / maxComboCount) * 100}%`, background: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </SectionCard>

            {scope === 'global' && (
              <SectionCard className="stats-special-card">
                <h3 className="font-display stats-combo-title">Règles spéciales</h3>
                <div className="stats-special-grid">
                  {SPECIAL_ORDER.map(rule => (
                    <div
                      key={rule}
                      className="stats-special-item"
                      style={{ borderColor: SPECIAL_COLOR[rule] }}
                    >
                      <p className="font-display stats-special-count" style={{ color: SPECIAL_COLOR[rule] }}>
                        {display.specialRuleCounts[rule]}
                      </p>
                      <p className="font-display stats-special-label">{SPECIAL_LABEL[rule]}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {scope === 'solo' && (
              <p className="stats-solo-note">
                Les règles spéciales et le détail des plis restent dans la vue Global.
              </p>
            )}
          </>
        )}
      </div>
    </ScreenShell>
  )
}
