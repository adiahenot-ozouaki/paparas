import { useEffect, useRef, useState } from 'react'
import { useGame } from '../game/GameContext'
import {
  type AchievementDef,
  diffNewlyUnlocked,
  loadSeenAchievementIds,
  markAchievementsSeen,
  seedSeenFromStats,
} from '../game/achievements'
import type { LifetimeStats } from '../lib/persistence/stats'

// ==========================================================================
// AchievementToast — file d'attente des hauts faits nouvellement débloqués.
// Monte une fois sous GameProvider ; observe lifetimeStats.
//
// Important : à la connexion / sync cloud, les stats « sautent » vers l'historique
// déjà débloqué. On absorbe ça en baseline (seedSeen) SANS toast. Les toasts
// ne partent que pour un vrai déblocage en jeu après stabilisation.
// ==========================================================================

const DISPLAY_MS = 4200
const EXIT_MS = 320

export default function AchievementToast() {
  const { lifetimeStats, statsSyncing } = useGame()
  const prevStats = useRef<LifetimeStats | null>(null)
  /** true tant que la baseline n'est pas posée (mount + sync cloud). */
  const skipDiff = useRef(true)
  const [queue, setQueue] = useState<AchievementDef[]>([])
  const [current, setCurrent] = useState<AchievementDef | null>(null)
  const [visible, setVisible] = useState(false)
  const queueRef = useRef(queue)
  queueRef.current = queue
  const hideTimerRef = useRef<number | null>(null)
  const clearTimerRef = useRef<number | null>(null)

  useEffect(() => {
    // Pendant une sync cloud (login, refresh) : absorber, pas de toast.
    if (statsSyncing) {
      skipDiff.current = true
      seedSeenFromStats(lifetimeStats)
      prevStats.current = lifetimeStats
      return
    }

    // Premier frame stable après mount / fin de sync : baseline, pas de toast.
    if (skipDiff.current) {
      seedSeenFromStats(lifetimeStats)
      prevStats.current = lifetimeStats
      skipDiff.current = false
      return
    }

    const prev = prevStats.current
    if (!prev) {
      seedSeenFromStats(lifetimeStats)
      prevStats.current = lifetimeStats
      return
    }

    const newly = diffNewlyUnlocked(prev, lifetimeStats)
    prevStats.current = lifetimeStats
    if (newly.length === 0) return

    const seen = loadSeenAchievementIds()
    const fresh = newly.filter(a => !seen.has(a.id))
    if (fresh.length === 0) return

    markAchievementsSeen(fresh.map(a => a.id))
    setQueue(q => [...q, ...fresh])
  }, [lifetimeStats, statsSyncing])

  // Défile la file : un toast à la fois.
  // Important : le timer de disparition vit dans un effet séparé qui ne
  // dépend QUE de `current`. Sinon setQueue() dans le même cycle annulait
  // le setTimeout et le toast restait collé à l'écran.
  useEffect(() => {
    if (current !== null) return
    if (queueRef.current.length === 0) return
    const [next, ...rest] = queueRef.current
    setQueue(rest)
    setCurrent(next)
    setVisible(true)
  }, [queue, current])

  useEffect(() => {
    if (!current) return

    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current)

    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false)
      clearTimerRef.current = window.setTimeout(() => {
        setCurrent(null)
      }, EXIT_MS)
    }, DISPLAY_MS)

    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current)
    }
  }, [current])

  if (!current) return null

  return (
    <div
      role="status"
      className="achievement-toast"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'max(16px, env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? 0 : -12}px)`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.28s ease, transform 0.28s ease',
        zIndex: 9999,
        width: 'min(360px, calc(100vw - 32px))',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(16,21,26,0.96), rgba(18,60,50,0.92))',
          border: `1.5px solid ${current.color}66`,
          borderRadius: 18,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow: `0 12px 40px rgba(0,0,0,0.45), 0 0 24px ${current.color}22`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `${current.color}22`,
            border: `1.5px solid ${current.color}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            flexShrink: 0,
          }}
        >
          {current.icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              letterSpacing: '0.12em',
              color: current.color,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 700,
            }}
          >
            HAUT FAIT DÉBLOQUÉ
          </p>
          <p
            className="font-display"
            style={{ margin: '4px 0 2px', color: '#fff', fontSize: 16, fontWeight: 800 }}
          >
            {current.name}
          </p>
          <p style={{ margin: 0, color: '#A9B0B7', fontSize: 12, lineHeight: 1.35 }}>{current.desc}</p>
        </div>
      </div>
    </div>
  )
}
