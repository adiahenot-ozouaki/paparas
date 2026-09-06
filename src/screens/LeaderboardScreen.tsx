import { useEffect, useState } from 'react'
import type { Screen } from '../types'
import { useGame, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { useAuth } from '../auth/AuthContext'
import { fetchOnlineLeaderboard, type LeaderboardEntry } from '../lib/online/api'
import { AlertBanner, EmptyState, PageHeader, ScreenShell, SectionCard, UiButton } from '../components/ui'

const TABS = ['Local', 'En ligne'] as const
const WINS_PER_LEVEL = 5

export default function LeaderboardScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [activeTab, setActiveTab] = useState(0)
  const { lifetimeStats } = useGame()
  const { user, profile } = useAuth()

  const [online, setOnline] = useState<LeaderboardEntry[]>([])
  const [loadingOnline, setLoadingOnline] = useState(false)
  const [onlineError, setOnlineError] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab !== 1) return
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
  const youLevel = 1 + Math.floor(lifetimeStats.gamesWon / WINS_PER_LEVEL)

  return (
    <ScreenShell>
      <PageHeader title="Classement" subtitle="Local = votre score solo · En ligne = comptes réels" />

      <div style={{ padding: '0 20px' }}>
        <div className="segmented">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              className={`segmented-btn${activeTab === i ? ' is-active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="anim-fade-in-up" style={{ padding: '24px 20px 0' }}>
        {activeTab === 0 && (
          <>
            <p style={{ color: '#5b636b', fontSize: 12, margin: '0 0 12px', lineHeight: 1.4 }}>
              Une seule ligne ici : le classement local ne compare que vous-même (appareil).
            </p>

            <SectionCard variant="green" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(214,168,79,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 18,
                }}
              >
                🥇
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #123C32, #0d2a1f)',
                  border: '1.5px solid rgba(214,168,79,0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {youAvatar}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p className="font-display" style={{ color: '#D6A84F', fontSize: 15, fontWeight: 700, margin: 0 }}>
                    {youName}
                  </p>
                  <span
                    style={{
                      background: 'rgba(214,168,79,0.15)',
                      color: '#D6A84F',
                      fontSize: 9,
                      padding: '1px 6px',
                      borderRadius: 99,
                      fontFamily: 'Plus Jakarta Sans',
                      fontWeight: 700,
                    }}
                  >
                    VOUS
                  </span>
                </div>
                <p style={{ color: '#A9B0B7', fontSize: 12, margin: '2px 0 0' }}>
                  Niv. {youLevel} · {lifetimeStats.gamesWon} victoire{lifetimeStats.gamesWon > 1 ? 's' : ''} ·{' '}
                  {lifetimeStats.gamesPlayed} partie{lifetimeStats.gamesPlayed > 1 ? 's' : ''}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p className="font-display" style={{ color: '#D6A84F', fontSize: 16, fontWeight: 700, margin: '0 0 2px' }}>
                  {lifetimeStats.netGainTotal.toLocaleString('fr-FR')}
                </p>
                <p style={{ color: '#A9B0B7', fontSize: 10, margin: 0 }}>gains nets</p>
              </div>
            </SectionCard>

            {lifetimeStats.gamesPlayed === 0 ? (
              <EmptyState
                title="Pas encore de parties solo"
                description="Terminez une partie pour faire progresser ce score."
              />
            ) : (
              <p style={{ color: '#5b636b', fontSize: 11, margin: 0, textAlign: 'center' }}>
                Pour vous comparer aux autres → onglet <strong style={{ color: '#A9B0B7' }}>En ligne</strong>
              </p>
            )}
          </>
        )}

        {activeTab === 1 && (
          <>
            {!user ? (
              <EmptyState
                title="Connexion requise"
                description="Le classement en ligne utilise les stats réelles des comptes."
                dashed={false}
                action={
                  <UiButton onClick={() => onNavigate('auth')}>Se connecter</UiButton>
                }
              />
            ) : loadingOnline ? (
              <p style={{ color: '#A9B0B7', textAlign: 'center', fontSize: 13 }}>Chargement…</p>
            ) : onlineError ? (
              <AlertBanner tone="error">{onlineError}</AlertBanner>
            ) : online.length === 0 ? (
              <EmptyState
                title="Classement vide"
                description="Aucune statistique serveur pour l’instant. Jouez connecté pour apparaître ici."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {online.map((e, i) => {
                  const isYou = user && e.userId === user.id
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
                  return (
                    <SectionCard
                      key={e.userId}
                      variant={isYou ? 'green' : 'default'}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}
                    >
                      <span style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 16 : 12, color: '#A9B0B7' }}>
                        {medal}
                      </span>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: 'rgba(255,255,255,0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                        }}
                      >
                        {e.avatar}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          className="font-display"
                          style={{ color: isYou ? '#D6A84F' : '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}
                        >
                          {e.username}
                          {isYou ? ' (vous)' : ''}
                        </p>
                        <p style={{ color: '#A9B0B7', fontSize: 11, margin: '2px 0 0' }}>
                          {e.totalRoundsWon} round{e.totalRoundsWon > 1 ? 's' : ''} gagné
                          {e.totalRoundsWon > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p className="font-display" style={{ color: '#D6A84F', fontSize: 14, fontWeight: 700, margin: 0 }}>
                          {e.netGainTotal.toLocaleString('fr-FR')}
                        </p>
                        <p style={{ color: '#5b636b', fontSize: 10, margin: 0 }}>net</p>
                      </div>
                    </SectionCard>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </ScreenShell>
  )
}
