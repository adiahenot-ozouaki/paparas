# Scripts de nettoyage — base Garam / Paparas

À exécuter dans **Supabase → SQL Editor** (rôle `postgres` / dashboard).
Ne pas lancer depuis le client front (RLS + droits insuffisants).

| Fichier | Rôle |
|---------|------|
| `01_delete_test_accounts.sql` | Supprime comptes test + données liées |
| `02_purge_stale_lobbies.sql` | Lobbys abandonnés (vieux / vides) |
| `03_purge_finished_tables.sql` | Tables `finished` / `cancelled` anciennes |
| `04_inspect_counts.sql` | Compteurs (lecture seule, sans DELETE) |

## Bonnes pratiques

1. Lancer d’abord `04_inspect_counts.sql` pour voir l’état.
2. Lire le `SELECT` de contrôle en tête de chaque script.
3. Les scripts utilisent `BEGIN` / `COMMIT` : en cas d’erreur, rien n’est partiellement appliqué (sauf si vous exécutez morceau par morceau).
4. Adapter les filtres e-mail / délais (`interval`) avant prod.

## Patterns comptes test

- `kora.test.%`
- `kora.online.%`
- `%@example.com`

Modifiez le CTE `doomed` si vous utilisez d’autres préfixes.
