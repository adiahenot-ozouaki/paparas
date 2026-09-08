import { useEffect, useState, type ReactNode } from 'react'
import type { Screen } from '../types'
import AdSlot from '../components/ads/AdSlot'
import { useAuth } from '../auth/AuthContext'
import { useGame } from '../game/GameContext'
import { findMyActiveTables, listOpenLobbyTables, type MyActiveTable, type OpenLobbyTable } from '../lib/online/api'
import {
  setActiveOnlineTableId,
  setOnlineLobbyIntent,
  setPendingJoinCode,
  setPendingJoinTableId,
} from '../lib/online/session'
import { Zap, Bot, Globe, Sparkles } from '../components/icons'
import { Swords } from 'lucide-react'
import {
  AlertBanner,
  BackButton,
  EmptyState,
  PageHeader,
  ScreenShell,
  SectionCard,
  UiButton,
} from '../components/ui'

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
    return 'Impossible de charger les tables (reseau).'
  }
  return raw.length > 120 ? raw.slice(0, 100) + '...' : raw
}

export default function GameModeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { user } = useAuth()
  const { configureGame, startNewGame } = useGame()
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
        if (!cancelled) setListError(humanizeListError(e instanceof Error ? e.message : 'Erreur reseau'))
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

  function startFreestyle() {
    configureGame({
      baseStake: 100,
      startingCapital: 5000,
      deckVariant: 'as',
      endMode: 'fixedRounds',
      maxRounds: 99,
      targetCapital: 99_999,
    })
    startNewGame()
    onNavigate('freestyleTable')
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
    <ScreenShell bottomPad={24} className="mode-screen">
      <div className="mode-layout">
        <div className="mode-main">
          <div className="mode-header">
            <BackButton absolute={false} onClick={() => onNavigate('home')} />
            <PageHeader
              title="Mode de jeu"
              subtitle={`Solo libre · Online${user ? ' · connecte' : ' · compte requis'}`}
            />
          </div>

          {myTables.length > 0 && (
            <div className="mode-resume-list">
              {myTables.slice(0, 2).map(t => (
                <SectionCard
                  key={t.tableId}
                  variant="green"
                  onClick={() => resumeTable(t)}
                  className="mode-resume-card"
                >
                  <p className="font-display text-gold mode-resume-title">
                    {t.status === 'playing' ? 'Reprendre la partie' : 'Retour au lobby'}
                  </p>
                  <p className="mode-resume-meta">
                    Code {t.code} · mise {t.baseStake.toLocaleString('fr-FR')} · siege {t.seatIndex + 1}
                  </p>
                </SectionCard>
              ))}
            </div>
          )}

          <div className="mode-body mode-body--solo">
            <AdSlot placement="mode-banner" className="mode-ad" />

            <SectionCard className="mode-tourney-card" onClick={() => onNavigate('tournaments')}>
              <div className="mode-online-head">
                <span className="mode-online-emoji">
                  <Swords size={22} className="kora-icon" aria-hidden />
                </span>
                <span className="font-display mode-online-title">Tournois</span>
                <span className="mode-badge mode-badge--gold">NOUVEAU</span>
              </div>
              <p className="mode-online-desc">
                Inscriptions, lots en FCFA, formats elimination ou course aux rounds.
              </p>
            </SectionCard>

            <p className="mode-group-label">Solo · IA</p>

            <ModeCard
              icon={<Zap size={22} className="kora-icon" />}
              title="Partie rapide"
              badge="1 TAP"
              badgeTone="gold"
              accent="var(--kora-gold)"
              desc="As, mise 500, 8 rounds max — table IA tout de suite."
              meta="3-10+A · capital 5 000"
              onClick={startQuick}
            />

            <ModeCard
              icon={<Bot size={22} className="kora-icon" />}
              title="Entrainement"
              badge="APPRENDRE"
              badgeTone="green"
              accent="var(--kora-success)"
              desc="Paquet court (3-8), petites mises — ideal pour les regles."
              meta="Variante 8 · mise 100 · 5 rounds"
              onClick={startTraining}
            />

            <ModeCard
              icon={<Sparkles size={22} className="kora-icon" />}
              title="Table freestyle"
              badge="TEST UI"
              badgeTone="green"
              accent="var(--kora-green)"
              desc="Cartes et 4 joueurs seulement — sans points, cash ni textes. Bac a sable UI."
              meta="As · pas de banque · donne auto"
              onClick={startFreestyle}
            />

            <SectionCard variant="dashed" onClick={() => onNavigate('stakeConfig')}>
              <span className="mode-config-hint">Configurer une table solo (mise, capital, variante, fin)...</span>
            </SectionCard>
          </div>
        </div>

        <aside className="mode-side">
          <div className="mode-body mode-body--online">
            <p className="mode-group-label">En ligne · joueurs reels</p>

            <SectionCard className="mode-online-card">
              <div className="mode-online-accent" />
              <div className="mode-online-body">
                <div className="mode-online-head">
                  <span className="mode-online-emoji">
                    <Globe size={22} className="kora-icon" aria-hidden />
                  </span>
                  <span className="font-display mode-online-title">Table en ligne</span>
                  <span className="mode-badge mode-badge--green">ONLINE</span>
                  {!user && <span className="mode-badge mode-badge--muted">CONNEXION</span>}
                </div>
                <p className="mode-online-desc">
                  Creez une table privee ou rejoignez avec un code / une table ouverte.
                </p>
                <div className="mode-online-actions">
                  <UiButton onClick={openOnlineCreate} className="mode-online-btn">
                    Creer une table
                  </UiButton>
                  <UiButton variant="secondary" onClick={() => openOnlineJoin()} className="mode-online-btn">
                    Rejoindre (code)
                  </UiButton>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="mode-open-tables">
            <h3 className="font-display mode-open-title">Tables ouvertes</h3>
            {listError && (
              <div className="mode-list-error">
                <AlertBanner tone="error">{listError}</AlertBanner>
              </div>
            )}
            {openTables.length === 0 && !listError ? (
              <EmptyState title="Aucune table en lobby" description="Creez-en une ou attendez un hote." />
            ) : (
              <div className="mode-open-list">
                {openTables.map(t => (
                  <SectionCard
                    key={t.table.id}
                    onClick={() => openOnlineJoin({ tableId: t.table.id, code: t.code })}
                    className="mode-open-item"
                  >
                    <div className="mode-open-row">
                      <div>
                        <p className="font-display mode-open-code">{t.code}</p>
                        <p className="mode-open-meta">
                          Mise {t.table.base_stake.toLocaleString('fr-FR')} · {t.seatCount}/4
                        </p>
                      </div>
                      <span className="mode-open-cta">S'asseoir</span>
                    </div>
                  </SectionCard>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </ScreenShell>
  )
}

function ModeCard({
  icon,
  title,
  desc,
  meta,
  accent,
  badge,
  badgeTone,
  onClick,
}: {
  icon: ReactNode
  title: string
  desc: string
  meta: string
  accent: string
  badge: string
  badgeTone: 'gold' | 'green'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`anim-fade-in-up section-card mode-card mode-card--${badgeTone}`}
      onClick={onClick}
      style={{ ['--mode-accent' as string]: accent }}
    >
      <div className="mode-card-accent" />
      <div className="mode-card-body">
        <div className="mode-card-head">
          <span className="mode-card-icon">{icon}</span>
          <span className="font-display mode-card-title">{title}</span>
          <span className={`mode-badge mode-badge--${badgeTone}`}>{badge}</span>
        </div>
        <p className="mode-card-desc">{desc}</p>
        <p className="mode-card-meta">{meta}</p>
      </div>
    </button>
  )
}
