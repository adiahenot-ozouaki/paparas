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
}

export function SpecialWinOverlayWrapper({
  outcome,
  hands,
  onContinue,
}: SpecialWinOverlayWrapperProps) {
  const payoutLines = [
    ...outcome.payout.winners,
    ...outcome.payout.losers,
  ]
    .sort(
      (a, b) =>
        a.playerIndex - b.playerIndex,
    )
    .map(player => ({
      name: SEAT_NAMES[player.playerIndex],
      amount: player.amount,
    }))

  return (
    <SpecialWinOverlay
      winners={outcome.winners}
      hands={hands}
      seatNames={SEAT_NAMES}
      payoutLines={payoutLines}
      onContinue={onContinue}
    />
  )
}