// ==========================================================================
// types.ts — Modèle de données Kora
//
// Étape 1/10 du plan de reconstruction de la logique de jeu.
// Remplace l'ancien src/types.ts. Principaux changements vs l'original :
//   - CardValue n'inclut plus J / Q / K (absents du paquet Kora)
//   - Card gagne deux propriétés distinctes :
//       rank       -> force de la carte DANS SA COULEUR (sert à gagner un pli)
//       pointValue -> valeur numérique pour la règle "21" (As = 11)
//   - Nouveau type DeckVariant pour piloter les 3 tailles de paquet (9/10/As)
//   - Nouveau type SpecialRule pour les règles Flush / 21 / T7
//
// Nettoyage : l'ancien type GamePhase ('dealing' | 'specialCheck' | ...)
// a été retiré — il n'était jamais utilisé nulle part dans le code. Le
// vrai cycle de vie d'un round est RoundPhase, défini dans game/round.ts
// ('specialWin' | 'playing' | 'trickWon' | 'roundEnd'), qui est la seule
// source de vérité pour l'état de jeu en cours.
// ==========================================================================

export type Screen =
  | 'splash'
  | 'home'
  | 'gameMode'
  | 'stakeConfig'
  | 'lobby'
  | 'gameTable'
  | 'roundResult'
  | 'victory'
  | 'defeat'
  | 'profile'
  | 'leaderboard'
  | 'stats'
  | 'achievements'
  | 'rules'

export type Suit = '♥' | '♦' | '♣' | '♠'

/**
 * Variante de paquet. Détermine l'étendue des valeurs jouées.
 *   '9'  -> 3 à 9   (7 cartes/couleur, 27 cartes au total)
 *   '10' -> 3 à 10  (8 cartes/couleur, 31 cartes au total)  — mode Vitesse
 *   'as' -> 3 à 10 + As (9 cartes/couleur, 35 cartes au total) — mode Classique
 * Dans tous les cas, ni Valet, ni Dame, ni Roi n'existent, et la plus forte
 * carte de Pique de la variante est retirée avant la partie.
 */
export type DeckVariant = '9' | '10' | 'as'

/** Valeurs pouvant apparaître dans un paquet Kora, toutes variantes confondues. */
export type CardValue = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'A'

export type CardState = 'default' | 'selected' | 'playable' | 'disabled' | 'played' | 'winner' | 'back'

export interface Card {
  suit: Suit
  value: CardValue
  /**
   * Position de force de la carte DANS SA PROPRE COULEUR pour la variante
   * de paquet en cours (1 = plus faible). Sert uniquement à déterminer qui
   * remporte un pli. Ne dépend PAS de la couleur demandée : seule la carte
   * la plus forte parmi celles jouées dans la couleur demandée gagne.
   */
  rank: number
  /**
   * Valeur numérique de la carte pour la règle spéciale "21" UNIQUEMENT.
   * L'As vaut 11 ici (mais reste la carte la plus forte de sa couleur pour
   * gagner un pli — les deux notions sont indépendantes).
   */
  pointValue: number
  state?: CardState
}

export interface Player {
  id: string
  name: string
  avatar: string
  capital: number
  level: number
  cardsLeft: number
  isActive: boolean
  isEliminated?: boolean
  tricks: number
}

/** Combo déterminé UNIQUEMENT à la fin du round (5e pli), pour le gagnant du round. */
export type ComboType = 'simple' | 'kora' | '33' | 'trinity' | 'kmt'

/** Règle spéciale déclenchée juste après la distribution, avant le premier pli. */
export type SpecialRuleType = 'flush' | '21' | 't7'
