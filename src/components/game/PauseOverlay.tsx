interface PauseOverlayProps {
  onResume: () => void
  onQuit: () => void
}

// ==========================================================================
// PauseOverlay — pause RÉELLE, pas un simple raccourci vers l'accueil.
//
// Avant, le bouton "Pause" du HUD (GameTableHud) et le bouton "Quitter"
// faisaient exactement la même chose (onNavigate('home')). Ici, la pause
// fige effectivement la partie : tant que cet overlay est affiché, plus
// aucun pli ne s'enchaîne côté IA (voir les useEffect de GameTableScreen
// gardés par `isPaused`), et l'overlay couvre tout l'écran donc aucune
// carte de la main du joueur ne peut être touchée.
// ==========================================================================

export function PauseOverlay({ onResume, onQuit }: PauseOverlayProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(11,13,16,0.92)',
        backdropFilter: 'blur(6px)',
        zIndex: 180,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
      }}
    >
      <div style={{ fontSize: 40 }}>⏸</div>
      <h2 className="font-display" style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '0.06em' }}>
        PARTIE EN PAUSE
      </h2>
      <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0, textAlign: 'center', maxWidth: 260 }}>
        Le round est figé — personne ne peut jouer tant que vous n'avez pas repris.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280, marginTop: 8 }}>
        <button
          className="btn-primary glow-gold"
          onClick={onResume}
          style={{ padding: '14px', fontSize: 14, borderRadius: 14, letterSpacing: '0.08em' }}
        >
          REPRENDRE
        </button>
        <button
          onClick={onQuit}
          style={{
            padding: '12px',
            fontSize: 13,
            borderRadius: 12,
            background: 'rgba(201,75,75,0.12)',
            border: '1px solid rgba(201,75,75,0.3)',
            color: '#C94B4B',
            cursor: 'pointer',
            fontFamily: 'Plus Jakarta Sans',
          }}
        >
          Quitter la partie
        </button>
      </div>
    </div>
  )
}
