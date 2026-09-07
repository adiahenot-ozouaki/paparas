import type { Screen } from '../types'
import { useGame, SEAT_NAMES, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { useAuth } from '../auth/AuthContext'
import { COMBO_LABEL } from '../game/combo'
import { gameOverReasonLabel } from '../game/payout'
import { NewlyUnlockedAchievements, ShareScoreButton } from '../components/EndGameExtras'
import { SectionCard, UiButton } from '../components/ui'

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

      <div className="anim-fade-in-up end-headline delay-2">
        <h1 className="font-display end-title text-hero">PARTIE TERMINÉE</h1>
      </div>

      <div className="anim-fade-in-up end-player-block delay-3">
        <p className="end-muted text-sm">{reasonText}</p>
        {winnerName && <p className="end-winner-line text-md">Vainqueur : {winnerName}</p>}
        <p className="end-dim text-sm">Votre capital : {finalCapital.toLocaleString('fr-FR')} FCFA</p>
      </div>

      <div className="anim-fade-in-up end-full delay-35">
        <NewlyUnlockedAchievements stats={lifetimeStats} />
      </div>

      <SectionCard className="anim-fade-in-up end-stat-list delay-4" padding="md">
        <div className="end-list-head">
          <span className="end-list-head-label text-xs">CLASSEMENT FINAL</span>
        </div>
        {ranking.map((p, rank) => (
          <div
            key={p.id}
            className={`end-rank-row${rank < ranking.length - 1 ? ' has-border' : ''}${p.seatIndex === HUMAN_INDEX ? ' is-you' : ''}${p.isEliminated ? ' is-out' : ''}`}
          >
            <span className="font-display end-rank-num text-sm">#{rank + 1}</span>
            <span className="end-rank-avatar">{SEAT_AVATARS[p.seatIndex]}</span>
            <span className="font-display end-rank-name text-md">
              {SEAT_NAMES[p.seatIndex]}
              {p.isEliminated ? ' (éliminé)' : ''}
            </span>
            <span className={`font-display end-rank-cap text-md${rank === 0 ? ' is-gold' : ''}`}>
              {p.capital.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        ))}
      </SectionCard>

      <SectionCard className="anim-fade-in-up end-stat-list delay-5" padding="md">
        {[
          { label: 'Rounds gagnés', value: String(roundsWon[HUMAN_INDEX]) },
          { label: 'Meilleur combo', value: bestComboLabel ?? '—' },
          { label: 'Temps de partie', value: `${elapsedMinutes} min` },
        ].map((s, i) => (
          <div key={s.label} className={`end-stat-row${i < 2 ? ' has-border' : ''}`}>
            <span className="end-stat-label text-sm">{s.label}</span>
            <span className="font-display end-stat-value text-md">{s.value}</span>
          </div>
        ))}
      </SectionCard>

      <div className="end-actions">
        <UiButton fullWidth onClick={handleReplay} className="anim-fade-in-up end-cta-primary delay-6">
          REJOUER
        </UiButton>
        <ShareScoreButton
          className="ui-btn ui-btn--full ui-btn--ghost anim-fade-in-up end-cta-secondary delay-65"
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
          className="anim-fade-in-up end-cta-secondary delay-7"
        >
          Accueil
        </UiButton>
      </div>
    </div>
  )
}
