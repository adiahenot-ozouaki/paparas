import type { Screen } from '../types'
import { useGame, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { COMBO_LABEL } from '../game/combo'
import { ACHIEVEMENTS, getUnlockedAchievements } from '../game/achievements'

// ==========================================================================
// ProfileScreen — entièrement rebranché sur le vrai état de jeu.
//
// Avant : capital, niveau, XP, statistiques et achievements étaient tous
// des nombres codés en dur ("47 500 FCFA", "342 parties", "Niv. 24"...),
// sans aucun lien avec les parties réellement jouées. Maintenant, tout
// provient de useGame() (players + lifetimeStats, voir game/GameContext).
//
// Il n'existe pas encore de vrai système de niveau/XP côté jeu : le niveau
// affiché est calculé simplement à partir du nombre de victoires
// (1 niveau tous les 5 gains) plutôt que d'être inventé — c'est un stub
// volontairement simple, à remplacer par une vraie progression le jour où
// le besoin se précise.
//
// Le bouton "Retirer" (retrait d'argent réel) est désactivé : aucun
// système de paiement n'existe encore côté backend. L'afficher actif
// promettait une fonctionnalité qui n'existe pas.
// ==========================================================================

const WINS_PER_LEVEL = 5

export default function ProfileScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { players, lifetimeStats } = useGame()

  const capital = players[HUMAN_INDEX].capital
  const winRatio = lifetimeStats.gamesPlayed > 0 ? ((lifetimeStats.gamesWon / lifetimeStats.gamesPlayed) * 100).toFixed(1) : '0.0'
  const level = 1 + Math.floor(lifetimeStats.gamesWon / WINS_PER_LEVEL)
  const xpInLevel = lifetimeStats.gamesWon % WINS_PER_LEVEL
  const xpPercent = Math.round((xpInLevel / WINS_PER_LEVEL) * 100)
  const bestComboLabel = lifetimeStats.bestComboEver ? COMBO_LABEL[lifetimeStats.bestComboEver] : '—'
  const unlockedAchievements = getUnlockedAchievements(lifetimeStats).length

  const STATS = [
    { label: 'Parties jouées', value: String(lifetimeStats.gamesPlayed), icon: '🎮' },
    { label: 'Victoires', value: String(lifetimeStats.gamesWon), icon: '🏆' },
    { label: 'Taux de victoire', value: `${winRatio}%`, icon: '📈' },
    { label: 'Rounds gagnés', value: String(lifetimeStats.totalRoundsWon), icon: '🎯' },
    { label: 'Plis gagnés', value: lifetimeStats.totalTricksWon.toLocaleString('fr-FR'), icon: '✨' },
    { label: 'Meilleur combo', value: bestComboLabel, icon: '⚡' },
    {
      label: 'Gains nets',
      value: `${lifetimeStats.netGainTotal >= 0 ? '+' : ''}${lifetimeStats.netGainTotal.toLocaleString('fr-FR')}`,
      icon: '💰',
    },
    { label: 'Capital maximum', value: lifetimeStats.maxCapitalEver.toLocaleString('fr-FR'), icon: '📊' },
  ]

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: '#0B0D10',
      overflowY: 'auto',
      paddingBottom: 80,
    }}>
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      {/* Profile hero card */}
      <div style={{
        background: 'linear-gradient(135deg, #0F2820 0%, #10151A 100%)',
        borderBottom: '1px solid rgba(214,168,79,0.15)',
        padding: '24px 20px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* African pattern on card */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\'%3E%3Cpolygon points=\'12,1 23,12 12,23 1,12\' fill=\'none\' stroke=\'rgba(214,168,79,0.06)\' stroke-width=\'0.8\'/%3E%3C/svg%3E")',
        }} />
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(23,107,80,0.15) 0%, transparent 70%)',
        }} />

        <div style={{ position: 'relative', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              background: 'linear-gradient(135deg, #123C32, #0d2a1f)',
              border: '2.5px solid #D6A84F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              boxShadow: '0 0 24px rgba(214,168,79,0.25)',
            }}>
              {SEAT_AVATARS[HUMAN_INDEX]}
            </div>
            <div style={{
              position: 'absolute',
              bottom: -6,
              right: -6,
              background: 'linear-gradient(135deg, #D6A84F, #C08030)',
              borderRadius: 10,
              padding: '2px 8px',
              border: '2px solid #0B0D10',
            }}>
              <span className="font-display" style={{ color: '#0B0D10', fontSize: 10, fontWeight: 800 }}>{level}</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h2 className="font-display" style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
              Vous
            </h2>
            <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 12px' }}>
              {lifetimeStats.gamesPlayed > 0 ? `${lifetimeStats.gamesPlayed} parties jouées` : 'Aucune partie jouée pour l\'instant'}
            </p>
            {/* XP bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#A9B0B7', fontSize: 11 }}>Niv. {level}</span>
                <span className="font-display" style={{ color: '#D6A84F', fontSize: 11, fontWeight: 600 }}>{xpPercent}%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${xpPercent}%`, background: 'linear-gradient(90deg, #176B50, #D6A84F)', height: '100%', borderRadius: 99 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Capital */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(18,60,50,0.6), rgba(16,21,26,0.8))',
          border: '1px solid rgba(214,168,79,0.25)',
          borderRadius: 18,
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ color: '#A9B0B7', fontSize: 11, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.1em', margin: '0 0 4px' }}>
              CAPITAL ACTUEL
            </p>
            <div className="text-gold font-display" style={{ fontSize: 30, fontWeight: 800 }}>
              {capital.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
          <button
            disabled
            title="Retrait indisponible — aucun système de paiement n'est encore branché"
            style={{
              padding: '10px 16px',
              fontSize: 13,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#5b636b',
              cursor: 'not-allowed',
            }}
          >
            Retirer
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: '16px 20px 0' }}>
        <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: '#fff' }}>
          Statistiques
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '14px',
            }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <p className="font-display" style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '6px 0 2px' }}>
                {s.value}
              </p>
              <p style={{ color: '#A9B0B7', fontSize: 11 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lien vers les achievements (le détail/déblocage reste à construire) */}
      <div style={{ padding: '20px 20px 0' }}>
        <button
          onClick={() => onNavigate('achievements')}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🏅</span>
            <span className="font-display" style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
              Achievements
            </span>
            <span style={{
              background: 'rgba(214,168,79,0.15)',
              color: '#D6A84F',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 99,
              fontFamily: 'Plus Jakarta Sans',
              fontWeight: 700,
            }}>
              {unlockedAchievements}/{ACHIEVEMENTS.length}
            </span>
          </span>
          <span style={{ color: '#D6A84F', fontSize: 13 }}>→</span>
        </button>
      </div>
    </div>
  )
}
