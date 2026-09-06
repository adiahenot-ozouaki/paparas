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
import { AlertBanner, EmptyState, PageHeader, ScreenShell, SectionCard, UiButton } from '../components/ui'

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
    <ScreenShell bottomPad={24}>
      <div style={{ padding: 'max(20px, env(safe-area-inset-top, 0px)) 20px 0' }}>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          aria-label="Retour"
          style={{
            background: 'var(--kora-card-bg)',
            border: '1px solid var(--kora-card-border)',
            borderRadius: 12,
            width: 40,
            height: 40,
            color: 'var(--kora-text)',
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          ←
        </button>
        <PageHeader title="Mode de jeu" subtitle={`Solo libre · Online${user ? ' · connecté' : ' · compte requis'}`} />
      </div>

      {myTables.length > 0 && (
        <div style={{ padding: '0 20px 8px' }}>
          {myTables.slice(0, 2).map(t => (
            <SectionCard
              key={t.tableId}
              variant="green"
              onClick={() => resumeTable(t)}
              style={{ marginBottom: 10 }}
            >
              <p className="font-display text-gold" style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>
                {t.status === 'playing' ? '▶ Reprendre la partie' : '↩ Retour au lobby'}
              </p>
              <p style={{ color: 'var(--kora-muted)', fontSize: 12, margin: 0 }}>
                Code {t.code} · mise {t.baseStake.toLocaleString('fr-FR')} · siège {t.seatIndex + 1}
              </p>
            </SectionCard>
          ))}
        </div>
      )}

      <div style={{ padding: '12px 20px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p
          style={{
            color: 'var(--kora-muted-2)',
            fontSize: 11,
            fontFamily: 'Plus Jakarta Sans',
            letterSpacing: '0.12em',
            margin: 0,
            fontWeight: 700,
          }}
        >
          SOLO · IA
        </p>

        <ModeCard
          icon="⚡"
          title="Partie rapide"
          badge="1 TAP"
          badgeTone="gold"
          color="var(--kora-gold)"
          desc="As, mise 500, 8 rounds max — table IA tout de suite."
          meta="3–10+A · capital 5 000"
          onClick={startQuick}
        />

        <ModeCard
          icon="🤖"
          title="Entraînement"
          badge="APPRENDRE"
          badgeTone="green"
          color="var(--kora-success)"
          desc="Paquet court (3–8), petites mises — idéal pour les règles."
          meta="Variante 8 · mise 100 · 5 rounds"
          onClick={startTraining}
        />

        <SectionCard variant="dashed" onClick={() => onNavigate('stakeConfig')}>
          <span style={{ color: 'var(--kora-muted)', fontSize: 13, fontFamily: 'Plus Jakarta Sans' }}>
            ⚙️ Configurer une table solo (mise, capital, variante, fin)…
          </span>
        </SectionCard>

        <p
          style={{
            color: 'var(--kora-muted-2)',
            fontSize: 11,
            fontFamily: 'Plus Jakarta Sans',
            letterSpacing: '0.12em',
            margin: '12px 0 0',
            fontWeight: 700,
          }}
        >
          EN LIGNE · JOUEURS RÉELS
        </p>

        <SectionCard style={{ position: 'relative', overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 4,
              height: '100%',
              background: 'linear-gradient(180deg, var(--kora-green), transparent)',
            }}
          />
          <div style={{ paddingLeft: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22 }}>🌐</span>
              <span className="font-display" style={{ color: 'var(--kora-text)', fontSize: 17, fontWeight: 700 }}>
                Table en ligne
              </span>
              <span
                style={{
                  background: 'rgba(23,107,80,0.25)',
                  color: 'var(--kora-success)',
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 99,
                  letterSpacing: '0.08em',
                }}
              >
                ONLINE
              </span>
              {!user && (
                <span
                  style={{
                    background: 'var(--kora-card-bg)',
                    color: 'var(--kora-muted)',
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                  }}
                >
                  CONNEXION
                </span>
              )}
            </div>
            <p style={{ color: 'var(--kora-muted)', fontSize: 13, margin: '0 0 14px', lineHeight: 1.45 }}>
              Créez une table privée ou rejoignez avec un code / une table ouverte.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <UiButton onClick={openOnlineCreate} style={{ flex: 1, minWidth: 120 }}>
                Créer une table
              </UiButton>
              <UiButton variant="secondary" onClick={() => openOnlineJoin()} style={{ flex: 1, minWidth: 120 }}>
                Rejoindre (code)
              </UiButton>
            </div>
          </div>
        </SectionCard>
      </div>

      <div style={{ padding: '8px 20px 24px' }}>
        <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--kora-text)' }}>
          Tables ouvertes
        </h3>
        {listError && (
          <div style={{ marginBottom: 10 }}>
            <AlertBanner tone="error">{listError}</AlertBanner>
          </div>
        )}
        {openTables.length === 0 && !listError ? (
          <EmptyState title="Aucune table en lobby" description="Créez-en une ou attendez un hôte." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {openTables.map(t => (
              <SectionCard
                key={t.table.id}
                onClick={() => openOnlineJoin({ tableId: t.table.id, code: t.code })}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
              >
                <div>
                  <p className="font-display" style={{ color: 'var(--kora-text)', fontSize: 14, fontWeight: 700, margin: 0 }}>
                    {t.code}
                  </p>
                  <p style={{ color: 'var(--kora-muted)', fontSize: 11, margin: '2px 0 0' }}>
                    Mise {t.table.base_stake.toLocaleString('fr-FR')} · {t.seatCount}/4
                  </p>
                </div>
                <span style={{ color: 'var(--kora-gold)', fontSize: 12, fontWeight: 700 }}>S’asseoir →</span>
              </SectionCard>
            ))}
          </div>
        )}
      </div>
    </ScreenShell>
  )
}

function ModeCard({
  icon,
  title,
  desc,
  meta,
  color,
  badge,
  badgeTone,
  onClick,
}: {
  icon: string
  title: string
  desc: string
  meta: string
  color: string
  badge: string
  badgeTone: 'gold' | 'green'
  onClick: () => void
}) {
  const badgeBg = badgeTone === 'gold' ? 'rgba(214,168,79,0.2)' : 'rgba(76,175,118,0.2)'
  const badgeFg = badgeTone === 'gold' ? 'var(--kora-gold)' : 'var(--kora-success)'
  return (
    <button
      type="button"
      className="anim-fade-in-up section-card"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
        display: 'block',
        width: '100%',
        borderRadius: 20,
        padding: 18,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 4,
          height: '100%',
          background: `linear-gradient(180deg, ${color}, transparent)`,
        }}
      />
      <div style={{ paddingLeft: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <span className="font-display" style={{ color: 'var(--kora-text)', fontSize: 17, fontWeight: 700 }}>
            {title}
          </span>
          <span
            style={{
              background: badgeBg,
              color: badgeFg,
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 99,
              letterSpacing: '0.08em',
              fontFamily: 'Plus Jakarta Sans',
            }}
          >
            {badge}
          </span>
        </div>
        <p style={{ color: 'var(--kora-muted)', fontSize: 13, margin: '0 0 6px', lineHeight: 1.4 }}>{desc}</p>
        <p style={{ color: 'var(--kora-muted-2)', fontSize: 11, margin: 0 }}>{meta}</p>
      </div>
    </button>
  )
}
