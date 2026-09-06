import { THEME_MODE_LABEL, useTheme, type ThemeMode } from '../../theme/ThemeContext'

const MODES: ThemeMode[] = ['dark', 'light', 'system']

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
        {MODES.map(m => (
          <button
            key={m}
            type="button"
            className={`segmented-btn${mode === m ? ' is-active' : ''}`}
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
          >
            {m === 'dark' ? '🌙' : m === 'light' ? '☀️' : '💻'} {THEME_MODE_LABEL[m]}
          </button>
        ))}
      </div>
    </div>
  )
}
