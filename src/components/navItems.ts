import type { Screen } from '../types'
import type { LucideIcon } from 'lucide-react'
import { Home, Trophy, BarChart3, User, BookOpen, Sparkles } from 'lucide-react'
import { SpadeIcon } from './icons'

export type NavItem = {
  id: Screen
  label: string
  icon: LucideIcon
  highlight?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'leaderboard', label: 'Classement', icon: Trophy },
  { id: 'gameMode', label: 'Jouer', icon: SpadeIcon as LucideIcon, highlight: true },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'profile', label: 'Profil', icon: User },
]

/** Secondary destinations — SideNav footer + BottomNav overflow sheet (mobile). */
export const MORE_NAV_ITEMS: NavItem[] = [
  { id: 'rules', label: 'Règles', icon: BookOpen },
  { id: 'achievements', label: 'Hauts faits', icon: Sparkles },
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
