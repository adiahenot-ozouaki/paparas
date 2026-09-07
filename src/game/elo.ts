// ==========================================================================
// game/elo.ts — Rating Elo (départ 1000, K=24).
// Deux classements indépendants :
//   - Solo  : partie terminée vs ratings IA fixes → LifetimeStats.eloSolo
//   - Online: 1 round = 1 match multi-joueurs → LifetimeStats.eloOnline (edge)
// ==========================================================================

export const ELO_DEFAULT = 1000
export const ELO_K = 24

/** Ratings fixes des IA solo (sièges 1–3). */
export const AI_ELO: Record<string, number> = {
  binu: 1120,
  lebe: 980,
  goju: 1050,
}

export function expectedScore(ra: number, rb: number): number {
  return 1 / (1 + 10 ** ((rb - ra) / 400))
}

/**
 * Deltas Elo pour un match multi-joueurs.
 * `winnerIndexes` : indices des gagnants (ex. un seul vainqueur de round,
 * ou plusieurs en cas de règle spéciale partagée).
 */
export function eloDeltas(
  ratings: number[],
  winnerIndexes: number[],
  k: number = ELO_K,
): number[] {
  const n = ratings.length
  if (n < 2) return ratings.map(() => 0)

  const winners = winnerIndexes.length > 0 ? winnerIndexes : []
  const share = winners.length > 0 ? 1 / winners.length : 0
  const actual = ratings.map((_, i) => (winners.includes(i) ? share : 0))

  const expected = ratings.map((ra, i) => {
    let sum = 0
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      sum += expectedScore(ra, ratings[j])
    }
    return sum / (n - 1)
  })

  return ratings.map((_, i) => Math.round(k * (actual[i] - expected[i])))
}

/** Solo : vous (index 0) vs 3 IA. `won` = vous avez gagné la partie. */
export function soloGameEloDelta(humanElo: number, won: boolean): number {
  const ratings = [humanElo, AI_ELO.binu, AI_ELO.lebe, AI_ELO.goju]
  const winners = won ? [0] : [1, 2, 3]
  const deltas = eloDeltas(ratings, winners, ELO_K)
  return deltas[0]
}

export function applyEloDelta(current: number, delta: number): number {
  return Math.max(100, Math.round(current + delta))
}
