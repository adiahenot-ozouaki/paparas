// ==========================================================================
// types.ts — Modèle de données Kora
// ==========================================================================

export type Screen =
  | 'splash'
  | 'home'
  | 'gameMode'
  | 'stakeConfig'
  | 'lobby'
  | 'onlineLobby'
  | 'onlineGameTable'
  | 'auth'
  | 'gameTable'
  | 'freestyleTable'
  | 'roundResult'
  | 'victory'
  | 'defeat'
  | 'profile'
  | 'leaderboard'
  | 'stats'
  | 'achievements'
  | 'rules'

export type Suit = '♥' | '♦' | '♣' | '♠'

export type DeckVariant = '8' | '9' | '10' | 'as'

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
