import { useEffect, useState } from 'react'
import type { Screen } from '../types'

export default function SplashScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400)
    const t2 = setTimeout(() => setPhase(2), 1000)
    const t3 = setTimeout(() => setPhase(3), 1600)
    const t4 = setTimeout(() => setPhase(4), 2200)
    const t5 = setTimeout(() => onNavigate('home'), 3400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5) }
  }, [onNavigate])

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: '#0B0D10',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Subtle African pattern bg */}
      <div className="pattern-african" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />

      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(23,107,80,0.18) 0%, transparent 70%)',
        opacity: phase >= 1 ? 1 : 0,
        transition: 'opacity 1s ease',
      }} />

      {/* Gold halo ring */}
      {phase >= 3 && (
        <>
          <div style={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            border: '1.5px solid rgba(214,168,79,0.5)',
            animation: 'haloExpand 1.5s ease-out forwards',
          }} />
          <div style={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            border: '1px solid rgba(214,168,79,0.3)',
            animation: 'haloExpand 1.5s ease-out 0.3s forwards',
          }} />
        </>
      )}

      {/* Logo mark — card + crown symbol */}
      <div style={{
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(-20deg)',
        transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Icon mark */}
        <div style={{
          width: 80,
          height: 80,
          background: 'linear-gradient(135deg, #123C32, #0d2a1f)',
          borderRadius: 22,
          border: '2px solid rgba(214,168,79,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 40px rgba(214,168,79,0.25), 0 8px 32px rgba(0,0,0,0.6)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Diamond pattern inside */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\'%3E%3Cpolygon points=\'8,0 16,8 8,16 0,8\' fill=\'none\' stroke=\'rgba(214,168,79,0.12)\' stroke-width=\'0.8\'/%3E%3C/svg%3E")',
          }} />
          <div style={{ position: 'relative', textAlign: 'center', lineHeight: 1 }}>
            <div style={{ fontSize: 28, color: '#D6A84F', lineHeight: 1 }}>♠</div>
            <div style={{
              position: 'absolute',
              top: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 14,
              color: '#F0D58A',
            }}>♛</div>
          </div>
        </div>
      </div>

      {/* GARAM */}
      <div style={{
        opacity: phase >= 2 ? 1 : 0,
        transform: phase >= 2 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        textAlign: 'center',
      }}>
        <h1 className="text-shimmer font-display" style={{
          fontSize: 56,
          fontWeight: 800,
          letterSpacing: '0.18em',
          lineHeight: 1,
          margin: 0,
        }}>
          GARAM
        </h1>
      </div>

      {/* PAPARAS */}
      <div style={{
        opacity: phase >= 3 ? 1 : 0,
        transform: phase >= 3 ? 'translateY(0)' : 'translateY(12px)',
        transition: 'all 0.5s ease 0.1s',
        marginTop: 8,
      }}>
        <p style={{
          color: '#A9B0B7',
          fontSize: 14,
          fontFamily: 'Plus Jakarta Sans',
          fontWeight: 500,
          letterSpacing: '0.38em',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          PAPARAS
        </p>
      </div>

      {/* Tagline */}
      <div style={{
        opacity: phase >= 4 ? 1 : 0,
        transition: 'opacity 0.5s ease',
        marginTop: 32,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}>
        <div style={{ width: 24, height: 1, background: 'rgba(214,168,79,0.4)' }} />
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, letterSpacing: '0.15em', fontFamily: 'Plus Jakarta Sans' }}>
          JEU DE CARTES AFRICAIN
        </span>
        <div style={{ width: 24, height: 1, background: 'rgba(214,168,79,0.4)' }} />
      </div>

      {/* Loader */}
      <div style={{
        position: 'absolute',
        bottom: 48,
        display: 'flex',
        gap: 6,
        opacity: phase >= 4 ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#D6A84F',
            animation: `turnPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}
