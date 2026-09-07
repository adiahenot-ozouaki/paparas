import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Banknote,
  BarChart3,
  Bird,
  BookOpen,
  Bot,
  Cat,
  Check,
  CircleDashed,
  Coins,
  Compass,
  Crown,
  Dog,
  Eye,
  EyeOff,
  Fish,
  Flag,
  Flame,
  Gamepad2,
  Gem,
  Globe,
  Hand,
  Hash,
  Home,
  Landmark,
  Lock,
  Medal,
  Monitor,
  Moon,
  MoreHorizontal,
  Pause,
  Play,
  Rabbit,
  Settings,
  Sparkles,
  Star,
  Squirrel,
  Sun,
  Target,
  TreePalm,
  TrendingUp,
  Trophy,
  Turtle,
  Undo2,
  User,
  Zap,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'

export const ICON_STROKE = 2

export function SpadeIcon({ size = 20, color = 'currentColor', ...rest }: LucideProps) {
  const s = typeof size === 'number' ? size : 20
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={s} height={s} viewBox="0 0 24 24" fill={color} aria-hidden="true" {...rest}>
      <path d="M12 2C9.5 7 4 11.5 4 15a4 4 0 0 0 6.5 3.1V20h3v-1.9A4 4 0 0 0 20 15c0-3.5-5.5-8-8-13z" />
    </svg>
  )
}

export function HeartIcon({ size = 20, color = 'currentColor', ...rest }: LucideProps) {
  const s = typeof size === 'number' ? size : 20
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={s} height={s} viewBox="0 0 24 24" fill={color} aria-hidden="true" {...rest}>
      <path d="M12 21s-7.2-4.6-9.5-8.2C.6 9.6 2.2 6 5.5 6c1.7 0 3.1.9 3.9 2.2C10.2 6.9 11.6 6 13.3 6c3.3 0 4.9 3.6 3 6.8C19.2 16.4 12 21 12 21z" />
    </svg>
  )
}

export function DiamondIcon({ size = 20, color = 'currentColor', ...rest }: LucideProps) {
  const s = typeof size === 'number' ? size : 20
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={s} height={s} viewBox="0 0 24 24" fill={color} aria-hidden="true" {...rest}>
      <path d="M12 2L21 12l-9 10L3 12z" />
    </svg>
  )
}

export function ClubIcon({ size = 20, color = 'currentColor', ...rest }: LucideProps) {
  const s = typeof size === 'number' ? size : 20
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={s} height={s} viewBox="0 0 24 24" fill={color} aria-hidden="true" {...rest}>
      <path d="M12 4a3.5 3.5 0 0 1 1.6 6.6A3.5 3.5 0 1 1 9.5 14H11v3H8v2h8v-2h-3v-3h1.5a3.5 3.5 0 1 1-1.1-3.4A3.5 3.5 0 0 1 12 4z" />
    </svg>
  )
}

export function KoraIcon({
  icon: Icon,
  size = 20,
  className = '',
  strokeWidth = ICON_STROKE,
  ...rest
}: {
  icon: LucideIcon
  size?: number
  className?: string
  strokeWidth?: number
} & Omit<LucideProps, 'ref'>) {
  return <Icon size={size} strokeWidth={strokeWidth} className={`kora-icon ${className}`.trim()} aria-hidden {...rest} />
}

export const AVATAR_OPTIONS: { id: string; icon: LucideIcon; label: string; legacy?: string[] }[] = [
  { id: 'bird', icon: Bird, label: 'Aigle', legacy: ['🦅'] },
  { id: 'cat', icon: Cat, label: 'Félin', legacy: ['🐆', '🦁'] },
  { id: 'dog', icon: Dog, label: 'Chien', legacy: [] },
  { id: 'turtle', icon: Turtle, label: 'Tortue', legacy: ['🐊', '🐢'] },
  { id: 'rabbit', icon: Rabbit, label: 'Lièvre', legacy: ['🐒'] },
  { id: 'fish', icon: Fish, label: 'Poisson', legacy: [] },
  { id: 'squirrel', icon: Squirrel, label: 'Écureuil', legacy: [] },
  { id: 'palm', icon: TreePalm, label: 'Palmier', legacy: ['🌴'] },
  { id: 'sun', icon: Sun, label: 'Soleil', legacy: ['☀️', '☀'] },
  { id: 'star', icon: Star, label: 'Étoile', legacy: ['⭐'] },
  { id: 'target', icon: Target, label: 'Cible', legacy: ['🎯'] },
  { id: 'sparkles', icon: Sparkles, label: 'Éclat', legacy: ['✨'] },
]

const legacyAvatarIndex: Record<string, string> = {}
for (const opt of AVATAR_OPTIONS) {
  for (const e of opt.legacy ?? []) legacyAvatarIndex[e] = opt.id
}

export function resolveAvatarId(stored: string | null | undefined): string {
  if (!stored) return 'bird'
  if (AVATAR_OPTIONS.some(o => o.id === stored)) return stored
  return legacyAvatarIndex[stored] ?? 'bird'
}

export function AvatarIcon({
  avatar,
  size = 22,
  className = '',
}: {
  avatar: string | null | undefined
  size?: number
  className?: string
}) {
  const id = resolveAvatarId(avatar)
  const opt = AVATAR_OPTIONS.find(o => o.id === id) ?? AVATAR_OPTIONS[0]
  const Icon = opt.icon
  return <Icon size={size} strokeWidth={ICON_STROKE} className={`kora-icon kora-avatar-icon ${className}`.trim()} aria-hidden />
}

export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  gamepad: Gamepad2,
  trophy: Trophy,
  medal: Medal,
  crown: Crown,
  target: Target,
  sparkles: Sparkles,
  grid: Hash,
  diamond: Gem,
  spade: Zap,
  zap: Zap,
  heart: Flame,
  hash: Hash,
  seven: Hash,
  coins: Coins,
  banknote: Banknote,
  gem: Gem,
  lock: Lock,
}

export function AchievementGlyph({
  name,
  size = 22,
  className = '',
}: {
  name: string
  size?: number
  className?: string
}) {
  const Icon = ACHIEVEMENT_ICONS[name] ?? Sparkles
  return <Icon size={size} strokeWidth={ICON_STROKE} className={`kora-icon ${className}`.trim()} aria-hidden />
}

export {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Banknote,
  BarChart3,
  Bird,
  BookOpen,
  Bot,
  Cat,
  Check,
  CircleDashed,
  Coins,
  Compass,
  Crown,
  Dog,
  Eye,
  EyeOff,
  Fish,
  Flag,
  Flame,
  Gamepad2,
  Gem,
  Globe,
  Hand,
  Hash,
  Home,
  Landmark,
  Lock,
  Medal,
  Monitor,
  Moon,
  MoreHorizontal,
  Pause,
  Play,
  Rabbit,
  Settings,
  Sparkles,
  Star,
  Squirrel,
  Sun,
  Target,
  TreePalm,
  TrendingUp,
  Trophy,
  Turtle,
  Undo2,
  User,
  Zap,
  type LucideIcon,
}
