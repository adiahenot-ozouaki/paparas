import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// ==========================================================================
// client.ts — client Supabase singleton, typé sur le schéma kora_*.
//
// Variables d'environnement Vite (préfixe VITE_ obligatoire pour être
// exposées au code client) — voir .env.example à la racine du projet.
// Ce fichier lève une erreur explicite au démarrage si elles manquent,
// plutôt que de laisser supabase-js échouer plus tard avec un message
// opaque au premier appel réseau.
// ==========================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables d\'environnement Supabase manquantes : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies (voir .env.example).',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persistance de session côté navigateur (localStorage) — comportement
    // par défaut de supabase-js, explicité ici pour que l'intention soit
    // claire : on VEUT que le joueur reste connecté entre deux visites.
    persistSession: true,
    autoRefreshToken: true,
  },
})
