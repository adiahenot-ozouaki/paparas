import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Screen } from '../types'
import { useGame, HUMAN_INDEX, SEAT_AVATARS } from '../game/GameContext'
import { useAuth } from '../auth/AuthContext'
import { COMBO_LABEL } from '../game/combo'
import { ACHIEVEMENTS, getUnlockedAchievements } from '../game/achievements'
import { fetchWallet } from '../lib/persistence/cloud'
import { findMyActiveTables, type MyActiveTable } from '../lib/online/api'
import { setActiveOnlineTableId } from '../lib/online/session'
import { ScreenShell } from '../components/ui'

// Constantes hors composant → 0 allocation par render
const QUICK_LINKS: { label: string; icon: string; screen: Screen }[] = [
  { label: 'Partie rapide', icon: '⚡', screen: 'stakeConfig' },
  { label: 'Classement', icon: '🏆', screen: 'leaderboard' },
  { label: 'Règles', icon: '📖', screen: 'rules' },
]

const WINS_PER_LEVEL = 5
const PLAY_NAV_DELAY_MS = 280 // un peu plus court qu’avant (400)

export default function HomeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { players, lifetimeStats } = useGame()
  const { profile, user } = useAuth()

  // Lecture ciblée — évite de recalculer depuis tout le tableau ailleurs
  const capital = players[HUMAN_INDEX].capital

  const [showMoneyAnim, setShowMoneyAnim] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(() =>
    typeof profile?.wallet_balance === 'number' ? profile.wallet_balance : null,
  )
  const [activeTables, setActiveTables] = useState<MyActiveTable[]>([])
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dérivés mémoïsés (lifetimeStats change rarement)
  const { winRatio, level, unlockedCount, bestComboLabel, netGain, gamesPlayed, gamesWon } = useMemo(() => {
    const gp = lifetimeStats.gamesPlayed
    const gw = lifetimeStats.gamesWon
    return {
      winRatio: gp > 0 ? ((gw / gp) * 100).toFixed(1) : '0.0',
      level: 1 + Math.floor(gw / WINS_PER_LEVEL),
      unlockedCount: getUnlockedAchievements(lifetimeStats).length,
      bestComboLabel: lifetimeStats.bestComboEver ? COMBO_LABEL[lifetimeStats.bestComboEver] : null,
      netGain: lifetimeStats.netGainTotal,
      gamesPlayed: gp,
      gamesWon: gw,
    }
  }, [lifetimeStats])

  const displayName = profile?.username ?? (user ? 'Joueur' : 'Vous')
  const displayAvatar = profile?.avatar ?? SEAT_AVATARS[HUMAN_INDEX]
  const primaryResume = activeTables[0] ?? null

  // Sync wallet depuis le profil (instantané, 0 réseau)
  useEffect(() => {
    if (typeof profile?.wallet_balance === 'number') {
      setWalletBalance(profile.wallet_balance)
    }
  }, [profile?.wallet_balance])

  // Réseau différé après paint (idle) — n’alourdit pas le first paint
  useEffect(() => {
    if (!user) {
      setActiveTables([])
      if (!profile) setWalletBalance(null)
      return
    }

    let cancelled = false
    let idleId: number | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const run = () => {
      if (cancelled) return
      // Wallet : skip réseau si déjà connu via profil
      if (typeof profile?.wallet_balance !== 'number') {
        void fetchWallet().then(({ wallet }) => {
          if (!cancelled && wallet) setWalletBalance(wallet.balance)
        })
      }
      void findMyActiveTables(user.id).then(res => {
        if (!cancelled && !res.error) setActiveTables(res.tables)
      })
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(run, { timeout: 800 })
    } else {
      timeoutId = setTimeout(run, 120)
    }

    return () => {
      cancelled = true
      if (idleId !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [user, profile?.wallet_balance, profile])

  // Cleanup timer navigation JOUER
  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
    }
  }, [])

  const handlePlay = useCallback(() => {
    setShowMoneyAnim(true)
    if (playTimerRef.current) clearTimeout(playTimerRef.current)
    playTimerRef.current = setTimeout(() => onNavigate('gameMode'), PLAY_NAV_DELAY_MS)
  }, [onNavigate])

  const resumeTable = useCallback(
    (t: MyActiveTable) => {
      setActiveOnlineTableId(t.tableId)
      onNavigate(t.status === 'playing' ? 'onlineGameTable' : 'onlineLobby')
    },
    [onNavigate],
  )

  const goProfile = useCallback(() => onNavigate('profile'), [onNavigate])
  const goStats = useCallback(() => onNavigate('stats'), [onNavigate])
  const goAchievements = useCallback(() => onNavigate('achievements'), [onNavigate])

  return (
    <ScreenShell>
      {/* Un seul décor fixed (moins de couches composite) */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: -80,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(23,107,80,0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
          willChange: 'auto',
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: 'max(16px, env(safe-area-inset-top, 0px)) 20px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: 'linear-gradient(135deg, var(--kora-green), var(--kora-green-deep))',
            border: '2px solid var(--kora-border-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {displayAvatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'var(--kora-muted)', fontSize: 11, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.05em', margin: 0 }}>
            {user ? 'Connecté' : 'Bienvenue'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3
              className="font-display"
              style={{
                color: 'var(--kora-text)',
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </h3>
            <span
              style={{
                background: 'linear-gradient(135deg, var(--kora-gold), var(--kora-gold-dark))',
                color: 'var(--kora-text-inverse)',
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 99,
                fontFamily: 'Plus Jakarta Sans',
                flexShrink: 0,
              }}
            >
              Niv. {level}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={goProfile}
          aria-label="Profil"
          style={{
            background: 'var(--kora-card-bg)',
            border: '1px solid var(--kora-card-border)',
            borderRadius: 14,
            width: 42,
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 18 }}>👤</span>
        </button>
      </div>

      {/* Capital / wallet / resume */}
      <div style={{ margin: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="section-card section-card--green" style={{ borderRadius: 18, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'var(--kora-muted)', fontSize: 10, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.1em', margin: '0 0 4px' }}>
              CAPITAL SOLO
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span
                className={`font-display text-gold${showMoneyAnim ? ' anim-scale-bounce' : ''}`}
                style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}
              >
                {capital.toLocaleString('fr-FR')}
              </span>
              <span style={{ color: 'var(--kora-muted)', fontSize: 12 }}>FCFA</span>
            </div>
            <p style={{ color: 'var(--kora-muted-2)', fontSize: 11, margin: '4px 0 0' }}>
              Net{' '}
              <span style={{ color: netGain >= 0 ? 'var(--kora-success)' : 'var(--kora-danger)' }}>
                {netGain >= 0 ? '+' : ''}
                {netGain.toLocaleString('fr-FR')}
              </span>
            </p>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(214,168,79,0.12)', border: '1px solid var(--kora-border-gold-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            🃏
          </div>
        </div>

        {user && walletBalance !== null && (
          <div className="section-card section-card--gold" style={{ borderRadius: 18, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: 'var(--kora-muted)', fontSize: 10, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.1em', margin: '0 0 4px' }}>
                WALLET COMPTE
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="font-display text-gold" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
                  {walletBalance.toLocaleString('fr-FR')}
                </span>
                <span style={{ color: 'var(--kora-muted)', fontSize: 12 }}>FCFA</span>
              </div>
              <p style={{ color: 'var(--kora-muted-2)', fontSize: 11, margin: '4px 0 0' }}>Buy-in online · cash-out</p>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(214,168,79,0.15)', border: '1px solid var(--kora-border-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              💰
            </div>
          </div>
        )}

        {primaryResume && (
          <button
            type="button"
            onClick={() => resumeTable(primaryResume)}
            className="section-card section-card--green"
            style={{
              width: '100%',
              textAlign: 'left',
              borderRadius: 16,
              padding: '14px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              border: '1.5px solid var(--kora-border-success)',
            }}
          >
            <div>
              <p className="font-display" style={{ color: 'var(--kora-success-soft)', fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>
                {primaryResume.status === 'playing' ? '▶ Reprendre la table' : '↩ Retour au lobby'}
              </p>
              <p style={{ color: 'var(--kora-muted)', fontSize: 12, margin: 0 }}>
                Code {primaryResume.code} · mise {primaryResume.baseStake.toLocaleString('fr-FR')} · siège{' '}
                {primaryResume.seatIndex + 1}
                {activeTables.length > 1 ? ` · +${activeTables.length - 1} autre(s)` : ''}
              </p>
            </div>
            <span style={{ color: 'var(--kora-success)', fontSize: 18, flexShrink: 0 }}>→</span>
          </button>
        )}
      </div>

      {/* Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 16px', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 28, height: 1.5, background: 'linear-gradient(90deg, transparent, rgba(214,168,79,0.6))' }} />
            <span style={{ color: 'rgba(214,168,79,0.5)', fontSize: 16 }}>♠</span>
            <div style={{ width: 28, height: 1.5, background: 'linear-gradient(90deg, rgba(214,168,79,0.6), transparent)' }} />
          </div>
          {/* text-shimmer seulement sur le titre — pas de couches animées multiples */}
          <h1 className="text-shimmer font-display" style={{ fontSize: 44, fontWeight: 800, letterSpacing: '0.15em', margin: 0, lineHeight: 1 }}>
            GARAM
          </h1>
          <p style={{ color: 'var(--kora-muted)', fontSize: 12, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.32em', marginTop: 4 }}>
            PAPARAS
          </p>
        </div>

        <button
          type="button"
          className="btn-primary glow-gold"
          onClick={handlePlay}
          style={{
            width: '100%',
            maxWidth: 320,
            padding: '18px 0',
            fontSize: 18,
            borderRadius: 18,
            letterSpacing: '0.12em',
            marginBottom: 12,
          }}
        >
          JOUER
        </button>

        <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 320 }}>
          {QUICK_LINKS.map(item => (
            <button
              key={item.screen}
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate(item.screen)}
              style={{
                flex: 1,
                padding: '10px 4px',
                fontSize: 11,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                borderRadius: 14,
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mini stats */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px' }}>
        {[
          { label: 'Parties', value: String(gamesPlayed), icon: '🎮' },
          { label: 'Victoires', value: String(gamesWon), icon: '🏆' },
          { label: 'Ratio', value: `${winRatio}%`, icon: '📈' },
        ].map(stat => (
          <div key={stat.label} className="section-card" style={{ flex: 1, borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: 18 }}>{stat.icon}</span>
            <p className="font-display" style={{ color: 'var(--kora-text)', fontWeight: 700, fontSize: 17, margin: '4px 0 2px' }}>
              {stat.value}
            </p>
            <p style={{ color: 'var(--kora-muted)', fontSize: 11, margin: 0 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Activité — content-visibility pour le scroll long */}
      <div style={{ padding: '20px 20px 8px', contentVisibility: 'auto', containIntrinsicSize: '0 220px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 className="font-display" style={{ color: 'var(--kora-text)', fontSize: 15, fontWeight: 700, margin: 0 }}>
            Activité
          </h3>
          <button
            type="button"
            onClick={goStats}
            style={{
              color: 'var(--kora-gold)',
              fontSize: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans',
              fontWeight: 600,
            }}
          >
            Stats →
          </button>
        </div>

        {gamesPlayed === 0 ? (
          <div className="section-card" style={{ borderRadius: 14, padding: 16, textAlign: 'center' }}>
            <p style={{ color: 'var(--kora-muted)', fontSize: 13, margin: '0 0 10px' }}>Aucune partie solo pour l’instant.</p>
            <button type="button" className="btn-primary glow-gold" onClick={handlePlay} style={{ padding: '10px 20px', fontSize: 12, borderRadius: 12 }}>
              Première partie
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="section-card" style={{ borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--kora-muted)', fontSize: 12 }}>
                  {gamesWon}/{gamesPlayed} victoires
                </span>
                <span
                  className="font-display"
                  style={{
                    color: netGain >= 0 ? 'var(--kora-success)' : 'var(--kora-danger)',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {netGain >= 0 ? '+' : ''}
                  {netGain.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div style={{ height: 5, background: 'var(--kora-card-bg)', borderRadius: 99, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, Number(winRatio))}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--kora-green), var(--kora-gold))',
                    borderRadius: 99,
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="section-card" style={{ borderRadius: 14, padding: '12px' }}>
                <p style={{ color: 'var(--kora-muted)', fontSize: 11, margin: '0 0 4px' }}>Meilleur combo</p>
                <p className="font-display" style={{ color: 'var(--kora-gold)', fontSize: 14, fontWeight: 700, margin: 0 }}>
                  {bestComboLabel ?? '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={goAchievements}
                className="section-card"
                style={{ borderRadius: 14, padding: '12px', textAlign: 'left', cursor: 'pointer' }}
              >
                <p style={{ color: 'var(--kora-muted)', fontSize: 11, margin: '0 0 4px' }}>Achievements</p>
                <p className="font-display" style={{ color: 'var(--kora-text)', fontSize: 14, fontWeight: 700, margin: 0 }}>
                  {unlockedCount}/{ACHIEVEMENTS.length}
                </p>
              </button>
            </div>
          </div>
        )}
      </div>
    </ScreenShell>
  )
}
