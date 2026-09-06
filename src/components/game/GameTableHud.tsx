import { SEAT_NAMES } from '../../game/GameContext'
import { IconButton } from '../ui'

interface GameTableHudProps {
  roundNumber: number
  tricksWonThisRound: number[]
  statusMessage: string | null
  statusTone?: 'gold' | 'green' | 'muted'
  compactMode: boolean
  canBank: boolean
  onPause: () => void
  onQuit: () => void
  onToggleCompact: () => void
  onOpenRules: () => void
  onRequestBank: () => void
}

export function GameTableHud({
  roundNumber,
  tricksWonThisRound,
  statusMessage,
  statusTone = 'muted',
  compactMode,
  canBank,
  onPause,
  onQuit,
  onToggleCompact,
  onOpenRules,
  onRequestBank,
}: GameTableHudProps) {
  return (
    <header className="table-hud">
      <div className="table-hud-left">
        <IconButton size="sm" aria-label="Mettre la partie en pause" title="Pause" onClick={onPause}>
          ⏸
        </IconButton>
        <IconButton size="sm" aria-label="Consulter les règles du jeu" title="Règles du jeu" onClick={onOpenRules}>
          ?
        </IconButton>
        {canBank && (
          <IconButton
            size="sm"
            className="table-hud-bank"
            aria-label="Aller en banque — abandonner le round en cours"
            title="Aller en banque (abandonner le round)"
            onClick={onRequestBank}
          >
            🏦
          </IconButton>
        )}
      </div>

      <div className="table-hud-center" role="status" aria-live="polite">
        <p className="text-gold font-display table-hud-round">ROUND {roundNumber}</p>
        {statusMessage ? (
          <p key={statusMessage} className={`anim-fade-in table-hud-status table-hud-status--${statusTone}`}>
            {statusMessage}
          </p>
        ) : (
          <div className="table-hud-tricks">
            {SEAT_NAMES.map((name, index) => (
              <span key={name} className="table-hud-trick">
                {name}: {tricksWonThisRound[index]}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="table-hud-right">
        <IconButton
          size="sm"
          className={compactMode ? 'table-hud-compact is-on' : 'table-hud-compact'}
          aria-label={compactMode ? 'Afficher les noms et gains' : 'Masquer les noms et gains'}
          aria-pressed={compactMode}
          title={compactMode ? 'Afficher les noms et gains' : 'Masquer les noms et gains (agrandit les cartes)'}
          onClick={onToggleCompact}
        >
          {compactMode ? '🙈' : '👁️'}
        </IconButton>
        <button type="button" className="table-hud-quit" onClick={onQuit}>
          Quitter
        </button>
      </div>
    </header>
  )
}
