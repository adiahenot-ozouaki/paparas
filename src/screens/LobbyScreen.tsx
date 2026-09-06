import { useState } from 'react'
import type { DeckVariant, Screen } from '../types'
import { useGame, SEAT_NAMES, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import type { GameEndMode } from '../game/payout'
import { BackButton, ScreenShell, UiButton } from '../components/ui'

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
    <ScreenShell bottomPad={0} className="lobby-screen" pattern>
      {countdown !== null && (
        <div className="lobby-countdown" aria-live="polite">
          <div className="anim-scale-bounce lobby-countdown-num">
            <span className="text-gold">{countdown}</span>
          </div>
          <p className="lobby-countdown-label">LA PARTIE COMMENCE...</p>
        </div>
      )}

      <div className="lobby-scroll">
        <div className="lobby-header">
          <BackButton absolute={false} onClick={() => onNavigate('gameMode')} />
        </div>

        <div className="lobby-config-wrap">
          <div className="lobby-config-card">
            <div className="lobby-config-top">
              <div className="lobby-config-titles">
                <p className="lobby-config-kicker">TABLE SOLO · IA</p>
                <h2 className="text-gold font-display lobby-config-brand">GARAM</h2>
              </div>
              <div className="lobby-status-pill">
                <span className="lobby-status-text">● EN ATTENTE</span>
              </div>
            </div>

            <div className="lobby-config-grid">
              <ConfigCell label="Mise" value={`${stakeConfig.baseStake.toLocaleString('fr-FR')} FCFA`} gold />
              <ConfigCell label="Capital" value={`${stakeConfig.startingCapital.toLocaleString('fr-FR')} FCFA`} />
              <ConfigCell label="Variante" value={VARIANT_LABEL[deckVariant]} />
              <ConfigCell label="Fin" value={`${END_MODE_LABEL[endMode]} · ${endDetail}`} />
            </div>

            <button type="button" onClick={() => onNavigate('stakeConfig')} className="lobby-edit-config">
              Modifier la config →
            </button>
          </div>
        </div>

        <div className="lobby-seats">
          <h3 className="font-display lobby-seats-title">Sièges ({lobbyPlayers.length}/4)</h3>
          <div className="lobby-seats-list">
            {lobbyPlayers.map((p, i) => (
              <div
                key={i}
                className={`anim-fade-in-up lobby-seat${p.isYou ? ' is-you' : ''}`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="lobby-seat-avatar-wrap">
                  <div className={`lobby-seat-avatar${p.isYou ? ' is-you' : ''}`}>{p.avatar}</div>
                  {p.ready && <div className="lobby-seat-ready-dot">✓</div>}
                </div>
                <div className="lobby-seat-meta">
                  <div className="lobby-seat-name-row">
                    <p className="font-display lobby-seat-name">{p.name}</p>
                    {p.isYou && <span className="lobby-seat-you">VOUS</span>}
                    {!p.isYou && <span className="lobby-seat-ai">IA</span>}
                  </div>
                  <p className="lobby-seat-capital">{p.capital.toLocaleString('fr-FR')} FCFA</p>
                </div>
                <div className={`lobby-seat-status${p.ready ? ' is-ready' : ''}`}>
                  <span>{p.ready ? 'Prêt' : 'En attente'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lobby-footer">
        {!ready ? (
          <UiButton fullWidth onClick={handleReady} className="lobby-cta glow-gold">
            ✓  PRÊT
          </UiButton>
        ) : (
          <UiButton fullWidth onClick={enterTable} className="lobby-cta glow-gold">
            LANCER LA PARTIE →
          </UiButton>
        )}
        <UiButton variant="secondary" fullWidth onClick={() => onNavigate('gameMode')} className="lobby-quit">
          Quitter la table
        </UiButton>
      </div>
    </ScreenShell>
  )
}

function ConfigCell({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="lobby-config-cell">
      <p className="lobby-config-cell-label">{label}</p>
      <p className={`font-display lobby-config-cell-value${gold ? ' is-gold' : ''}`}>{value}</p>
    </div>
  )
}
