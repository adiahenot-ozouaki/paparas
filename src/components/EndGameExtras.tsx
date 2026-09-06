import { useEffect, useMemo, useState } from 'react'
import type { LifetimeStats } from '../lib/persistence/stats'
import {
  type AchievementDef,
  getUnlockedAchievements,
  loadSeenAchievementIds,
  markAchievementsSeen,
} from '../game/achievements'
import { shareScore, type ScoreSharePayload, type ShareResult } from '../lib/shareScore'

/** Affiche les hauts faits nouvellement débloqués (ou les derniers débloqués). */
export function NewlyUnlockedAchievements({ stats }: { stats: LifetimeStats }) {
  const unlocked = useMemo(() => getUnlockedAchievements(stats), [stats])
  const [fresh, setFresh] = useState<AchievementDef[]>([])

  useEffect(() => {
    const seen = loadSeenAchievementIds()
    const news = unlocked.filter(a => !seen.has(a.id))
    if (news.length > 0) {
      setFresh(news)
      markAchievementsSeen(news.map(a => a.id))
    } else {
      // rien de nouveau : montrer jusqu’à 3 derniers débloqués pour contexte
      setFresh(unlocked.slice(-3).reverse())
    }
  }, [unlocked])

  if (fresh.length === 0) return null

  const isNewBatch = fresh.some(a => {
    // approximate: if we just marked them, label as NEW when previously unseen
    return true
  })

  return (
    <div
      style={{
        width: '100%',
        background: 'rgba(214,168,79,0.08)',
        border: '1px solid rgba(214,168,79,0.28)',
        borderRadius: 16,
        padding: '14px 14px 12px',
        marginBottom: 16,
      }}
    >
      <p
        style={{
          color: '#D6A84F',
          fontSize: 11,
          fontFamily: 'Plus Jakarta Sans',
          letterSpacing: '0.1em',
          fontWeight: 700,
          margin: '0 0 10px',
        }}
      >
        {isNewBatch ? 'HAUTS FAITS' : 'HAUTS FAITS'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {fresh.map(a => (
          <div
            key={a.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(0,0,0,0.25)',
              borderRadius: 12,
              padding: '10px 12px',
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>{a.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-display" style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>
                {a.name}
              </p>
              <p style={{ color: '#A9B0B7', fontSize: 11, margin: '2px 0 0', lineHeight: 1.35 }}>{a.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ShareScoreButton({
  payload,
  className = 'btn-secondary',
  style,
}: {
  payload: ScoreSharePayload
  className?: string
  style?: React.CSSProperties
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
    <button type="button" className={className} disabled={busy} onClick={() => void handleShare()} style={style}>
      {label}
    </button>
  )
}
