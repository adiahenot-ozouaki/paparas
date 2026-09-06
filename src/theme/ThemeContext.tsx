import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ThemeMode = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

const STORAGE_KEY = 'kora:theme:v1'

function readStoredMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'dark' || v === 'light' || v === 'system') return v
  } catch {
    // ignore
  }
  return 'dark'
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode
}

function applyDomTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)
  root.style.colorScheme = resolved
  const meta = document.getElementById('meta-theme-color')
  if (meta) {
    meta.setAttribute('content', resolved === 'light' ? '#F3EFE6' : '#0B0D10')
  }
}

interface ThemeContextValue {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  cycleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode())
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readStoredMode()))

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
    const r = resolveTheme(next)
    setResolved(r)
    applyDomTheme(r)
  }, [])

  const cycleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark')
  }, [mode, setMode])

  useEffect(() => {
    const r = resolveTheme(mode)
    setResolved(r)
    applyDomTheme(r)

    if (mode !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      const next = getSystemTheme()
      setResolved(next)
      applyDomTheme(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  const value = useMemo(
    () => ({
      mode,
      resolved,
      setMode,
      cycleMode,
    }),
    [mode, resolved, setMode, cycleMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>.')
  return ctx
}

export const THEME_MODE_LABEL: Record<ThemeMode, string> = {
  dark: 'Sombre',
  light: 'Clair',
  system: 'Système',
}
