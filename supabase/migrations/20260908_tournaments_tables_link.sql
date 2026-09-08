-- ==========================================================================
-- 20260908_tournaments_tables_link.sql
-- Lier kora_tables a un tournoi (spectate / matchs affiches).
-- ==========================================================================

ALTER TABLE public.kora_tables
  ADD COLUMN IF NOT EXISTS tournament_id uuid
    REFERENCES public.kora_tournaments (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS kora_tables_tournament_id_idx
  ON public.kora_tables (tournament_id)
  WHERE tournament_id IS NOT NULL;

COMMENT ON COLUMN public.kora_tables.tournament_id IS
  'Tournoi associe (nullable). Tables live listables pour spectateurs.';
