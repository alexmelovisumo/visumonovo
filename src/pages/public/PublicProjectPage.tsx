import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin, Calendar, DollarSign, FolderOpen, Share2,
  ChevronLeft, Building2, Tag, Clock, Zap, Users,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useSEO } from '@/hooks/useSEO'

// ─── Types ────────────────────────────────────────────────────

interface PublicProject {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  status: string
  city: string | null
  state: string | null
  is_urgent: boolean
  created_at: string
  client: { id: string; full_name: string | null; company_name: string | null; profile_image_url: string | null } | null
  categories: { category: { name: string } }[]
}

// ─── Helpers ──────────────────────────────────────────────────

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return 'A combinar'
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `A partir de ${fmt(min)}`
  return `Até ${fmt(max!)}`
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open:           { label: 'Aberto',         color: 'bg-green-100 text-green-700' },
  in_negotiation: { label: 'Em negociação',  color: 'bg-blue-100 text-blue-700' },
  in_progress:    { label: 'Em andamento',   color: 'bg-violet-100 text-violet-700' },
  completed:      { label: 'Concluído',      color: 'bg-slate-100 text-slate-600' },
  cancelled:      { label: 'Cancelado',      color: 'bg-red-100 text-red-600' },
}

// ─── Page ─────────────────────────────────────────────────────

export function PublicProjectPage() {
  const { id } = useParams<{ id: string }>()

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['public-project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, title, description, budget_min, budget_max,
          deadline, status, city, state, is_urgent, created_at,
          client:profiles!projects_client_id_fkey(id, full_name, company_name, profile_image_url),
          categories:project_category_assignments(category:project_categories(name))
        `)
        .eq('id', id!)
        .neq('status', 'cancelled')
        .maybeSingle()
      if (error) throw error
      return data as PublicProject | null
    },
    enabled: !!id,
  })

  const { data: proposalCount = 0 } = useQuery({
    queryKey: ['public-project-proposals', id],
    queryFn: async () => {
      const { count } = await supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', id!)
      return count ?? 0
    },
    enabled: !!id,
  })

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: project?.title ?? 'Projeto Visumo', url })
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado!')
    }
  }

  useSEO({
    title:       project?.title ?? '',
    description: project?.description?.slice(0, 160) ?? undefined,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-center px-4">
        <FolderOpen size={40} className="text-slate-300" />
        <h1 className="text-xl font-bold text-slate-700">Projeto não encontrado</h1>
        <p className="text-slate-400 text-sm">Este projeto não existe ou não está mais disponível.</p>
        <Link to="/" className="text-primary-600 hover:underline text-sm">Voltar ao início</Link>
      </div>
    )
  }

  const status    = STATUS_MAP[project.status] ?? { label: project.status, color: 'bg-slate-100 text-slate-600' }
  const clientName = project.client?.company_name ?? project.client?.full_name ?? 'Empresa'
  const categories = (project.categories ?? []).map((c) => c.category.name)
  const budget     = formatBudget(project.budget_min, project.budget_max)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">V</span>
          </div>
          <span className="font-bold text-primary-700 text-base">Visumo</span>
        </Link>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 transition-colors"
        >
          <Share2 size={16} /> Compartilhar
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Back */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft size={16} /> Voltar
        </Link>

        {/* Project card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          {/* Status + categories */}
          <div className="flex flex-wrap gap-2">
            {project.is_urgent && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                <Zap size={9} /> URGENTE
              </span>
            )}
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
              {status.label}
            </span>
            {categories.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full">
                <Tag size={10} /> {cat}
              </span>
            ))}
          </div>

          <h1 className="text-xl font-bold text-slate-900">{project.title}</h1>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
            {(project.city || project.state) && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} /> {[project.city, project.state].filter(Boolean).join(' / ')}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <DollarSign size={14} /> {budget}
            </span>
            {project.deadline && (
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                Prazo: {format(new Date(project.deadline), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              Publicado {format(new Date(project.created_at), "dd 'de' MMMM", { locale: ptBR })}
            </span>
            {proposalCount > 0 && (
              <span className="flex items-center gap-1.5 text-primary-600 font-medium">
                <Users size={14} />
                {proposalCount} proposta{proposalCount !== 1 ? 's' : ''} recebida{proposalCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{project.description}</p>
        </div>

        {/* Company info */}
        {project.client && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
            {project.client.profile_image_url ? (
              <img
                src={project.client.profile_image_url}
                alt={clientName}
                className="w-12 h-12 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                <Building2 size={20} className="text-primary-700" />
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-900 text-sm">{clientName}</p>
              <Link
                to={`/empresa/${project.client.id}`}
                className="text-xs text-primary-600 hover:underline"
              >
                Ver perfil da empresa
              </Link>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl p-6 text-center space-y-4 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
          <p className="font-bold text-lg">Quer enviar uma proposta?</p>
          <p className="text-primary-200 text-sm">Crie sua conta gratuita como profissional e concorra a este projeto.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/cadastro"
              className="bg-white text-primary-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-primary-50 transition-colors text-sm"
            >
              Criar conta grátis
            </Link>
            <Link
              to="/login"
              className="border border-primary-400 text-white font-medium px-6 py-2.5 rounded-xl hover:bg-primary-700 transition-colors text-sm"
            >
              Já tenho conta
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
