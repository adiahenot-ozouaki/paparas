// ==========================================================================
// engine/types.ts — sous-ensemble de src/types.ts (client) nécessaire au
// moteur pur. Dupliqué plutôt qu'importé depuis le client : une Edge
// Function Deno ne partage pas le même graphe de modules qu'un build Vite,
// et ce sous-ensemble est volontairement minimal (uniquement ce dont
// engine/*.ts a besoin, rien de spécifique à React/l'UI).
// ==========================================================================

export type Suit = '♥' | '♦' | '♣' | '♠'

export type DeckVariant = '9' | '10' | 'as'

export type CardValue = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'A'

export interface Card {
  suit: Suit
  value: CardValue
  rank: number
  pointValue: number
}

export type ComboType = 'simple' | 'kora' | '33' | 'trinity' | 'kmt'

export type SpecialRuleType = 'flush' | '21' | 't7'
