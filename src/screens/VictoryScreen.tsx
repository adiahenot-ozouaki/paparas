import type { Screen } from '../types'
import { useGame, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { COMBO_LABEL } from '../game/combo'
import { gameOverReasonLabel } from '../game/payout'

export default function VictoryScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { players, roundsWon, bestCombo, gameStartedAt, stakeConfig, lastGameOver, startNewGame } = useGame()

  const finalCapital = players[HUMAN_INDEX].capital
  const netGain = finalCapital - stakeConfig.startingCapital
  const humanBestCombo = bestCombo[HUMAN_INDEX]
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - gameStartedAt) / 60000))
  const reasonText = gameOverReasonLabel(lastGameOver?.reason, stakeConfig)

  const STATS = [
    { label: 'Condition de fin', value: reasonText },
    { label: 'Rounds gagnés', value: String(roundsWon[HUMAN_INDEX]) },
    { label: 'Meilleur combo', value: humanBestCombo ? `${COMBO_LABEL[humanBestCombo]}` : '—' },
    { label: 'Capital final', value: `${finalCapital.toLocaleString('fr-FR')} FCFA` },
    { label: 'Temps de partie', value: `${elapsedMinutes} min` },
  ]

  function handleReplay() {
    startNewGame()
    onNavigate('lobby')
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(ellipse at 50% 20%, rgba(214,168,79,0.12) 0%, rgba(18,60,50,0.2) 40%, #0B0D10 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 24px 32px',
      overflowY: 'auto',
    }}>
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      <div style={{
        position: 'fixed',
        top: '20%',
        left: '50%',
        width: 300,
        height: 300,
        transform: 'translateX(-50%)',
        backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, rgba(214,168,79,0.06) 20deg, transparent 40deg)',
        animation: 'victoryRays 6s linear infinite',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      <div className="anim-scale-bounce" style={{ position: 'relative', marginBottom: 20 }}>
        <div style={{
          width: 100,
          height: 100,
          borderRadius: 30,
          background: 'linear-gradient(135deg, #2a1a00, #1a1000)',
          border: '2.5px solid #D6A84F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 52,
          boxShadow: '0 0 48px rgba(214,168,79,0.4), 0 0 96px rgba(214,168,79,0.15)',
        }}>
          🏆
        </div>
      </div>

      <div className="anim-fade-in-up" style={{ textAlign: 'center', marginBottom: 8, animationDelay: '0.2s' }}>
        <h1 className="text-shimmer font-display" style={{ fontSize: 40, fontWeight: 800, letterSpacing: '0.1em', margin: 0 }}>
          VICTOIRE
        </h1>
      </div>

      <div className="anim-fade-in-up" style={{ textAlign: 'center', marginBottom: 24, animationDelay: '0.3s' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #123C32, #0d2a1f)',
          border: '2px solid rgba(214,168,79,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          margin: '0 auto 12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {SEAT_AVATARS[HUMAN_INDEX]}
        </div>
        <p className="font-display" style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: '0 0 4px', letterSpacing: '0.04em' }}>
          {lastGameOver?.reason === 'max_rounds'
            ? 'PLUS HAUT CAPITAL'
            : lastGameOver?.reason === 'race_target'
              ? 'OBJECTIF ATTEINT'
              : 'DERNIER JOUEUR EN LICE'}
        </p>
        <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>{reasonText}</p>
      </div>

      <div className="anim-scale-bounce" style={{
        background: 'linear-gradient(135deg, rgba(214,168,79,0.15), rgba(214,168,79,0.05))',
        border: '1.5px solid rgba(214,168,79,0.4)',
        borderRadius: 20,
        padding: '20px 32px',
        textAlign: 'center',
        marginBottom: 24,
        animationDelay: '0.4s',
        width: '100%',
      }}>
        <p style={{ color: '#A9B0B7', fontSize: 12, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.1em', margin: '0 0 6px' }}>
          GAINS NETS DE LA PARTIE
        </p>
        <div className="text-gold font-display" style={{ fontSize: 42, fontWeight: 800, lineHeight: 1 }}>
          {netGain >= 0 ? '+' : ''}
          {netGain.toLocaleString('fr-FR')}
        </div>
        <div style={{ color: '#A9B0B7', fontSize: 14, marginTop: 4 }}>FCFA</div>
      </div>

      <div className="anim-fade-in-up" style={{
        width: '100%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 24,
        animationDelay: '0.5s',
      }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderBottom: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <span style={{ color: '#A9B0B7', fontSize: 14, flexShrink: 0 }}>{s.label}</span>
            <span className="font-display" style={{ color: '#fff', fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          className="btn-primary glow-gold anim-fade-in-up"
          onClick={handleReplay}
          style={{ padding: '18px', fontSize: 15, borderRadius: 18, letterSpacing: '0.1em', animationDelay: '0.6s' }}
        >
          REJOUER
        </button>
        <button
          className="btn-secondary anim-fade-in-up"
          onClick={() => onNavigate('home')}
          style={{ padding: '14px', fontSize: 14, borderRadius: 14, animationDelay: '0.7s' }}
        >
          Accueil
        </button>
      </div>
    </div>
  )
}
