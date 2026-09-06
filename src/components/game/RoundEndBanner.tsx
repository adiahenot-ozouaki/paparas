import { UiButton } from '../ui'

interface RoundEndBannerProps {
  winnerName: string
  comboLabel: string
  wonByClaim: boolean
  onContinue: () => void
}

/** Bandeau non bloquant : le tapis reste visible derrière. */
export function RoundEndBanner({
  winnerName,
  comboLabel,
  wonByClaim,
  onContinue,
}: RoundEndBannerProps) {
  return (
    <div className="round-end-banner">
      {wonByClaim && <span className="round-end-claim">👑 VICTOIRE RÉCLAMÉE</span>}
      <div>
        <p className="round-end-kicker">ROUND TERMINÉ</p>
        <p className="text-gold font-display round-end-title">
          {winnerName} gagne — {comboLabel}
        </p>
      </div>
      <UiButton onClick={onContinue} className="round-end-cta">
        VOIR LE RÉSULTAT →
      </UiButton>
    </div>
  )
}
