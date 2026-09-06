import { useState } from 'react'
import PlayingCard from '../components/PlayingCard'
import type { Screen, Suit } from '../types'

const SECTIONS = [
  { id: 'cards', title: 'Les cartes', icon: '🃏' },
  { id: 'deal', title: 'Distribution', icon: '🤲' },
  { id: 'follow', title: 'Suivre la couleur', icon: '♥' },
  { id: 'win', title: 'Gagner un pli', icon: '🏆' },
  { id: 'combos', title: 'Les combos', icon: '⚡' },
  { id: 'special', title: 'Règles spéciales', icon: '✨' },
  { id: 'elim', title: 'Élimination', icon: '💀' },
]

/** Aligné sur deck.ts VALUE_ORDER + retrait de la plus forte Pique. */
const VARIANTS = [
  {
    id: '8',
    label: 'Variante 8',
    values: ['3', '4', '5', '6', '7', '8'] as const,
    size: 23,
    mode: 'partie courte',
  },
  {
    id: '9',
    label: 'Variante 9',
    values: ['3', '4', '5', '6', '7', '8', '9'] as const,
    size: 27,
    mode: 'certains modes',
  },
  {
    id: '10',
    label: 'Variante 10',
    values: ['3', '4', '5', '6', '7', '8', '9', '10'] as const,
    size: 31,
    mode: 'mode Vitesse',
  },
  {
    id: 'as',
    label: 'Variante As',
    values: ['3', '4', '5', '6', '7', '8', '9', '10', 'A'] as const,
    size: 35,
    mode: 'mode Classique',
  },
]

