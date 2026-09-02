import type { Screen } from '../types'

interface BottomNavProps {
  active: Screen
  onNavigate: (screen: Screen) => void
}

interface NavItem {
  id: Screen
  label: string
  icon: string
  highlight?: boolean
}

const ITEMS: NavItem[] = [
  { id: 'home', label: 'Accueil', icon: '⌂' },
  { id: 'leaderboard', label: 'Classement', icon: '🏆' },
  { id: 'gameMode', label: 'JOUER', icon: '♠', highlight: true },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'profile', label: 'Profil', icon: '◉' },
]

export default function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="nav-pill"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        minHeight: 72,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingLeft: 8,
        paddingRight: 8,
        // padding-bottom géré par .nav-pill (safe-area)
        zIndex: 50,
        maxWidth: '100%',
      }}
    >
      {ITEMS.map(item => {
        const isActive = active === item.id
        if (item.highlight) {
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className="btn-primary glow-gold-sm"
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                fontSize: 11,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                marginTop: -18,
                boxShadow: '0 4px 20px rgba(214,168,79,0.4)',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 9, letterSpacing: '0.08em' }}>{item.label}</span>
            </button>
          )
        }
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '4px 8px',
              borderRadius: 12,
              transition: 'opacity 0.15s',
              opacity: isActive ? 1 : 0.45,
              position: 'relative',
              flex: '1 1 0',
              maxWidth: 96,
            }}
          >
            <span
              style={{
                fontSize: 20,
                filter: isActive ? 'none' : 'saturate(0)',
                transition: 'filter 0.2s',
              }}
            >
              {item.icon}
            </span>
            <span
              style={{
                fontSize: 10,
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#D6A84F' : '#A9B0B7',
                letterSpacing: '0.03em',
              }}
            >
              {item.label}
            </span>
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 2,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: '#D6A84F',
                  boxShadow: '0 0 6px rgba(214,168,79,0.8)',
                }}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}
