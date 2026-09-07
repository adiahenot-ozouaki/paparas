import type { Screen } from '../types'
import { motion } from 'framer-motion'
import { Skull } from 'lucide-react'
import { useGame, SEAT_NAMES, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { useAuth } from '../auth/AuthContext'
import { COMBO_LABEL } from '../game/combo'
import { gameOverReasonLabel } from '../game/payout'
import { NewlyUnlockedAchievements, ShareScoreButton } from '../components/EndGameExtras'
import { SectionCard, UiButton } from '../components/ui'

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
})

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

      <motion.div
        className="end-hero-badge end-hero-badge--danger"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      >
        <Skull size={40} strokeWidth={1.75} className="kora-icon" aria-hidden />
      </motion.div>

      <motion.div className="end-headline" {...fadeUp(0.15)}>
        <h1 className="font-display end-title text-hero">PARTIE TERMINÉE</h1>
      </motion.div>

      <motion.div className="end-player-block" {...fadeUp(0.25)}>
        <p className="end-muted text-sm">{reasonText}</p>
        {winnerName && <p className="end-winner-line text-md">Vainqueur : {winnerName}</p>}
        <p className="end-dim text-sm">Votre capital : {finalCapital.toLocaleString('fr-FR')} FCFA</p>
      </motion.div>

      <motion.div className="end-full" {...fadeUp(0.32)}>
        <NewlyUnlockedAchievements stats={lifetimeStats} />
      </motion.div>

      <motion.div className="end-full" {...fadeUp(0.4)}>
        <SectionCard className="end-stat-list" padding="md">
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
      </motion.div>

      <motion.div className="end-full" {...fadeUp(0.48)}>
        <SectionCard className="end-stat-list" padding="md">
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
      </motion.div>

      <motion.div className="end-actions" {...fadeUp(0.55)}>
        <UiButton fullWidth onClick={handleReplay} className="end-cta-primary">
          REJOUER
        </UiButton>
        <ShareScoreButton
          className="ui-btn ui-btn--full ui-btn--ghost end-cta-secondary"
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
        <UiButton variant="secondary" fullWidth onClick={() => onNavigate('home')} className="end-cta-secondary">
          Accueil
        </UiButton>
      </motion.div>
    </div>
  )
}
