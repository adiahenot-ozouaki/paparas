import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Screen } from '../types'
import AdSlot from '../components/ads/AdSlot'
import { useGame, HUMAN_INDEX, SEAT_AVATARS } from '../game/GameContext'
import { useAuth } from '../auth/AuthContext'
import { COMBO_LABEL } from '../game/combo'
import { ACHIEVEMENTS, getUnlockedAchievements } from '../game/achievements'
import { getPlayerProgress } from '../game/progression'
import { fetchWallet } from '../lib/persistence/cloud'
import { findMyActiveTables, type MyActiveTable } from '../lib/online/api'
import { setActiveOnlineTableId } from '../lib/online/session'
import { Zap, Trophy, BookOpen, Gamepad2, TrendingUp, Coins, ArrowRight, Undo2, Play, SpadeIcon, AvatarIcon, User } from '../components/icons'
import {
  EmptyState,
  IconButton,
  MoneyCard,
  ScreenShell,
  SectionCard,
  StatTile,
  UiButton,
} from '../components/ui'

const QUICK_LINKS: { label: string; icon: typeof Zap; screen: Screen }[] = [
  { label: 'Partie rapide', icon: Zap, screen: 'stakeConfig' },
  { label: 'Classement', icon: Trophy, screen: 'leaderboard' },
  { label: 'Regles', icon: BookOpen, screen: 'rules' },
]

const PLAY_NAV_DELAY_MS = 280

