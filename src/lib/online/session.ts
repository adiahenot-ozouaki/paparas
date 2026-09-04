// ==========================================================================
// session.ts — table online active (persistance courte pour navigation).
// ==========================================================================

const KEY = 'kora:onlineTableId'

export function setActiveOnlineTableId(tableId: string | null): void {
  try {
    if (tableId) sessionStorage.setItem(KEY, tableId)
    else sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

export function getActiveOnlineTableId(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}
