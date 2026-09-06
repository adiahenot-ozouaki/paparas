import type { CSSProperties, ReactNode } from 'react'

// ==========================================================================
// ScreenShell — coque standard des écrans hors table de jeu.
// ==========================================================================

type ScreenShellProps = {
  children: ReactNode
  /** padding-bottom mobile pour BottomNav (défaut 80). Ignoré ≥900px avec sidebar. */
  bottomPad?: number
  className?: string
  style?: CSSProperties
  /** Affiche le motif africain en fond */
  pattern?: boolean
  /** Contenu centré (max-width page-content) */
  centered?: boolean
}

export default function ScreenShell({
  children,
  bottomPad = 80,
  className = '',
  style,
  pattern = true,
  centered = false,
}: ScreenShellProps) {
  return (
    <div
      className={`screen-shell ${className}`.trim()}
      style={{
        ['--shell-bottom-pad' as string]: `${bottomPad}px`,
        ...style,
      }}
    >
      {pattern && <div className="pattern-african screen-shell-pattern" aria-hidden />}
      <div className={centered ? 'page-content screen-shell-inner' : 'screen-shell-inner'}>{children}</div>
    </div>
  )
}
