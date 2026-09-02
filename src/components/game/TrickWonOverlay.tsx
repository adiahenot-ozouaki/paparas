import { SEAT_NAMES } from '../../game/GameContext'

interface TrickWonOverlayProps {
  winnerIndex: number
}

export function TrickWonOverlay({
  winnerIndex,
}: TrickWonOverlayProps) {
  const isHuman = winnerIndex === 0

  return (
    <div
      style={{
        position: 'absolute',
        top: '42%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 150,
        textAlign: 'center',
        animation: 'scaleInBounce 0.45s ease both',
        background: 'rgba(11,13,16,0.88)',
        backdropFilter: 'blur(14px)',
        borderRadius: 22,
        padding: '18px 32px',
        border: '1.5px solid rgba(214,168,79,0.5)',
        boxShadow:
          '0 0 40px rgba(214,168,79,0.25), 0 12px 40px rgba(0,0,0,0.45)',
        pointerEvents: 'none',
        minWidth: 160,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -2,
          borderRadius: 24,
          background:
            'linear-gradient(135deg, rgba(214,168,79,0.35), transparent 40%, rgba(240,213,138,0.2))',
          opacity: 0.5,
          pointerEvents: 'none',
          animation: 'winnerGlow 1.2s ease-in-out infinite',
        }}
      />

      <p
        style={{
          color: '#A9B0B7',
          fontSize: 11,
          fontFamily: 'Plus Jakarta Sans',
          letterSpacing: '0.14em',
          margin: '0 0 6px',
          fontWeight: 600,
          position: 'relative',
        }}
      >
        PLI GAGNÉ
      </p>

      <p
        className="text-gold font-display"
        style={{
          fontSize: 24,
          fontWeight: 800,
          margin: 0,
          position: 'relative',
        }}
      >
        {isHuman ? 'Vous' : SEAT_NAMES[winnerIndex]}
      </p>

      {isHuman && (
        <p
          style={{
            color: '#F0D58A',
            fontSize: 11,
            margin: '6px 0 0',
            letterSpacing: '0.06em',
            position: 'relative',
          }}
        >
          +1 pli
        </p>
      )}
    </div>
  )
}
