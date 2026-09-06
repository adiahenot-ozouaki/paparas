import { useEffect, useState } from 'react'
import type { Screen } from '../types'
import { useAuth } from '../auth/AuthContext'

const STORAGE_KEY_SEEN = 'kora:splashSeen:v1'
const FULL_MS = 2800
const SKIP_MS = 550

function hasSeenSplash(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_SEEN) === '1'
  } catch {
    return false
  }
}

function markSplashSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY_SEEN, '1')
  } catch {
    // ignore
  }
}

export default function SplashScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { user, isLoading } = useAuth()
  const [phase, setPhase] = useState(0)
  const [readyToLeave, setReadyToLeave] = useState(false)
  const preferSkip = hasSeenSplash() || !!user

  useEffect(() => {
    if (preferSkip) {
      setPhase(4)
      return
    }
    const t1 = window.setTimeout(() => setPhase(1), 280)
    const t2 = window.setTimeout(() => setPhase(2), 700)
    const t3 = window.setTimeout(() => setPhase(3), 1200)
    const t4 = window.setTimeout(() => setPhase(4), 1700)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearTimeout(t4)
    }
  }, [preferSkip])

  useEffect(() => {
    const delay = preferSkip ? SKIP_MS : FULL_MS
    const t = window.setTimeout(() => setReadyToLeave(true), delay)
    return () => window.clearTimeout(t)
  }, [preferSkip])

  useEffect(() => {
    if (!readyToLeave || isLoading) return
    markSplashSeen()
    onNavigate('home')
  }, [readyToLeave, isLoading, onNavigate])

  const show = (min: number) => phase >= min || preferSkip

  return (
    <div className="splash-screen" role="status" aria-label="Chargement Garam Paparas">
      <div className="pattern-african splash-pattern" />

      <div className={`splash-glow${show(1) ? ' is-visible' : ''}`} />

      {phase >= 3 && !preferSkip && (
        <>
          <div className="splash-halo" />
          <div className="splash-halo splash-halo--delayed" />
        </>
      )}

      <div
        className={`splash-logo-wrap${show(1) ? ' is-visible' : ''}${preferSkip ? ' is-skip' : ''}`}
      >
        <div className="splash-logo">
          <div className="splash-logo-card">
            <span className="splash-logo-suit">♠</span>
          </div>
        </div>
      </div>

      <div className={`splash-brand${show(2) ? ' is-visible' : ''}`}>
        <h1 className={`text-shimmer font-display splash-title${preferSkip ? ' splash-title--compact' : ''}`}>
          GARAM
        </h1>
        <p className={`splash-subtitle${show(3) ? ' is-visible' : ''}`}>PAPARAS</p>
      </div>

      <div className={`splash-tagline${show(4) ? ' is-visible' : ''}`}>
        <div className="splash-tagline-line" />
        <span className="splash-tagline-text">JEU DE PLIS · KORA</span>
        <div className="splash-tagline-line" />
      </div>

      <div className={`splash-footer${show(4) ? ' is-visible' : ''}`}>
        <div className="splash-dots">
          {[0, 1, 2].map(i => (
            <div key={i} className="splash-dot" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
        {isLoading && <span className="splash-loading-text">Connexion…</span>}
      </div>
    </div>
  )
}
