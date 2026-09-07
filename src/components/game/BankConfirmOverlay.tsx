import { Landmark } from 'lucide-react'
import { UiButton } from '../ui'

interface BankConfirmOverlayProps {
  onConfirm: () => void
  onCancel: () => void
}

export function BankConfirmOverlay({ onConfirm, onCancel }: BankConfirmOverlayProps) {
  return (
    <div className="game-overlay game-overlay--dim game-overlay--z-bank">
      <div className="game-overlay-emoji" aria-hidden>
        <Landmark size={28} className="kora-icon" aria-hidden />
      </div>
      <h2 className="font-display game-overlay-title">ALLER EN BANQUE ?</h2>
      <p className="game-overlay-desc">
        Vous abandonnez le round en cours. Les gains déjà acquis sont conservés, mais vous ne pourrez
        plus jouer de cartes jusqu'au prochain round.
      </p>
      <div className="game-overlay-actions">
        <UiButton fullWidth onClick={onConfirm} className="game-overlay-cta">
          Confirmer
        </UiButton>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  )
}
