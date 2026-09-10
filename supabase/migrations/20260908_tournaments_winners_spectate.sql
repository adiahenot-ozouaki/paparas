-- winners JSON on tournaments + ensure tournament_id on tables (idempotent)

ALTER TABLE public.kora_tournaments
  ADD COLUMN IF NOT EXISTS winners jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.kora_tournaments.winners IS
  'Podium final [{rank,userId,username,amountFcfa}] quand status=completed.';

ALTER TABLE public.kora_tables
  ADD COLUMN IF NOT EXISTS tournament_id uuid
    REFERENCES public.kora_tournaments (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS kora_tables_tournament_id_idx
  ON public.kora_tables (tournament_id)
  WHERE tournament_id IS NOT NULL;

UPDATE public.kora_tournaments
SET winners = '[
  {"rank":1,"userId":"00000000-0000-4000-8000-000000000099","username":"ChampionKora","amountFcfa":20000}
]'::jsonb
WHERE id = 'a1000000-0000-4000-8000-000000000004'
  AND (winners IS NULL OR winners = '[]'::jsonb);
