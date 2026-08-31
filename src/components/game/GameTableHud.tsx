import { SEAT_NAMES } from '../../game/GameContext'

interface GameTableHudProps {
  roundNumber: number
  tricksWonThisRound: number[]
  compactMode: boolean
  canBank: boolean
  onPause: () => void
  onQuit: () => void
  onToggleCompact: () => void
  onOpenRules: () => void
  onRequestBank: () => void
}

const iconButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  width: 30,
  height: 30,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#A9B0B7',
  fontSize: 13,
  cursor: 'pointer',
  flexShrink: 0,
  padding: 0,
}

export function GameTableHud({
  roundNumber,
  tricksWonThisRound,
  compactMode,
  canBank,
  onPause,
  onQuit,
  onToggleCompact,
  onOpenRules,
  onRequestBank,
}: GameTableHudProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(11,13,16,0.7)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        zIndex: 10,
        flexShrink: 0,
        gap: 6,
      }}
    >
      {/* Pause + Règles + Banque (icônes compactes) */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button onClick={onPause} title="Pause" aria-label="Mettre la partie en pause" style={iconButtonStyle}>
          ⏸
        </button>
        <button onClick={onOpenRules} title="Règles du jeu" aria-label="Consulter les règles du jeu" style={iconButtonStyle}>
          ?
        </button>
        {canBank && (
          <button
            onClick={onRequestBank}
            title="Aller en banque (abandonner le round)"
            aria-label="Aller en banque — abandonner le round en cours"
            style={{
              ...iconButtonStyle,
              background: 'rgba(201,75,75,0.12)',
              border: '1px solid rgba(201,75,75,0.3)',
              color: '#C94B4B',
            }}
          >
            🏦
          </button>
        )}
      </div>

      {/* Informations du round */}
      <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
        <p
          className="text-gold font-display"
          style={{
            fontSize: 13,
            fontWeight: 700,
            margin: 0,
            letterSpacing: '0.1em',
          }}
        >
          ROUND {roundNumber}
        </p>

        <div
          style={{
            display: 'flex',
            gap: 4,
            justifyContent: 'center',
            marginTop: 2,
          }}
        >
          {SEAT_NAMES.map((name, index) => (
            <span
              key={name}
              style={{
                color: '#A9B0B7',
                fontSize: 10,
              }}
            >
              {name}: {tricksWonThisRound[index]}
            </span>
          ))}
        </div>
      </div>

      {/* Bascule "mode compact" + Quitter */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button
          onClick={onToggleCompact}
          title={compactMode ? 'Afficher les noms et gains' : 'Masquer les noms et gains (agrandit les cartes)'}
          aria-label={compactMode ? 'Afficher les noms et gains' : 'Masquer les noms et gains'}
          aria-pressed={compactMode}
          style={{
            ...iconButtonStyle,
            background: compactMode ? 'rgba(214,168,79,0.15)' : 'rgba(255,255,255,0.08)',
            border: compactMode ? '1px solid rgba(214,168,79,0.4)' : '1px solid rgba(255,255,255,0.1)',
            color: compactMode ? '#D6A84F' : '#A9B0B7',
          }}
        >
          {compactMode ? '🙈' : '👁️'}
        </button>

        <button
          onClick={onQuit}
          style={{
            background: 'rgba(201,75,75,0.15)',
            border: '1px solid rgba(201,75,75,0.3)',
            borderRadius: 10,
            padding: '0 10px',
            height: 30,
            color: '#C94B4B',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'Plus Jakarta Sans',
            flexShrink: 0,
          }}
        >
          Quitter
        </button>
      </div>
    </div>
  )
}
