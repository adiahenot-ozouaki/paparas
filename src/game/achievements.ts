import type { LifetimeStats } from '../lib/persistence/stats'

// ==========================================================================
// game/achievements.ts — Hauts faits dérivés purement de LifetimeStats.
// icon: clé Lucide (voir ACHIEVEMENT_ICONS dans components/icons).
// ==========================================================================

export type AchievementCategory = 'Progression' | 'Combos' | 'Règles spéciales' | 'Finance'

export interface AchievementProgress {
  current: number
  target: number
}

export interface AchievementDef {
  id: string
  category: AchievementCategory
  name: string
  desc: string
  icon: string
  color: string
  isUnlocked: (stats: LifetimeStats) => boolean
  progress?: (stats: LifetimeStats) => AchievementProgress
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_game',
    category: 'Progression',
    name: 'Première partie',
    desc: 'Jouer votre première partie.',
    icon: 'gamepad',
    color: '#A9B0B7',
    isUnlocked: s => s.gamesPlayed >= 1,
    progress: s => ({ current: Math.min(s.gamesPlayed, 1), target: 1 }),
  },
  {
    id: 'first_win',
    category: 'Progression',
    name: 'Première victoire',
    desc: 'Remporter votre première partie.',
    icon: 'trophy',
    color: '#D6A84F',
    isUnlocked: s => s.gamesWon >= 1,
    progress: s => ({ current: Math.min(s.gamesWon, 1), target: 1 }),
  },
  {
    id: 'ten_wins',
    category: 'Progression',
    name: 'Dix victoires',
    desc: 'Remporter 10 parties.',
    icon: 'medal',
    color: '#D6A84F',
    isUnlocked: s => s.gamesWon >= 10,
    progress: s => ({ current: Math.min(s.gamesWon, 10), target: 10 }),
  },
  {
    id: 'fifty_wins',
    category: 'Progression',
    name: 'Cinquante victoires',
    desc: 'Remporter 50 parties.',
    icon: 'crown',
    color: '#F0D58A',
    isUnlocked: s => s.gamesWon >= 50,
    progress: s => ({ current: Math.min(s.gamesWon, 50), target: 50 }),
  },
  {
    id: 'hundred_rounds',
    category: 'Progression',
    name: 'Cent rounds gagnés',
    desc: 'Remporter 100 rounds au total.',
    icon: 'target',
    color: '#176B50',
    isUnlocked: s => s.totalRoundsWon >= 100,
    progress: s => ({ current: Math.min(s.totalRoundsWon, 100), target: 100 }),
  },
  {
    id: 'five_hundred_tricks',
    category: 'Progression',
    name: 'Cinq cents plis',
    desc: 'Remporter 500 plis au total.',
    icon: 'sparkles',
    color: '#9B59B6',
    isUnlocked: s => s.totalTricksWon >= 500,
    progress: s => ({ current: Math.min(s.totalTricksWon, 500), target: 500 }),
  },
  {
    id: 'first_kora',
    category: 'Combos',
    name: 'Premier Kora',
    desc: 'Réaliser le combo Kora (×2) : un 3 joué en dernière carte du round.',
    icon: 'grid',
    color: '#4CAF76',
    isUnlocked: s => s.comboCounts.kora >= 1,
    progress: s => ({ current: Math.min(s.comboCounts.kora, 1), target: 1 }),
  },
  {
    id: 'first_33',
    category: 'Combos',
    name: 'Premier 33',
    desc: 'Réaliser le combo 33 (×4) : deux 3 consécutifs en fin de manche.',
    icon: 'diamond',
    color: '#D6A84F',
    isUnlocked: s => s.comboCounts['33'] >= 1,
    progress: s => ({ current: Math.min(s.comboCounts['33'], 1), target: 1 }),
  },
  {
    id: 'first_trinity',
    category: 'Combos',
    name: 'Première Trinity',
    desc: 'Réaliser le combo Trinity (×8) : trois 3 consécutifs en fin de manche.',
    icon: 'spade',
    color: '#9B59B6',
    isUnlocked: s => s.comboCounts.trinity >= 1,
    progress: s => ({ current: Math.min(s.comboCounts.trinity, 1), target: 1 }),
  },
  {
    id: 'first_kmt',
    category: 'Combos',
    name: 'Premier KMT',
    desc: 'Réaliser le combo KMT (×16) : les 4 trois du paquet, joués en dernier.',
    icon: 'zap',
    color: '#C94B4B',
    isUnlocked: s => s.comboCounts.kmt >= 1,
    progress: s => ({ current: Math.min(s.comboCounts.kmt, 1), target: 1 }),
  },
  {
    id: 'first_flush',
    category: 'Règles spéciales',
    name: 'Flush Maître',
    desc: 'Déclencher la règle Flush (5 cartes de la même couleur en main).',
    icon: 'heart',
    color: '#D6A84F',
    isUnlocked: s => s.specialRuleCounts.flush >= 1,
    progress: s => ({ current: Math.min(s.specialRuleCounts.flush, 1), target: 1 }),
  },
  {
    id: 'first_21',
    category: 'Règles spéciales',
    name: 'Maître du 21',
    desc: 'Déclencher la règle 21 (la somme de la main vaut exactement 21).',
    icon: 'hash',
    color: '#4CAF76',
    isUnlocked: s => s.specialRuleCounts['21'] >= 1,
    progress: s => ({ current: Math.min(s.specialRuleCounts['21'], 1), target: 1 }),
  },
  {
    id: 'first_t7',
    category: 'Règles spéciales',
    name: 'Maître du T7',
    desc: 'Déclencher la règle T7 (au moins trois 7 en main).',
    icon: 'seven',
    color: '#9B59B6',
    isUnlocked: s => s.specialRuleCounts.t7 >= 1,
    progress: s => ({ current: Math.min(s.specialRuleCounts.t7, 1), target: 1 }),
  },
  {
    id: 'positive_net',
    category: 'Finance',
    name: 'Dans le vert',
    desc: "Avoir un gain net cumulé positif sur l'ensemble de vos parties.",
    icon: 'coins',
    color: '#4CAF76',
    isUnlocked: s => s.netGainTotal > 0,
    progress: s => ({ current: s.netGainTotal > 0 ? 1 : 0, target: 1 }),
  },
  {
    id: 'capital_10k',
    category: 'Finance',
    name: '10 000 FCFA',
    desc: 'Atteindre 10 000 FCFA de capital.',
    icon: 'banknote',
    color: '#D6A84F',
    isUnlocked: s => s.maxCapitalEver >= 10_000,
    progress: s => ({ current: Math.min(s.maxCapitalEver, 10_000), target: 10_000 }),
  },
  {
    id: 'capital_50k',
    category: 'Finance',
    name: '50 000 FCFA',
    desc: 'Atteindre 50 000 FCFA de capital.',
    icon: 'gem',
    color: '#F0D58A',
    isUnlocked: s => s.maxCapitalEver >= 50_000,
    progress: s => ({ current: Math.min(s.maxCapitalEver, 50_000), target: 50_000 }),
  },
]

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  'Progression',
  'Combos',
  'Règles spéciales',
  'Finance',
]

