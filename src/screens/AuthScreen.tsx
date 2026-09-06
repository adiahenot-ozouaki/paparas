import { useState } from 'react'
import type { Screen } from '../types'
import { useAuth } from '../auth/AuthContext'
import { AlertBanner, ScreenShell, UiButton } from '../components/ui'

// ==========================================================================
// AuthScreen — connexion / inscription / reset MDP pour le mode online.
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
      setInfo('Compte créé. Si la confirmation email est activée, ouvrez le lien reçu avant de vous connecter.')
    }
    onNavigate(returnTo)
  }

  if (isLoading) {
    return (
      <ScreenShell bottomPad={0} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#A9B0B7', fontSize: 13 }}>Chargement…</span>
      </ScreenShell>
    )
  }

  if (user) {
    return (
      <ScreenShell
        bottomPad={0}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}
      >
        <div style={{ fontSize: 40 }}>{profile?.avatar ?? '🦅'}</div>
        <p className="font-display" style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
          {profile?.username ?? 'Profil…'}
        </p>
        <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>{user.email}</p>
        <UiButton onClick={() => onNavigate(returnTo)} style={{ marginTop: 8 }}>
          Continuer →
        </UiButton>
        <UiButton variant="secondary" onClick={() => void signOut()}>
          Se déconnecter
        </UiButton>
        <UiButton variant="ghost" onClick={() => onNavigate('home')}>
          Accueil
        </UiButton>
      </ScreenShell>
    )
  }

  const title = mode === 'signUp' ? 'Créer un compte' : mode === 'reset' ? 'Mot de passe oublié' : 'Connexion'
  const subtitle =
    mode === 'reset'
      ? 'Recevez un lien de réinitialisation par email'
      : 'Requis pour jouer en ligne · le solo IA reste libre'

  return (
    <ScreenShell
      bottomPad={0}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
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
          zIndex: 2,
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
          className="ui-field"
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
        />
        {mode !== 'reset' && (
          <input
            className="ui-field"
            type="password"
            required
            minLength={6}
            placeholder="Mot de passe (6 caractères min.)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
          />
        )}

        {error && <AlertBanner tone="error">{error}</AlertBanner>}
        {info && <AlertBanner tone="success">{info}</AlertBanner>}

        <UiButton type="submit" disabled={submitting} fullWidth style={{ marginTop: 8, letterSpacing: '0.06em' }}>
          {submitting
            ? 'Un instant…'
            : mode === 'signUp'
              ? "S'inscrire"
              : mode === 'reset'
                ? 'Envoyer le lien'
                : 'Se connecter'}
        </UiButton>
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
          <UiButton variant="ghost" onClick={() => switchMode('signIn')}>
            ← Retour à la connexion
          </UiButton>
        ) : (
          <UiButton variant="ghost" onClick={() => switchMode(mode === 'signUp' ? 'signIn' : 'signUp')}>
            {mode === 'signUp' ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? Créer un compte'}
          </UiButton>
        )}
      </div>
    </ScreenShell>
  )
}
