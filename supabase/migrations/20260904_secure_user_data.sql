-- ==========================================================================
-- 20260904_secure_user_data.sql
-- Durcissement RLS / droits sur le schéma kora_* (données utilisateur).
--
-- À appliquer dans le SQL Editor Supabase.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 0. Normaliser les usernames existants trop longs (ex: kora-cash-…_xxxxxxxx)
--    avant d'ajouter le CHECK 2–20. Garantit l'unicité après troncature.
-- --------------------------------------------------------------------------
UPDATE public.kora_profiles
SET username = left(
  regexp_replace(username, '\s+', ' ', 'g'),
  20
)
WHERE char_length(username) > 20;

-- Dédupliquer si deux lignes ont le même préfixe de 20 car.
WITH ranked AS (
  SELECT
    id,
    username,
    row_number() OVER (PARTITION BY username ORDER BY created_at, id) AS rn
  FROM public.kora_profiles
)
UPDATE public.kora_profiles p
SET username = left(p.username, 14) || '_' || substr(replace(p.id::text, '-', ''), 1, 5)
FROM ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- Filet : vides / trop courts
UPDATE public.kora_profiles
SET username = 'j_' || substr(replace(id::text, '-', ''), 1, 10)
WHERE username IS NULL
   OR char_length(btrim(username)) < 2;

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

CREATE POLICY "kora_profiles_select_authenticated"
  ON public.kora_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "kora_profiles_update_own"
  ON public.kora_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "kora_profiles_insert_own"
  ON public.kora_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

REVOKE ALL ON public.kora_profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.kora_profiles TO authenticated;
REVOKE DELETE ON public.kora_profiles FROM authenticated, anon;

-- --------------------------------------------------------------------------
-- 2. kora_lifetime_stats
-- --------------------------------------------------------------------------
ALTER TABLE public.kora_lifetime_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kora_lifetime_stats_select_authenticated" ON public.kora_lifetime_stats;
DROP POLICY IF EXISTS "kora_lifetime_stats_no_client_write" ON public.kora_lifetime_stats;

CREATE POLICY "kora_lifetime_stats_select_authenticated"
  ON public.kora_lifetime_stats
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON public.kora_lifetime_stats FROM anon;
GRANT SELECT ON public.kora_lifetime_stats TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.kora_lifetime_stats FROM authenticated, anon;

-- --------------------------------------------------------------------------
-- 3. kora_round_hands
-- --------------------------------------------------------------------------
ALTER TABLE public.kora_round_hands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kora_round_hands_select_own" ON public.kora_round_hands;
DROP POLICY IF EXISTS "kora_round_hands_select_authenticated" ON public.kora_round_hands;

CREATE POLICY "kora_round_hands_select_own"
  ON public.kora_round_hands
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.kora_round_hands FROM anon;
GRANT SELECT ON public.kora_round_hands TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.kora_round_hands FROM authenticated, anon;

-- --------------------------------------------------------------------------
-- 4. kora_rounds
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
-- 5. kora_table_players
-- --------------------------------------------------------------------------
ALTER TABLE public.kora_table_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kora_table_players_select_authenticated" ON public.kora_table_players;
DROP POLICY IF EXISTS "kora_table_players_insert_self" ON public.kora_table_players;
DROP POLICY IF EXISTS "kora_table_players_update_self_ready" ON public.kora_table_players;
DROP POLICY IF EXISTS "kora_table_players_update_self" ON public.kora_table_players;
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
-- 6. Contraintes profil (après nettoyage des données)
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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kora_profiles_username_len'
  ) THEN
    ALTER TABLE public.kora_profiles DROP CONSTRAINT kora_profiles_username_len;
  END IF;
  ALTER TABLE public.kora_profiles
    ADD CONSTRAINT kora_profiles_username_len
    CHECK (char_length(username) BETWEEN 2 AND 20);
END $$;

-- ==========================================================================
-- Fin.
-- ==========================================================================
