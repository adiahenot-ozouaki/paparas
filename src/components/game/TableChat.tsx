import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Send, X, VolumeX, Volume2 } from 'lucide-react'
import {
  fetchTableMessages,
  sendTableMessage,
  subscribeTableMessages,
  getMutedUserIds,
  setMutedUserIds,
  toggleMuteUser,
  QUICK_REACTIONS,
  type TableChatMessage,
} from '../../lib/chat/tableChat'
import { supabase } from '../../lib/supabase/client'

type Props = {
  tableId: string
  myUserId: string | null
  defaultOpen?: boolean
  title?: string
}

export function TableChat({
  tableId,
  myUserId,
  defaultOpen = false,
  title = 'Discussion',
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [messages, setMessages] = useState<TableChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
  const [mutedIds, setMutedIds] = useState<string[]>(() => getMutedUserIds(tableId))
  const listRef = useRef<HTMLDivElement>(null)
  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    setMutedIds(getMutedUserIds(tableId))
  }, [tableId])

  const visibleMessages = useMemo(
    () => messages.filter(m => !mutedIds.includes(m.userId)),
    [messages, mutedIds],
  )

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
      const muted = getMutedUserIds(tableId)
      if (
        !openRef.current &&
        row.user_id !== myUserId &&
        !muted.includes(row.user_id)
      ) {
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

  async function handleSend(text?: string) {
    const body = (text ?? draft).trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    if (!text) setDraft('')
    const { message, error: err } = await sendTableMessage(tableId, body)
    if (err) {
      setError(err)
      if (!text) setDraft(body)
    } else if (message) {
      setMessages(prev => (prev.some(m => m.id === message.id) ? prev : [...prev, message]))
      scrollBottom()
    }
    setSending(false)
  }

  function handleMute(userId: string) {
    const next = toggleMuteUser(tableId, userId)
    setMutedIds(next)
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
          {unread > 0 && (
            <span className="table-chat-badge">{unread > 9 ? '9+' : unread}</span>
          )}
        </button>
      )}

      {open && (
        <div className="table-chat-panel" role="dialog" aria-label="Discussion table">
          <header className="table-chat-header">
            <span className="table-chat-title">{title}</span>
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
            {visibleMessages.length === 0 ? (
              <p className="table-chat-empty">
                {messages.length > 0 && mutedIds.length > 0
                  ? 'Messages masques (mutes).'
                  : 'Aucun message. Dis bonjour !'}
              </p>
            ) : (
              visibleMessages.map(m => {
                const mine = myUserId != null && m.userId === myUserId
                return (
                  <div key={m.id} className={'table-chat-msg' + (mine ? ' is-mine' : '')}>
                    {!mine && (
                      <div className="table-chat-msg-meta">
                        <span className="table-chat-author">{m.username ?? 'Joueur'}</span>
                        <button
                          type="button"
                          className="table-chat-mute"
                          title="Mute cet utilisateur"
                          aria-label={'Mute ' + (m.username ?? 'joueur')}
                          onClick={() => handleMute(m.userId)}
                        >
                          <VolumeX size={12} aria-hidden />
                        </button>
                      </div>
                    )}
                    <p className="table-chat-body">{m.body}</p>
                  </div>
                )
              })
            )}
          </div>

          {mutedIds.length > 0 && (
            <div className="table-chat-mutes">
              <span className="table-chat-mutes-label">
                <VolumeX size={12} aria-hidden /> {mutedIds.length} mute(s)
              </span>
              <button
                type="button"
                className="table-chat-unmute-all"
                onClick={() => {
                  setMutedUserIds(tableId, [])
                  setMutedIds([])
                }}
              >
                <Volume2 size={12} aria-hidden /> Tout reactiver
              </button>
            </div>
          )}

          {error && <p className="table-chat-error">{error}</p>}

          <div className="table-chat-reactions" role="group" aria-label="Reactions rapides">
            {QUICK_REACTIONS.map(r => (
              <button
                key={r}
                type="button"
                className="table-chat-reaction"
                disabled={sending}
                onClick={() => void handleSend(r)}
              >
                {r}
              </button>
            ))}
          </div>

          <form
            className="table-chat-form"
            onSubmit={e => {
              e.preventDefault()
              void handleSend()
            }}
          >
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
