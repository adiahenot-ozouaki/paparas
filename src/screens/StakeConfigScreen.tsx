import { useState } from 'react'
import type { Screen, DeckVariant } from '../types'
import { useGame } from '../game/GameContext'
import type { GameEndMode } from '../game/payout'

const STAKE_PRESETS = [100, 500, 1000, 2000, 5000]
const CAPITAL_PRESETS = [2000, 5000, 10000, 20000, 50000]
const MAX_ROUNDS_PRESETS = [5, 8, 10, 15]
const TARGET_MULT_PRESETS = [2, 3, 4, 5]

const VARIANT_OPTIONS: { id: DeckVariant; label: string }[] = [
  { id: '8', label: '3 à 8 — 23 cartes' },
  { id: '9', label: '3 à 9 — 27 cartes' },
  { id: '10', label: '3 à 10 — 31 cartes' },
  { id: 'as', label: '3 à 10 + As — 35 cartes' },
]

const END_MODE_OPTIONS: { id: GameEndMode; label: string; hint: string }[] = [
  {
    id: 'fixedRounds',
    label: 'Hybride',
    hint: 'Élimination ou plafond de rounds → plus riche gagne',
  },
  {
    id: 'elimination',
    label: 'Élimination',
    hint: 'Jusqu’au dernier survivant',
  },
  {
    id: 'raceToCapital',
    label: 'Course',
    hint: 'Premier à atteindre l’objectif de capital',
  },
]

/** Aligné sur GameModeScreen — 1 tap → lobby. */
type QuickPreset = {
  id: string
  title: string
  icon: string
  blurb: string
  baseStake: number
  startingCapital: number
  deckVariant: DeckVariant
  endMode: GameEndMode
  maxRounds: number
  targetCapital: number
  accent: string
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'rapide',
    title: 'Rapide',
    icon: '⚡',
    blurb: 'As · 500 · 8 rounds',
    baseStake: 500,
    startingCapital: 5000,
    deckVariant: 'as',
    endMode: 'fixedRounds',
    maxRounds: 8,
    targetCapital: 15_000,
    accent: '#D6A84F',
  },
  {
    id: 'entrainement',
    title: 'Entraînement',
    icon: '🤖',
    blurb: 'Var. 8 · 100 · 5 rounds',
    baseStake: 100,
    startingCapital: 2000,
    deckVariant: '8',
    endMode: 'fixedRounds',
    maxRounds: 5,
    targetCapital: 6000,
    accent: '#4CAF76',
  },
  {
    id: 'classique',
    title: 'Classique',
    icon: '♠',
    blurb: 'As · 1 000 · 10 rounds',
    baseStake: 1000,
    startingCapital: 10000,
    deckVariant: 'as',
    endMode: 'fixedRounds',
    maxRounds: 10,
    targetCapital: 30_000,
    accent: '#F0D58A',
  },
  {
    id: 'haute',
    title: 'Haute mise',
    icon: '🔥',
    blurb: 'As · 5 000 · élimination',
    baseStake: 5000,
    startingCapital: 20000,
    deckVariant: 'as',
    endMode: 'elimination',
    maxRounds: 15,
    targetCapital: 60_000,
    accent: '#C94B4B',
  },
]

function cycleIndex(current: number, len: number, dir: -1 | 1): number {
  return (current + dir + len) % len
}

