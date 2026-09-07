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

/** Secondary destinations — SideNav footer + BottomNav overflow sheet (mobile). */
export const MORE_NAV_ITEMS: NavItem[] = [
  { id: 'rules', label: 'Règles', icon: '📖' },
  { id: 'achievements', label: 'Hauts faits', icon: '✨' },
]

export const PLAY_ACTIVE_SCREENS: Screen[] = [
  'onlineLobby',
  'onlineGameTable',
  'lobby',
  'gameTable',
  'gameMode',
  'stakeConfig',
]

export const MORE_ACTIVE_SCREENS: Screen[] = ['rules', 'achievements']

export function isNavItemActive(active: Screen, item: NavItem): boolean {
  if (active === item.id) return true
  if (item.highlight && PLAY_ACTIVE_SCREENS.includes(active)) return true
  return false
}

export function isMoreNavActive(active: Screen): boolean {
  return MORE_ACTIVE_SCREENS.includes(active)
}
