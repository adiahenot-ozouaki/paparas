-- ==========================================================================
-- 01_delete_test_accounts.sql
-- Supprime les comptes Auth de test et toutes les lignes kora_* liées.
-- Ordre FK : hands → rounds → seats → tables → stats → profiles → auth.users
-- ==========================================================================

BEGIN;

CREATE TEMP TABLE doomed ON COMMIT DROP AS
SELECT id, email
FROM auth.users
WHERE email ILIKE 'kora.test.%'
   OR email ILIKE 'kora.online.%'
   OR email ILIKE '%@example.com';

-- Contrôle avant suppression
SELECT id, email FROM doomed ORDER BY email;

CREATE TEMP TABLE doomed_tables ON COMMIT DROP AS
SELECT DISTINCT t.id
FROM public.kora_tables t
WHERE t.created_by IN (SELECT id FROM doomed)
   OR t.id IN (
     SELECT tp.table_id
     FROM public.kora_table_players tp
     WHERE tp.user_id IN (SELECT id FROM doomed)
   );

DELETE FROM public.kora_round_hands
WHERE round_id IN (
  SELECT r.id FROM public.kora_rounds r WHERE r.table_id IN (SELECT id FROM doomed_tables)
)
OR user_id IN (SELECT id FROM doomed);

DELETE FROM public.kora_rounds
WHERE table_id IN (SELECT id FROM doomed_tables);

DELETE FROM public.kora_table_players
WHERE table_id IN (SELECT id FROM doomed_tables)
   OR user_id IN (SELECT id FROM doomed);

DELETE FROM public.kora_tables
WHERE id IN (SELECT id FROM doomed_tables);

DELETE FROM public.kora_lifetime_stats
WHERE user_id IN (SELECT id FROM doomed);

DELETE FROM public.kora_profiles
WHERE id IN (SELECT id FROM doomed);

DELETE FROM auth.users
WHERE id IN (SELECT id FROM doomed);

COMMIT;

-- Vérification (hors transaction)
SELECT email FROM auth.users
WHERE email ILIKE 'kora.test.%'
   OR email ILIKE 'kora.online.%'
   OR email ILIKE '%@example.com';
-- attendu : 0 ligne
