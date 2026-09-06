import { useState } from 'react'
import type { Screen } from './types'
import { ThemeProvider } from './theme/ThemeContext'
import { AuthProvider } from './auth/AuthContext'
import { GameProvider } from './game/GameContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import BottomNav from './components/BottomNav'
import AchievementToast from './components/AchievementToast'
import SplashScreen from './screens/SplashScreen'
import HomeScreen from './screens/HomeScreen'
import GameModeScreen from './screens/GameModeScreen'
import StakeConfigScreen from './screens/StakeConfigScreen'
import LobbyScreen from './screens/LobbyScreen'
import OnlineLobbyScreen from './screens/OnlineLobbyScreen'
import OnlineGameTableScreen from './screens/OnlineGameTableScreen'
import AuthScreen from './screens/AuthScreen'
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
  'onlineGameTable',
  'roundResult',
  'victory',
  'defeat',
  'lobby',
  'onlineLobby',
  'auth',
  'gameMode',
  'stakeConfig',
  'rules',
]

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [authReturnTo, setAuthReturnTo] = useState<Screen>('home')

  const navigate = (s: Screen) => {
    if (s === 'auth') {
      if (screen === 'gameMode' || screen === 'onlineLobby' || screen === 'onlineGameTable') {
        setAuthReturnTo('onlineLobby')
      } else if (screen === 'profile') {
        setAuthReturnTo('profile')
      } else {
        setAuthReturnTo('home')
      }
    }
    setScreen(s)
  }
  const showNav = !NO_NAV_SCREENS.includes(screen)

  return (
    <ThemeProvider>
      <div className="app-root">
        <div className="app-root-pattern" aria-hidden />

        <div className="app-shell">
          <ErrorBoundary>
            <AuthProvider>
              <GameProvider>
                <AchievementToast />
                <div key={screen} className="anim-fade-in app-screen" style={{ position: 'absolute', inset: 0 }}>
                  {screen === 'splash' && <SplashScreen onNavigate={navigate} />}
                  {screen === 'home' && <HomeScreen onNavigate={navigate} />}
                  {screen === 'gameMode' && <GameModeScreen onNavigate={navigate} />}
                  {screen === 'stakeConfig' && <StakeConfigScreen onNavigate={navigate} />}
                  {screen === 'lobby' && <LobbyScreen onNavigate={navigate} />}
                  {screen === 'onlineLobby' && <OnlineLobbyScreen onNavigate={navigate} />}
                  {screen === 'onlineGameTable' && <OnlineGameTableScreen onNavigate={navigate} />}
                  {screen === 'auth' && <AuthScreen onNavigate={navigate} returnTo={authReturnTo} />}
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
            </AuthProvider>
          </ErrorBoundary>
        </div>
      </div>
    </ThemeProvider>
  )
}
