import { useEffect, useState } from 'react'
import type { Screen } from '../types'
import { getActiveOnlineTableId } from '../lib/online/session'

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
  const [hasOnlineTable, setHasOnlineTable] = useState(() => Boolean(getActiveOnlineTableId()))

  useEffect(() => {
    const refresh = () => setHasOnlineTable(Boolean(getActiveOnlineTableId()))
    refresh()
    const id = window.setInterval(refresh, 2000)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', refresh)
    }
  }, [active])

  function handlePlayClick() {
    // Table online mémorisée → reprendre (lobby route vers table si déjà playing)
    if (hasOnlineTable) {
      onNavigate('onlineLobby')
      return
    }
    onNavigate('gameMode')
  }

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
        zIndex: 50,
        maxWidth: '100%',
      }}
    >
      {ITEMS.map(item => {
        const isActive =
          active === item.id ||
          (item.highlight &&
            (active === 'onlineLobby' || active === 'onlineGameTable' || active === 'lobby' || active === 'gameTable'))

        if (item.highlight) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={handlePlayClick}
              aria-label={hasOnlineTable ? 'Reprendre la table en ligne' : item.label}
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
                boxShadow: hasOnlineTable
                  ? '0 4px 24px rgba(76,175,118,0.45)'
                  : '0 4px 20px rgba(214,168,79,0.4)',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 9, letterSpacing: '0.08em' }}>
                {hasOnlineTable ? 'TABLE' : item.label}
              </span>
              {hasOnlineTable && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#4CAF76',
                    border: '2px solid #0B0D10',
                    boxShadow: '0 0 8px rgba(76,175,118,0.9)',
                  }}
                />
              )}
            </button>
          )
        }

        return (
          <button
            key={item.id}
            type="button"
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
