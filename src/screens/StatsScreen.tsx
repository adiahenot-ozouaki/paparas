import { useMemo, useState } from 'react'
import type { Screen, ComboType, SpecialRuleType } from '../types'
import { useGame } from '../game/GameContext'
import { useAuth } from '../auth/AuthContext'
import { COMBO_LABEL, COMBO_MULTIPLIER } from '../game/combo'
import { loadGameHistory } from '../lib/persistence/gameHistory'
import { OPPONENT_IDS, OPPONENT_META, normalizeOpponentStatsMap } from '../lib/persistence/stats'
import { AvatarIcon } from '../components/icons'
import { EmptyState, PageHeader, ScreenShell, SectionCard, Segmented } from '../components/ui'

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
type Section = 'perf' | 'finance' | 'combos' | 'rivals'

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
    const maxCapitalEver =
      hist.length === 0 ? 0 : hist.reduce((m, h) => Math.max(m, h.finalCapital), hist[0].finalCapital)
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
      specialRuleCounts: { flush: 0, '21': 0, t7: 0 },
      sourceNote: 'Solo récent = 30 dernières parties solo (local).',
    }
  }, [scope, lifetimeStats, user])

  const winRatio = display.gamesPlayed > 0 ? (display.gamesWon / display.gamesPlayed) * 100 : 0
  const hasAnyGame = display.gamesPlayed > 0
  const maxComboCount = Math.max(1, ...COMBO_ORDER.map(c => display.comboCounts[c] ?? 0))

  return (
    <ScreenShell className="stats-screen">
      <div className="stats-layout">
        <div className="stats-main">
          <div className="stats-header">
            <PageHeader title="Statistiques" subtitle="Performance et combos" />

            <Segmented
              className="stats-scope"
              aria-label="Périmètre des statistiques"
              value={scope}
              onChange={setScope}
              options={[
                { id: 'global', label: 'Global' },
                { id: 'solo', label: 'Solo récent' },
              ]}
            />

            <p className="stats-source-note">{display.sourceNote}</p>

            <Segmented
              className="stats-section-tabs"
              aria-label="Section statistiques"
              value={section}
              onChange={setSection}
              options={[
                { id: 'perf', label: 'Performances' },
                { id: 'finance', label: 'Finance' },
                { id: 'combos', label: 'Combos' },
                { id: 'rivals', label: 'Adversaires' },
              ]}
            />
          </div>

          <SectionCard className="anim-scale-bounce stats-win-card stats-kpi">
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

          <SectionCard variant="green" className="stats-net-card stats-kpi-net">
            <p className="stats-net-kicker">
              GAIN NET {scope === 'solo' ? 'SOLO RÉCENT' : 'TOTAL'}
            </p>
            <div className="text-gold font-display stats-net-value">
              {display.netGainTotal >= 0 ? '+' : ''}
              {display.netGainTotal.toLocaleString('fr-FR')} FCFA
            </div>
          </SectionCard>
        </div>

        <aside className="stats-side">
          <div className="stats-body">
            {!hasAnyGame && section !== 'rivals' && (
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

            {section === 'perf' && hasAnyGame && (
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
                ].map(m => (
                  <SectionCard key={m.label} className="stats-metric">
                    <p className={`font-display stats-metric-value tone-${m.tone}`}>{m.value}</p>
                    <p className="stats-metric-label">{m.label}</p>
                  </SectionCard>
                ))}
              </div>
            )}

            {section === 'finance' && hasAnyGame && (
              <div className="stats-finance-list">
                {[
                  {
                    label: 'Gains bruts',
                    value: `+${display.totalGains.toLocaleString('fr-FR')}`,
                    tone: 'success',
                  },
                  {
                    label: 'Pertes brutes',
                    value: `−${display.totalLosses.toLocaleString('fr-FR')}`,
                    tone: 'danger',
                  },
                  {
                    label: 'Capital max',
                    value: display.maxCapitalEver.toLocaleString('fr-FR'),
                    tone: 'gold',
                  },
                  {
                    label: 'Capital min',
                    value: display.minCapitalEver.toLocaleString('fr-FR'),
                    tone: 'muted',
                  },
                ].map(m => (
                  <SectionCard key={m.label} className="stats-finance-row">
                    <span className="stats-finance-label">{m.label}</span>
                    <span className={`font-display stats-finance-value tone-${m.tone}`}>{m.value}</span>
                  </SectionCard>
                ))}
              </div>
            )}

            {section === 'combos' && hasAnyGame && (
              <>
                <SectionCard className="stats-combo-card">
                  <h3 className="font-display stats-combo-title">Combos réalisés</h3>
                  {COMBO_ORDER.map((c, i) => {
                    const count = display.comboCounts[c] ?? 0
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
                          <p
                            className="font-display stats-special-count"
                            style={{ color: SPECIAL_COLOR[rule] }}
                          >
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

            {section === 'rivals' && (
              <div className="stats-rivals">
                <p className="stats-source-note" style={{ marginBottom: 12 }}>
                  Face aux IA solo (Binu, Lebe, Goju). Compteurs depuis les parties terminées sur cet
                  appareil.
                </p>
                {OPPONENT_IDS.map(id => {
                  const meta = OPPONENT_META[id]
                  const o = normalizeOpponentStatsMap(lifetimeStats.opponentStats)[id]
                  const finished = o.timesFinishedAhead + o.timesFinishedBehind
                  const edgePct =
                    finished > 0 ? Math.round((o.timesFinishedBehind / finished) * 100) : null
                  return (
                    <SectionCard key={id} className="stats-rival-card">
                      <div className="stats-rival-head">
                        <div className="stats-rival-avatar">
                          <AvatarIcon avatar={meta.avatar} size={28} />
                        </div>
                        <div className="stats-rival-meta">
                          <p className="font-display stats-rival-name">{meta.name}</p>
                          <p className="stats-rival-personality">{meta.personality}</p>
                        </div>
                        <div className="stats-rival-edge">
                          {edgePct === null ? (
                            <span className="stats-rival-edge-empty">—</span>
                          ) : (
                            <>
                              <span className="font-display stats-rival-edge-value">{edgePct}%</span>
                              <span className="stats-rival-edge-label">avantage</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="stats-rival-grid">
                        <div className="stats-rival-stat">
                          <span className="font-display stats-rival-stat-value">{o.gamesPlayed}</span>
                          <span className="stats-rival-stat-label">Parties</span>
                        </div>
                        <div className="stats-rival-stat">
                          <span className="font-display stats-rival-stat-value">{o.roundsWon}</span>
                          <span className="stats-rival-stat-label">Rounds gagnés</span>
                        </div>
                        <div className="stats-rival-stat">
                          <span className="font-display stats-rival-stat-value text-success">
                            {o.timesFinishedBehind}
                          </span>
                          <span className="stats-rival-stat-label">Vous devant</span>
                        </div>
                        <div className="stats-rival-stat">
                          <span className="font-display stats-rival-stat-value text-danger">
                            {o.timesFinishedAhead}
                          </span>
                          <span className="stats-rival-stat-label">Lui devant</span>
                        </div>
                      </div>
                    </SectionCard>
                  )
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </ScreenShell>
  )
}
