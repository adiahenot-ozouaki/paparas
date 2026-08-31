import { useState } from 'react'
import type { Screen, DeckVariant } from '../types'
import { useGame } from '../game/GameContext'

const STAKE_PRESETS = [500, 1000, 2000, 5000]
const CAPITAL_PRESETS = [5000, 10000, 20000, 50000]

const VARIANT_OPTIONS: { id: DeckVariant; label: string; detail: string }[] = [
  { id: '9', label: 'Variante 9', detail: '3 à 9 — 27 cartes' },
  { id: '10', label: 'Variante 10', detail: '3 à 10 — 31 cartes · mode Vitesse' },
  { id: 'as', label: 'Variante As', detail: '3 à 10 + As — 35 cartes · mode Classique' },
]

export default function StakeConfigScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { stakeConfig, deckVariant, configureGame } = useGame()

  const [baseStake, setBaseStake] = useState(stakeConfig.baseStake)
  const [startingCapital, setStartingCapital] = useState(stakeConfig.startingCapital)
  const [variant, setVariant] = useState<DeckVariant>(deckVariant)

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

      {/* Header */}
      <div style={{ padding: '20px 20px 0', position: 'relative' }}>
        <button
          onClick={() => onNavigate('gameMode')}
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
        <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>Choisis la mise, le capital de départ et la variante de paquet.</p>
      </div>

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
        {/* Mise de base */}
        <section>
          <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Plus Jakarta Sans', margin: '0 0 10px' }}>
            Mise de base
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {STAKE_PRESETS.map(value => (
              <PresetButton
                key={value}
                selected={baseStake === value}
                label={`${value.toLocaleString('fr-FR')} FCFA`}
                onClick={() => setBaseStake(value)}
              />
            ))}
          </div>
          <p style={{ color: '#5b636b', fontSize: 11, margin: '8px 0 0' }}>
            Chaque round redistribue cette mise (×1 à ×16 selon le combo) entre les joueurs. C'est aussi le seuil
            d'élimination : un capital sous ce montant élimine le joueur.
          </p>
        </section>

        {/* Capital de départ */}
        <section>
          <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Plus Jakarta Sans', margin: '0 0 10px' }}>
            Capital de départ
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CAPITAL_PRESETS.map(value => (
              <PresetButton
                key={value}
                selected={startingCapital === value}
                label={`${value.toLocaleString('fr-FR')} FCFA`}
                onClick={() => setStartingCapital(value)}
              />
            ))}
          </div>
        </section>

        {/* Variante de paquet */}
        <section>
          <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Plus Jakarta Sans', margin: '0 0 10px' }}>
            Variante de paquet
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {VARIANT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setVariant(opt.id)}
                style={{
                  textAlign: 'left',
                  background: variant === opt.id ? 'rgba(214,168,79,0.12)' : 'rgba(255,255,255,0.04)',
                  border: variant === opt.id ? '1.5px solid rgba(214,168,79,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  padding: '12px 16px',
                  cursor: 'pointer',
                }}
              >
                <p
                  className="font-display"
                  style={{
                    color: variant === opt.id ? '#D6A84F' : '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    margin: '0 0 2px',
                  }}
                >
                  {opt.label}
                </p>
                <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>{opt.detail}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div style={{ padding: 20 }}>
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

function PresetButton({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? 'rgba(214,168,79,0.12)' : 'rgba(255,255,255,0.04)',
        border: selected ? '1.5px solid rgba(214,168,79,0.5)' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '12px 8px',
        color: selected ? '#D6A84F' : '#fff',
        fontFamily: 'Plus Jakarta Sans',
        fontWeight: 700,
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}
