// ==========================================================================
// session.ts — table online active + intention d’entrée lobby.
// ==========================================================================

const KEY_TABLE = 'kora:onlineTableId'
const KEY_INTENT = 'kora:onlineLobbyIntent'
const KEY_JOIN_CODE = 'kora:onlineJoinCode'

export type OnlineLobbyIntent = 'menu' | 'create' | 'join'

export function setActiveOnlineTableId(tableId: string | null): void {
  try {
    if (tableId) sessionStorage.setItem(KEY_TABLE, tableId)
    else sessionStorage.removeItem(KEY_TABLE)
  } catch {
    // ignore
  }
}

export function getActiveOnlineTableId(): string | null {
  try {
    return sessionStorage.getItem(KEY_TABLE)
  } catch {
    return null
  }
}

export function setOnlineLobbyIntent(intent: OnlineLobbyIntent): void {
  try {
    sessionStorage.setItem(KEY_INTENT, intent)
  } catch {
    // ignore
  }
}

export function getOnlineLobbyIntent(): OnlineLobbyIntent {
  try {
    const v = sessionStorage.getItem(KEY_INTENT)
    if (v === 'create' || v === 'join' || v === 'menu') return v
  } catch {
    // ignore
  }
  return 'menu'
}

export function setPendingJoinCode(code: string | null): void {
  try {
    if (code) sessionStorage.setItem(KEY_JOIN_CODE, code)
    else sessionStorage.removeItem(KEY_JOIN_CODE)
  } catch {
    // ignore
  }
}

export function consumePendingJoinCode(): string | null {
  try {
    const v = sessionStorage.getItem(KEY_JOIN_CODE)
    sessionStorage.removeItem(KEY_JOIN_CODE)
    return v
  } catch {
    return null
  }
}
