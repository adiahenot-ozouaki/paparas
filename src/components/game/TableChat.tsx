import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import {
  fetchTableMessages,
  sendTableMessage,
  subscribeTableMessages,
  type TableChatMessage,
} from '../../lib/chat/tableChat'
import { supabase } from '../../lib/supabase/client'

type Props = {
  tableId: string
  myUserId: string | null
  defaultOpen?: boolean
}

export function TableChat({ tableId, myUserId, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [messages, setMessages] = useState<TableChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const openRef = useRef(open)
  openRef.current = open

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { messages: list } = await fetchTableMessages(tableId)
      if (!cancelled) {
        setMessages(list)
        scrollBottom()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tableId, scrollBottom])

  useEffect(() => {
    const unsub = subscribeTableMessages(tableId, async row => {
      setMessages(prev => {
        if (prev.some(m => m.id === row.id)) return prev
        const next: TableChatMessage = {
          id: row.id,
          tableId: row.table_id,
          userId: row.user_id,
          body: row.body,
          createdAt: row.created_at,
          username: 'Joueur',
        }
        return [...prev, next]
      })
      void (async () => {
        const { data } = await supabase
          .from('kora_profiles')
          .select('username, avatar')
          .eq('id', row.user_id)
          .maybeSingle()
        if (data) {
          setMessages(prev =>
            prev.map(m =>
              m.id === row.id
                ? {
                    ...m,
                    username: (data.username as string) ?? 'Joueur',
                    avatar: (data.avatar as string) ?? '',
                  }
                : m,
            ),
          )
        }
      })()
      if (!openRef.current && row.user_id !== myUserId) {
        setUnread(u => u + 1)
      }
      scrollBottom()
    })
    return unsub
  }, [tableId, myUserId, scrollBottom])

  useEffect(() => {
    if (open) {
      setUnread(0)
      scrollBottom()
    }
  }, [open, scrollBottom])

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    setError(null)
    const text = draft
    setDraft('')
    const { message, error: err } = await sendTableMessage(tableId, text)
    if (err) {
      setError(err)
      setDraft(text)
    } else if (message) {
      setMessages(prev => (prev.some(m => m.id === message.id) ? prev : [...prev, message]))
      scrollBottom()
    }
    setSending(false)
  }

  return (
    <div className={'table-chat' + (open ? ' is-open' : '')}>
      {!open && (
        <button
          type="button"
          className="table-chat-fab"
          aria-label="Ouvrir le chat"
          onClick={() => setOpen(true)}
        >
          <MessageCircle size={20} aria-hidden />
          {unread > 0 && <span className="table-chat-badge">{unread > 9 ? '9+' : unread}</span>}
        </button>
      )}

      {open && (
        <div className="table-chat-panel" role="dialog" aria-label="Discussion table">
          <header className="table-chat-header">
            <span className="table-chat-title">Discussion</span>
            <button
              type="button"
              className="table-chat-close"
              aria-label="Fermer le chat"
              onClick={() => setOpen(false)}
            >
              <X size={18} aria-hidden />
            </button>
          </header>

          <div className="table-chat-list" ref={listRef}>
            {messages.length === 0 ? (
              <p className="table-chat-empty">Aucun message. Dis bonjour !</p>
            ) : (
              messages.map(m => {
                const mine = myUserId != null && m.userId === myUserId
                return (
                  <div key={m.id} className={'table-chat-msg' + (mine ? ' is-mine' : '')}>
                    {!mine && (
                      <span className="table-chat-author">{m.username ?? 'Joueur'}</span>
                    )}
                    <p className="table-chat-body">{m.body}</p>
                  </div>
                )
              })
            )}
          </div>

          {error && <p className="table-chat-error">{error}</p>}

          <form className="table-chat-form" onSubmit={e => void handleSend(e)}>
            <input
              className="table-chat-input"
              type="text"
              maxLength={280}
              placeholder="Ecrire un message…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              disabled={sending}
              autoComplete="off"
            />
            <button
              type="submit"
              className="table-chat-send"
              disabled={sending || !draft.trim()}
              aria-label="Envoyer"
            >
              <Send size={16} aria-hidden />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
