import { useEffect, useState } from 'react'
import type { Screen } from '../types'
import { useGame, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { useAuth, validateUsername } from '../auth/AuthContext'
import { COMBO_LABEL } from '../game/combo'
import { ACHIEVEMENTS, getUnlockedAchievements } from '../game/achievements'
import { fetchWallet } from '../lib/persistence/cloud'
import {
  type GameHistoryEntry,
  clearGameHistory,
  formatHistoryDate,
  loadGameHistory,
} from '../lib/persistence/gameHistory'
import { ThemeToggle } from '../components/ui'

const WINS_PER_LEVEL = 5

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
  const level = 1 + Math.floor(lifetimeStats.gamesWon / WINS_PER_LEVEL)
  const xpInLevel = lifetimeStats.gamesWon % WINS_PER_LEVEL
  const xpPercent = Math.round((xpInLevel / WINS_PER_LEVEL) * 100)
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
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--kora-void)',
        overflowY: 'auto',
        paddingBottom: 80,
      }}
    >
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      <div
        style={{
          background: 'linear-gradient(135deg, var(--kora-green-deep) 0%, var(--kora-surface) 100%)',
          borderBottom: '1px solid var(--kora-border-gold-soft)',
          padding: '24px 20px 28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                background: 'linear-gradient(135deg, var(--kora-green-deep), #0d2a1f)',
                border: '2.5px solid var(--kora-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                boxShadow: '0 0 24px rgba(214,168,79,0.25)',
              }}
            >
              {editing ? avatarDraft : displayAvatar}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: -6,
                right: -6,
                background: 'linear-gradient(135deg, var(--kora-gold), var(--kora-gold-dark))',
                borderRadius: 10,
                padding: '2px 8px',
                border: '2px solid var(--kora-void)',
              }}
            >
              <span className="font-display" style={{ color: 'var(--kora-text-inverse)', fontSize: 10, fontWeight: 800 }}>
                {level}
              </span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <input
                className="ui-field"
                value={usernameDraft}
                onChange={e => setUsernameDraft(e.target.value)}
                maxLength={20}
                placeholder="Votre pseudo"
                style={{ fontSize: 18, fontFamily: 'Cinzel, serif', fontWeight: 700, marginBottom: 6 }}
              />
            ) : (
              <h2 className="font-display" style={{ color: 'var(--kora-text)', fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
                {displayName}
              </h2>
            )}
            <p style={{ color: 'var(--kora-muted)', fontSize: 13, margin: '0 0 8px' }}>
              {user
                ? user.email
                : lifetimeStats.gamesPlayed > 0
                  ? `${lifetimeStats.gamesPlayed} parties (local)`
                  : 'Compte local — connectez-vous pour le online'}
              {statsSyncing ? ' · sync…' : ''}
            </p>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--kora-muted)', fontSize: 11 }}>Niv. {level}</span>
                <span className="font-display" style={{ color: 'var(--kora-gold)', fontSize: 11, fontWeight: 600 }}>
                  {xpPercent}%
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--kora-card-bg)', borderRadius: 99, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${xpPercent}%`,
                    background: 'linear-gradient(90deg, var(--kora-green), var(--kora-gold))',
                    height: '100%',
                    borderRadius: 99,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {user && editing && (
          <div style={{ position: 'relative', marginTop: 16 }}>
            <p style={{ color: 'var(--kora-muted)', fontSize: 11, margin: '0 0 8px', letterSpacing: '0.08em' }}>AVATAR</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {AVATAR_CHOICES.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatarDraft(a)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    fontSize: 20,
                    cursor: 'pointer',
                    border: a === avatarDraft ? '2px solid var(--kora-gold)' : '1px solid var(--kora-card-border)',
                    background: a === avatarDraft ? 'rgba(214,168,79,0.15)' : 'var(--kora-card-bg)',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        {editError && (
          <p role="alert" style={{ position: 'relative', color: 'var(--kora-danger)', fontSize: 12, margin: '12px 0 0' }}>
            {editError}
          </p>
        )}
        {savedOk && !editing && (
          <p style={{ position: 'relative', color: 'var(--kora-success)', fontSize: 12, margin: '12px 0 0' }}>Profil enregistré.</p>
        )}

        <div style={{ position: 'relative', marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {user ? (
            <>
              {editing ? (
                <>
                  <button
                    className="btn-primary glow-gold"
                    disabled={saving}
                    onClick={() => void handleSaveProfile()}
                    style={{ padding: '10px 16px', fontSize: 12, borderRadius: 12, opacity: saving ? 0.6 : 1 }}
                  >
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={saving}
                    onClick={() => {
                      setEditing(false)
                      setEditError(null)
                    }}
                    style={{ padding: '10px 16px', fontSize: 12, borderRadius: 12 }}
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <button className="btn-primary glow-gold" onClick={startEditing} style={{ padding: '10px 16px', fontSize: 12, borderRadius: 12 }}>
                  Modifier le profil
                </button>
              )}
              <button className="btn-secondary" onClick={() => void refreshCloudStats()} style={{ padding: '10px 16px', fontSize: 12, borderRadius: 12 }}>
                {statsSyncing ? 'Sync…' : 'Sync stats'}
              </button>
              <button className="btn-secondary" onClick={() => void signOut()} style={{ padding: '10px 16px', fontSize: 12, borderRadius: 12 }}>
                Se déconnecter
              </button>
            </>
          ) : (
            <button className="btn-primary glow-gold" onClick={() => onNavigate('auth')} style={{ padding: '10px 16px', fontSize: 12, borderRadius: 12 }}>
              Connexion / Inscription
            </button>
          )}
        </div>
      </div>

      <ThemeToggle />

      <div
        style={{
          padding: '16px 20px 0',
          display: 'grid',
          gridTemplateColumns: user && walletBalance !== null ? '1fr 1fr' : '1fr',
          gap: 10,
        }}
      >
        {user && walletBalance !== null && (
          <div className="section-card section-card--gold" style={{ borderRadius: 18, padding: 16 }}>
            <p style={{ color: 'var(--kora-muted)', fontSize: 10, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.1em', margin: '0 0 4px' }}>
              WALLET
            </p>
            <div className="text-gold font-display" style={{ fontSize: 20, fontWeight: 800 }}>
              {walletBalance.toLocaleString('fr-FR')}
            </div>
            <p style={{ color: 'var(--kora-muted-2)', fontSize: 10, margin: '4px 0 0' }}>FCFA · online</p>
          </div>
        )}

        <div className="section-card section-card--green" style={{ borderRadius: 18, padding: 16 }}>
          <p style={{ color: 'var(--kora-muted)', fontSize: 10, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.1em', margin: '0 0 4px' }}>
            SOLO
          </p>
          <div className="text-gold font-display" style={{ fontSize: 20, fontWeight: 800 }}>
            {capital.toLocaleString('fr-FR')}
          </div>
          <p style={{ color: 'var(--kora-muted-2)', fontSize: 10, margin: '4px 0 0' }}>FCFA · partie en cours</p>
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--kora-text)' }}>
          Statistiques
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {STATS.map((s, i) => (
            <div key={i} className="section-card" style={{ borderRadius: 14, padding: 14 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <p className="font-display" style={{ color: 'var(--kora-text)', fontSize: 18, fontWeight: 700, margin: '6px 0 2px' }}>
                {s.value}
              </p>
              <p style={{ color: 'var(--kora-muted)', fontSize: 11 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--kora-text)' }}>
            Historique
          </h3>
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              style={{ background: 'transparent', border: 'none', color: 'var(--kora-muted-2)', fontSize: 11, cursor: 'pointer', padding: 0 }}
            >
              Effacer
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="empty-state empty-state--dashed">
            <p className="empty-state-title">Aucune partie enregistrée</p>
            <p className="empty-state-desc">Les parties solo terminées apparaîtront ici (30 max).</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.slice(0, 15).map(h => (
              <div
                key={h.id}
                className="section-card"
                style={{ borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: h.won ? 'var(--kora-surface-success)' : 'var(--kora-surface-danger)',
                    border: `1px solid ${h.won ? 'var(--kora-border-success)' : 'var(--kora-border-danger)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {h.won ? '🏆' : '💀'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span className="font-display" style={{ color: 'var(--kora-text)', fontSize: 13, fontWeight: 700 }}>
                      {h.won ? 'Victoire' : 'Défaite'}
                    </span>
                    <span style={{ color: 'var(--kora-muted-2)', fontSize: 10 }}>{h.mode === 'solo' ? 'Solo' : 'Online'}</span>
                  </div>
                  <p style={{ color: 'var(--kora-muted)', fontSize: 11, margin: '2px 0 0' }}>
                    {formatHistoryDate(h.at)}
                    {h.bestCombo ? ` · ${COMBO_LABEL[h.bestCombo as keyof typeof COMBO_LABEL] ?? h.bestCombo}` : ''}
                    {` · ${h.roundsWon} rounds`}
                  </p>
                </div>
                <span
                  className="font-display"
                  style={{
                    color: h.netGain >= 0 ? 'var(--kora-success)' : 'var(--kora-danger)',
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {h.netGain >= 0 ? '+' : ''}
                  {h.netGain.toLocaleString('fr-FR')}
                </span>
              </div>
            ))}
            {history.length > 15 && (
              <p style={{ color: 'var(--kora-muted-2)', fontSize: 11, textAlign: 'center', margin: '4px 0 0' }}>
                +{history.length - 15} plus anciennes
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <button
          type="button"
          onClick={() => onNavigate('achievements')}
          className="section-card"
          style={{
            width: '100%',
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
            <span className="font-display" style={{ color: 'var(--kora-text)', fontSize: 14, fontWeight: 700 }}>
              Achievements
            </span>
            <span
              style={{
                background: 'rgba(214,168,79,0.15)',
                color: 'var(--kora-gold)',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 99,
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 700,
              }}
            >
              {unlockedAchievements}/{ACHIEVEMENTS.length}
            </span>
          </span>
          <span style={{ color: 'var(--kora-gold)', fontSize: 13 }}>→</span>
        </button>
      </div>
    </div>
  )
}
