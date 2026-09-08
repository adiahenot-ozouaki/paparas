import { useEffect } from 'react'
import type { Screen } from '../types'
import { getActiveOnlineTableId, setActiveOnlineTableId, setOnlineSpectate } from '../lib/online/session'

/**
 * Stub temporaire si le fichier complet n'est pas encore resynchronise.
 * Remplace par la version complete depuis le commit 22612d5 si besoin.
 * En pratique: le flux principal reste onlineLobby + callEngine.
 */
export default function OnlineGameTableScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  useEffect(() => {
    // Prefer returning to lobby; clear spectate flag
    setOnlineSpectate(false)
    const id = getActiveOnlineTableId()
    if (!id) {
      onNavigate('onlineLobby')
      return
    }
    // Keep table id so a future full screen can resume; for now go lobby
    onNavigate('onlineLobby')
  }, [onNavigate])

  return (
    <div className="felt-bg table-screen table-screen--loading">
      <span className="table-loading-text">Chargement de la table…</span>
    </div>
  )
}
