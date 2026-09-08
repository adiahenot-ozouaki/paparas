-- ==========================================================================
-- 20260908_tournaments_spawn_tables.sql
-- Genere automatiquement les tables de match a partir des inscrits.
-- ==========================================================================

ALTER TABLE public.kora_tables
  ADD COLUMN IF NOT EXISTS tournament_id uuid
    REFERENCES public.kora_tournaments (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS kora_tables_tournament_id_idx
  ON public.kora_tables (tournament_id)
  WHERE tournament_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.kora_tournament_spawn_tables(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  t public.kora_tournaments%ROWTYPE;
  reg RECORD;
  players uuid[] := ARRAY[]::uuid[];
  n int;
  tables_needed int;
  i int;
  j int;
  seat_i int;
  new_table_id uuid;
  table_ids uuid[] := ARRAY[]::uuid[];
  existing_count int;
  base_stake int;
  start_cap int;
  deck text;
  chunk_size int := 4;
  player_uid uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentification requise');
  END IF;

  SELECT * INTO t
  FROM public.kora_tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tournoi introuvable');
  END IF;

  IF t.status = 'completed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tournoi termine');
  END IF;

  SELECT count(*)::int INTO existing_count
  FROM public.kora_tables
  WHERE tournament_id = p_tournament_id
    AND status IN ('lobby', 'playing');

  IF existing_count > 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already', true,
      'tables_created', 0,
      'tables_existing', existing_count,
      'tournament_id', p_tournament_id,
      'status', t.status
    );
  END IF;

  FOR reg IN
    SELECT user_id
    FROM public.kora_tournament_registrations
    WHERE tournament_id = p_tournament_id
    ORDER BY registered_at ASC
  LOOP
    players := array_append(players, reg.user_id);
  END LOOP;

  n := coalesce(array_length(players, 1), 0);
  IF n < 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Au moins 2 inscrits requis');
  END IF;

  base_stake := GREATEST(COALESCE(t.entry_fee_fcfa, 0), 100);
  start_cap := CASE
    WHEN t.rules_preset = 'training' THEN 2000
    WHEN t.rules_preset = 'high_stakes' THEN 10000
    ELSE 5000
  END;
  deck := CASE
    WHEN t.rules_preset = 'training' THEN '9'
    ELSE 'as'
  END;

  tables_needed := CEIL(n::numeric / chunk_size)::int;

  FOR i IN 0..(tables_needed - 1) LOOP
    INSERT INTO public.kora_tables (
      status,
      base_stake,
      starting_capital,
      deck_variant,
      created_by,
      min_buy_in,
      max_buy_in,
      tournament_id
    ) VALUES (
      'lobby',
      base_stake,
      start_cap,
      deck,
      players[1 + i * chunk_size],
      start_cap,
      start_cap,
      p_tournament_id
    )
    RETURNING id INTO new_table_id;

    table_ids := array_append(table_ids, new_table_id);

    seat_i := 0;
    FOR j IN 0..(chunk_size - 1) LOOP
      IF (1 + i * chunk_size + j) > n THEN
        EXIT;
      END IF;
      player_uid := players[1 + i * chunk_size + j];

      INSERT INTO public.kora_table_players (
        table_id,
        user_id,
        seat_index,
        capital,
        is_ready,
        is_eliminated
      ) VALUES (
        new_table_id,
        player_uid,
        seat_i,
        start_cap,
        false,
        false
      );
      seat_i := seat_i + 1;
    END LOOP;
  END LOOP;

  UPDATE public.kora_tournaments
  SET status = 'live',
      updated_at = now()
  WHERE id = p_tournament_id
    AND status IN ('open', 'upcoming');

  RETURN jsonb_build_object(
    'ok', true,
    'already', false,
    'tables_created', tables_needed,
    'player_count', n,
    'table_ids', to_jsonb(table_ids),
    'tournament_id', p_tournament_id,
    'status', 'live'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.kora_tournament_spawn_tables(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kora_tournament_spawn_tables(uuid) TO authenticated;

COMMENT ON FUNCTION public.kora_tournament_spawn_tables(uuid) IS
  'Cree les tables lobby (4 sieges) pour un tournoi a partir des inscriptions, passe le statut en live.';
