import { useEffect, useState } from 'react'
import type { Screen } from '../types'
import { getActiveOnlineTableId } from '../lib/online/session'
import { NAV_ITEMS, isNavItemActive } from './navItems'

interface BottomNavProps {
  active: Screen
  onNavigate: (screen: Screen) => void
}

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
    if (hasOnlineTable) {
      onNavigate('onlineLobby')
      return
    }
    onNavigate('gameMode')
  }

  return (
    <nav className="nav-pill bottom-nav" aria-label="Navigation principale">
      {NAV_ITEMS.map(item => {
        const isActive = isNavItemActive(active, item)

        if (item.highlight) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={handlePlayClick}
              aria-label={hasOnlineTable ? 'Reprendre la table en ligne' : item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`btn-primary glow-gold-sm bottom-nav-play${hasOnlineTable ? ' has-table' : ''}`}
            >
              <span className="bottom-nav-play-icon">{item.icon}</span>
              <span className="bottom-nav-play-label">{hasOnlineTable ? 'TABLE' : item.label}</span>
              {hasOnlineTable && <span className="bottom-nav-live-dot" aria-hidden />}
            </button>
          )
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`bottom-nav-item${isActive ? ' is-active' : ''}`}
          >
            <span className="bottom-nav-item-icon">{item.icon}</span>
            <span className="bottom-nav-item-label">{item.label}</span>
            {isActive && <span className="bottom-nav-item-dot" aria-hidden />}
          </button>
        )
      })}
    </nav>
  )
}
