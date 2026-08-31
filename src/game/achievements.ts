import type { LifetimeStats } from './GameContext'

// ==========================================================================
// game/achievements.ts — Définitions des hauts faits.
//
// Contrairement à l'ancien AchievementsScreen (liste statique avec des
// booléens "unlocked" codés en dur), chaque achievement est ici une pure
// fonction de LifetimeStats : isUnlocked(stats) => boolean. Il n'y a donc
// AUCUN état de déblocage à stocker séparément ni à synchroniser — le
// statut "débloqué" se recalcule à chaque lecture à partir des vraies
// statistiques cumulées (game/GameContext.tsx), ce qui élimine toute
// classe de bug de désynchronisation.
//
// Reste volontairement dans game/ (pas de import React) pour respecter la
// même convention de pureté que le reste du moteur de jeu : ce fichier
// est testable en isolation et réutilisable tel quel côté serveur le jour
// où les statistiques seront calculées côté backend.
//
// Catégorie "Adversaires" volontairement absente : elle nécessiterait de
// tracer les victoires PAR adversaire, une donnée qui n'existe pas encore
// dans LifetimeStats. Mieux vaut ne pas l'avoir que d'inventer des
// chiffres, comme c'était le cas avant ce nettoyage.
// ==========================================================================

export type AchievementCategory = 'Progression' | 'Combos' | 'Règles spéciales' | 'Finance'

export interface AchievementDef {
  id: string
  category: AchievementCategory
  name: string
  desc: string
  icon: string
  color: string
  isUnlocked: (stats: LifetimeStats) => boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- Progression ---
  {
    id: 'first_game',
    category: 'Progression',
    name: 'Première partie',
    desc: 'Jouer votre première partie.',
    icon: '🎮',
    color: '#A9B0B7',
    isUnlocked: s => s.gamesPlayed >= 1,
  },
  {
    id: 'first_win',
    category: 'Progression',
    name: 'Première victoire',
    desc: 'Remporter votre première partie.',
    icon: '🏆',
    color: '#D6A84F',
    isUnlocked: s => s.gamesWon >= 1,
  },
  {
    id: 'ten_wins',
    category: 'Progression',
    name: 'Dix victoires',
    desc: 'Remporter 10 parties.',
    icon: '🏅',
    color: '#D6A84F',
    isUnlocked: s => s.gamesWon >= 10,
  },
  {
    id: 'fifty_wins',
    category: 'Progression',
    name: 'Cinquante victoires',
    desc: 'Remporter 50 parties.',
    icon: '👑',
    color: '#F0D58A',
    isUnlocked: s => s.gamesWon >= 50,
  },
  {
    id: 'hundred_rounds',
    category: 'Progression',
    name: 'Cent rounds gagnés',
    desc: 'Remporter 100 rounds au total.',
    icon: '🎯',
    color: '#176B50',
    isUnlocked: s => s.totalRoundsWon >= 100,
  },
  {
    id: 'five_hundred_tricks',
    category: 'Progression',
    name: 'Cinq cents plis',
    desc: 'Remporter 500 plis au total.',
    icon: '✨',
    color: '#9B59B6',
    isUnlocked: s => s.totalTricksWon >= 500,
  },

  // --- Combos ---
  {
    id: 'first_kora',
    category: 'Combos',
    name: 'Premier Kora',
    desc: 'Réaliser le combo Kora (×2) : un 3 joué en dernière carte du round.',
    icon: '🃏',
    color: '#4CAF76',
    isUnlocked: s => s.comboCounts.kora >= 1,
  },
  {
    id: 'first_33',
    category: 'Combos',
    name: 'Premier 33',
    desc: 'Réaliser le combo 33 (×4) : deux 3 consécutifs en fin de manche.',
    icon: '♦',
    color: '#D6A84F',
    isUnlocked: s => s.comboCounts['33'] >= 1,
  },
  {
    id: 'first_trinity',
    category: 'Combos',
    name: 'Première Trinity',
    desc: 'Réaliser le combo Trinity (×8) : trois 3 consécutifs en fin de manche.',
    icon: '♠',
    color: '#9B59B6',
    isUnlocked: s => s.comboCounts.trinity >= 1,
  },
  {
    id: 'first_kmt',
    category: 'Combos',
    name: 'Premier KMT',
    desc: 'Réaliser le combo KMT (×16) : les 4 trois du paquet, joués en dernier.',
    icon: '⚡',
    color: '#C94B4B',
    isUnlocked: s => s.comboCounts.kmt >= 1,
  },

  // --- Règles spéciales ---
  {
    id: 'first_flush',
    category: 'Règles spéciales',
    name: 'Flush Maître',
    desc: 'Déclencher la règle Flush (5 cartes de la même couleur en main).',
    icon: '♥',
    color: '#D6A84F',
    isUnlocked: s => s.specialRuleCounts.flush >= 1,
  },
  {
    id: 'first_21',
    category: 'Règles spéciales',
    name: 'Maître du 21',
    desc: 'Déclencher la règle 21 (la somme de la main vaut exactement 21).',
    icon: '🔢',
    color: '#4CAF76',
    isUnlocked: s => s.specialRuleCounts['21'] >= 1,
  },
  {
    id: 'first_t7',
    category: 'Règles spéciales',
    name: 'Maître du T7',
    desc: 'Déclencher la règle T7 (au moins trois 7 en main).',
    icon: '7️⃣',
    color: '#9B59B6',
    isUnlocked: s => s.specialRuleCounts.t7 >= 1,
  },

  // --- Finance ---
  {
    id: 'positive_net',
    category: 'Finance',
    name: 'Dans le vert',
    desc: 'Avoir un gain net cumulé positif sur l\'ensemble de vos parties.',
    icon: '💰',
    color: '#4CAF76',
    isUnlocked: s => s.netGainTotal > 0,
  },
  {
    id: 'capital_10k',
    category: 'Finance',
    name: '10 000 FCFA',
    desc: 'Atteindre 10 000 FCFA de capital.',
    icon: '💵',
    color: '#D6A84F',
    isUnlocked: s => s.maxCapitalEver >= 10_000,
  },
  {
    id: 'capital_50k',
    category: 'Finance',
    name: '50 000 FCFA',
    desc: 'Atteindre 50 000 FCFA de capital.',
    icon: '💎',
    color: '#F0D58A',
    isUnlocked: s => s.maxCapitalEver >= 50_000,
  },
]

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = ['Progression', 'Combos', 'Règles spéciales', 'Finance']

export function getUnlockedAchievements(stats: LifetimeStats): AchievementDef[] {
  return ACHIEVEMENTS.filter(a => a.isUnlocked(stats))
}
