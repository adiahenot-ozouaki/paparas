-- ==========================================================================
-- 20260904_secure_user_data.sql
-- Durcissement RLS / droits sur le schéma kora_* (données utilisateur).
--
-- À appliquer dans le SQL Editor Supabase (projet acqxiwedxproqjffnerb)
-- ou via : supabase db push
--
-- Objectif :
--   • Un joueur ne peut modifier QUE son profil (username/avatar).
--   • Pas de DELETE client sur profils / stats.
--   • Stats & mains : écriture exclusivement service_role (edge function).
--   • Mains : un joueur ne lit QUE ses propres cartes.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. kora_profiles
-- --------------------------------------------------------------------------
ALTER TABLE public.kora_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kora_profiles_select_authenticated" ON public.kora_profiles;
DROP POLICY IF EXISTS "kora_profiles_update_own" ON public.kora_profiles;
DROP POLICY IF EXISTS "kora_profiles_insert_own" ON public.kora_profiles;
DROP POLICY IF EXISTS "kora_profiles_delete_own" ON public.kora_profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.kora_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.kora_profiles;

-- Lecture des pseudos/avatars pour lobby, table et classement (connecté uniquement).
CREATE POLICY "kora_profiles_select_authenticated"
  ON public.kora_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Mise à jour limitée à sa propre ligne.
CREATE POLICY "kora_profiles_update_own"
  ON public.kora_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insert possible uniquement pour soi (filet si le trigger rate).
CREATE POLICY "kora_profiles_insert_own"
  ON public.kora_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- PAS de policy DELETE pour authenticated/anon → suppression interdite côté client.

REVOKE ALL ON public.kora_profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.kora_profiles TO authenticated;
-- Pas de DELETE accordé explicitement aux rôles client.
REVOKE DELETE ON public.kora_profiles FROM authenticated, anon;

-- --------------------------------------------------------------------------
-- 2. kora_lifetime_stats — lecture ok (classement), écriture service_role only
-- --------------------------------------------------------------------------
ALTER TABLE public.kora_lifetime_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kora_lifetime_stats_select_authenticated" ON public.kora_lifetime_stats;
DROP POLICY IF EXISTS "kora_lifetime_stats_no_client_write" ON public.kora_lifetime_stats;

CREATE POLICY "kora_lifetime_stats_select_authenticated"
  ON public.kora_lifetime_stats
  FOR SELECT
  TO authenticated
  USING (true);

-- Aucune policy INSERT/UPDATE/DELETE pour authenticated → écriture client impossible.

REVOKE ALL ON public.kora_lifetime_stats FROM anon;
GRANT SELECT ON public.kora_lifetime_stats TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.kora_lifetime_stats FROM authenticated, anon;

-- --------------------------------------------------------------------------
-- 3. kora_round_hands — anti-triche : uniquement SA main en clair
-- --------------------------------------------------------------------------
ALTER TABLE public.kora_round_hands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kora_round_hands_select_own" ON public.kora_round_hands;
DROP POLICY IF EXISTS "kora_round_hands_select_authenticated" ON public.kora_round_hands;

CREATE POLICY "kora_round_hands_select_own"
  ON public.kora_round_hands
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Écriture réservée au service_role (edge function), aucune policy client write.

REVOKE ALL ON public.kora_round_hands FROM anon;
GRANT SELECT ON public.kora_round_hands TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.kora_round_hands FROM authenticated, anon;

-- --------------------------------------------------------------------------
-- 4. kora_rounds — lecture pour joueurs de la table, pas d'écriture client
-- --------------------------------------------------------------------------
ALTER TABLE public.kora_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kora_rounds_select_table_member" ON public.kora_rounds;

CREATE POLICY "kora_rounds_select_table_member"
  ON public.kora_rounds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.kora_table_players p
      WHERE p.table_id = kora_rounds.table_id
        AND p.user_id = auth.uid()
    )
  );

REVOKE ALL ON public.kora_rounds FROM anon;
GRANT SELECT ON public.kora_rounds TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.kora_rounds FROM authenticated, anon;

-- --------------------------------------------------------------------------
-- 5. kora_table_players — s'asseoir en son nom uniquement
-- --------------------------------------------------------------------------
ALTER TABLE public.kora_table_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kora_table_players_select_authenticated" ON public.kora_table_players;
DROP POLICY IF EXISTS "kora_table_players_insert_self" ON public.kora_table_players;
DROP POLICY IF EXISTS "kora_table_players_update_self_ready" ON public.kora_table_players;
DROP POLICY IF EXISTS "kora_table_players_delete_self" ON public.kora_table_players;

CREATE POLICY "kora_table_players_select_authenticated"
  ON public.kora_table_players
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "kora_table_players_insert_self"
  ON public.kora_table_players
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Le client ne doit pouvoir toucher que is_ready (et éventuellement quitter).
-- Les updates de capital restent service_role ; on autorise UPDATE de sa ligne
-- mais l'edge function reste la source de vérité pour le capital.
CREATE POLICY "kora_table_players_update_self"
  ON public.kora_table_players
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "kora_table_players_delete_self"
  ON public.kora_table_players
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- 6. Contraintes profil (si absentes)
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kora_profiles_username_key'
  ) THEN
    ALTER TABLE public.kora_profiles
      ADD CONSTRAINT kora_profiles_username_key UNIQUE (username);
  END IF;
END $$;

ALTER TABLE public.kora_profiles
  ALTER COLUMN username SET NOT NULL;

-- Longueur pseudo raisonnable
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kora_profiles_username_len'
  ) THEN
    ALTER TABLE public.kora_profiles
      ADD CONSTRAINT kora_profiles_username_len
      CHECK (char_length(username) BETWEEN 2 AND 20);
  END IF;
END $$;

-- ==========================================================================
-- Fin. Vérifier ensuite :
--   • UPDATE kora_profiles d'un autre id → 0 row / denied
--   • DELETE kora_profiles → denied
--   • UPDATE kora_lifetime_stats → denied
--   • SELECT kora_round_hands d'un adversaire → 0 row
-- ==========================================================================
