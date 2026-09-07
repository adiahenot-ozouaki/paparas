import { useEffect, useRef, useState } from 'react'
import type { Screen } from '../types'
import { getActiveOnlineTableId } from '../lib/online/session'
import { NAV_ITEMS, MORE_NAV_ITEMS, isNavItemActive, isMoreNavActive } from './navItems'
import { MoreHorizontal } from 'lucide-react'

interface BottomNavProps {
  active: Screen
  onNavigate: (screen: Screen) => void
}

export default function BottomNav({ active, onNavigate }: BottomNavProps) {
  const [hasOnlineTable, setHasOnlineTable] = useState(() => Boolean(getActiveOnlineTableId()))
  const [moreOpen, setMoreOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)

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

  useEffect(() => {
    setMoreOpen(false)
  }, [active])

  useEffect(() => {
    if (!moreOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    function onPointer(e: MouseEvent | TouchEvent) {
      const t = e.target as Node
      if (sheetRef.current?.contains(t)) return
      if (moreBtnRef.current?.contains(t)) return
      setMoreOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [moreOpen])

  function handlePlayClick() {
    if (hasOnlineTable) {
      onNavigate('onlineLobby')
      return
    }
    onNavigate('gameMode')
  }

  function goMore(screen: Screen) {
    setMoreOpen(false)
    onNavigate(screen)
  }

  const moreActive = isMoreNavActive(active)

  return (
    <nav className="nav-pill bottom-nav" aria-label="Navigation principale">
      {NAV_ITEMS.map(item => {
        const isActive = isNavItemActive(active, item)
        const Icon = item.icon

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
              <span className="bottom-nav-play-icon">
                <Icon size={22} strokeWidth={2} className="kora-icon" aria-hidden />
              </span>
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
            <span className="bottom-nav-item-icon">
              <Icon size={20} strokeWidth={2} className="kora-icon" aria-hidden />
            </span>
            <span className="bottom-nav-item-label">{item.label}</span>
            {isActive && <span className="bottom-nav-item-dot" aria-hidden />}
          </button>
        )
      })}

      <button
        ref={moreBtnRef}
        type="button"
        className={`bottom-nav-overflow${moreOpen || moreActive ? ' is-active' : ''}`}
        aria-label="Plus d'options"
        aria-expanded={moreOpen}
        aria-controls="bottom-nav-more-sheet"
        onClick={() => setMoreOpen(v => !v)}
      >
        <span className="bottom-nav-overflow-icon" aria-hidden>
          <MoreHorizontal size={22} strokeWidth={2} className="kora-icon" />
        </span>
        <span className="bottom-nav-overflow-label">Plus</span>
      </button>

      {moreOpen && (
        <div
          ref={sheetRef}
          id="bottom-nav-more-sheet"
          className="bottom-nav-sheet anim-fade-in-up"
          role="menu"
          aria-label="Navigation secondaire"
        >
          {MORE_NAV_ITEMS.map(item => {
            const isActive = active === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={`bottom-nav-sheet-item${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => goMore(item.id)}
              >
                <span className="bottom-nav-sheet-icon">
                  <Icon size={18} strokeWidth={2} className="kora-icon" aria-hidden />
                </span>
                <span className="bottom-nav-sheet-label">{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </nav>
  )
}
