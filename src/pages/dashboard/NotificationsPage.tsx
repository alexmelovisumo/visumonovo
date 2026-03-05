import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell, CheckCheck, Megaphone, Star, FileCheck, XCircle, ListChecks, MailOpen, ClipboardList,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

// ─── Icon by type (reusable) ─────────────────────────────────

function NotifIcon({ type, size = 16 }: { type: Notification['type']; size?: number }) {
  const cls = 'shrink-0 rounded-full p-2'
  switch (type) {
    case 'nova_proposta':      return <div className={cn(cls, 'bg-primary-100 text-primary-600')}><Megaphone size={size} /></div>
    case 'proposta_aceita':    return <div className={cn(cls, 'bg-green-100 text-green-600')}><FileCheck size={size} /></div>
    case 'proposta_recusada':  return <div className={cn(cls, 'bg-red-100 text-red-500')}><XCircle size={size} /></div>
    case 'projeto_finalizado': return <div className={cn(cls, 'bg-blue-100 text-blue-600')}><CheckCheck size={size} /></div>
    case 'nova_avaliacao':     return <div className={cn(cls, 'bg-amber-100 text-amber-500')}><Star size={size} /></div>
    case 'cotacao_respondida': return <div className={cn(cls, 'bg-cyan-100 text-cyan-600')}><FileCheck size={size} /></div>
    case 'marco_concluido':    return <div className={cn(cls, 'bg-violet-100 text-violet-600')}><ListChecks size={size} /></div>
    case 'convite_projeto':    return <div className={cn(cls, 'bg-indigo-100 text-indigo-600')}><MailOpen size={size} /></div>
    case 'nova_cotacao':       return <div className={cn(cls, 'bg-orange-100 text-orange-600')}><ClipboardList size={size} /></div>
    default:                   return <div className={cn(cls, 'bg-slate-100 text-slate-500')}><Bell size={size} /></div>
  }
}

// ─── Page ─────────────────────────────────────────────────────

export function NotificationsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['all-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as Notification[]
    },
    enabled: !!user?.id,
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notif-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markOneRead = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notif-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
    if (n.link) navigate(n.link)
  }

  const unread = notifications.filter((n) => !n.is_read).length

  // Group by date
  const grouped = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const day = format(new Date(n.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    if (!acc[day]) acc[day] = []
    acc[day].push(n)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notificações</h1>
          <p className="text-slate-500 text-sm mt-1">
            {unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            isLoading={markAllRead.isPending}
          >
            <CheckCheck size={14} /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Bell size={28} className="text-slate-300" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Nenhuma notificação ainda</h3>
          <p className="text-sm text-slate-400">
            Você será notificado sobre propostas, projetos e avaliações aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, items]) => (
            <section key={day}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{day}</p>
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-50 overflow-hidden">
                {items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markOneRead(n)}
                    className={cn(
                      'w-full flex items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50',
                      !n.is_read && 'bg-primary-50/40 hover:bg-primary-50'
                    )}
                  >
                    <NotifIcon type={n.type} />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm leading-snug',
                        !n.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'
                      )}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-500 shrink-0 mt-1.5" />
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
