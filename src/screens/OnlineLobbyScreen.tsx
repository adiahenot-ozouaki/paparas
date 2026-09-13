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
import { getActiveOnlineTableId, setActiveOnlineTableId, consumePendingJoinCode } from '../lib/online/session'
import { humanizeError } from '../lib/online/errors'
import { supabase } from '../lib/supabase/client'
import { TableChat } from '../components/game/TableChat'
import type { KoraTable } from '../lib/supabase/database.types'

type Phase = 'menu' | 'table'

export default function OnlineLobbyScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { user, isLoading: authLoading, profile, refreshProfile } = useAuth()
  const { stakeConfig, deckVariant } = useGame()

  const [phase, setPhase] = useState<Phase>('menu')
  const [table, setTable] = useState<KoraTable | null>(null)
  const [seats, setSeats] = useState<SeatWithProfile[]>([])
  const [openList, setOpenList] = useState<OpenLobbyTable[]>([])
  const [joinCode, setJoinCode] = useState(() => consumePendingJoinCode() ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const autoJoinDone = useRef(false)

  const isHost = Boolean(user && table && table.created_by === user.id)
  const mySeat = seats.find(s => s.user_id === user?.id)
  const allReady = seats.length >= 2 && seats.every(s => s.is_ready)
  const inviteCode = table ? tableInviteCode(table.id) : ''

  const refresh = useCallback(async (tableId: string) => {
    const [t, s] = await Promise.all([fetchTable(tableId), fetchSeatsWithProfiles(tableId)])
    if (t.table) setTable(t.table)
    if (!s.error) setSeats(s.seats)
    return { table: t.table, seats: s.seats }
  }, [])

  const refreshOpenList = useCallback(async () => {
    const { tables } = await listOpenLobbyTables()
    setOpenList(tables)
  }, [])

  const goToTable = useCallback(() => {
    onNavigate('onlineGame')
  }, [onNavigate])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      onNavigate('auth')
      return
    }
    void refreshProfile()
  }, [authLoading, user, onNavigate, refreshProfile])

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
    if (table?.status === 'playing' && mySeat) {
      goToTable()
    }
  }, [table?.status, mySeat, goToTable])

  useEffect(() => {
    if (authLoading || !user || autoJoinDone.current || phase !== 'menu') return
    autoJoinDone.current = true
    ;(async () => {
      const { tables } = await findMyActiveTables(user.id)
      if (tables.length > 0) {
        const active = tables[0]
        setActiveOnlineTableId(active.tableId)
        if (active.status === 'playing') {
          goToTable()
          return
        }
        await refresh(active.tableId)
        setPhase('table')
        return
      }
      const pending = joinCode.trim()
      if (pending.length >= 6) {
        setBusy(true)
        try {
          const { tables: open } = await listOpenLobbyTables(30)
          const t = open.find(o => tableInviteCode(o.table.id) === pending.toUpperCase() || o.table.id.startsWith(pending))
          if (!t) {
            setError('Code introuvable ou table complete.')
            setBusy(false)
            return
          }
          const { error: joinErr } = await joinOnlineTable({
            tableId: t.table.id,
            userId: user.id,
            buyIn: t.table.starting_capital,
          })
          if (joinErr) {
            setError(humanizeError(joinErr, 'Impossible de rejoindre la table.'))
            setBusy(false)
            return
          }
          setActiveOnlineTableId(t.table.id)
          await refresh(t.table.id)
          setPhase('table')
        } catch (e) {
          setError(humanizeError(e instanceof Error ? e.message : String(e)))
        }
        setBusy(false)
      }
    })()
  }, [authLoading, user, phase, goToTable, refresh, joinCode])

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
      const { tables: open } = await listOpenLobbyTables(40)
      const upper = raw.toUpperCase()
      const match =
        open.find(o => tableInviteCode(o.table.id) === upper) ||
        open.find(o => o.table.id.replace(/-/g, '').toUpperCase().startsWith(upper))
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

  async function handleStart() {
    if (!table || !isHost || !allReady) return
    setStarting(true)
    setError(null)
    const { ok, body } = await callEngine('start_table', table.id)
    if (!ok) {
      setError(humanizeError(body.error != null ? String(body.error) : undefined, 'Demarrage refuse.'))
      setStarting(false)
      return
    }
    goToTable()
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
    void refreshOpenList()
  }

  if (authLoading || !user) {
    return (
      <div className="felt-bg online-lobby-screen">
        <span className="table-loading-text">Chargement...</span>
      </div>
    )
  }

  return (
    <div className="felt-bg online-lobby-screen">
      <div className="online-lobby-inner">
        <header className="online-lobby-header">
          <BackButton
            onClick={() => (phase === 'table' ? void handleLeave() : onNavigate('gameMode'))}
          />
          <h1 className="font-display online-lobby-title">
            {phase === 'menu' ? 'Table en ligne' : 'Lobby prive'}
          </h1>
          {profile && (
            <p className="online-lobby-wallet">
              Wallet {profile.wallet_balance.toLocaleString('fr-FR')} FCFA
            </p>
          )}
        </header>

        {error && (
          <div role="alert" className="online-error-toast" onClick={() => setError(null)}>
            {error}
          </div>
        )}

        {phase === 'menu' && (
          <>
            <section className="online-lobby-section">
              <h2 className="font-display online-lobby-section-title">Creer une table</h2>
              <p className="online-lobby-hint">
                Mise {stakeConfig.baseStake.toLocaleString('fr-FR')} FCFA
                {' '}· capital {(stakeConfig.baseStake * 10).toLocaleString('fr-FR')} FCFA
              </p>
              <button type="button" className="btn-primary online-lobby-cta" disabled={busy} onClick={() => void handleCreate()}>
                {busy ? '...' : 'Creer une table privee'}
              </button>
            </section>

            <section className="online-lobby-section">
              <h2 className="font-display online-lobby-section-title">Rejoindre avec un code</h2>
              <div className="online-lobby-join-row">
                <input
                  className="online-lobby-input"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  placeholder="Code table"
                  maxLength={12}
                />
                <button type="button" className="btn-primary" disabled={busy} onClick={() => void handleJoinByCode()}>
                  Rejoindre
                </button>
              </div>
            </section>

            <section className="online-lobby-section">
              <h2 className="font-display online-lobby-section-title">Tables ouvertes</h2>
              {openList.length === 0 ? (
                <p className="online-lobby-hint">Aucune table en lobby pour le moment.</p>
              ) : (
                <ul className="online-lobby-list">
                  {openList.map(t => (
                    <li key={t.table.id}>
                      <button
                        type="button"
                        className="online-lobby-list-item"
                        disabled={busy}
                        onClick={() => void handleJoinById(t.table.id)}
                      >
                        <span className="font-display">{t.code}</span>
                        <span>
                          {t.seatCount}/4 · mise {t.table.base_stake.toLocaleString('fr-FR')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {phase === 'table' && table && (
          <section className="online-lobby-section online-lobby-table-phase">
            <p className="online-lobby-hint">
              Code <strong className="text-gold">{inviteCode}</strong>
            </p>
            <p className="online-lobby-hint">
              Statut {table.status} · {seats.length}/4 joueurs · mise {table.base_stake.toLocaleString('fr-FR')}
            </p>
            <ul className="online-lobby-seats">
              {seats.map(s => (
                <li key={s.user_id}>
                  {s.profile?.username ?? 'Joueur'} · siege {s.seat_index + 1}
                  {s.is_ready ? ' · pret' : ''}
                  {s.user_id === user.id ? ' (vous)' : ''}
                </li>
              ))}
            </ul>
            <div className="online-lobby-actions">
              {mySeat && table.status === 'lobby' && (
                <button type="button" className="btn-primary" disabled={busy} onClick={() => void handleToggleReady()}>
                  {mySeat.is_ready ? 'Pas pret' : 'Je suis pret'}
                </button>
              )}
              {isHost && table.status === 'lobby' && (
                <button type="button" className="btn-primary glow-gold" disabled={!allReady || starting} onClick={() => void handleStart()}>
                  {starting ? 'Demarrage...' : 'Demarrer la partie'}
                </button>
              )}
              <button type="button" className="online-lobby-leave" disabled={busy} onClick={() => void handleLeave()}>
                Quitter le lobby
              </button>
            </div>
            <TableChat tableId={table.id} myUserId={user?.id ?? null} title="Discussion lobby" />
          </section>
        )}
      </div>
    </div>
  )
}
