import { useState } from 'react'
import type { Screen } from '../types'
import { useAuth } from '../auth/AuthContext'

// ==========================================================================
// AuthScreen — connexion / inscription / reset MDP pour le mode online.
// Solo IA reste accessible sans compte.
// ==========================================================================

type Mode = 'signIn' | 'signUp' | 'reset'

export default function AuthScreen({
  onNavigate,
  returnTo = 'home',
}: {
  onNavigate: (s: Screen) => void
  returnTo?: Screen
}) {
  const { user, profile, signUp, signIn, signOut, resetPassword, isLoading } = useAuth()
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Indiquez votre adresse email.')
      return
    }
    if (mode !== 'reset' && password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setSubmitting(true)

    if (mode === 'reset') {
      const result = await resetPassword(trimmedEmail)
      setSubmitting(false)
      if (result.error) {
        setError(result.error)
        return
      }
      setInfo(
        'Si un compte existe pour cet email, un lien de réinitialisation vient d’être envoyé. Vérifiez aussi vos spams.',
      )
      return
    }

    const result = mode === 'signUp' ? await signUp(trimmedEmail, password) : await signIn(trimmedEmail, password)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }

    if (mode === 'signUp') {
      // Selon config Supabase : session immédiate ou confirmation email
      setInfo('Compte créé. Si la confirmation email est activée, ouvrez le lien reçu avant de vous connecter.')
      // Si session déjà active, onNavigate se fera via l’état user au prochain render
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
          type="button"
          className="btn-primary glow-gold"
          onClick={() => onNavigate(returnTo)}
          style={{ padding: '12px 28px', fontSize: 14, borderRadius: 14, marginTop: 8 }}
        >
          Continuer →
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void signOut()}
          style={{ padding: '10px 24px', fontSize: 13, borderRadius: 12 }}
        >
          Se déconnecter
        </button>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          style={{ background: 'none', border: 'none', color: '#A9B0B7', fontSize: 12, cursor: 'pointer', marginTop: 8 }}
        >
          Accueil
        </button>
      </div>
    )
  }

  const title = mode === 'signUp' ? 'Créer un compte' : mode === 'reset' ? 'Mot de passe oublié' : 'Connexion'
  const subtitle =
    mode === 'reset'
      ? 'Recevez un lien de réinitialisation par email'
      : 'Requis pour jouer en ligne · le solo IA reste libre'

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
        type="button"
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

      <h1 className="font-display text-gold" style={{ fontSize: 26, fontWeight: 800, margin: '0 0 8px', letterSpacing: '0.06em', textAlign: 'center' }}>
        {title}
      </h1>
      <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 24px', textAlign: 'center', maxWidth: 320 }}>
        {subtitle}
      </p>

      <form onSubmit={e => void handleSubmit(e)} style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          style={inputStyle}
        />
        {mode !== 'reset' && (
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
        )}

        {error && (
          <div
            role="alert"
            style={{
              background: 'rgba(201,75,75,0.12)',
              border: '1px solid rgba(201,75,75,0.35)',
              borderRadius: 12,
              padding: '10px 12px',
            }}
          >
            <p style={{ color: '#E8A0A0', fontSize: 12, margin: 0, lineHeight: 1.45 }}>{error}</p>
          </div>
        )}

        {info && (
          <div
            role="status"
            style={{
              background: 'rgba(76,175,118,0.12)',
              border: '1px solid rgba(76,175,118,0.35)',
              borderRadius: 12,
              padding: '10px 12px',
            }}
          >
            <p style={{ color: '#8FD4A8', fontSize: 12, margin: 0, lineHeight: 1.45 }}>{info}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary glow-gold"
          style={{
            padding: '14px',
            fontSize: 14,
            borderRadius: 14,
            letterSpacing: '0.06em',
            marginTop: 8,
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting
            ? 'Un instant…'
            : mode === 'signUp'
              ? "S'inscrire"
              : mode === 'reset'
                ? 'Envoyer le lien'
                : 'Se connecter'}
        </button>
      </form>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {mode === 'signIn' && (
          <button
            type="button"
            onClick={() => switchMode('reset')}
            style={{
              background: 'none',
              border: 'none',
              color: '#A9B0B7',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            Mot de passe oublié ?
          </button>
        )}

        {mode === 'reset' ? (
          <button type="button" onClick={() => switchMode('signIn')} style={linkStyle}>
            ← Retour à la connexion
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchMode(mode === 'signUp' ? 'signIn' : 'signUp')}
            style={linkStyle}
          >
            {mode === 'signUp' ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? Créer un compte'}
          </button>
        )}
      </div>
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

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#D6A84F',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'Plus Jakarta Sans',
}
