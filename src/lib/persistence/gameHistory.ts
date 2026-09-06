// ==========================================================================
// gameHistory.ts — journal local des parties terminées (solo).
// Pas de table Supabase pour l’instant : ring buffer localStorage.
// ==========================================================================

export const STORAGE_KEY_GAME_HISTORY = 'kora:gameHistory:v1'
export const MAX_HISTORY_ENTRIES = 30

export type GameHistoryEntry = {
  id: string
  at: number
  won: boolean
  netGain: number
  finalCapital: number
  startingCapital: number
  roundsWon: number
  bestCombo: string | null
  endReason?: string | null
  mode: 'solo' | 'online'
}

export function loadGameHistory(): GameHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GAME_HISTORY)
    if (!raw) return []
    const arr = JSON.parse(raw) as GameHistoryEntry[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function appendGameHistory(entry: Omit<GameHistoryEntry, 'id' | 'at'> & { at?: number }): GameHistoryEntry[] {
  const full: GameHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: entry.at ?? Date.now(),
    won: entry.won,
    netGain: entry.netGain,
    finalCapital: entry.finalCapital,
    startingCapital: entry.startingCapital,
    roundsWon: entry.roundsWon,
    bestCombo: entry.bestCombo,
    endReason: entry.endReason ?? null,
    mode: entry.mode,
  }
  const prev = loadGameHistory()
  const next = [full, ...prev].slice(0, MAX_HISTORY_ENTRIES)
  try {
    localStorage.setItem(STORAGE_KEY_GAME_HISTORY, JSON.stringify(next))
  } catch {
    // ignore quota
  }
  return next
}

export function clearGameHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_GAME_HISTORY)
  } catch {
    // ignore
  }
}

export function formatHistoryDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}
