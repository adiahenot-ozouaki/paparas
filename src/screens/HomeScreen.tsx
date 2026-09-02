import { useState } from 'react'
import type { Screen } from '../types'
import { useGame, HUMAN_INDEX, SEAT_AVATARS } from '../game/GameContext'

export default function HomeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { players, lifetimeStats } = useGame()
  const capital = players[HUMAN_INDEX].capital
  const winRatio = lifetimeStats.gamesPlayed > 0
    ? ((lifetimeStats.gamesWon / lifetimeStats.gamesPlayed) * 100).toFixed(1)
    : '0.0'
  const [showMoneyAnim, setShowMoneyAnim] = useState(false)

  const handlePlay = () => {
    setShowMoneyAnim(true)
    setTimeout(() => onNavigate('gameMode'), 400)
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, #10151A 0%, #0B0D10 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      paddingBottom: 80,
    }}>
      {/* Pattern overlay */}
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.6 }} />

      {/* Top ambient */}
      <div style={{
        position: 'fixed',
        top: -80,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(23,107,80,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div className="anim-fade-in-down" style={{
        padding: '16px 20px 0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'relative',
      }}>
        {/* Avatar */}
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #176B50, #123C32)',
          border: '2px solid rgba(214,168,79,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          flexShrink: 0,
        }}>
          {SEAT_AVATARS[HUMAN_INDEX]}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#A9B0B7', fontSize: 11, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.05em', margin: 0 }}>
            Bienvenue
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
              Vous
            </h3>
            <span style={{
              background: 'linear-gradient(135deg, #D6A84F, #C08030)',
              color: '#0B0D10',
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 99,
              fontFamily: 'Plus Jakarta Sans',
              letterSpacing: '0.04em',
            }}>
              Niv. {1 + Math.floor(lifetimeStats.gamesWon / 5)}
            </span>
          </div>
        </div>
        {/* Profil rapide — plus de badge notifications fictif */}
        <button
          onClick={() => onNavigate('profile')}
          aria-label="Profil"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            width: 42,
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 18 }}>👤</span>
        </button>
      </div>

      {/* Capital card */}
      <div className="anim-fade-in-up" style={{
        margin: '16px 20px 0',
        background: 'linear-gradient(135deg, rgba(18,60,50,0.8) 0%, rgba(16,21,26,0.9) 100%)',
        border: '1px solid rgba(214,168,79,0.25)',
        borderRadius: 20,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backdropFilter: 'blur(10px)',
        animationDelay: '0.1s',
      }}>
        <div>
          <p style={{ color: '#A9B0B7', fontSize: 11, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.08em', margin: '0 0 4px' }}>
            CAPITAL
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className={`font-display text-gold${showMoneyAnim ? ' anim-scale-bounce' : ''}`} style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
              {capital.toLocaleString('fr-FR')}
            </span>
            <span style={{ color: '#A9B0B7', fontSize: 13, fontWeight: 500 }}>FCFA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <span style={{
              color: lifetimeStats.netGainTotal >= 0 ? '#4CAF76' : '#C94B4B',
              fontSize: 11,
              fontWeight: 600,
            }}>
              {lifetimeStats.netGainTotal >= 0 ? '↑' : '↓'} {lifetimeStats.netGainTotal >= 0 ? '+' : ''}
              {lifetimeStats.netGainTotal.toLocaleString('fr-FR')}
            </span>
            <span style={{ color: '#A9B0B7', fontSize: 11 }}>net cumulé</span>
          </div>
        </div>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(214,168,79,0.2), rgba(214,168,79,0.05))',
          border: '1px solid rgba(214,168,79,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
        }}>
          💰
        </div>
      </div>

      {/* Hero section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 20px 20px',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 20,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(23,107,80,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 28,
          position: 'relative',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 4,
          }}>
            <div style={{ width: 28, height: 1.5, background: 'linear-gradient(90deg, transparent, rgba(214,168,79,0.6))' }} />
            <span style={{ color: 'rgba(214,168,79,0.5)', fontSize: 16 }}>♠</span>
            <div style={{ width: 28, height: 1.5, background: 'linear-gradient(90deg, rgba(214,168,79,0.6), transparent)' }} />
          </div>
          <h1 className="text-shimmer font-display" style={{ fontSize: 48, fontWeight: 800, letterSpacing: '0.15em', margin: 0, lineHeight: 1 }}>
            GARAM
          </h1>
          <p style={{ color: '#A9B0B7', fontSize: 12, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.32em', marginTop: 4 }}>
            PAPARAS
          </p>
        </div>

        <button
          className="btn-primary glow-gold"
          onClick={handlePlay}
          style={{
            width: '100%',
            maxWidth: 320,
            padding: '20px 0',
            fontSize: 20,
            borderRadius: 20,
            letterSpacing: '0.12em',
            marginBottom: 16,
            boxShadow: '0 8px 32px rgba(214,168,79,0.4)',
          }}
        >
          JOUER
        </button>

        <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 320 }}>
          {[
            { label: 'Partie rapide', icon: '⚡', screen: 'stakeConfig' as Screen },
            { label: 'Classement', icon: '🏆', screen: 'leaderboard' as Screen },
            { label: 'Règles', icon: '📖', screen: 'rules' as Screen },
          ].map(item => (
            <button
              key={item.label}
              className="btn-secondary"
              onClick={() => onNavigate(item.screen)}
              style={{
                flex: 1,
                padding: '10px 4px',
                fontSize: 11,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                borderRadius: 14,
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: 12,
        padding: '0 20px',
        marginTop: 8,
      }}>
        {[
          { label: 'Parties', value: String(lifetimeStats.gamesPlayed), icon: '🎮' },
          { label: 'Victoires', value: String(lifetimeStats.gamesWon), icon: '🏆' },
          { label: 'Ratio', value: `${winRatio}%`, icon: '📈' },
        ].map(stat => (
          <div key={stat.label} style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            padding: '12px 8px',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: 20 }}>{stat.icon}</span>
            <p className="font-display" style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: '4px 0 2px' }}>
              {stat.value}
            </p>
            <p style={{ color: '#A9B0B7', fontSize: 11 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontFamily: 'Plus Jakarta Sans', fontWeight: 700, margin: 0 }}>
            Activité récente
          </h3>
          <button onClick={() => onNavigate('stats')} style={{ color: '#D6A84F', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans', fontWeight: 600 }}>
            Voir tout →
          </button>
        </div>

        {lifetimeStats.gamesPlayed === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            padding: '16px',
            textAlign: 'center',
          }}>
            <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>
              Aucune partie jouée pour l'instant — lancez votre première partie !
            </p>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: '#A9B0B7', fontSize: 13 }}>
              {lifetimeStats.gamesWon} victoire{lifetimeStats.gamesWon > 1 ? 's' : ''} sur {lifetimeStats.gamesPlayed} partie{lifetimeStats.gamesPlayed > 1 ? 's' : ''}
            </span>
            <span style={{
              color: lifetimeStats.netGainTotal >= 0 ? '#4CAF76' : '#C94B4B',
              fontFamily: 'Plus Jakarta Sans',
              fontWeight: 700,
              fontSize: 14,
            }}>
              {lifetimeStats.netGainTotal >= 0 ? '+' : ''}
              {lifetimeStats.netGainTotal.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
