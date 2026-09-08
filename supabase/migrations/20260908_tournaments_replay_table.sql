-- ==========================================================================
-- 20260908_tournaments_replay_table.sql
-- Rejeu de table tournoi : cloture l'ancienne, recree lobby + memes sieges.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.kora_tournament_replay_table(p_table_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  old_t public.kora_tables%ROWTYPE;
  tour public.kora_tournaments%ROWTYPE;
  seat RECORD;
  seats_count int := 0;
  new_table_id uuid;
  is_member boolean := false;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentification requise');
  END IF;

  SELECT * INTO old_t
  FROM public.kora_tables
  WHERE id = p_table_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Table introuvable');
  END IF;

  IF old_t.tournament_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Table hors tournoi');
  END IF;

  SELECT * INTO tour
  FROM public.kora_tournaments
  WHERE id = old_t.tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tournoi introuvable');
  END IF;

  IF tour.status = 'completed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tournoi termine');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.kora_table_players
    WHERE table_id = p_table_id AND user_id = uid
  ) INTO is_member;

  IF NOT is_member THEN
    SELECT EXISTS (
      SELECT 1 FROM public.kora_tournament_registrations
      WHERE tournament_id = old_t.tournament_id AND user_id = uid
    ) INTO is_member;
  END IF;

  IF NOT is_member THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Non autorise');
  END IF;

  SELECT count(*)::int INTO seats_count
  FROM public.kora_table_players
  WHERE table_id = p_table_id;

  IF seats_count < 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pas assez de joueurs pour rejouer');
  END IF;

  UPDATE public.kora_tables
  SET status = 'finished',
      finished_at = COALESCE(finished_at, now())
  WHERE id = p_table_id
    AND status <> 'finished';

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
    old_t.base_stake,
    old_t.starting_capital,
    old_t.deck_variant,
    uid,
    old_t.min_buy_in,
    old_t.max_buy_in,
    old_t.tournament_id
  )
  RETURNING id INTO new_table_id;

  FOR seat IN
    SELECT user_id, seat_index
    FROM public.kora_table_players
    WHERE table_id = p_table_id
    ORDER BY seat_index ASC
  LOOP
    INSERT INTO public.kora_table_players (
      table_id,
      user_id,
      seat_index,
      capital,
      is_ready,
      is_eliminated
    ) VALUES (
      new_table_id,
      seat.user_id,
      seat.seat_index,
      old_t.starting_capital,
      false,
      false
    );
  END LOOP;

  UPDATE public.kora_tournaments
  SET status = 'live',
      updated_at = now()
  WHERE id = old_t.tournament_id
    AND status IN ('open', 'upcoming');

  RETURN jsonb_build_object(
    'ok', true,
    'old_table_id', p_table_id,
    'new_table_id', new_table_id,
    'tournament_id', old_t.tournament_id,
    'player_count', seats_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.kora_tournament_replay_table(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kora_tournament_replay_table(uuid) TO authenticated;

COMMENT ON FUNCTION public.kora_tournament_replay_table(uuid) IS
  'Cloture une table tournoi et en recree une nouvelle (lobby) avec les memes joueurs.';
