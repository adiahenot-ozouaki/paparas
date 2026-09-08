import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Screen } from '../types'
import { useAuth } from '../auth/AuthContext'
import { fetchWallet } from '../lib/persistence/cloud'
import type {
  Tournament,
  TournamentStatus,
  TournamentEntrant,
  TournamentMatchTable,
} from '../lib/tournaments/types'
import {
  formatTournamentDate,
  getMyRegistrations,
  listTournaments,
  listTournamentEntrants,
  listTournamentTables,
  registerForTournament,
  unregisterFromTournament,
  statusLabel,
} from '../lib/tournaments/service'
import { setActiveOnlineTableId, setOnlineSpectate } from '../lib/online/session'
import AdSlot from '../components/ads/AdSlot'
import { Trophy, Users, Coins, Calendar, Eye, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [entrantsById, setEntrantsById] = useState<Record<string, TournamentEntrant[]>>({})
  const [tablesById, setTablesById] = useState<Record<string, TournamentMatchTable[]>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const { user, profile } = useAuth()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listTournaments()
      setList(data)
      setRegs(await getMyRegistrations())
      if (user) {
        const w = await fetchWallet()
        if (w.wallet) setWalletBalance(w.wallet.balance)
        else if (typeof profile?.wallet_balance === 'number') setWalletBalance(profile.wallet_balance)
      } else {
        setWalletBalance(null)
      }
    } catch {
      setError('Impossible de charger les tournois.')
    } finally {
      setLoading(false)
    }
  }, [user, profile?.wallet_balance])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const visible = useMemo(() => list.filter(t => matchesFilter(t, filter)), [list, filter])
  const registeredIds = useMemo(() => new Set(regs.map(r => r.tournamentId)), [regs])

  async function loadDetails(tournamentId: string) {
    setDetailLoading(tournamentId)
    const [ent, tabs] = await Promise.all([
      listTournamentEntrants(tournamentId),
      listTournamentTables(tournamentId),
    ])
    setEntrantsById(prev => ({ ...prev, [tournamentId]: ent.entrants }))
    setTablesById(prev => ({ ...prev, [tournamentId]: tabs.tables }))
    setDetailLoading(null)
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    void loadDetails(id)
  }

  async function handleRegister(id: string) {
    setBusyId(id)
    setError(null)
    setInfo(null)
    if (!user) {
      setError('Connectez-vous pour vous inscrire')
      setBusyId(null)
      onNavigate('auth')
      return
    }
    const res = await registerForTournament(id)
    if (!res.ok) {
      setError(res.error ?? 'Inscription impossible')
    } else {
      if (typeof res.walletBalance === 'number') setWalletBalance(res.walletBalance)
      if (res.feePaidFcfa && res.feePaidFcfa > 0) {
        setInfo('Inscrit — ' + res.feePaidFcfa.toLocaleString('fr-FR') + ' FCFA debits')
      } else {
        setInfo('Inscription confirmee')
      }
      setRegs(await getMyRegistrations())
      await refresh()
      await loadDetails(id)
    }
    setBusyId(null)
  }

  async function handleUnregister(id: string) {
    setBusyId(id)
    setError(null)
    setInfo(null)
    const res = await unregisterFromTournament(id)
    if (!res.ok) {
      setError(res.error ?? 'Desinscription impossible')
    } else {
      if (typeof res.walletBalance === 'number') setWalletBalance(res.walletBalance)
      if (res.refundedFcfa && res.refundedFcfa > 0) {
        setInfo('Desinscrit — ' + res.refundedFcfa.toLocaleString('fr-FR') + ' FCFA rembourses')
      } else {
        setInfo('Desinscription confirmee')
      }
      setRegs(await getMyRegistrations())
      await refresh()
      await loadDetails(id)
    }
    setBusyId(null)
  }

  function observeTable(tableId: string) {
    setOnlineSpectate(true)
    setActiveOnlineTableId(tableId)
    onNavigate('onlineGameTable')
  }

  return (
    <ScreenShell bottomPad={28} className="tourney-screen">
      <PageHeader
        title="Tournois"
        subtitle="Competitions · inscrits · lots · spectate"
        left={<BackButton onClick={() => onNavigate('gameMode')} />}
      />

      <AdSlot placement="tournaments-banner" className="tourney-ad" />

      {user && walletBalance !== null && (
        <p className="tourney-wallet">
          Wallet : <strong>{walletBalance.toLocaleString('fr-FR')} FCFA</strong>
        </p>
      )}

      <Segmented
        value={filter}
        onChange={v => setFilter(v as Filter)}
        options={FILTERS.map(f => ({ id: f.id, label: f.label }))}
        className="tourney-filters"
      />

      {error && <AlertBanner tone="error">{error}</AlertBanner>}
      {info && <AlertBanner tone="success">{info}</AlertBanner>}

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
            const open = expandedId === t.id
            const entrants = entrantsById[t.id] ?? []
            const matchTables = tablesById[t.id] ?? []
            const prizes = [...(t.prizes ?? [])].sort((a, b) => a.rank - b.rank)

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

                {prizes.length > 0 && (
                  <div className="tourney-prizes">
                    <p className="tourney-section-label">Lots</p>
                    <ul className="tourney-prizes-list">
                      {prizes.map(p => (
                        <li key={p.rank}>
                          <span className="tourney-prize-rank">#{p.rank}</span>
                          <span className="tourney-prize-label">{p.label}</span>
                          <span className="tourney-prize-amount">
                            {p.amountFcfa.toLocaleString('fr-FR')} FCFA
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

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
                  <UiButton size="sm" variant="ghost" onClick={() => toggleExpand(t.id)}>
                    {open ? (
                      <>
                        <ChevronUp size={14} className="kora-icon" aria-hidden /> Details
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} className="kora-icon" aria-hidden /> Inscrits & tables
                      </>
                    )}
                  </UiButton>
                </div>

                {open && (
                  <div className="tourney-details">
                    {detailLoading === t.id && <p className="tourney-loading">Chargement details...</p>}

                    <div className="tourney-detail-block">
                      <p className="tourney-section-label">
                        Inscrits ({entrants.length || t.registeredCount})
                      </p>
                      {entrants.length === 0 && detailLoading !== t.id ? (
                        <p className="tourney-empty-hint">Personne encore inscrit.</p>
                      ) : (
                        <ul className="tourney-entrants">
                          {entrants.map(e => (
                            <li key={e.userId} className="tourney-entrant">
                              <span className="tourney-entrant-avatar" aria-hidden>
                                {e.avatar?.startsWith('http') || e.avatar?.startsWith('/') ? 'J' : e.avatar || '?'}
                              </span>
                              <span className="tourney-entrant-name">{e.username}</span>
                              {e.feePaidFcfa > 0 && (
                                <span className="tourney-entrant-fee">
                                  {e.feePaidFcfa.toLocaleString('fr-FR')} FCFA
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {t.status === 'completed' && (t.winners?.length ?? 0) > 0 && (
                      <div className="tourney-detail-block">
                        <p className="tourney-section-label">Podium / winners</p>
                        <ul className="tourney-winners">
                          {(t.winners ?? []).map(w => (
                            <li key={w.rank + w.userId} className="tourney-winner">
                              <span className="tourney-prize-rank">#{w.rank}</span>
                              <span className="tourney-entrant-name">{w.username}</span>
                              <span className="tourney-prize-amount">
                                {w.amountFcfa.toLocaleString('fr-FR')} FCFA
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="tourney-detail-block">
                      <p className="tourney-section-label">Tables / matchs</p>
                      {matchTables.length === 0 && detailLoading !== t.id ? (
                        <p className="tourney-empty-hint">
                          Aucune table liee pour l'instant. Les matchs apparaitront ici une fois le
                          tournoi en cours.
                        </p>
                      ) : (
                        <ul className="tourney-matches">
                          {matchTables.map(m => (
                            <li key={m.tableId} className="tourney-match">
                              <div>
                                <span className="font-display tourney-match-code">{m.code}</span>
                                <span className="tourney-match-meta">
                                  {m.status === 'playing' ? 'En jeu' : 'Lobby'} · {m.seatCount}/4 · mise{' '}
                                  {m.baseStake.toLocaleString('fr-FR')}
                                </span>
                              </div>
                              {(m.status === 'playing' || m.status === 'lobby') && (
                                <UiButton size="sm" variant="secondary" onClick={() => observeTable(m.tableId)}>
                                  <Eye size={14} className="kora-icon" aria-hidden /> Observer
                                </UiButton>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </SectionCard>
            )
          })}
        </div>
      )}
    </ScreenShell>
  )
}
