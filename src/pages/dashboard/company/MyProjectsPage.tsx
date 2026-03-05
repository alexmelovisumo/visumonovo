import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PlusCircle, FolderOpen, MapPin, Calendar, MessageSquare, Eye, Search } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PROJECT_STATUS_LABELS } from '@/utils/constants'
import type { Project } from '@/types'

// ─── Status Badge ─────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  open:          'bg-green-100 text-green-700',
  in_negotiation:'bg-blue-100 text-blue-700',
  in_progress:   'bg-violet-100 text-violet-700',
  completed:     'bg-slate-100 text-slate-600',
  cancelled:     'bg-red-100 text-red-600',
}

// ─── Project Card ─────────────────────────────────────────────

function ProjectCard({ project }: { project: Project & { proposals_count: number } }) {
  const statusLabel = PROJECT_STATUS_LABELS[project.status] ?? project.status
  const statusStyle = STATUS_STYLES[project.status] ?? 'bg-slate-100 text-slate-600'

  return (
    <Link
      to={`/dashboard/projeto/${project.id}`}
      className="block bg-white rounded-2xl border border-slate-200 p-5 hover:border-primary-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-primary-700 transition-colors flex-1">
          {project.title}
        </h3>
        <span className={cn('shrink-0 text-xs font-medium px-2.5 py-1 rounded-full', statusStyle)}>
          {statusLabel}
        </span>
      </div>

      <p className="text-xs text-slate-500 line-clamp-2 mb-4">{project.description}</p>

      <div className="flex items-center gap-4 text-xs text-slate-400">
        {project.city && (
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {project.city}/{project.state}
          </span>
        )}
        {project.deadline && (
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {format(new Date(project.deadline), 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <MessageSquare size={12} /> {project.proposals_count} proposta{project.proposals_count !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <Eye size={12} /> {project.view_count}
        </span>
      </div>
    </Link>
  )
}

// ─── Sort options ─────────────────────────────────────────────

type SortKey = 'recent' | 'proposals' | 'deadline'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent',    label: 'Mais recentes' },
  { key: 'proposals', label: 'Mais propostas' },
  { key: 'deadline',  label: 'Prazo próximo' },
]

// ─── Filter Tabs ──────────────────────────────────────────────

const FILTERS = [
  { key: 'all',           label: 'Todos' },
  { key: 'open',          label: 'Abertos' },
  { key: 'in_negotiation',label: 'Em negociação' },
  { key: 'in_progress',   label: 'Em andamento' },
  { key: 'completed',     label: 'Concluídos' },
]

// ─── Page ─────────────────────────────────────────────────────

export function MyProjectsPage() {
  const { user } = useAuthStore()
  const [filter,  setFilter]  = useState('all')
  const [search,  setSearch]  = useState('')
  const [sortBy,  setSortBy]  = useState<SortKey>('recent')

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['my-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, proposals:proposals(count)')
        .eq('client_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data ?? []).map((p) => ({
        ...p,
        proposals_count: (p.proposals as unknown as { count: number }[])[0]?.count ?? 0,
      })) as (Project & { proposals_count: number })[]
    },
    enabled: !!user?.id,
  })

  const filtered = useMemo(() => {
    let list = filter === 'all' ? projects : projects.filter((p) => p.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      )
    }
    if (sortBy === 'proposals') {
      list = [...list].sort((a, b) => b.proposals_count - a.proposals_count)
    } else if (sortBy === 'deadline') {
      list = [...list].sort((a, b) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      })
    }
    // 'recent' mantém ordem do servidor (created_at desc)
    return list
  }, [projects, filter, search, sortBy])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus projetos</h1>
          <p className="text-slate-500 text-sm mt-1">{projects.length} projeto{projects.length !== 1 ? 's' : ''} no total</p>
        </div>
        <Link to="/dashboard/criar-projeto">
          <Button>
            <PlusCircle size={16} />
            Novo projeto
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const count = f.key === 'all' ? projects.length : projects.filter((p) => p.status === f.key).length
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all',
                filter === f.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-300'
              )}
            >
              {f.label}
              {count > 0 && (
                <span className={cn(
                  'ml-1.5 text-xs font-semibold',
                  filter === f.key ? 'opacity-75' : 'text-slate-400'
                )}>
                  ({count})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search + sort */}
      {projects.length > 0 && (
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por título ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-8 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="h-10 rounded-xl border border-slate-200 text-sm px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">
            {projects.length === 0
              ? 'Nenhum projeto ainda'
              : search.trim()
                ? 'Nenhum resultado para esta busca'
                : 'Nenhum projeto neste status'}
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            {projects.length === 0
              ? 'Publique seu primeiro projeto e receba propostas.'
              : search.trim()
                ? 'Tente outros termos ou limpe a busca.'
                : 'Tente outro filtro.'}
          </p>
          {projects.length === 0 && (
            <Link to="/dashboard/criar-projeto">
              <Button>
                <PlusCircle size={16} />
                Criar primeiro projeto
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}
