import type { Screen } from '../types'

const MODES = [
  {
    id: 'quick',
    title: 'Partie rapide',
    desc: 'Trouve automatiquement des adversaires.',
    icon: '⚡',
    color: '#D6A84F',
    cards: ['♠ A', '♥ K', '♦ Q'],
    badge: 'POPULAIRE',
  },
  {
    id: 'friends',
    title: 'Avec amis',
    desc: 'Joue contre tes contacts.',
    icon: '👥',
    color: '#176B50',
    cards: ['♠ 7', '♥ 3', '♦ J'],
    badge: null,
  },
  {
    id: 'private',
    title: 'Partie privée',
    desc: 'Crée une table et invite tes amis.',
    icon: '🔒',
    color: '#6B5B17',
    cards: ['♠ 5', '♥ 9', '♦ 4'],
    badge: null,
  },
  {
    id: 'training',
    title: 'Entraînement',
    desc: 'Affronte l\'intelligence artificielle.',
    icon: '🤖',
    color: '#2E3748',
    cards: ['♠ 2', '♥ 6', '♦ 8'],
    badge: 'GRATUIT',
  },
]

export default function GameModeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
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
        <button onClick={() => onNavigate('home')} style={{
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
          marginBottom: 20,
        }}>
          ←
        </button>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '0.02em' }}>
          Mode de jeu
        </h1>
        <p style={{ color: '#A9B0B7', fontSize: 14, margin: 0 }}>Choisis comment tu veux jouer</p>
      </div>

      {/* Mode cards */}
      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {MODES.map((mode, i) => (
          <button
            key={mode.id}
            className="anim-fade-in-up"
            onClick={() => onNavigate('stakeConfig')}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '20px',
              cursor: 'pointer',
              textAlign: 'left',
              animationDelay: `${i * 0.07}s`,
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color 0.2s, transform 0.1s',
              display: 'block',
              width: '100%',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(214,168,79,0.3)'
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
            }}
          >
            {/* Color accent corner */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 4,
              height: '100%',
              background: `linear-gradient(180deg, ${mode.color}, transparent)`,
              borderRadius: '20px 0 0 20px',
            }} />

            {/* Mini cards decoration */}
            <div style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: -6,
            }}>
              {mode.cards.map((c, ci) => (
                <div key={ci} style={{
                  width: 28,
                  height: 40,
                  background: '#F5F1E8',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: c.includes('♥') || c.includes('♦') ? '#C94B4B' : '#1a1a1a',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  transform: `rotate(${(ci - 1) * 8}deg) translateX(${ci * -6}px)`,
                  fontFamily: 'Plus Jakarta Sans',
                }}>
                  {c}
                </div>
              ))}
            </div>

            <div style={{ paddingLeft: 12, paddingRight: 100 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>{mode.icon}</span>
                <span className="font-display" style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>
                  {mode.title}
                </span>
                {mode.badge && (
                  <span style={{
                    background: mode.badge === 'POPULAIRE' ? 'rgba(214,168,79,0.2)' : 'rgba(76,175,118,0.2)',
                    color: mode.badge === 'POPULAIRE' ? '#D6A84F' : '#4CAF76',
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                    letterSpacing: '0.08em',
                    fontFamily: 'Plus Jakarta Sans',
                  }}>
                    {mode.badge}
                  </span>
                )}
              </div>
              <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>{mode.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Active tables section */}
      <div style={{ padding: '0 20px' }}>
        <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: '#fff' }}>
          Tables actives
        </h3>
        {[
          { name: 'TABLE VIP', players: '3/4', mise: '1 000', level: 'Expert' },
          { name: 'GARAM OPEN', players: '2/4', mise: '500', level: 'Standard' },
        ].map((table, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '14px 16px',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #123C32, #0d2a1f)',
              border: '1px solid rgba(214,168,79,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}>
              🃏
            </div>
            <div style={{ flex: 1 }}>
              <p className="font-display" style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 2px' }}>
                {table.name}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: '#A9B0B7', fontSize: 12 }}>{table.players} joueurs</span>
                <span style={{ color: '#A9B0B7', fontSize: 12 }}>•</span>
                <span style={{ color: '#D6A84F', fontSize: 12, fontWeight: 600 }}>{table.mise} FCFA</span>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={() => onNavigate('lobby')}
              style={{ padding: '8px 16px', fontSize: 12, borderRadius: 10 }}
            >
              Rejoindre
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
