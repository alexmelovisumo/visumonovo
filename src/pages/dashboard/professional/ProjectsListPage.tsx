import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search, MapPin, Calendar, DollarSign, Filter, FolderOpen,
  Map, ArrowUpDown, Users, Zap, Mail, Crown, AlertTriangle,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { BR_STATES } from '@/utils/constants'
import { FavoriteButton } from '@/components/common/FavoriteButton'
import { cn } from '@/lib/utils'
import type { Project, ProjectCategory } from '@/types'

type ProjectWithCats = Omit<Project, 'categories'> & {
  categories:  { category: { name: string; id: string } }[]
  proposals:   { count: number }[]
}

type SortOption = 'newest' | 'oldest' | 'budget_desc' | 'budget_asc' | 'deadline'

const SORT_LABELS: Record<SortOption, string> = {
  newest:      'Mais recentes',
  oldest:      'Mais antigos',
  budget_desc: 'Maior orçamento',
  budget_asc:  'Menor orçamento',
  deadline:    'Prazo mais próximo',
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
  const categories    = project.categories.map((c) => c.category.name)
  const proposalCount = project.proposals?.[0]?.count ?? 0

  return (
    <Link
      to={`/dashboard/projeto/${project.id}`}
      className={`block bg-white rounded-2xl border p-5 hover:shadow-md transition-all group ${project.is_featured ? 'border-amber-300 hover:border-amber-400' : project.is_urgent ? 'border-red-300 hover:border-red-400' : 'border-slate-200 hover:border-primary-300'}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {project.is_featured && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-400 text-white px-2 py-0.5 rounded-full">
                <Crown size={9} /> DESTAQUE
              </span>
            )}
            {project.is_urgent && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                <Zap size={9} /> URGENTE
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-primary-700 transition-colors">
            {project.title}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <FavoriteButton entityType="project" entityId={project.id} size={14} />
          {proposalCount === 0 ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
              Sem propostas
            </span>
          ) : (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
              <Users size={10} /> {proposalCount}
            </span>
          )}
        </div>
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

// ─── Quick toggle button ──────────────────────────────────────

function QuickFilter({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
        active
          ? 'bg-primary-600 border-primary-600 text-white'
          : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-700'
      )}
    >
      {icon}
      {label}
      {count != null && count > 0 && (
        <span className={cn(
          'ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
          active ? 'bg-white/20' : 'bg-primary-100 text-primary-700'
        )}>
          {count}
        </span>
      )}
    </button>
  )
}

// ─── Haversine distance (km) ──────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Page ─────────────────────────────────────────────────────

const PAGE_SIZE = 12

export function ProjectsListPage() {
  const { user, profile } = useAuthStore()
  const [search, setSearch]               = useState('')
  // stateFilter: '' = all states (manual override only, no auto-init from profile)
  const [stateFilter, setStateFilter]     = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy]               = useState<SortOption>('newest')
  const [budgetMin, setBudgetMin]         = useState('')
  const [budgetMax, setBudgetMax]         = useState('')
  const [deadlineFilter, setDeadlineFilter] = useState('')
  const [urgentOnly, setUrgentOnly]       = useState(false)
  const [onlyInvited, setOnlyInvited]     = useState(false)
  const [myAreaOnly, setMyAreaOnly]       = useState(true)
  const [displayLimit, setDisplayLimit]   = useState(PAGE_SIZE)

  // Coverage entries: home city (always has state) + extra cities (may have state as "city|state")
  // Supports both legacy format ("Blumenau" — city only) and new format ("Blumenau|SC")
  const coveredEntries = useMemo(() => {
    const entries: { city: string; state: string | null }[] = []
    if (profile?.city) {
      entries.push({
        city:  profile.city.toLowerCase().trim(),
        state: profile.state?.toLowerCase().trim() ?? null,
      })
    }
    if (profile?.coverage_cities) {
      profile.coverage_cities.forEach((c) => {
        const parts = c.split('|')
        entries.push({
          city:  parts[0].toLowerCase().trim(),
          state: parts[1]?.toLowerCase().trim() ?? null,
        })
      })
    }
    return entries
  }, [profile?.city, profile?.state, profile?.coverage_cities])

  const hasCoverage = coveredEntries.length > 0

  useEffect(() => {
    setDisplayLimit(PAGE_SIZE)
  }, [search, stateFilter, categoryFilter, sortBy, budgetMin, budgetMax, deadlineFilter, urgentOnly, onlyInvited, myAreaOnly])

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

  const { data: invitedIds = new Set<string>() } = useQuery({
    queryKey: ['pending-invitation-ids', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_invitations')
        .select('project_id')
        .eq('recipient_id', user!.id)
        .eq('status', 'pending')
      return new Set((data ?? []).map((r) => r.project_id as string))
    },
    enabled: !!user?.id,
  })

  // When myAreaOnly is ON: fetch all states (city+state filter runs client-side)
  // When myAreaOnly is OFF: respect manual stateFilter dropdown
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['open-projects', myAreaOnly ? '' : stateFilter, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*, categories:project_category_assignments(category:project_categories(name, id)), proposals(count)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (!myAreaOnly && stateFilter) query = query.eq('state', stateFilter)

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

  const filtered = projects
    .filter((p) => {
      if (!myAreaOnly || !hasCoverage) return true

      const profLat = profile?.latitude
      const profLng = profile?.longitude
      const radius  = profile?.coverage_radius_km

      // 1. Radius filter — both professional and project have coordinates
      if (profLat && profLng && radius && p.latitude && p.longitude) {
        if (haversineKm(profLat, profLng, p.latitude, p.longitude) <= radius) return true
      }

      // 2. Radius + project has no coords → include project if professional covers a large area
      //    (project without coordinates can't be excluded by distance — benefit of the doubt)
      if (profLat && profLng && radius && !p.latitude && !p.longitude) {
        // For large radius (>=100km), show projects without coords (cross-state coverage possible)
        // For small radius, only show if city matches
        if (radius >= 100) return true
      }

      // 3. City+state explicit match (additional cities or fallback)
      const pCity  = p.city?.toLowerCase().trim() ?? ''
      const pState = p.state?.toLowerCase().trim() ?? ''
      return coveredEntries.some((e) => {
        if (e.city !== pCity) return false
        if (e.state === null) return true   // legacy: city-only entry, match any state
        return e.state === pState
      })
    })
    .filter((p) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q)
      )
    })
    .filter((p) => !urgentOnly || p.is_urgent)
    .filter((p) => !onlyInvited || invitedIds.has(p.id))
    .filter((p) => {
      if (!deadlineFilter) return true
      if (!p.deadline) return false
      const days = differenceInDays(new Date(p.deadline), new Date())
      return days >= 0 && days <= parseInt(deadlineFilter)
    })
    .filter((p) => {
      const minF = budgetMin ? parseFloat(budgetMin) : null
      const maxF = budgetMax ? parseFloat(budgetMax) : null
      if (!minF && !maxF) return true
      const pMax = p.budget_max ?? p.budget_min ?? Infinity
      const pMin = p.budget_min ?? p.budget_max ?? 0
      if (minF && maxF) return pMax >= minF && pMin <= maxF
      if (minF) return pMax >= minF
      if (maxF) return pMin <= maxF
      return true
    })
    .slice()
    .sort((a, b) => {
      // Featured projects always first
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'budget_desc':
          return (b.budget_max ?? b.budget_min ?? 0) - (a.budget_max ?? a.budget_min ?? 0)
        case 'budget_asc': {
          const av = a.budget_min ?? a.budget_max ?? Infinity
          const bv = b.budget_min ?? b.budget_max ?? Infinity
          return av - bv
        }
        case 'deadline': {
          const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity
          const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity
          return ad - bd
        }
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const displayed = filtered.slice(0, displayLimit)
  const hasMore   = filtered.length > displayLimit

  const hasActiveFilters =
    !!search || !!stateFilter || !!categoryFilter || sortBy !== 'newest' ||
    !!budgetMin || !!budgetMax || !!deadlineFilter || urgentOnly || onlyInvited || !myAreaOnly

  const clearAll = () => {
    setSearch(''); setStateFilter(''); setCategoryFilter(''); setSortBy('newest')
    setBudgetMin(''); setBudgetMax(''); setDeadlineFilter('')
    setUrgentOnly(false); setOnlyInvited(false); setMyAreaOnly(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projetos disponíveis</h1>
          <p className="text-slate-500 text-sm mt-1">Encontre projetos e envie suas propostas</p>
        </div>
        <Link
          to="/dashboard/projetos/mapa"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:border-primary-300 hover:text-primary-700 transition-colors shrink-0"
        >
          <Map size={15} />
          Ver no mapa
        </Link>
      </div>

      {/* Banner: localização não configurada */}
      {!hasCoverage && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold text-amber-800">Área de atuação não configurada.</span>
            {' '}
            <span className="text-amber-700">Você está vendo todos os projetos. </span>
            <Link to="/dashboard/localizacao" className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900">
              Configure sua área agora →
            </Link>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        {/* Row 1: search / state / category / sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
            {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
              <option key={key} value={key}>{SORT_LABELS[key]}</option>
            ))}
          </Select>
        </div>

        {/* Row 2: budget / deadline */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="number"
              min="0"
              placeholder="Orç. mínimo"
              className="pl-8 text-sm"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
            />
          </div>
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="number"
              min="0"
              placeholder="Orç. máximo"
              className="pl-8 text-sm"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
            />
          </div>
          <Select value={deadlineFilter} onChange={(e) => setDeadlineFilter(e.target.value)}>
            <option value="">Qualquer prazo</option>
            <option value="7">Prazo: próx. 7 dias</option>
            <option value="30">Prazo: próx. 30 dias</option>
            <option value="60">Prazo: próx. 60 dias</option>
          </Select>
          {/* Quick toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            {hasCoverage && (
              <QuickFilter
                active={myAreaOnly}
                onClick={() => setMyAreaOnly((v) => !v)}
                icon={<MapPin size={11} />}
                label="Minha área"
              />
            )}
            <QuickFilter
              active={urgentOnly}
              onClick={() => setUrgentOnly((v) => !v)}
              icon={<Zap size={11} />}
              label="Urgentes"
            />
            {invitedIds.size > 0 && (
              <QuickFilter
                active={onlyInvited}
                onClick={() => setOnlyInvited((v) => !v)}
                icon={<Mail size={11} />}
                label="Convidados"
                count={invitedIds.size}
              />
            )}
          </div>
        </div>
      </div>

      {/* Results bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {isLoading ? 'Buscando...' : `${filtered.length} projeto${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ArrowUpDown size={11} /> {SORT_LABELS[sortBy]}
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <Filter size={12} /> Limpar filtros
            </button>
          )}
        </div>
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
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {displayed.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setDisplayLimit((l) => l + PAGE_SIZE)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-primary-300 hover:text-primary-700 transition-colors"
              >
                Carregar mais ({filtered.length - displayLimit} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
