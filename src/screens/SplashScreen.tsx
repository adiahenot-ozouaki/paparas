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

  return (
    <div
      role="status"
      aria-label="Chargement Garam Paparas"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--kora-void)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div className="pattern-african" style={{ position: 'absolute', inset: 0, opacity: 0.45 }} />

      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(23,107,80,0.2) 0%, transparent 70%)',
          opacity: phase >= 1 || preferSkip ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }}
      />

      {phase >= 3 && !preferSkip && (
        <>
          <div
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: '50%',
              border: '1.5px solid rgba(214,168,79,0.45)',
              animation: 'haloExpand 1.4s ease-out forwards',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: '50%',
              border: '1px solid rgba(214,168,79,0.25)',
              animation: 'haloExpand 1.4s ease-out 0.25s forwards',
            }}
          />
        </>
      )}

      <div
        style={{
          opacity: phase >= 1 || preferSkip ? 1 : 0,
          transform: phase >= 1 || preferSkip ? 'scale(1)' : 'scale(0.55)',
          transition: preferSkip
            ? 'opacity 0.35s ease, transform 0.35s ease'
            : 'all 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 24,
            background: 'linear-gradient(145deg, var(--kora-green) 0%, var(--kora-green-deep) 55%, var(--kora-void) 100%)',
            border: '2px solid rgba(214,168,79,0.65)',
            boxShadow: '0 0 36px rgba(214,168,79,0.22), 0 10px 28px rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 36,
              height: 48,
              borderRadius: 6,
              background: 'var(--kora-card-bg)',
              border: '1.5px solid rgba(214,168,79,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 22, color: 'var(--kora-gold)', lineHeight: 1 }}>♠</span>
          </div>
        </div>
      </div>

      <div
        style={{
          opacity: phase >= 2 || preferSkip ? 1 : 0,
          transform: phase >= 2 || preferSkip ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          textAlign: 'center',
        }}
      >
        <h1
          className="text-shimmer font-display"
          style={{
            fontSize: preferSkip ? 42 : 52,
            fontWeight: 800,
            letterSpacing: '0.16em',
            lineHeight: 1,
            margin: 0,
          }}
        >
          GARAM
        </h1>
        <p
          style={{
            color: 'var(--kora-muted)',
            fontSize: 13,
            fontFamily: 'Plus Jakarta Sans',
            fontWeight: 600,
            letterSpacing: '0.36em',
            textTransform: 'uppercase',
            margin: '10px 0 0',
            opacity: phase >= 3 || preferSkip ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          PAPARAS
        </p>
      </div>

      <div
        style={{
          opacity: phase >= 4 || preferSkip ? 1 : 0,
          transition: 'opacity 0.4s ease',
          marginTop: 28,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <div style={{ width: 20, height: 1, background: 'rgba(214,168,79,0.4)' }} />
        <span style={{ color: 'var(--kora-muted-2)', fontSize: 11, letterSpacing: '0.14em', fontFamily: 'Plus Jakarta Sans' }}>
          JEU DE PLIS · KORA
        </span>
        <div style={{ width: 20, height: 1, background: 'rgba(214,168,79,0.4)' }} />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 'max(40px, env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          opacity: phase >= 4 || preferSkip ? 1 : 0,
          transition: 'opacity 0.35s ease',
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--kora-gold)',
                animation: `turnPulse 1.1s ease-in-out ${i * 0.18}s infinite`,
              }}
            />
          ))}
        </div>
        {isLoading && (
          <span style={{ color: 'var(--kora-muted-2)', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}>Connexion…</span>
        )}
      </div>
    </div>
  )
}
