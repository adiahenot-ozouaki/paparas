import { useMemo, useState, type ReactNode } from 'react'
import PlayingCard from '../components/PlayingCard'
import type { CardValue, Screen, Suit } from '../types'
import { BackButton, UiButton } from '../components/ui'

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
  { id: '8', label: 'Variante 8', values: ['3', '4', '5', '6', '7', '8'], size: 23, mode: 'Partie courte', removedSpade: '8♠' },
  { id: '9', label: 'Variante 9', values: ['3', '4', '5', '6', '7', '8', '9'], size: 27, mode: 'Standard', removedSpade: '9♠' },
  { id: '10', label: 'Variante 10', values: ['3', '4', '5', '6', '7', '8', '9', '10'], size: 31, mode: 'Vitesse', removedSpade: '10♠' },
  { id: 'as', label: 'Variante As', values: ['3', '4', '5', '6', '7', '8', '9', '10', 'A'], size: 35, mode: 'Classique', removedSpade: 'A♠' },
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
  return <p className="rules-body">{children}</p>
}

function Strong({ children }: { children: ReactNode }) {
  return <strong className="rules-strong">{children}</strong>
}

function Callout({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'warn' | 'gold' | 'ok'
  children: ReactNode
}) {
  return (
    <div className={`rules-callout rules-callout--${tone}`}>
      <div className="rules-callout-inner">{children}</div>
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
    <div className="rules-card" style={accent ? { borderColor: `${accent}35` } : undefined}>
      {title && (
        <p className="font-display rules-card-title" style={accent ? { color: accent } : undefined}>
          {title}
        </p>
      )}
      {children}
    </div>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="rules-step">
      <div className="rules-step-num">{n}</div>
      <p className="rules-step-text">{children}</p>
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
      <div className="rules-chip-row">
        {VARIANTS.map(v => {
          const active = v.id === variantId
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setVariantId(v.id)}
              className={`rules-chip${active ? ' is-active' : ''}`}
            >
              {v.label}
            </button>
          )
        })}
      </div>
      <Card accent="#D6A84F">
        <div className="rules-variant-head">
          <span className="font-display rules-variant-name">{variant.label}</span>
          <span className="rules-variant-meta">
            {variant.size} cartes · {variant.mode}
          </span>
        </div>
        <div className="rules-card-row">
          {variant.values.map(val => (
            <PlayingCard key={val} suit="♥" value={val} size="xs" />
          ))}
        </div>
        <p className="rules-muted-sm">
          Plus forte carte retirée : <Strong>{variant.removedSpade}</Strong> (jamais en jeu).
        </p>
      </Card>
      <Callout tone="warn">
        Avant chaque distribution, la <Strong>plus forte carte de Pique</Strong> de la variante est retirée du
        paquet. Ex. : 8♠, 9♠, 10♠ ou A♠ selon la variante choisie.
      </Callout>
      <p className="font-display rules-h-sm">Les quatre couleurs</p>
      <div className="rules-suit-grid">
        {SUITS.map(s => (
          <div key={s.suit} className="rules-suit-cell" style={{ borderColor: `${s.color}35` }}>
            <p className="rules-suit-glyph" style={{ color: s.color }}>{s.suit}</p>
            <p className="rules-suit-name">{s.name}</p>
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
      <div className="rules-fan">
        {([0, 1, 2, 3, 4] as const).map(i => (
          <div
            key={i}
            className="rules-fan-card"
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
      <div className="rules-lead-banner">
        <p className="rules-lead-kicker">COULEUR DEMANDÉE</p>
        <p className="rules-lead-suit">♥</p>
        <p className="rules-muted rules-mt-10">Cœur demandé — tu dois jouer un cœur si tu en as</p>
      </div>
      <Card title="Exemple — main possible">
        <div className="rules-card-row rules-mb-10">
          <PlayingCard suit="♥" value="6" size="sm" state="playable" />
          <PlayingCard suit="♥" value="9" size="sm" state="playable" />
          <PlayingCard suit="♠" value="8" size="sm" state="disabled" />
          <PlayingCard suit="♦" value="A" size="sm" state="disabled" />
          <PlayingCard suit="♣" value="4" size="sm" state="disabled" />
        </div>
        <p className="rules-muted-sm">
          Seuls les <Strong>cœurs</Strong> sont jouables. Les autres couleurs sont grisées.
        </p>
      </Card>
      <Callout tone="warn">
        Si tu n'as <Strong>pas</Strong> la couleur demandée, tu peux défausser n'importe quelle carte — mais elle{' '}
        <Strong>ne peut jamais gagner le pli</Strong>, même un As hors couleur.
      </Callout>
    </div>
  )
}

function SectionWin() {
  return (
    <div>
      <Body>
        Seule compte la <Strong>plus forte carte de la couleur demandée</Strong>. Les cartes d'une autre couleur
        sont ignorées pour le gain du pli.
      </Body>
      <Card title="Pli en cœur">
        <div className="rules-trick-row">
          {(
            [
              { v: '8' as CardValue, state: 'played' as const },
              { v: '4' as CardValue, state: 'played' as const },
              { v: '9' as CardValue, state: 'winner' as const },
              { v: '5' as CardValue, state: 'played' as const },
            ] as const
          ).map((c, i) => (
            <div key={i} className="rules-trick-cell">
              <PlayingCard suit="♥" value={c.v} state={c.state} size="md" />
              <p className={c.state === 'winner' ? 'rules-trick-win' : 'rules-trick-none'}>
                {c.state === 'winner' ? 'Gagne' : '—'}
              </p>
            </div>
          ))}
        </div>
        <Callout tone="gold">♥9 remporte le pli — plus fort cœur joué.</Callout>
      </Card>
      <Card title="Hors couleur = jamais gagnant">
        <div className="rules-card-row rules-mb-10">
          <PlayingCard suit="♥" value="5" state="winner" size="sm" />
          <PlayingCard suit="♠" value="A" state="played" size="sm" />
          <PlayingCard suit="♥" value="3" state="played" size="sm" />
          <PlayingCard suit="♦" value="10" state="played" size="sm" />
        </div>
        <p className="rules-muted-sm">
          Cœur demandé : le <Strong>5♥</Strong> bat l'As de Pique et le 10 de Carreau.
        </p>
      </Card>
      <Body>
        Un round compte <Strong>5 plis</Strong>. Le joueur qui gagne le <Strong>5ᵉ pli</Strong> remporte le round
        (sauf règle spéciale avant le premier pli).
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
        Il n'existe qu'un seul 3 par couleur (<Strong>4 trois</Strong> dans tout le paquet). Le KMT exige de les
        avoir tous joués en dernière position.
      </Callout>
      {COMBOS.map(c => (
        <div key={c.name} className="rules-combo-row" style={{ background: `${c.color}0c`, borderColor: `${c.color}30` }}>
          <div className="rules-combo-badge" style={{ background: `${c.color}18`, borderColor: `${c.color}45` }}>
            <span className="font-display" style={{ color: c.color }}>{c.mult}</span>
          </div>
          <div className="rules-combo-body">
            <p className="font-display rules-combo-name" style={{ color: c.color }}>{c.name}</p>
            <p className="rules-muted-sm rules-mb-6">{c.desc}</p>
            {c.threes > 0 && (
              <div className="rules-card-row-tight">
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
      <div className="rules-special rules-special--gold">
        <div className="font-display rules-special-title rules-special-title--gold">FLUSH</div>
        <p className="rules-muted rules-mb-12">
          Les 5 cartes de la main sont de la <Strong>même couleur</Strong>.
        </p>
        <div className="rules-card-row">
          {(['A', '9', '8', '7', '6'] as CardValue[]).map(v => (
            <PlayingCard key={v} suit="♠" value={v} state="winner" size="sm" />
          ))}
        </div>
      </div>
      <div className="rules-special rules-special--green">
        <div className="font-display rules-special-title rules-special-title--green">21</div>
        <p className="rules-muted rules-mb-10">
          La somme des 5 cartes vaut <Strong>exactement 21</Strong> (l'As vaut 11).
        </p>
        <div className="rules-special-eq">
          <span className="font-display rules-special-eq-text">3 + 4 + 5 + 4 + 5 = 21</span>
        </div>
      </div>
      <div className="rules-special rules-special--purple">
        <div className="font-display rules-special-title rules-special-title--purple">T7</div>
        <p className="rules-muted rules-mb-12">
          Au moins <Strong>trois 7</Strong> dans la main.
        </p>
        <div className="rules-card-row">
          {(['♥', '♦', '♣'] as Suit[]).map(suit => (
            <PlayingCard key={suit} suit={suit} value="7" state="winner" size="sm" />
          ))}
        </div>
      </div>
      <Callout tone="neutral">
        Avec un As (11 pts), la règle « 21 » devient quasi impossible : 11 + quatre cartes ≥ 3 dépassent déjà 21.
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
      <div className="rules-elim">
        <p className="rules-elim-emoji">💀</p>
        <p className="font-display rules-elim-title">JOUEUR ÉLIMINÉ</p>
        <p className="font-display rules-elim-sub">Capital inférieur à la mise</p>
        <p className="rules-muted-sm">Ex. mise 500 FCFA → éliminé sous 500</p>
      </div>
      <p className="font-display rules-h-sm">Modes de fin (solo)</p>
      {[{
        title: 'Hybride (recommandé)',
        color: '#D6A84F',
        desc: 'Élimination active + plafond de rounds. Au plafond, le plus riche gagne.',
      }, {
        title: 'Élimination',
        color: '#C94B4B',
        desc: 'Jusqu’au dernier survivant.',
      }, {
        title: 'Course',
        color: '#4CAF76',
        desc: 'Premier à atteindre l’objectif de capital (sinon élimination possible).',
      }].map(m => (
        <Card key={m.title} title={m.title} accent={m.color}>
          <p className="rules-muted">{m.desc}</p>
        </Card>
      ))}
      <Callout tone="ok">
        Online (table cash) : un siège sous le seuil se <Strong>libère</Strong> pour un nouveau joueur ; le capital
        restant peut revenir au wallet au cash-out.
      </Callout>
      <Card title="Banque (en cours de round)">
        <p className="rules-muted">
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
      case 'cards': return <SectionCards />
      case 'deal': return <SectionDeal />
      case 'follow': return <SectionFollow />
      case 'win': return <SectionWin />
      case 'combos': return <SectionCombos />
      case 'special': return <SectionSpecial />
      case 'end': return <SectionEnd />
    }
  }, [active])

  function go(delta: -1 | 1) {
    const next = SECTIONS[index + delta]
    if (next) setActive(next.id)
  }

  return (
    <div className="rules-screen">
      <div className="pattern-african rules-pattern" aria-hidden />

      <div className="rules-layout">
        <aside className="rules-main">
          <header className="rules-header">
            <div className="rules-header-row">
              <BackButton absolute={false} onClick={() => onNavigate('home')} />
              <div className="rules-header-text">
                <h1 className="font-display rules-title">Règles & Tutoriel</h1>
                <p className="rules-subtitle">
                  {index + 1} / {SECTIONS.length} · {SECTIONS[index].title}
                </p>
              </div>
            </div>
            <div className="rules-progress">
              <div
                className="rules-progress-fill"
                style={{ width: `${((index + 1) / SECTIONS.length) * 100}%` }}
              />
            </div>
          </header>

          {/* Mobile horizontal tabs */}
          <div className="rules-tabs rules-tabs--mobile">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                className={`rules-tab${s.id === active ? ' is-active' : ''}`}
              >
                <span>{s.icon}</span>
                <span>{s.title}</span>
              </button>
            ))}
          </div>

          {/* Desktop sticky TOC */}
          <nav className="rules-toc" aria-label="Sections du tutoriel">
            <p className="rules-toc-label">Sommaire</p>
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                className={`rules-toc-item${s.id === active ? ' is-active' : ''}`}
              >
                <span className="rules-toc-num">{i + 1}</span>
                <span className="rules-toc-icon">{s.icon}</span>
                <span className="rules-toc-title">{s.title}</span>
              </button>
            ))}
          </nav>

          <div className="rules-side-nav">
            <UiButton variant="secondary" disabled={index <= 0} onClick={() => go(-1)} className="rules-nav-btn">
              ← Précédent
            </UiButton>
            <UiButton
              variant={index >= SECTIONS.length - 1 ? 'secondary' : 'primary'}
              onClick={() => {
                if (index >= SECTIONS.length - 1) onNavigate('home')
                else go(1)
              }}
              className={`rules-nav-btn${index < SECTIONS.length - 1 ? ' glow-gold' : ''}`}
            >
              {index >= SECTIONS.length - 1 ? 'Terminer' : 'Suivant →'}
            </UiButton>
          </div>
        </aside>

        <div className="rules-side">
          <div className="rules-content">
            <div className="anim-fade-in" key={active}>
              {content}
            </div>
          </div>

          <footer className="rules-footer rules-footer--mobile">
            <UiButton variant="secondary" disabled={index <= 0} onClick={() => go(-1)} className="rules-nav-btn">
              ← Précédent
            </UiButton>
            <UiButton
              variant={index >= SECTIONS.length - 1 ? 'secondary' : 'primary'}
              onClick={() => {
                if (index >= SECTIONS.length - 1) onNavigate('home')
                else go(1)
              }}
              className={`rules-nav-btn${index < SECTIONS.length - 1 ? ' glow-gold' : ''}`}
            >
              {index >= SECTIONS.length - 1 ? 'Terminer' : 'Suivant →'}
            </UiButton>
          </footer>
        </div>
      </div>
    </div>
  )
}
