// ==========================================================================
// avatar.ts — image par défaut + upload Supabase Storage (bucket avatars).
// ==========================================================================

import { supabase } from './supabase/client'

/** Asset local servi par Vite (public/avatars/default.svg). */
export const DEFAULT_AVATAR_SRC = '/avatars/default.svg'

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

/** true si la valeur stockée est une URL / chemin d’image. */
export function isAvatarImageUrl(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.trim()
  return (
    v.startsWith('http://') ||
    v.startsWith('https://') ||
    v.startsWith('/') ||
    v.startsWith('data:image/')
  )
}

/**
 * Source <img> à afficher.
 * - vide / null → image par défaut
 * - URL → telle quelle
 * - preset id (bird, cat…) → null (le caller utilise Lucide)
 */
export function resolveAvatarImageSrc(stored: string | null | undefined): string | null {
  if (!stored || !stored.trim()) return DEFAULT_AVATAR_SRC
  const v = stored.trim()
  if (isAvatarImageUrl(v)) return v
  return null
}

/** Valide une valeur avatar avant écriture DB (preset court ou URL). */
export function validateAvatarValue(raw: string): string | null {
  const avatar = raw.trim()
  if (!avatar) return null // autorise reset → défaut
  if (isAvatarImageUrl(avatar)) {
    if (avatar.length > 500) return 'URL avatar trop longue.'
    return null
  }
  // preset legacy / Lucide (ex. bird)
  if (avatar.length > 32) return 'Avatar invalide.'
  return null
}

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

/**
 * Upload vers storage.avatars/{userId}/avatar.{ext} (upsert).
 * Retourne l’URL publique (cache-bust query).
 */
export async function uploadProfileAvatar(
  userId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { url: null, error: 'Formats acceptés : JPG, PNG, WebP, GIF.' }
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { url: null, error: 'Image trop lourde (max 2 Mo).' }
  }

  const ext = extFromMime(file.type)
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600',
  })

  if (error) {
    console.error('[avatar] upload:', error.message)
    return {
      url: null,
      error:
        /row-level security|policy|not found|bucket/i.test(error.message)
          ? 'Upload impossible (bucket ou droits). Vérifiez la migration avatars.'
          : error.message,
    }
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${data.publicUrl}?t=${Date.now()}`
  return { url, error: null }
}
