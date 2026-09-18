import { Pause } from 'lucide-react'
import { UiButton } from '../ui'

interface PauseOverlayProps {
  onResume: () => void
  /** Abandon définitif (online forfait) ou fin de session solo. */
  onQuit: () => void
  /** Accueil sans abandonner la table online. */
  onHome?: () => void
  quitLabel?: string
  homeLabel?: string
}

/** Pause réelle : fige les useEffect IA tant que isPaused est vrai. */
export function PauseOverlay({
  onResume,
  onQuit,
  onHome,
  quitLabel = 'Abandonner la table',
  homeLabel = "Retour à l'accueil",
}: PauseOverlayProps) {
  return (
    <div className="game-overlay game-overlay--dim game-overlay--z-pause">
      <div className="game-overlay-emoji" aria-hidden>
        <Pause size={28} className="kora-icon" aria-hidden />
      </div>
      <h2 className="font-display game-overlay-title">PARTIE EN PAUSE</h2>
      <p className="game-overlay-desc">
        Le round est figé — personne ne peut jouer tant que vous n&apos;avez pas repris.
      </p>
      <div className="game-overlay-actions">
        <UiButton fullWidth onClick={onResume} className="game-overlay-cta">
          REPRENDRE
        </UiButton>
        {onHome && (
          <UiButton fullWidth variant="secondary" onClick={onHome} className="game-overlay-cta">
            {homeLabel}
          </UiButton>
        )}
        <button type="button" className="game-overlay-danger" onClick={onQuit}>
          {quitLabel}
        </button>
      </div>
    </div>
  )
}
