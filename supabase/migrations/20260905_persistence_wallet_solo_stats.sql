-- ==========================================================================
-- 20260905_persistence_wallet_solo_stats.sql
-- Wallet de compte + stats solo synchronisées + helpers cash-out.
-- À appliquer dans le SQL Editor Supabase.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Wallet sur le profil (capital de compte, hors buy-in de table)
-- --------------------------------------------------------------------------
ALTER TABLE public.kora_profiles
  ADD COLUMN IF NOT EXISTS wallet_balance integer NOT NULL DEFAULT 5000;

COMMENT ON COLUMN public.kora_profiles.wallet_balance IS
  'Capital de compte (FCFA). Débité au buy-in online, crédité au cash-out (leave_table).';

-- --------------------------------------------------------------------------
-- 2. Stats solo (miroir de kora_lifetime_stats, écrites par le client)
--    kora_lifetime_stats reste alimenté UNIQUEMENT par l''edge function (online).
--    L''UI affiche merge(solo, online).
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kora_solo_lifetime_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  games_played integer NOT NULL DEFAULT 0,
  games_won integer NOT NULL DEFAULT 0,
  total_rounds_won integer NOT NULL DEFAULT 0,
  total_tricks_won integer NOT NULL DEFAULT 0,
  best_combo text,
  net_gain_total integer NOT NULL DEFAULT 0,
  total_gains integer NOT NULL DEFAULT 0,
  total_losses integer NOT NULL DEFAULT 0,
  max_capital_ever integer NOT NULL DEFAULT 0,
  min_capital_ever integer NOT NULL DEFAULT 0,
  combo_counts jsonb NOT NULL DEFAULT '{"simple":0,"kora":0,"33":0,"trinity":0,"kmt":0}'::jsonb,
  special_rule_counts jsonb NOT NULL DEFAULT '{"flush":0,"21":0,"t7":0}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kora_solo_lifetime_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kora_solo_stats_select_authenticated" ON public.kora_solo_lifetime_stats;
DROP POLICY IF EXISTS "kora_solo_stats_upsert_own" ON public.kora_solo_lifetime_stats;
DROP POLICY IF EXISTS "kora_solo_stats_update_own" ON public.kora_solo_lifetime_stats;
DROP POLICY IF EXISTS "kora_solo_stats_insert_own" ON public.kora_solo_lifetime_stats;

CREATE POLICY "kora_solo_stats_select_authenticated"
  ON public.kora_solo_lifetime_stats FOR SELECT TO authenticated USING (true);

CREATE POLICY "kora_solo_stats_insert_own"
  ON public.kora_solo_lifetime_stats FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "kora_solo_stats_update_own"
  ON public.kora_solo_lifetime_stats FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

REVOKE ALL ON public.kora_solo_lifetime_stats FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.kora_solo_lifetime_stats TO authenticated;
REVOKE DELETE ON public.kora_solo_lifetime_stats FROM authenticated, anon;

-- --------------------------------------------------------------------------
-- 3. RPC wallet : débit (buy-in) / crédit (cash-out) — SECURITY DEFINER
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kora_wallet_adjust(
  p_delta integer,
  p_reason text DEFAULT 'adjust'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_new integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  IF p_delta = 0 THEN
    SELECT wallet_balance INTO v_new FROM kora_profiles WHERE id = v_uid;
    RETURN COALESCE(v_new, 0);
  END IF;

  UPDATE kora_profiles
  SET wallet_balance = wallet_balance + p_delta
  WHERE id = v_uid
    AND wallet_balance + p_delta >= 0
  RETURNING wallet_balance INTO v_new;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_INSUFFICIENT_OR_MISSING';
  END IF;
  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.kora_wallet_adjust(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kora_wallet_adjust(integer, text) TO authenticated;

-- Variante service-role (edge function cash-out) : ajuster le wallet d''un user_id
CREATE OR REPLACE FUNCTION public.kora_wallet_adjust_user(
  p_user_id uuid,
  p_delta integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new integer;
BEGIN
  IF p_delta = 0 THEN
    SELECT wallet_balance INTO v_new FROM kora_profiles WHERE id = p_user_id;
    RETURN COALESCE(v_new, 0);
  END IF;

  UPDATE kora_profiles
  SET wallet_balance = wallet_balance + p_delta
  WHERE id = p_user_id
    AND wallet_balance + p_delta >= 0
  RETURNING wallet_balance INTO v_new;

  IF NOT FOUND THEN
    -- Crédit (cash-out) : créer le profil manquant ne doit pas bloquer ;
    -- si débit impossible, erreur.
    IF p_delta > 0 THEN
      UPDATE kora_profiles
      SET wallet_balance = COALESCE(wallet_balance, 0) + p_delta
      WHERE id = p_user_id
      RETURNING wallet_balance INTO v_new;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'PROFILE_MISSING';
      END IF;
    ELSE
      RAISE EXCEPTION 'WALLET_INSUFFICIENT_OR_MISSING';
    END IF;
  END IF;
  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.kora_wallet_adjust_user(uuid, integer) FROM PUBLIC;
-- Appelée uniquement via service role (edge) ; pas de GRANT authenticated.

-- --------------------------------------------------------------------------
-- 4. Bootstrap stats solo à la création de profil (si trigger profil existe)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kora_ensure_solo_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.kora_solo_lifetime_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.kora_lifetime_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kora_ensure_solo_stats ON public.kora_profiles;
CREATE TRIGGER trg_kora_ensure_solo_stats
  AFTER INSERT ON public.kora_profiles
  FOR EACH ROW EXECUTE FUNCTION public.kora_ensure_solo_stats();

-- Backfill pour profils existants
INSERT INTO public.kora_solo_lifetime_stats (user_id)
SELECT id FROM public.kora_profiles
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.kora_lifetime_stats (user_id)
SELECT id FROM public.kora_profiles
ON CONFLICT (user_id) DO NOTHING;

-- ==========================================================================
-- Fin.
-- ==========================================================================
