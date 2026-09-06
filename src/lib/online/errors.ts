/** Messages réseau / PostgREST plus lisibles pour le joueur. */
export function humanizeError(
  raw: string | null | undefined,
  fallback = 'Une erreur est survenue.',
): string {
  if (!raw) return fallback
  const s = String(raw).trim()
  const lower = s.toLowerCase()
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed')
  ) {
    return 'Réseau indisponible. Vérifiez votre connexion puis réessayez.'
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'Le serveur met trop de temps à répondre. Réessayez dans un instant.'
  }
  if (lower.includes('jwt') || lower.includes('not authenticated') || lower.includes('401')) {
    return 'Session expirée. Reconnectez-vous pour continuer.'
  }
  if (lower.includes('duplicate key') || lower.includes('unique constraint')) {
    return 'Vous êtes déjà assis à cette table.'
  }
  if (
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('42501')
  ) {
    return 'Action non autorisée. Reconnectez-vous ou changez de table.'
  }
  if (s.length > 180) return s.slice(0, 160) + '…'
  return s
}
