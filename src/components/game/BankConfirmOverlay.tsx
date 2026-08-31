interface BankConfirmOverlayProps {
  baseStake: number
  onConfirm: () => void
  onCancel: () => void
}

export function BankConfirmOverlay({ baseStake, onConfirm, onCancel }: BankConfirmOverlayProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(11,13,16,0.5)',
        zIndex: 160,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        className="anim-scale-bounce"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(11,13,16,0.95)',
          backdropFilter: 'blur(10px)',
          border: '1.5px solid rgba(201,75,75,0.4)',
          borderRadius: 16,
          padding: '16px 20px',
          textAlign: 'center',
          maxWidth: 260,
        }}
      >
        <p style={{ color: '#fff', fontSize: 13, margin: '0 0 12px' }}>
          🏦 Aller en banque ? Vous abandonnez le round et perdez{' '}
          <span style={{ color: '#C94B4B', fontWeight: 700 }}>{baseStake} FCFA</span>.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            onClick={onConfirm}
            style={{
              background: '#C94B4B',
              border: 'none',
              borderRadius: 10,
              padding: '7px 18px',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans',
            }}
          >
            Confirmer
          </button>
          <button
            onClick={onCancel}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10,
              padding: '7px 18px',
              color: '#A9B0B7',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans',
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
