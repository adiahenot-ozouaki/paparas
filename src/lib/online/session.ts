// ==========================================================================
// session.ts — table online active + intention d’entrée lobby.
// ==========================================================================

const KEY_TABLE = 'kora:onlineTableId'
const KEY_INTENT = 'kora:onlineLobbyIntent'
const KEY_JOIN_CODE = 'kora:onlineJoinCode'
const KEY_JOIN_TABLE = 'kora:onlineJoinTableId'
const KEY_HOME_NOTICE = 'kora:homeNotice'

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

/** Join direct depuis « Tables ouvertes » (UUID) — pas besoin de code. */
export function setPendingJoinTableId(tableId: string | null): void {
  try {
    if (tableId) sessionStorage.setItem(KEY_JOIN_TABLE, tableId)
    else sessionStorage.removeItem(KEY_JOIN_TABLE)
  } catch {
    // ignore
  }
}

export function consumePendingJoinTableId(): string | null {
  try {
    const v = sessionStorage.getItem(KEY_JOIN_TABLE)
    sessionStorage.removeItem(KEY_JOIN_TABLE)
    return v
  } catch {
    return null
  }
}

const KEY_SPECTATE = 'kora:onlineSpectate'

/** Mode observation (pas de siege). */
export function setOnlineSpectate(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(KEY_SPECTATE, '1')
    else sessionStorage.removeItem(KEY_SPECTATE)
  } catch {
    // ignore
  }
}

export function getOnlineSpectate(): boolean {
  try {
    return sessionStorage.getItem(KEY_SPECTATE) === '1'
  } catch {
    return false
  }
}

/** Message one-shot affiché sur Home après Accueil (table conservée). */
export function setHomeNotice(message: string): void {
  try {
    sessionStorage.setItem(KEY_HOME_NOTICE, message)
  } catch {
    // ignore
  }
}

export function consumeHomeNotice(): string | null {
  try {
    const v = sessionStorage.getItem(KEY_HOME_NOTICE)
    sessionStorage.removeItem(KEY_HOME_NOTICE)
    return v
  } catch {
    return null
  }
}
