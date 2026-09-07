import { useEffect, useState } from 'react'
import type { Screen } from '../types'
import { getActiveOnlineTableId } from '../lib/online/session'
import { NAV_ITEMS, MORE_NAV_ITEMS, isNavItemActive } from './navItems'
import { SpadeIcon } from './icons'

type SideNavProps = {
  active: Screen
  onNavigate: (screen: Screen) => void
}

export default function SideNav({ active, onNavigate }: SideNavProps) {
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
    <aside className="side-nav" aria-label="Navigation principale">
      <div className="side-nav-brand">
        <span className="side-nav-brand-suit">
          <SpadeIcon size={22} className="kora-icon" />
        </span>
        <div>
          <p className="font-display side-nav-brand-title">GARAM</p>
          <p className="side-nav-brand-sub">PAPARAS</p>
        </div>
      </div>

      <nav className="side-nav-list">
        {NAV_ITEMS.map(item => {
          const isActive = isNavItemActive(active, item)
          const Icon = item.icon
          if (item.highlight) {
            return (
              <button
                key={item.id}
                type="button"
                className={`side-nav-item side-nav-item--play${isActive ? ' is-active' : ''}${hasOnlineTable ? ' has-table' : ''}`}
                onClick={handlePlayClick}
                aria-current={isActive ? 'page' : undefined}
                aria-label={hasOnlineTable ? 'Reprendre la table en ligne' : item.label}
              >
                <span className="side-nav-item-icon">
                  <Icon size={18} strokeWidth={2} className="kora-icon" aria-hidden />
                </span>
                <span className="side-nav-item-label">{hasOnlineTable ? 'Table active' : item.label}</span>
                {hasOnlineTable && <span className="side-nav-live-dot" aria-hidden />}
              </button>
            )
          }
          return (
            <button
              key={item.id}
              type="button"
              className={`side-nav-item${isActive ? ' is-active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="side-nav-item-icon">
                <Icon size={18} strokeWidth={2} className="kora-icon" aria-hidden />
              </span>
              <span className="side-nav-item-label">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="side-nav-footer">
        {MORE_NAV_ITEMS.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={`side-nav-item side-nav-item--muted${active === item.id ? ' is-active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={active === item.id ? 'page' : undefined}
            >
              <span className="side-nav-item-icon">
                <Icon size={18} strokeWidth={2} className="kora-icon" aria-hidden />
              </span>
              <span className="side-nav-item-label">{item.label}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
