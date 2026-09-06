import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Screen } from '../types'
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

  // Join auto depuis GameMode (Tables ouvertes → tableId, sans ressaisir le code)
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
      <div style={{ position: 'absolute', inset: 0, background: '#0B0D10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#A9B0B7' }}>Connexion…</span>
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0B0D10', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="pattern-african" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />
      <div style={{ padding: '20px 20px 0', position: 'relative' }}>
        <button
          onClick={() => (phase === 'table' ? void handleLeave() : onNavigate('gameMode'))}
          aria-label="Retour"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            width: 40,
            height: 40,
            color: '#fff',
            fontSize: 18,
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          ←
        </button>
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>
          {phase === 'menu' ? 'Table en ligne' : 'Lobby privé'}
        </h1>
        <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>
          {profile?.username ? `Connecté : ${profile.username}` : user.email}
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', position: 'relative' }}>
        {error && (
          <div
            role="alert"
            style={{
              background: 'rgba(201,75,75,0.12)',
              border: '1px solid rgba(201,75,75,0.35)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 16,
            }}
          >
            <p style={{ color: '#E8A0A0', fontSize: 13, margin: '0 0 8px', lineHeight: 1.45 }}>{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(201,75,75,0.4)',
                borderRadius: 8,
                color: '#E8A0A0',
                fontSize: 11,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </div>
        )}

        {phase === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420, margin: '0 auto' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
              <p style={{ color: '#A9B0B7', fontSize: 12, margin: '0 0 8px' }}>
                Mise {stakeConfig.baseStake.toLocaleString('fr-FR')} · Capital {stakeConfig.startingCapital.toLocaleString('fr-FR')} FCFA ·{' '}
                {deckVariant}
              </p>
              <button className="btn-primary glow-gold" disabled={busy} onClick={() => void handleCreate()} style={{ width: '100%', padding: 14, borderRadius: 14, fontSize: 14 }}>
                Créer une table privée
              </button>
              <button className="btn-secondary" onClick={() => onNavigate('stakeConfig')} style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 13, marginTop: 10 }}>
                Modifier mise / capital
              </button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
              <p className="font-display" style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>
                Rejoindre avec un code
              </p>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="Code (8 car.) ou UUID"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: 14,
                  marginBottom: 10,
                }}
              />
              <button className="btn-primary" disabled={busy} onClick={() => void handleJoin()} style={{ width: '100%', padding: 14, borderRadius: 14, fontSize: 14 }}>
                Rejoindre
              </button>
            </div>

            <div>
              <p className="font-display" style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>
                Tables ouvertes
              </p>
              {listError && (
                <div style={{ background: 'rgba(201,75,75,0.1)', border: '1px solid rgba(201,75,75,0.3)', borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
                  <p style={{ color: '#E8A0A0', fontSize: 12, margin: '0 0 8px' }}>{listError}</p>
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => void refreshOpenList()} style={{ padding: '8px 12px', fontSize: 12, borderRadius: 10 }}>
                    Réessayer
                  </button>
                </div>
              )}
              {openTables.length === 0 && !listError ? (
                <p style={{ color: '#5b636b', fontSize: 12, margin: 0 }}>Aucune table en lobby pour l’instant.</p>
              ) : openTables.length === 0 ? null : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {openTables.map(t => (
                    <button
                      key={t.table.id}
                      disabled={busy}
                      onClick={() => void handleJoinById(t.table.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <p className="font-display" style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>
                          {t.code}
                        </p>
                        <p style={{ color: '#A9B0B7', fontSize: 11, margin: '2px 0 0' }}>
                          Mise {t.table.base_stake.toLocaleString('fr-FR')} · {t.seatCount}/4
                        </p>
                      </div>
                      <span style={{ color: '#D6A84F', fontSize: 12, fontWeight: 700 }}>S’asseoir →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'table' && table && (
          <div style={{ maxWidth: 440, margin: '0 auto' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(18,60,50,0.7), rgba(16,21,26,0.8))',
                border: '1px solid rgba(214,168,79,0.25)',
                borderRadius: 20,
                padding: 18,
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <p style={{ color: '#A9B0B7', fontSize: 11, margin: '0 0 4px', letterSpacing: '0.1em' }}>CODE TABLE</p>
                  <p className="font-display text-gold" style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
                    {tableInviteCode(table.id)}
                  </p>
                </div>
                <span
                  style={{
                    background: table.status === 'lobby' ? 'rgba(76,175,118,0.15)' : 'rgba(214,168,79,0.15)',
                    color: table.status === 'lobby' ? '#4CAF76' : '#D6A84F',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '6px 10px',
                    borderRadius: 10,
                  }}
                >
                  {table.status === 'lobby' ? '● LOBBY' : table.status.toUpperCase()}
                </span>
              </div>
              <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>
                Mise {table.base_stake.toLocaleString('fr-FR')} · Buy-in {table.min_buy_in.toLocaleString('fr-FR')}–
                {table.max_buy_in.toLocaleString('fr-FR')} · {seats.length}/4
              </p>
            </div>

            <h3 className="font-display" style={{ color: '#fff', fontSize: 15, margin: '0 0 12px' }}>
              Sièges
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {[0, 1, 2, 3].map(i => {
                const seat = seats.find(s => s.seat_index === i)
                const isYou = seat && user && seat.user_id === user.id
                return (
                  <div
                    key={i}
                    style={{
                      background: isYou ? 'rgba(18,60,50,0.4)' : 'rgba(255,255,255,0.04)',
                      border: isYou ? '1px solid rgba(214,168,79,0.3)' : '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 14,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                      }}
                    >
                      {seat?.profile?.avatar ?? '∅'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="font-display" style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>
                        {seat ? seat.profile?.username ?? 'Joueur' : `Siège ${i + 1} libre`}
                        {isYou ? ' (vous)' : ''}
                      </p>
                      {seat && (
                        <p style={{ color: '#A9B0B7', fontSize: 12, margin: '2px 0 0' }}>
                          {seat.capital.toLocaleString('fr-FR')} FCFA
                        </p>
                      )}
                    </div>
                    {seat && (
                      <span style={{ color: seat.is_ready ? '#4CAF76' : '#A9B0B7', fontSize: 11, fontWeight: 600 }}>
                        {seat.is_ready ? 'Prêt' : 'Attente'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mySeat && table.status === 'lobby' && (
                <button className="btn-primary glow-gold" disabled={busy} onClick={() => void handleToggleReady()} style={{ width: '100%', padding: 16, borderRadius: 16, fontSize: 15 }}>
                  {mySeat.is_ready ? '↩ Annuler prêt' : '✓  PRÊT'}
                </button>
              )}
              {canStart && (
                <button className="btn-primary" disabled={busy} onClick={() => void handleStart()} style={{ width: '100%', padding: 16, borderRadius: 16, fontSize: 15 }}>
                  LANCER LA TABLE →
                </button>
              )}
              {!canStart && isHost && table.status === 'lobby' && (
                <p style={{ color: '#5b636b', fontSize: 12, textAlign: 'center', margin: 0 }}>
                  Il faut ≥ 2 joueurs, tous prêts, pour démarrer.
                </p>
              )}
              <button className="btn-secondary" disabled={busy} onClick={() => void handleLeave()} style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 13 }}>
                Quitter la table
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
