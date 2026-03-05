import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Heart, User, Briefcase, MapPin, Star, ChevronLeft, BadgeCheck, Store } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useFavorites } from '@/hooks/useFavorites'
import { FavoriteButton } from '@/components/common/FavoriteButton'
import { useAuthStore } from '@/stores/authStore'

// ─── Types ────────────────────────────────────────────────────

interface FavProfessional {
  id: string
  full_name: string | null
  avatar_url: string | null
  profile_image_url: string | null
  bio: string | null
  city: string | null
  state: string | null
  user_type: string
  specialties: string[]
  is_verified: boolean
  avg_rating: number
  review_count: number
}

interface FavProject {
  id: string
  title: string
  description: string
  city: string | null
  state: string | null
  budget_min: number | null
  budget_max: number | null
  status: string
}

// ─── Helpers ─────────────────────────────────────────────────

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return 'A combinar'
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `A partir de ${fmt(min)}`
  return `Até ${fmt(max!)}`
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          className={s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
        />
      ))}
    </div>
  )
}

// ─── Professional Card ────────────────────────────────────────

function FavProfCard({ prof }: { prof: FavProfessional }) {
  const initials = (prof.full_name ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const avatarUrl = prof.profile_image_url ?? prof.avatar_url

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-primary-300 transition-all flex flex-col gap-3">
      <div className="absolute top-3 right-3">
        <FavoriteButton entityType="professional" entityId={prof.id} />
      </div>

      <Link to={`/dashboard/profissional/${prof.id}`} className="flex items-center gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt={prof.full_name ?? ''} className="w-12 h-12 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <span className="text-primary-700 font-bold">{initials}</span>
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-slate-900 truncate">{prof.full_name ?? '—'}</p>
            {prof.is_verified && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-[10px] font-semibold shrink-0">
                <BadgeCheck size={10} /> Verificado
              </span>
            )}
          </div>
          {prof.review_count > 0 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Stars rating={prof.avg_rating} />
              <span className="text-xs text-slate-400">{prof.avg_rating.toFixed(1)} ({prof.review_count})</span>
            </div>
          )}
        </div>
      </Link>

      {prof.bio && <p className="text-sm text-slate-500 line-clamp-2">{prof.bio}</p>}

      {prof.specialties?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {prof.specialties.slice(0, 3).map((s) => (
            <span key={s} className="px-2 py-0.5 bg-primary-50 text-primary-700 text-[10px] font-medium rounded-full border border-primary-100">
              {s}
            </span>
          ))}
          {prof.specialties.length > 3 && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded-full">
              +{prof.specialties.length - 3}
            </span>
          )}
        </div>
      )}

      {(prof.city || prof.state) && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <MapPin size={11} />
          <span>{[prof.city, prof.state].filter(Boolean).join(', ')}</span>
        </div>
      )}

      <Link
        to={`/dashboard/profissional/${prof.id}`}
        className="mt-auto text-xs font-semibold text-primary-600 hover:underline"
      >
        Ver perfil completo →
      </Link>
    </div>
  )
}

// ─── Supplier Card ────────────────────────────────────────────

interface FavSupplier {
  id: string
  full_name: string | null
  company_name: string | null
  avatar_url: string | null
  profile_image_url: string | null
  bio: string | null
  city: string | null
  state: string | null
  is_verified: boolean
}

