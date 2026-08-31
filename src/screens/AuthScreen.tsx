import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

// ==========================================================================
// AuthScreen — écran de test des fondations d'authentification.
//
// PAS ENCORE intégré au flux de navigation principal (App.tsx) : ce n'est
// pas un choix anodin — imposer une connexion avant de pouvoir jouer en
// solo contre l'IA serait un changement de produit, pas une fondation
// technique. Cet écran est autonome et prêt à être branché quand le mode
// en ligne sera réellement disponible (prochaine étape : portage serveur
// de round.ts). En attendant, il permet de vérifier que signUp/signIn/
// signOut et l'auto-provisioning de kora_profiles fonctionnent de bout
// en bout.
// ==========================================================================

export default function AuthScreen() {
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
    if (result.error) setError(result.error)
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
      <div style={{
        position: 'absolute', inset: 0, background: '#0B0D10', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
      }}>
        <div style={{ fontSize: 40 }}>{profile?.avatar ?? '🦅'}</div>
        <p className="font-display" style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
          {profile?.username ?? 'Profil en cours de chargement…'}
        </p>
        <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>{user.email}</p>
        <button
          className="btn-secondary"
          onClick={() => void signOut()}
          style={{ padding: '10px 24px', fontSize: 13, borderRadius: 12, marginTop: 8 }}
        >
          Se déconnecter
        </button>
      </div>
    )
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0B0D10', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      <h1 className="font-display text-gold" style={{ fontSize: 28, fontWeight: 800, margin: '0 0 24px', letterSpacing: '0.06em' }}>
        {mode === 'signUp' ? 'Créer un compte' : 'Connexion'}
      </h1>

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
        style={{ background: 'none', border: 'none', color: '#D6A84F', fontSize: 12, marginTop: 16, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans' }}
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
