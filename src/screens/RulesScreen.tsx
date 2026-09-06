import { useMemo, useState, type ReactNode } from 'react'
import PlayingCard from '../components/PlayingCard'
import type { CardValue, Screen, Suit } from '../types'

// ==========================================================================
// RulesScreen — tutoriel complet, aligné sur le moteur (deck / combos / fin).
// ==========================================================================

type SectionId = 'cards' | 'deal' | 'follow' | 'win' | 'combos' | 'special' | 'end'

const SECTIONS: { id: SectionId; title: string; icon: string }[] = [
  { id: 'cards', title: 'Les cartes', icon: '🃏' },
  { id: 'deal', title: 'Distribution', icon: '🤲' },
  { id: 'follow', title: 'Couleur', icon: '♥' },
  { id: 'win', title: 'Plis', icon: '🏆' },
  { id: 'combos', title: 'Combos', icon: '⚡' },
  { id: 'special', title: 'Spéciales', icon: '✨' },
  { id: 'end', title: 'Fin de partie', icon: '🏁' },
]

const VARIANTS: {
  id: string
  label: string
  values: readonly CardValue[]
  size: number
  mode: string
  removedSpade: string
}[] = [
  {
    id: '8',
    label: 'Variante 8',
    values: ['3', '4', '5', '6', '7', '8'],
    size: 23,
    mode: 'Partie courte',
    removedSpade: '8♠',
  },
  {
    id: '9',
    label: 'Variante 9',
    values: ['3', '4', '5', '6', '7', '8', '9'],
    size: 27,
    mode: 'Standard',
    removedSpade: '9♠',
  },
  {
    id: '10',
    label: 'Variante 10',
    values: ['3', '4', '5', '6', '7', '8', '9', '10'],
    size: 31,
    mode: 'Vitesse',
    removedSpade: '10♠',
  },
  {
    id: 'as',
    label: 'Variante As',
    values: ['3', '4', '5', '6', '7', '8', '9', '10', 'A'],
    size: 35,
    mode: 'Classique',
    removedSpade: 'A♠',
  },
]

const SUITS: { suit: Suit; name: string; color: string }[] = [
  { suit: '♥', name: 'Cœur', color: '#C94B4B' },
  { suit: '♦', name: 'Carreau', color: '#C94B4B' },
  { suit: '♣', name: 'Trèfle', color: '#4CAF76' },
  { suit: '♠', name: 'Pique', color: '#A9B0B7' },
]

const COMBOS = [
  { name: 'Simple', mult: '×1', desc: 'Aucun 3 en fin de manche', color: '#A9B0B7', threes: 0 },
  { name: 'Kora', mult: '×2', desc: 'Un 3 joué en dernière carte', color: '#4CAF76', threes: 1 },
  { name: '33', mult: '×4', desc: 'Deux 3 consécutifs en fin de manche', color: '#D6A84F', threes: 2 },
  { name: 'Trinity', mult: '×8', desc: 'Trois 3 consécutifs en fin de manche', color: '#9B59B6', threes: 3 },
  { name: 'KMT', mult: '×16', desc: 'Les quatre 3 du paquet, joués en dernier', color: '#C94B4B', threes: 4 },
]

function Body({ children }: { children: ReactNode }) {
  return <p style={{ color: '#A9B0B7', fontSize: 14, lineHeight: 1.55, margin: '0 0 14px' }}>{children}</p>
}

function Strong({ children }: { children: ReactNode }) {
  return <strong style={{ color: '#fff', fontWeight: 700 }}>{children}</strong>
}

function Callout({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'warn' | 'gold' | 'ok'
  children: ReactNode
}) {
  const styles =
    tone === 'warn'
      ? { bg: 'rgba(201,75,75,0.1)', border: 'rgba(201,75,75,0.3)', color: '#E8A0A0' }
      : tone === 'gold'
        ? { bg: 'rgba(214,168,79,0.1)', border: 'rgba(214,168,79,0.3)', color: '#F0D58A' }
        : tone === 'ok'
          ? { bg: 'rgba(76,175,118,0.1)', border: 'rgba(76,175,118,0.3)', color: '#8FD4A8' }
          : { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', color: '#A9B0B7' }
  return (
    <div
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: 14,
        padding: '12px 14px',
        marginBottom: 14,
      }}
    >
      <div style={{ color: styles.color, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{children}</div>
    </div>
  )
}

function Card({
  title,
  children,
  accent,
}: {
  title?: string
  children: ReactNode
  accent?: string
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${accent ? `${accent}35` : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 16,
        padding: '14px 16px',
        marginBottom: 12,
      }}
    >
      {title && (
        <p
          className="font-display"
          style={{
            color: accent ?? '#fff',
            fontSize: 13,
            fontWeight: 700,
            margin: '0 0 8px',
            letterSpacing: '0.02em',
          }}
        >
          {title}
        </p>
      )}
      {children}
    </div>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          background: 'rgba(214,168,79,0.15)',
          border: '1px solid rgba(214,168,79,0.4)',
          color: '#D6A84F',
          fontSize: 12,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontFamily: 'Plus Jakarta Sans',
        }}
      >
        {n}
      </div>
      <p style={{ color: '#A9B0B7', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{children}</p>
    </div>
  )
}

