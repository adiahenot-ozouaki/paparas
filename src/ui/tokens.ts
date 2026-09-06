// ==========================================================================
// Design tokens — préférer var(--kora-*) pour suivre le thème dynamique.
// Les hex restent en fallback pour le code legacy encore en inline.
// ==========================================================================

/** Références CSS (thème-aware). */
export const cssVar = {
  void: 'var(--kora-void)',
  surface: 'var(--kora-surface)',
  felt: 'var(--kora-felt)',
  greenDeep: 'var(--kora-green-deep)',
  green: 'var(--kora-green)',
  gold: 'var(--kora-gold)',
  goldLight: 'var(--kora-gold-light)',
  goldDark: 'var(--kora-gold-dark)',
  ivory: 'var(--kora-ivory)',
  muted: 'var(--kora-muted)',
  muted2: 'var(--kora-muted-2)',
  danger: 'var(--kora-danger)',
  dangerSoft: 'var(--kora-danger-soft)',
  success: 'var(--kora-success)',
  successSoft: 'var(--kora-success-soft)',
  text: 'var(--kora-text)',
  textInverse: 'var(--kora-text-inverse)',
  cardBg: 'var(--kora-card-bg)',
  cardBorder: 'var(--kora-card-border)',
  navBg: 'var(--kora-nav-bg)',
} as const

/** Fallbacks hex (thème sombre — défaut produit). */
export const color = {
  void: '#0B0D10',
  surface: '#10151A',
  felt: '#0D2318',
  greenDeep: '#123C32',
  green: '#176B50',
  gold: '#D6A84F',
  goldLight: '#F0D58A',
  goldDark: '#C08030',
  ivory: '#F5F1E8',
  muted: '#A9B0B7',
  muted2: '#5b636b',
  danger: '#C94B4B',
  dangerSoft: '#E8A0A0',
  success: '#4CAF76',
  successSoft: '#8FD4A8',
  white: '#ffffff',
} as const

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pageX: 20,
  pageBottomNav: 80,
} as const

export const radius = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 18,
  card: 20,
  pill: 99,
} as const

export const font = {
  display: "'Plus Jakarta Sans', sans-serif",
  body: "'Inter', sans-serif",
} as const

/** Surfaces — utilisent les variables CSS quand possible. */
export const surface = {
  card: {
    background: 'var(--kora-card-bg)',
    border: '1px solid var(--kora-card-border)',
  },
  cardStrong: {
    background: 'var(--kora-card-bg)',
    border: '1px solid var(--kora-card-border-strong)',
  },
  gold: {
    background: 'var(--kora-surface-gold)',
    border: '1px solid var(--kora-border-gold)',
  },
  green: {
    background: 'var(--kora-surface-green)',
    border: '1px solid var(--kora-border-gold-soft)',
  },
  danger: {
    background: 'var(--kora-surface-danger)',
    border: '1px solid var(--kora-border-danger)',
  },
  success: {
    background: 'var(--kora-surface-success)',
    border: '1px solid var(--kora-border-success)',
  },
  dashed: {
    background: 'var(--kora-card-bg)',
    border: '1px dashed var(--kora-card-border-strong)',
  },
} as const
