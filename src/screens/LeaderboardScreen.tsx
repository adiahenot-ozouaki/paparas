import { useState } from 'react'
import type { Screen } from '../types'
import { useGame, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'

// ==========================================================================
// LeaderboardScreen — honnêteté sur ce qui est réel vs démonstration.
//
// Un vrai classement global suppose un backend qui agrège les scores de
// TOUS les joueurs — ça n'existe pas encore (voir game/GameContext : tout
// est local à l'appareil). Faire semblant avec 8 faux joueurs mélangés à
// l'utilisateur réel serait trompeur.
//
// Compromis retenu en attendant le backend : la ligne "Vous" utilise les
// vraies statistiques (lifetimeStats), les autres lignes restent des
// exemples mais sont explicitement marquées "DÉMO" pour ne jamais être
// confondues avec de vraies données. Le classement se recalcule autour
// du score réel de l'utilisateur.
// ==========================================================================

const TABS = ['Global', 'Amis', 'Local', 'Hebdo']

interface LeaderboardEntry {
  name: string
  avatar: string
  level: number
  victories: number
  score: number
  isYou: boolean
  isDemo: boolean
  rank: number
}

const DEMO_OPPONENTS: Omit<LeaderboardEntry, 'isYou' | 'isDemo'>[] = [
  { name: 'MaestroKing', avatar: '👑', level: 42, victories: 892, score: 124500 },
  { name: 'GaramLord', avatar: '🦅', level: 38, victories: 741, score: 98200 },
  { name: 'PaparasAce', avatar: '🐆', level: 35, victories: 668, score: 87400 },
  { name: 'Binu_Pro', avatar: '🐊', level: 22, victories: 187, score: 41200 },
  { name: 'CardMaster', avatar: '🎯', level: 20, victories: 162, score: 38900 },
  { name: 'Goju_Fast', avatar: '⚡', level: 19, victories: 155, score: 35100 },
  { name: 'LebeDev', avatar: '🔥', level: 18, victories: 143, score: 31400 },
]

const RANK_EMOJI = ['🥇', '🥈', '🥉']
const RANK_COLORS = ['#D6A84F', '#C0C0C0', '#CD7F32']
const WINS_PER_LEVEL = 5

export default function LeaderboardScreen({ onNavigate: _onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [activeTab, setActiveTab] = useState(0)
  const { lifetimeStats } = useGame()

  const you: Omit<LeaderboardEntry, 'rank'> = {
    name: 'Vous',
    avatar: SEAT_AVATARS[HUMAN_INDEX],
    level: 1 + Math.floor(lifetimeStats.gamesWon / WINS_PER_LEVEL),
    victories: lifetimeStats.gamesWon,
    score: Math.max(0, lifetimeStats.netGainTotal),
    isYou: true,
    isDemo: false,
  }

  const players: LeaderboardEntry[] = [you, ...DEMO_OPPONENTS.map(p => ({ ...p, isYou: false, isDemo: true }))]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }))

  const podium = players.slice(0, 3)

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
        <p style={{ color: '#A9B0B7', fontSize: 14, margin: '0 0 8px' }}>Les meilleurs joueurs Garam</p>
        <p style={{ color: '#5b636b', fontSize: 11, margin: '0 0 20px' }}>
          Classement local — les joueurs marqués « DÉMO » sont des exemples en attendant le classement en ligne.
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

      {/* Top 3 podium */}
      <div className="anim-fade-in-up" style={{ padding: '24px 20px 0' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(18,60,50,0.4), rgba(16,21,26,0.8))',
          border: '1px solid rgba(214,168,79,0.15)',
          borderRadius: 20,
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'flex-end',
          gap: 8,
          marginBottom: 16,
        }}>
          {/* 2nd */}
          {podium[1] && (
            <div style={{ textAlign: 'center', flex: 1 }}>
              <span style={{ fontSize: 24 }}>{RANK_EMOJI[1]}</span>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: 'rgba(192,192,192,0.1)',
                border: '2px solid rgba(192,192,192,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                margin: '6px auto 6px',
              }}>
                {podium[1].avatar}
              </div>
              <p className="font-display" style={{ color: '#fff', fontSize: 12, fontWeight: 700, margin: '0 0 2px' }}>{podium[1].name}</p>
              <p style={{ color: RANK_COLORS[1], fontSize: 11, fontWeight: 700, margin: 0 }}>{podium[1].victories} 🏆</p>
            </div>
          )}

          {/* 1st */}
          {podium[0] && (
            <div style={{ textAlign: 'center', flex: 1 }}>
              <span style={{ fontSize: 30 }}>{RANK_EMOJI[0]}</span>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: 'rgba(214,168,79,0.1)',
                border: '2.5px solid #D6A84F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                margin: '6px auto 8px',
                boxShadow: '0 0 20px rgba(214,168,79,0.25)',
              }}>
                {podium[0].avatar}
              </div>
              <p className="font-display text-gold" style={{ fontSize: 13, fontWeight: 800, margin: '0 0 2px' }}>{podium[0].name}</p>
              <p style={{ color: '#D6A84F', fontSize: 12, fontWeight: 700, margin: 0 }}>{podium[0].victories} 🏆</p>
            </div>
          )}

          {/* 3rd */}
          {podium[2] && (
            <div style={{ textAlign: 'center', flex: 1 }}>
              <span style={{ fontSize: 24 }}>{RANK_EMOJI[2]}</span>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: 'rgba(205,127,50,0.1)',
                border: '2px solid rgba(205,127,50,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                margin: '6px auto 6px',
              }}>
                {podium[2].avatar}
              </div>
              <p className="font-display" style={{ color: '#fff', fontSize: 12, fontWeight: 700, margin: '0 0 2px' }}>{podium[2].name}</p>
              <p style={{ color: RANK_COLORS[2], fontSize: 11, fontWeight: 700, margin: 0 }}>{podium[2].victories} 🏆</p>
            </div>
          )}
        </div>

        {/* Full list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {players.map((p, i) => (
            <div key={p.name} className={i < 4 ? 'anim-fade-in-up' : ''} style={{
              background: p.isYou ? 'rgba(18,60,50,0.3)' : 'rgba(255,255,255,0.04)',
              border: p.isYou ? '1px solid rgba(214,168,79,0.3)' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              animationDelay: `${i * 0.05}s`,
            }}>
              {/* Rank */}
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: p.rank <= 3 ? `${RANK_COLORS[p.rank - 1]}20` : 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {p.rank <= 3 ? (
                  <span style={{ fontSize: 18 }}>{RANK_EMOJI[p.rank - 1]}</span>
                ) : (
                  <span className="font-display" style={{ color: '#A9B0B7', fontSize: 13, fontWeight: 700 }}>#{p.rank}</span>
                )}
              </div>

              {/* Avatar */}
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                background: p.isYou ? 'linear-gradient(135deg, #123C32, #0d2a1f)' : 'rgba(255,255,255,0.08)',
                border: p.isYou ? '1.5px solid rgba(214,168,79,0.4)' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
              }}>
                {p.avatar}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p className="font-display" style={{
                    color: p.isYou ? '#D6A84F' : '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {p.name}
                  </p>
                  {p.isYou && (
                    <span style={{
                      background: 'rgba(214,168,79,0.15)',
                      color: '#D6A84F',
                      fontSize: 9,
                      padding: '1px 6px',
                      borderRadius: 99,
                      fontFamily: 'Plus Jakarta Sans',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      VOUS
                    </span>
                  )}
                  {p.isDemo && (
                    <span style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: '#5b636b',
                      fontSize: 9,
                      padding: '1px 6px',
                      borderRadius: 99,
                      fontFamily: 'Plus Jakarta Sans',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      DÉMO
                    </span>
                  )}
                </div>
                <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>
                  Niv. {p.level} · {p.victories} victoires
                </p>
              </div>

              {/* Score */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p className="font-display" style={{
                  color: p.rank === 1 ? '#D6A84F' : '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  margin: '0 0 2px',
                }}>
                  {p.score.toLocaleString('fr-FR')}
                </p>
                <p style={{ color: '#A9B0B7', fontSize: 10, margin: 0 }}>pts</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
