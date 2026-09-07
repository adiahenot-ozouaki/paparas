import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LifetimeStats } from '../lib/persistence/stats'
import {
  type AchievementDef,
  getUnlockedAchievements,
  loadSeenAchievementIds,
  markAchievementsSeen,
} from '../game/achievements'
import { shareScore, type ScoreSharePayload, type ShareResult } from '../lib/shareScore'

const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.07, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 420, damping: 28 },
  },
}

/** Affiche les hauts faits nouvellement débloqués (ou les derniers débloqués). */
export function NewlyUnlockedAchievements({ stats }: { stats: LifetimeStats }) {
  const unlocked = useMemo(() => getUnlockedAchievements(stats), [stats])
  const [fresh, setFresh] = useState<AchievementDef[]>([])
  const [isNewBatch, setIsNewBatch] = useState(false)

  useEffect(() => {
    const seen = loadSeenAchievementIds()
    const news = unlocked.filter(a => !seen.has(a.id))
    if (news.length > 0) {
      setFresh(news)
      setIsNewBatch(true)
      markAchievementsSeen(news.map(a => a.id))
    } else {
      setFresh(unlocked.slice(-3).reverse())
      setIsNewBatch(false)
    }
  }, [unlocked])

  if (fresh.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        className="endgame-achievements"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        exit={{ opacity: 0, y: 6 }}
      >
        <p className="endgame-achievements-kicker text-xs">
          {isNewBatch ? 'NOUVEAUX HAUTS FAITS' : 'HAUTS FAITS'}
        </p>
        <div className="endgame-achievements-list">
          {fresh.map(a => (
            <motion.div key={a.id} className="endgame-achievement-row" variants={itemVariants}>
              <span className="endgame-achievement-icon" aria-hidden>
                {a.icon}
              </span>
              <div className="endgame-achievement-meta">
                <p className="font-display endgame-achievement-name text-md">{a.name}</p>
                <p className="endgame-achievement-desc text-xs">{a.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export function ShareScoreButton({
  payload,
  className = 'ui-btn ui-btn--full ui-btn--ghost',
}: {
  payload: ScoreSharePayload
  className?: string
}) {
  const [status, setStatus] = useState<ShareResult | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleShare() {
    if (busy) return
    setBusy(true)
    const r = await shareScore(payload)
    setStatus(r)
    setBusy(false)
    if (r === 'copied' || r === 'shared') {
      setTimeout(() => setStatus(null), 2500)
    }
  }

  const label =
    status === 'copied'
      ? '✓ Copié dans le presse-papiers'
      : status === 'shared'
        ? '✓ Partagé'
        : status === 'failed'
          ? 'Partage impossible'
          : busy
            ? '…'
            : 'Partager le score'

  return (
    <motion.button
      type="button"
      className={className}
      disabled={busy}
      onClick={() => void handleShare()}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {label}
    </motion.button>
  )
}
