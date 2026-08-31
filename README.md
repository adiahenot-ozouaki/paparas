# Garam Paparas

Jeu de cartes de plis africain (variante Kora), jouable en solo contre 3 adversaires IA, avec mises configurables, combos de fin de manche et règles spéciales de victoire immédiate.

> ⚠️ **État actuel : prototype local, pas encore un jeu en ligne.** Tout le moteur de jeu tourne côté client, dans le navigateur du joueur, et la partie/les statistiques sont sauvegardées dans `localStorage`. Il n'y a ni serveur, ni compte, ni vrais adversaires humains, ni paiement réel pour l'instant. Voir [Feuille de route](#feuille-de-route--vers-le-online) plus bas.

---

## Sommaire

- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Structure du projet](#structure-du-projet)
- [Les règles du jeu](#les-règles-du-jeu-résumé)
- [Architecture du moteur de jeu](#architecture-du-moteur-de-jeu)
- [État et persistance](#état-et-persistance)
- [Écrans de l'application](#écrans-de-lapplication)
- [Ce qui est réel vs démonstration](#ce-qui-est-réel-vs-démonstration)
- [Feuille de route — vers le online](#feuille-de-route--vers-le-online)
- [Conventions de code](#conventions-de-code)

---

## Stack technique

- **React 19** + **TypeScript 5.7** (mode `strict`)
- **Vite 8** (dev server + build) avec **Tailwind CSS v4** (`@tailwindcss/vite`)
- Environnement de développement : **Figma Make** (voir `AGENTS.md` / `CLAUDE.md` pour les conventions imposées par cet environnement)
- Aucune dépendance de state management externe : un seul `React.Context` (`GameContext`) suffit, le moteur de jeu étant une machine à états pure sans effets de bord.
- Aucun backend, aucune base de données, aucune API — tout est local au navigateur.

## Démarrage rapide

```bash
pnpm install
pnpm dev       # démarre le serveur de développement Vite
pnpm build     # build de production
pnpm preview   # sert le build de production en local
pnpm format    # formatte le code avec oxfmt
```

Le port par défaut est `8443` (configurable via la variable d'environnement `PORT`). Dans l'environnement Figma Make, le serveur de dev est déjà lancé automatiquement — pas besoin de `pnpm dev` manuellement (voir `AGENTS.md`).

## Structure du projet

```
src/
├── main.tsx                  # point d'entrée React
├── App.tsx                   # composant racine, routing d'écrans, ErrorBoundary
├── types.ts                  # modèle de données partagé (Card, Player, Screen...)
├── index.css                 # Tailwind v4 + thème custom + animations
│
├── game/                     # ── Moteur de jeu (logique pure, sans React) ──
│   ├── deck.ts                # génération et distribution du paquet
│   ├── trick.ts                # logique d'un pli (couleur demandée, gagnant)
│   ├── specialRules.ts         # détection Flush / 21 / T7
│   ├── combo.ts                # détection du combo de fin de round (Simple → KMT)
│   ├── payout.ts               # calcul des gains/pertes, élimination
│   ├── round.ts                 # orchestration d'un round complet (machine à états)
│   ├── ai.ts                    # heuristique des adversaires IA
│   └── GameContext.tsx          # état React partagé + persistance localStorage
│
├── components/
│   ├── PlayingCard.tsx          # rendu d'une carte
│   ├── BottomNav.tsx            # navigation basse
│   ├── ErrorBoundary.tsx        # filet de sécurité anti-écran-blanc
│   └── game/                    # sous-composants de la table de jeu
│       ├── GameTableHud.tsx
│       ├── GameTableArea.tsx
│       ├── PlayerHand.tsx
│       ├── OpponentPanel.tsx
│       ├── PlayedCardsStack.tsx
│       ├── TrickWonOverlay.tsx
│       ├── RoundEndBanner.tsx
│       ├── SpecialWinOverlay.tsx / SpecialWinOverlayWrapper.tsx
│       └── BankConfirmOverlay.tsx
│
└── screens/                   # un composant par écran (voir table plus bas)
```

## Les règles du jeu (résumé)

Règles complètes et interactives disponibles in-app via l'écran **Règles** (`RulesScreen.tsx`).

- **Paquet** : pas de Valet/Dame/Roi. Trois variantes configurables avant la partie :
  - `9` → cartes 3 à 9 (27 cartes)
  - `10` → cartes 3 à 10 (31 cartes) — mode Vitesse
  - `as` → cartes 3 à 10 + As (35 cartes) — mode Classique (par défaut)
  - Dans tous les cas, la plus forte carte de Pique de la variante est retirée du paquet.
- **Distribution** : 5 cartes par joueur (3 puis 2, en deux tours de table).
- **Un pli** : le joueur "à la main" ouvre avec la carte de son choix, sa couleur devient la couleur demandée. Obligation de suivre la couleur si possible. La plus forte carte de la couleur demandée remporte le pli.
- **Combo de fin de round** : le gagnant du 5ᵉ (dernier) pli remporte le round. Le multiplicateur dépend du nombre de cartes de valeur `3` jouées **consécutivement en toute fin de manche** :

  | 3 consécutifs | Combo | Multiplicateur |
  |---|---|---|
  | 0 | Simple | ×1 |
  | 1 | Kora | ×2 |
  | 2 | 33 | ×4 |
  | 3 | Trinity | ×8 |
  | 4 | KMT | ×16 |

- **Règles spéciales** (vérifiées juste après la distribution, avant tout pli — victoire immédiate, mains révélées, multiplicateur toujours ×1) :
  - **Flush** : les 5 cartes de la main sont de la même couleur.
  - **21** : la somme des valeurs de la main (As = 11) fait exactement 21.
  - **T7** : au moins trois 7 dans la main.
- **Banque** : un joueur peut abandonner le round avant le 3ᵉ pli, en payant systématiquement mise ×1 (indépendamment du combo final).
- **Réclamation de victoire** : un joueur à la main peut réclamer la victoire du round si tous ses plis restants sont gagnés d'avance (aucun adversaire actif n'a de carte des couleurs qu'il lui reste).
- **Élimination** : un joueur dont le capital tombe sous la mise de base est éliminé. La partie se termine dès qu'il ne reste qu'un joueur non éliminé.

## Architecture du moteur de jeu

Le cœur du jeu (`src/game/`, hors `GameContext.tsx`) est écrit comme une **machine à états pure** :

- Chaque fonction (`initRound`, `playCard`, `resolveTrick`, `bankPlayer`, `claimVictory`, ...) prend un `RoundState` et retourne un **nouveau** `RoundState`, sans muter l'entrée, sans timer, sans accès au DOM.
- Aucune fonction du dossier `game/` (sauf `GameContext.tsx`) n'importe React.
- Cette pureté a deux conséquences importantes :
  1. **Testable facilement** en isolation (aucun test unitaire n'existe encore — voir feuille de route).
  2. **Portable vers un serveur** : c'est exactement ce moteur qui devra tourner côté backend le jour où le jeu passe en ligne, pour que le client ne soit plus jamais la seule autorité sur l'état de la partie.

`GameContext.tsx` est la seule couche qui connecte ce moteur pur à React : elle détient l'état (`useState`), orchestre les timers d'IA/d'animation (dans `GameTableScreen.tsx`), et persiste dans `localStorage`.

## État et persistance

Deux clés `localStorage`, gérées uniquement par `game/GameContext.tsx` :

- `kora:activeGame:v1` — snapshot de la partie en cours (joueurs, `RoundState`, config de mise...). Permet de reprendre après un rechargement de page. Effacée à la fin d'une partie (`recordGameResult`).
- `kora:lifetimeStats:v1` — statistiques cumulées **entre parties** (`LifetimeStats`) : parties jouées/gagnées, rounds gagnés, plis gagnés, combos réalisés par type, règles spéciales déclenchées, gains/pertes, capital min/max. Mises à jour à la fin de **chaque round** (pas seulement en fin de partie), pour rester exactes même si le joueur quitte en cours de route.

Ces statistiques alimentent directement `ProfileScreen`, `StatsScreen`, `HomeScreen` et (partiellement) `LeaderboardScreen` — voir section suivante.

## Écrans de l'application

| Écran (`Screen`) | Fichier | Rôle |
|---|---|---|
| `splash` | `SplashScreen.tsx` | Écran de lancement animé |
| `home` | `HomeScreen.tsx` | Accueil, capital, accès rapide au jeu |
| `gameMode` | `GameModeScreen.tsx` | Choix du mode de partie |
| `stakeConfig` | `StakeConfigScreen.tsx` | Configuration mise / capital de départ / variante de paquet |
| `lobby` | `LobbyScreen.tsx` | Salle d'attente avant le lancement d'une partie |
| `gameTable` | `GameTableScreen.tsx` | Écran de jeu principal |
| `roundResult` | `RoundResultScreen.tsx` | Résultat détaillé d'un round |
| `victory` / `defeat` | `VictoryScreen.tsx` / `DefeatScreen.tsx` | Fin de partie |
| `profile` | `ProfileScreen.tsx` | Statistiques du joueur (données réelles) |
| `stats` | `StatsScreen.tsx` | Statistiques détaillées (données réelles) |
| `leaderboard` | `LeaderboardScreen.tsx` | Classement (voir limite ci-dessous) |
| `achievements` | `AchievementsScreen.tsx` | Hauts faits (⚠️ encore mocké, voir ci-dessous) |
| `rules` | `RulesScreen.tsx` | Règles du jeu illustrées et interactives |

## Ce qui est réel vs démonstration

Un nettoyage a été fait pour que l'app ne mente plus sur ses propres données. État actuel :

- ✅ **Réel** : capital, mise, variante de paquet, tout le déroulé d'une partie/round, `ProfileScreen`, `StatsScreen`, `HomeScreen`, et la ligne "Vous" de `LeaderboardScreen`.
- ⚠️ **Partiellement démonstration** : `LeaderboardScreen` affiche 7 adversaires fictifs à côté de vos vraies stats, explicitement marqués **« DÉMO »** dans l'UI — il n'existe pas encore de backend pour agréger de vrais scores d'autres joueurs.
- ⚠️ **Encore mocké** : `AchievementsScreen` (liste de hauts faits statique, aucune logique de déblocage réelle branchée).
- ⚠️ **Non fonctionnel intentionnellement** : le bouton "Retirer" dans `ProfileScreen` est désactivé — aucun système de paiement/retrait n'existe.

## Feuille de route — vers le online

Le point le plus important à comprendre avant d'aller plus loin : **ce prototype n'est pas un jeu en ligne**, même si le lobby et le mode "Avec amis" le suggèrent visuellement. Actuellement :

- Le mélange du paquet utilise `Math.random()` **côté client** — non vérifiable, non sécurisé pour un jeu à mise réelle.
- Il n'y a ni compte, ni authentification, ni serveur : `localStorage` peut être édité directement par n'importe qui pour changer son capital.
- Les "3 adversaires" sont toujours des IA (`game/ai.ts`), jamais de vrais joueurs.

Pour passer à un vrai jeu en ligne, dans l'ordre de priorité suggéré :

1. **Porter le moteur de jeu (`game/`) côté serveur**, tel quel — il est déjà pur et sans dépendance React, donc directement réutilisable comme autorité de jeu.
2. **RNG côté serveur** (cryptographiquement sûr) pour le mélange du paquet.
3. **Couche réseau temps réel** (WebSocket) : le client envoie des actions (jouer une carte, banque, réclamation), le serveur valide et diffuse le nouvel état.
4. **Authentification + persistance serveur** du capital et des statistiques (remplace `localStorage` comme source de vérité).
5. **Matchmaking / vrais lobbies** pour remplacer les mocks de `LobbyScreen.tsx` et `GameModeScreen.tsx`.
6. Si mise réelle : conformité paiement/retrait/KYC — hors périmètre code, à traiter avec les équipes juridique/finance en amont.

## Conventions de code

- **Commentaires et UI en français**, code (noms de variables/fonctions) en anglais/franglais technique — cohérence à conserver.
- **Livraison de fichiers en remplacement complet**, pas en diff, avec vérification `npx tsc --noEmit` avant toute livraison quand c'est possible.
- Le dossier `game/` doit rester **pur** : aucun import React, aucun accès `localStorage`/DOM en dehors de `GameContext.tsx`.
- `rank` (force pour gagner un pli) et `pointValue` (valeur pour la règle "21") sur une `Card` sont **intentionnellement séparés** — ne jamais les confondre.
- Voir `AGENTS.md` pour les contraintes spécifiques à l'environnement Figma Make (styling Tailwind v4 sans config, alias `@/`, quotes, etc.).

---

*Document généré dans le cadre d'un nettoyage du projet — à mettre à jour au fur et à mesure que le online avance.*
