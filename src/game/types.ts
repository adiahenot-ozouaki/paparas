// Re-export du modèle partagé pour les imports relatifs ./types.ts
// utilisés par les modules purs de src/game/ (compat node --experimental-strip-types).
export type {
  Card,
  CardValue,
  ComboType,
  DeckVariant,
  Player,
  SpecialRuleType,
  Suit,
} from '../types.ts'
