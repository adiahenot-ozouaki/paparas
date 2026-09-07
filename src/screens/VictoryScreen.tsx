import type { Screen } from '../types'
import { motion } from 'framer-motion'
import { useGame, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
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

  const tag =
    lastGameOver?.reason === 'max_rounds'
      ? 'PLUS HAUT CAPITAL'
      : lastGameOver?.reason === 'race_target'
        ? 'OBJECTIF ATTEINT'
        : 'DERNIER JOUEUR EN LICE'

  return (
    <div className="end-screen end-screen--victory">
      <div className="pattern-african end-screen-pattern" aria-hidden />

      <motion.div
        className="end-hero-badge end-hero-badge--gold"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      >
        🏆
      </motion.div>

      <motion.div className="end-headline" {...fadeUp(0.15)}>
        <h1 className="text-shimmer font-display end-title end-title--xl text-hero">VICTOIRE</h1>
      </motion.div>

      <motion.div className="end-player-block" {...fadeUp(0.25)}>
        <div className="end-player-avatar">{avatar}</div>
        <p className="font-display end-player-tag text-sm">{tag}</p>
        <p className="end-muted text-sm">{reasonText}</p>
      </motion.div>

      <motion.div {...fadeUp(0.35)} className="end-full">
        <SectionCard variant="green" className="end-net-card">
          <p className="end-net-kicker text-xs">GAINS NETS DE LA PARTIE</p>
          <div className="text-gold font-display end-net-value text-2xl">
            {netGain >= 0 ? '+' : ''}
            {netGain.toLocaleString('fr-FR')}
          </div>
          <div className="end-net-unit text-sm">FCFA</div>
        </SectionCard>
      </motion.div>

      <motion.div className="end-full" {...fadeUp(0.4)}>
        <NewlyUnlockedAchievements stats={lifetimeStats} />
      </motion.div>

      <motion.div {...fadeUp(0.48)} className="end-full">
        <SectionCard className="end-stat-list" padding="md">
          {STATS.map((s, i) => (
            <div key={s.label} className={`end-stat-row${i < STATS.length - 1 ? ' has-border' : ''}`}>
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
          className="end-cta-secondary"
        >
          Accueil
        </UiButton>
      </motion.div>
    </div>
  )
}
