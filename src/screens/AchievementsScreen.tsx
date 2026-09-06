import { useMemo, useState } from 'react'
import type { Screen } from '../types'
import { useGame } from '../game/GameContext'
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  getAchievementProgress,
  type AchievementCategory,
} from '../game/achievements'
import { PageHeader, ScreenShell } from '../components/ui'

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
    <ScreenShell>
      <PageHeader
        title="Achievements"
        subtitle={
          unlockedCount === ACHIEVEMENTS.length
            ? `${unlockedCount}/${ACHIEVEMENTS.length} — collection complète ✨`
            : `${unlockedCount}/${ACHIEVEMENTS.length} débloqués`
        }
      />

      <div style={{ padding: '0 20px' }}>
        <div
          style={{
            height: 6,
            background: 'var(--kora-card-bg)',
            borderRadius: 99,
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--kora-green), var(--kora-gold))',
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
                border:
                  activeCat === c ? '1.5px solid var(--kora-border-gold)' : '1px solid var(--kora-card-border)',
                background: activeCat === c ? 'rgba(214,168,79,0.12)' : 'var(--kora-card-bg)',
                color: activeCat === c ? 'var(--kora-gold)' : 'var(--kora-muted)',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <p style={{ color: 'var(--kora-muted-2)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            Aucun achievement dans cette catégorie.
          </p>
        )}
        {filtered.map((a, i) => {
          const pct =
            a.prog && a.prog.target > 0
              ? Math.min(100, Math.round((a.prog.current / a.prog.target) * 100))
              : a.unlocked
                ? 100
                : 0
          return (
            <div
              key={a.id}
              className={`section-card${a.unlocked ? ' anim-fade-in-up' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                animationDelay: `${i * 0.04}s`,
                filter: a.unlocked ? 'none' : 'saturate(0.35)',
                opacity: a.unlocked ? 1 : 0.75,
                borderColor: a.unlocked ? `${a.color}40` : undefined,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: a.unlocked ? `${a.color}20` : 'var(--kora-card-bg)',
                  border: a.unlocked ? `1.5px solid ${a.color}50` : '1px solid var(--kora-card-border)',
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
                      color: a.unlocked ? 'var(--kora-text)' : 'var(--kora-muted)',
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
                <p style={{ color: 'var(--kora-muted)', fontSize: 12, margin: '0 0 8px' }}>{a.desc}</p>

                {a.prog && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: 'var(--kora-muted-2)', fontSize: 11 }}>
                        {a.unlocked ? 'Terminé' : 'Progression'}
                      </span>
                      <span
                        className="font-display"
                        style={{
                          color: a.unlocked ? a.color : 'var(--kora-muted)',
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
                        background: 'var(--kora-card-bg)',
                        borderRadius: 99,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: a.unlocked
                            ? `linear-gradient(90deg, ${a.color}, var(--kora-gold-light))`
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
                    background: 'var(--kora-surface-success)',
                    border: '1.5px solid var(--kora-border-success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 14,
                    color: 'var(--kora-success)',
                  }}
                >
                  ✓
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ScreenShell>
  )
}
