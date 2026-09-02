import { useState } from 'react'
import type { Screen, DeckVariant } from '../types'
import { useGame } from '../game/GameContext'

const STAKE_PRESETS = [500, 1000, 2000, 5000]
const CAPITAL_PRESETS = [5000, 10000, 20000, 50000]

const VARIANT_OPTIONS: { id: DeckVariant; label: string }[] = [
  { id: '8', label: '3 à 8 — 23 cartes' },
  { id: '9', label: '3 à 9 — 27 cartes' },
  { id: '10', label: '3 à 10 — 31 cartes' },
  { id: 'as', label: '3 à 10 + As — 35 cartes' },
]

function cycleIndex(current: number, len: number, dir: -1 | 1): number {
  return (current + dir + len) % len
}

export default function StakeConfigScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { stakeConfig, deckVariant, configureGame } = useGame()

  const [baseStake, setBaseStake] = useState(stakeConfig.baseStake)
  const [startingCapital, setStartingCapital] = useState(stakeConfig.startingCapital)
  const [variant, setVariant] = useState<DeckVariant>(deckVariant)

  const stakeIndex = Math.max(0, STAKE_PRESETS.indexOf(baseStake))
  const capitalIndex = Math.max(0, CAPITAL_PRESETS.indexOf(startingCapital))
  const variantIndex = Math.max(
    0,
    VARIANT_OPTIONS.findIndex(v => v.id === variant),
  )

  function handleContinue() {
    configureGame({ baseStake, startingCapital, deckVariant: variant })
    onNavigate('lobby')
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#0B0D10',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      <div style={{ padding: '20px 20px 0', position: 'relative' }}>
        <button
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
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: '0.02em' }}>
          Configurer la table
        </h1>
        <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>
          Mise, capital et variante — flèches pour changer.
        </p>
      </div>

      <div
        style={{
          padding: '28px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          flex: 1,
          maxWidth: 440,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <StepperRow
          label="Mise"
          value={`${baseStake.toLocaleString('fr-FR')} FCFA`}
          onPrev={() => setBaseStake(STAKE_PRESETS[cycleIndex(stakeIndex, STAKE_PRESETS.length, -1)])}
          onNext={() => setBaseStake(STAKE_PRESETS[cycleIndex(stakeIndex, STAKE_PRESETS.length, 1)])}
        />

        <StepperRow
          label="Capital"
          value={`${startingCapital.toLocaleString('fr-FR')} FCFA`}
          onPrev={() =>
            setStartingCapital(CAPITAL_PRESETS[cycleIndex(capitalIndex, CAPITAL_PRESETS.length, -1)])
          }
          onNext={() =>
            setStartingCapital(CAPITAL_PRESETS[cycleIndex(capitalIndex, CAPITAL_PRESETS.length, 1)])
          }
        />

        <StepperRow
          label="Variante"
          value={VARIANT_OPTIONS[variantIndex].label}
          onPrev={() => {
            const next = VARIANT_OPTIONS[cycleIndex(variantIndex, VARIANT_OPTIONS.length, -1)]
            setVariant(next.id)
          }}
          onNext={() => {
            const next = VARIANT_OPTIONS[cycleIndex(variantIndex, VARIANT_OPTIONS.length, 1)]
            setVariant(next.id)
          }}
        />

        <p style={{ color: '#5b636b', fontSize: 11, margin: '4px 0 0', lineHeight: 1.45 }}>
          La mise est redistribuée chaque round (×1 à ×16 selon le combo). Un capital sous la mise
          élimine le joueur.
        </p>
      </div>

      <div style={{ padding: 20, maxWidth: 440, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <button
          className="btn-primary glow-gold"
          onClick={handleContinue}
          style={{ width: '100%', padding: '16px', fontSize: 15, borderRadius: 16, letterSpacing: '0.08em' }}
        >
          CONTINUER →
        </button>
      </div>
    </div>
  )
}

function StepperRow({
  label,
  value,
  onPrev,
  onNext,
}: {
  label: string
  value: string
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '12px 14px',
      }}
    >
      <span
        className="font-display"
        style={{
          color: '#A9B0B7',
          fontSize: 13,
          fontWeight: 600,
          width: 72,
          flexShrink: 0,
        }}
      >
        {label}
      </span>

      <button
        type="button"
        onClick={onPrev}
        aria-label={`${label} précédente`}
        style={stepperBtnStyle}
      >
        ‹
      </button>

      <div
        style={{
          flex: 1,
          textAlign: 'center',
          minWidth: 0,
        }}
      >
        <span
          className="font-display text-gold"
          style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.02em',
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </span>
      </div>

      <button
        type="button"
        onClick={onNext}
        aria-label={`${label} suivante`}
        style={stepperBtnStyle}
      >
        ›
      </button>
    </div>
  )
}

const stepperBtnStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  border: '1px solid rgba(214,168,79,0.35)',
  background: 'rgba(214,168,79,0.1)',
  color: '#F0D58A',
  fontSize: 22,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  lineHeight: 1,
  padding: 0,
}
