import type { Screen } from '../types'
import { useGame, SEAT_NAMES, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { useAuth } from '../auth/AuthContext'
import { COMBO_LABEL } from '../game/combo'
import { gameOverReasonLabel } from '../game/payout'
import { NewlyUnlockedAchievements, ShareScoreButton } from '../components/EndGameExtras'
import { UiButton } from '../components/ui'

export default function DefeatScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
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

  const ranking = players
    .map((p, i) => ({ ...p, seatIndex: i }))
    .sort((a, b) => b.capital - a.capital)

  const humanBestCombo = bestCombo[HUMAN_INDEX]
  const bestComboLabel = humanBestCombo ? COMBO_LABEL[humanBestCombo] : undefined
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - gameStartedAt) / 60000))
  const reasonText = gameOverReasonLabel(lastGameOver?.reason, stakeConfig)
  const winnerName =
    lastGameOver?.winnerIndex !== undefined ? SEAT_NAMES[lastGameOver.winnerIndex] : null
  const finalCapital = players[HUMAN_INDEX].capital
  const netGain = finalCapital - stakeConfig.startingCapital

  function handleReplay() {
    startNewGame()
    onNavigate('lobby')
  }

  return (
    <div className="end-screen end-screen--defeat">
      <div className="pattern-african end-screen-pattern" aria-hidden />

      <div className="anim-scale-bounce end-hero-badge end-hero-badge--danger">💀</div>

      <div className="anim-fade-in-up end-headline" style={{ animationDelay: '0.15s' }}>
        <h1 className="font-display end-title">PARTIE TERMINÉE</h1>
      </div>

      <div className="anim-fade-in-up end-player-block" style={{ animationDelay: '0.25s' }}>
        <p className="end-muted">{reasonText}</p>
        {winnerName && <p className="end-winner-line">Vainqueur : {winnerName}</p>}
        <p className="end-dim">Votre capital : {finalCapital.toLocaleString('fr-FR')} FCFA</p>
      </div>

      <div className="anim-fade-in-up end-full" style={{ animationDelay: '0.3s' }}>
        <NewlyUnlockedAchievements stats={lifetimeStats} />
      </div>

      <div className="anim-fade-in-up end-stat-list" style={{ animationDelay: '0.35s' }}>
        <div className="end-list-head">
          <span className="end-list-head-label">CLASSEMENT FINAL</span>
        </div>
        {ranking.map((p, rank) => (
          <div
            key={p.id}
            className={`end-rank-row${rank < ranking.length - 1 ? ' has-border' : ''}${p.seatIndex === HUMAN_INDEX ? ' is-you' : ''}${p.isEliminated ? ' is-out' : ''}`}
          >
            <span className="font-display end-rank-num">#{rank + 1}</span>
            <span className="end-rank-avatar">{SEAT_AVATARS[p.seatIndex]}</span>
            <span className="font-display end-rank-name">
              {SEAT_NAMES[p.seatIndex]}
              {p.isEliminated ? ' (éliminé)' : ''}
            </span>
            <span className={`font-display end-rank-cap${rank === 0 ? ' is-gold' : ''}`}>
              {p.capital.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        ))}
      </div>

      <div className="anim-fade-in-up end-stat-list" style={{ animationDelay: '0.45s' }}>
        {[
          { label: 'Rounds gagnés', value: String(roundsWon[HUMAN_INDEX]) },
          { label: 'Meilleur combo', value: bestComboLabel ?? '—' },
          { label: 'Temps de partie', value: `${elapsedMinutes} min` },
        ].map((s, i) => (
          <div key={s.label} className={`end-stat-row${i < 2 ? ' has-border' : ''}`}>
            <span className="end-stat-label">{s.label}</span>
            <span className="font-display end-stat-value">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="end-actions">
        <UiButton fullWidth onClick={handleReplay} className="anim-fade-in-up end-cta-primary" style={{ animationDelay: '0.55s' }}>
          REJOUER
        </UiButton>
        <ShareScoreButton
          className="btn-secondary anim-fade-in-up end-cta-secondary"
          style={{ animationDelay: '0.6s' }}
          payload={{
            won: false,
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
          style={{ animationDelay: '0.65s' }}
        >
          Accueil
        </UiButton>
      </div>
    </div>
  )
}
