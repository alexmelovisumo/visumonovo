import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, MapPin, Calendar, DollarSign, Filter, FolderOpen } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { BR_STATES } from '@/utils/constants'
import type { Project, ProjectCategory } from '@/types'

type ProjectWithCats = Omit<Project, 'categories'> & {
  categories: { category: { name: string; id: string } }[]
}

// ─── Helpers ─────────────────────────────────────────────────

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return 'A combinar'
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `A partir de ${fmt(min)}`
  return `Até ${fmt(max!)}`
}

// ─── Project Card ─────────────────────────────────────────────

function ProjectCard({ project }: { project: ProjectWithCats }) {
  const categories = project.categories.map((c) => c.category.name)

  return (
    <Link
      to={`/dashboard/projeto/${project.id}`}
      className="block bg-white rounded-2xl border border-slate-200 p-5 hover:border-primary-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-primary-700 transition-colors flex-1">
          {project.title}
        </h3>
        <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
          Aberto
        </span>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {categories.map((c) => (
            <span key={c} className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">{c}</span>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500 line-clamp-2 mb-4">{project.description}</p>

      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        {project.city && (
          <span className="flex items-center gap-1">
            <MapPin size={11} /> {project.city}/{project.state}
          </span>
        )}
        <span className="flex items-center gap-1">
          <DollarSign size={11} /> {formatBudget(project.budget_min, project.budget_max)}
        </span>
        {project.deadline && (
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {format(new Date(project.deadline), 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        )}
        <span className="ml-auto text-slate-300">
          {format(new Date(project.created_at), "dd 'de' MMM", { locale: ptBR })}
        </span>
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function ProjectsListPage() {
  const { profile } = useAuthStore()
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState(profile?.state ?? '')
  const [categoryFilter, setCategoryFilter] = useState('')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      if (error) throw error
      return data as ProjectCategory[]
    },
  })

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['open-projects', stateFilter, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*, categories:project_category_assignments(category:project_categories(name, id))')
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (stateFilter) query = query.eq('state', stateFilter)

      const { data, error } = await query
      if (error) throw error

      let result = (data ?? []) as ProjectWithCats[]

      if (categoryFilter) {
        result = result.filter((p) =>
          p.categories.some((c) => c.category.id === categoryFilter)
        )
      }

      return result
    },
  })

  const filtered = search
    ? projects.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.city?.toLowerCase().includes(search.toLowerCase())
      )
    : projects

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Projetos disponíveis</h1>
        <p className="text-slate-500 text-sm mt-1">Encontre projetos e envie suas propostas</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar projetos..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="">Todos os estados</option>
            {BR_STATES.map((s) => (
              <option key={s.uf} value={s.uf}>{s.uf} — {s.name}</option>
            ))}
          </Select>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {isLoading ? 'Buscando...' : `${filtered.length} projeto${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
        </p>
        {(stateFilter || categoryFilter || search) && (
          <button
            onClick={() => { setSearch(''); setStateFilter(''); setCategoryFilter('') }}
            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <Filter size={12} /> Limpar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Nenhum projeto encontrado</h3>
          <p className="text-sm text-slate-400">Tente ajustar os filtros ou verifique mais tarde.</p>
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
