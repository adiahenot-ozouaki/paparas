import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './theme/ThemeContext'
import { AuthProvider } from './auth/AuthContext'
import { GameProvider } from './game/GameContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import AchievementToast from './components/AchievementToast'
import BareLayout from './layouts/BareLayout'
import ChromeLayout from './layouts/ChromeLayout'
import { AuthPage, screenPage } from './navigation/screenPage'
import { pathFor } from './navigation/paths'

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
import FreestyleGameTableScreen from './screens/FreestyleGameTableScreen'
import TournamentsScreen from './screens/TournamentsScreen'

const SplashPage = screenPage(SplashScreen)
const HomePage = screenPage(HomeScreen)
const GameModePage = screenPage(GameModeScreen)
const StakeConfigPage = screenPage(StakeConfigScreen)
const LobbyPage = screenPage(LobbyScreen)
const OnlineLobbyPage = screenPage(OnlineLobbyScreen)
const OnlineGameTablePage = screenPage(OnlineGameTableScreen)
const GameTablePage = screenPage(GameTableScreen)
const RoundResultPage = screenPage(RoundResultScreen)
const VictoryPage = screenPage(VictoryScreen)
const DefeatPage = screenPage(DefeatScreen)
const ProfilePage = screenPage(ProfileScreen)
const LeaderboardPage = screenPage(LeaderboardScreen)
const StatsPage = screenPage(StatsScreen)
const AchievementsPage = screenPage(AchievementsScreen)
const RulesPage = screenPage(RulesScreen)
const FreestylePage = screenPage(FreestyleGameTableScreen)
const TournamentsPage = screenPage(TournamentsScreen)

export default function App() {
  return (
    <ThemeProvider>
      <div className="app-root">
        <div className="app-root-pattern" aria-hidden />

        <div className="app-shell">
          <ErrorBoundary>
            <AuthProvider>
              <GameProvider>
                <AchievementToast />
                <BrowserRouter>
                  <Routes>
                    <Route element={<BareLayout />}>
                      <Route path={pathFor('splash')} element={<SplashPage />} />
                      <Route path={pathFor('auth')} element={<AuthPage Comp={AuthScreen} />} />
                      <Route path={pathFor('roundResult')} element={<RoundResultPage />} />
                      <Route path={pathFor('victory')} element={<VictoryPage />} />
                      <Route path={pathFor('defeat')} element={<DefeatPage />} />
                      <Route path={pathFor('freestyleTable')} element={<FreestylePage />} />
                    </Route>

                    <Route element={<ChromeLayout />}>
                      <Route path={pathFor('home')} element={<HomePage />} />
                      <Route path={pathFor('gameMode')} element={<GameModePage />} />
                      <Route path={pathFor('stakeConfig')} element={<StakeConfigPage />} />
                      <Route path={pathFor('lobby')} element={<LobbyPage />} />
                      <Route path={pathFor('onlineLobby')} element={<OnlineLobbyPage />} />
                      <Route path={pathFor('onlineGameTable')} element={<OnlineGameTablePage />} />
                      <Route path={pathFor('gameTable')} element={<GameTablePage />} />
                      <Route path={pathFor('profile')} element={<ProfilePage />} />
                      <Route path={pathFor('leaderboard')} element={<LeaderboardPage />} />
                      <Route path={pathFor('stats')} element={<StatsPage />} />
                      <Route path={pathFor('achievements')} element={<AchievementsPage />} />
                      <Route path={pathFor('rules')} element={<RulesPage />} />
                      <Route path={pathFor('tournaments')} element={<TournamentsPage />} />
                    </Route>

                    <Route path="*" element={<Navigate to={pathFor('splash')} replace />} />
                  </Routes>
                </BrowserRouter>
              </GameProvider>
            </AuthProvider>
          </ErrorBoundary>
        </div>
      </div>
    </ThemeProvider>
  )
}
