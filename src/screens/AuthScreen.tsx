import { useState } from 'react'
import type { Screen } from '../types'
import { useAuth } from '../auth/AuthContext'
import { AlertBanner, BackButton, ScreenShell, UiButton } from '../components/ui'

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
      <ScreenShell bottomPad={0} className="auth-screen auth-screen--center">
        <span className="auth-muted">Chargement…</span>
      </ScreenShell>
    )
  }

  if (user) {
    return (
      <ScreenShell bottomPad={0} className="auth-screen auth-screen--center auth-screen--session">
        <div className="auth-avatar">{profile?.avatar ?? '🦅'}</div>
        <p className="font-display auth-username">{profile?.username ?? 'Profil…'}</p>
        <p className="auth-muted auth-email">{user.email}</p>
        <UiButton onClick={() => onNavigate(returnTo)} className="auth-continue">
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
    <ScreenShell bottomPad={0} className="auth-screen auth-screen--center">
      <BackButton onClick={() => onNavigate('home')} />

      <h1 className="font-display text-gold auth-title">{title}</h1>
      <p className="auth-muted auth-subtitle">{subtitle}</p>

      <form onSubmit={e => void handleSubmit(e)} className="auth-form">
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

        <UiButton type="submit" disabled={submitting} fullWidth className="auth-submit">
          {submitting
            ? 'Un instant…'
            : mode === 'signUp'
              ? "S'inscrire"
              : mode === 'reset'
                ? 'Envoyer le lien'
                : 'Se connecter'}
        </UiButton>
      </form>

      <div className="auth-footer">
        {mode === 'signIn' && (
          <button type="button" onClick={() => switchMode('reset')} className="auth-link">
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
