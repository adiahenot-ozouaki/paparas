-- ==========================================================================
-- 03_purge_finished_tables.sql
-- Archive / purge des parties terminées ou annulées de plus de 7 jours.
-- Conserve le classement (kora_lifetime_stats) et les profils.
-- ==========================================================================

BEGIN;

CREATE TEMP TABLE old_tables ON COMMIT DROP AS
SELECT t.id, t.status, t.created_at
FROM public.kora_tables t
WHERE t.status IN ('finished', 'cancelled')
  AND t.created_at < now() - interval '7 days';

SELECT id, status, created_at FROM old_tables ORDER BY created_at;

DELETE FROM public.kora_round_hands
WHERE round_id IN (
  SELECT r.id FROM public.kora_rounds r
  WHERE r.table_id IN (SELECT id FROM old_tables)
);

DELETE FROM public.kora_rounds
WHERE table_id IN (SELECT id FROM old_tables);

DELETE FROM public.kora_table_players
WHERE table_id IN (SELECT id FROM old_tables);

DELETE FROM public.kora_tables
WHERE id IN (SELECT id FROM old_tables);

COMMIT;
