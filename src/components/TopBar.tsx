import type { Screen } from '../types'
import { SpadeIcon, User } from './icons'

type TopBarProps = {
  active: Screen
  onNavigate: (screen: Screen) => void
}

export default function TopBar({ active, onNavigate }: TopBarProps) {
  return (
    <header className="top-bar" aria-label="En-tête">
      <button
        type="button"
        className="top-bar-brand"
        onClick={() => onNavigate('home')}
        aria-label="Accueil Garam Paparas"
      >
        <span className="top-bar-brand-suit" aria-hidden>
          <SpadeIcon size={18} className="kora-icon" />
        </span>
        <span className="top-bar-brand-text">
          <span className="font-display top-bar-brand-title">GARAM</span>
          <span className="top-bar-brand-sub">PAPARAS</span>
        </span>
      </button>

      <div className="top-bar-actions">
        <button
          type="button"
          className={`top-bar-icon-btn${active === 'profile' ? ' is-active' : ''}`}
          onClick={() => onNavigate('profile')}
          aria-label="Profil"
          aria-current={active === 'profile' ? 'page' : undefined}
        >
          <User size={20} strokeWidth={2} className="kora-icon" aria-hidden />
        </button>
      </div>
    </header>
  )
}
