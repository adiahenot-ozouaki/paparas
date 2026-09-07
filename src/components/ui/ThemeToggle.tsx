import { Moon, Sun, Monitor } from 'lucide-react'
import { THEME_MODE_LABEL, useTheme, type ThemeMode } from '../../theme/ThemeContext'

const MODES: ThemeMode[] = ['dark', 'light', 'system']

const MODE_ICON = {
  dark: Moon,
  light: Sun,
  system: Monitor,
} as const

export default function ThemeToggle() {
  const { mode, setMode, resolved } = useTheme()

  return (
    <div className="theme-toggle">
      <div className="theme-toggle-head">
        <span className="font-display theme-toggle-title">Apparence</span>
        <span className="theme-toggle-hint">
          Actif : {resolved === 'dark' ? 'sombre' : 'clair'}
        </span>
      </div>
      <div className="segmented" role="group" aria-label="Thème">
        {MODES.map(m => {
          const Icon = MODE_ICON[m]
          return (
            <button
              key={m}
              type="button"
              className={`segmented-btn${mode === m ? ' is-active' : ''}`}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
            >
              <Icon size={14} strokeWidth={2} className="kora-icon theme-toggle-mode-icon" aria-hidden />
              {THEME_MODE_LABEL[m]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
