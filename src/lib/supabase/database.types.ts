// ==========================================================================
// database.types.ts — Miroir TypeScript du schema Supabase `kora_*`.
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
          wallet_balance: number
          created_at: string
        }
        Insert: {
          id: string
          username: string
          avatar?: string
          wallet_balance?: number
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar?: string
          wallet_balance?: number
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
        Insert: Partial<Database['public']['Tables']['kora_lifetime_stats']['Row']> & { user_id: string }
        Update: Partial<Database['public']['Tables']['kora_lifetime_stats']['Row']>
      }
      kora_tables: {
        Row: {
          id: string
          status: TableStatusDb
          host_user_id: string
          base_stake: number
          starting_capital: number
          deck_variant: DeckVariantDb
          end_mode: string
          max_rounds: number
          target_capital: number
          join_code: string
          created_at: string
          started_at: string | null
          finished_at: string | null
        }
        Insert: {
          id?: string
          status?: TableStatusDb
          host_user_id: string
          base_stake: number
          starting_capital: number
          deck_variant?: DeckVariantDb
          end_mode?: string
          max_rounds?: number
          target_capital?: number
          join_code: string
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
        Insert: Partial<Database['public']['Tables']['kora_round_hands']['Row']> & {
          round_id: string
          user_id: string
          seat_index: number
          cards: unknown
        }
        Update: Partial<Database['public']['Tables']['kora_round_hands']['Row']>
      }
      kora_tournaments: {
        Row: {
          id: string
          name: string
          status: 'upcoming' | 'open' | 'live' | 'completed'
          format: 'single_elim' | 'rounds_race' | 'swiss'
          entry_fee_fcfa: number
          prize_pool_fcfa: number
          prizes: unknown
          max_players: number
          starts_at: string
          tagline: string
          rules_preset: 'standard' | 'training' | 'high_stakes'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          status?: 'upcoming' | 'open' | 'live' | 'completed'
          format: 'single_elim' | 'rounds_race' | 'swiss'
          entry_fee_fcfa?: number
          prize_pool_fcfa?: number
          prizes?: unknown
          max_players: number
          starts_at: string
          tagline?: string
          rules_preset?: 'standard' | 'training' | 'high_stakes'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['kora_tournaments']['Insert']>
      }
      kora_tournament_registrations: {
        Row: {
          tournament_id: string
          user_id: string
          registered_at: string
        }
        Insert: {
          tournament_id: string
          user_id: string
          registered_at?: string
        }
        Update: Partial<Database['public']['Tables']['kora_tournament_registrations']['Row']>
      }
    }
    Functions: {
      kora_ensure_player_rows: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      kora_merge_lifetime_stats: {
        Args: { p_stats: Record<string, unknown> }
        Returns: Database['public']['Tables']['kora_lifetime_stats']['Row']
      }
      kora_register_tournament: {
        Args: { p_tournament_id: string }
        Returns: { ok: boolean; error?: string; registered_count?: number; tournament_id?: string }
      }
      kora_unregister_tournament: {
        Args: { p_tournament_id: string }
        Returns: { ok: boolean; error?: string; tournament_id?: string }
      }
    }
  }
}

export type KoraProfile = Database['public']['Tables']['kora_profiles']['Row']
export type KoraLifetimeStatsRow = Database['public']['Tables']['kora_lifetime_stats']['Row']
export type KoraTable = Database['public']['Tables']['kora_tables']['Row']
export type KoraTablePlayer = Database['public']['Tables']['kora_table_players']['Row']
export type KoraTournament = Database['public']['Tables']['kora_tournaments']['Row']
export type KoraTournamentRegistration = Database['public']['Tables']['kora_tournament_registrations']['Row']
