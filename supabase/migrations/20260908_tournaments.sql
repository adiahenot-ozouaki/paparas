-- ==========================================================================
-- 20260908_tournaments.sql
-- Tournois Garam/Kora : catalogue + inscriptions.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.kora_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('upcoming', 'open', 'live', 'completed')),
  format text NOT NULL
    CHECK (format IN ('single_elim', 'rounds_race', 'swiss')),
  entry_fee_fcfa integer NOT NULL DEFAULT 0
    CHECK (entry_fee_fcfa >= 0),
  prize_pool_fcfa integer NOT NULL DEFAULT 0
    CHECK (prize_pool_fcfa >= 0),
  prizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_players integer NOT NULL
    CHECK (max_players >= 2 AND max_players <= 256),
  starts_at timestamptz NOT NULL,
  tagline text NOT NULL DEFAULT '',
  rules_preset text NOT NULL DEFAULT 'standard'
    CHECK (rules_preset IN ('standard', 'training', 'high_stakes')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kora_tournaments_status_starts_idx
  ON public.kora_tournaments (status, starts_at);

CREATE INDEX IF NOT EXISTS kora_tournaments_starts_at_idx
  ON public.kora_tournaments (starts_at DESC);

CREATE TABLE IF NOT EXISTS public.kora_tournament_registrations (
  tournament_id uuid NOT NULL
    REFERENCES public.kora_tournaments (id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES auth.users (id) ON DELETE CASCADE,
  registered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS kora_tournament_regs_user_idx
  ON public.kora_tournament_registrations (user_id);

CREATE INDEX IF NOT EXISTS kora_tournament_regs_tournament_idx
  ON public.kora_tournament_registrations (tournament_id);

CREATE OR REPLACE VIEW public.kora_tournaments_with_counts
WITH (security_invoker = true)
AS
SELECT
  t.*,
  COALESCE(c.cnt, 0)::integer AS registered_count
FROM public.kora_tournaments t
LEFT JOIN (
  SELECT tournament_id, count(*)::integer AS cnt
  FROM public.kora_tournament_registrations
  GROUP BY tournament_id
) c ON c.tournament_id = t.id;

ALTER TABLE public.kora_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kora_tournament_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kora_tournaments_select_all" ON public.kora_tournaments;
CREATE POLICY "kora_tournaments_select_all"
  ON public.kora_tournaments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "kora_tournament_regs_select_authenticated" ON public.kora_tournament_registrations;
CREATE POLICY "kora_tournament_regs_select_authenticated"
  ON public.kora_tournament_registrations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "kora_tournament_regs_select_anon_count" ON public.kora_tournament_registrations;
CREATE POLICY "kora_tournament_regs_select_anon_count"
  ON public.kora_tournament_registrations FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "kora_tournament_regs_insert_own" ON public.kora_tournament_registrations;
CREATE POLICY "kora_tournament_regs_insert_own"
  ON public.kora_tournament_registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "kora_tournament_regs_delete_own" ON public.kora_tournament_registrations;
CREATE POLICY "kora_tournament_regs_delete_own"
  ON public.kora_tournament_registrations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.kora_tournaments FROM PUBLIC;
GRANT SELECT ON public.kora_tournaments TO anon, authenticated;

REVOKE ALL ON public.kora_tournament_registrations FROM PUBLIC;
GRANT SELECT ON public.kora_tournament_registrations TO anon, authenticated;
GRANT INSERT, DELETE ON public.kora_tournament_registrations TO authenticated;

GRANT SELECT ON public.kora_tournaments_with_counts TO anon, authenticated;

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
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentification requise');
  END IF;

  SELECT * INTO t FROM public.kora_tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tournoi introuvable');
  END IF;

  IF t.status NOT IN ('open', 'upcoming') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inscriptions fermees');
  END IF;

  SELECT count(*)::integer INTO cnt
  FROM public.kora_tournament_registrations WHERE tournament_id = p_tournament_id;

  IF cnt >= t.max_players THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Complet');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.kora_tournament_registrations
    WHERE tournament_id = p_tournament_id AND user_id = uid
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Deja inscrit');
  END IF;

  INSERT INTO public.kora_tournament_registrations (tournament_id, user_id)
  VALUES (p_tournament_id, uid);

  RETURN jsonb_build_object('ok', true, 'registered_count', cnt + 1, 'tournament_id', p_tournament_id);
END;
$$;

REVOKE ALL ON FUNCTION public.kora_register_tournament(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kora_register_tournament(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.kora_unregister_tournament(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  t public.kora_tournaments%ROWTYPE;
  deleted_count integer;
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

  DELETE FROM public.kora_tournament_registrations
  WHERE tournament_id = p_tournament_id AND user_id = uid;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pas inscrit');
  END IF;

  RETURN jsonb_build_object('ok', true, 'tournament_id', p_tournament_id);
END;
$$;

REVOKE ALL ON FUNCTION public.kora_unregister_tournament(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kora_unregister_tournament(uuid) TO authenticated;

INSERT INTO public.kora_tournaments (
  id, name, status, format, entry_fee_fcfa, prize_pool_fcfa, prizes,
  max_players, starts_at, tagline, rules_preset
) VALUES
(
  'a1000000-0000-4000-8000-000000000001',
  'Kora du Week-end',
  'open',
  'single_elim',
  500,
  25000,
  '[{"rank":1,"label":"Champion","amountFcfa":15000},{"rank":2,"label":"Finaliste","amountFcfa":7000},{"rank":3,"label":"Demi","amountFcfa":3000}]'::jsonb,
  16,
  now() + interval '6 hours',
  'Elimination directe · 16 places · mise 500',
  'standard'
),
(
  'a1000000-0000-4000-8000-000000000002',
  'Vendredi Gratuit',
  'open',
  'rounds_race',
  0,
  5000,
  '[{"rank":1,"label":"1er","amountFcfa":3000},{"rank":2,"label":"2e","amountFcfa":1500},{"rank":3,"label":"3e","amountFcfa":500}]'::jsonb,
  32,
  now() + interval '1 day',
  'Sans buy-in · course aux rounds · sponsored',
  'training'
),
(
  'a1000000-0000-4000-8000-000000000003',
  'Table de Minuit',
  'live',
  'swiss',
  1000,
  40000,
  '[{"rank":1,"label":"1er","amountFcfa":25000},{"rank":2,"label":"2e","amountFcfa":10000},{"rank":3,"label":"3e","amountFcfa":5000}]'::jsonb,
  12,
  now() - interval '30 minutes',
  'En cours · format suisse · buy-in 1 000',
  'high_stakes'
),
(
  'a1000000-0000-4000-8000-000000000004',
  'Coupe Paparas #12',
  'completed',
  'single_elim',
  500,
  20000,
  '[{"rank":1,"label":"Vainqueur","amountFcfa":20000}]'::jsonb,
  8,
  now() - interval '2 days',
  'Termine · archives',
  'standard'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  format = EXCLUDED.format,
  entry_fee_fcfa = EXCLUDED.entry_fee_fcfa,
  prize_pool_fcfa = EXCLUDED.prize_pool_fcfa,
  prizes = EXCLUDED.prizes,
  max_players = EXCLUDED.max_players,
  starts_at = EXCLUDED.starts_at,
  tagline = EXCLUDED.tagline,
  rules_preset = EXCLUDED.rules_preset,
  updated_at = now();
