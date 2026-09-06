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

  // Recharger l’historique à chaque affichage du profil
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
        background: '#0B0D10',
        overflowY: 'auto',
        paddingBottom: 80,
      }}
    >
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      <div
        style={{
          background: 'linear-gradient(135deg, #0F2820 0%, #10151A 100%)',
          borderBottom: '1px solid rgba(214,168,79,0.15)',
          padding: '24px 20px 28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\'%3E%3Cpolygon points=\'12,1 23,12 12,23 1,12\' fill=\'none\' stroke=\'rgba(214,168,79,0.06)\' stroke-width=\'0.8\'/%3E%3C/svg%3E")',
          }}
        />

        <div style={{ position: 'relative', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
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
              }}
            >
              {editing ? avatarDraft : displayAvatar}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: -6,
                right: -6,
                background: 'linear-gradient(135deg, #D6A84F, #C08030)',
                borderRadius: 10,
                padding: '2px 8px',
                border: '2px solid #0B0D10',
              }}
            >
              <span className="font-display" style={{ color: '#0B0D10', fontSize: 10, fontWeight: 800 }}>
                {level}
              </span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <input
                value={usernameDraft}
                onChange={e => setUsernameDraft(e.target.value)}
                maxLength={20}
                placeholder="Votre pseudo"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(214,168,79,0.35)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  color: '#fff',
                  fontSize: 18,
                  fontFamily: 'Cinzel, serif',
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              />
            ) : (
              <h2 className="font-display" style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
                {displayName}
              </h2>
            )}
            <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 8px' }}>
              {user
                ? user.email
                : lifetimeStats.gamesPlayed > 0
                  ? `${lifetimeStats.gamesPlayed} parties (local)`
                  : 'Compte local — connectez-vous pour le online'}
              {statsSyncing ? ' · sync…' : ''}
            </p>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#A9B0B7', fontSize: 11 }}>Niv. {level}</span>
                <span className="font-display" style={{ color: '#D6A84F', fontSize: 11, fontWeight: 600 }}>
                  {xpPercent}%
                </span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${xpPercent}%`,
                    background: 'linear-gradient(90deg, #176B50, #D6A84F)',
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
            <p style={{ color: '#A9B0B7', fontSize: 11, margin: '0 0 8px', letterSpacing: '0.08em' }}>AVATAR</p>
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
                    border: a === avatarDraft ? '2px solid #D6A84F' : '1px solid rgba(255,255,255,0.1)',
                    background: a === avatarDraft ? 'rgba(214,168,79,0.15)' : 'rgba(255,255,255,0.04)',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        {editError && (
          <p role="alert" style={{ position: 'relative', color: '#C94B4B', fontSize: 12, margin: '12px 0 0' }}>
            {editError}
          </p>
        )}
        {savedOk && !editing && (
          <p style={{ position: 'relative', color: '#4CAF76', fontSize: 12, margin: '12px 0 0' }}>Profil enregistré.</p>
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
                <button
                  className="btn-primary glow-gold"
                  onClick={startEditing}
                  style={{ padding: '10px 16px', fontSize: 12, borderRadius: 12 }}
                >
                  Modifier le profil
                </button>
              )}
              <button
                className="btn-secondary"
                onClick={() => void refreshCloudStats()}
                style={{ padding: '10px 16px', fontSize: 12, borderRadius: 12 }}
              >
                {statsSyncing ? 'Sync…' : 'Sync stats'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => void signOut()}
                style={{ padding: '10px 16px', fontSize: 12, borderRadius: 12 }}
              >
                Se déconnecter
              </button>
            </>
          ) : (
            <button
              className="btn-primary glow-gold"
              onClick={() => onNavigate('auth')}
              style={{ padding: '10px 16px', fontSize: 12, borderRadius: 12 }}
            >
              Connexion / Inscription
            </button>
          )}
        </div>
      </div>

      {/* Wallet + capital solo côte à côte */}
      <div
        style={{
          padding: '16px 20px 0',
          display: 'grid',
          gridTemplateColumns: user && walletBalance !== null ? '1fr 1fr' : '1fr',
          gap: 10,
        }}
      >
        {user && walletBalance !== null && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(214,168,79,0.12), rgba(16,21,26,0.8))',
              border: '1px solid rgba(214,168,79,0.35)',
              borderRadius: 18,
              padding: '16px',
            }}
          >
            <p
              style={{
                color: '#A9B0B7',
                fontSize: 10,
                fontFamily: 'Plus Jakarta Sans',
                letterSpacing: '0.1em',
                margin: '0 0 4px',
              }}
            >
              WALLET
            </p>
            <div className="text-gold font-display" style={{ fontSize: 20, fontWeight: 800 }}>
              {walletBalance.toLocaleString('fr-FR')}
            </div>
            <p style={{ color: '#5b636b', fontSize: 10, margin: '4px 0 0' }}>FCFA · online</p>
          </div>
        )}

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(18,60,50,0.6), rgba(16,21,26,0.8))',
            border: '1px solid rgba(214,168,79,0.25)',
            borderRadius: 18,
            padding: '16px',
          }}
        >
          <p
            style={{
              color: '#A9B0B7',
              fontSize: 10,
              fontFamily: 'Plus Jakarta Sans',
              letterSpacing: '0.1em',
              margin: '0 0 4px',
            }}
          >
            SOLO
          </p>
          <div className="text-gold font-display" style={{ fontSize: 20, fontWeight: 800 }}>
            {capital.toLocaleString('fr-FR')}
          </div>
          <p style={{ color: '#5b636b', fontSize: 10, margin: '4px 0 0' }}>FCFA · partie en cours</p>
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: '#fff' }}>
          Statistiques
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {STATS.map((s, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '14px',
              }}
            >
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <p className="font-display" style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '6px 0 2px' }}>
                {s.value}
              </p>
              <p style={{ color: '#A9B0B7', fontSize: 11 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Historique des parties */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>
            Historique
          </h3>
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#5b636b',
                fontSize: 11,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Effacer
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: 14,
              padding: '18px 16px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 4px' }}>Aucune partie enregistrée</p>
            <p style={{ color: '#5b636b', fontSize: 11, margin: 0 }}>
              Les parties solo terminées apparaîtront ici (30 max).
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.slice(0, 15).map(h => (
              <div
                key={h.id}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: h.won ? 'rgba(76,175,118,0.15)' : 'rgba(201,75,75,0.12)',
                    border: `1px solid ${h.won ? 'rgba(76,175,118,0.35)' : 'rgba(201,75,75,0.3)'}`,
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
                    <span className="font-display" style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
                      {h.won ? 'Victoire' : 'Défaite'}
                    </span>
                    <span style={{ color: '#5b636b', fontSize: 10 }}>{h.mode === 'solo' ? 'Solo' : 'Online'}</span>
                  </div>
                  <p style={{ color: '#A9B0B7', fontSize: 11, margin: '2px 0 0' }}>
                    {formatHistoryDate(h.at)}
                    {h.bestCombo ? ` · ${COMBO_LABEL[h.bestCombo as keyof typeof COMBO_LABEL] ?? h.bestCombo}` : ''}
                    {` · ${h.roundsWon} rounds`}
                  </p>
                </div>
                <span
                  className="font-display"
                  style={{
                    color: h.netGain >= 0 ? '#4CAF76' : '#C94B4B',
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
              <p style={{ color: '#5b636b', fontSize: 11, textAlign: 'center', margin: '4px 0 0' }}>
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
            <span
              style={{
                background: 'rgba(214,168,79,0.15)',
                color: '#D6A84F',
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
          <span style={{ color: '#D6A84F', fontSize: 13 }}>→</span>
        </button>
      </div>
    </div>
  )
}
