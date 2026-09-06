import { useState } from 'react'
import type { DeckVariant, Screen } from '../types'
import { useGame, SEAT_NAMES, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import type { GameEndMode } from '../game/payout'

const VARIANT_LABEL: Record<DeckVariant, string> = {
  '8': '3–8 · 23 cartes',
  '9': '3–9 · 27 cartes',
  '10': '3–10 · 31 cartes',
  as: '3–10+As · 35 cartes',
}

const END_MODE_LABEL: Record<GameEndMode, string> = {
  fixedRounds: 'Hybride',
  elimination: 'Élimination',
  raceToCapital: 'Course',
}

export default function LobbyScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { startNewGame, stakeConfig, deckVariant } = useGame()
  const [ready, setReady] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  const lobbyPlayers = SEAT_NAMES.map((name, i) => ({
    name,
    avatar: SEAT_AVATARS[i],
    capital: stakeConfig.startingCapital,
    ready: i === HUMAN_INDEX ? ready : true,
    isYou: i === HUMAN_INDEX,
  }))

  const endMode = stakeConfig.endMode ?? 'fixedRounds'
  const maxRounds = stakeConfig.maxRounds ?? 10
  const targetCapital = stakeConfig.targetCapital ?? stakeConfig.startingCapital * 3

  const endDetail =
    endMode === 'fixedRounds'
      ? `max ${maxRounds} rounds`
      : endMode === 'raceToCapital'
        ? `objectif ${targetCapital.toLocaleString('fr-FR')} FCFA`
        : 'dernier survivant'

  function enterTable() {
    startNewGame()
    onNavigate('gameTable')
  }

  const handleReady = () => {
    setReady(true)
    let count = 3
    setCountdown(count)
    const interval = setInterval(() => {
      count--
      if (count === 0) {
        clearInterval(interval)
        setCountdown(null)
        enterTable()
      } else {
        setCountdown(count)
      }
    }, 1000)
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

      {countdown !== null && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(11,13,16,0.92)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="anim-scale-bounce" style={{ fontSize: 120, fontFamily: 'Plus Jakarta Sans', fontWeight: 800, lineHeight: 1 }}>
            <span className="text-gold">{countdown}</span>
          </div>
          <p
            style={{
              color: '#A9B0B7',
              fontSize: 16,
              fontFamily: 'Plus Jakarta Sans',
              letterSpacing: '0.12em',
              marginTop: 16,
            }}
          >
            LA PARTIE COMMENCE...
          </p>
        </div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          position: 'relative',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{ padding: 'max(20px, env(safe-area-inset-top, 0px)) 20px 0' }}>
          <button
            type="button"
            onClick={() => onNavigate('gameMode')}
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
              marginBottom: 16,
            }}
          >
            ←
          </button>
        </div>

        {/* Résumé config */}
        <div style={{ padding: '0 20px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(18,60,50,0.7) 0%, rgba(16,21,26,0.8) 100%)',
              border: '1px solid rgba(214,168,79,0.25)',
              borderRadius: 20,
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    color: '#A9B0B7',
                    fontSize: 11,
                    fontFamily: 'Plus Jakarta Sans',
                    letterSpacing: '0.1em',
                    margin: '0 0 4px',
                  }}
                >
                  TABLE SOLO · IA
                </p>
                <h2 className="text-gold font-display" style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '0.04em' }}>
                  GARAM
                </h2>
              </div>
              <div
                style={{
                  background: 'rgba(76,175,118,0.15)',
                  border: '1px solid rgba(76,175,118,0.3)',
                  borderRadius: 10,
                  padding: '6px 12px',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#4CAF76', fontSize: 12, fontFamily: 'Plus Jakarta Sans', fontWeight: 600 }}>
                  ● EN ATTENTE
                </span>
              </div>
            </div>

            {/* Grille config lisible */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <ConfigCell label="Mise" value={`${stakeConfig.baseStake.toLocaleString('fr-FR')} FCFA`} gold />
              <ConfigCell label="Capital" value={`${stakeConfig.startingCapital.toLocaleString('fr-FR')} FCFA`} />
              <ConfigCell label="Variante" value={VARIANT_LABEL[deckVariant]} />
              <ConfigCell label="Fin" value={`${END_MODE_LABEL[endMode]} · ${endDetail}`} />
            </div>

            <button
              type="button"
              onClick={() => onNavigate('stakeConfig')}
              style={{
                marginTop: 12,
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px dashed rgba(255,255,255,0.12)',
                borderRadius: 12,
                padding: '10px 12px',
                color: '#A9B0B7',
                fontSize: 12,
                fontFamily: 'Plus Jakarta Sans',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Modifier la config →
            </button>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: '#fff' }}>
            Sièges ({lobbyPlayers.length}/4)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lobbyPlayers.map((p, i) => (
              <div
                key={i}
                className="anim-fade-in-up"
                style={{
                  background: p.isYou ? 'rgba(18,60,50,0.4)' : 'rgba(255,255,255,0.04)',
                  border: p.isYou ? '1px solid rgba(214,168,79,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  animationDelay: `${i * 0.08}s`,
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #123C32, #0d2a1f)',
                      border: `1.5px solid ${p.isYou ? 'rgba(214,168,79,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                    }}
                  >
                    {p.avatar}
                  </div>
                  {p.ready && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#4CAF76',
                        border: '2px solid #0B0D10',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 8,
                      }}
                    >
                      ✓
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <p className="font-display" style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>
                      {p.name}
                    </p>
                    {p.isYou && (
                      <span
                        style={{
                          background: 'rgba(214,168,79,0.15)',
                          color: '#D6A84F',
                          fontSize: 9,
                          padding: '2px 8px',
                          borderRadius: 99,
                          fontFamily: 'Plus Jakarta Sans',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                        }}
                      >
                        VOUS
                      </span>
                    )}
                    {!p.isYou && (
                      <span style={{ color: '#5b636b', fontSize: 10, fontWeight: 600 }}>IA</span>
                    )}
                  </div>
                  <p style={{ color: '#A9B0B7', fontSize: 12, margin: '2px 0 0' }}>
                    {p.capital.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div
                  style={{
                    background: p.ready ? 'rgba(76,175,118,0.15)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${p.ready ? 'rgba(76,175,118,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 10,
                    padding: '5px 12px',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      color: p.ready ? '#4CAF76' : '#A9B0B7',
                      fontSize: 11,
                      fontFamily: 'Plus Jakarta Sans',
                      fontWeight: 600,
                    }}
                  >
                    {p.ready ? 'Prêt' : 'En attente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 8 }} />
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: '12px 20px max(20px, env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: 'linear-gradient(180deg, transparent, #0B0D10 20%)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {!ready ? (
          <button
            type="button"
            className="btn-primary glow-gold"
            onClick={handleReady}
            style={{ width: '100%', padding: '18px', fontSize: 16, borderRadius: 18, letterSpacing: '0.1em' }}
          >
            ✓  PRÊT
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary glow-gold"
            onClick={enterTable}
            style={{ width: '100%', padding: '18px', fontSize: 16, borderRadius: 18, letterSpacing: '0.1em' }}
          >
            LANCER LA PARTIE →
          </button>
        )}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onNavigate('gameMode')}
          style={{ width: '100%', padding: '14px', fontSize: 14, borderRadius: 14 }}
        >
          Quitter la table
        </button>
      </div>
    </div>
  )
}

function ConfigCell({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.25)',
        borderRadius: 12,
        padding: '10px 12px',
        minWidth: 0,
      }}
    >
      <p style={{ color: '#5b636b', fontSize: 10, margin: '0 0 4px', letterSpacing: '0.06em' }}>{label}</p>
      <p
        className="font-display"
        style={{
          color: gold ? '#D6A84F' : '#fff',
          fontSize: 13,
          fontWeight: 700,
          margin: 0,
          lineHeight: 1.25,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </p>
    </div>
  )
}
