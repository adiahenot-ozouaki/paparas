// ==========================================================================
// shareScore — partage natif (Web Share API) ou copie presse-papiers.
// OG meta déjà en place dans index.html (paparas.app).
// ==========================================================================

export const APP_URL = 'https://paparas.app'

export type ScoreSharePayload = {
  won: boolean
  netGain: number
  finalCapital: number
  roundsWon: number
  bestComboLabel?: string
  reason?: string
  username?: string | null
}

export function buildShareText(p: ScoreSharePayload): string {
  const title = p.won ? 'Victoire sur Paparas (Garam / Kora) !' : 'Partie Paparas terminée'
  const gain =
    p.netGain === 0
      ? 'Équilibre 0 FCFA'
      : `${p.netGain > 0 ? '+' : ''}${p.netGain.toLocaleString('fr-FR')} FCFA`
  const lines = [
    title,
    p.username ? `@${p.username}` : null,
    `Résultat : ${gain}`,
    `Capital final : ${p.finalCapital.toLocaleString('fr-FR')} FCFA`,
    `Rounds gagnés : ${p.roundsWon}`,
    p.bestComboLabel ? `Meilleur combo : ${p.bestComboLabel}` : null,
    p.reason ? `Fin : ${p.reason}` : null,
    '',
    `Joue aussi → ${APP_URL}`,
  ]
  return lines.filter(Boolean).join('\n')
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

export async function shareScore(p: ScoreSharePayload): Promise<ShareResult> {
  const text = buildShareText(p)
  const title = p.won ? 'Victoire Paparas' : 'Score Paparas'

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url: APP_URL })
        return 'shared'
      } catch (e) {
        // AbortError = utilisateur a annulé
        if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
        // fallback copy
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return 'copied'
    }
  } catch {
    return 'failed'
  }
  return 'failed'
}
