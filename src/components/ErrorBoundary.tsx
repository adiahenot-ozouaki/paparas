import { Component, type ErrorInfo, type ReactNode } from 'react'

// ==========================================================================
// ErrorBoundary — filet de sécurité générique.
//
// Si un composant lève une exception pendant le rendu (ex : un edge-case
// non prévu dans round.ts provoque un throw dans un useEffect qui met à
// jour roundState), React démonte tout l'arbre par défaut -> écran blanc
// silencieux, sans aucune explication ni porte de sortie pour le joueur.
//
// Cette limite affiche à la place un message de récupération. Le capital
// et la partie en cours restent intacts (persistés dans localStorage via
// GameContext), donc un rechargement ne fait perdre aucune progression.
// ==========================================================================

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Pas de service de reporting externe branché pour l'instant — au
    // minimum on trace dans la console pour faciliter le debug.
    console.error('[ErrorBoundary] Erreur interceptée :', error, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#0B0D10',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          textAlign: 'center',
          gap: 16,
          zIndex: 9999,
        }}
      >
        <div style={{ fontSize: 40 }}>⚠️</div>
        <h1 className="font-display" style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0 }}>
          Un problème est survenu
        </h1>
        <p style={{ color: '#A9B0B7', fontSize: 13, margin: 0, maxWidth: 280 }}>
          La partie a rencontré une erreur inattendue. Votre capital et votre progression sont sauvegardés — vous
          pouvez recharger l'application sans rien perdre.
        </p>
        <button
          className="btn-primary glow-gold"
          onClick={this.handleReload}
          style={{ padding: '14px 32px', fontSize: 14, borderRadius: 14, letterSpacing: '0.06em', marginTop: 8 }}
        >
          RECHARGER
        </button>
      </div>
    )
  }
}