function FavSupplierCard({ supplier }: { supplier: FavSupplier }) {
  const displayName = supplier.company_name ?? supplier.full_name ?? 'Fornecedor'
  const avatar = supplier.profile_image_url ?? supplier.avatar_url
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-primary-300 transition-all flex flex-col gap-3">
      <div className="absolute top-3 right-3">
        <FavoriteButton entityType="supplier" entityId={supplier.id} />
      </div>

      <Link to={`/dashboard/fornecedor/${supplier.id}`} className="flex items-center gap-3">
        {avatar ? (
          <img src={avatar} alt={displayName} className="w-12 h-12 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
            <span className="text-primary-700 font-bold text-sm">{initials}</span>
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-slate-900 truncate">{displayName}</p>
            {supplier.is_verified && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-[10px] font-semibold shrink-0">
                <BadgeCheck size={10} /> Verificado
              </span>
            )}
          </div>
          {(supplier.city || supplier.state) && (
            <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
              <MapPin size={10} /> {[supplier.city, supplier.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </Link>

      {supplier.bio && <p className="text-sm text-slate-500 line-clamp-2">{supplier.bio}</p>}

      <Link
        to={`/dashboard/fornecedor/${supplier.id}`}
        className="mt-auto text-xs font-semibold text-primary-600 hover:underline"
      >
        Ver catálogo →
      </Link>
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────

function FavProjectCard({ project }: { project: FavProject }) {
  const statusColor =
    project.status === 'open'      ? 'bg-green-100 text-green-700'   :
    project.status === 'completed' ? 'bg-blue-100 text-blue-700'     :
    'bg-slate-100 text-slate-500'

  const statusLabel: Record<string, string> = {
    open: 'Aberto', in_progress: 'Em andamento', completed: 'Concluído', cancelled: 'Cancelado',
  }

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-primary-300 transition-all flex flex-col gap-3">
      <div className="absolute top-3 right-3">
        <FavoriteButton entityType="project" entityId={project.id} />
      </div>

      <div className="flex items-start justify-between gap-3 pr-8">
        <Link
          to={`/dashboard/projeto/${project.id}`}
          className="font-semibold text-slate-900 text-sm leading-snug hover:text-primary-700 transition-colors"
        >
          {project.title}
        </Link>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
          {statusLabel[project.status] ?? project.status}
        </span>
      </div>

      <p className="text-xs text-slate-500 line-clamp-2">{project.description}</p>

      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 mt-auto">
        {(project.city || project.state) && (
          <span className="flex items-center gap-1">
            <MapPin size={10} /> {[project.city, project.state].filter(Boolean).join('/')}
          </span>
        )}
        <span>{formatBudget(project.budget_min, project.budget_max)}</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

type Tab = 'professionals' | 'projects' | 'suppliers'

export function MyFavoritesPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('professionals')
  const { favoriteIds } = useFavorites()

  const profIds      = favoriteIds('professional')
  const projectIds   = favoriteIds('project')
  const supplierIds  = favoriteIds('supplier')

  const { data: professionals = [], isLoading: loadingProfs } = useQuery({
    queryKey: ['fav-professionals', profIds.join(',')],
    queryFn: async () => {
      if (profIds.length === 0) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, profile_image_url, bio, city, state, user_type, specialties, is_verified')
        .in('id', profIds)
      if (error) throw error

      const profs = (data ?? []) as Omit<FavProfessional, 'avg_rating' | 'review_count'>[]
      const withRatings = await Promise.all(
        profs.map(async (p) => {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('reviewed_id', p.id)
          const count = reviews?.length ?? 0
          const avg = count > 0 ? reviews!.reduce((acc, r) => acc + r.rating, 0) / count : 0
          return { ...p, avg_rating: avg, review_count: count } as FavProfessional
        })
      )
      return withRatings
    },
    enabled: !!user?.id,
  })

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['fav-suppliers', supplierIds.join(',')],
    queryFn: async () => {
      if (supplierIds.length === 0) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, avatar_url, profile_image_url, bio, city, state, is_verified')
        .in('id', supplierIds)
      if (error) throw error
      return (data ?? []) as FavSupplier[]
    },
    enabled: !!user?.id,
  })

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['fav-projects', projectIds.join(',')],
    queryFn: async () => {
      if (projectIds.length === 0) return []
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, description, city, state, budget_min, budget_max, status')
        .in('id', projectIds)
      if (error) throw error
      return (data ?? []) as FavProject[]
    },
    enabled: !!user?.id,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard/home" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus Favoritos</h1>
          <p className="text-sm text-slate-500">Profissionais, fornecedores e projetos salvos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('professionals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'professionals'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <User size={15} />
          Profissionais
          {profIds.length > 0 && (
            <span className="bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
              {profIds.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'suppliers'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Store size={15} />
          Fornecedores
          {supplierIds.length > 0 && (
            <span className="bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
              {supplierIds.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'projects'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Briefcase size={15} />
          Projetos
          {projectIds.length > 0 && (
            <span className="bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
              {projectIds.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'professionals' && (
        loadingProfs ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : professionals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <Heart size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">Nenhum profissional salvo</p>
            <p className="text-sm text-slate-400 mt-1">
              Clique no coração nos cards para salvar profissionais.
            </p>
            <Link
              to="/dashboard/profissionais"
              className="inline-flex items-center gap-2 mt-5 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
              Explorar profissionais
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {professionals.map((p) => (
              <FavProfCard key={p.id} prof={p} />
            ))}
          </div>
        )
      )}

      {activeTab === 'suppliers' && (
        loadingSuppliers ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <Store size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">Nenhum fornecedor salvo</p>
            <p className="text-sm text-slate-400 mt-1">
              Clique no coração nos cards para salvar fornecedores.
            </p>
            <Link
              to="/dashboard/fornecedores"
              className="inline-flex items-center gap-2 mt-5 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
              Explorar fornecedores
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((s) => (
              <FavSupplierCard key={s.id} supplier={s} />
            ))}
          </div>
        )
      )}

      {activeTab === 'projects' && (
        loadingProjects ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <Briefcase size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">Nenhum projeto salvo</p>
            <p className="text-sm text-slate-400 mt-1">
              Clique no coração nos cards para salvar projetos.
            </p>
            <Link
              to="/dashboard/projetos"
              className="inline-flex items-center gap-2 mt-5 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
              Explorar projetos
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <FavProjectCard key={p.id} project={p} />
            ))}
          </div>
        )
      )}
    </div>
  )
}