export function getUnlockedAchievements(stats: LifetimeStats): AchievementDef[] {
  return ACHIEVEMENTS.filter(a => a.isUnlocked(stats))
}

export function getAchievementProgress(
  def: AchievementDef,
  stats: LifetimeStats,
): AchievementProgress | null {
  return def.progress?.(stats) ?? null
}

export function diffNewlyUnlocked(prev: LifetimeStats, next: LifetimeStats): AchievementDef[] {
  return ACHIEVEMENTS.filter(a => !a.isUnlocked(prev) && a.isUnlocked(next))
}

const STORAGE_KEY_SEEN = 'kora:achievementsSeen:v1'

export function loadSeenAchievementIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEEN)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

export function saveSeenAchievementIds(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY_SEEN, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

export function markAchievementsSeen(ids: string[]): Set<string> {
  const seen = loadSeenAchievementIds()
  for (const id of ids) seen.add(id)
  saveSeenAchievementIds(seen)
  return seen
}

export function seedSeenFromStats(stats: LifetimeStats): Set<string> {
  const seen = loadSeenAchievementIds()
  let changed = false
  for (const a of ACHIEVEMENTS) {
    if (a.isUnlocked(stats) && !seen.has(a.id)) {
      seen.add(a.id)
      changed = true
    }
  }
  if (changed) saveSeenAchievementIds(seen)
  return seen
}
