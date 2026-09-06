import { useEffect, useState } from 'react'
import type { Screen } from '../types'
import { useGame, HUMAN_INDEX, SEAT_AVATARS } from '../game/GameContext'
import { useAuth } from '../auth/AuthContext'
import { COMBO_LABEL } from '../game/combo'
import { ACHIEVEMENTS, getUnlockedAchievements } from '../game/achievements'
import { fetchWallet } from '../lib/persistence/cloud'
import { findMyActiveTables, type MyActiveTable } from '../lib/online/api'
import { setActiveOnlineTableId } from '../lib/online/session'

export default function HomeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { players, lifetimeStats } = useGame()
  const { profile, user } = useAuth()
  const capital = players[HUMAN_INDEX].capital
  const winRatio =
    lifetimeStats.gamesPlayed > 0
      ? ((lifetimeStats.gamesWon / lifetimeStats.gamesPlayed) * 100).toFixed(1)
      : '0.0'
  const [showMoneyAnim, setShowMoneyAnim] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [activeTables, setActiveTables] = useState<MyActiveTable[]>([])

  const displayName = profile?.username ?? (user ? 'Joueur' : 'Vous')
  const displayAvatar = profile?.avatar ?? SEAT_AVATARS[HUMAN_INDEX]
  const unlockedCount = getUnlockedAchievements(lifetimeStats).length
  const bestComboLabel = lifetimeStats.bestComboEver
    ? COMBO_LABEL[lifetimeStats.bestComboEver]
    : null

  useEffect(() => {
    if (!user) {
      setWalletBalance(null)
      setActiveTables([])
      return
    }

    if (typeof profile?.wallet_balance === 'number') {
      setWalletBalance(profile.wallet_balance)
    }

    let cancelled = false
    void fetchWallet().then(({ wallet }) => {
      if (!cancelled && wallet) setWalletBalance(wallet.balance)
    })
    void findMyActiveTables(user.id).then(res => {
      if (!cancelled && !res.error) setActiveTables(res.tables)
    })
    return () => {
      cancelled = true
    }
  }, [user, profile?.wallet_balance])

  const handlePlay = () => {
    setShowMoneyAnim(true)
    setTimeout(() => onNavigate('gameMode'), 400)
  }

  function resumeTable(t: MyActiveTable) {
    setActiveOnlineTableId(t.tableId)
    onNavigate(t.status === 'playing' ? 'onlineGameTable' : 'onlineLobby')
  }

  const primaryResume = activeTables[0] ?? null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, #10151A 0%, #0B0D10 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        paddingBottom: 80,
      }}
    >
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.6 }} />

      <div
        style={{
          position: 'fixed',
          top: -80,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(23,107,80,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div
        className="anim-fade-in-down"
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
            background: 'linear-gradient(135deg, #176B50, #123C32)',
            border: '2px solid rgba(214,168,79,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            flexShrink: 0,
          }}
        >
          {displayAvatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              color: '#A9B0B7',
              fontSize: 11,
              fontFamily: 'Plus Jakarta Sans',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            {user ? 'Connecté' : 'Bienvenue'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3
              style={{
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                fontFamily: 'Plus Jakarta Sans',
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
                background: 'linear-gradient(135deg, #D6A84F, #C08030)',
                color: '#0B0D10',
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 99,
                fontFamily: 'Plus Jakarta Sans',
                letterSpacing: '0.04em',
                flexShrink: 0,
              }}
            >
              Niv. {1 + Math.floor(lifetimeStats.gamesWon / 5)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          aria-label="Profil"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
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

      {/* Capital solo + wallet */}
      <div style={{ margin: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          className="anim-fade-in-up"
          style={{
            background: 'linear-gradient(135deg, rgba(18,60,50,0.8) 0%, rgba(16,21,26,0.9) 100%)',
            border: '1px solid rgba(214,168,79,0.25)',
            borderRadius: 18,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animationDelay: '0.05s',
          }}
        >
          <div>
            <p
              style={{
                color: '#A9B0B7',
                fontSize: 10,
                fontFamily: 'Plus Jakarta Sans',
                letterSpacing: '0.1em',
                margin: '0 0 4px',
              }}
            >
              CAPITAL SOLO
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span
                className={`font-display text-gold${showMoneyAnim ? ' anim-scale-bounce' : ''}`}
                style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}
              >
                {capital.toLocaleString('fr-FR')}
              </span>
              <span style={{ color: '#A9B0B7', fontSize: 12 }}>FCFA</span>
            </div>
            <p style={{ color: '#5b636b', fontSize: 11, margin: '4px 0 0' }}>
              Net{' '}
              <span style={{ color: lifetimeStats.netGainTotal >= 0 ? '#4CAF76' : '#C94B4B' }}>
                {lifetimeStats.netGainTotal >= 0 ? '+' : ''}
                {lifetimeStats.netGainTotal.toLocaleString('fr-FR')}
              </span>
            </p>
          </div>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'rgba(214,168,79,0.12)',
              border: '1px solid rgba(214,168,79,0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            🃏
          </div>
        </div>

        {user && walletBalance !== null && (
          <div
            className="anim-fade-in-up"
            style={{
              background: 'linear-gradient(135deg, rgba(214,168,79,0.12), rgba(16,21,26,0.85))',
              border: '1px solid rgba(214,168,79,0.35)',
              borderRadius: 18,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animationDelay: '0.08s',
            }}
          >
            <div>
              <p
                style={{
                  color: '#A9B0B7',
                  fontSize: 10,
                  fontFamily: 'Plus Jakarta Sans',
                  letterSpacing: '0.1em',
                  margin: '0 0 4px',
                }}
              >
                WALLET COMPTE
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="font-display text-gold" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
                  {walletBalance.toLocaleString('fr-FR')}
                </span>
                <span style={{ color: '#A9B0B7', fontSize: 12 }}>FCFA</span>
              </div>
              <p style={{ color: '#5b636b', fontSize: 11, margin: '4px 0 0' }}>
                Buy-in online · cash-out
              </p>
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'rgba(214,168,79,0.15)',
                border: '1px solid rgba(214,168,79,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}
            >
              💰
            </div>
          </div>
        )}

        {/* CTA reprise table online */}
        {primaryResume && (
          <button
            type="button"
            onClick={() => resumeTable(primaryResume)}
            className="anim-fade-in-up"
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'linear-gradient(135deg, rgba(23,107,80,0.55), rgba(16,21,26,0.9))',
              border: '1.5px solid rgba(76,175,118,0.4)',
              borderRadius: 16,
              padding: '14px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              animationDelay: '0.1s',
            }}
          >
            <div>
              <p className="font-display" style={{ color: '#8FD4A8', fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>
                {primaryResume.status === 'playing' ? '▶ Reprendre la table' : '↩ Retour au lobby'}
              </p>
              <p style={{ color: '#A9B0B7', fontSize: 12, margin: 0 }}>
                Code {primaryResume.code} · mise {primaryResume.baseStake.toLocaleString('fr-FR')} · siège{' '}
                {primaryResume.seatIndex + 1}
                {activeTables.length > 1 ? ` · +${activeTables.length - 1} autre(s)` : ''}
              </p>
            </div>
            <span style={{ color: '#4CAF76', fontSize: 18, flexShrink: 0 }}>→</span>
          </button>
        )}
      </div>

      {/* Hero + play */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '28px 20px 16px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 12,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(23,107,80,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 22, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 28, height: 1.5, background: 'linear-gradient(90deg, transparent, rgba(214,168,79,0.6))' }} />
            <span style={{ color: 'rgba(214,168,79,0.5)', fontSize: 16 }}>♠</span>
            <div style={{ width: 28, height: 1.5, background: 'linear-gradient(90deg, rgba(214,168,79,0.6), transparent)' }} />
          </div>
          <h1
            className="text-shimmer font-display"
            style={{ fontSize: 44, fontWeight: 800, letterSpacing: '0.15em', margin: 0, lineHeight: 1 }}
          >
            GARAM
          </h1>
          <p
            style={{
              color: '#A9B0B7',
              fontSize: 12,
              fontFamily: 'Plus Jakarta Sans',
              letterSpacing: '0.32em',
              marginTop: 4,
            }}
          >
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
            boxShadow: '0 8px 28px rgba(214,168,79,0.35)',
          }}
        >
          JOUER
        </button>

        <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 320 }}>
          {[
            { label: 'Partie rapide', icon: '⚡', screen: 'stakeConfig' as Screen },
            { label: 'Classement', icon: '🏆', screen: 'leaderboard' as Screen },
            { label: 'Règles', icon: '📖', screen: 'rules' as Screen },
          ].map(item => (
            <button
              key={item.label}
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
          { label: 'Parties', value: String(lifetimeStats.gamesPlayed), icon: '🎮' },
          { label: 'Victoires', value: String(lifetimeStats.gamesWon), icon: '🏆' },
          { label: 'Ratio', value: `${winRatio}%`, icon: '📈' },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: 18 }}>{stat.icon}</span>
            <p className="font-display" style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: '4px 0 2px' }}>
              {stat.value}
            </p>
            <p style={{ color: '#A9B0B7', fontSize: 11, margin: 0 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Activité enrichie */}
      <div style={{ padding: '20px 20px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontFamily: 'Plus Jakarta Sans', fontWeight: 700, margin: 0 }}>
            Activité
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('stats')}
            style={{
              color: '#D6A84F',
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

        {lifetimeStats.gamesPlayed === 0 ? (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#A9B0B7', fontSize: 13, margin: '0 0 10px' }}>
              Aucune partie solo pour l’instant.
            </p>
            <button
              type="button"
              className="btn-primary glow-gold"
              onClick={handlePlay}
              style={{ padding: '10px 20px', fontSize: 12, borderRadius: 12 }}
            >
              Première partie
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Bilan */}
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#A9B0B7', fontSize: 12 }}>
                  {lifetimeStats.gamesWon}/{lifetimeStats.gamesPlayed} victoires
                </span>
                <span
                  className="font-display"
                  style={{
                    color: lifetimeStats.netGainTotal >= 0 ? '#4CAF76' : '#C94B4B',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {lifetimeStats.netGainTotal >= 0 ? '+' : ''}
                  {lifetimeStats.netGainTotal.toLocaleString('fr-FR')} FCFA
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
                    width: `${Math.min(100, Number(winRatio))}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #176B50, #D6A84F)',
                    borderRadius: 99,
                  }}
                />
              </div>
            </div>

            {/* Highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '12px',
                }}
              >
                <p style={{ color: '#5b636b', fontSize: 10, margin: '0 0 4px', letterSpacing: '0.06em' }}>
                  MEILLEUR COMBO
                </p>
                <p className="font-display" style={{ color: '#D6A84F', fontSize: 15, fontWeight: 700, margin: 0 }}>
                  {bestComboLabel ?? '—'}
                </p>
              </div>
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '12px',
                }}
              >
                <p style={{ color: '#5b636b', fontSize: 10, margin: '0 0 4px', letterSpacing: '0.06em' }}>
                  CAPITAL MAX
                </p>
                <p className="font-display" style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>
                  {lifetimeStats.maxCapitalEver.toLocaleString('fr-FR')}
                </p>
              </div>
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '12px',
                }}
              >
                <p style={{ color: '#5b636b', fontSize: 10, margin: '0 0 4px', letterSpacing: '0.06em' }}>
                  ROUNDS / PLIS
                </p>
                <p className="font-display" style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>
                  {lifetimeStats.totalRoundsWon} · {lifetimeStats.totalTricksWon}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('achievements')}
                style={{
                  background: 'rgba(214,168,79,0.08)',
                  border: '1px solid rgba(214,168,79,0.25)',
                  borderRadius: 14,
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <p style={{ color: '#5b636b', fontSize: 10, margin: '0 0 4px', letterSpacing: '0.06em' }}>
                  HAUTS FAITS
                </p>
                <p className="font-display" style={{ color: '#D6A84F', fontSize: 15, fontWeight: 700, margin: 0 }}>
                  {unlockedCount}/{ACHIEVEMENTS.length}
                </p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
