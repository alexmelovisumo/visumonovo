import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Send, ArrowUpRight } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Message, Profile, Project } from '@/types'

type MsgWithSender = Message & { sender: Pick<Profile, 'id' | 'full_name' | 'email' | 'profile_image_url'> }

type ConvDetail = {
  id: string
  project: Pick<Project, 'id' | 'title'>
  other: Pick<Profile, 'id' | 'full_name' | 'email' | 'profile_image_url'>
}

// ─── Message Bubble ───────────────────────────────────────────

function MessageBubble({ msg, isOwn }: { msg: MsgWithSender; isOwn: boolean }) {
  const time = format(new Date(msg.created_at), 'HH:mm')

  return (
    <div className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {!isOwn && (
        <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0 mt-auto">
          {(msg.sender.full_name ?? msg.sender.email).charAt(0).toUpperCase()}
        </div>
      )}
      <div className={cn(
        'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
        isOwn
          ? 'bg-primary-600 text-white rounded-br-sm'
          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
      )}>
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        <p className={cn('text-[10px] mt-1 text-right', isOwn ? 'text-primary-200' : 'text-slate-400')}>
          {time}
        </p>
      </div>
    </div>
  )
}

// ─── Date Separator ───────────────────────────────────────────

function DateSeparator({ date }: { date: Date }) {
  const label = isToday(date) ? 'Hoje' : isYesterday(date) ? 'Ontem' : format(date, "dd 'de' MMMM", { locale: ptBR })
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-xs text-slate-400 font-medium px-2">{label}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch conversation details
  const { data: conv } = useQuery({
    queryKey: ['conversation-detail', id],
    queryFn: async (): Promise<ConvDetail> => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          project:projects(id, title),
          participant_one:profiles!conversations_participant_one_id_fkey(id, full_name, email, profile_image_url),
          participant_two:profiles!conversations_participant_two_id_fkey(id, full_name, email, profile_image_url)
        `)
        .eq('id', id!)
        .single()
      if (error) throw error

      const p1 = data.participant_one as unknown as Pick<Profile, 'id' | 'full_name' | 'email' | 'profile_image_url'>
      const p2 = data.participant_two as unknown as Pick<Profile, 'id' | 'full_name' | 'email' | 'profile_image_url'>

      return {
        id: data.id,
        project: data.project as unknown as Pick<Project, 'id' | 'title'>,
        other: p1.id === user!.id ? p2 : p1,
      }
    },
    enabled: !!id && !!user,
  })

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, email, profile_image_url)')
        .eq('conversation_id', id!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as MsgWithSender[]
    },
    enabled: !!id,
  })

  // Mark messages as read
  useEffect(() => {
    if (!id || !user || messages.length === 0) return
    const unread = messages.filter((m) => !m.is_read && m.sender_id !== user.id)
    if (unread.length === 0) return
    supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', unread.map((m) => m.id))
      .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
  }, [messages, id, user, queryClient])

  // Realtime subscription
  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`conv:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', id] })
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, queryClient])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send message
  const send = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('messages').insert({
        conversation_id: id!,
        sender_id:       user!.id,
        content:         content.trim(),
        is_read:         false,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: ['messages', id] })
    },
  })

  const handleSend = () => {
    const content = text.trim()
    if (!content || send.isPending) return
    send.mutate(content)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Group messages by date
  const grouped: { date: Date; messages: MsgWithSender[] }[] = []
  for (const msg of messages) {
    const d = new Date(msg.created_at)
    const dateStr = format(d, 'yyyy-MM-dd')
    const last = grouped[grouped.length - 1]
    if (!last || format(last.date, 'yyyy-MM-dd') !== dateStr) {
      grouped.push({ date: d, messages: [msg] })
    } else {
      last.messages.push(msg)
    }
  }

  const otherName = conv?.other.full_name ?? conv?.other.email ?? '...'

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <Link
          to="/dashboard/mensagens"
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>

        {conv?.other.profile_image_url ? (
          <img
            src={conv.other.profile_image_url}
            alt={otherName}
            className="w-9 h-9 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold shrink-0">
            {otherName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{otherName}</p>
          {conv?.project && (
            <Link
              to={`/dashboard/projeto/${conv.project.id}`}
              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 truncate"
            >
              {conv.project.title}
              <ArrowUpRight size={10} />
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-slate-400">Nenhuma mensagem ainda.</p>
            <p className="text-xs text-slate-300 mt-1">Seja o primeiro a escrever!</p>
          </div>
        )}

        {grouped.map(({ date, messages: dayMsgs }) => (
          <div key={format(date, 'yyyy-MM-dd')}>
            <DateSeparator date={date} />
            <div className="space-y-2">
              {dayMsgs.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} isOwn={msg.sender_id === user?.id} />
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem... (Enter para enviar)"
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900',
              'placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
              'transition-colors max-h-32 overflow-y-auto'
            )}
            style={{ minHeight: '42px' }}
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim()}
            isLoading={send.isPending}
            className="shrink-0 w-10 h-10 p-0 rounded-xl"
          >
            {!send.isPending && <Send size={16} />}
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">Shift+Enter para nova linha</p>
      </div>
    </div>
  )
}
