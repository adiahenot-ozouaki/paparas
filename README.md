# Garam Paparas

Jeu de cartes de plis africain (variante **Kora** / Paparas), jouable :

- **Solo** — contre 3 adversaires IA (Binu, Lebe, Goju)
- **En ligne** — tables cash game via Supabase (auth, wallets, edge function moteur)

> Branche de travail principale : **`clean`**.

---

## Sommaire

- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Modes de jeu](#modes-de-jeu)
- [Online — fonctionnement](#online--fonctionnement)
- [Edge Function `kora-game-engine`](#edge-function-kora-game-engine)
- [Structure du projet](#structure-du-projet)
- [Les règles du jeu (résumé)](#les-règles-du-jeu-résumé)
- [Architecture du moteur](#architecture-du-moteur)
- [Déploiement](#déploiement)
- [Conventions de code](#conventions-de-code)

---

## Stack technique

| Couche | Techno |
|--------|--------|
| UI | **React 19** + **TypeScript 5.7** (strict) |
| Build | **Vite 8** + **Tailwind CSS v4** |
| Routing | **React Router 7** (`src/navigation/`) |
| Backend | **Supabase** (Auth, Postgres, Realtime, Edge Functions Deno) |
| Client Supabase | `@supabase/supabase-js` |

- Solo : moteur pur côté client (`src/game/`) + `GameContext`
- Online : même règles côté **serveur** (`supabase/functions/kora-game-engine/engine/`) — le client affiche l’état public et envoie des actions

---

## Démarrage rapide

```bash
git checkout clean
pnpm install   # ou npm install
cp env.example .env.local   # renseigner les clés Supabase
pnpm dev       # http://localhost:8443 (ou PORT)
pnpm build
pnpm preview
```

Scripts utiles :

| Commande | Rôle |
|----------|------|
| `pnpm dev` | Serveur de dev Vite |
| `pnpm build` | Build production |
| `pnpm test:online` | Script de test match online (`scripts/test-online-match.mjs`) |

---

## Variables d'environnement

Voir `env.example`. Côté client (Vite) :

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Côté Edge Functions (dashboard Supabase / secrets) :

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- (auth JWT géré par la plateforme)

---

## Modes de jeu

### Solo

- Config mise / capital / variante de paquet avant la partie
- 3 bots (`src/game/ai.ts`) avec personnalités distinctes
- Stats / capital locaux + sync cloud possible via profil

### En ligne (`/online`)

- **Authentification** Supabase obligatoire
- **Wallet** (`kora_profiles.wallet_balance`) — cash-out au leave
- **Mise** affichée (capital de table interne = 10 × mise, non choisi librement)
- **File d’attente** (« Trouver une partie ») + **codes** + **liste de tables ouvertes**
- **Démarrage auto** dès que ≥ 2 joueurs sont tous prêts
- Partie jusqu’à **abandon** (leave) ; table dissoute si &lt; 2 joueurs restants en cours de partie
- **Fin de round** : le prochain round ne démarre que lorsque **tous** les joueurs ont appuyé sur Continuer

---

## Online — fonctionnement

```
Client (OnlineLobbyScreen / OnlineGameTableScreen)
    │  callEngine(action, tableId, …)
    ▼
Edge Function kora-game-engine
    │  valide le tour, applique playCard / bank / resolve…
    ▼
Postgres (kora_tables, kora_table_players, kora_rounds, kora_round_hands)
    │  Realtime + poll client
    ▼
UI synchronisée (état tourné selon le siège du joueur)
```

Actions moteur principales :

| Action | Rôle |
|--------|------|
| `start_table` | Passe lobby → playing, crée le 1er round |
| `get_state` | État public du round (mains adverses masquées) |
| `play_card` | Jouer une carte |
| `resolve_trick` | Résoudre un pli terminé |
| `bank_player` | Aller en banque |
| `start_next_round` | Confirmer prêt pour le round suivant (collectif) |
| `leave_table` | Cash-out + forfait si besoin + dissolution si table vide / &lt; 2 |

---

## Edge Function `kora-game-engine`

```
supabase/functions/kora-game-engine/
├── index.ts          # router Deno.serve
├── game.ts           # start, play, bank, claim, next round
├── leave.ts          # leave + suppression table vide
├── shared.ts         # loaders, payout, toPublicState
└── engine/           # copie pure des règles (round, trick, payout…)
```

### Redéployer (indispensable après changement serveur)

**CLI** (si dispo) :

```bash
supabase functions deploy kora-game-engine
```

**Dashboard** : Edge Functions → `kora-game-engine` → Deploy  
**ou** intégration GitHub (branche prod = `clean`, dossier `supabase/`).

Sans redeploy, le client peut être à jour mais le serveur exécute encore l’ancienne logique.

### Purge tables bloquées (SQL Editor)

```sql
-- Voir les tables actives
select id, status, base_stake, created_at from kora_tables
where status in ('lobby', 'playing');

-- Purge lobby + playing (adapter si besoin)
-- (supprimer hands → rounds → players → tables dans cet ordre)
```

Scripts utiles : `supabase/scripts/02_purge_stale_lobbies.sql`, `03_purge_finished_tables.sql`.

---

## Structure du projet

```
src/
├── main.tsx / App.tsx
├── types.ts
├── navigation/           # paths, useAppNavigate, screenPage
├── auth/                 # AuthContext (session Supabase)
├── lib/
│   ├── supabase/         # client + types DB
│   └── online/           # api, session, errors
├── game/                 # moteur solo (pur) + GameContext + ai
├── components/game/      # table, overlays fin de round, chat…
└── screens/
    ├── OnlineLobbyScreen.tsx      # /online
    ├── OnlineGameTableScreen.tsx  # /play/online
    ├── GameTableScreen.tsx        # solo
    └── …

supabase/
├── functions/kora-game-engine/
├── migrations/
└── scripts/
```

---

## Les règles du jeu (résumé)

Règles détaillées in-app (**Règles**).

- **Paquet** : pas de V/D/R. Variantes `9` / `10` / `as` (As).
- **5 cartes** par joueur ; obligation de couleur si possible.
- **Combo** sur les 3 en fin de séquence du gagnant du dernier pli : Simple ×1 → Kora ×2 → 33 ×4 → Trinity ×8 → KMT ×16.
- **Spéciales** (avant le 1er pli) : Flush, 21, T7.
- **Banque** : possible avant le 3ᵉ pli (online : bouton aligné sur cette fenêtre).
- **Réclamation** : désactivée en online pour l’instant ; dispo en solo selon les règles.

---

## Architecture du moteur

Le cœur (`src/game/` hors `GameContext`, et `supabase/.../engine/`) est une **machine à états pure** :

- `initRound` → `playCard` → `resolveTrick` → `bankPlayer` / `claimVictory` → outcome
- Entrée `RoundState` → nouvelle `RoundState` (immutable)
- Online : le serveur est l’autorité ; le client **rotate** l’état pour que le joueur local soit toujours au siège vue `0`

---

## Déploiement

| Cible | Notes |
|-------|--------|
| Front | Build Vite (ex. Netlify — voir `netlify.toml`) |
| DB | Migrations dans `supabase/migrations/` |
| Functions | Deploy `kora-game-engine` après chaque changement serveur |

Branche Git recommandée pour la prod app + functions : **`clean`**.

---

## Conventions de code

- **UI / commentaires en français** ; identifiants de code en anglais.
- Dossier `game/` (et `engine/` Deno) : **pas d’import React**, pas de DOM.
- Ne pas confondre `rank` (force de pli) et `pointValue` (règle 21).
- Écrans online : navigation via `useAppNavigate` / `Screen` (`onlineLobby`, `onlineGameTable`, …) — ne pas inventer d’écrans hors `SCREEN_PATH`.

---

*README aligné sur l’état de la branche `clean` (solo + online Supabase).*
