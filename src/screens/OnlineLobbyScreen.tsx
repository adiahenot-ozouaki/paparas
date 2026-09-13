import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Screen } from '../types'
import { BackButton } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { useGame } from '../game/GameContext'
import {
  callEngine,
  createOnlineTable,
  fetchSeatsWithProfiles,
  fetchTable,
  findMyActiveTables,
  joinOnlineTable,
  listOpenLobbyTables,
  setSeatReady,
  tableInviteCode,
  type OpenLobbyTable,
  type SeatWithProfile,
} from '../lib/online/api'
import {
  consumePendingJoinCode,
  consumePendingJoinTableId,
  getActiveOnlineTableId,
  setActiveOnlineTableId,
} from '../lib/online/session'
import { humanizeError } from '../lib/online/errors'
import { TableChat } from '../components/game/TableChat'
import { supabase } from '../lib/supabase/client'
import type { KoraTable } from '../lib/supabase/database.types'

type Phase = 'menu' | 'table'

export default function OnlineLobbyScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { user, profile, isLoading: authLoading } = useAuth()
  const { stakeConfig, deckVariant } = useGame()

  const [phase, setPhase] = useState<Phase>('menu')
  const [table, setTable] = useState<KoraTable | null>(null)
  const [seats, setSeats] = useState<SeatWithProfile[]>([])
  const [joinCode, setJoinCode] = useState(() => consumePendingJoinCode() ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openTables, setOpenTables] = useState<OpenLobbyTable[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const autoJoinDone = useRef(false)
  const autoStartLock = useRef(false)

  const mySeat = useMemo(
    () => (user ? seats.find(s => s.user_id === user.id) : undefined),
    [seats, user],
  )
  const allReady = seats.length >= 2 && seats.every(s => s.is_ready)
  const canStart = allReady && table?.status === 'lobby'

  const goToTable = useCallback(
    (tableId: string) => {
      setActiveOnlineTableId(tableId)
      onNavigate('onlineGameTable')
    },
    [onNavigate],
  )

  const refresh = useCallback(
    async (tableId: string) => {
      const [t, s] = await Promise.all([fetchTable(tableId), fetchSeatsWithProfiles(tableId)])
      if (t.table) setTable(t.table)
      if (!s.error) setSeats(s.seats)
      if (t.table?.status === 'playing') goToTable(tableId)
    },
    [goToTable],
  )

  const refreshOpenList = useCallback(async () => {
    try {
      const open = await listOpenLobbyTables(10)
      if (open.error) setListError(humanizeError(open.error, 'Impossible de charger les tables ouvertes.'))
      else {
        setListError(null)
        setOpenTables(open.tables)
      }
    } catch (e) {
      setListError(humanizeError(e instanceof Error ? e.message : String(e)))
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      onNavigate('auth')
      return
    }
  }, [authLoading, user, onNavigate])

  useEffect(() => {
    if (phase !== 'menu') return
    void refreshOpenList()
    const id = setInterval(() => void refreshOpenList(), 5000)
    return () => clearInterval(id)
  }, [phase, refreshOpenList])

  useEffect(() => {
    if (!table || phase !== 'table') return
    const channel = supabase
      .channel('lobby:' + table.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kora_table_players', filter: 'table_id=eq.' + table.id },
        () => {
          void refresh(table.id)
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kora_tables', filter: 'id=eq.' + table.id },
        () => {
          void refresh(table.id)
        },
      )
      .subscribe()
    const poll = setInterval(() => void refresh(table.id), 2000)
    return () => {
      clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [table?.id, phase, refresh])

  useEffect(() => {
    if (!canStart || !table || busy || autoStartLock.current) return
    if (table.status !== 'lobby') return
    autoStartLock.current = true
    void (async () => {
      try {
        const { ok, body } = await callEngine('start_table', table.id)
        if (!ok) {
          setError(humanizeError(body.error != null ? String(body.error) : undefined, 'Demarrage refuse.'))
          autoStartLock.current = false
          return
        }
        goToTable(table.id)
      } catch (e) {
        setError(humanizeError(e instanceof Error ? e.message : String(e)))
        autoStartLock.current = false
      }
    })()
  }, [canStart, table, busy, goToTable])

  useEffect(() => {
    if (authLoading || !user || autoJoinDone.current || phase !== 'menu') return
    autoJoinDone.current = true
    ;(async () => {
      const activeId = getActiveOnlineTableId()
      const pendingTableId = consumePendingJoinTableId()
      const { tables } = await findMyActiveTables(user.id)
      if (tables.length > 0) {
        const active = tables.find(t => t.tableId === activeId) ?? tables[0]
        setActiveOnlineTableId(active.tableId)
        if (active.status === 'playing') {
          goToTable(active.tableId)
          return
        }
        await refresh(active.tableId)
        setPhase('table')
        return
      }
      if (pendingTableId) {
        setBusy(true)
        try {
          const { table: t, error: tErr } = await fetchTable(pendingTableId)
          if (tErr || !t || t.status !== 'lobby') {
            setError(humanizeError(tErr, 'Table introuvable ou deja demarree.'))
            setBusy(false)
            return
          }
          const { error: joinErr } = await joinOnlineTable({
            tableId: t.id,
            userId: user.id,
            buyIn: t.starting_capital,
          })
          if (joinErr) {
            setError(humanizeError(joinErr, 'Impossible de rejoindre la table.'))
            setBusy(false)
            return
          }
          setActiveOnlineTableId(t.id)
          await refresh(t.id)
          setPhase('table')
        } catch (e) {
          setError(humanizeError(e instanceof Error ? e.message : String(e)))
        }
        setBusy(false)
      }
    })()
  }, [authLoading, user, phase, goToTable, refresh])

  async function handleMatchmake() {
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      const open = await listOpenLobbyTables(40)
      const stake = stakeConfig.baseStake
      const candidates = (open.tables ?? []).filter(
        t => t.table.base_stake === stake && t.seatCount < 4 && t.table.status === 'lobby',
      )
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.seatCount - a.seatCount)
        const tid = candidates[0].table.id
        await handleJoinById(tid)
        await setSeatReady(tid, user.id, true)
        await refresh(tid)
        setBusy(false)
        return
      }
      await handleCreate()
      const active = getActiveOnlineTableId()
      if (active) {
        await setSeatReady(active, user.id, true)
        await refresh(active)
      }
    } catch (e) {
      setError(humanizeError(e instanceof Error ? e.message : String(e)))
      setBusy(false)
    }
  }

  async function handleCreate() {
    if (!user) return
    setBusy(true)
    setError(null)
    const variant = deckVariant === '8' ? 'as' : deckVariant
    const tableCapital = stakeConfig.baseStake * 10
    const { table: created, error: createErr } = await createOnlineTable({
      userId: user.id,
      baseStake: stakeConfig.baseStake,
      startingCapital: tableCapital,
      deckVariant: variant as '9' | '10' | 'as',
      minBuyIn: tableCapital,
      maxBuyIn: tableCapital,
    })
    if (createErr || !created) {
      setError(humanizeError(createErr, 'Impossible de creer la table.'))
      setBusy(false)
      return
    }
    const { error: joinErr } = await joinOnlineTable({
      tableId: created.id,
      userId: user.id,
      buyIn: tableCapital,
      preferredSeat: 0,
    })
    if (joinErr) {
      setError(humanizeError(joinErr, 'Impossible de rejoindre la table.'))
      setBusy(false)
      return
    }
    setActiveOnlineTableId(created.id)
    setTable(created)
    await refresh(created.id)
    setPhase('table')
    setBusy(false)
  }

  async function handleJoinById(tableId: string) {
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      const { table: t, error: tErr } = await fetchTable(tableId)
      if (tErr || !t) {
        setError(humanizeError(tErr, 'Table introuvable.'))
        setBusy(false)
        return
      }
      if (t.status === 'playing') {
        setError('Cette table a deja demarre.')
        setBusy(false)
        return
      }
      if (t.status !== 'lobby') {
        setError('Cette table n est plus disponible.')
        setBusy(false)
        return
      }
      const already = (await fetchSeatsWithProfiles(t.id)).seats.find(s => s.user_id === user.id)
      if (!already) {
        const { error: joinErr } = await joinOnlineTable({
          tableId: t.id,
          userId: user.id,
          buyIn: t.starting_capital,
        })
        if (joinErr) {
          setError(humanizeError(joinErr, 'Impossible de rejoindre la table.'))
          setBusy(false)
          return
        }
      }
      setActiveOnlineTableId(t.id)
      setTable(t)
      await refresh(t.id)
      setPhase('table')
    } catch (e) {
      setError(humanizeError(e instanceof Error ? e.message : String(e)))
    }
    setBusy(false)
  }

  async function handleJoinByCode() {
    const raw = joinCode.trim()
    if (raw.length < 6) {
      setError('Indiquez un code de table (au moins 6 caracteres).')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const open = await listOpenLobbyTables(40)
      const upper = raw.toUpperCase()
      const match =
        open.tables.find(o => tableInviteCode(o.table.id) === upper) ||
        open.tables.find(o => o.table.id.replace(/-/g, '').toUpperCase().startsWith(upper))
      if (!match) {
        setError('Code introuvable ou table complete.')
        setBusy(false)
        return
      }
      await handleJoinById(match.table.id)
    } catch (e) {
      setError(humanizeError(e instanceof Error ? e.message : String(e)))
      setBusy(false)
    }
  }

  async function handleToggleReady() {
    if (!user || !table || !mySeat) return
    setBusy(true)
    const { error: err } = await setSeatReady(table.id, user.id, !mySeat.is_ready)
    if (err) setError(humanizeError(err))
    await refresh(table.id)
    setBusy(false)
  }

  async function handleLeave() {
    if (!table || !user) {
      setPhase('menu')
      setActiveOnlineTableId(null)
      return
    }
    setBusy(true)
    try {
      if (table.status === 'lobby') {
        await supabase.from('kora_table_players').delete().eq('table_id', table.id).eq('user_id', user.id)
        const left = await fetchSeatsWithProfiles(table.id)
        if (left.seats.length === 0) {
          await supabase.from('kora_tables').delete().eq('id', table.id)
        }
      } else {
        await callEngine('leave_table', table.id)
      }
    } catch {
      /* ignore */
    }
    setActiveOnlineTableId(null)
    setTable(null)
    setSeats([])
    setPhase('menu')
    setBusy(false)
    autoStartLock.current = false
    void refreshOpenList()
  }

  const inviteCode = table ? tableInviteCode(table.id) : ''

  if (authLoading || !user) {
    return (
      <div className="online-lobby-screen">
        <div className="online-lobby-loading">
          <span className="online-lobby-loading-text">Chargement…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="online-lobby-screen">
      <div className="online-lobby-pattern" aria-hidden />
      <header className="online-lobby-header">
        <BackButton
          onClick={() => (phase === 'table' ? void handleLeave() : onNavigate('gameMode'))}
        />
        <h1 className="font-display online-lobby-title">
          {phase === 'menu' ? 'En ligne' : 'Lobby'}
        </h1>
        <p className="online-lobby-sub">
          {phase === 'menu'
            ? `Mise ${stakeConfig.baseStake.toLocaleString('fr-FR')} FCFA · démarrage auto à 2 joueurs prêts`
            : table
              ? `Mise ${table.base_stake.toLocaleString('fr-FR')} FCFA · ${seats.length}/4 places`
              : 'Préparation de la table…'}
        </p>
        {profile && phase === 'menu' && (
          <p className="online-lobby-sub" style={{ marginTop: 6 }}>
            Wallet · {profile.wallet_balance.toLocaleString('fr-FR')} FCFA
          </p>
        )}
      </header>

      <div className="online-lobby-body">
        {error && (
          <div className="online-lobby-error" role="alert">
            <p className="online-lobby-error-text">{error}</p>
            <button type="button" className="online-lobby-error-dismiss" onClick={() => setError(null)}>
              Fermer
            </button>
          </div>
        )}

        {phase === 'menu' && (
          <div className="online-lobby-stack">
            <section className="online-lobby-card">
              <p className="online-lobby-card-meta">MATCHMAKING</p>
              <h2 className="online-lobby-card-title">Trouver une partie</h2>
              <p className="online-lobby-sub" style={{ marginBottom: 12 }}>
                Rejoint une table à ta mise ou en crée une. Prêt automatique.
              </p>
              <button
                type="button"
                className="btn-primary glow-gold online-lobby-btn-block"
                disabled={busy}
                onClick={() => void handleMatchmake()}
              >
                {busy ? 'Recherche…' : 'Trouver une partie'}
              </button>
              <button
                type="button"
                className="btn-primary online-lobby-btn-block online-lobby-btn-block--sm"
                disabled={busy}
                onClick={() => void handleCreate()}
              >
                Créer une table privée
              </button>
            </section>

            <section className="online-lobby-card">
              <p className="online-lobby-card-meta">CODE D'INVITATION</p>
              <h2 className="online-lobby-card-title">Rejoindre avec un code</h2>
              <input
                className="online-lobby-input"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Ex. A1B2C3D4"
                maxLength={12}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="btn-primary online-lobby-btn-block online-lobby-btn-block--sm"
                disabled={busy || joinCode.trim().length < 6}
                onClick={() => void handleJoinByCode()}
              >
                Rejoindre
              </button>
            </section>

            <section className="online-lobby-card">
              <p className="online-lobby-card-meta">TABLES OUVERTES</p>
              <h2 className="online-lobby-card-title">Lobbys publics</h2>
              {listError && (
                <div className="online-lobby-list-error">
                  <p className="online-lobby-list-error-text">{listError}</p>
                </div>
              )}
              {openTables.length === 0 && !listError ? (
                <p className="online-lobby-empty">Aucune table en attente. Lance une recherche ou crée la tienne.</p>
              ) : (
                <ul className="online-lobby-open-list">
                  {openTables.map(t => (
                    <li key={t.table.id}>
                      <button
                        type="button"
                        className="online-lobby-open-item"
                        disabled={busy}
                        onClick={() => void handleJoinById(t.table.id)}
                      >
                        <div>
                          <p className="online-lobby-open-code font-display">{t.code}</p>
                          <p className="online-lobby-open-meta">
                            {t.seatCount}/4 joueurs · mise {t.table.base_stake.toLocaleString('fr-FR')} FCFA
                          </p>
                        </div>
                        <span className="online-lobby-open-cta">Rejoindre →</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {phase === 'table' && table && (
          <div className="online-lobby-table-panel">
            <div className="online-lobby-invite">
              <p className="online-lobby-invite-label">Code table</p>
              <p className="font-display online-lobby-invite-code">{inviteCode}</p>
              <p className="online-lobby-sub" style={{ marginTop: 8 }}>
                Partage ce code pour inviter des amis
              </p>
            </div>

            <div className="online-lobby-seats" role="list">
              {[0, 1, 2, 3].map(seatIdx => {
                const s = seats.find(x => x.seat_index === seatIdx)
                const isYou = Boolean(s && user && s.user_id === user.id)
                return (
                  <div
                    key={seatIdx}
                    role="listitem"
                    className={'online-lobby-seat' + (isYou ? ' is-you' : '')}
                  >
                    <div className="online-lobby-seat-avatar" aria-hidden>
                      {s ? (s.profile?.username?.[0]?.toUpperCase() ?? '?') : '·'}
                    </div>
                    <div className="online-lobby-seat-meta">
                      <p className="online-lobby-seat-name">
                        {s
                          ? (s.profile?.username ?? 'Joueur') + (isYou ? ' (vous)' : '')
                          : `Siège ${seatIdx + 1}`}
                      </p>
                      <p className="online-lobby-seat-cap">
                        {s ? `Place ${seatIdx + 1}` : 'En attente…'}
                      </p>
                    </div>
                    <span className={'online-lobby-seat-status' + (s?.is_ready ? ' is-ready' : '')}>
                      {!s ? 'Libre' : s.is_ready ? 'Prêt' : 'Pas prêt'}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="online-lobby-actions">
              {mySeat && table.status === 'lobby' && (
                <button
                  type="button"
                  className="btn-primary glow-gold online-lobby-action-primary"
                  disabled={busy}
                  onClick={() => void handleToggleReady()}
                >
                  {mySeat.is_ready ? 'Annuler — pas prêt' : 'Je suis prêt'}
                </button>
              )}
              {table.status === 'lobby' && seats.length < 2 && (
                <p className="online-lobby-wait-hint">En attente d'au moins un autre joueur…</p>
              )}
              {table.status === 'lobby' && seats.length >= 2 && !allReady && (
                <p className="online-lobby-wait-hint">En attente que tout le monde soit prêt…</p>
              )}
              {canStart && (
                <p className="online-lobby-wait-hint" style={{ color: '#d6a84f' }}>
                  Lancement automatique…
                </p>
              )}
              <button
                type="button"
                className="online-lobby-action-secondary online-lobby-leave"
                disabled={busy}
                onClick={() => void handleLeave()}
              >
                Quitter le lobby
              </button>
            </div>

            <TableChat tableId={table.id} myUserId={user?.id ?? null} title="Discussion" />
          </div>
        )}
      </div>
    </div>
  )
}
