-- ==========================================================================
-- 20260908_tournaments_wallet.sql
-- Buy-in tournoi : debit wallet a l'inscription, remboursement a la desinscription.
-- Prealable : 20260908_tournaments.sql + kora_wallet_adjust / kora_ensure_player_rows.
-- ==========================================================================

ALTER TABLE public.kora_tournament_registrations
  ADD COLUMN IF NOT EXISTS fee_paid_fcfa integer NOT NULL DEFAULT 0
    CHECK (fee_paid_fcfa >= 0);

COMMENT ON COLUMN public.kora_tournament_registrations.fee_paid_fcfa IS
  'Montant debite du wallet a l''inscription (rembourse si desinscription ouverte).';

CREATE OR REPLACE FUNCTION public.kora_register_tournament(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  t public.kora_tournaments%ROWTYPE;
  cnt integer;
  fee integer;
  new_bal integer;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentification requise');
  END IF;

  PERFORM public.kora_ensure_player_rows(uid);

  SELECT * INTO t
  FROM public.kora_tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tournoi introuvable');
  END IF;

  IF t.status NOT IN ('open', 'upcoming') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inscriptions fermees');
  END IF;

  SELECT count(*)::integer INTO cnt
  FROM public.kora_tournament_registrations
  WHERE tournament_id = p_tournament_id;

  IF cnt >= t.max_players THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Complet');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.kora_tournament_registrations
    WHERE tournament_id = p_tournament_id AND user_id = uid
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Deja inscrit');
  END IF;

  fee := COALESCE(t.entry_fee_fcfa, 0);

  IF fee > 0 THEN
    UPDATE public.kora_profiles
    SET wallet_balance = wallet_balance - fee
    WHERE id = uid
      AND wallet_balance >= fee
    RETURNING wallet_balance INTO new_bal;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Solde insuffisant');
    END IF;
  ELSE
    SELECT wallet_balance INTO new_bal FROM public.kora_profiles WHERE id = uid;
  END IF;

  INSERT INTO public.kora_tournament_registrations (tournament_id, user_id, fee_paid_fcfa)
  VALUES (p_tournament_id, uid, fee);

  RETURN jsonb_build_object(
    'ok', true,
    'registered_count', cnt + 1,
    'tournament_id', p_tournament_id,
    'fee_paid_fcfa', fee,
    'wallet_balance', COALESCE(new_bal, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.kora_unregister_tournament(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  t public.kora_tournaments%ROWTYPE;
  reg public.kora_tournament_registrations%ROWTYPE;
  new_bal integer;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentification requise');
  END IF;

  SELECT * INTO t FROM public.kora_tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tournoi introuvable');
  END IF;

  IF t.status NOT IN ('open', 'upcoming') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Desinscription fermee');
  END IF;

  SELECT * INTO reg
  FROM public.kora_tournament_registrations
  WHERE tournament_id = p_tournament_id AND user_id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pas inscrit');
  END IF;

  DELETE FROM public.kora_tournament_registrations
  WHERE tournament_id = p_tournament_id AND user_id = uid;

  IF COALESCE(reg.fee_paid_fcfa, 0) > 0 THEN
    UPDATE public.kora_profiles
    SET wallet_balance = wallet_balance + reg.fee_paid_fcfa
    WHERE id = uid
    RETURNING wallet_balance INTO new_bal;
  ELSE
    SELECT wallet_balance INTO new_bal FROM public.kora_profiles WHERE id = uid;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'tournament_id', p_tournament_id,
    'refunded_fcfa', COALESCE(reg.fee_paid_fcfa, 0),
    'wallet_balance', COALESCE(new_bal, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.kora_register_tournament(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kora_unregister_tournament(uuid) TO authenticated;
