import { useEffect, useState } from 'react'
import type { Screen } from '../types'
import { useAuth } from '../auth/AuthContext'
import { findMyActiveTables, listOpenLobbyTables, type MyActiveTable, type OpenLobbyTable } from '../lib/online/api'
import { setActiveOnlineTableId } from '../lib/online/session'

const MODES = [
  {
    id: 'quick',
    title: 'Partie rapide',
    desc: 'Affronte trois adversaires IA immédiatement.',
    icon: '⚡',
    color: '#D6A84F',
    badge: 'POPULAIRE' as string | null,
    online: false,
    screen: 'stakeConfig' as Screen,
  },
  {
    id: 'private',
    title: 'Partie privée',
    desc: 'Crée ou rejoins une table en ligne (amis).',
    icon: '🔒',
    color: '#176B50',
    badge: 'ONLINE' as string | null,
    online: true,
    screen: 'onlineLobby' as Screen,
  },
  {
    id: 'friends',
    title: 'Avec amis',
    desc: 'Même flux que la table privée — code à partager.',
    icon: '👥',
    color: '#6B5B17',
    badge: 'ONLINE' as string | null,
    online: true,
    screen: 'onlineLobby' as Screen,
  },
  {
    id: 'training',
    title: 'Entraînement',
    desc: 'Table IA pour apprendre les règles.',
    icon: '🤖',
    color: '#2E3748',
    badge: 'GRATUIT' as string | null,
    online: false,
    screen: 'stakeConfig' as Screen,
  },
]

export default function GameModeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { user } = useAuth()
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
      const open = await listOpenLobbyTables(8)
      if (!cancelled) {
        if (open.error) setListError(open.error)
        else setOpenTables(open.tables)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  function handleMode(mode: (typeof MODES)[number]) {
    if (mode.online && !user) {
      onNavigate('auth')
      return
    }
    onNavigate(mode.screen)
  }

  function resumeTable(t: MyActiveTable) {
    setActiveOnlineTableId(t.tableId)
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

      <div style={{ padding: '20px 20px 0', position: 'relative' }}>
        <button
          onClick={() => onNavigate('home')}
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
          Solo libre · Online nécessite un compte{user ? ' ✓' : ''}
        </p>
      </div>

      {myTables.length > 0 && (
        <div style={{ padding: '16px 20px 0' }}>
          {myTables.slice(0, 2).map(t => (
            <button
              key={t.tableId}
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

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {MODES.map((mode, i) => (
          <button
            key={mode.id}
            className="anim-fade-in-up"
            onClick={() => handleMode(mode)}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '20px',
              cursor: 'pointer',
              textAlign: 'left',
              animationDelay: `${i * 0.07}s`,
              position: 'relative',
              overflow: 'hidden',
              display: 'block',
              width: '100%',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 4,
                height: '100%',
                background: `linear-gradient(180deg, ${mode.color}, transparent)`,
                borderRadius: '20px 0 0 20px',
              }}
            />
            <div style={{ paddingLeft: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22 }}>{mode.icon}</span>
                <span className="font-display" style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>
                  {mode.title}
                </span>
                {mode.badge && (
                  <span
                    style={{
                      background:
                        mode.badge === 'ONLINE'
                          ? 'rgba(23,107,80,0.25)'
                          : mode.badge === 'POPULAIRE'
                            ? 'rgba(214,168,79,0.2)'
                            : 'rgba(76,175,118,0.2)',
                      color:
                        mode.badge === 'ONLINE'
                          ? '#4CAF76'
                          : mode.badge === 'POPULAIRE'
                            ? '#D6A84F'
                            : '#4CAF76',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 99,
                      letterSpacing: '0.08em',
                      fontFamily: 'Plus Jakarta Sans',
                    }}
                  >
                    {mode.badge}
                  </span>
                )}
                {mode.online && !user && (
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: '#A9B0B7',
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
              <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>{mode.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div style={{ padding: '0 20px 24px' }}>
        <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: '#fff' }}>
          Tables ouvertes
        </h3>
        {listError && (
          <p style={{ color: '#C94B4B', fontSize: 12, margin: '0 0 8px' }}>{listError}</p>
        )}
        {openTables.length === 0 ? (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: '18px 16px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 6px' }}>Aucune table en lobby pour l’instant.</p>
            <p style={{ color: '#5b636b', fontSize: 12, margin: 0 }}>
              Créez-en une via « Partie privée » ou attendez un hôte.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {openTables.map(t => (
              <button
                key={t.table.id}
                onClick={() => {
                  if (!user) {
                    onNavigate('auth')
                    return
                  }
                  onNavigate('onlineLobby')
                }}
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
                <span style={{ color: '#D6A84F', fontSize: 12, fontWeight: 700 }}>Rejoindre →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
