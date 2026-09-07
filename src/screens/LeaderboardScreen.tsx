import { useEffect, useState } from 'react'
import type { Screen } from '../types'
import { useGame, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { useAuth } from '../auth/AuthContext'
import { getPlayerProgress } from '../game/progression'
import { fetchOnlineLeaderboard, type LeaderboardEntry } from '../lib/online/api'
import { AlertBanner, EmptyState, PageHeader, ScreenShell, SectionCard, Segmented, UiButton } from '../components/ui'

type LbTab = 'local' | 'online'

const LB_TAB_OPTIONS: { id: LbTab; label: string }[] = [
  { id: 'local', label: 'Local' },
  { id: 'online', label: 'En ligne' },
]

function OnlineRow({
  e,
  rank,
  isYou,
}: {
  e: LeaderboardEntry
  rank: number
  isYou: boolean
}) {
  const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}`
  return (
    <SectionCard variant={isYou ? 'green' : 'default'} className="lb-row lb-row--tight">
      <span className={`lb-medal lb-medal--rank${rank < 3 ? ' is-top' : ''}`}>{medal}</span>
      <div className="lb-avatar lb-avatar--sm">{e.avatar}</div>
      <div className="lb-meta">
        <p className={`font-display lb-name lb-name--plain${isYou ? ' lb-name--you' : ''}`}>
          {e.username}
          {isYou ? ' (vous)' : ''}
        </p>
        <p className="lb-sub lb-sub--sm">
          {e.totalRoundsWon} round{e.totalRoundsWon > 1 ? 's' : ''} gagné
          {e.totalRoundsWon > 1 ? 's' : ''}
        </p>
      </div>
      <div className="lb-score">
        <p className="font-display lb-score-value lb-score-value--sm">
          {e.netGainTotal.toLocaleString('fr-FR')}
        </p>
        <p className="lb-score-label lb-score-label--dim">net</p>
      </div>
    </SectionCard>
  )
}

export default function LeaderboardScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [activeTab, setActiveTab] = useState<LbTab>('local')
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
    void fetchOnlineLeaderboard(40).then(res => {
      if (cancelled) return
      setLoadingOnline(false)
      if (res.error) setOnlineError(res.error)
      else setOnline(res.entries)
    })
    return () => {
      cancelled = true
    }
  }, [activeTab, user])

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
          <PageHeader title="Classement" subtitle="Local = votre score solo · En ligne = comptes réels" />

          <div className="lb-pad">
            <Segmented
              aria-label="Type de classement"
              value={activeTab}
              onChange={setActiveTab}
              options={LB_TAB_OPTIONS}
            />
          </div>

          {activeTab === 'local' && (
            <SectionCard variant="green" className="lb-row lb-you-card">
              <div className="lb-medal">🥇</div>
              <div className="lb-avatar">{youAvatar}</div>
              <div className="lb-meta">
                <div className="lb-name-row">
                  <p className="font-display lb-name">{youName}</p>
                  <span className="lb-you-pill">VOUS</span>
                </div>
                <p className="lb-sub">
                  Niv. {progress.level} · {progress.title} · {lifetimeStats.gamesWon} victoire
                  {lifetimeStats.gamesWon > 1 ? 's' : ''} · {lifetimeStats.gamesPlayed} partie
                  {lifetimeStats.gamesPlayed > 1 ? 's' : ''}
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
                const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉'
                return (
                  <SectionCard
                    key={e.userId}
                    variant={isYou || rank === 0 ? 'green' : 'default'}
                    className={`lb-podium-card${rank === 0 ? ' is-first' : ''}`}
                  >
                    <span className="lb-podium-rank">{medal}</span>
                    <div className="lb-podium-avatar">{e.avatar}</div>
                    <p className="font-display lb-podium-name">
                      {e.username}
                      {isYou ? ' (vous)' : ''}
                    </p>
                    <p className="font-display lb-podium-score">
                      {e.netGainTotal.toLocaleString('fr-FR')}
                    </p>
                    <p className="lb-podium-sub">
                      {e.totalRoundsWon} round{e.totalRoundsWon > 1 ? 's' : ''}
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
                  Une seule ligne ici : le classement local ne compare que vous-même (appareil).
                </p>

                {lifetimeStats.gamesPlayed === 0 ? (
                  <EmptyState
                    title="Pas encore de parties solo"
                    description="Terminez une partie pour faire progresser ce score."
                  />
                ) : (
                  <p className="lb-hint lb-hint--center">
                    Pour vous comparer aux autres → onglet{' '}
                    <strong style={{ color: '#A9B0B7' }}>En ligne</strong>
                  </p>
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
                      return <OnlineRow key={e.userId} e={e} rank={rank} isYou={isYou} />
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
