import { useMemo, useState } from 'react'
import type { Screen } from '../types'
import { useGame } from '../game/GameContext'
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  getAchievementProgress,
  type AchievementCategory,
} from '../game/achievements'
import { PageHeader, ScreenShell, SectionCard } from '../components/ui'

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
  const overallPct = (unlockedCount / ACHIEVEMENTS.length) * 100

  const byCategory = useMemo(() => {
    return ACHIEVEMENT_CATEGORIES.map(cat => {
      const items = withStatus.filter(a => a.category === cat)
      const done = items.filter(a => a.unlocked).length
      return { cat, done, total: items.length }
    })
  }, [withStatus])

  return (
    <ScreenShell className="achv-screen">
      <div className="achv-layout">
        <div className="achv-main">
          <PageHeader
            title="Achievements"
            subtitle={
              unlockedCount === ACHIEVEMENTS.length
                ? `${unlockedCount}/${ACHIEVEMENTS.length} — collection complète ✨`
                : `${unlockedCount}/${ACHIEVEMENTS.length} débloqués`
            }
          />

          <div className="achv-pad">
            <div className="achv-progress-track">
              <div className="achv-progress-fill" style={{ width: `${overallPct}%` }} />
            </div>

            <SectionCard className="achv-summary">
              <p className="font-display achv-summary-value">
                {unlockedCount}
                <span className="achv-summary-total">/{ACHIEVEMENTS.length}</span>
              </p>
              <p className="achv-summary-label">hauts faits débloqués</p>
              <div className="achv-summary-bars">
                {byCategory.map(({ cat, done, total }) => (
                  <button
                    key={cat}
                    type="button"
                    className={`achv-summary-row${activeCat === cat ? ' is-active' : ''}`}
                    onClick={() => setActiveCat(cat)}
                  >
                    <span className="achv-summary-cat">{cat}</span>
                    <span className="font-display achv-summary-count">
                      {done}/{total}
                    </span>
                    <div className="achv-summary-mini-track">
                      <div
                        className="achv-summary-mini-fill"
                        style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </SectionCard>

            <div className="achv-cats">
              {CATS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCat(c)}
                  className={`achv-cat-btn${activeCat === c ? ' is-active' : ''}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="achv-side">
          <div className="achv-list">
            {filtered.length === 0 && (
              <p className="achv-empty">Aucun achievement dans cette catégorie.</p>
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
                  className={`section-card achv-card${a.unlocked ? ' anim-fade-in-up' : ' is-locked'}`}
                  style={{
                    animationDelay: a.unlocked ? `${i * 0.04}s` : undefined,
                    borderColor: a.unlocked ? `${a.color}40` : undefined,
                  }}
                >
                  <div
                    className="achv-icon"
                    style={
                      a.unlocked
                        ? {
                            background: `${a.color}20`,
                            border: `1.5px solid ${a.color}50`,
                            boxShadow: `0 0 16px ${a.color}20`,
                          }
                        : undefined
                    }
                  >
                    {a.unlocked ? a.icon : '🔒'}
                  </div>

                  <div className="achv-body">
                    <div className="achv-title-row">
                      <p className={`font-display achv-name${a.unlocked ? ' is-unlocked' : ''}`}>{a.name}</p>
                      <span className="achv-cat-pill" style={{ background: `${a.color}20`, color: a.color }}>
                        {a.category}
                      </span>
                    </div>
                    <p className="achv-desc">{a.desc}</p>

                    {a.prog && (
                      <div>
                        <div className="achv-prog-labels">
                          <span className="achv-prog-label">{a.unlocked ? 'Terminé' : 'Progression'}</span>
                          <span
                            className="font-display achv-prog-value"
                            style={{ color: a.unlocked ? a.color : undefined }}
                          >
                            {a.prog.current.toLocaleString('fr-FR')} / {a.prog.target.toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <div className="achv-prog-track">
                          <div
                            className="achv-prog-fill"
                            style={{
                              width: `${pct}%`,
                              background: a.unlocked
                                ? `linear-gradient(90deg, ${a.color}, var(--kora-gold-light))`
                                : undefined,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {a.unlocked && <div className="achv-check">✓</div>}
                </div>
              )
            })}
          </div>
        </aside>
      </div>
    </ScreenShell>
  )
}
