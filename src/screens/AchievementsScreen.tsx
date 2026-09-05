import { useMemo, useState } from 'react'
import type { Screen } from '../types'
import { useGame } from '../game/GameContext'
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  getAchievementProgress,
  type AchievementCategory,
} from '../game/achievements'

// ==========================================================================
// AchievementsScreen — dérivé de lifetimeStats + barres de progression.
// ==========================================================================

const CATS: ('Tous' | AchievementCategory)[] = ['Tous', ...ACHIEVEMENT_CATEGORIES]

export default function AchievementsScreen({ onNavigate: _onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { lifetimeStats } = useGame()
  const [activeCat, setActiveCat] = useState<'Tous' | AchievementCategory>('Tous')

  const withStatus = useMemo(
    () =>
      ACHIEVEMENTS.map(a => {
        const unlocked = a.isUnlocked(lifetimeStats)
        const prog = getAchievementProgress(a, lifetimeStats)
        return { ...a, unlocked, prog }
      }),
    [lifetimeStats],
  )

  const filtered = activeCat === 'Tous' ? withStatus : withStatus.filter(a => a.category === activeCat)
  const unlockedCount = withStatus.filter(a => a.unlocked).length

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#0B0D10',
        overflowY: 'auto',
        paddingBottom: 80,
      }}
    >
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      <div style={{ padding: '20px 20px 0', position: 'relative' }}>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px' }}>
          Achievements
        </h1>
        <p style={{ color: '#A9B0B7', fontSize: 14, margin: '0 0 16px' }}>
          {unlockedCount}/{ACHIEVEMENTS.length} débloqués
          {unlockedCount === ACHIEVEMENTS.length ? ' — collection complète ✨' : ''}
        </p>

        <div
          style={{
            height: 6,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 99,
            overflow: 'hidden',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #176B50, #D6A84F)',
              borderRadius: 99,
              transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          {CATS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCat(c)}
              style={{
                padding: '6px 14px',
                borderRadius: 10,
                border: activeCat === c ? '1.5px solid rgba(214,168,79,0.5)' : '1px solid rgba(255,255,255,0.1)',
                background: activeCat === c ? 'rgba(214,168,79,0.12)' : 'rgba(255,255,255,0.04)',
                color: activeCat === c ? '#D6A84F' : '#A9B0B7',
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

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <p style={{ color: '#5b636b', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            Aucun achievement dans cette catégorie.
          </p>
        )}
        {filtered.map((a, i) => {
          const pct =
            a.prog && a.prog.target > 0 ? Math.min(100, Math.round((a.prog.current / a.prog.target) * 100)) : a.unlocked ? 100 : 0
          return (
            <div
              key={a.id}
              className={a.unlocked ? 'anim-fade-in-up' : ''}
              style={{
                background: a.unlocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                border: a.unlocked ? `1px solid ${a.color}30` : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                animationDelay: `${i * 0.04}s`,
                filter: a.unlocked ? 'none' : 'saturate(0.35)',
                opacity: a.unlocked ? 1 : 0.75,
              }}
            >
              <div
                style={{
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
                }}
              >
                {a.unlocked ? a.icon : '🔒'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <p
                    className="font-display"
                    style={{
                      color: a.unlocked ? '#fff' : '#A9B0B7',
                      fontSize: 14,
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {a.name}
                  </p>
                  <span
                    style={{
                      background: `${a.color}20`,
                      color: a.color,
                      fontSize: 9,
                      padding: '2px 8px',
                      borderRadius: 99,
                      fontFamily: 'Plus Jakarta Sans',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {a.category}
                  </span>
                </div>
                <p style={{ color: '#A9B0B7', fontSize: 12, margin: '0 0 8px' }}>{a.desc}</p>

                {a.prog && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ color: '#5b636b', fontSize: 11 }}>
                        {a.unlocked ? 'Terminé' : 'Progression'}
                      </span>
                      <span
                        className="font-display"
                        style={{
                          color: a.unlocked ? a.color : '#A9B0B7',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {a.prog.current.toLocaleString('fr-FR')} / {a.prog.target.toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: 99,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: a.unlocked
                            ? `linear-gradient(90deg, ${a.color}, #F0D58A)`
                            : 'rgba(214,168,79,0.45)',
                          borderRadius: 99,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {a.unlocked && (
                <div
                  style={{
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
                  }}
                >
                  ✓
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
