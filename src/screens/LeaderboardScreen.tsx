import { useEffect, useState } from 'react'
import type { Screen } from '../types'
import { useGame, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { useAuth } from '../auth/AuthContext'
import { fetchOnlineLeaderboard, type LeaderboardEntry } from '../lib/online/api'

// ==========================================================================
// LeaderboardScreen — Local (vous seul, normal) + En ligne (kora_lifetime_stats).
// ==========================================================================

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
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '0.02em' }}>
          Classement
        </h1>
        <p style={{ color: '#A9B0B7', fontSize: 14, margin: '0 0 16px' }}>
          Local = votre score solo · En ligne = comptes réels
        </p>

        <div
          style={{
            display: 'flex',
            gap: 4,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 14,
            padding: 4,
          }}
        >
          {TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(i)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 10,
                border: 'none',
                background: activeTab === i ? '#D6A84F' : 'transparent',
                color: activeTab === i ? '#0B0D10' : '#A9B0B7',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: activeTab === i ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
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

            <div
              style={{
                background: 'rgba(18,60,50,0.35)',
                border: '1px solid rgba(214,168,79,0.3)',
                borderRadius: 16,
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}
            >
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
            </div>

            {lifetimeStats.gamesPlayed === 0 ? (
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 6px' }}>Pas encore de parties solo</p>
                <p style={{ color: '#5b636b', fontSize: 12, margin: 0 }}>
                  Terminez une partie pour faire progresser ce score.
                </p>
              </div>
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
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  padding: '28px 20px',
                  textAlign: 'center',
                }}
              >
                <p className="font-display" style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>
                  Connexion requise
                </p>
                <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 16px' }}>
                  Le classement en ligne utilise les stats réelles des comptes.
                </p>
                <button
                  type="button"
                  className="btn-primary glow-gold"
                  onClick={() => onNavigate('auth')}
                  style={{ padding: '12px 24px', borderRadius: 14, fontSize: 13 }}
                >
                  Se connecter
                </button>
              </div>
            ) : loadingOnline ? (
              <p style={{ color: '#A9B0B7', textAlign: 'center', fontSize: 13 }}>Chargement…</p>
            ) : onlineError ? (
              <div
                style={{
                  background: 'rgba(201,75,75,0.1)',
                  border: '1px solid rgba(201,75,75,0.3)',
                  borderRadius: 14,
                  padding: '14px',
                  textAlign: 'center',
                }}
              >
                <p style={{ color: '#E8A0A0', fontSize: 13, margin: 0 }}>{onlineError}</p>
              </div>
            ) : online.length === 0 ? (
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  padding: '20px 16px',
                  textAlign: 'center',
                }}
              >
                <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 6px' }}>Classement vide</p>
                <p style={{ color: '#5b636b', fontSize: 12, margin: 0 }}>
                  Aucune statistique serveur pour l’instant. Jouez connecté pour apparaître ici.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {online.map((e, i) => {
                  const isYou = user && e.userId === user.id
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
                  return (
                    <div
                      key={e.userId}
                      style={{
                        background: isYou ? 'rgba(18,60,50,0.35)' : 'rgba(255,255,255,0.04)',
                        border: isYou ? '1px solid rgba(214,168,79,0.3)' : '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 14,
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
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
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
