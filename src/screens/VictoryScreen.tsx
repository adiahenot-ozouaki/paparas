import type { Screen } from '../types'
import { useGame, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { useAuth } from '../auth/AuthContext'
import { COMBO_LABEL } from '../game/combo'
import { gameOverReasonLabel } from '../game/payout'
import { NewlyUnlockedAchievements, ShareScoreButton } from '../components/EndGameExtras'
import { UiButton } from '../components/ui'

export default function VictoryScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const {
    players,
    roundsWon,
    bestCombo,
    gameStartedAt,
    stakeConfig,
    lastGameOver,
    lifetimeStats,
    startNewGame,
  } = useGame()
  const { profile } = useAuth()

  const finalCapital = players[HUMAN_INDEX].capital
  const netGain = finalCapital - stakeConfig.startingCapital
  const humanBestCombo = bestCombo[HUMAN_INDEX]
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - gameStartedAt) / 60000))
  const reasonText = gameOverReasonLabel(lastGameOver?.reason, stakeConfig)
  const avatar = profile?.avatar ?? SEAT_AVATARS[HUMAN_INDEX]
  const bestComboLabel = humanBestCombo ? COMBO_LABEL[humanBestCombo] : undefined

  const STATS = [
    { label: 'Condition de fin', value: reasonText },
    { label: 'Rounds gagnés', value: String(roundsWon[HUMAN_INDEX]) },
    { label: 'Meilleur combo', value: bestComboLabel ?? '—' },
    { label: 'Capital final', value: `${finalCapital.toLocaleString('fr-FR')} FCFA` },
    { label: 'Temps de partie', value: `${elapsedMinutes} min` },
  ]

  function handleReplay() {
    startNewGame()
    onNavigate('lobby')
  }

  return (
    <div className="end-screen end-screen--victory">
      <div className="pattern-african end-screen-pattern" aria-hidden />

      <div className="anim-scale-bounce end-hero-badge end-hero-badge--gold">🏆</div>

      <div className="anim-fade-in-up end-headline" style={{ animationDelay: '0.2s' }}>
        <h1 className="text-shimmer font-display end-title end-title--xl">VICTOIRE</h1>
      </div>

      <div className="anim-fade-in-up end-player-block" style={{ animationDelay: '0.3s' }}>
        <div className="end-player-avatar">{avatar}</div>
        <p className="font-display end-player-tag">
          {lastGameOver?.reason === 'max_rounds'
            ? 'PLUS HAUT CAPITAL'
            : lastGameOver?.reason === 'race_target'
              ? 'OBJECTIF ATTEINT'
              : 'DERNIER JOUEUR EN LICE'}
        </p>
        <p className="end-muted">{reasonText}</p>
      </div>

      <div className="anim-scale-bounce end-net-card" style={{ animationDelay: '0.4s' }}>
        <p className="end-net-kicker">GAINS NETS DE LA PARTIE</p>
        <div className="text-gold font-display end-net-value">
          {netGain >= 0 ? '+' : ''}
          {netGain.toLocaleString('fr-FR')}
        </div>
        <div className="end-net-unit">FCFA</div>
      </div>

      <div className="anim-fade-in-up end-full" style={{ animationDelay: '0.45s' }}>
        <NewlyUnlockedAchievements stats={lifetimeStats} />
      </div>

      <div className="anim-fade-in-up end-stat-list" style={{ animationDelay: '0.5s' }}>
        {STATS.map((s, i) => (
          <div key={s.label} className={`end-stat-row${i < STATS.length - 1 ? ' has-border' : ''}`}>
            <span className="end-stat-label">{s.label}</span>
            <span className="font-display end-stat-value">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="end-actions">
        <UiButton fullWidth onClick={handleReplay} className="anim-fade-in-up end-cta-primary" style={{ animationDelay: '0.6s' }}>
          REJOUER
        </UiButton>
        <ShareScoreButton
          className="btn-secondary anim-fade-in-up end-cta-secondary"
          style={{ animationDelay: '0.65s' }}
          payload={{
            won: true,
            netGain,
            finalCapital,
            roundsWon: roundsWon[HUMAN_INDEX],
            bestComboLabel,
            reason: reasonText,
            username: profile?.username,
          }}
        />
        <UiButton
          variant="secondary"
          fullWidth
          onClick={() => onNavigate('home')}
          className="anim-fade-in-up end-cta-secondary"
          style={{ animationDelay: '0.7s' }}
        >
          Accueil
        </UiButton>
      </div>
    </div>
  )
}
