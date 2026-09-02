# TODO — Refonte de la mécanique de fin de partie

> **Livré** le 2026-09-02 (hybride + modes).

---

## État livré

Modes dans `GameStakeConfig.endMode` :

| Mode | Comportement |
|------|----------------|
| `fixedRounds` **(défaut)** | Élimination **ou** après `maxRounds` → plus riche gagne |
| `elimination` | Dernier survivant uniquement |
| `raceToCapital` | Premier à `targetCapital`, sinon élimination |

Config UI : `StakeConfigScreen` (stepper Fin / Rounds / Objectif).

Logique : `checkGameOver(players, config, roundNumber)` + `reason` (`last_standing` \| `max_rounds` \| `race_target` \| `all_eliminated`).

Écrans Victory / Defeat affichent la raison de fin.

---

## Checklist

- [x] Étendre `GameStakeConfig`
- [x] Brancher la config dans `StakeConfigScreen`
- [x] Adapter `checkGameOver`
- [x] Victory / Defeat (texte selon condition)
- [x] Tests unitaires payout / fin de partie
- [x] Documenter ici comme livré

## Notes

- Somme nulle des payouts inchangée.
- Banque (×1) et combos inchangés.
