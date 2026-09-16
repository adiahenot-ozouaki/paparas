# Plan de migration — Snapshot solo `activeGame` v1 → v2

> Statut : **planifié** (implémentation ultérieure)
> Branche : `clean`
> Contexte : audit persistance solo / online (sept. 2026)

## Objectif

Versionner le snapshot de partie solo, rendre la reprise robuste après évolutions de schéma, et corriger les trous identifiés à l’audit (`payoutApplied` manquant, pas de garde de version).

---

## 1. Constat actuel (v1)

| Élément | État |
|--------|------|
| Clé storage | `kora:activeGame:v1` |
| Contenu | `players`, `roundState`, `roundNumber`, `roundsWon`, `bestCombo`, `gameStartedAt`, `stakeConfig`, `deckVariant`, `started`, `lastGameOver?` |
| Manquant | `schemaVersion`, `payoutApplied` |
| Chargement | `JSON.parse` sans contrôle de version ni migration |
| Risque | Évolution de `RoundState` / `Player` → crash ou état incohérent au reload |

Fichier principal aujourd’hui : `src/game/GameContext.tsx` (load / save / clear inline).

---

## 2. Cible v2

### 2.1 Forme du snapshot

```ts
interface PersistedGameSnapshotV2 {
  schemaVersion: 2
  players: Player[]
  roundState: RoundState
  roundNumber: number
  roundsWon: number[]
  bestCombo: (ComboType | null)[]
  gameStartedAt: number
  stakeConfig: GameStakeConfig
  deckVariant: DeckVariant
  started: boolean
  lastGameOver: GameOverCheck | null
  payoutApplied: boolean // NOUVEAU
}
```

### 2.2 Clé storage

**Approche retenue** : une seule clé + champ `schemaVersion` dans le JSON.

| Version | Clé | Action |
|---------|-----|--------|
| v1 (legacy) | `kora:activeGame:v1` | Lire une fois → migrer → écrire v2 → supprimer v1 |
| v2 (canonique) | `kora:activeGame` | Clé unique ;
| inconnue / future | — | Ignorer / clear (pas de crash) |

Constantes proposées :

```ts
const STORAGE_KEY = 'kora:activeGame'
const LEGACY_KEY_V1 = 'kora:activeGame:v1'
const CURRENT_SCHEMA_VERSION = 2
```

---

## 3. Stratégie de migration

```
load()
  ├─ lire raw (clé v2, puis fallback clé v1 legacy)
  ├─ parse JSON
  ├─ si pas d’objet / parse fail → null (partie neuve)
  ├─ schemaVersion === 2 → normalizeV2() → snapshot
  ├─ schemaVersion manquant ou === 1 (ou clé v1) → migrateV1toV2()
  │     ├─ succès → save V2 + remove clé v1
  │     └─ échec (shape invalide) → clear + null
  └─ schemaVersion > 2 ou inconnu → clear + null
```

### 3.1 `migrateV1toV2(raw)`

1. Valider présence minimale : `players`, `roundState`, `started` (et longueurs cohérentes pour `roundsWon` / `bestCombo` si possible).
2. Construire V2 :
   - `schemaVersion: 2`
   - copier les champs existants
   - `payoutApplied: false` par défaut  
     (sécurisé : mieux rejouer un overlay / bloquer un double payout côté logique que d’assumer `true` à tort)
3. **Ne pas** tenter d’inférer `payoutApplied` depuis l’état des capitaux (trop fragile pour V2).
4. Normaliser `lastGameOver` → `null` si absent.
5. Retourner le snapshot V2 ou `null` si invalide.

### 3.2 Politique d’échec

- Snapshot illisible / incomplet → **clear storage**, démarrer sans reprise.
- Ne jamais throw hors du `try/catch` du loader.

---

## 4. Changements code

### 4.1 Nouveau module (recommandé)

Fichier : `src/lib/persistence/activeGame.ts`

Responsabilités :

- Types : `PersistedGameSnapshotV1` (interne), `PersistedGameSnapshot` (= V2)
- `loadActiveGame(): PersistedGameSnapshot | null`
- `saveActiveGame(snapshot: Omit<PersistedGameSnapshot, 'schemaVersion'>): void`  
  (force toujours `schemaVersion: 2`)
