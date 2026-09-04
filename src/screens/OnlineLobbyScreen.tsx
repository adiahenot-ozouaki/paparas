import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Screen } from '../types'
import { useAuth } from '../auth/AuthContext'
import { useGame } from '../game/GameContext'
import {
  callEngine,
  createOnlineTable,
  fetchSeatsWithProfiles,
  fetchTable,
  joinOnlineTable,
  setSeatReady,
  tableInviteCode,
  type SeatWithProfile,
} from '../lib/online/api'
import { supabase } from '../lib/supabase/client'
import type { KoraTable } from '../lib/supabase/database.types'

// ==========================================================================
// OnlineLobbyScreen — table privée en ligne (cash game).
// Créer / rejoindre par code, sièges Realtime, prêt, start_table.
// ==========================================================================

type Phase = 'menu' | 'table'

export default function OnlineLobbyScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { user, profile, isLoading: authLoading } = useAuth()
  const { stakeConfig, deckVariant } = useGame()

  const [phase, setPhase] = useState<Phase>('menu')
  const [table, setTable] = useState<KoraTable | null>(null)
  const [seats, setSeats] = useState<SeatWithProfile[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const mySeat = useMemo(
    () => (user ? seats.find(s => s.user_id === user.id) : undefined),
    [seats, user],
  )
  const isHost = Boolean(user && table && table.created_by === user.id)
  const allReady = seats.length >= 2 && seats.every(s => s.is_ready)
  const canStart = isHost && allReady && table?.status === 'lobby'

  const refresh = useCallback(async (tableId: string) => {
    const [t, s] = await Promise.all([fetchTable(tableId), fetchSeatsWithProfiles(tableId)])
    if (t.table) setTable(t.table)
    if (!s.error) setSeats(s.seats)
    if (t.table?.status === 'playing') {
      setStatusMsg('La table a démarré — table de jeu online à brancher ensuite.')
    }
  }, [])

  // Realtime sièges + statut table
  useEffect(() => {
    if (!table?.id) return
    const tableId = table.id

    const channel = supabase
      .channel(`lobby:${tableId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kora_table_players', filter: `table_id=eq.${tableId}` },
        () => {
          void refresh(tableId)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'kora_tables', filter: `id=eq.${tableId}` },
        () => {
          void refresh(tableId)
        },
      )
      .subscribe()

    const poll = setInterval(() => void refresh(tableId), 4000)

    return () => {
      clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [table?.id, refresh])

  useEffect(() => {
    if (!authLoading && !user) {
      onNavigate('auth')
    }
  }, [authLoading, user, onNavigate])

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
      setError(createErr ?? 'Échec création')
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
      setError(joinErr)
      setBusy(false)
      return
    }
    setTable(created)
    await refresh(created.id)
    setPhase('table')
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

    // Accepte UUID complet ou préfixe 8 caractères
    let tableId = raw
    if (!raw.includes('-') && raw.length <= 12) {
      const { data } = await supabase.from('kora_tables').select('id, status').eq('status', 'lobby').limit(40)
      const match = (data ?? []).find(t => tableInviteCode(t.id) === raw.toUpperCase().replace(/-/g, ''))
      if (!match) {
        setError('Aucune table lobby avec ce code. Vérifiez le code ou collez l’UUID complet.')
        setBusy(false)
        return
      }
      tableId = match.id
    }

    const { table: t, error: tErr } = await fetchTable(tableId)
    if (tErr || !t) {
      setError(tErr ?? 'Table introuvable')
      setBusy(false)
      return
    }
    if (t.status !== 'lobby') {
      setError('Cette table n’est plus en lobby.')
      setBusy(false)
      return
    }

    const already = (await fetchSeatsWithProfiles(t.id)).seats.find(s => s.user_id === user.id)
    if (!already) {
      const buyIn = Math.min(Math.max(stakeConfig.startingCapital, t.min_buy_in), t.max_buy_in)
      const { error: joinErr } = await joinOnlineTable({
        tableId: t.id,
        userId: user.id,
        buyIn,
      })
      if (joinErr) {
        setError(joinErr)
        setBusy(false)
        return
      }
    }

    setTable(t)
    await refresh(t.id)
    setPhase('table')
    setBusy(false)
  }

  async function handleToggleReady() {
    if (!user || !table || !mySeat) return
    setBusy(true)
    setError(null)
    const { error: e } = await setSeatReady(table.id, user.id, !mySeat.is_ready)
    if (e) setError(e)
    await refresh(table.id)
    setBusy(false)
  }

  async function handleStart() {
    if (!table) return
    setBusy(true)
    setError(null)
    const { ok, body } = await callEngine('start_table', table.id)
    if (!ok) {
      setError(String(body.error ?? 'Impossible de démarrer'))
      setBusy(false)
      return
    }
    setStatusMsg('Table démarrée côté serveur. Écran de jeu online : prochaine étape.')
    await refresh(table.id)
    setBusy(false)
  }

  async function handleLeave() {
    if (!table) {
      setPhase('menu')
      return
    }
    setBusy(true)
    await callEngine('leave_table', table.id)
    setTable(null)
    setSeats([])
    setPhase('menu')
    setBusy(false)
  }

  if (authLoading || !user) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#0B0D10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#A9B0B7' }}>Connexion…</span>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#0B0D10',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
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
              color: '#C94B4B',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
        {statusMsg && (
          <div
            style={{
              background: 'rgba(214,168,79,0.12)',
              border: '1px solid rgba(214,168,79,0.35)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 16,
              color: '#D6A84F',
              fontSize: 13,
            }}
          >
            {statusMsg}
          </div>
        )}

        {phase === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420, margin: '0 auto' }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <p style={{ color: '#A9B0B7', fontSize: 12, margin: '0 0 8px' }}>
                Mise {stakeConfig.baseStake.toLocaleString('fr-FR')} · Capital{' '}
                {stakeConfig.startingCapital.toLocaleString('fr-FR')} FCFA · {deckVariant}
              </p>
              <button
                className="btn-primary glow-gold"
                disabled={busy}
                onClick={() => void handleCreate()}
                style={{ width: '100%', padding: 14, borderRadius: 14, fontSize: 14 }}
              >
                Créer une table privée
              </button>
              <button
                className="btn-secondary"
                onClick={() => onNavigate('stakeConfig')}
                style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 13, marginTop: 10 }}
              >
                Modifier mise / capital
              </button>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: 16,
              }}
            >
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
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() => void handleJoin()}
                style={{ width: '100%', padding: 14, borderRadius: 14, fontSize: 14 }}
              >
                Rejoindre
              </button>
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
                Mise {table.base_stake.toLocaleString('fr-FR')} · Buy-in{' '}
                {table.min_buy_in.toLocaleString('fr-FR')}–{table.max_buy_in.toLocaleString('fr-FR')} ·{' '}
                {seats.length}/4
              </p>
              <p style={{ color: '#5b636b', fontSize: 11, margin: '8px 0 0', wordBreak: 'break-all' }}>
                UUID : {table.id}
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
                      <span
                        style={{
                          color: seat.is_ready ? '#4CAF76' : '#A9B0B7',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {seat.is_ready ? 'Prêt' : 'Attente'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mySeat && table.status === 'lobby' && (
                <button
                  className="btn-primary glow-gold"
                  disabled={busy}
                  onClick={() => void handleToggleReady()}
                  style={{ width: '100%', padding: 16, borderRadius: 16, fontSize: 15 }}
                >
                  {mySeat.is_ready ? '↩ Annuler prêt' : '✓  PRÊT'}
                </button>
              )}
              {canStart && (
                <button
                  className="btn-primary"
                  disabled={busy}
                  onClick={() => void handleStart()}
                  style={{ width: '100%', padding: 16, borderRadius: 16, fontSize: 15 }}
                >
                  LANCER LA TABLE →
                </button>
              )}
              {!canStart && isHost && table.status === 'lobby' && (
                <p style={{ color: '#5b636b', fontSize: 12, textAlign: 'center', margin: 0 }}>
                  Il faut ≥ 2 joueurs, tous prêts, pour démarrer.
                </p>
              )}
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => void handleLeave()}
                style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 13 }}
              >
                Quitter la table
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
