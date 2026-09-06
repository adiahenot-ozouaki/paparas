import type { Screen } from '../types'

export type NavItem = {
  id: Screen
  label: string
  icon: string
  highlight?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Accueil', icon: '⌂' },
  { id: 'leaderboard', label: 'Classement', icon: '🏆' },
  { id: 'gameMode', label: 'Jouer', icon: '♠', highlight: true },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'profile', label: 'Profil', icon: '◉' },
]

export const PLAY_ACTIVE_SCREENS: Screen[] = [
  'onlineLobby',
  'onlineGameTable',
  'lobby',
  'gameTable',
  'gameMode',
  'stakeConfig',
]

export function isNavItemActive(active: Screen, item: NavItem): boolean {
  if (active === item.id) return true
  if (item.highlight && PLAY_ACTIVE_SCREENS.includes(active)) return true
  return false
}
