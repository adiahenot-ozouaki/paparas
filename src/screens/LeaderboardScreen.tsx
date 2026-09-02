import { useState } from 'react'
import type { Screen } from '../types'
import { useGame, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'

// ==========================================================================
// LeaderboardScreen — classement local uniquement.
//
// Un vrai classement global suppose un backend qui agrège les scores de
// tous les joueurs — ça n'existe pas encore. On n'invente plus de lignes
// « DÉMO » : seul le joueur local (lifetimeStats) est affiché, avec un
// message clair tant que le classement en ligne n'existe pas.
// ==========================================================================

const TABS = ['Local', 'Global', 'Amis', 'Hebdo']
const WINS_PER_LEVEL = 5

export default function LeaderboardScreen({ onNavigate: _onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [activeTab, setActiveTab] = useState(0)
  const { lifetimeStats } = useGame()

  const you = {
    name: 'Vous',
    avatar: SEAT_AVATARS[HUMAN_INDEX],
    level: 1 + Math.floor(lifetimeStats.gamesWon / WINS_PER_LEVEL),
    victories: lifetimeStats.gamesWon,
    score: Math.max(0, lifetimeStats.netGainTotal),
    rank: 1,
  }

  const isLocalTab = activeTab === 0

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
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '0.02em' }}>
          Classement
        </h1>
        <p style={{ color: '#A9B0B7', fontSize: 14, margin: '0 0 8px' }}>Votre progression locale</p>
        <p style={{ color: '#5b636b', fontSize: 11, margin: '0 0 20px' }}>
          Classement en ligne bientôt disponible. Pour l'instant, seules vos statistiques locales sont affichées.
        </p>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 14,
          padding: 4,
        }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
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
        {!isLocalTab ? (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '28px 20px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 28, margin: '0 0 10px' }}>🌐</p>
            <p className="font-display" style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>
              Bientôt disponible
            </p>
            <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>
              Le classement {TABS[activeTab].toLowerCase()} sera branché dès que le backend multijoueur sera en place.
            </p>
          </div>
        ) : (
          <>
            {/* Carte joueur local */}
            <div style={{
              background: 'rgba(18,60,50,0.35)',
              border: '1px solid rgba(214,168,79,0.3)',
              borderRadius: 16,
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'rgba(214,168,79,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 18 }}>🥇</span>
              </div>

              <div style={{
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
              }}>
                {you.avatar}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p className="font-display" style={{ color: '#D6A84F', fontSize: 15, fontWeight: 700, margin: 0 }}>
                    {you.name}
                  </p>
                  <span style={{
                    background: 'rgba(214,168,79,0.15)',
                    color: '#D6A84F',
                    fontSize: 9,
                    padding: '1px 6px',
                    borderRadius: 99,
                    fontFamily: 'Plus Jakarta Sans',
                    fontWeight: 700,
                  }}>
                    VOUS
                  </span>
                </div>
                <p style={{ color: '#A9B0B7', fontSize: 12, margin: '2px 0 0' }}>
                  Niv. {you.level} · {you.victories} victoire{you.victories > 1 ? 's' : ''}
                </p>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p className="font-display" style={{ color: '#D6A84F', fontSize: 16, fontWeight: 700, margin: '0 0 2px' }}>
                  {you.score.toLocaleString('fr-FR')}
                </p>
                <p style={{ color: '#A9B0B7', fontSize: 10, margin: 0 }}>pts (gains nets)</p>
              </div>
            </div>

            {lifetimeStats.gamesPlayed === 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '14px 16px',
                textAlign: 'center',
              }}>
                <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>
                  Jouez votre première partie pour faire progresser votre score local.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