function SectionCards() {
  const [variantId, setVariantId] = useState(VARIANTS[3].id)
  const variant = VARIANTS.find(v => v.id === variantId) ?? VARIANTS[3]

  return (
    <div>
      <Body>
        Kora ne se joue <Strong>pas</Strong> avec un paquet de 52 cartes. Pas de Valet, Dame ni Roi — après le 10
        vient directement l'As. Quatre tailles de paquet sont proposées à la configuration de table.
      </Body>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 4 }}>
        {VARIANTS.map(v => {
          const active = v.id === variantId
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setVariantId(v.id)}
              style={{
                padding: '8px 12px',
                borderRadius: 12,
                border: active ? '1.5px solid rgba(214,168,79,0.55)' : '1px solid rgba(255,255,255,0.1)',
                background: active ? 'rgba(214,168,79,0.14)' : 'rgba(255,255,255,0.04)',
                color: active ? '#F0D58A' : '#A9B0B7',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {v.label}
            </button>
          )
        })}
      </div>

      <Card accent="#D6A84F">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span className="font-display" style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>
            {variant.label}
          </span>
          <span style={{ color: '#D6A84F', fontSize: 12 }}>
            {variant.size} cartes · {variant.mode}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {variant.values.map(val => (
            <PlayingCard key={val} suit="♥" value={val} size="xs" />
          ))}
        </div>
        <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>
          Plus forte carte retirée : <Strong>{variant.removedSpade}</Strong> (jamais en jeu).
        </p>
      </Card>

      <Callout tone="warn">
        Avant chaque distribution, la <Strong>plus forte carte de Pique</Strong> de la variante est retirée du
        paquet. Ex. : 8♠, 9♠, 10♠ ou A♠ selon la variante choisie.
      </Callout>

      <p
        className="font-display"
        style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '4px 0 10px' }}
      >
        Les quatre couleurs
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {SUITS.map(s => (
          <div
            key={s.suit}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${s.color}35`,
              borderRadius: 14,
              padding: '14px 10px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: s.color, fontSize: 28, margin: '0 0 4px', lineHeight: 1 }}>{s.suit}</p>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0, fontFamily: 'Plus Jakarta Sans' }}>
              {s.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionDeal() {
  return (
    <div>
      <Body>
        Chaque round, chaque joueur reçoit <Strong>5 cartes</Strong>, en deux tours de table : d'abord{' '}
        <Strong>3 cartes</Strong>, puis <Strong>2 cartes</Strong>.
      </Body>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          minHeight: 110,
          marginBottom: 18,
        }}
      >
        {([0, 1, 2, 3, 4] as const).map(i => (
          <div
            key={i}
            style={{
              transform: `rotate(${(i - 2) * 9}deg) translateY(${Math.abs(i - 2) * 5}px)`,
              marginLeft: i > 0 ? -22 : 0,
              zIndex: i,
            }}
          >
            <PlayingCard suit="♠" value="A" state="back" size="md" />
          </div>
        ))}
      </div>

      <Card title="Qui a la main ?">
        <Step n={1}>
          Au <Strong>premier round</Strong>, le joueur à la main est choisi (solo : siège 0 / online : règle de
          table).
        </Step>
        <Step n={2}>
          Aux rounds suivants, la main passe au joueur <Strong>juste après</Strong> celui qui a remporté le round
          précédent.
        </Step>
        <Step n={3}>
          Le joueur à la main <Strong>ouvre le premier pli</Strong> du round.
        </Step>
      </Card>

      <Callout tone="gold">
        Après la distribution, les <Strong>règles spéciales</Strong> (Flush, 21, T7) sont vérifiées avant tout
        pli. Si l'une se déclenche, le round s'arrête immédiatement.
      </Callout>
    </div>
  )
}

function SectionFollow() {
  return (
    <div>
      <Body>
        Le joueur qui ouvre le pli choisit une carte : sa couleur devient la{' '}
        <Strong>couleur demandée</Strong>. Les autres doivent la suivre s'ils le peuvent.
      </Body>

      <div
        style={{
          background: 'linear-gradient(160deg, rgba(201,75,75,0.16), rgba(16,21,26,0.4))',
          border: '1.5px solid rgba(201,75,75,0.35)',
          borderRadius: 18,
          padding: '18px 16px',
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        <p
          style={{
            color: '#C94B4B',
            fontSize: 11,
            fontFamily: 'Plus Jakarta Sans',
            letterSpacing: '0.12em',
            margin: '0 0 8px',
            fontWeight: 700,
          }}
        >
          COULEUR DEMANDÉE
        </p>
        <p style={{ fontSize: 52, color: '#C94B4B', margin: 0, lineHeight: 1 }}>♥</p>
        <p style={{ color: '#A9B0B7', fontSize: 13, margin: '10px 0 0' }}>
          Cœur demandé — tu dois jouer un cœur si tu en as
        </p>
      </div>

      <Card title="Exemple — main possible">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <PlayingCard suit="♥" value="6" size="sm" state="playable" />
          <PlayingCard suit="♥" value="9" size="sm" state="playable" />
          <PlayingCard suit="♠" value="8" size="sm" state="disabled" />
          <PlayingCard suit="♦" value="A" size="sm" state="disabled" />
          <PlayingCard suit="♣" value="4" size="sm" state="disabled" />
        </div>
        <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>
          Seuls les <Strong>cœurs</Strong> sont jouables. Les autres couleurs sont grisées.
        </p>
      </Card>

      <Callout tone="warn">
        Si tu n'as <Strong>pas</Strong> la couleur demandée, tu peux défausser n'importe quelle carte
        — mais elle <Strong>ne peut jamais gagner le pli</Strong>, même un As hors couleur.
      </Callout>
    </div>
  )
}

function SectionWin() {
  return (
    <div>
      <Body>
        Seule compte la <Strong>plus forte carte de la couleur demandée</Strong>. Les cartes d'une autre
        couleur sont ignorées pour le gain du pli.
      </Body>

      <Card title="Pli en cœur">
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            alignItems: 'flex-end',
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          {(
            [
              { v: '8' as CardValue, state: 'played' as const },
              { v: '4' as CardValue, state: 'played' as const },
              { v: '9' as CardValue, state: 'winner' as const },
              { v: '5' as CardValue, state: 'played' as const },
            ] as const
          ).map((c, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <PlayingCard suit="♥" value={c.v} state={c.state} size="md" />
              <p style={{ color: c.state === 'winner' ? '#F0D58A' : '#5b636b', fontSize: 10, margin: '6px 0 0' }}>
                {c.state === 'winner' ? 'Gagne' : '—'}
              </p>
            </div>
          ))}
        </div>
        <Callout tone="gold">♥9 remporte le pli — plus fort cœur joué.</Callout>
      </Card>

      <Card title="Hors couleur = jamais gagnant">
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          <PlayingCard suit="♥" value="5" state="winner" size="sm" />
          <PlayingCard suit="♠" value="A" state="played" size="sm" />
          <PlayingCard suit="♥" value="3" state="played" size="sm" />
          <PlayingCard suit="♦" value="10" state="played" size="sm" />
        </div>
        <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>
          Cœur demandé : le <Strong>5♥</Strong> bat l'As de Pique et le 10 de Carreau.
        </p>
      </Card>

      <Body>
        Un round compte <Strong>5 plis</Strong>. Le joueur qui gagne le <Strong>5ᵉ pli</Strong> remporte le
        round (sauf règle spéciale avant le premier pli).
      </Body>
    </div>
  )
}

function SectionCombos() {
  return (
    <div>
      <Body>
        Le multiplicateur dépend du nombre de <Strong>cartes de valeur 3 jouées consécutivement en fin de
        manche</Strong> par le gagnant du 5ᵉ pli — pas du total de 3 dans sa main au départ.
      </Body>

      <Callout tone="neutral">
        Il n'existe qu'un seul 3 par couleur (<Strong>4 trois</Strong> dans tout le paquet). Le KMT
        exige de les avoir tous joués en dernière position.
      </Callout>

      {COMBOS.map(c => (
        <div
          key={c.name}
          style={{
            background: `${c.color}0c`,
            border: `1px solid ${c.color}30`,
            borderRadius: 14,
            padding: '12px 14px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: `${c.color}18`,
              border: `1.5px solid ${c.color}45`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span className="font-display" style={{ color: c.color, fontSize: 14, fontWeight: 800 }}>
              {c.mult}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="font-display" style={{ color: c.color, fontSize: 15, fontWeight: 800, margin: '0 0 2px' }}>
              {c.name}
            </p>
            <p style={{ color: '#A9B0B7', fontSize: 12, margin: '0 0 6px' }}>{c.desc}</p>
            {c.threes > 0 && (
              <div style={{ display: 'flex', gap: 3 }}>
                {(['♥', '♦', '♣', '♠'] as Suit[]).slice(0, c.threes).map((suit, i) => (
                  <PlayingCard key={i} suit={suit} value="3" size="xs" />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      <Callout tone="gold">
        Les perdants paient la mise × multiplicateur. Un joueur qui est allé en <Strong>banque</Strong> ne paie
        que la mise de base (×1).
      </Callout>
    </div>
  )
}

function SectionSpecial() {
  return (
    <div>
      <Body>
        Vérifiées <Strong>juste après la distribution</Strong>, avant tout pli. Si une règle se déclenche : le
        round s'arrête, les mains sont révélées, multiplicateur toujours <Strong>×1</Strong>.
      </Body>

      <div
        style={{
          background: 'rgba(214,168,79,0.08)',
          border: '1.5px solid rgba(214,168,79,0.3)',
          borderRadius: 18,
          padding: '16px',
          marginBottom: 12,
        }}
      >
        <div className="font-display" style={{ color: '#D6A84F', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          FLUSH
        </div>
        <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 12px' }}>
          Les 5 cartes de la main sont de la <Strong>même couleur</Strong>.
        </p>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {(['A', '9', '8', '7', '6'] as CardValue[]).map(v => (
            <PlayingCard key={v} suit="♠" value={v} state="winner" size="sm" />
          ))}
        </div>
      </div>

      <div
        style={{
          background: 'rgba(76,175,118,0.08)',
          border: '1.5px solid rgba(76,175,118,0.3)',
          borderRadius: 18,
          padding: '16px',
          marginBottom: 12,
        }}
      >
        <div className="font-display" style={{ color: '#4CAF76', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          21
        </div>
        <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 10px' }}>
          La somme des 5 cartes vaut <Strong>exactement 21</Strong> (l'As vaut 11).
        </p>
        <div
          style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding: '8px 12px',
          }}
        >
          <span className="font-display" style={{ color: '#4CAF76', fontSize: 14, fontWeight: 700 }}>
            3 + 4 + 5 + 4 + 5 = 21
          </span>
        </div>
      </div>

      <div
        style={{
          background: 'rgba(155,89,182,0.1)',
          border: '1.5px solid rgba(155,89,182,0.35)',
          borderRadius: 18,
          padding: '16px',
          marginBottom: 12,
        }}
      >
        <div className="font-display" style={{ color: '#9B59B6', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          T7
        </div>
        <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 12px' }}>
          Au moins <Strong>trois 7</Strong> dans la main.
        </p>
        <div style={{ display: 'flex', gap: 5 }}>
          {(['♥', '♦', '♣'] as Suit[]).map(suit => (
            <PlayingCard key={suit} suit={suit} value="7" state="winner" size="sm" />
          ))}
        </div>
      </div>

      <Callout tone="neutral">
        Avec un As (11 pts), la règle « 21 » devient quasi impossible : 11 + quatre cartes ≥ 3 dépassent déjà
        21.
      </Callout>
    </div>
  )
}

function SectionEnd() {
  return (
    <div>
      <Body>
        À chaque round, les mises sont redistribuées entre joueurs. Un capital qui tombe sous la{' '}
        <Strong>mise de base</Strong> (seuil d'élimination) fait sortir le joueur.
      </Body>

      <div
        style={{
          background: 'rgba(201,75,75,0.1)',
          border: '1.5px solid rgba(201,75,75,0.35)',
          borderRadius: 20,
          padding: '22px 18px',
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        <p style={{ fontSize: 36, margin: '0 0 6px' }}>💀</p>
        <p className="font-display" style={{ color: '#C94B4B', fontSize: 18, fontWeight: 800, margin: '0 0 6px' }}>
          JOUEUR ÉLIMINÉ
        </p>
        <p className="font-display" style={{ color: '#C94B4B', fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>
          capital {'<'} mise
        </p>
        <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>Ex. mise 500 FCFA → éliminé sous 500</p>
      </div>

      <p
        className="font-display"
        style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}
      >
        Modes de fin (solo)
      </p>

      {[
        {
          title: 'Hybride (recommandé)',
          color: '#D6A84F',
          desc: 'Élimination active + plafond de rounds. Au plafond, le plus riche gagne.',
        },
        {
          title: 'Élimination',
          color: '#C94B4B',
          desc: 'Jusqu’au dernier survivant.',
        },
        {
          title: 'Course',
          color: '#4CAF76',
          desc: 'Premier à atteindre l’objectif de capital (sinon élimination possible).',
        },
      ].map(m => (
        <Card key={m.title} title={m.title} accent={m.color}>
          <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0, lineHeight: 1.45 }}>{m.desc}</p>
        </Card>
      ))}

      <Callout tone="ok">
        Online (table cash) : un siège sous le seuil se <Strong>libère</Strong> pour un nouveau joueur ; le
        capital restant peut revenir au wallet au cash-out.
      </Callout>

      <Card title="Banque (en cours de round)">
        <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          Aller en banque retire le joueur des plis restants. Il paie seulement la mise de base si le round se
          termine normalement — utile pour limiter les pertes face à un gros combo.
        </p>
      </Card>
    </div>
  )
}

export default function RulesScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [active, setActive] = useState<SectionId>('cards')
  const index = SECTIONS.findIndex(s => s.id === active)

  const content = useMemo(() => {
    switch (active) {
      case 'cards':
        return <SectionCards />
      case 'deal':
        return <SectionDeal />
      case 'follow':
        return <SectionFollow />
      case 'win':
        return <SectionWin />
      case 'combos':
        return <SectionCombos />
      case 'special':
        return <SectionSpecial />
      case 'end':
        return <SectionEnd />
    }
  }, [active])

  function go(delta: -1 | 1) {
    const next = SECTIONS[index + delta]
    if (next) setActive(next.id)
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
      <div className="pattern-african" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.45 }} />

      {/* Header */}
      <div
        style={{
          padding: 'max(16px, env(safe-area-inset-top, 0px)) 20px 0',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
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
              flexShrink: 0,
            }}
          >
            ←
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
              Règles & Tutoriel
            </h1>
            <p style={{ color: '#5b636b', fontSize: 12, margin: '2px 0 0' }}>
              {index + 1} / {SECTIONS.length} · {SECTIONS[index].title}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div
          style={{
            height: 3,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 99,
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: `${((index + 1) / SECTIONS.length) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #176B50, #D6A84F)',
              borderRadius: 99,
              transition: 'width 0.35s ease',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10 }}>
          {SECTIONS.map(s => {
            const isActive = active === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 10,
                  border: isActive ? '1.5px solid rgba(214,168,79,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  background: isActive ? 'rgba(214,168,79,0.12)' : 'rgba(255,255,255,0.04)',
                  color: isActive ? '#D6A84F' : '#A9B0B7',
                  fontFamily: 'Plus Jakarta Sans',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{s.icon}</span>
                <span>{s.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px 20px 12px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="anim-fade-in" key={active}>
          {content}
        </div>
      </div>

      {/* Footer nav */}
      <div
        style={{
          flexShrink: 0,
          padding: '12px 20px max(16px, env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          gap: 10,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, transparent, rgba(11,13,16,0.92))',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <button
          type="button"
          className="btn-secondary"
          disabled={index <= 0}
          onClick={() => go(-1)}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: 14,
            fontSize: 13,
            opacity: index <= 0 ? 0.4 : 1,
            cursor: index <= 0 ? 'default' : 'pointer',
          }}
        >
          ← Précédent
        </button>
        <button
          type="button"
          className={index >= SECTIONS.length - 1 ? 'btn-secondary' : 'btn-primary glow-gold'}
          onClick={() => {
            if (index >= SECTIONS.length - 1) onNavigate('home')
            else go(1)
          }}
          style={{ flex: 1, padding: '12px', borderRadius: 14, fontSize: 13 }}
        >
          {index >= SECTIONS.length - 1 ? 'Terminer' : 'Suivant →'}
        </button>
      </div>
    </div>
  )
}
