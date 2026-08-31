import type { Card, ComboType } from './types.ts'

export type PlayerRoundSequence = Card[]
export type RoundPlayLog = PlayerRoundSequence[]

const COMBO_BY_TRAILING_THREES: Record<number, ComboType> = {
  0: 'simple',
  1: 'kora',
  2: '33',
  3: 'trinity',
  4: 'kmt',
}

/** Libellés d'affichage des combos, consommés par les écrans React. */
export const COMBO_LABEL: Record<ComboType, string> = {
  simple: 'Simple',
  kora: 'Kora',
  '33': '33',
  trinity: 'Trinité',
  kmt: 'KMT',
}

export const COMBO_MULTIPLIER: Record<ComboType, number> = {
  simple: 1,
  kora: 2,
  '33': 4,
  trinity: 8,
  kmt: 16,
}

export function countTrailingThrees(sequence: PlayerRoundSequence): number {
  let count = 0
  for (let i = sequence.length - 1; i >= 0; i--) {
    if (sequence[i].value === '3') {
      count++
    } else {
      break
    }
  }
  return Math.min(count, 4)
}

export function determineCombo(sequence: PlayerRoundSequence): ComboType {
  const trailingThrees = countTrailingThrees(sequence)
  return COMBO_BY_TRAILING_THREES[trailingThrees]
}

export function determineRoundCombo(roundWinnerIndex: number, playLog: RoundPlayLog): ComboType {
  return determineCombo(playLog[roundWinnerIndex])
}

export function getComboMultiplier(combo: ComboType): number {
  return COMBO_MULTIPLIER[combo]
}