export default function RulesScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [active, setActive] = useState('cards')

  const CONTENT: Record<string, React.ReactNode> = {
    cards: (
      <div>
        <p style={{ color: '#A9B0B7', fontSize: 14, marginBottom: 12 }}>
          Kora ne se joue PAS avec un paquet de 52 cartes classique. Il n'y a jamais de Valet, de Dame ou de Roi —
          après le 10, on passe directement à l'As. Quatre variantes de paquet existent selon le mode de jeu :
        </p>

        {VARIANTS.map(v => (
          <div
            key={v.id}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="font-display" style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
                {v.label}
              </span>
              <span style={{ color: '#D6A84F', fontSize: 11 }}>
                {v.size} cartes · {v.mode}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {v.values.map((val, i) => (
                <PlayingCard key={i} suit="♠" value={val} size="xs" />
              ))}
            </div>
          </div>
        ))}

        <div
          style={{
            background: 'rgba(201,75,75,0.08)',
            border: '1px solid rgba(201,75,75,0.25)',
            borderRadius: 14,
            padding: '12px 14px',
            marginBottom: 16,
          }}
        >
          <p style={{ color: '#C94B4B', fontSize: 12, margin: 0, fontWeight: 600 }}>
            ⚠️ La plus forte carte de Pique de la variante est retirée du paquet avant chaque partie (8 de Pique
            en variante 8, 9♠ en variante 9, 10♠ en variante 10, As de Pique en mode Classique). Cette carte
            n'existe donc jamais en jeu.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(
            [
              ['♥', 'Cœur', '#C94B4B'],
              ['♦', 'Carreau', '#C94B4B'],
              ['♣', 'Trèfle', '#4CAF76'],
              ['♠', 'Pique', '#A9B0B7'],
            ] as [Suit, string, string][]
          ).map(([s, name, color]) => (
            <div
              key={name}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${color}30`,
                borderRadius: 14,
                padding: '14px',
                textAlign: 'center',
              }}
            >
              <p style={{ color, fontSize: 28, margin: '0 0 4px' }}>{s}</p>
              <p style={{ color: '#fff', fontSize: 13, fontFamily: 'Plus Jakarta Sans', fontWeight: 600, margin: 0 }}>
                {name}
              </p>
            </div>
          ))}
        </div>
      </div>
    ),
    deal: (
      <div>
        <p style={{ color: '#A9B0B7', fontSize: 14, marginBottom: 20 }}>
          Au début de chaque round, chaque joueur reçoit <strong style={{ color: '#fff' }}>5 cartes</strong>,
          distribuées en deux temps : <strong style={{ color: '#fff' }}>3 cartes</strong> d'abord (un tour complet
          de table), puis <strong style={{ color: '#fff' }}>2 cartes</strong> supplémentaires (un second tour
          complet).
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: -16, marginBottom: 20 }}>
          {([0, 1, 2, 3, 4] as const).map(i => (
            <div
              key={i}
              style={{
                transform: `rotate(${(i - 2) * 8}deg) translateY(${Math.abs(i - 2) * 4}px)`,
                marginLeft: i > 0 ? -20 : 0,
                zIndex: i,
              }}
            >
              <PlayingCard suit="♠" value="A" state="back" size="md" />
            </div>
          ))}
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '14px 16px',
          }}
        >
          <p style={{ color: '#fff', fontSize: 13, margin: '0 0 8px', fontFamily: 'Plus Jakarta Sans', fontWeight: 600 }}>
            Qui a la main ?
          </p>
          <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 4px' }}>
            • Pour le tout premier round de la partie, le joueur "à la main" est tiré au sort.
          </p>
          <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 4px' }}>
            • Pour les rounds suivants, la main passe au joueur assis juste après celui qui a remporté le round
            précédent.
          </p>
          <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>
            • Le joueur "à la main" ouvre le premier pli du round.
          </p>
        </div>
      </div>
    ),
    follow: (
      <div>
        <div
          style={{
            background: 'rgba(201,75,75,0.1)',
            border: '1.5px solid rgba(201,75,75,0.3)',
            borderRadius: 16,
            padding: '16px',
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          <p
            style={{
              color: '#C94B4B',
              fontSize: 11,
              fontFamily: 'Plus Jakarta Sans',
              letterSpacing: '0.1em',
              margin: '0 0 8px',
            }}
          >
            COULEUR DEMANDÉE
          </p>
          <p style={{ fontSize: 48, color: '#C94B4B', margin: 0, lineHeight: 1 }}>♥</p>
          <p style={{ color: '#A9B0B7', fontSize: 12, margin: '8px 0 0' }}>
            Cœur demandé — tu dois jouer un cœur si tu en as
          </p>
        </div>
        <p style={{ color: '#A9B0B7', fontSize: 14, marginBottom: 12 }}>
          Règle fondamentale : le joueur qui ouvre le pli joue la carte de son choix, et sa couleur devient la
          couleur demandée. Chaque joueur suivant doit <strong style={{ color: '#fff' }}>obligatoirement</strong>{' '}
          jouer une carte de cette couleur s'il en possède une.
        </p>
        <p style={{ color: '#A9B0B7', fontSize: 14 }}>
          Si tu n'as pas la couleur demandée, tu peux jouer n'importe quelle autre carte. Mais attention — ces
          cartes ne peuvent jamais gagner le pli, même si leur valeur est très élevée.
        </p>
      </div>
    ),
    win: (
      <div>
        <p style={{ color: '#A9B0B7', fontSize: 14, marginBottom: 20 }}>
          La <strong style={{ color: '#fff' }}>plus forte carte de la couleur demandée</strong> remporte le pli —
          les cartes des autres couleurs ne comptent pas, quelle que soit leur valeur.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'flex-end', marginBottom: 20 }}>
          {(['8', '4', '9', '5'] as const).map((v, i) => (
            <PlayingCard key={i} suit="♥" value={v} state={i === 2 ? 'winner' : 'played'} size="md" />
          ))}
        </div>
        <div
          style={{
            background: 'rgba(240,213,138,0.08)',
            border: '1px solid rgba(240,213,138,0.2)',
            borderRadius: 14,
            padding: '12px 16px',
            textAlign: 'center',
          }}
        >
          <span className="text-gold font-display" style={{ fontSize: 16, fontWeight: 700 }}>
            ♥ 9 remporte le pli !
          </span>
          <p style={{ color: '#A9B0B7', fontSize: 12, margin: '4px 0 0' }}>
            Le neuf de cœur est le plus fort parmi les cœurs joués
          </p>
        </div>
      </div>
    ),
    combos: (
      <div>
        <p style={{ color: '#A9B0B7', fontSize: 14, marginBottom: 8 }}>
          Le joueur qui remporte le <strong style={{ color: '#fff' }}>dernier pli (le 5e)</strong> remporte le
          round. Le multiplicateur de gain ne dépend PAS du nombre total de 3 dans sa main, mais du nombre de{' '}
          <strong style={{ color: '#fff' }}>cartes de valeur 3 jouées consécutivement en fin de manche</strong> par
          ce gagnant.
        </p>
        <p style={{ color: '#A9B0B7', fontSize: 13, marginBottom: 16 }}>
          Il n'existe qu'une seule carte de valeur 3 par couleur (4 au total dans tout le paquet) — le combo KMT,
          le plus rare, exige d'avoir gardé ET joué en dernier les 4 trois du paquet.
        </p>
        {[
          { name: 'Simple', mult: '×1', desc: '0 trois consécutif en fin de manche', color: '#A9B0B7' },
          { name: 'Kora', mult: '×2', desc: '1 trois joué en dernière carte', color: '#4CAF76' },
          { name: '33', mult: '×4', desc: '2 trois consécutifs en fin de manche', color: '#D6A84F' },
          { name: 'Trinity', mult: '×8', desc: '3 trois consécutifs en fin de manche', color: '#9B59B6' },
          { name: 'KMT', mult: '×16', desc: '4 trois consécutifs — les 4 trois du paquet', color: '#C94B4B' },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              background: `${c.color}08`,
              border: `1px solid ${c.color}25`,
              borderRadius: 14,
              padding: '12px 16px',
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
                background: `${c.color}15`,
                border: `1.5px solid ${c.color}40`,
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
            <div>
              <p className="font-display" style={{ color: c.color, fontSize: 15, fontWeight: 800, margin: '0 0 2px' }}>
                {c.name}
              </p>
              <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
    special: (
      <div>
        <p style={{ color: '#A9B0B7', fontSize: 14, marginBottom: 16 }}>
          Vérifiées juste après la distribution, AVANT qu'aucune carte ne soit jouée. Si l'une d'elles se
          déclenche, le round s'arrête immédiatement, toutes les mains sont révélées, et le multiplicateur est
          toujours ×1 (indépendamment de la règle spéciale déclenchée).
        </p>
        {[
          {
            name: 'FLUSH',
            color: '#D6A84F',
            desc: 'Les 5 cartes de la main sont de la même couleur.',
            cards: ['A', '9', '8', '7', '6'] as const,
            suit: '♠' as Suit,
          },
          {
            name: '21',
            color: '#4CAF76',
            desc: "La somme des 5 cartes de la main est exactement égale à 21 (l'As vaut 11).",
            expr: '3 + 4 + 5 + 4 + 5 = 21',
          },
          {
            name: 'T7',
            color: '#9B59B6',
            desc: 'Avoir au moins trois 7 dans sa main.',
            cards: ['7', '7', '7'] as const,
            suit: '♦' as Suit,
          },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              background: `${s.color}08`,
              border: `1.5px solid ${s.color}30`,
              borderRadius: 18,
              padding: '18px',
              marginBottom: 14,
            }}
          >
            <div className="font-display" style={{ color: s.color, fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
              {s.name}
            </div>
            <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 12px' }}>{s.desc}</p>
            {s.cards && (
              <div style={{ display: 'flex', gap: 6 }}>
                {s.cards.map((v, ci) => (
                  <PlayingCard key={ci} suit={s.suit!} value={v} state="winner" size="sm" />
                ))}
              </div>
            )}
            {s.expr && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 10,
                  padding: '8px 14px',
                  display: 'inline-block',
                }}
              >
                <span className="font-display" style={{ color: s.color, fontSize: 14, fontWeight: 700 }}>
                  {s.expr}
                </span>
              </div>
            )}
          </div>
        ))}
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '12px 14px',
          }}
        >
          <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>
            💡 Comme l'As vaut 11 points, dès qu'une main contient un As, la règle "21" devient quasiment
            impossible à atteindre (11 + 4 cartes d'au moins 3 points chacune dépasse toujours 21).
          </p>
        </div>
      </div>
    ),
    elim: (
      <div>
        <div
          style={{
            background: 'rgba(201,75,75,0.1)',
            border: '1.5px solid rgba(201,75,75,0.3)',
            borderRadius: 20,
            padding: '24px',
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 40, margin: '0 0 8px' }}>💀</p>
          <p className="font-display" style={{ color: '#C94B4B', fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>
            JOUEUR ÉLIMINÉ
          </p>
          <div className="font-display" style={{ color: '#C94B4B', fontSize: 32, fontWeight: 800, margin: '0 0 4px' }}>
            mise de base
          </div>
          <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0 }}>
            Capital insuffisant pour continuer (500 FCFA par défaut)
          </p>
        </div>
        <p style={{ color: '#A9B0B7', fontSize: 14, marginBottom: 12 }}>
          La mise de base est définie avant le début de la partie — <strong style={{ color: '#fff' }}>500 FCFA</strong>{' '}
          n'est qu'une valeur par défaut, pas un montant fixe. Lorsque le capital d'un joueur tombe sous ce seuil,
          il est éliminé de la partie.
        </p>
        <p style={{ color: '#A9B0B7', fontSize: 14 }}>
          La partie se termine dès qu'il ne reste plus qu'un seul joueur non éliminé : c'est le vainqueur, avec
          tout le capital accumulé au fil des rounds (chaque round redistribue simplement les mises entre
          joueurs — il n'y a pas de pot séparé à remporter en fin de partie).
        </p>
      </div>
    ),
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

      <div style={{ padding: '20px 20px 0', flexShrink: 0, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
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
              flexShrink: 0,
            }}
          >
            ←
          </button>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
            Règles & Tutoriel
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                padding: '7px 12px',
                borderRadius: 10,
                border: active === s.id ? '1.5px solid rgba(214,168,79,0.5)' : '1px solid rgba(255,255,255,0.1)',
                background: active === s.id ? 'rgba(214,168,79,0.12)' : 'rgba(255,255,255,0.04)',
                color: active === s.id ? '#D6A84F' : '#A9B0B7',
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
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div className="anim-fade-in" key={active}>
          {CONTENT[active]}
        </div>
      </div>
    </div>
  )
}
