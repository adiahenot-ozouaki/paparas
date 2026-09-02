import type { Screen } from '../types'

const MODES = [
  {
    id: 'quick',
    title: 'Partie rapide',
    desc: 'Affronte trois adversaires IA immédiatement.',
    icon: '⚡',
    color: '#D6A84F',
    cards: ['♠ A', '♥ 10', '♦ 9'],
    badge: 'POPULAIRE',
  },
  {
    id: 'friends',
    title: 'Avec amis',
    desc: 'Multijoueur entre amis — bientôt disponible.',
    icon: '👥',
    color: '#176B50',
    cards: ['♠ 7', '♥ 3', '♦ 8'],
    badge: null,
    disabled: true,
  },
  {
    id: 'private',
    title: 'Partie privée',
    desc: 'Table privée sur invitation — bientôt disponible.',
    icon: '🔒',
    color: '#6B5B17',
    cards: ['♠ 5', '♥ 9', '♦ 4'],
    badge: null,
    disabled: true,
  },
  {
    id: 'training',
    title: 'Entraînement',
    desc: 'Même table IA, idéal pour apprendre les règles.',
    icon: '🤖',
    color: '#2E3748',
    cards: ['♠ 6', '♥ 6', '♦ 8'],
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
        {MODES.map((mode, i) => {
          const disabled = Boolean(mode.disabled)
          return (
            <button
              key={mode.id}
              className="anim-fade-in-up"
              disabled={disabled}
              onClick={() => {
                if (!disabled) onNavigate('stakeConfig')
              }}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: '20px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                animationDelay: `${i * 0.07}s`,
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 0.2s, transform 0.1s',
                display: 'block',
                width: '100%',
                opacity: disabled ? 0.55 : 1,
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 4,
                height: '100%',
                background: `linear-gradient(180deg, ${mode.color}, transparent)`,
                borderRadius: '20px 0 0 20px',
              }} />

              <div style={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
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
                  {disabled && (
                    <span style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: '#5b636b',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 99,
                      letterSpacing: '0.06em',
                      fontFamily: 'Plus Jakarta Sans',
                    }}>
                      BIENTÔT
                    </span>
                  )}
                </div>
                <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>{mode.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Tables actives — pas de backend matchmaking pour l'instant */}
      <div style={{ padding: '0 20px 24px' }}>
        <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: '#fff' }}>
          Tables actives
        </h3>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '18px 16px',
          textAlign: 'center',
        }}>
          <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 6px' }}>
            Aucune table publique pour le moment.
          </p>
          <p style={{ color: '#5b636b', fontSize: 12, margin: 0 }}>
            Lancez une partie rapide pour jouer contre l'IA.
          </p>
        </div>
      </div>
    </div>
  )
}
