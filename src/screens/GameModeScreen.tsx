import { useEffect, useState } from 'react'
import type { Screen } from '../types'
import { useAuth } from '../auth/AuthContext'
import { useGame } from '../game/GameContext'
import { findMyActiveTables, listOpenLobbyTables, type MyActiveTable, type OpenLobbyTable } from '../lib/online/api'
import {
  setActiveOnlineTableId,
  setOnlineLobbyIntent,
  setPendingJoinCode,
  setPendingJoinTableId,
} from '../lib/online/session'

const QUICK_PRESET = {
  baseStake: 500,
  startingCapital: 5000,
  deckVariant: 'as' as const,
  endMode: 'fixedRounds' as const,
  maxRounds: 8,
  targetCapital: 15_000,
}

const TRAINING_PRESET = {
  baseStake: 100,
  startingCapital: 2000,
  deckVariant: '8' as const,
  endMode: 'fixedRounds' as const,
  maxRounds: 5,
  targetCapital: 6000,
}

function humanizeListError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Impossible de charger les tables (réseau).'
  }
  return raw.length > 120 ? raw.slice(0, 100) + '…' : raw
}

export default function GameModeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { user } = useAuth()
  const { configureGame } = useGame()
  const [myTables, setMyTables] = useState<MyActiveTable[]>([])
  const [openTables, setOpenTables] = useState<OpenLobbyTable[]>([])
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (user) {
        const mine = await findMyActiveTables(user.id)
        if (!cancelled && !mine.error) setMyTables(mine.tables)
      } else {
        setMyTables([])
      }
      try {
        const open = await listOpenLobbyTables(8)
        if (cancelled) return
        if (open.error) setListError(humanizeListError(open.error))
        else {
          setListError(null)
          setOpenTables(open.tables)
        }
      } catch (e) {
        if (!cancelled) setListError(humanizeListError(e instanceof Error ? e.message : 'Erreur réseau'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  function requireAuthThen(next: () => void) {
    if (!user) {
      onNavigate('auth')
      return
    }
    next()
  }

  function startQuick() {
    configureGame(QUICK_PRESET)
    onNavigate('lobby')
  }

  function startTraining() {
    configureGame(TRAINING_PRESET)
    onNavigate('lobby')
  }

  function openOnlineCreate() {
    requireAuthThen(() => {
      setOnlineLobbyIntent('create')
      setPendingJoinCode(null)
      setPendingJoinTableId(null)
      onNavigate('onlineLobby')
    })
  }

  function openOnlineJoin(opts?: { code?: string; tableId?: string }) {
    requireAuthThen(() => {
      setOnlineLobbyIntent('join')
      setPendingJoinCode(opts?.code ?? null)
      setPendingJoinTableId(opts?.tableId ?? null)
      onNavigate('onlineLobby')
    })
  }

  function resumeTable(t: MyActiveTable) {
    setActiveOnlineTableId(t.tableId)
    setOnlineLobbyIntent('menu')
    if (t.status === 'playing') onNavigate('onlineGameTable')
    else onNavigate('onlineLobby')
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#0B0D10',
        overflowY: 'auto',
        paddingBottom: 80,
      }}
    >
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      <div style={{ padding: 'max(20px, env(safe-area-inset-top, 0px)) 20px 0', position: 'relative' }}>
        <button
          type="button"
          onClick={() => onNavigate('home')}
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          ←
        </button>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '0.02em' }}>
          Mode de jeu
        </h1>
        <p style={{ color: '#A9B0B7', fontSize: 14, margin: 0 }}>
          Solo libre · Online{user ? ' · connecté' : ' · compte requis'}
        </p>
      </div>

      {myTables.length > 0 && (
        <div style={{ padding: '16px 20px 0' }}>
          {myTables.slice(0, 2).map(t => (
            <button
              key={t.tableId}
              type="button"
              onClick={() => resumeTable(t)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'linear-gradient(135deg, rgba(18,60,50,0.65), rgba(16,21,26,0.85))',
                border: '1px solid rgba(214,168,79,0.35)',
                borderRadius: 16,
                padding: '14px 16px',
                cursor: 'pointer',
                marginBottom: 10,
              }}
            >
              <p className="font-display text-gold" style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>
                {t.status === 'playing' ? '▶ Reprendre la partie' : '↩ Retour au lobby'}
              </p>
              <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>
                Code {t.code} · mise {t.baseStake.toLocaleString('fr-FR')} · siège {t.seatIndex + 1}
              </p>
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ color: '#5b636b', fontSize: 11, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.12em', margin: '4px 0 0', fontWeight: 700 }}>
          SOLO · IA
        </p>

        <ModeCard
          icon="⚡"
          title="Partie rapide"
          badge="1 TAP"
          badgeTone="gold"
          color="#D6A84F"
          desc="As, mise 500, 8 rounds max — table IA tout de suite."
          meta="3–10+A · capital 5 000"
          onClick={startQuick}
        />

        <ModeCard
          icon="🤖"
          title="Entraînement"
          badge="APPRENDRE"
          badgeTone="green"
          color="#4CAF76"
          desc="Paquet court (3–8), petites mises — idéal pour les règles."
          meta="Variante 8 · mise 100 · 5 rounds"
          onClick={startTraining}
        />

        <button
          type="button"
          onClick={() => onNavigate('stakeConfig')}
          style={{
            width: '100%',
            textAlign: 'left',
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: 16,
            padding: '14px 16px',
            cursor: 'pointer',
            color: '#A9B0B7',
            fontSize: 13,
            fontFamily: 'Plus Jakarta Sans',
          }}
        >
          ⚙️ Configurer une table solo (mise, capital, variante, fin)…
        </button>

        <p style={{ color: '#5b636b', fontSize: 11, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.12em', margin: '12px 0 0', fontWeight: 700 }}>
          EN LIGNE · JOUEURS RÉELS
        </p>

        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: 'linear-gradient(180deg, #176B50, transparent)' }} />
          <div style={{ paddingLeft: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22 }}>🌐</span>
              <span className="font-display" style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>
                Table en ligne
              </span>
              <span style={{ background: 'rgba(23,107,80,0.25)', color: '#4CAF76', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, letterSpacing: '0.08em' }}>
                ONLINE
              </span>
              {!user && (
                <span style={{ background: 'rgba(255,255,255,0.06)', color: '#A9B0B7', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                  CONNEXION
                </span>
              )}
            </div>
            <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 14px', lineHeight: 1.45 }}>
              Créez une table privée ou rejoignez avec un code / une table ouverte (sans ressaisir).
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary glow-gold" onClick={openOnlineCreate} style={{ flex: 1, minWidth: 120, padding: '12px 14px', borderRadius: 12, fontSize: 13 }}>
                Créer une table
              </button>
              <button type="button" className="btn-secondary" onClick={() => openOnlineJoin()} style={{ flex: 1, minWidth: 120, padding: '12px 14px', borderRadius: 12, fontSize: 13 }}>
                Rejoindre (code)
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 20px 24px' }}>
        <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: '#fff' }}>
          Tables ouvertes
        </h3>
        {listError && (
          <div style={{ background: 'rgba(201,75,75,0.1)', border: '1px solid rgba(201,75,75,0.3)', borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
            <p style={{ color: '#E8A0A0', fontSize: 12, margin: 0 }}>{listError}</p>
          </div>
        )}
        {openTables.length === 0 && !listError ? (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 16px', textAlign: 'center' }}>
            <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 6px' }}>Aucune table en lobby.</p>
            <p style={{ color: '#5b636b', fontSize: 12, margin: 0 }}>Créez-en une ou attendez un hôte.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {openTables.map(t => (
              <button
                key={t.table.id}
                type="button"
                onClick={() => openOnlineJoin({ tableId: t.table.id, code: t.code })}
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
                  gap: 8,
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
  )
}

function ModeCard({
  icon, title, desc, meta, color, badge, badgeTone, onClick,
}: {
  icon: string; title: string; desc: string; meta: string; color: string; badge: string; badgeTone: 'gold' | 'green'; onClick: () => void
}) {
  const badgeBg = badgeTone === 'gold' ? 'rgba(214,168,79,0.2)' : 'rgba(76,175,118,0.2)'
  const badgeFg = badgeTone === 'gold' ? '#D6A84F' : '#4CAF76'
  return (
    <button type="button" className="anim-fade-in-up" onClick={onClick} style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
      padding: '18px', cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden', display: 'block', width: '100%',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: `linear-gradient(180deg, ${color}, transparent)` }} />
      <div style={{ paddingLeft: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <span className="font-display" style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>{title}</span>
          <span style={{ background: badgeBg, color: badgeFg, fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, letterSpacing: '0.08em', fontFamily: 'Plus Jakarta Sans' }}>{badge}</span>
        </div>
        <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 6px', lineHeight: 1.4 }}>{desc}</p>
        <p style={{ color: '#5b636b', fontSize: 11, margin: 0 }}>{meta}</p>
      </div>
    </button>
  )
}
