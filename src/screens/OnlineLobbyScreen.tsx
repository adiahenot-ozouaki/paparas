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

  const mySeat = useMemo(
    () => (user ? seats.find(s => s.user_id === user.id) : undefined),
    [seats, user],
  )
  const isHost = Boolean(user && table && table.created_by === user.id)
  const allReady = seats.length >= 2 && seats.every(s => s.is_ready)
  const canStart = isHost && allReady && table?.status === 'lobby'

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
    if (authLoading || !user) return
    let cancelled = false
    ;(async () => {
      const stored = getActiveOnlineTableId()
      if (stored) {
        const t = await fetchTable(stored)
        if (!cancelled && t.table && (t.table.status === 'lobby' || t.table.status === 'playing')) {
          const seatsNow = await fetchSeatsWithProfiles(stored)
          if (seatsNow.seats.some(s => s.user_id === user.id)) {
            if (t.table.status === 'playing') {
              goToTable(stored)
              return
            }
            setTable(t.table)
            setSeats(seatsNow.seats)
            setPhase('table')
            return
          }
        }
      }
      const mine = await findMyActiveTables(user.id)
      if (cancelled || mine.error || mine.tables.length === 0) return
      const preferred = mine.tables.find(x => x.status === 'playing') ?? mine.tables[0]
      if (preferred.status === 'playing') {
        goToTable(preferred.tableId)
        return
      }
      const t = await fetchTable(preferred.tableId)
      const s = await fetchSeatsWithProfiles(preferred.tableId)
      if (!cancelled && t.table) {
        setTable(t.table)
        setSeats(s.seats)
        setPhase('table')
        setActiveOnlineTableId(preferred.tableId)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, goToTable])

  useEffect(() => {
    if (phase !== 'menu') return
    void refreshOpenList()
    const id = setInterval(() => void refreshOpenList(), 5000)
    return () => clearInterval(id)
  }, [phase, refreshOpenList])

  useEffect(() => {
    if (!table?.id) return
    const tableId = table.id
    const channel = supabase
      .channel(`lobby:${tableId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kora_table_players', filter: `table_id=eq.${tableId}` }, () => {
        void refresh(tableId)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kora_tables', filter: `id=eq.${tableId}` }, () => {
        void refresh(tableId)
      })
      .subscribe()
    const poll = setInterval(() => void refresh(tableId), 3000)
    return () => {
      clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [table?.id, refresh])

  useEffect(() => {
    if (!authLoading && !user) onNavigate('auth')
  }, [authLoading, user, onNavigate])

  useEffect(() => {
    if (authLoading || !user || autoJoinDone.current || phase !== 'menu') return
    const tableId = consumePendingJoinTableId()
    if (!tableId) return
    autoJoinDone.current = true
    void (async () => {
      setBusy(true)
      setError(null)
      try {
        const { table: t, error: tErr } = await fetchTable(tableId)
        if (tErr || !t) {
          setError(humanizeError(tErr, 'Table introuvable. Elle a peut‑être été fermée.'))
          setBusy(false)
          return
        }
        if (t.status === 'playing') {
          const seatsNow = await fetchSeatsWithProfiles(t.id)
          if (seatsNow.seats.some(s => s.user_id === user.id)) {
            goToTable(t.id)
            setBusy(false)
            return
          }
          setError('Cette table a déjà démarré.')
          setBusy(false)
          return
        }
        if (t.status !== 'lobby') {
          setError('Cette table n’est plus disponible.')
          setBusy(false)
          return
        }
        const already = (await fetchSeatsWithProfiles(t.id)).seats.find(s => s.user_id === user.id)
        if (!already) {
          const buyIn = Math.min(Math.max(stakeConfig.startingCapital, t.min_buy_in), t.max_buy_in)
          const { error: joinErr } = await joinOnlineTable({ tableId: t.id, userId: user.id, buyIn })
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
    })()
  }, [authLoading, user, phase, goToTable, refresh, stakeConfig.startingCapital])

  async function handleCreate() {
    if (!user) return
    setBusy(true)
    setError(null)
    const variant = deckVariant === '8' ? 'as' : deckVariant
    const { table: created, error: createErr } = await createOnlineTable({
      userId: user.id,
      baseStake: stakeConfig.baseStake,
      startingCapital: stakeConfig.startingCapital,
      deckVariant: variant as '9' | '10' | 'as',
      minBuyIn: stakeConfig.startingCapital,
      maxBuyIn: stakeConfig.startingCapital * 3,
    })
    if (createErr || !created) {
      setError(humanizeError(createErr, 'Impossible de créer la table.'))
      setBusy(false)
      return
    }
    const { error: joinErr } = await joinOnlineTable({
      tableId: created.id,
      userId: user.id,
      buyIn: stakeConfig.startingCapital,
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
        setError(humanizeError(tErr, 'Table introuvable. Elle a peut‑être été fermée.'))
        setBusy(false)
        return
      }
      if (t.status === 'playing') {
        const seatsNow = await fetchSeatsWithProfiles(t.id)
        if (seatsNow.seats.find(s => s.user_id === user.id)) {
          goToTable(t.id)
          setBusy(false)
          return
        }
        setError('Cette table a déjà démarré.')
        setBusy(false)
        return
      }
      if (t.status !== 'lobby') {
        setError('Cette table n’est plus disponible.')
        setBusy(false)
        return
      }
      const already = (await fetchSeatsWithProfiles(t.id)).seats.find(s => s.user_id === user.id)
      if (!already) {
        const buyIn = Math.min(Math.max(stakeConfig.startingCapital, t.min_buy_in), t.max_buy_in)
        const { error: joinErr } = await joinOnlineTable({ tableId: t.id, userId: user.id, buyIn })
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

  async function handleJoin() {
    if (!user) return
    const raw = joinCode.trim()
    if (!raw) {
      setError('Entrez le code ou l’UUID de la table.')
      return
    }
    setBusy(true)
    setError(null)
    let tableId = raw
    try {
      if (!raw.includes('-') && raw.length <= 12) {
        const { data, error } = await supabase.from('kora_tables').select('id, status').eq('status', 'lobby').limit(40)
        if (error) {
          setError(humanizeError(error.message, 'Recherche de table impossible.'))
          setBusy(false)
          return
        }
        const match = (data ?? []).find(t => tableInviteCode(t.id) === raw.toUpperCase().replace(/-/g, ''))
        if (!match) {
          setError('Aucune table en lobby avec ce code. Vérifiez le code ou choisissez une table ouverte.')
          setBusy(false)
          return
        }
        tableId = match.id
      }
    } catch (e) {
      setError(humanizeError(e instanceof Error ? e.message : String(e)))
      setBusy(false)
      return
    }
    setBusy(false)
    await handleJoinById(tableId)
  }

  async function handleToggleReady() {
    if (!user || !table || !mySeat) return
    setBusy(true)
    setError(null)
    const { error: e } = await setSeatReady(table.id, user.id, !mySeat.is_ready)
    if (e) setError(humanizeError(e, 'Impossible de changer le statut prêt.'))
    await refresh(table.id)
    setBusy(false)
  }

  async function handleStart() {
    if (!table) return
    setBusy(true)
    setError(null)
    const { ok, body } = await callEngine('start_table', table.id)
    if (!ok) {
      setError(humanizeError(String(body.error ?? ''), 'Impossible de démarrer la table.'))
      setBusy(false)
      return
    }
    setActiveOnlineTableId(table.id)
    setBusy(false)
    onNavigate('onlineGameTable')
  }

  async function handleLeave() {
    if (!table) {
      setPhase('menu')
      return
    }
    setBusy(true)
    await callEngine('leave_table', table.id)
    setActiveOnlineTableId(null)
    setTable(null)
    setSeats([])
    setPhase('menu')
    setBusy(false)
    void refreshOpenList()
  }

  if (authLoading || !user) {
    return (
      <div className="online-lobby-loading">
        <span className="online-lobby-loading-text">Connexion…</span>
      </div>
    )
  }

  return (
    <div className="online-lobby-screen">
      <div className="pattern-african online-lobby-pattern" />
      <div className="online-lobby-header">
        <BackButton
          absolute={false}
          onClick={() => (phase === 'table' ? void handleLeave() : onNavigate('gameMode'))}
        />
        <h1 className="font-display online-lobby-title">
          {phase === 'menu' ? 'Table en ligne' : 'Lobby privé'}
        </h1>
        <p className="online-lobby-sub">
          {profile?.username ? `Connecté : ${profile.username}` : user.email}
        </p>
      </div>

      <div className="online-lobby-body">
        {error && (
          <div role="alert" className="online-lobby-error">
            <p className="online-lobby-error-text">{error}</p>
            <button type="button" onClick={() => setError(null)} className="online-lobby-error-dismiss">
              Fermer
            </button>
          </div>
        )}

        {phase === 'menu' && (
          <div className="online-lobby-stack">
            <div className="online-lobby-card">
              <p className="online-lobby-card-meta">
                Mise {stakeConfig.baseStake.toLocaleString('fr-FR')} · Capital{' '}
                {stakeConfig.startingCapital.toLocaleString('fr-FR')} FCFA · {deckVariant}
              </p>
              <button
                className="btn-primary glow-gold online-lobby-btn-block"
                disabled={busy}
                onClick={() => void handleCreate()}
              >
                Créer une table privée
              </button>
              <button
                className="btn-secondary online-lobby-btn-block online-lobby-btn-block--sm"
                onClick={() => onNavigate('stakeConfig')}
              >
                Modifier mise / capital
              </button>
            </div>

            <div className="online-lobby-card">
              <p className="font-display online-lobby-card-title">Rejoindre avec un code</p>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="Code (8 car.) ou UUID"
                className="online-lobby-input"
              />
              <button
                className="btn-primary online-lobby-btn-block"
                disabled={busy}
                onClick={() => void handleJoin()}
              >
                Rejoindre
              </button>
            </div>

            <div>
              <p className="font-display online-lobby-card-title">Tables ouvertes</p>
              {listError && (
                <div className="online-lobby-list-error">
                  <p className="online-lobby-list-error-text">{listError}</p>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() => void refreshOpenList()}
                    style={{ padding: '8px 12px', fontSize: 12, borderRadius: 10 }}
                  >
                    Réessayer
                  </button>
                </div>
              )}
              {openTables.length === 0 && !listError ? (
                <p className="online-lobby-empty">Aucune table en lobby pour l’instant.</p>
              ) : openTables.length === 0 ? null : (
                <div className="online-lobby-open-list">
                  {openTables.map(t => (
                    <button
                      key={t.table.id}
                      disabled={busy}
                      onClick={() => void handleJoinById(t.table.id)}
                      className="online-lobby-open-item"
                    >
                      <div>
                        <p className="font-display online-lobby-open-code">{t.code}</p>
                        <p className="online-lobby-open-meta">
                          Mise {t.table.base_stake.toLocaleString('fr-FR')} · {t.seatCount}/4
                        </p>
                      </div>
                      <span className="online-lobby-open-cta">S’asseoir →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'table' && table && (
          <div className="online-lobby-table-panel">
            <div className="online-lobby-invite">
              <p className="online-lobby-invite-label">Code d’invitation</p>
              <p className="font-display online-lobby-invite-code">{tableInviteCode(table.id)}</p>
            </div>

            <div className="online-lobby-seats">
              {[0, 1, 2, 3].map(i => {
                const seat = seats.find(s => s.seat_index === i)
                const isYou = Boolean(seat && user && seat.user_id === user.id)
                return (
                  <div key={i} className={`online-lobby-seat${isYou ? ' is-you' : ''}`}>
                    <div className="online-lobby-seat-avatar">
                      {seat?.profile?.avatar ?? '∅'}
                    </div>
                    <div className="online-lobby-seat-meta">
                      <p className="font-display online-lobby-seat-name">
                        {seat ? seat.profile?.username ?? 'Joueur' : `Siège ${i + 1} libre`}
                        {isYou ? ' (vous)' : ''}
                      </p>
                      {seat && (
                        <p className="online-lobby-seat-cap">
                          {seat.capital.toLocaleString('fr-FR')} FCFA
                        </p>
                      )}
                    </div>
                    {seat && (
                      <span className={`online-lobby-seat-status${seat.is_ready ? ' is-ready' : ''}`}>
                        {seat.is_ready ? 'Prêt' : 'Attente'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="online-lobby-actions">
              {mySeat && table.status === 'lobby' && (
                <button
                  className="btn-primary glow-gold online-lobby-action-primary"
                  disabled={busy}
                  onClick={() => void handleToggleReady()}
                >
                  {mySeat.is_ready ? '↩ Annuler prêt' : '✓  PRÊT'}
                </button>
              )}
              {canStart && (
                <button
                  className="btn-primary online-lobby-action-primary"
                  disabled={busy}
                  onClick={() => void handleStart()}
                >
                  LANCER LA TABLE →
                </button>
              )}
              {!canStart && isHost && table.status === 'lobby' && (
                <p className="online-lobby-wait-hint">
                  Il faut ≥ 2 joueurs, tous prêts, pour démarrer.
                </p>
              )}
              <button
                className="btn-secondary online-lobby-action-secondary"
                disabled={busy}
                onClick={() => void handleLeave()}
              >
                Quitter la table
              </button>
            </div>
          </div>
        )}
      </div>

      {phase === 'table' && table?.id && (
        <TableChat
          tableId={table.id}
          myUserId={user?.id ?? null}
          title="Discussion lobby"
        />
      )}
    </div>
  )
}
