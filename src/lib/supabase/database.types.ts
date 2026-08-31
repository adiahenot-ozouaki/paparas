// ==========================================================================
// database.types.ts — Miroir TypeScript du schéma Supabase `kora_*`.
//
// Écrit à la main en miroir EXACT de la migration SQL appliquée
// (kora_schema_and_auth_foundations) — le générateur automatique
// (Supabase:generate_typescript_types) n'a pas répondu au moment de
// l'écriture. À REMPLACER par le générateur dès qu'il redevient
// disponible, pour ne jamais risquer une dérive entre ce fichier et le
// schéma réel :
//
//   npx supabase gen types typescript --project-id acqxiwedxproqjffnerb > src/lib/supabase/database.types.ts
//
// Note sur les colonnes `bigint` (capital, gains...) : Postgres les
// renvoie dans une plage largement inférieure à Number.MAX_SAFE_INTEGER
// pour ce jeu (montants en FCFA, jamais des milliards), donc typées ici
// en `number` par pragmatisme — cohérent avec le reste du client
// (game/payout.ts, types.ts) qui traite déjà tout le capital en `number`.
// Si un jour les montants pouvaient dépasser 2^53, il faudrait revoir ce
// choix (PostgREST peut sérialiser les bigint en string).
// ==========================================================================

export type ComboTypeDb = 'simple' | 'kora' | '33' | 'trinity' | 'kmt'
export type SpecialRuleTypeDb = 'flush' | '21' | 't7'
export type DeckVariantDb = '9' | '10' | 'as'
export type TableStatusDb = 'lobby' | 'playing' | 'finished'
export type RoundPhaseDb = 'specialWin' | 'playing' | 'trickWon' | 'roundEnd'

export interface ComboCountsDb {
  simple: number
  kora: number
  '33': number
  trinity: number
  kmt: number
}

export interface SpecialRuleCountsDb {
  flush: number
  '21': number
  t7: number
}

export interface Database {
  public: {
    Tables: {
      kora_profiles: {
        Row: {
          id: string
          username: string
          avatar: string
          created_at: string
        }
        Insert: {
          id: string
          username: string
          avatar?: string
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar?: string
          created_at?: string
        }
      }
      kora_lifetime_stats: {
        Row: {
          user_id: string
          games_played: number
          games_won: number
          total_rounds_won: number
          total_tricks_won: number
          best_combo: ComboTypeDb | null
          net_gain_total: number
          total_gains: number
          total_losses: number
          max_capital_ever: number
          min_capital_ever: number
          combo_counts: ComboCountsDb
          special_rule_counts: SpecialRuleCountsDb
          updated_at: string
        }
        // Écriture exclusivement service role — pas de shape client-side
        // significative, mais on la garde pour typer un futur usage
        // depuis une Edge Function (mêmes outils, même client typé).
        Insert: Partial<Database['public']['Tables']['kora_lifetime_stats']['Row']> & { user_id: string }
        Update: Partial<Database['public']['Tables']['kora_lifetime_stats']['Row']>
      }
      kora_tables: {
        Row: {
          id: string
          status: TableStatusDb
          base_stake: number
          starting_capital: number
          deck_variant: DeckVariantDb
          created_by: string
          created_at: string
          started_at: string | null
          finished_at: string | null
        }
        Insert: {
          id?: string
          status?: TableStatusDb
          base_stake: number
          starting_capital: number
          deck_variant?: DeckVariantDb
          created_by: string
          created_at?: string
          started_at?: string | null
          finished_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['kora_tables']['Insert']>
      }
      kora_table_players: {
        Row: {
          id: string
          table_id: string
          user_id: string
          seat_index: number
          capital: number
          is_eliminated: boolean
          is_ready: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          table_id: string
          user_id: string
          seat_index: number
          capital: number
          is_eliminated?: boolean
          is_ready?: boolean
          joined_at?: string
        }
        Update: Partial<Database['public']['Tables']['kora_table_players']['Insert']>
      }
      kora_rounds: {
        Row: {
          id: string
          table_id: string
          round_number: number
          phase: RoundPhaseDb
          current_trick: unknown | null
          play_log: unknown
          trick_winners: unknown
          banked_players: unknown
          outcome: unknown | null
          created_at: string
        }
        // Serveur-only (aucune policy d'écriture client) — shape présente
        // pour usage futur côté Edge Function uniquement.
        Insert: Partial<Database['public']['Tables']['kora_rounds']['Row']> & { table_id: string; round_number: number }
        Update: Partial<Database['public']['Tables']['kora_rounds']['Row']>
      }
      kora_round_hands: {
        Row: {
          id: string
          round_id: string
          user_id: string
          seat_index: number
          cards: unknown
          revealed: boolean
        }
        // Serveur-only également.
        Insert: Partial<Database['public']['Tables']['kora_round_hands']['Row']> & {
          round_id: string
          user_id: string
          seat_index: number
          cards: unknown
        }
        Update: Partial<Database['public']['Tables']['kora_round_hands']['Row']>
      }
    }
  }
}

export type KoraProfile = Database['public']['Tables']['kora_profiles']['Row']
export type KoraLifetimeStatsRow = Database['public']['Tables']['kora_lifetime_stats']['Row']
export type KoraTable = Database['public']['Tables']['kora_tables']['Row']
export type KoraTablePlayer = Database['public']['Tables']['kora_table_players']['Row']
