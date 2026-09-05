-- ==========================================================================
-- 20260905_persistence_wallet_stats.sql
-- Wallet de compte + merge sécurisé des stats lifetime (local ↔ cloud).
-- À appliquer dans le SQL Editor Supabase.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Wallet sur le profil
-- --------------------------------------------------------------------------
ALTER TABLE public.kora_profiles
  ADD COLUMN IF NOT EXISTS wallet_balance integer NOT NULL DEFAULT 10000;

COMMENT ON COLUMN public.kora_profiles.wallet_balance IS
  'Capital de compte (FCFA). Buy-in online débitent, cash-out crédite.';

-- --------------------------------------------------------------------------
-- 2. Garantir une ligne stats + profil à la création du user auth
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
  VALUES (p_user_id, v_username, '🦅', 10000)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.kora_lifetime_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.kora_ensure_player_rows(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kora_ensure_player_rows(uuid) TO authenticated, service_role;

-- Trigger auth.users → profil + stats (idempotent)
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
-- 3. Merge upward des stats (client envoie un snapshot local ; serveur garde le max)
--    Limite la triche grossière multi-device additive, mais autorise la reprise
--    d'un appareil unique + cloud. Les incréments online restent autoritaires
--    via l'edge function (service role).
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kora_merge_lifetime_stats(p_stats jsonb)
RETURNS public.kora_lifetime_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cur public.kora_lifetime_stats%ROWTYPE;
  v_games_played int;
  v_games_won int;
  v_rounds int;
  v_tricks int;
  v_net int;
  v_gains int;
  v_losses int;
  v_max_cap int;
  v_min_cap int;
  v_combo jsonb;
  v_special jsonb;
  v_best text;
  cur_combo jsonb;
  cur_special jsonb;
  k text;
  merged_combo jsonb := '{}'::jsonb;
  merged_special jsonb := '{}'::jsonb;
  best_local text;
  best_cloud text;
  mult_local int;
  mult_cloud int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  PERFORM public.kora_ensure_player_rows(uid);

  SELECT * INTO cur FROM public.kora_lifetime_stats WHERE user_id = uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ligne stats introuvable';
  END IF;

  v_games_played := GREATEST(cur.games_played, COALESCE((p_stats->>'games_played')::int, 0));
  v_games_won    := GREATEST(cur.games_won,    COALESCE((p_stats->>'games_won')::int, 0));
  v_rounds       := GREATEST(cur.total_rounds_won, COALESCE((p_stats->>'total_rounds_won')::int, 0));
  v_tricks       := GREATEST(cur.total_tricks_won, COALESCE((p_stats->>'total_tricks_won')::int, 0));
  v_gains        := GREATEST(cur.total_gains, COALESCE((p_stats->>'total_gains')::int, 0));
  v_losses       := GREATEST(cur.total_losses, COALESCE((p_stats->>'total_losses')::int, 0));
  v_net          := GREATEST(cur.net_gain_total, COALESCE((p_stats->>'net_gain_total')::int, 0));
  v_max_cap      := GREATEST(cur.max_capital_ever, COALESCE((p_stats->>'max_capital_ever')::int, 0));

  -- min capital : plus petit non nul, sinon 0
  v_min_cap := cur.min_capital_ever;
  IF COALESCE((p_stats->>'min_capital_ever')::int, 0) > 0 THEN
    IF v_min_cap = 0 THEN
      v_min_cap := (p_stats->>'min_capital_ever')::int;
    ELSE
      v_min_cap := LEAST(v_min_cap, (p_stats->>'min_capital_ever')::int);
    END IF;
  END IF;

  cur_combo := COALESCE(cur.combo_counts::jsonb, '{}'::jsonb);
  v_combo := COALESCE(p_stats->'combo_counts', '{}'::jsonb);
  FOREACH k IN ARRAY ARRAY['simple','kora','33','trinity','kmt'] LOOP
    merged_combo := jsonb_set(
      merged_combo,
      ARRAY[k],
      to_jsonb(GREATEST(COALESCE((cur_combo->>k)::int, 0), COALESCE((v_combo->>k)::int, 0)))
    );
  END LOOP;

  cur_special := COALESCE(cur.special_rule_counts::jsonb, '{}'::jsonb);
  v_special := COALESCE(p_stats->'special_rule_counts', '{}'::jsonb);
  FOREACH k IN ARRAY ARRAY['flush','21','t7'] LOOP
    merged_special := jsonb_set(
      merged_special,
      ARRAY[k],
      to_jsonb(GREATEST(COALESCE((cur_special->>k)::int, 0), COALESCE((v_special->>k)::int, 0)))
    );
  END LOOP;

  best_cloud := cur.best_combo;
  best_local := NULLIF(p_stats->>'best_combo', '');
  mult_cloud := CASE best_cloud
    WHEN 'kmt' THEN 16 WHEN 'trinity' THEN 8 WHEN '33' THEN 4 WHEN 'kora' THEN 2 WHEN 'simple' THEN 1 ELSE 0 END;
  mult_local := CASE best_local
    WHEN 'kmt' THEN 16 WHEN 'trinity' THEN 8 WHEN '33' THEN 4 WHEN 'kora' THEN 2 WHEN 'simple' THEN 1 ELSE 0 END;
  v_best := CASE WHEN mult_local > mult_cloud THEN best_local ELSE best_cloud END;

  UPDATE public.kora_lifetime_stats SET
    games_played = v_games_played,
    games_won = v_games_won,
    total_rounds_won = v_rounds,
    total_tricks_won = v_tricks,
    total_gains = v_gains,
    total_losses = v_losses,
    net_gain_total = v_net,
    max_capital_ever = v_max_cap,
    min_capital_ever = v_min_cap,
    combo_counts = merged_combo,
    special_rule_counts = merged_special,
    best_combo = v_best,
    updated_at = now()
  WHERE user_id = uid
  RETURNING * INTO cur;

  RETURN cur;
END;
$$;

REVOKE ALL ON FUNCTION public.kora_merge_lifetime_stats(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kora_merge_lifetime_stats(jsonb) TO authenticated;

-- --------------------------------------------------------------------------
-- 4. Lecture wallet (propre ligne) — UPDATE direct interdit : cash-out via edge
-- --------------------------------------------------------------------------
-- SELECT déjà couvert par kora_profiles_select_authenticated.
-- On n'ouvre PAS UPDATE wallet_balance au client.

-- Backfill stats manquantes pour profils existants
INSERT INTO public.kora_lifetime_stats (user_id)
SELECT id FROM public.kora_profiles
ON CONFLICT (user_id) DO NOTHING;

-- ==========================================================================
-- Fin.
-- ==========================================================================
