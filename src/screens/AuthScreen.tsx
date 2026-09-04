import { useState } from 'react'
import type { Screen } from '../types'
import { useAuth } from '../auth/AuthContext'

// ==========================================================================
// AuthScreen — connexion / inscription pour le mode online.
// Solo IA reste accessible sans compte.
// ==========================================================================

export default function AuthScreen({
  onNavigate,
  returnTo = 'home',
}: {
  onNavigate: (s: Screen) => void
  returnTo?: Screen
}) {
  const { user, profile, signUp, signIn, signOut, isLoading } = useAuth()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = mode === 'signUp' ? await signUp(email, password) : await signIn(email, password)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onNavigate(returnTo)
  }

  if (isLoading) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#0B0D10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#A9B0B7', fontSize: 13 }}>Chargement…</span>
      </div>
    )
  }

  if (user) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#0B0D10',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
        }}
      >
        <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />
        <div style={{ fontSize: 40 }}>{profile?.avatar ?? '🦅'}</div>
        <p className="font-display" style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
          {profile?.username ?? 'Profil…'}
        </p>
        <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>{user.email}</p>
        <button
          className="btn-primary glow-gold"
          onClick={() => onNavigate(returnTo)}
          style={{ padding: '12px 28px', fontSize: 14, borderRadius: 14, marginTop: 8 }}
        >
          Continuer →
        </button>
        <button
          className="btn-secondary"
          onClick={() => void signOut()}
          style={{ padding: '10px 24px', fontSize: 13, borderRadius: 12 }}
        >
          Se déconnecter
        </button>
        <button
          onClick={() => onNavigate('home')}
          style={{ background: 'none', border: 'none', color: '#A9B0B7', fontSize: 12, cursor: 'pointer', marginTop: 8 }}
        >
          Accueil
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#0B0D10',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      <button
        onClick={() => onNavigate('home')}
        aria-label="Retour"
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          width: 40,
          height: 40,
          color: '#fff',
          fontSize: 18,
          cursor: 'pointer',
        }}
      >
        ←
      </button>

      <h1 className="font-display text-gold" style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '0.06em' }}>
        {mode === 'signUp' ? 'Créer un compte' : 'Connexion'}
      </h1>
      <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 24px', textAlign: 'center' }}>
        Requis pour jouer en ligne · le solo IA reste libre
      </p>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          style={inputStyle}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Mot de passe (6 caractères min.)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
          style={inputStyle}
        />

        {error && (
          <p role="alert" style={{ color: '#C94B4B', fontSize: 12, margin: 0 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary glow-gold"
          style={{ padding: '14px', fontSize: 14, borderRadius: 14, letterSpacing: '0.06em', marginTop: 8, opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? 'Un instant…' : mode === 'signUp' ? "S'inscrire" : 'Se connecter'}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(m => (m === 'signUp' ? 'signIn' : 'signUp'))
          setError(null)
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#D6A84F',
          fontSize: 12,
          marginTop: 16,
          cursor: 'pointer',
          fontFamily: 'Plus Jakarta Sans',
        }}
      >
        {mode === 'signUp' ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? Créer un compte'}
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  padding: '12px 14px',
  color: '#fff',
  fontSize: 14,
  fontFamily: 'Inter, sans-serif',
}
