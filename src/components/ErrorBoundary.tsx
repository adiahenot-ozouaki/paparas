import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

// ==========================================================================
// ErrorBoundary — filet de sécurité générique.
// ==========================================================================

type Props = { children: ReactNode; fallbackTitle?: string }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    this.setState({ error: null })
    window.location.hash = ''
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--kora-void, #0B0D10)',
          color: 'var(--kora-text, #fff)',
          textAlign: 'center',
          gap: 12,
        }}
      >
        <div className="error-boundary-icon">
          <AlertTriangle size={40} strokeWidth={1.75} className="kora-icon" aria-hidden />
        </div>
        <h1 style={{ fontSize: 20, margin: 0 }}>{this.props.fallbackTitle ?? 'Oups, un problème est survenu'}</h1>
        <p style={{ color: 'var(--kora-muted, #A9B0B7)', fontSize: 14, maxWidth: 360, margin: 0 }}>
          La partie en cours et votre capital sont conservés. Rechargez pour continuer.
        </p>
        <pre
          style={{
            fontSize: 11,
            color: 'var(--kora-muted, #A9B0B7)',
            background: 'rgba(255,255,255,0.04)',
            padding: 12,
            borderRadius: 12,
            maxWidth: 360,
            overflow: 'auto',
            textAlign: 'left',
          }}
        >
          {this.state.error.message}
        </pre>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" className="btn-primary" onClick={this.handleReload}>
            Recharger
          </button>
          <button type="button" className="btn-secondary" onClick={this.handleGoHome}>
            Accueil
          </button>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
