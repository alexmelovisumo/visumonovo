import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Send, ArrowUpRight, ImageIcon, X, AlertCircle } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
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
        'max-w-[75%] rounded-2xl text-sm leading-relaxed overflow-hidden',
        isOwn
          ? 'bg-primary-600 text-white rounded-br-sm'
          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
      )}>
        {/* Progress update badge */}
        {msg.is_progress_update && (
          <div className={cn(
            'flex items-center gap-1.5 px-3 pt-2 text-xs font-medium',
            isOwn ? 'text-primary-200' : 'text-primary-600'
          )}>
            <AlertCircle size={11} />
            Atualização de progresso
          </div>
        )}

        {/* Image */}
        {msg.image_url && (
          <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
            <img
              src={msg.image_url}
              alt="Imagem"
              className="w-full max-w-xs object-cover hover:opacity-90 transition-opacity"
              style={{ maxHeight: '240px', objectFit: 'cover' }}
            />
          </a>
        )}

        {/* Text content */}
        {msg.content && (
          <p className="whitespace-pre-wrap break-words px-4 py-2.5">{msg.content}</p>
        )}

        {/* Time */}
        <p className={cn(
          'text-[10px] px-4 pb-2 text-right',
          isOwn ? 'text-primary-200' : 'text-slate-400',
          !msg.content && !msg.image_url ? 'pt-2' : ''
        )}>
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  // Image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem válida'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 10 MB)'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    if (fileRef.current) fileRef.current.value = ''
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  // Send message
  const send = useMutation({
    mutationFn: async ({ content, imageUrl }: { content: string; imageUrl?: string }) => {
      const { error } = await supabase.from('messages').insert({
        conversation_id: id!,
        sender_id:       user!.id,
        content:         content || '',
        image_url:       imageUrl ?? null,
        is_read:         false,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setText('')
      clearImage()
      queryClient.invalidateQueries({ queryKey: ['messages', id] })
    },
    onError: () => toast.error('Erro ao enviar mensagem.'),
  })

  const handleSend = async () => {
    const content = text.trim()
    if (!content && !imageFile) return
    if (send.isPending || uploadingImage) return

    let imageUrl: string | undefined

    if (imageFile) {
      setUploadingImage(true)
      try {
        const ext = imageFile.name.split('.').pop()
        const filePath = `${id}/${user!.id}-${Date.now()}.${ext}`

        const { error: upErr } = await supabase.storage
          .from('chat-images')
          .upload(filePath, imageFile)

        if (upErr) throw upErr

        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(filePath)

        imageUrl = publicUrl
      } catch {
        toast.error('Erro ao enviar imagem.')
        setUploadingImage(false)
        return
      }
      setUploadingImage(false)
    }

    send.mutate({ content, imageUrl })
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
  const isSending = send.isPending || uploadingImage

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

      {/* Image preview strip */}
      {imagePreview && (
        <div className="bg-white border-t border-slate-100 px-4 pt-3">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="preview"
              className="h-20 w-20 object-cover rounded-xl border border-slate-200"
            />
            <button
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
          {/* Image upload button */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isSending}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border border-slate-300 text-slate-400 hover:text-primary-600 hover:border-primary-300 transition-colors disabled:opacity-40"
          >
            <ImageIcon size={18} />
          </button>

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
            disabled={(!text.trim() && !imageFile) || isSending}
            isLoading={isSending}
            className="shrink-0 w-10 h-10 p-0 rounded-xl"
          >
            {!isSending && <Send size={16} />}
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">Shift+Enter para nova linha</p>
      </div>
    </div>
  )
}
