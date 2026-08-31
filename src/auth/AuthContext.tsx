import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import type { KoraProfile } from '../lib/supabase/database.types'

// ==========================================================================
// AuthContext — fondation d'authentification, INDÉPENDANTE de GameContext.
//
// Volontairement séparé de game/GameContext.tsx : ce dernier gère encore
// aujourd'hui la partie 100% locale/solo (localStorage, IA). Ce contexte
// gère l'identité du joueur (compte Supabase Auth + kora_profiles) sans
// rien changer au flux de navigation existant — App.tsx n'est PAS encore
// modifié pour exiger une connexion avant de jouer en solo. Le branchement
// entre "un compte connecté" et "une partie en ligne réelle" est l'étape
// suivante (portage serveur de round.ts), pas celle-ci.
//
// Pas de mot de passe stocké ni manipulé ici au-delà de sa transmission à
// supabase-js — Supabase Auth gère le hachage et le stockage côté serveur.
// ==========================================================================

interface AuthContextValue {
  /** null tant que la session n'a pas encore été résolue au premier chargement. */
  session: Session | null
  user: User | null
  /** Ligne kora_profiles correspondante (username/avatar). null si pas encore chargée ou si déconnecté. */
  profile: KoraProfile | null
  /** true uniquement pendant la résolution initiale de session (évite un flash "déconnecté" au chargement). */
  isLoading: boolean

  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  /** Recharge la ligne kora_profiles depuis la base (ex: après modification du pseudo). */
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<KoraProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('kora_profiles').select('*').eq('id', userId).maybeSingle()
    if (error) {
      // Non bloquant : l'utilisateur reste connecté même si le profil n'a
      // pas pu être chargé (ex: latence réseau) — un nouvel essai est
      // possible via refreshProfile().
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
    // kora_profiles + kora_lifetime_stats sont auto-provisionnés côté
    // serveur par le trigger kora_handle_new_user (voir la migration SQL)
    // dès que l'inscription est confirmée — rien à faire côté client ici.
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
    }),
    [session, profile, isLoading, signUp, signIn, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>.')
  return ctx
}
