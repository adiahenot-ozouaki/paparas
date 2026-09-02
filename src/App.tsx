import { useState } from 'react'
import type { Screen } from './types'
import { GameProvider } from './game/GameContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import BottomNav from './components/BottomNav'
import SplashScreen from './screens/SplashScreen'
import HomeScreen from './screens/HomeScreen'
import GameModeScreen from './screens/GameModeScreen'
import StakeConfigScreen from './screens/StakeConfigScreen'
import LobbyScreen from './screens/LobbyScreen'
import GameTableScreen from './screens/GameTableScreen'
import RoundResultScreen from './screens/RoundResultScreen'
import VictoryScreen from './screens/VictoryScreen'
import DefeatScreen from './screens/DefeatScreen'
import ProfileScreen from './screens/ProfileScreen'
import LeaderboardScreen from './screens/LeaderboardScreen'
import StatsScreen from './screens/StatsScreen'
import AchievementsScreen from './screens/AchievementsScreen'
import RulesScreen from './screens/RulesScreen'

const NO_NAV_SCREENS: Screen[] = [
  'splash',
  'gameTable',
  'roundResult',
  'victory',
  'defeat',
  'lobby',
  'gameMode',
  'stakeConfig',
  'rules',
]

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')

  const navigate = (s: Screen) => setScreen(s)
  const showNav = !NO_NAV_SCREENS.includes(screen)

  return (
    <div className="app-root">
      {/* Texture de fond (visible surtout sur très grands écrans si shell limité) */}
      <div className="app-root-pattern" aria-hidden />

      {/*
        Shell principal : plein viewport sur mobile / tablette.
        Sur desktop large, largeur max confortable centrée (voir index.css).
      */}
      <div className="app-shell">
        <ErrorBoundary>
          <GameProvider>
            <div key={screen} className="anim-fade-in app-screen" style={{ position: 'absolute', inset: 0 }}>
              {screen === 'splash' && <SplashScreen onNavigate={navigate} />}
              {screen === 'home' && <HomeScreen onNavigate={navigate} />}
              {screen === 'gameMode' && <GameModeScreen onNavigate={navigate} />}
              {screen === 'stakeConfig' && <StakeConfigScreen onNavigate={navigate} />}
              {screen === 'lobby' && <LobbyScreen onNavigate={navigate} />}
              {screen === 'gameTable' && <GameTableScreen onNavigate={navigate} />}
              {screen === 'roundResult' && <RoundResultScreen onNavigate={navigate} />}
              {screen === 'victory' && <VictoryScreen onNavigate={navigate} />}
              {screen === 'defeat' && <DefeatScreen onNavigate={navigate} />}
              {screen === 'profile' && <ProfileScreen onNavigate={navigate} />}
              {screen === 'leaderboard' && <LeaderboardScreen onNavigate={navigate} />}
              {screen === 'stats' && <StatsScreen onNavigate={navigate} />}
              {screen === 'achievements' && <AchievementsScreen onNavigate={navigate} />}
              {screen === 'rules' && <RulesScreen onNavigate={navigate} />}
            </div>

            {showNav && <BottomNav active={screen} onNavigate={navigate} />}
          </GameProvider>
        </ErrorBoundary>
      </div>
    </div>
  )
}
