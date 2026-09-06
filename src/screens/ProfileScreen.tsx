import { useEffect, useState } from 'react'
import type { Screen } from '../types'
import { useGame, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { useAuth, validateUsername } from '../auth/AuthContext'
import { COMBO_LABEL } from '../game/combo'
import { ACHIEVEMENTS, getUnlockedAchievements } from '../game/achievements'
import { getPlayerProgress } from '../game/progression'
import { fetchWallet } from '../lib/persistence/cloud'
import {
  type GameHistoryEntry,
  clearGameHistory,
  formatHistoryDate,
  loadGameHistory,
} from '../lib/persistence/gameHistory'
import {
  EmptyState,
  MoneyCard,
  ScreenShell,
  SectionCard,
  StatTile,
  ThemeToggle,
  UiButton,
} from '../components/ui'

const AVATAR_CHOICES = ['🦅', '🐆', '🦁', '🐊', '🐘', '🦏', '🦒', '🦓', '🐒', '🐍', '🐢', '🦋', '🌴', '☀️', '⭐', '🎯']

export default function ProfileScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { players, lifetimeStats, statsSyncing, refreshCloudStats } = useGame()
  const { user, profile, signOut, updateProfile } = useAuth()

  const [editing, setEditing] = useState(false)
  const [usernameDraft, setUsernameDraft] = useState('')
  const [avatarDraft, setAvatarDraft] = useState('🦅')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [history, setHistory] = useState<GameHistoryEntry[]>(() => loadGameHistory())

  useEffect(() => {
    if (profile) {
      setUsernameDraft(profile.username)
      setAvatarDraft(profile.avatar || '🦅')
      if (typeof profile.wallet_balance === 'number') setWalletBalance(profile.wallet_balance)
    }
  }, [profile])

  useEffect(() => {
    if (!user) {
      setWalletBalance(null)
      return
    }
    let cancelled = false
    void fetchWallet().then(({ wallet }) => {
      if (!cancelled && wallet) setWalletBalance(wallet.balance)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    setHistory(loadGameHistory())
  }, [lifetimeStats.gamesPlayed])

  const capital = players[HUMAN_INDEX].capital
  const winRatio =
    lifetimeStats.gamesPlayed > 0
      ? ((lifetimeStats.gamesWon / lifetimeStats.gamesPlayed) * 100).toFixed(1)
      : '0.0'
  const progress = getPlayerProgress(lifetimeStats)
  const bestComboLabel = lifetimeStats.bestComboEver ? COMBO_LABEL[lifetimeStats.bestComboEver] : '—'
  const unlockedAchievements = getUnlockedAchievements(lifetimeStats).length
  const displayName = profile?.username ?? 'Vous'
  const displayAvatar = profile?.avatar ?? SEAT_AVATARS[HUMAN_INDEX]

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

  async function handleSaveProfile() {
    setEditError(null)
    setSavedOk(false)
    const v = validateUsername(usernameDraft)
    if (v) {
      setEditError(v)
      return
    }
    setSaving(true)
    const { error } = await updateProfile({ username: usernameDraft, avatar: avatarDraft })
    setSaving(false)
    if (error) {
      setEditError(error)
      return
    }
    setSavedOk(true)
    setEditing(false)
  }

  function startEditing() {
    setUsernameDraft(profile?.username ?? '')
    setAvatarDraft(profile?.avatar || '🦅')
    setEditError(null)
    setSavedOk(false)
    setEditing(true)
  }

  function handleClearHistory() {
    clearGameHistory()
    setHistory([])
  }

  return (
    <ScreenShell className="profile-screen">
      <div className="profile-layout">
        <div className="profile-main">
          <div className="profile-hero">
            <div className="profile-hero-row">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar">{editing ? avatarDraft : displayAvatar}</div>
                <div className="profile-level-badge">
                  <span className="font-display profile-level-num">{progress.level}</span>
                </div>
              </div>

              <div className="profile-hero-meta">
                {editing ? (
                  <input
                    className="ui-field profile-username-input"
                    value={usernameDraft}
                    onChange={e => setUsernameDraft(e.target.value)}
                    maxLength={20}
                    placeholder="Votre pseudo"
                  />
                ) : (
                  <h2 className="font-display profile-name">{displayName}</h2>
                )}
                <p className="profile-sub">
                  {progress.title}
                  {' · '}
                  {user
                    ? user.email
                    : lifetimeStats.gamesPlayed > 0
                      ? `${lifetimeStats.gamesPlayed} parties (local)`
                      : 'Compte local — connectez-vous pour le online'}
                  {statsSyncing ? ' · sync…' : ''}
                </p>
                <div className="profile-xp">
                  <div className="profile-xp-labels">
                    <span className="profile-xp-level">
                      Niv. {progress.level} · {progress.xpInLevel}/{progress.xpToNext} XP
                    </span>
                    <span className="font-display profile-xp-pct">{progress.percent}%</span>
                  </div>
                  <div className="profile-xp-bar">
                    <div className="profile-xp-fill" style={{ width: `${progress.percent}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {user && editing && (
              <div className="profile-avatar-picker">
                <p className="profile-section-label">Avatar</p>
                <div className="profile-avatar-grid">
                  {AVATAR_CHOICES.map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAvatarDraft(a)}
                      className={`profile-avatar-choice${a === avatarDraft ? ' is-selected' : ''}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {editError && (
              <p role="alert" className="profile-msg profile-msg--error">
                {editError}
              </p>
            )}
            {savedOk && !editing && <p className="profile-msg profile-msg--ok">Profil enregistré.</p>}

            <div className="profile-actions">
              {user ? (
                <>
                  {editing ? (
                    <>
                      <UiButton disabled={saving} onClick={() => void handleSaveProfile()} className="profile-btn">
                        {saving ? 'Enregistrement…' : 'Enregistrer'}
                      </UiButton>
                      <UiButton
                        variant="secondary"
                        disabled={saving}
                        onClick={() => {
                          setEditing(false)
                          setEditError(null)
                        }}
                        className="profile-btn"
                      >
                        Annuler
                      </UiButton>
                    </>
                  ) : (
                    <UiButton onClick={startEditing} className="profile-btn">
                      Modifier le profil
                    </UiButton>
                  )}
                  <UiButton variant="secondary" onClick={() => void refreshCloudStats()} className="profile-btn">
                    {statsSyncing ? 'Sync…' : 'Sync stats'}
                  </UiButton>
                  <UiButton variant="secondary" onClick={() => void signOut()} className="profile-btn">
                    Se déconnecter
                  </UiButton>
                </>
              ) : (
                <UiButton onClick={() => onNavigate('auth')} className="profile-btn">
                  Connexion / Inscription
                </UiButton>
              )}
            </div>
          </div>

          <ThemeToggle />

          <div className={`profile-money-grid${user && walletBalance !== null ? ' profile-money-grid--2' : ''}`}>
            {user && walletBalance !== null && (
              <MoneyCard variant="gold" label="Wallet" amount={walletBalance} icon="💰" subtitle="FCFA · online" />
            )}
            <MoneyCard variant="green" label="Solo" amount={capital} icon="🃏" subtitle="FCFA · partie en cours" />
          </div>
        </div>

        <aside className="profile-side">
          <section className="profile-section">
            <h3 className="font-display profile-section-title">Statistiques</h3>
            <div className="profile-stats-grid">
              {STATS.map(s => (
                <StatTile key={s.label} icon={s.icon} value={s.value} label={s.label} className="profile-stat" />
              ))}
            </div>
          </section>

          <section className="profile-section">
            <div className="profile-section-head">
              <h3 className="font-display profile-section-title">Historique</h3>
              {history.length > 0 && (
                <UiButton variant="ghost" onClick={handleClearHistory} className="profile-clear">
                  Effacer
                </UiButton>
              )}
            </div>

            {history.length === 0 ? (
              <EmptyState
                title="Aucune partie enregistrée"
                description="Les parties solo terminées apparaîtront ici (30 max)."
              />
            ) : (
              <div className="profile-history-list">
                {history.slice(0, 15).map(h => (
                  <SectionCard key={h.id} className="profile-history-item">
                    <div className="profile-history-row">
                      <div className={`profile-history-icon${h.won ? ' is-win' : ' is-loss'}`}>{h.won ? '🏆' : '💀'}</div>
                      <div className="profile-history-body">
                        <div className="profile-history-title-row">
                          <span className="font-display profile-history-result">{h.won ? 'Victoire' : 'Défaite'}</span>
                          <span className="profile-history-mode">{h.mode === 'solo' ? 'Solo' : 'Online'}</span>
                        </div>
                        <p className="profile-history-meta">
                          {formatHistoryDate(h.at)}
                          {h.bestCombo ? ` · ${COMBO_LABEL[h.bestCombo as keyof typeof COMBO_LABEL] ?? h.bestCombo}` : ''}
                          {` · ${h.roundsWon} rounds`}
                        </p>
                      </div>
                      <span className={`font-display profile-history-gain ${h.netGain >= 0 ? 'text-success' : 'text-danger'}`}>
                        {h.netGain >= 0 ? '+' : ''}
                        {h.netGain.toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </SectionCard>
                ))}
                {history.length > 15 && (
                  <p className="profile-history-more">+{history.length - 15} plus anciennes</p>
                )}
              </div>
            )}
          </section>

          <div className="profile-section">
            <SectionCard onClick={() => onNavigate('achievements')} className="profile-achievements">
              <div className="profile-achievements-row">
                <span className="profile-achievements-left">
                  <span className="profile-achievements-emoji">🏅</span>
                  <span className="font-display profile-achievements-label">Achievements</span>
                  <span className="profile-achievements-count">
                    {unlockedAchievements}/{ACHIEVEMENTS.length}
                  </span>
                </span>
                <span className="profile-achievements-arrow">→</span>
              </div>
            </SectionCard>
          </div>
        </aside>
      </div>
    </ScreenShell>
  )
}
