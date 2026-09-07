-- ==========================================================================
-- 20260907_elo_solo_online_split.sql
-- Elo solo ≠ Elo online.
--   elo_rating / elo_games  → ONLINE uniquement (classement en ligne)
--   elo_solo / elo_solo_games → SOLO vs IA
-- À appliquer dans le SQL Editor Supabase.
-- ==========================================================================

ALTER TABLE public.kora_lifetime_stats
  ADD COLUMN IF NOT EXISTS elo_solo integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS elo_solo_games integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.kora_lifetime_stats.elo_rating IS
  'Elo ONLINE uniquement (parties / rounds en ligne). Départ 1000.';
COMMENT ON COLUMN public.kora_lifetime_stats.elo_games IS
  'Nombre de rounds/parties ONLINE ayant contribué au Elo.';
COMMENT ON COLUMN public.kora_lifetime_stats.elo_solo IS
  'Elo SOLO (parties vs IA). Indépendant de elo_rating.';
COMMENT ON COLUMN public.kora_lifetime_stats.elo_solo_games IS
  'Nombre de parties SOLO ayant contribué au Elo solo.';

CREATE INDEX IF NOT EXISTS kora_lifetime_stats_elo_solo_idx
  ON public.kora_lifetime_stats (elo_solo DESC);

-- Merge client → cloud : max pour solo ET online
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
  v_gains int;
  v_losses int;
  v_net int;
  v_max_cap int;
  v_min_cap int;
  v_best text;
  v_elo_online int;
  v_elo_online_games int;
  v_elo_solo int;
  v_elo_solo_games int;
  v_combo jsonb;
  v_special jsonb;
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

  -- Online Elo (écrit surtout par edge ; le client peut aussi renvoyer la valeur cloud)
  v_elo_online       := GREATEST(COALESCE(cur.elo_rating, 1000), COALESCE((p_stats->>'elo_rating')::int, 1000));
  v_elo_online_games := GREATEST(COALESCE(cur.elo_games, 0), COALESCE((p_stats->>'elo_games')::int, 0));
  -- Solo Elo (écrit par le client)
  v_elo_solo         := GREATEST(COALESCE(cur.elo_solo, 1000), COALESCE((p_stats->>'elo_solo')::int, 1000));
  v_elo_solo_games   := GREATEST(COALESCE(cur.elo_solo_games, 0), COALESCE((p_stats->>'elo_solo_games')::int, 0));

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
    elo_rating = v_elo_online,
    elo_games = v_elo_online_games,
    elo_solo = v_elo_solo,
    elo_solo_games = v_elo_solo_games,
    updated_at = now()
  WHERE user_id = uid
  RETURNING * INTO cur;

  RETURN cur;
END;
$$;

REVOKE ALL ON FUNCTION public.kora_merge_lifetime_stats(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kora_merge_lifetime_stats(jsonb) TO authenticated;