export default function HomeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { players, lifetimeStats } = useGame()
  const { profile, user } = useAuth()

  const capital = players[HUMAN_INDEX].capital

  const [showMoneyAnim, setShowMoneyAnim] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(() =>
    typeof profile?.wallet_balance === 'number' ? profile.wallet_balance : null,
  )
  const [activeTables, setActiveTables] = useState<MyActiveTable[]>([])
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { winRatio, progress, unlockedCount, bestComboLabel, netGain, gamesPlayed, gamesWon } = useMemo(() => {
    const gp = lifetimeStats.gamesPlayed
    const gw = lifetimeStats.gamesWon
    return {
      winRatio: gp > 0 ? ((gw / gp) * 100).toFixed(1) : '0.0',
      progress: getPlayerProgress(lifetimeStats),
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

  useEffect(() => {
    if (typeof profile?.wallet_balance === 'number') {
      setWalletBalance(profile.wallet_balance)
    }
  }, [profile?.wallet_balance])

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
      <div className="home-glow" aria-hidden />

      <div className="home-layout">
        <header className="home-header">
          <div className="home-avatar">
            <AvatarIcon avatar={displayAvatar} size={28} />
          </div>
          <div className="home-header-meta">
            <p className="home-header-status">{user ? 'Connecte' : 'Bienvenue'}</p>
            <div className="home-header-name-row">
              <h3 className="font-display home-header-name">{displayName}</h3>
              <span className="home-level-pill">
                Niv. {progress.level} · {progress.title}
              </span>
            </div>
          </div>
          <IconButton onClick={goProfile} aria-label="Profil">
            <User size={18} strokeWidth={2} className="kora-icon" aria-hidden />
          </IconButton>
        </header>

        <div className="home-main">
          <AdSlot placement="home-banner-top" className="home-ad-top" />

          <div className="home-money-stack">
            <MoneyCard
              variant="green"
              label="Capital solo"
              amount={capital}
              animateAmount={showMoneyAnim}
              icon={<SpadeIcon size={18} className="kora-icon" />}
              subtitle={
                <>
                  Net{' '}
                  <span className={netGain >= 0 ? 'text-success' : 'text-danger'}>
                    {netGain >= 0 ? '+' : ''}
                    {netGain.toLocaleString('fr-FR')}
                  </span>
                </>
              }
            />

            {user && walletBalance !== null && (
              <MoneyCard
                variant="gold"
                label="Wallet compte"
                amount={walletBalance}
                icon={<Coins size={18} className="kora-icon" />}
                subtitle="Buy-in online · cash-out"
              />
            )}

            {primaryResume && (
              <SectionCard
                variant="green"
                onClick={() => resumeTable(primaryResume)}
                className="home-resume"
              >
                <div className="home-resume-row">
                  <div>
                    <p className="font-display home-resume-title">
                      {primaryResume.status === 'playing' ? 'Reprendre la table' : 'Retour au lobby'}
                    </p>
                    <p className="home-resume-meta">
                      Code {primaryResume.code} · mise {primaryResume.baseStake.toLocaleString('fr-FR')} · siege{' '}
                      {primaryResume.seatIndex + 1}
                      {activeTables.length > 1 ? ` · +${activeTables.length - 1} autre(s)` : ''}
                    </p>
                  </div>
                  <span className="home-resume-arrow">
                    <ArrowRight size={16} className="kora-icon" aria-hidden />
                  </span>
                </div>
              </SectionCard>
            )}
          </div>

          <SectionCard
            className="home-tourney-teaser"
            variant="gold"
            onClick={() => onNavigate('tournaments')}
          >
            <div className="home-resume-row">
              <div>
                <p className="font-display home-resume-title">Tournois</p>
                <p className="home-resume-meta">Competitions · lots FCFA · inscriptions</p>
              </div>
              <span className="home-resume-arrow">→</span>
            </div>
          </SectionCard>

          <div className="home-hero">
            <div className="home-brand">
              <div className="home-brand-ornament">
                <span className="home-brand-line home-brand-line--left" />
                <span className="home-brand-suit">
                  <SpadeIcon size={28} className="kora-icon" />
                </span>
                <span className="home-brand-line home-brand-line--right" />
              </div>
              <h1 className="text-shimmer font-display home-brand-title">GARAM</h1>
              <p className="home-brand-sub">PAPARAS</p>
            </div>

            <UiButton onClick={handlePlay} fullWidth className="home-play-btn glow-gold">
              JOUER
            </UiButton>

            <div className="home-quick-links">
              {QUICK_LINKS.map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.screen}
                    type="button"
                    className="btn-secondary home-quick-link"
                    onClick={() => onNavigate(item.screen)}
                  >
                    <span className="home-quick-icon">
                      <Icon size={18} strokeWidth={2} className="kora-icon" aria-hidden />
                    </span>
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <AdSlot placement="home-banner-bottom" className="home-ad-bottom" />
        </div>

        <aside className="home-side">
          <div className="home-stats-row">
            <StatTile icon={<Gamepad2 size={18} className="kora-icon" />} value={String(gamesPlayed)} label="Parties" />
            <StatTile icon={<Trophy size={18} className="kora-icon" />} value={String(gamesWon)} label="Victoires" />
            <StatTile icon={<TrendingUp size={18} className="kora-icon" />} value={`${winRatio}%`} label="Ratio" />
          </div>

          <section className="home-activity">
            <div className="home-activity-head">
              <h3 className="font-display home-activity-title">Activite</h3>
              <UiButton variant="ghost" onClick={goStats}>
                Stats
              </UiButton>
            </div>

            {gamesPlayed === 0 ? (
              <EmptyState
                title="Aucune partie solo pour l'instant."
                dashed={false}
                action={
                  <UiButton onClick={handlePlay} className="home-first-play">
                    Premiere partie
                  </UiButton>
                }
              />
            ) : (
              <div className="home-activity-body">
                <SectionCard className="home-win-card">
                  <div className="home-win-row">
                    <span className="home-win-label">
                      {gamesWon}/{gamesPlayed} victoires · Niv. {progress.level}
                    </span>
                    <span className={`font-display home-win-gain ${netGain >= 0 ? 'text-success' : 'text-danger'}`}>
                      {netGain >= 0 ? '+' : ''}
                      {netGain.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  <div className="home-win-bar">
                    <div className="home-win-bar-fill" style={{ width: `${progress.percent}%` }} />
                  </div>
                </SectionCard>

                <div className="home-activity-grid">
                  <SectionCard className="home-combo-card">
                    <p className="home-combo-label">Meilleur combo</p>
                    <p className="font-display home-combo-value">{bestComboLabel ?? '—'}</p>
                  </SectionCard>
                  <SectionCard onClick={goAchievements} className="home-combo-card">
                    <p className="home-combo-label">Achievements</p>
                    <p className="font-display home-combo-count">
                      {unlockedCount}/{ACHIEVEMENTS.length}
                    </p>
                  </SectionCard>
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
    </ScreenShell>
  )
}
