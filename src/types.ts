// ==========================================================================
// types.ts — Modèle de données Kora
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
 *   '8'  -> 3 à 8   (6 cartes/couleur, 23 cartes au total)
 *   '9'  -> 3 à 9   (7 cartes/couleur, 27 cartes au total)
 *   '10' -> 3 à 10  (8 cartes/couleur, 31 cartes au total)  — mode Vitesse
 *   'as' -> 3 à 10 + As (9 cartes/couleur, 35 cartes au total) — mode Classique
 * Dans tous les cas, ni Valet, ni Dame, ni Roi n'existent, et la plus forte
 * carte de Pique de la variante est retirée avant la partie.
 */
export type DeckVariant = '8' | '9' | '10' | 'as'

/** Valeurs pouvant apparaître dans un paquet Kora, toutes variantes confondues. */
export type CardValue = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'A'

export type CardState = 'default' | 'selected' | 'playable' | 'disabled' | 'played' | 'winner' | 'back'

export interface Card {
  suit: Suit
  value: CardValue
  rank: number
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

export type ComboType = 'simple' | 'kora' | '33' | 'trinity' | 'kmt'

export type SpecialRuleType = 'flush' | '21' | 't7'
