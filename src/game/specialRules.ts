import type { Card, SpecialRuleType } from './types.ts'

export const SPECIAL_RULE_MULTIPLIER = 1

function isFlush(hand: Card[]): boolean {
  if (hand.length === 0) return false
  const firstSuit = hand[0].suit
  return hand.every(card => card.suit === firstSuit)
}

function sumsTo21(hand: Card[]): boolean {
  const sum = hand.reduce((total, card) => total + card.pointValue, 0)
  return sum === 21
}

function hasThreeSevens(hand: Card[]): boolean {
  const sevenCount = hand.filter(card => card.value === '7').length
  return sevenCount >= 3
}

export function detectSpecialRules(hand: Card[]): SpecialRuleType[] {
  const rules: SpecialRuleType[] = []
  if (isFlush(hand)) rules.push('flush')
  if (sumsTo21(hand)) rules.push('21')
  if (hasThreeSevens(hand)) rules.push('t7')
  return rules
}

export interface SpecialWinner {
  playerIndex: number
  rules: SpecialRuleType[]
}

export interface SpecialWinCheckResult {
  hasSpecialWin: boolean
  winners: SpecialWinner[]
}

export function checkForSpecialWin(hands: Card[][]): SpecialWinCheckResult {
  const winners: SpecialWinner[] = []

  hands.forEach((hand, playerIndex) => {
    const rules = detectSpecialRules(hand)
    if (rules.length > 0) {
      winners.push({ playerIndex, rules })
    }
  })

  return {
    hasSpecialWin: winners.length > 0,
    winners,
  }
}
