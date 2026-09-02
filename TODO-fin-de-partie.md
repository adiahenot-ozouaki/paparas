# TODO — Refonte de la mécanique de fin de partie

> **À faire** : changer comment une partie se termine.
> Créé le 2026-09-02 pour ne pas oublier cette maj.

---

## État actuel

1. Chaque round : pot = mise × combo × perdants (banque = ×1).
2. Élimination si `capital < seuil` (défaut = `baseStake`).
3. Fin de partie dès qu’il ne reste **qu’un joueur** non éliminé.
4. Victoire = dernier survivant · Défaite = joueur humain éliminé.

Fichiers concernés :

- `src/game/payout.ts` — `checkGameOver`, `applyRoundPayout`, seuil
- `src/game/GameContext.tsx` — `checkGameOverNow`, `recordGameResult`, `startNextRound`
- `src/screens/RoundResultScreen.tsx` — navigation victory / defeat / table
- `src/screens/VictoryScreen.tsx` / `DefeatScreen.tsx`
- `src/screens/StakeConfigScreen.tsx` / `GameModeScreen.tsx` — config future

---

## Options envisagées

| # | Option | Résumé |
|---|--------|--------|
| 1 | **Rounds fixes** | N rounds (5/7/10), classement par capital |
| 2 | **Course au capital** | Premier à X FCFA gagne |
| 3 | **Hybride** *(préféré)* | Élimination **ou** max N rounds → plus riche gagne |
| 4 | **Match points** | Premier à K rounds gagnés |
| 5 | **Buy-in + pot table** | Pot global, survivant / 1er empoche |
| 6 | **Seuil souple** | Seuil 0, ou rachat unique |
| 7 | **Modes** | Rapide / Classique / Marathon |

### Suggestion retenue à valider

**Hybride (3) + modes (7)** :

- Garder l’élimination (identité “table d’argent”).
- Plafond de rounds (ex. 8–10) → sinon classement capital.
- Config avant partie :
  - *Jusqu’à élimination*
  - *X rounds*
  - *Premier à Y capital*

---

## Checklist d’implémentation (quand on s’y met)

- [ ] Étendre `GameStakeConfig` (ou `GameEndConfig`) : mode + paramètres
- [ ] Brancher la config dans `StakeConfigScreen` / `GameModeScreen`
- [ ] Adapter `checkGameOver` (rounds max, capital cible, points)
- [ ] Mettre à jour `RoundResultScreen` (message de fin selon le mode)
- [ ] Ajuster Victory / Defeat (texte selon la condition de victoire)
- [ ] Tests unitaires `payout` / fin de partie
- [ ] Supprimer ou archiver ce fichier une fois livré

---

## Notes

- Ne pas casser la somme nulle des payouts par round.
- Conserver la banque (×1) et les combos tels quels.
- UX : expliquer clairement *pourquoi* la partie s’est terminée.
