// Sous-ensemble minimal de Player (src/types.ts) réellement utilisé par le
// calcul de paiement — pas besoin des champs purement UI (name, avatar,
// level, cardsLeft...) côté serveur.
export interface PayoutPlayer {
  capital: number
  isEliminated?: boolean
}

export interface GameStakeConfig {
  baseStake: number
  startingCapital: number
  eliminationThreshold?: number
}

function resolveEliminationThreshold(config: GameStakeConfig): number {
  return config.eliminationThreshold ?? config.baseStake
}

export interface PlayerPayout {
  playerIndex: number
  amount: number
}

export interface RoundPayoutResult {
  winners: PlayerPayout[]
  losers: PlayerPayout[]
}

/**
 * Répartition ENTIÈRE du pot entre les gagnants (voir game/payout.ts côté
 * client pour le détail du raisonnement) : part entière (Math.floor) pour
 * chacun + reliquat distribué 1 FCFA à la fois, ordre déterministe. Aucun
 * FCFA fractionnaire, somme toujours exactement égale au pot collecté.
 */
export function computeRoundPayout(params: {
  baseStake: number
  multiplier: number
  winnerIndexes: number[]
  allPlayerIndexes: number[]
  bankedPlayerIndexes?: number[]
}): RoundPayoutResult {
  const { baseStake, multiplier, winnerIndexes, allPlayerIndexes, bankedPlayerIndexes = [] } = params

  if (winnerIndexes.length === 0) {
    throw new Error('computeRoundPayout: au moins un gagnant est requis.')
  }

  const activeLoserIndexes = allPlayerIndexes.filter(
    i => !winnerIndexes.includes(i) && !bankedPlayerIndexes.includes(i),
  )
  const lossPerActiveLoser = baseStake * multiplier
  const lossPerBankedPlayer = baseStake

  const totalPot = lossPerActiveLoser * activeLoserIndexes.length + lossPerBankedPlayer * bankedPlayerIndexes.length

  const baseShare = Math.floor(totalPot / winnerIndexes.length)
  const remainder = totalPot - baseShare * winnerIndexes.length

  return {
    winners: winnerIndexes.map((playerIndex, i) => ({
      playerIndex,
      amount: baseShare + (i < remainder ? 1 : 0),
    })),
    losers: [
      ...activeLoserIndexes.map(playerIndex => ({ playerIndex, amount: -lossPerActiveLoser })),
      ...bankedPlayerIndexes.map(playerIndex => ({ playerIndex, amount: -lossPerBankedPlayer })),
    ],
  }
}

export function applyRoundPayout(players: PayoutPlayer[], payout: RoundPayoutResult, config: GameStakeConfig): PayoutPlayer[] {
  const threshold = resolveEliminationThreshold(config)
  const allMoves = [...payout.winners, ...payout.losers]

  return players.map((player, index) => {
    const move = allMoves.find(m => m.playerIndex === index)
    if (!move) return player

    const newCapital = player.capital + move.amount
    const isEliminated = newCapital < threshold

    return {
      ...player,
      capital: newCapital,
      isEliminated: isEliminated || player.isEliminated,
    }
  })
}

export interface GameOverCheck {
  isOver: boolean
  winnerIndex?: number
}

export function checkGameOver(players: PayoutPlayer[]): GameOverCheck {
  const remaining = players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => !player.isEliminated)

  if (remaining.length <= 1) {
    return { isOver: true, winnerIndex: remaining[0]?.index }
  }
  return { isOver: false }
}
