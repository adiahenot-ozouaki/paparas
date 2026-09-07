import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import type { KoraProfile } from '../lib/supabase/database.types'
import { validateAvatarValue } from '../lib/avatar'

// ==========================================================================
// AuthContext — identité joueur (Supabase Auth + kora_profiles).
// ==========================================================================

const USERNAME_MIN = 2
const USERNAME_MAX = 20
/** Lettres unicode, chiffres, espace, underscore, point, tiret — pas de contrôles. */
const USERNAME_RE = /^[\p{L}\p{N}][\p{L}\p{N}_.\- ]{0,18}[\p{L}\p{N}]$|^[\p{L}\p{N}]{2}$/u

export function validateUsername(raw: string): string | null {
  const username = raw.trim().replace(/\s+/g, ' ')
  if (username.length < USERNAME_MIN) return `Au moins ${USERNAME_MIN} caractères.`
  if (username.length > USERNAME_MAX) return `Maximum ${USERNAME_MAX} caractères.`
  if (/[\u0000-\u001F\u007F]/.test(username)) return 'Caractères de contrôle interdits.'
  if (!USERNAME_RE.test(username)) return 'Lettres, chiffres, espaces, _ . - uniquement.'
  return null
}

/** Messages Auth Supabase → français joueur. */
export function humanizeAuthError(raw: string | null | undefined): string {
  if (!raw) return 'Une erreur est survenue.'
  const s = raw.trim()
  const lower = s.toLowerCase()

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Email ou mot de passe incorrect.'
  }
  if (lower.includes('email not confirmed') || lower.includes('not confirmed')) {
    return 'Confirmez votre email (lien dans votre boîte de réception) avant de vous connecter.'
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez le mot de passe.'
  }
  if (lower.includes('password should be at least') || lower.includes('password is known to be weak')) {
    return 'Mot de passe trop court ou trop faible (6 caractères minimum).'
  }
  if (lower.includes('unable to validate email') || lower.includes('invalid email')) {
    return 'Adresse email invalide.'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('email rate limit')) {
    return 'Trop de tentatives. Attendez une minute puis réessayez.'
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Réseau indisponible. Vérifiez votre connexion.'
  }
  if (lower.includes('signup is disabled')) {
    return 'Les inscriptions sont temporairement fermées.'
  }
  if (lower.includes('user not found')) {
    return 'Aucun compte trouvé pour cet email.'
  }
  if (s.length > 160) return s.slice(0, 150) + '…'
  return s
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: KoraProfile | null
  isLoading: boolean

  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
  updateProfile: (patch: { username?: string; avatar?: string }) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<KoraProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    await supabase.rpc('kora_ensure_player_rows', { p_user_id: userId })

    const { data, error } = await supabase
      .from('kora_profiles')
      .select('id, username, avatar, wallet_balance, created_at')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.error('[AuthContext] Échec du chargement de kora_profiles :', error.message)
      return
    }
    setProfile(data as KoraProfile | null)
  }, [])

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      setIsLoading(false)
      if (data.session?.user) {
        void loadProfile(data.session.user.id)
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return
      setSession(newSession)
      if (newSession?.user) {
        void loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    return { error: error ? humanizeAuthError(error.message) : null }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    return { error: error ? humanizeAuthError(error.message) : null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const trimmed = email.trim()
    if (!trimmed) return { error: 'Indiquez votre adresse email.' }

    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/` : undefined

    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    })
    return { error: error ? humanizeAuthError(error.message) : null }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await loadProfile(session.user.id)
    }
  }, [session, loadProfile])

  const updateProfile = useCallback(
    async (patch: { username?: string; avatar?: string }) => {
      if (!session?.user) return { error: 'Non connecté.' }

      const updates: { username?: string; avatar?: string } = {}

      if (patch.username !== undefined) {
        const trimmed = patch.username.trim().replace(/\s+/g, ' ')
        const v = validateUsername(trimmed)
        if (v) return { error: v }
        updates.username = trimmed
      }
      if (patch.avatar !== undefined) {
        const avatar = patch.avatar.trim()
        const av = validateAvatarValue(avatar)
        if (av) return { error: av }
        // chaîne vide = image par défaut côté UI
        updates.avatar = avatar
      }
      if (Object.keys(updates).length === 0) return { error: null }

      const { data, error } = await supabase
        .from('kora_profiles')
        .update(updates)
        .eq('id', session.user.id)
        .select('id, username, avatar, wallet_balance, created_at')
        .maybeSingle()

      if (error) {
        if (error.code === '23505' || /unique|duplicate/i.test(error.message)) {
          return { error: 'Ce pseudo est déjà pris.' }
        }
        return { error: humanizeAuthError(error.message) }
      }
      if (data) setProfile(data as KoraProfile)
      else await loadProfile(session.user.id)
      return { error: null }
    },
    [session, loadProfile],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      refreshProfile,
      updateProfile,
    }),
    [session, profile, isLoading, signUp, signIn, signOut, resetPassword, refreshProfile, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>.')
  return ctx
}
