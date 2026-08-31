interface RoundEndBannerProps {
  winnerName: string
  comboLabel: string
  wonByClaim: boolean
  onContinue: () => void
}

/**
 * Remplace l'ancienne navigation automatique vers RoundResultScreen dès la
 * fin d'un round normal (retour utilisateur : "les animations de fin de
 * round normal sont trop rapides, on doit pouvoir observer les cartes
 * avant de passer à l'écran, même quand un joueur réclame la victoire").
 *
 * Non bloquant (fond semi-transparent en pointe basse uniquement, pas
 * plein écran) : les piles de cartes du tapis restent visibles derrière.
 */
export function RoundEndBanner({ winnerName, comboLabel, wonByClaim, onContinue }: RoundEndBannerProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 150,
        textAlign: 'center',
        animation: 'scaleInBounce 0.4s ease both',
        background: 'rgba(11,13,16,0.85)',
        backdropFilter: 'blur(10px)',
        borderRadius: 20,
        padding: '18px 24px',
        border: '1.5px solid rgba(214,168,79,0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {wonByClaim && (
        <span style={{ color: '#9B59B6', fontSize: 11, fontFamily: 'Plus Jakarta Sans', fontWeight: 700, letterSpacing: '0.06em' }}>
          👑 VICTOIRE RÉCLAMÉE
        </span>
      )}
      <div>
        <p style={{ color: '#A9B0B7', fontSize: 11, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.1em', margin: '0 0 4px' }}>
          ROUND TERMINÉ
        </p>
        <p className="text-gold font-display" style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
          {winnerName} gagne — {comboLabel}
        </p>
      </div>
      <button
        className="btn-primary glow-gold"
        onClick={onContinue}
        style={{ padding: '10px 24px', fontSize: 13, borderRadius: 12, letterSpacing: '0.06em', marginTop: 4 }}
      >
        VOIR LE RÉSULTAT →
      </button>
    </div>
  )
}
