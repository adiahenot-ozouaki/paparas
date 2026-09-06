import { SEAT_NAMES } from '../../game/GameContext'

interface TrickWonOverlayProps {
  winnerIndex: number
}

export function TrickWonOverlay({ winnerIndex }: TrickWonOverlayProps) {
  const isHuman = winnerIndex === 0

  return (
    <div className="trick-won-toast" aria-live="polite">
      <div className="trick-won-glow" aria-hidden />
      <p className="trick-won-kicker">PLI GAGNÉ</p>
      <p className="text-gold font-display trick-won-name">
        {isHuman ? 'Vous' : SEAT_NAMES[winnerIndex]}
      </p>
      {isHuman && <p className="trick-won-plus">+1 pli</p>}
    </div>
  )
}
