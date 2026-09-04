-- ==========================================================================
-- 04_inspect_counts.sql — lecture seule, aucun DELETE
-- ==========================================================================

SELECT 'auth.users' AS entity, count(*)::bigint AS n FROM auth.users
UNION ALL
SELECT 'kora_profiles', count(*) FROM public.kora_profiles
UNION ALL
SELECT 'kora_lifetime_stats', count(*) FROM public.kora_lifetime_stats
UNION ALL
SELECT 'kora_tables', count(*) FROM public.kora_tables
UNION ALL
SELECT 'kora_tables.lobby', count(*) FROM public.kora_tables WHERE status = 'lobby'
UNION ALL
SELECT 'kora_tables.playing', count(*) FROM public.kora_tables WHERE status = 'playing'
UNION ALL
SELECT 'kora_tables.finished', count(*) FROM public.kora_tables WHERE status = 'finished'
UNION ALL
SELECT 'kora_table_players', count(*) FROM public.kora_table_players
UNION ALL
SELECT 'kora_rounds', count(*) FROM public.kora_rounds
UNION ALL
SELECT 'kora_round_hands', count(*) FROM public.kora_round_hands
ORDER BY 1;

-- Comptes susceptibles d’être des tests
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email ILIKE 'kora.test.%'
   OR email ILIKE 'kora.online.%'
   OR email ILIKE '%@example.com'
ORDER BY created_at DESC;

-- Lobbys ouverts avec âge et nombre de sièges
SELECT
  t.id,
  t.created_at,
  now() - t.created_at AS age,
  t.base_stake,
  (SELECT count(*) FROM public.kora_table_players p WHERE p.table_id = t.id) AS seats
FROM public.kora_tables t
WHERE t.status = 'lobby'
ORDER BY t.created_at;
