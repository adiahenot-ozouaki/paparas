import { useState } from 'react'
import type { Screen } from '../types'
import { useGame } from '../game/GameContext'

const PLAYERS = [
  { name: 'Vous', avatar: '🦅', capital: 47500, ready: true, isYou: true },
  { name: 'Binu', avatar: '🐆', capital: 38200, ready: true, isYou: false },
  { name: 'Lebe', avatar: '🦁', capital: 21000, ready: false, isYou: false },
  { name: 'Goju', avatar: '🐊', capital: 55000, ready: false, isYou: false },
]

export default function LobbyScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { startNewGame, stakeConfig } = useGame()
  const [ready, setReady] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  function enterTable() {
    // Nouvelle partie : capitaux réinitialisés, round 1 distribué.
    // (Les valeurs ci-dessus dans PLAYERS ne sont que la mise en scène du
    // lobby — la vraie table démarre avec le capital de départ configuré,
    // voir game/GameContext.tsx.)
    startNewGame()
    onNavigate('gameTable')
  }

  const handleReady = () => {
    setReady(true)
    let count = 3
    setCountdown(count)
    const interval = setInterval(() => {
      count--
      if (count === 0) {
        clearInterval(interval)
        setCountdown(null)
        enterTable()
      } else {
        setCountdown(count)
      }
    }, 1000)
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: '#0B0D10',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div className="pattern-african" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      {/* Countdown overlay */}
      {countdown !== null && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(11,13,16,0.92)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="anim-scale-bounce" style={{
            fontSize: 120,
            fontFamily: 'Plus Jakarta Sans',
            fontWeight: 800,
            lineHeight: 1,
          }}>
            <span className="text-gold">{countdown}</span>
          </div>
          <p style={{ color: '#A9B0B7', fontSize: 16, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.12em', marginTop: 16 }}>
            LA PARTIE COMMENCE...
          </p>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '20px 20px 0', position: 'relative' }}>
        <button onClick={() => onNavigate('gameMode')} style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          width: 40,
          height: 40,
          color: '#fff',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          ←
        </button>
      </div>
        
      <div style={{ padding: '20px', flex: 1, gap: 10 }}>
        {!ready ? (
          <button
            className="btn-primary glow-gold"
            onClick={handleReady}
            style={{ padding: '18px', fontSize: 16, borderRadius: 18, letterSpacing: '0.1em' }}
          >
            ✓  PRÊT
          </button>
        ) : (
          <button
            className="btn-primary glow-gold"
            onClick={enterTable}
            style={{ padding: '18px', fontSize: 16, borderRadius: 18, letterSpacing: '0.1em' }}
          >
            LANCER LA PARTIE →
          </button>
        )}</div>
      {/* Table info */}
      <div style={{ padding: '0 20px', position: 'relative' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(18,60,50,0.7) 0%, rgba(16,21,26,0.8) 100%)',
          border: '1px solid rgba(214,168,79,0.25)',
          borderRadius: 20,
          padding: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <p style={{ color: '#A9B0B7', fontSize: 11, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.1em', margin: '0 0 4px' }}>
                TABLE
              </p>
              <h2 className="text-gold font-display" style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '0.06em' }}>
                GARAM VIP
              </h2>
            </div>
            <div style={{
              background: 'rgba(76,175,118,0.15)',
              border: '1px solid rgba(76,175,118,0.3)',
              borderRadius: 10,
              padding: '6px 12px',
            }}>
              <span style={{ color: '#4CAF76', fontSize: 12, fontFamily: 'Plus Jakarta Sans', fontWeight: 600 }}>● EN ATTENTE</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <p style={{ color: '#A9B0B7', fontSize: 11, margin: '0 0 2px' }}>Joueurs</p>
              <p className="font-display" style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
                {PLAYERS.length} / 4
              </p>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div>
              <p style={{ color: '#A9B0B7', fontSize: 11, margin: '0 0 2px' }}>Mise</p>
              <p className="font-display text-gold" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                {stakeConfig.baseStake.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div>
              <p style={{ color: '#A9B0B7', fontSize: 11, margin: '0 0 2px' }}>Capital de départ</p>
              <p className="font-display" style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
                {stakeConfig.startingCapital.toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Players */}
      <div style={{ padding: '20px 20px 0', flex: 1 }}>
        <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: '#fff' }}>
          Joueurs ({PLAYERS.length}/4)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PLAYERS.map((p, i) => (
            <div key={i} className="anim-fade-in-up" style={{
              background: p.isYou ? 'rgba(18,60,50,0.4)' : 'rgba(255,255,255,0.04)',
              border: p.isYou ? '1px solid rgba(214,168,79,0.3)' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              animationDelay: `${i * 0.08}s`,
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #123C32, #0d2a1f)',
                  border: `1.5px solid ${p.isYou ? 'rgba(214,168,79,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}>
                  {p.avatar}
                </div>
                {p.ready && (
                  <div style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#4CAF76',
                    border: '2px solid #0B0D10',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                  }}>
                    ✓
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p className="font-display" style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>
                    {p.name}
                  </p>
                  {p.isYou && (
                    <span style={{
                      background: 'rgba(214,168,79,0.15)',
                      color: '#D6A84F',
                      fontSize: 9,
                      padding: '2px 8px',
                      borderRadius: 99,
                      fontFamily: 'Plus Jakarta Sans',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                    }}>
                      VOUS
                    </span>
                  )}
                </div>
                <p style={{ color: '#A9B0B7', fontSize: 12, margin: '2px 0 0' }}>
                  {p.capital.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div style={{
                background: p.ready ? 'rgba(76,175,118,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${p.ready ? 'rgba(76,175,118,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 10,
                padding: '5px 12px',
              }}>
                <span style={{
                  color: p.ready ? '#4CAF76' : '#A9B0B7',
                  fontSize: 11,
                  fontFamily: 'Plus Jakarta Sans',
                  fontWeight: 600,
                }}>
                  {p.ready ? 'Prêt' : 'En attente'}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Bottom actions */}
      <div style={{ padding: '20px', flex: 1, gap: 10 }}>
        {!ready ? (
          <button
            className="btn-primary glow-gold"
            onClick={handleReady}
            style={{ padding: '18px', fontSize: 16, borderRadius: 18, letterSpacing: '0.1em' }}
          >
            ✓  PRÊT
          </button>
        ) : (
          <button
            className="btn-primary glow-gold"
            onClick={enterTable}
            style={{ padding: '18px', fontSize: 16, borderRadius: 18, letterSpacing: '0.1em' }}
          >
            LANCER LA PARTIE →
          </button>
        )}
        <button
          className="btn-secondary"
          onClick={() => onNavigate('gameMode')}
          style={{ padding: '14px', fontSize: 14, borderRadius: 14 }}
        >
          Quitter la table
        </button>
      </div>
    </div>
  )
}
