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

const NO_NAV_SCREENS: Screen[] = ['splash', 'gameTable', 'roundResult', 'victory', 'defeat', 'lobby', 'gameMode', 'stakeConfig', 'rules']

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')

  const navigate = (s: Screen) => setScreen(s)
  const showNav = !NO_NAV_SCREENS.includes(screen)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070A0D',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Desktop background pattern */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\'%3E%3Cpolygon points=\'16,0 32,16 16,32 0,16\' fill=\'none\' stroke=\'rgba(214,168,79,0.04)\' stroke-width=\'0.8\'/%3E%3C/svg%3E")',
        pointerEvents: 'none',
      }} />

      {/* Mobile container */}
      <div style={{
        width: '100%',
        maxWidth: 430,
        height: '100svh',
        maxHeight: 932,
        position: 'relative',
        overflow: 'hidden',
        background: '#0B0D10',
        boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
        borderRadius: 'clamp(0px, calc((100vw - 430px) / 2), 40px)',
      }}>

        {/* Filet de sécurité : une erreur de rendu n'importe où dans l'app
            affiche un écran de récupération plutôt qu'un écran blanc. */}
        <ErrorBoundary>
          {/* GameProvider : état de partie partagé entre gameTable / roundResult / victory / defeat */}
          <GameProvider>
            {/* Screen renderer */}
            <div key={screen} className="anim-fade-in" style={{ position: 'absolute', inset: 0 }}>
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

            {/* Bottom nav overlay */}
            {showNav && (
              <BottomNav active={screen} onNavigate={navigate} />
            )}
          </GameProvider>
        </ErrorBoundary>
      </div>
    </div>
  )
}
