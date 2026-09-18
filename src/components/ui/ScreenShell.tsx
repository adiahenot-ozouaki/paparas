import type { CSSProperties, ReactNode } from 'react'

// ==========================================================================
// ScreenShell — coque standard des écrans hors table de jeu.
// ==========================================================================

type ScreenShellProps = {
  children: ReactNode
  /**
   * padding-bottom mobile pour BottomNav (px, hors safe-area).
   * Si omis : CSS `calc(88px + safe-area-inset-bottom)`.
   * Si > 0 : `calc(bottomPad + safe-area-inset-bottom)`.
   * Si 0 : aucun padding bas (plein écran).
   * ≥900px : media query ramène à 28px (sidebar).
   */
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
  bottomPad,
  className = '',
  style,
  pattern = true,
  centered = false,
}: ScreenShellProps) {
  let shellStyle: CSSProperties = { ...style }
  if (bottomPad != null) {
    const pad =
      bottomPad <= 0
        ? '0px'
        : `calc(${bottomPad}px + env(safe-area-inset-bottom, 0px))`
    shellStyle = {
      ...shellStyle,
      ['--shell-bottom-pad' as string]: pad,
    }
  }

  return (
    <div className={`screen-shell ${className}`.trim()} style={shellStyle}>
      {pattern && <div className="pattern-african screen-shell-pattern" aria-hidden />}
      <div className={centered ? 'page-content screen-shell-inner' : 'screen-shell-inner'}>{children}</div>
    </div>
  )
}
