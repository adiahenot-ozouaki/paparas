-- ==========================================================================
-- 20260905_persistence_cleanup.sql
-- Après application des deux migrations 20260905_* qui se recoupent :
--   1. wallet_balance : DEFAULT colonne resté à 5000 (ADD COLUMN IF NOT EXISTS
--      de la 2e migration n'a pas modifié le DEFAULT existant).
--   2. Deux bootstraps : trg_kora_ensure_solo_stats (profiles) +
--      on_auth_user_created_kora (auth.users) — redondants mais non contradictoires.
--
-- Cette migration :
--   - fige DEFAULT wallet_balance = 5000 (canonique = startingCapital solo)
--   - unifie kora_ensure_player_rows (profil + lifetime + solo stats, 5000)
--   - garde le trigger profiles en filet léger (stats seulement)
--   - garde le trigger auth.users comme point d'entrée principal
-- À appliquer sur acqxiwedxproqjffnerb (SQL Editor).
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Wallet : DEFAULT colonne = 5000 (ne touche pas aux soldes existants)
-- --------------------------------------------------------------------------
ALTER TABLE public.kora_profiles
  ALTER COLUMN wallet_balance SET DEFAULT 5000;

COMMENT ON COLUMN public.kora_profiles.wallet_balance IS
  'Capital de compte (FCFA). Défaut 5000 (= startingCapital solo). Débité au buy-in online, crédité au cash-out.';

-- --------------------------------------------------------------------------
-- 2. Une seule fonction « bootstrap joueur » (profil + 2 tables stats)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kora_ensure_player_rows(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id requis';
  END IF;

  v_username := 'j_' || substr(replace(p_user_id::text, '-', ''), 1, 10);

  INSERT INTO public.kora_profiles (id, username, avatar, wallet_balance)
  VALUES (p_user_id, v_username, '🦅', 5000)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.kora_lifetime_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Table solo si la migration wallet_solo_stats est en place
  IF to_regclass('public.kora_solo_lifetime_stats') IS NOT NULL THEN
    INSERT INTO public.kora_solo_lifetime_stats (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.kora_ensure_player_rows(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kora_ensure_player_rows(uuid) TO authenticated, service_role;

-- --------------------------------------------------------------------------
-- 3. Trigger profiles : filet stats uniquement (pas de re-création profil)
--    Appelé en cascade si auth.users → ensure_player_rows INSERT le profil.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kora_ensure_solo_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.kora_lifetime_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  IF to_regclass('public.kora_solo_lifetime_stats') IS NOT NULL THEN
    INSERT INTO public.kora_solo_lifetime_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kora_ensure_solo_stats ON public.kora_profiles;
CREATE TRIGGER trg_kora_ensure_solo_stats
  AFTER INSERT ON public.kora_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.kora_ensure_solo_stats();

-- --------------------------------------------------------------------------
-- 4. Trigger auth.users : point d'entrée principal (inchangé, appelle rows)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kora_on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.kora_ensure_player_rows(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_kora ON auth.users;
CREATE TRIGGER on_auth_user_created_kora
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.kora_on_auth_user_created();

-- --------------------------------------------------------------------------
-- 5. Backfill stats manquantes (idempotent)
-- --------------------------------------------------------------------------
INSERT INTO public.kora_lifetime_stats (user_id)
SELECT id FROM public.kora_profiles
ON CONFLICT (user_id) DO NOTHING;

DO $$
BEGIN
  IF to_regclass('public.kora_solo_lifetime_stats') IS NOT NULL THEN
    INSERT INTO public.kora_solo_lifetime_stats (user_id)
    SELECT id FROM public.kora_profiles
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- ==========================================================================
-- Fin.
-- ==========================================================================
