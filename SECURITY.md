# Sécurité des données utilisateur — Garam Paparas

## Modèle

| Donnée | Client (JWT joueur) | Edge `kora-game-engine` (service_role) |
|--------|---------------------|----------------------------------------|
| Auth (email/mdp) | Supabase Auth uniquement | — |
| `kora_profiles` | SELECT tous (connecté), UPDATE/INSERT **soi** | full |
| `kora_lifetime_stats` | SELECT (classement) | écriture exclusive |
| `kora_round_hands` | SELECT **sa** main seulement | écriture exclusive |
| `kora_rounds` | SELECT si assis à la table | écriture exclusive |
| `kora_table_players` | INSERT/UPDATE/DELETE **soi** | capital / élimination |
| `kora_tables` | créer / lire (RLS existantes) | statut playing |

La clé **anon** est publique (normale en SPA). La **service_role** ne doit **jamais** être dans le front ni dans git.

## Migration à appliquer

Fichier : `supabase/migrations/20260904_secure_user_data.sql`

Dans le dashboard Supabase → **SQL Editor** → coller / exécuter le fichier.

Effets principaux :

1. **Interdit DELETE** client sur `kora_profiles`
2. **Interdit écriture** client sur `kora_lifetime_stats` et `kora_round_hands`
3. Mains adverses **illisibles** via PostgREST (seul `user_id = auth.uid()`)
4. Pseudo unique + longueur 2–20 côté base

## Vérifications manuelles

```sql
-- En tant que joueur A (via API ou client) :
-- UPDATE kora_profiles SET username = 'x' WHERE id = '<id B>';  -- doit échouer / 0 ligne
-- DELETE FROM kora_profiles WHERE id = auth.uid();              -- doit être refusé
-- UPDATE kora_lifetime_stats SET net_gain_total = 999999;     -- refusé
-- SELECT cards FROM kora_round_hands WHERE user_id <> auth.uid(); -- vide
```

## Client

- `VITE_SUPABASE_ANON_KEY` uniquement (voir `.env.example`)
- Validation pseudo dans `AuthContext.validateUsername`
- État de jeu autoritaire via edge function (pas de confiance aux mains client)

## Auth (recommandations dashboard)

- Réactiver **Confirm email** en production
- Mot de passe min. 8 caractères (Auth settings)
- Rate limiting Auth activé (défaut Supabase)
- Ne pas exposer le service role dans `VITE_*`
