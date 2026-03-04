import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search, FolderOpen, Users, Package,
  MapPin, DollarSign, BadgeCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────

interface ProjectResult {
  id: string
  title: string
  description: string
  city: string | null
  state: string | null
  budget_min: number | null
  budget_max: number | null
}

interface ProfessionalResult {
  id: string
  full_name: string | null
  email: string
  bio: string | null
  city: string | null
  state: string | null
  user_type: string
  is_verified: boolean
  profile_image_url: string | null
}

interface ProductResult {
  id: string
  title: string
  description: string | null
  category: string | null
  supplier_id: string
}

// ─── Helpers ──────────────────────────────────────────────────

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return null
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `A partir de ${fmt(min)}`
  return `Até ${fmt(max!)}`
}

async function runSearch(q: string) {
  const term = `%${q}%`

  const [projects, professionals, products] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, description, city, state, budget_min, budget_max')
      .ilike('title', term)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('profiles')
      .select('id, full_name, email, bio, city, state, user_type, is_verified, profile_image_url')
      .or(`full_name.ilike.${term},bio.ilike.${term}`)
      .in('user_type', ['profissional', 'empresa_prestadora'])
      .eq('is_active', true)
      .limit(20),

    supabase
      .from('products')
      .select('id, title, description, category, supplier_id')
      .ilike('title', term)
      .eq('is_active', true)
      .limit(20),
  ])

  return {
    projects:      (projects.data      ?? []) as ProjectResult[],
    professionals: (professionals.data ?? []) as ProfessionalResult[],
    products:      (products.data      ?? []) as ProductResult[],
  }
}

// ─── Section Header ───────────────────────────────────────────

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="font-semibold text-slate-800">{title}</h2>
      <span className="text-xs text-slate-400 font-normal">({count})</span>
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────

function ProjectCard({ p }: { p: ProjectResult }) {
  const budget = formatBudget(p.budget_min, p.budget_max)
  return (
    <Link
      to={`/dashboard/projeto/${p.id}`}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all block"
    >
      <p className="font-semibold text-slate-900 text-sm leading-snug mb-1 line-clamp-1">{p.title}</p>
      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{p.description}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
        {(p.city || p.state) && (
          <span className="flex items-center gap-1"><MapPin size={10} />{[p.city, p.state].filter(Boolean).join('/')}</span>
        )}
        {budget && <span className="flex items-center gap-1 text-primary-600 font-medium"><DollarSign size={10} />{budget}</span>}
      </div>
    </Link>
  )
}

// ─── Professional Card ────────────────────────────────────────

function ProfCard({ p }: { p: ProfessionalResult }) {
  const initials = (p.full_name ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link
      to={`/dashboard/profissional/${p.id}`}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all flex items-center gap-3"
    >
      {p.profile_image_url ? (
        <img src={p.profile_image_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold shrink-0">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-semibold text-slate-900 text-sm truncate">{p.full_name ?? p.email}</p>
          {p.is_verified && <BadgeCheck size={13} className="text-blue-500 shrink-0" />}
        </div>
        {(p.city || p.state) && (
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin size={9} />{[p.city, p.state].filter(Boolean).join(', ')}
          </p>
        )}
        {p.bio && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{p.bio}</p>}
      </div>
    </Link>
  )
}

// ─── Product Card ─────────────────────────────────────────────

function ProductCard({ p }: { p: ProductResult }) {
  return (
    <Link
      to={`/dashboard/fornecedores`}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all block"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
          <Package size={16} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{p.title}</p>
          {p.category && <p className="text-xs text-slate-400 mt-0.5">{p.category}</p>}
          {p.description && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{p.description}</p>}
        </div>
      </div>
    </Link>
  )
}

// ─── Empty group ──────────────────────────────────────────────

function EmptyGroup({ label }: { label: string }) {
  return (
    <p className="text-sm text-slate-400 text-center py-6 col-span-full">
      Nenhum {label} encontrado para esta busca.
    </p>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()

  const { data, isLoading } = useQuery({
    queryKey: ['full-search', q],
    queryFn:  () => runSearch(q),
    enabled:  q.length >= 2,
    staleTime: 15_000,
  })

  const total = (data?.projects.length ?? 0) + (data?.professionals.length ?? 0) + (data?.products.length ?? 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Search size={20} className="text-primary-500" />
          <h1 className="text-2xl font-bold text-slate-900">
            {q ? `Resultados para "${q}"` : 'Busca global'}
          </h1>
        </div>
        <p className="text-sm text-slate-500">
          {isLoading
            ? 'Buscando...'
            : q.length < 2
              ? 'Digite pelo menos 2 caracteres para buscar.'
              : `${total} resultado${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && data && (
        <>
          {/* Projects */}
          <section>
            <SectionHeader
              icon={<FolderOpen size={16} className="text-primary-600" />}
              title="Projetos abertos"
              count={data.projects.length}
            />
            {data.projects.length === 0 ? (
              <EmptyGroup label="projeto" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.projects.map((p) => <ProjectCard key={p.id} p={p} />)}
              </div>
            )}
          </section>

          {/* Professionals */}
          <section>
            <SectionHeader
              icon={<Users size={16} className="text-green-600" />}
              title="Profissionais"
              count={data.professionals.length}
            />
            {data.professionals.length === 0 ? (
              <EmptyGroup label="profissional" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.professionals.map((p) => <ProfCard key={p.id} p={p} />)}
              </div>
            )}
          </section>

          {/* Products */}
          <section>
            <SectionHeader
              icon={<Package size={16} className="text-amber-600" />}
              title="Produtos / Fornecedores"
              count={data.products.length}
            />
            {data.products.length === 0 ? (
              <EmptyGroup label="produto" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.products.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
