import type { Tournament, TournamentRegistration } from './types'
import { MOCK_TOURNAMENTS } from './mock'

const REG_KEY = 'kora:tournamentRegs:v1'

function loadRegs(): TournamentRegistration[] {
  try {
    const raw = localStorage.getItem(REG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TournamentRegistration[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRegs(regs: TournamentRegistration[]) {
  try {
    localStorage.setItem(REG_KEY, JSON.stringify(regs))
  } catch {
    // ignore
  }
}

export async function listTournaments(): Promise<Tournament[]> {
  await new Promise(r => setTimeout(r, 120))
  return MOCK_TOURNAMENTS.map(t => ({ ...t }))
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const all = await listTournaments()
  return all.find(t => t.id === id) ?? null
}

export function getMyRegistrations(): TournamentRegistration[] {
  return loadRegs()
}

export function isRegistered(tournamentId: string): boolean {
  return loadRegs().some(r => r.tournamentId === tournamentId)
}

export function registerForTournament(tournamentId: string): { ok: boolean; error?: string } {
  const t = MOCK_TOURNAMENTS.find(x => x.id === tournamentId)
  if (!t) return { ok: false, error: 'Tournoi introuvable' }
  if (t.status !== 'open' && t.status !== 'upcoming') {
    return { ok: false, error: 'Inscriptions fermées' }
  }
  if (t.registeredCount >= t.maxPlayers) {
    return { ok: false, error: 'Complet' }
  }
  const regs = loadRegs()
  if (regs.some(r => r.tournamentId === tournamentId)) {
    return { ok: false, error: 'Déjà inscrit' }
  }
  regs.push({ tournamentId, registeredAt: new Date().toISOString() })
  saveRegs(regs)
  t.registeredCount = Math.min(t.maxPlayers, t.registeredCount + 1)
  return { ok: true }
}

export function formatTournamentDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function statusLabel(status: Tournament['status']): string {
  switch (status) {
    case 'upcoming':
      return 'Bientôt'
    case 'open':
      return 'Inscriptions'
    case 'live':
      return 'En cours'
    case 'completed':
      return 'Terminé'
  }
}
