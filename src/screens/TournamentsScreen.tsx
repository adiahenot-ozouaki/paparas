import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Screen } from '../types'
import type { Tournament, TournamentStatus } from '../lib/tournaments/types'
import {
  formatTournamentDate,
  getMyRegistrations,
  listTournaments,
  registerForTournament,
  unregisterFromTournament,
  statusLabel,
} from '../lib/tournaments/service'
import AdSlot from '../components/ads/AdSlot'
import { Trophy, Users, Coins, Calendar } from 'lucide-react'
import {
  AlertBanner,
  BackButton,
  EmptyState,
  PageHeader,
  ScreenShell,
  SectionCard,
  Segmented,
  UiButton,
} from '../components/ui'

type Filter = 'all' | 'open' | 'live' | 'completed'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'open', label: 'Ouverts' },
  { id: 'live', label: 'Live' },
  { id: 'completed', label: 'Passes' },
]

function matchesFilter(t: Tournament, f: Filter): boolean {
  if (f === 'all') return t.status !== 'completed'
  if (f === 'open') return t.status === 'open' || t.status === 'upcoming'
  return t.status === f
}

function statusClass(s: TournamentStatus): string {
  return 'tourney-status tourney-status--' + s
}

export default function TournamentsScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [list, setList] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState<string | null>(null)
  const [regs, setRegs] = useState<{ tournamentId: string; registeredAt: string }[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listTournaments()
      setList(data)
      setRegs(await getMyRegistrations())
    } catch {
      setError('Impossible de charger les tournois.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const visible = useMemo(() => list.filter(t => matchesFilter(t, filter)), [list, filter])

  async function handleRegister(id: string) {
    setBusyId(id)
    setError(null)
    const res = await registerForTournament(id)
    if (!res.ok) {
      setError(res.error ?? 'Inscription impossible')
    } else {
      setRegs(await getMyRegistrations())
      await refresh()
    }
    setBusyId(null)
  }

  async function handleUnregister(id: string) {
    setBusyId(id)
    setError(null)
    const res = await unregisterFromTournament(id)
    if (!res.ok) {
      setError(res.error ?? 'Desinscription impossible')
    } else {
      setRegs(await getMyRegistrations())
      await refresh()
    }
    setBusyId(null)
  }

  const registeredIds = useMemo(() => new Set(regs.map(r => r.tournamentId)), [regs])

  return (
    <ScreenShell bottomPad={28} className="tourney-screen">
      <PageHeader
        title="Tournois"
        subtitle="Competitions classees - lots en FCFA"
        left={<BackButton onClick={() => onNavigate('gameMode')} />}
      />

      <AdSlot placement="tournaments-banner" className="tourney-ad" />

      <Segmented
        value={filter}
        onChange={v => setFilter(v as Filter)}
        options={FILTERS.map(f => ({ id: f.id, label: f.label }))}
        className="tourney-filters"
      />

      {error && <AlertBanner tone="error">{error}</AlertBanner>}

      {loading ? (
        <p className="tourney-loading">Chargement...</p>
      ) : visible.length === 0 ? (
        <EmptyState title="Aucun tournoi" description="Revenez plus tard ou changez de filtre." />
      ) : (
        <div className="tourney-list">
          {visible.map(t => {
            const mine = registeredIds.has(t.id)
            const canJoin = (t.status === 'open' || t.status === 'upcoming') && !mine
            const full = t.registeredCount >= t.maxPlayers
            return (
              <SectionCard key={t.id} className="tourney-card" padding="md">
                <div className="tourney-card-top">
                  <div>
                    <p className="font-display tourney-card-title">{t.name}</p>
                    <p className="tourney-card-tagline">{t.tagline}</p>
                  </div>
                  <span className={statusClass(t.status)}>{statusLabel(t.status)}</span>
                </div>

                <div className="tourney-card-meta">
                  <span>
                    <Calendar size={14} className="kora-icon" aria-hidden /> {formatTournamentDate(t.startsAt)}
                  </span>
                  <span>
                    <Users size={14} className="kora-icon" aria-hidden /> {t.registeredCount}/{t.maxPlayers}
                  </span>
                  <span>
                    <Coins size={14} className="kora-icon" aria-hidden />{' '}
                    {t.entryFeeFcfa === 0 ? 'Gratuit' : t.entryFeeFcfa.toLocaleString('fr-FR') + ' FCFA'}
                  </span>
                  <span>
                    <Trophy size={14} className="kora-icon" aria-hidden />{' '}
                    {t.prizePoolFcfa.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <div className="tourney-card-actions">
                  {mine && (
                    <>
                      <span className="tourney-registered">Inscrit</span>
                      {(t.status === 'open' || t.status === 'upcoming') && (
                        <UiButton
                          size="sm"
                          variant="secondary"
                          disabled={busyId === t.id}
                          onClick={() => void handleUnregister(t.id)}
                        >
                          Se desinscrire
                        </UiButton>
                      )}
                    </>
                  )}
                  {canJoin && (
                    <UiButton
                      size="sm"
                      disabled={full || busyId === t.id}
                      onClick={() => void handleRegister(t.id)}
                    >
                      {full ? 'Complet' : busyId === t.id ? '...' : "S'inscrire"}
                    </UiButton>
                  )}
                  {t.status === 'live' && (
                    <UiButton size="sm" variant="secondary" onClick={() => onNavigate('onlineLobby')}>
                      Voir tables
                    </UiButton>
                  )}
                </div>
              </SectionCard>
            )
          })}
        </div>
      )}
    </ScreenShell>
  )
}
