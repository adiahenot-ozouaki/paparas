-- ==========================================================================
-- 02_purge_stale_lobbies.sql
-- Supprime les tables encore en status 'lobby' :
--   • créées il y a plus de 24 h, ou
--   • sans aucun siège depuis plus de 1 h (orphelines)
-- Ajuster les intervals selon besoin.
-- ==========================================================================

BEGIN;

CREATE TEMP TABLE stale_lobbies ON COMMIT DROP AS
SELECT t.id, t.created_at, t.created_by, t.status
FROM public.kora_tables t
WHERE t.status = 'lobby'
  AND (
    t.created_at < now() - interval '24 hours'
    OR (
      t.created_at < now() - interval '1 hour'
      AND NOT EXISTS (
        SELECT 1 FROM public.kora_table_players p WHERE p.table_id = t.id
      )
    )
  );

SELECT id, created_at, created_by FROM stale_lobbies ORDER BY created_at;

DELETE FROM public.kora_round_hands
WHERE round_id IN (
  SELECT r.id FROM public.kora_rounds r
  WHERE r.table_id IN (SELECT id FROM stale_lobbies)
);

DELETE FROM public.kora_rounds
WHERE table_id IN (SELECT id FROM stale_lobbies);

DELETE FROM public.kora_table_players
WHERE table_id IN (SELECT id FROM stale_lobbies);

DELETE FROM public.kora_tables
WHERE id IN (SELECT id FROM stale_lobbies);

COMMIT;
