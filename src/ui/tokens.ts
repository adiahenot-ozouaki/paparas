// ==========================================================================
// Design tokens — source unique pour styles inline restants.
// Préférer les classes CSS (index.css) quand c’est possible.
// ==========================================================================

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

/** Surfaces récurrentes (inline style) */
export const surface = {
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
  },
  cardStrong: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  gold: {
    background: 'linear-gradient(135deg, rgba(214,168,79,0.12), rgba(16,21,26,0.8))',
    border: '1px solid rgba(214,168,79,0.35)',
  },
  green: {
    background: 'linear-gradient(135deg, rgba(18,60,50,0.6), rgba(16,21,26,0.8))',
    border: '1px solid rgba(214,168,79,0.25)',
  },
  danger: {
    background: 'rgba(201,75,75,0.12)',
    border: '1px solid rgba(201,75,75,0.35)',
  },
  success: {
    background: 'rgba(76,175,118,0.12)',
    border: '1px solid rgba(76,175,118,0.35)',
  },
  dashed: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px dashed rgba(255,255,255,0.1)',
  },
} as const
