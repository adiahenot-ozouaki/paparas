import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import type { KoraProfile } from '../lib/supabase/database.types'

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

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: KoraProfile | null
  isLoading: boolean

  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (patch: { username?: string; avatar?: string }) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<KoraProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('kora_profiles').select('*').eq('id', userId).maybeSingle()
    if (error) {
      console.error('[AuthContext] Échec du chargement de kora_profiles :', error.message)
      return
    }
    setProfile(data)
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
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
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
        // Un seul emoji / glyphe court — refuse les chaînes longues (injection UI)
        const avatar = patch.avatar.trim()
        if (!avatar || [...avatar].length > 4) return { error: 'Avatar invalide.' }
        updates.avatar = avatar
      }
      if (Object.keys(updates).length === 0) return { error: null }

      // Toujours filtrer sur auth.uid() — la RLS double la protection.
      const { data, error } = await supabase
        .from('kora_profiles')
        .update(updates)
        .eq('id', session.user.id)
        .select('id, username, avatar, created_at')
        .maybeSingle()

      if (error) {
        if (error.code === '23505' || /unique|duplicate/i.test(error.message)) {
          return { error: 'Ce pseudo est déjà pris.' }
        }
        return { error: error.message }
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
      refreshProfile,
      updateProfile,
    }),
    [session, profile, isLoading, signUp, signIn, signOut, refreshProfile, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>.')
  return ctx
}
