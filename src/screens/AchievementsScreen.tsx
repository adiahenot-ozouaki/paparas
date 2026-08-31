import { useState } from 'react'
import type { Screen } from '../types'
import { useGame } from '../game/GameContext'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, type AchievementCategory } from '../game/achievements'

// ==========================================================================
// AchievementsScreen — rebranché sur le vrai état de jeu.
//
// Avant : chaque achievement portait un booléen "unlocked" codé en dur
// dans ce fichier, sans aucun lien avec les statistiques réelles. Le
// déblocage est maintenant purement dérivé de lifetimeStats via
// game/achievements.ts (ACHIEVEMENTS[i].isUnlocked(stats)) — rien n'est
// stocké séparément, donc rien ne peut se désynchroniser.
// ==========================================================================

const CATS: ('Tous' | AchievementCategory)[] = ['Tous', ...ACHIEVEMENT_CATEGORIES]

export default function AchievementsScreen({ onNavigate: _onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { lifetimeStats } = useGame()
  const [activecat, setActiveCat] = useState<'Tous' | AchievementCategory>('Tous')

  const withStatus = ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.isUnlocked(lifetimeStats) }))
  const filtered = activecat === 'Tous' ? withStatus : withStatus.filter(a => a.category === activecat)
  const unlockedCount = withStatus.filter(a => a.unlocked).length

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: '#0B0D10',
      overflowY: 'auto',
      paddingBottom: 80,
    }}>
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      {/* Header */}
      <div style={{ padding: '20px 20px 0', position: 'relative' }}>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px' }}>
          Achievements
        </h1>
        <p style={{ color: '#A9B0B7', fontSize: 14, margin: '0 0 16px' }}>
          {unlockedCount}/{ACHIEVEMENTS.length} débloqués
        </p>

        {/* Progress bar */}
        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{
            width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #176B50, #D6A84F)',
            borderRadius: 99,
            transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }} />
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          {CATS.map(c => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              style={{
                padding: '6px 14px',
                borderRadius: 10,
                border: activecat === c ? '1.5px solid rgba(214,168,79,0.5)' : '1px solid rgba(255,255,255,0.1)',
                background: activecat === c ? 'rgba(214,168,79,0.12)' : 'rgba(255,255,255,0.04)',
                color: activecat === c ? '#D6A84F' : '#A9B0B7',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Achievements grid */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <p style={{ color: '#5b636b', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            Aucun achievement dans cette catégorie.
          </p>
        )}
        {filtered.map((a, i) => (
          <div key={a.id} className={a.unlocked ? 'anim-fade-in-up' : ''} style={{
            background: a.unlocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
            border: a.unlocked ? `1px solid ${a.color}30` : '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            animationDelay: `${i * 0.04}s`,
            filter: a.unlocked ? 'none' : 'saturate(0.2)',
            opacity: a.unlocked ? 1 : 0.6,
          }}>
            {/* Icon badge */}
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: a.unlocked ? `${a.color}20` : 'rgba(255,255,255,0.05)',
              border: a.unlocked ? `1.5px solid ${a.color}50` : '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              flexShrink: 0,
              boxShadow: a.unlocked ? `0 0 16px ${a.color}20` : 'none',
            }}>
              {a.unlocked ? a.icon : '🔒'}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <p className="font-display" style={{ color: a.unlocked ? '#fff' : '#A9B0B7', fontSize: 14, fontWeight: 700, margin: 0 }}>
                  {a.name}
                </p>
                <span style={{
                  background: `${a.color}20`,
                  color: a.color,
                  fontSize: 9,
                  padding: '2px 8px',
                  borderRadius: 99,
                  fontFamily: 'Plus Jakarta Sans',
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  {a.category}
                </span>
              </div>
              <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>{a.desc}</p>
            </div>

            {/* Status */}
            {a.unlocked && (
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(76,175,118,0.2)',
                border: '1.5px solid rgba(76,175,118,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 14,
              }}>
                ✓
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