export default function StakeConfigScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { stakeConfig, deckVariant, configureGame } = useGame()

  const [baseStake, setBaseStake] = useState(stakeConfig.baseStake)
  const [startingCapital, setStartingCapital] = useState(stakeConfig.startingCapital)
  const [variant, setVariant] = useState<DeckVariant>(deckVariant)
  const [endMode, setEndMode] = useState<GameEndMode>(stakeConfig.endMode ?? 'fixedRounds')
  const [maxRounds, setMaxRounds] = useState(stakeConfig.maxRounds ?? 10)
  const [targetMult, setTargetMult] = useState(() => {
    const t = stakeConfig.targetCapital ?? startingCapital * 3
    const m = Math.round(t / Math.max(1, stakeConfig.startingCapital))
    return TARGET_MULT_PRESETS.includes(m) ? m : 3
  })

  const stakeIndex = Math.max(0, STAKE_PRESETS.indexOf(baseStake))
  const capitalIndex = Math.max(0, CAPITAL_PRESETS.indexOf(startingCapital))
  const variantIndex = Math.max(0, VARIANT_OPTIONS.findIndex(v => v.id === variant))
  const endModeIndex = Math.max(0, END_MODE_OPTIONS.findIndex(m => m.id === endMode))
  const maxRoundsIndex = Math.max(0, MAX_ROUNDS_PRESETS.indexOf(maxRounds))
  const targetMultIndex = Math.max(0, TARGET_MULT_PRESETS.indexOf(targetMult))

  const targetCapital = startingCapital * targetMult

  function applyAndGo(cfg: {
    baseStake: number
    startingCapital: number
    deckVariant: DeckVariant
    endMode: GameEndMode
    maxRounds: number
    targetCapital: number
  }) {
    configureGame(cfg)
    onNavigate('lobby')
  }

  function handleContinue() {
    applyAndGo({
      baseStake,
      startingCapital,
      deckVariant: variant,
      endMode,
      maxRounds,
      targetCapital,
    })
  }

  function handleQuick(p: QuickPreset) {
    applyAndGo({
      baseStake: p.baseStake,
      startingCapital: p.startingCapital,
      deckVariant: p.deckVariant,
      endMode: p.endMode,
      maxRounds: p.maxRounds,
      targetCapital: p.targetCapital,
    })
  }

  function loadPresetIntoForm(p: QuickPreset) {
    setBaseStake(p.baseStake)
    setStartingCapital(p.startingCapital)
    setVariant(p.deckVariant)
    setEndMode(p.endMode)
    setMaxRounds(p.maxRounds)
    const mult = Math.round(p.targetCapital / Math.max(1, p.startingCapital))
    setTargetMult(TARGET_MULT_PRESETS.includes(mult) ? mult : 3)
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

      <div style={{ padding: 'max(20px, env(safe-area-inset-top, 0px)) 20px 0', position: 'relative' }}>
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
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: '0.02em' }}>
          Configurer la table
        </h1>
        <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>
          Presets 1-tap ou réglages détaillés.
        </p>
      </div>

      <div
        style={{
          padding: '20px 20px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          flex: 1,
          maxWidth: 440,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* 1-tap presets */}
        <p
          style={{
            color: '#5b636b',
            fontSize: 11,
            fontFamily: 'Plus Jakarta Sans',
            letterSpacing: '0.1em',
            fontWeight: 700,
            margin: '0 0 2px',
          }}
        >
          LANCER DIRECTEMENT
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {QUICK_PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleQuick(p)}
              onContextMenu={e => {
                e.preventDefault()
                loadPresetIntoForm(p)
              }}
              style={{
                textAlign: 'left',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${p.accent}40`,
                borderRadius: 16,
                padding: '14px 12px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{p.icon}</span>
                <span className="font-display" style={{ color: p.accent, fontSize: 14, fontWeight: 800 }}>
                  {p.title}
                </span>
              </div>
              <p style={{ color: '#A9B0B7', fontSize: 11, margin: 0, lineHeight: 1.35 }}>{p.blurb}</p>
              <p style={{ color: p.accent, fontSize: 10, fontWeight: 700, margin: '8px 0 0', letterSpacing: '0.06em' }}>
                JOUER →
              </p>
            </button>
          ))}
        </div>
        <p style={{ color: '#5b636b', fontSize: 11, margin: '0 0 8px' }}>
          Appui long sur un preset pour le charger dans les réglages ci-dessous sans lancer.
        </p>

        <p
          style={{
            color: '#5b636b',
            fontSize: 11,
            fontFamily: 'Plus Jakarta Sans',
            letterSpacing: '0.1em',
            fontWeight: 700,
            margin: '8px 0 0',
          }}
        >
          RÉGLAGES FINS
        </p>

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

        <StepperRow
          label="Fin"
          value={END_MODE_OPTIONS[endModeIndex].label}
          onPrev={() => {
            const next = END_MODE_OPTIONS[cycleIndex(endModeIndex, END_MODE_OPTIONS.length, -1)]
            setEndMode(next.id)
          }}
          onNext={() => {
            const next = END_MODE_OPTIONS[cycleIndex(endModeIndex, END_MODE_OPTIONS.length, 1)]
            setEndMode(next.id)
          }}
        />

        {endMode === 'fixedRounds' && (
          <StepperRow
            label="Rounds"
            value={`Max ${maxRounds}`}
            onPrev={() => setMaxRounds(MAX_ROUNDS_PRESETS[cycleIndex(maxRoundsIndex, MAX_ROUNDS_PRESETS.length, -1)])}
            onNext={() => setMaxRounds(MAX_ROUNDS_PRESETS[cycleIndex(maxRoundsIndex, MAX_ROUNDS_PRESETS.length, 1)])}
          />
        )}

        {endMode === 'raceToCapital' && (
          <StepperRow
            label="Objectif"
            value={`${targetCapital.toLocaleString('fr-FR')} FCFA`}
            onPrev={() => setTargetMult(TARGET_MULT_PRESETS[cycleIndex(targetMultIndex, TARGET_MULT_PRESETS.length, -1)])}
            onNext={() => setTargetMult(TARGET_MULT_PRESETS[cycleIndex(targetMultIndex, TARGET_MULT_PRESETS.length, 1)])}
          />
        )}

        <p style={{ color: '#5b636b', fontSize: 11, margin: '4px 0 0', lineHeight: 1.45 }}>
          {END_MODE_OPTIONS[endModeIndex].hint}. Un capital sous la mise élimine le joueur.
        </p>
      </div>

      <div
        style={{
          padding: '12px 20px max(20px, env(safe-area-inset-bottom, 0px))',
          maxWidth: 440,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <button
          type="button"
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

      <button type="button" onClick={onPrev} aria-label={`${label} précédente`} style={stepperBtnStyle}>
        ‹
      </button>

      <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
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

      <button type="button" onClick={onNext} aria-label={`${label} suivante`} style={stepperBtnStyle}>
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
