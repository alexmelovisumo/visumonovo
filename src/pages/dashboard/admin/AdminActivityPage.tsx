import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Activity, FolderOpen, Handshake, UserPlus, Star,
  Package, ChevronLeft, RefreshCw, ClipboardList,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────

type EventType = 'project' | 'proposal' | 'user' | 'review' | 'quote' | 'product'

interface ActivityEvent {
  id: string
  type: EventType
  title: string
  subtitle: string
  link?: string
  created_at: string
}

// ─── Icon map ─────────────────────────────────────────────────

const ICON: Record<EventType, React.ReactNode> = {
  project:  <FolderOpen  size={15} />,
  proposal: <Handshake   size={15} />,
  user:     <UserPlus    size={15} />,
  review:   <Star        size={15} />,
  quote:    <ClipboardList size={15} />,
  product:  <Package     size={15} />,
}

const COLOR: Record<EventType, string> = {
  project:  'bg-primary-100 text-primary-700',
  proposal: 'bg-violet-100 text-violet-700',
  user:     'bg-green-100 text-green-700',
  review:   'bg-amber-100 text-amber-700',
  quote:    'bg-cyan-100 text-cyan-700',
  product:  'bg-rose-100 text-rose-700',
}

const LABELS: Record<EventType, string> = {
  project:  'Projeto',
  proposal: 'Proposta',
  user:     'Usuário',
  review:   'Avaliação',
  quote:    'Cotação',
  product:  'Produto',
}

// ─── Page ─────────────────────────────────────────────────────

const LIMIT = 20

export function AdminActivityPage() {
  const [filter, setFilter] = useState<EventType | 'all'>('all')

  const { data: events = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async (): Promise<ActivityEvent[]> => {
      const all: ActivityEvent[] = []

      // Projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title, created_at, client:profiles!client_id(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(LIMIT)
      for (const p of projects ?? []) {
        const client = Array.isArray(p.client) ? p.client[0] : p.client
        all.push({
          id: `proj-${p.id}`,
          type: 'project',
          title: p.title,
          subtitle: `por ${(client as { full_name?: string; email?: string })?.full_name ?? (client as { email?: string })?.email ?? '—'}`,
          link: `/dashboard/projeto/${p.id}`,
          created_at: p.created_at,
        })
      }

      // Proposals
      const { data: proposals } = await supabase
        .from('proposals')
        .select('id, created_at, professional:profiles!professional_id(full_name, email), project:projects!project_id(title)')
        .order('created_at', { ascending: false })
        .limit(LIMIT)
      for (const p of proposals ?? []) {
        const prof = Array.isArray(p.professional) ? p.professional[0] : p.professional
        const proj = Array.isArray(p.project) ? p.project[0] : p.project
        all.push({
          id: `prop-${p.id}`,
          type: 'proposal',
          title: `Proposta em "${(proj as { title?: string })?.title ?? '—'}"`,
          subtitle: `por ${(prof as { full_name?: string; email?: string })?.full_name ?? (prof as { email?: string })?.email ?? '—'}`,
          created_at: p.created_at,
        })
      }

      // Users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_type, created_at')
        .order('created_at', { ascending: false })
        .limit(LIMIT)
      for (const u of users ?? []) {
        all.push({
          id: `user-${u.id}`,
          type: 'user',
          title: u.full_name ?? u.email,
          subtitle: `novo cadastro · ${u.user_type}`,
          created_at: u.created_at,
        })
      }

      // Reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, rating, created_at, reviewer:profiles!reviewer_id(full_name, email), reviewed:profiles!reviewed_id(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(LIMIT)
      for (const r of reviews ?? []) {
        const reviewer = Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer
        const reviewed = Array.isArray(r.reviewed) ? r.reviewed[0] : r.reviewed
        all.push({
          id: `rev-${r.id}`,
          type: 'review',
          title: `${r.rating}★ — avaliação de ${(reviewer as { full_name?: string })?.full_name ?? '—'}`,
          subtitle: `para ${(reviewed as { full_name?: string })?.full_name ?? '—'}`,
          created_at: r.created_at,
        })
      }

      // Quote requests
      const { data: quotes } = await supabase
        .from('quote_requests')
        .select('id, description, created_at, requester:profiles!requester_id(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(LIMIT)
      for (const q of quotes ?? []) {
        const req = Array.isArray(q.requester) ? q.requester[0] : q.requester
        all.push({
          id: `quote-${q.id}`,
          type: 'quote',
          title: (q.description ?? 'Cotação').slice(0, 60),
          subtitle: `solicitada por ${(req as { full_name?: string; email?: string })?.full_name ?? (req as { email?: string })?.email ?? '—'}`,
          created_at: q.created_at,
        })
      }

      // Products
      const { data: products } = await supabase
        .from('products')
        .select('id, name, created_at, supplier:profiles!supplier_id(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(LIMIT)
      for (const p of products ?? []) {
        const sup = Array.isArray(p.supplier) ? p.supplier[0] : p.supplier
        all.push({
          id: `prod-${p.id}`,
          type: 'product',
          title: p.name,
          subtitle: `por ${(sup as { full_name?: string; email?: string })?.full_name ?? (sup as { email?: string })?.email ?? '—'}`,
          created_at: p.created_at,
        })
      }

      return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    },
    refetchInterval: 60_000,
  })

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter)

  const TYPES: (EventType | 'all')[] = ['all', 'project', 'proposal', 'user', 'review', 'quote', 'product']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/admin" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity size={22} className="text-primary-500" />
              Atividade da plataforma
            </h1>
            <p className="text-sm text-slate-500">Últimas {LIMIT} ações por categoria · atualiza a cada 60s</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} />
          Atualizar
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              filter === t
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-600'
            )}
          >
            {t !== 'all' && <span className={cn('w-4 h-4 rounded-full flex items-center justify-center', COLOR[t])}>{ICON[t]}</span>}
            {t === 'all' ? 'Todos' : LABELS[t]}
            <span className="text-[10px] opacity-70">
              {t === 'all' ? events.length : events.filter((e) => e.type === t).length}
            </span>
          </button>
        ))}
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-400 py-16">Nenhuma atividade encontrada.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {filtered.map((event) => (
            <div key={event.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5', COLOR[event.type])}>
                {ICON[event.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  {event.link ? (
                    <Link to={event.link} className="text-sm font-medium text-slate-900 truncate hover:text-primary-600 transition-colors">
                      {event.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-slate-900 truncate">{event.title}</p>
                  )}
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {formatDistanceToNow(new Date(event.created_at), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">{event.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
