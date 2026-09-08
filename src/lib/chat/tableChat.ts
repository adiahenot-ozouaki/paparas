import { supabase } from '../supabase/client'

export type TableChatMessage = {
  id: string
  tableId: string
  userId: string
  body: string
  createdAt: string
  username?: string
  avatar?: string
}

const MAX_LEN = 280

export async function fetchTableMessages(
  tableId: string,
  limit = 50,
): Promise<{ messages: TableChatMessage[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('kora_table_messages')
      .select('id, table_id, user_id, body, created_at')
      .eq('table_id', tableId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) return { messages: [], error: error.message }
    const rows = data ?? []
    if (rows.length === 0) return { messages: [], error: null }

    const userIds = [...new Set(rows.map(r => r.user_id as string))]
    const { data: profiles } = await supabase
      .from('kora_profiles')
      .select('id, username, avatar')
      .in('id', userIds)

    const byId = new Map((profiles ?? []).map(p => [p.id as string, p]))

    const messages: TableChatMessage[] = rows.map(r => {
      const p = byId.get(r.user_id as string)
      return {
        id: r.id as string,
        tableId: r.table_id as string,
        userId: r.user_id as string,
        body: r.body as string,
        createdAt: r.created_at as string,
        username: (p?.username as string) ?? 'Joueur',
        avatar: (p?.avatar as string) ?? '',
      }
    })
    return { messages, error: null }
  } catch (e) {
    return { messages: [], error: e instanceof Error ? e.message : 'Erreur reseau' }
  }
}

export async function sendTableMessage(
  tableId: string,
  body: string,
): Promise<{ message: TableChatMessage | null; error: string | null }> {
  const text = body.trim()
  if (!text) return { message: null, error: 'Message vide' }
  if (text.length > MAX_LEN) return { message: null, error: 'Max 280 caracteres' }

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const uid = sessionData.session?.user?.id
    if (!uid) return { message: null, error: 'Authentification requise' }

    const { data, error } = await supabase
      .from('kora_table_messages')
      .insert({ table_id: tableId, user_id: uid, body: text })
      .select('id, table_id, user_id, body, created_at')
      .single()

    if (error || !data) {
      return { message: null, error: error?.message ?? 'Envoi impossible' }
    }

    return {
      message: {
        id: data.id as string,
        tableId: data.table_id as string,
        userId: data.user_id as string,
        body: data.body as string,
        createdAt: data.created_at as string,
      },
      error: null,
    }
  } catch (e) {
    return { message: null, error: e instanceof Error ? e.message : 'Erreur reseau' }
  }
}

export function subscribeTableMessages(
  tableId: string,
  onInsert: (row: {
    id: string
    table_id: string
    user_id: string
    body: string
    created_at: string
  }) => void,
): () => void {
  const channel = supabase
    .channel('chat:' + tableId)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'kora_table_messages',
        filter: 'table_id=eq.' + tableId,
      },
      payload => {
        const row = payload.new as {
          id: string
          table_id: string
          user_id: string
          body: string
          created_at: string
        }
        if (row?.id) onInsert(row)
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
