import { UiButton } from '../ui'

interface PauseOverlayProps {
  onResume: () => void
  onQuit: () => void
}

/** Pause réelle : fige les useEffect IA tant que isPaused est vrai. */
export function PauseOverlay({ onResume, onQuit }: PauseOverlayProps) {
  return (
    <div className="game-overlay game-overlay--dim game-overlay--z-pause">
      <div className="game-overlay-emoji" aria-hidden>
        ⏸
      </div>
      <h2 className="font-display game-overlay-title">PARTIE EN PAUSE</h2>
      <p className="game-overlay-desc">
        Le round est figé — personne ne peut jouer tant que vous n'avez pas repris.
      </p>
      <div className="game-overlay-actions">
        <UiButton fullWidth onClick={onResume} className="game-overlay-cta">
          REPRENDRE
        </UiButton>
        <button type="button" className="game-overlay-danger" onClick={onQuit}>
          Quitter la partie
        </button>
      </div>
    </div>
  )
}
