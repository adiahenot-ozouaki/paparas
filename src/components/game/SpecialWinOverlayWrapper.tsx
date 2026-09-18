import {
  SEAT_NAMES,
} from '../../game/GameContext'
import type { RoundState } from '../../game/round'
import SpecialWinOverlay from './SpecialWinOverlay'

interface SpecialWinOverlayWrapperProps {
  outcome: Extract<
    NonNullable<RoundState['outcome']>,
    { kind: 'specialWin' }
  >
  hands: RoundState['hands']
  onContinue: () => void
  onQuit?: () => void
  quitLabel?: string
  seatNames?: string[]
  continueLabel?: string
  continueDisabled?: boolean
}

export function SpecialWinOverlayWrapper({
  outcome,
  hands,
  onContinue,
  onQuit,
  quitLabel,
  seatNames = SEAT_NAMES,
  continueLabel,
  continueDisabled,
}: SpecialWinOverlayWrapperProps) {
  const names = seatNames.length >= 4 ? seatNames : SEAT_NAMES
  const payoutLines = [
    ...outcome.payout.winners,
    ...outcome.payout.losers,
  ]
    .sort(
      (a, b) =>
        a.playerIndex - b.playerIndex,
    )
    .map(player => ({
      name: names[player.playerIndex] ?? `Joueur ${player.playerIndex + 1}`,
      amount: player.amount,
    }))

  return (
    <SpecialWinOverlay
      winners={outcome.winners}
      hands={hands}
      seatNames={names}
      payoutLines={payoutLines}
      onContinue={onContinue}
      onQuit={onQuit}
      quitLabel={quitLabel}
      continueLabel={continueLabel}
      continueDisabled={continueDisabled}
    />
  )
}
