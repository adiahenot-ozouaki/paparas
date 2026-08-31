import { SEAT_NAMES } from '../../game/GameContext'

interface TrickWonOverlayProps {
  winnerIndex: number
}

export function TrickWonOverlay({
  winnerIndex,
}: TrickWonOverlayProps) {
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
        background: 'rgba(11,13,16,0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: 20,
        padding: '16px 28px',
        border: '1.5px solid rgba(214,168,79,0.4)',
        pointerEvents: 'none',
      }}
    >
      <p
        style={{
          color: '#A9B0B7',
          fontSize: 11,
          fontFamily: 'Plus Jakarta Sans',
          letterSpacing: '0.1em',
          margin: '0 0 4px',
        }}
      >
        PLI GAGNÉ PAR
      </p>

      <p
        className="text-gold font-display"
        style={{
          fontSize: 22,
          fontWeight: 800,
          margin: 0,
        }}
      >
        {SEAT_NAMES[winnerIndex]}
      </p>
    </div>
  )
}