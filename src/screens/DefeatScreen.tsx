import type { Screen } from '../types'
import { useGame, SEAT_NAMES, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { COMBO_LABEL } from '../game/combo'

export default function DefeatScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { players, roundsWon, bestCombo, gameStartedAt, startNewGame } = useGame()

  const ranking = players
    .map((p, i) => ({ ...p, seatIndex: i }))
    .sort((a, b) => b.capital - a.capital)

  const humanBestCombo = bestCombo[HUMAN_INDEX]
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - gameStartedAt) / 60000))

  function handleReplay() {
    startNewGame()
    onNavigate('lobby')
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(201,75,75,0.15) 0%, #0B0D10 55%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 24px 32px',
        overflowY: 'auto',
      }}
    >
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      <div
        className="anim-scale-bounce"
        style={{
          width: 90,
          height: 90,
          borderRadius: 28,
          background: 'linear-gradient(135deg, #2a1414, #1a0d0d)',
          border: '2.5px solid #C94B4B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 44,
          marginBottom: 20,
          boxShadow: '0 0 40px rgba(201,75,75,0.3)',
        }}
      >
        💀
      </div>

      <div className="anim-fade-in-up" style={{ textAlign: 'center', marginBottom: 8, animationDelay: '0.15s' }}>
        <h1 className="font-display" style={{ fontSize: 34, fontWeight: 800, letterSpacing: '0.06em', margin: 0, color: '#fff' }}>
          PARTIE TERMINÉE
        </h1>
      </div>

      <div className="anim-fade-in-up" style={{ textAlign: 'center', marginBottom: 24, animationDelay: '0.25s' }}>
        <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>
          Capital insuffisant pour continuer — {players[HUMAN_INDEX].capital.toLocaleString('fr-FR')} FCFA
        </p>
      </div>

      {/* Classement final */}
      <div
        className="anim-fade-in-up"
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          overflow: 'hidden',
          marginBottom: 20,
          animationDelay: '0.35s',
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: '#A9B0B7', fontSize: 12, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.08em' }}>
            CLASSEMENT FINAL
          </span>
        </div>
        {ranking.map((p, rank) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: rank < ranking.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              background: p.seatIndex === HUMAN_INDEX ? 'rgba(255,255,255,0.02)' : 'transparent',
              opacity: p.isEliminated ? 0.5 : 1,
            }}
          >
            <span className="font-display" style={{ color: '#A9B0B7', fontSize: 12, width: 20 }}>
              #{rank + 1}
            </span>
            <span style={{ fontSize: 18, marginRight: 10 }}>{SEAT_AVATARS[p.seatIndex]}</span>
            <span className="font-display" style={{ flex: 1, color: '#fff', fontSize: 14, fontWeight: 600 }}>
              {SEAT_NAMES[p.seatIndex]}
              {p.isEliminated ? ' (éliminé)' : ''}
            </span>
            <span className="font-display" style={{ color: rank === 0 ? '#D6A84F' : '#A9B0B7', fontSize: 14, fontWeight: 700 }}>
              {p.capital.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        ))}
      </div>

      {/* Statistiques de la session */}
      <div
        className="anim-fade-in-up"
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          overflow: 'hidden',
          marginBottom: 24,
          animationDelay: '0.45s',
        }}
      >
        {[
          { label: 'Rounds gagnés', value: String(roundsWon[HUMAN_INDEX]) },
          { label: 'Meilleur combo', value: humanBestCombo ? COMBO_LABEL[humanBestCombo] : '—' },
          { label: 'Temps de partie', value: `${elapsedMinutes} min` },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}
          >
            <span style={{ color: '#A9B0B7', fontSize: 14 }}>{s.label}</span>
            <span className="font-display" style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          className="btn-primary glow-gold anim-fade-in-up"
          onClick={handleReplay}
          style={{ padding: '18px', fontSize: 15, borderRadius: 18, letterSpacing: '0.1em', animationDelay: '0.55s' }}
        >
          REJOUER
        </button>
        <button
          className="btn-secondary anim-fade-in-up"
          onClick={() => onNavigate('home')}
          style={{ padding: '14px', fontSize: 14, borderRadius: 14, animationDelay: '0.65s' }}
        >
          Accueil
        </button>
      </div>
    </div>
  )
}
