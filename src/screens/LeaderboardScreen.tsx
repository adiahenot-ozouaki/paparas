import { useEffect, useState } from 'react'
import type { Screen } from '../types'
import { useGame, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { useAuth } from '../auth/AuthContext'
import { getPlayerProgress } from '../game/progression'
import {
  fetchOnlineLeaderboard,
  formatLeaderboardScore,
  LEADERBOARD_METRICS,
  type LeaderboardEntry,
  type LeaderboardMetric,
} from '../lib/online/api'
import { AlertBanner, EmptyState, PageHeader, ScreenShell, SectionCard, Segmented, UiButton } from '../components/ui'
import { Medal } from 'lucide-react'
import { AvatarIcon } from '../components/icons'

type LbTab = 'local' | 'online'

const LB_TAB_OPTIONS: { id: LbTab; label: string }[] = [
  { id: 'local', label: 'Local' },
  { id: 'online', label: 'En ligne' },
]

function metricSubline(e: LeaderboardEntry, metric: LeaderboardMetric): string {
  if (metric === 'elo') return `${e.gamesWon} win · ${e.totalRoundsWon} rounds`
  if (metric === 'net') return `Elo ${e.eloRating} · ${e.totalRoundsWon} rounds`
  if (metric === 'wins') return `${e.gamesPlayed} parties · Elo ${e.eloRating}`
  if (metric === 'rounds' || metric === 'tricks') return `Elo ${e.eloRating} · ${e.gamesWon} wins`
  return `${e.comboCounts.kora} Kora · ${e.comboCounts['33']}×33`
}

function OnlineRow({
  e,
  rank,
  isYou,
  metric,
}: {
  e: LeaderboardEntry
  rank: number
  isYou: boolean
  metric: LeaderboardMetric
}) {
  const medal = rank === 0 ? 'gold' : rank === 1 ? 'silver' : rank === 2 ? 'bronze' : `${rank + 1}`
  return (
    <SectionCard variant={isYou ? 'green' : 'default'} className="lb-row lb-row--tight">
      <span className={`lb-medal lb-medal--rank${rank < 3 ? ' is-top' : ''}`}>
        {rank < 3 ? (
          <Medal size={16} className={`kora-icon lb-medal-icon lb-medal-icon--${medal}`} aria-hidden />
        ) : (
          medal
        )}
      </span>
      <div className="lb-avatar lb-avatar--sm">
        <AvatarIcon avatar={e.avatar} size={28} />
      </div>
      <div className="lb-meta">
        <p className={`font-display lb-name lb-name--plain${isYou ? ' lb-name--you' : ''}`}>
          {e.username}
          {isYou ? ' (vous)' : ''}
        </p>
        <p className="lb-sub lb-sub--sm">{metricSubline(e, metric)}</p>
      </div>
      <div className="lb-score">
        <p className="font-display lb-score-value lb-score-value--sm">
          {formatLeaderboardScore(metric, e.score)}
        </p>
        <p className="lb-score-label lb-score-label--dim">
          {LEADERBOARD_METRICS.find(m => m.id === metric)?.short ?? metric}
        </p>
      </div>
    </SectionCard>
  )
}

export default function LeaderboardScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [activeTab, setActiveTab] = useState<LbTab>('local')
  const [metric, setMetric] = useState<LeaderboardMetric>('elo')
  const { lifetimeStats } = useGame()
  const { user, profile } = useAuth()

  const [online, setOnline] = useState<LeaderboardEntry[]>([])
  const [loadingOnline, setLoadingOnline] = useState(false)
  const [onlineError, setOnlineError] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab !== 'online') return
    if (!user) {
      setOnline([])
      setOnlineError(null)
      return
    }
    let cancelled = false
    setLoadingOnline(true)
    setOnlineError(null)
    void fetchOnlineLeaderboard(40, metric).then(res => {
      if (cancelled) return
      setLoadingOnline(false)
      if (res.error) setOnlineError(res.error)
      else setOnline(res.entries)
    })
    return () => {
      cancelled = true
    }
  }, [activeTab, user, metric])

  const youName = profile?.username ?? 'Vous'
  const youAvatar = profile?.avatar ?? SEAT_AVATARS[HUMAN_INDEX]
  const progress = getPlayerProgress(lifetimeStats)

  const top3 = online.slice(0, 3)
  const rest = online.slice(3)
  const podiumOrder =
    top3.length >= 3
      ? [
          { e: top3[1], rank: 1 },
          { e: top3[0], rank: 0 },
          { e: top3[2], rank: 2 },
        ]
      : top3.map((e, i) => ({ e, rank: i }))

  return (
    <ScreenShell className="lb-screen">
      <div className="lb-layout">
        <div className="lb-main">
          <PageHeader
            title="Classement"
            subtitle="Local = solo · En ligne = comptes · plusieurs critères + Elo"
          />

          <div className="lb-pad">
            <Segmented
              aria-label="Type de classement"
              value={activeTab}
              onChange={setActiveTab}
              options={LB_TAB_OPTIONS}
            />
          </div>

          {activeTab === 'online' && user && (
            <div className="lb-pad lb-metric-pad">
              <Segmented
                aria-label="Critère de classement"
                value={metric}
                onChange={setMetric}
                options={LEADERBOARD_METRICS.map(m => ({ id: m.id, label: m.short }))}
              />
            </div>
          )}

          {activeTab === 'local' && (
            <SectionCard variant="green" className="lb-row lb-you-card">
              <div className="lb-medal">
                <Medal size={20} className="kora-icon lb-medal-icon lb-medal-icon--gold" aria-hidden />
              </div>
              <div className="lb-avatar">
                <AvatarIcon avatar={youAvatar} size={36} />
              </div>
              <div className="lb-meta">
                <div className="lb-name-row">
                  <p className="font-display lb-name">{youName}</p>
                  <span className="lb-you-pill">VOUS</span>
                </div>
                <p className="lb-sub">
                  Elo {lifetimeStats.eloRating ?? 1000} · Niv. {progress.level} ·{' '}
                  {lifetimeStats.gamesWon} victoire{lifetimeStats.gamesWon > 1 ? 's' : ''}
                </p>
              </div>
              <div className="lb-score">
                <p className="font-display lb-score-value">
                  {lifetimeStats.netGainTotal.toLocaleString('fr-FR')}
                </p>
                <p className="lb-score-label">gains nets</p>
              </div>
            </SectionCard>
          )}

          {activeTab === 'online' && user && top3.length >= 3 && (
            <div className="lb-podium" aria-label="Podium">
              {podiumOrder.map(({ e, rank }) => {
                const isYou = Boolean(user && e.userId === user.id)
                const medal = rank === 0 ? 'gold' : rank === 1 ? 'silver' : 'bronze'
                return (
                  <SectionCard
                    key={e.userId}
                    variant={isYou || rank === 0 ? 'green' : 'default'}
                    className={`lb-podium-card${rank === 0 ? ' is-first' : ''}`}
                  >
                    <span className="lb-podium-rank">
                      <Medal size={22} className={`kora-icon lb-medal-icon lb-medal-icon--${medal}`} aria-hidden />
                    </span>
                    <div className="lb-podium-avatar">
                      <AvatarIcon avatar={e.avatar} size={32} />
                    </div>
                    <p className="font-display lb-podium-name">
                      {e.username}
                      {isYou ? ' (vous)' : ''}
                    </p>
                    <p className="font-display lb-podium-score">
                      {formatLeaderboardScore(metric, e.score)}
                    </p>
                    <p className="lb-podium-sub">
                      {LEADERBOARD_METRICS.find(m => m.id === metric)?.label}
                    </p>
                  </SectionCard>
                )
              })}
            </div>
          )}
        </div>

        <aside className="lb-side">
          <div className="anim-fade-in-up lb-body">
            {activeTab === 'local' && (
              <>
                <p className="lb-hint">
                  Score local appareil. Elo solo mis à jour en fin de partie contre les IA.
                </p>

                {lifetimeStats.gamesPlayed === 0 ? (
                  <EmptyState
                    title="Pas encore de parties solo"
                    description="Terminez une partie pour faire progresser ce score."
                  />
                ) : (
                  <div className="lb-local-metrics">
                    <SectionCard className="lb-local-metric">
                      <p className="font-display lb-local-value">{lifetimeStats.eloRating ?? 1000}</p>
                      <p className="lb-local-label">Elo</p>
                    </SectionCard>
                    <SectionCard className="lb-local-metric">
                      <p className="font-display lb-local-value">{lifetimeStats.gamesWon}</p>
                      <p className="lb-local-label">Victoires</p>
                    </SectionCard>
                    <SectionCard className="lb-local-metric">
                      <p className="font-display lb-local-value">{lifetimeStats.comboCounts.kora}</p>
                      <p className="lb-local-label">Kora</p>
                    </SectionCard>
                    <SectionCard className="lb-local-metric">
                      <p className="font-display lb-local-value">{lifetimeStats.comboCounts['33']}</p>
                      <p className="lb-local-label">33</p>
                    </SectionCard>
                    <SectionCard className="lb-local-metric">
                      <p className="font-display lb-local-value">{lifetimeStats.totalRoundsWon}</p>
                      <p className="lb-local-label">Rounds</p>
                    </SectionCard>
                    <SectionCard className="lb-local-metric">
                      <p className="font-display lb-local-value">{lifetimeStats.totalTricksWon}</p>
                      <p className="lb-local-label">Plis</p>
                    </SectionCard>
                  </div>
                )}
              </>
            )}

            {activeTab === 'online' && (
              <>
                {!user ? (
                  <EmptyState
                    title="Connexion requise"
                    description="Le classement en ligne utilise les stats réelles des comptes."
                    dashed={false}
                    action={<UiButton onClick={() => onNavigate('auth')}>Se connecter</UiButton>}
                  />
                ) : loadingOnline ? (
                  <p className="lb-loading">Chargement…</p>
                ) : onlineError ? (
                  <AlertBanner tone="error">{onlineError}</AlertBanner>
                ) : online.length === 0 ? (
                  <EmptyState
                    title="Classement vide"
                    description="Aucune statistique serveur pour l’instant. Jouez connecté pour apparaître ici."
                  />
                ) : (
                  <div className="lb-online-list">
                    {(top3.length >= 3 ? rest : online).map((e, i) => {
                      const rank = top3.length >= 3 ? i + 3 : i
                      const isYou = Boolean(user && e.userId === user.id)
                      return (
                        <OnlineRow key={e.userId} e={e} rank={rank} isYou={isYou} metric={metric} />
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </ScreenShell>
  )
}