- `clearActiveGame(): void`
- `migrateV1toV2(raw: unknown): PersistedGameSnapshot | null`
- `normalizeV2(raw: unknown): PersistedGameSnapshot | null`

`GameContext` n’importe plus que ces fonctions + le type public.

### 4.2 `GameContext.tsx`

| Avant | Après |
|-------|--------|
| Clé + load/save/clear inline | Import `loadActiveGame` / `saveActiveGame` / `clearActiveGame` |
| State `payoutApplied` toujours `false` au mount | Initialiser depuis `persisted?.payoutApplied ?? false` |
| `savePersistedGame({ ... })` sans version ni payout | `saveActiveGame({ ..., payoutApplied })` |
| `useEffect` deps | Ajouter `payoutApplied` |

### 4.3 Écriture systématique

Toute sauvegarde force :

```ts
{ schemaVersion: 2, ...fields, payoutApplied }
```

### 4.4 Nettoyage legacy

Dans `loadActiveGame` :

1. Essayer `STORAGE_KEY`
2. Sinon lire `LEGACY_KEY_V1`
3. Après migration réussie : `localStorage.removeItem(LEGACY_KEY_V1)`
4. Écrire sous la nouvelle clé

---

## 5. Garde-fous runtime (complément)

- `applyCurrentPayout` : conserver le garde `if (payoutApplied || !roundState.outcome) return`.
- Au mount si `started && roundState.outcome && !payoutApplied` : laisser le flow normal (revoir la fin de round) — acceptable.
- Optionnel plus tard : toast « Partie reprise » si snapshot chargé.
- Fail soft : snapshot douteux → nouvelle partie, pas de crash UI.

---

## 6. Plan d’exécution

| Étape | Tâche | Risque |
|-------|--------|--------|
| **1** | Créer `src/lib/persistence/activeGame.ts` | Faible |
| **2** | Tests purs : v1→v2, v2 ok, JSON pourri, version 99, tableaux trop courts | Faible |
| **3** | Brancher `GameContext` (init `payoutApplied`, deps, clear/save) | Moyen |
| **4** | Manuel : partie solo → outcome → F5 → vérifier reprise + `payoutApplied` | — |
| **5** | Manuel : injecter JSON legacy `kora:activeGame:v1` → reload → migration + suppression clé | — |
| **6** | (Optionnel) log dev `[activeGame] migrated v1→v2` | — |

Pas de migration serveur : snapshot 100 % client.

---

## 7. Tests minimaux

```text
migrateV1toV2
  ✓ objet v1 complet → schemaVersion 2 + payoutApplied false
  ✓ sans lastGameOver → lastGameOver null
  ✓ null / string / {} → null

normalizeV2
  ✓ snapshot v2 valide → inchangé (hors defaults mineurs)
  ✓ schemaVersion 3 → null
  ✓ players.length !== 4 → null (selon règle choisie)

loadActiveGame (mock localStorage)
  ✓ clé v2 présente → V2
  ✓ seule clé v1 → migre, écrit v2, remove v1
  ✓ quota / throw → null
```

---

## 8. Critères d’acceptation

- [ ] Toute écriture contient `schemaVersion: 2` et `payoutApplied`
- [ ] Ancien snapshot v1 (clé legacy ou JSON sans version) est migré une fois puis la clé legacy disparaît
- [ ] Snapshot corrompu ou version future → clear, pas d’exception UI
- [ ] Reload mid-round conserve l’état de table
- [ ] Reload avec `outcome` présent et `payoutApplied: true` ne ré-applique pas le payout
- [ ] `startNewGame` / `recordGameResult` effacent toujours le snapshot
- [ ] Aucune régression online (storage online non touché)

---

## 9. Hors scope

- Compression / prune du `roundState`
- Sync cloud du snapshot solo
- Merge additif des lifetime stats
- Historique parties côté Supabase

---

## 10. Résumé

Introduire `schemaVersion` + `payoutApplied`, migrer v1→v2 au load avec fail-soft, centraliser load/save dans `src/lib/persistence/activeGame.ts`, et brancher l’init de `payoutApplied` dans `GameContext`.
