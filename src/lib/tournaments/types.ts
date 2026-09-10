export type TournamentStatus = 'upcoming' | 'open' | 'live' | 'completed'

export type TournamentFormat = 'single_elim' | 'rounds_race' | 'swiss'

export interface TournamentPrize {
  rank: number
  label: string
  amountFcfa: number
}

export interface Tournament {
  id: string
  name: string
  status: TournamentStatus
  format: TournamentFormat
  entryFeeFcfa: number
  prizePoolFcfa: number
  prizes: TournamentPrize[]
  maxPlayers: number
  registeredCount: number
  startsAt: string
  tagline: string
  rulesPreset: 'standard' | 'training' | 'high_stakes'
  winners?: TournamentWinner[]
}

export interface TournamentRegistration {
  tournamentId: string
  registeredAt: string
}

export interface TournamentWinner {
  rank: number
  userId: string
  username: string
  amountFcfa: number
}

export interface TournamentEntrant {
  userId: string
  username: string
  avatar: string
  registeredAt: string
  feePaidFcfa: number
}

export interface TournamentMatchTable {
  tableId: string
  status: 'lobby' | 'playing' | 'finished'
  baseStake: number
  seatCount: number
  code: string
}
