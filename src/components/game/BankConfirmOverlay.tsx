interface BankConfirmOverlayProps {
  baseStake: number
  onConfirm: () => void
  onCancel: () => void
}

export function BankConfirmOverlay({ baseStake, onConfirm, onCancel }: BankConfirmOverlayProps) {
  return (
    <div className="game-overlay game-overlay--scrim game-overlay--z-bank" onClick={onCancel}>
      <div className="anim-scale-bounce game-dialog game-dialog--danger" onClick={e => e.stopPropagation()}>
        <p className="game-dialog-text">
          🏦 Aller en banque ? Vous abandonnez le round et perdez{' '}
          <span className="game-dialog-loss">{baseStake} FCFA</span>.
        </p>
        <div className="game-dialog-actions">
          <button type="button" className="game-dialog-confirm" onClick={onConfirm}>
            Confirmer
          </button>
          <button type="button" className="game-dialog-cancel" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
