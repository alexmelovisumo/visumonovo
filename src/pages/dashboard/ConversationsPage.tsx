import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MessageSquare, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { Conversation, Profile, Project } from '@/types'

type ConvWithRelations = Omit<Conversation, 'participant_one' | 'participant_two' | 'project'> & {
  project:          Pick<Project, 'id' | 'title'>
  participant_one:  Pick<Profile, 'id' | 'full_name' | 'email' | 'profile_image_url'>
  participant_two:  Pick<Profile, 'id' | 'full_name' | 'email' | 'profile_image_url'>
  last_msg?:        { content: string; sender_id: string } | null
  unread:           number
}

export function ConversationsPage() {
  const { user } = useAuthStore()

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          project:projects(id, title),
          participant_one:profiles!conversations_participant_one_id_fkey(id, full_name, email, profile_image_url),
          participant_two:profiles!conversations_participant_two_id_fkey(id, full_name, email, profile_image_url),
          last_msg:messages(content, sender_id)
        `)
        .or(`participant_one_id.eq.${user!.id},participant_two_id.eq.${user!.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (error) throw error

      // Count unread messages per conversation
      const convIds = (data ?? []).map((c) => c.id)
      let unreadMap: Record<string, number> = {}

      if (convIds.length > 0) {
        const { data: unreadData } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convIds)
          .eq('is_read', false)
          .neq('sender_id', user!.id)

        for (const m of unreadData ?? []) {
          unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] ?? 0) + 1
        }
      }

      return (data ?? []).map((c) => ({
        ...c,
        // last_msg comes as array (limit 1 order by created_at desc done via RPC)
        last_msg: Array.isArray(c.last_msg) ? c.last_msg[0] ?? null : c.last_msg,
        unread: unreadMap[c.id] ?? 0,
      })) as ConvWithRelations[]
    },
    enabled: !!user?.id,
    refetchInterval: 15_000, // Poll every 15s as fallback
  })

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mensagens</h1>
        <p className="text-slate-500 text-sm mt-1">Suas conversas com empresas e profissionais</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <MessageSquare size={28} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Nenhuma conversa ainda</h3>
          <p className="text-sm text-slate-400">
            As conversas aparecem quando uma proposta é aceita.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const other = conv.participant_one.id === user!.id
              ? conv.participant_two
              : conv.participant_one
            const otherName = other.full_name ?? other.email
            const initials = otherName.charAt(0).toUpperCase()

            return (
              <Link
                key={conv.id}
                to={`/dashboard/mensagens/${conv.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-4 hover:border-primary-300 hover:shadow-md transition-all group"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {other.profile_image_url ? (
                    <img
                      src={other.profile_image_url}
                      alt={otherName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
                      {initials}
                    </div>
                  )}
                  {conv.unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-bold">
                      {conv.unread > 9 ? '9+' : conv.unread}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={cn(
                      'text-sm font-semibold truncate',
                      conv.unread > 0 ? 'text-slate-900' : 'text-slate-700'
                    )}>
                      {otherName}
                    </p>
                    {conv.last_message_at && (
                      <span className="text-xs text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock size={10} />
                        {formatDistanceToNow(new Date(conv.last_message_at), { locale: ptBR, addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mb-0.5">
                    {conv.project?.title}
                  </p>
                  {conv.last_msg && (
                    <p className={cn(
                      'text-xs truncate',
                      conv.unread > 0 ? 'font-medium text-slate-700' : 'text-slate-400'
                    )}>
                      {conv.last_msg.sender_id === user!.id ? 'Você: ' : ''}
                      {conv.last_msg.content}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
