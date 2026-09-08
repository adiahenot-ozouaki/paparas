import type { Screen } from '../types'

/** URL path for each logical screen (React Router). */
export const SCREEN_PATH: Record<Screen, string> = {
  splash: '/',
  home: '/home',
  gameMode: '/mode',
  stakeConfig: '/mode/config',
  lobby: '/lobby',
  onlineLobby: '/online',
  onlineGameTable: '/play/online',
  auth: '/auth',
  gameTable: '/play',
  freestyleTable: '/freestyle',
  roundResult: '/result',
  victory: '/victory',
  defeat: '/defeat',
  profile: '/profile',
  leaderboard: '/leaderboard',
  stats: '/stats',
  achievements: '/achievements',
  rules: '/rules',
}

const PATH_SCREEN: Record<string, Screen> = Object.fromEntries(
  Object.entries(SCREEN_PATH).map(([screen, path]) => [path, screen as Screen]),
) as Record<string, Screen>

export function pathFor(screen: Screen): string {
  return SCREEN_PATH[screen]
}

/** Resolve current Screen from location.pathname (longest path wins). */
export function screenFromPathname(pathname: string): Screen {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  if (PATH_SCREEN[normalized]) return PATH_SCREEN[normalized]

  const entries = Object.entries(SCREEN_PATH).sort((a, b) => b[1].length - a[1].length)
  for (const [screen, path] of entries) {
    if (path !== '/' && (normalized === path || normalized.startsWith(path + '/'))) {
      return screen as Screen
    }
  }
  return 'home'
}

/** Screens rendered without SideNav / TopBar / BottomNav. */
export const BARE_SCREENS: Screen[] = [
  'splash',
  'auth',
  'roundResult',
  'victory',
  'defeat',
  'freestyleTable',
]

export function isBareScreen(screen: Screen): boolean {
  return BARE_SCREENS.includes(screen)
}
