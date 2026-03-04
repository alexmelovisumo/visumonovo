import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, MapPin, Star, UserCircle, ChevronLeft, BadgeCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { USER_TYPE_LABELS, SPECIALTIES } from '@/utils/constants'
import { FavoriteButton } from '@/components/common/FavoriteButton'
import type { Profile } from '@/types'

// ─── Types ────────────────────────────────────────────────────

interface ProfessionalWithRating extends Profile {
  avg_rating: number
  review_count: number
}

// ─── Fetch ────────────────────────────────────────────────────

async function fetchProfessionals(): Promise<ProfessionalWithRating[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('user_type', ['profissional', 'empresa_prestadora'])
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error) throw error

  const profiles = (data ?? []) as Profile[]

  // Buscar médias de avaliação em paralelo
  const withRatings = await Promise.all(
    profiles.map(async (p) => {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', p.id)

      const count = reviews?.length ?? 0
      const avg = count > 0
        ? (reviews!.reduce((acc, r) => acc + r.rating, 0) / count)
        : 0

      return { ...p, avg_rating: avg, review_count: count } as ProfessionalWithRating
    })
  )

  return withRatings
}

// ─── Star display ────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={13}
          className={s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
        />
      ))}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────

function ProfessionalCard({ prof }: { prof: ProfessionalWithRating }) {
  const initials = (prof.full_name ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Link
      to={`/dashboard/profissional/${prof.id}`}
      className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-primary-300 transition-all flex flex-col gap-3 relative"
    >
      <div className="absolute top-3 right-3">
        <FavoriteButton entityType="professional" entityId={prof.id} />
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-3">
        {prof.profile_image_url ? (
          <img
            src={prof.profile_image_url}
            alt={prof.full_name ?? ''}
            className="w-14 h-14 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <span className="text-primary-700 font-bold text-lg">{initials}</span>
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
          <p className="text-xs text-primary-600 font-medium">
            {USER_TYPE_LABELS[prof.user_type]}
          </p>
          {prof.review_count > 0 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Stars rating={prof.avg_rating} />
              <span className="text-xs text-slate-500">
                {prof.avg_rating.toFixed(1)} ({prof.review_count})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {prof.bio && (
        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{prof.bio}</p>
      )}

      {/* Location */}
      {(prof.city || prof.state) && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <MapPin size={12} />
          <span>{[prof.city, prof.state].filter(Boolean).join(', ')}</span>
          {prof.coverage_radius_km && (
            <span className="ml-1 text-primary-500">· até {prof.coverage_radius_km} km</span>
          )}
        </div>
      )}

      {/* Specialties */}
      {prof.specialties?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {prof.specialties.slice(0, 4).map((s) => (
            <span key={s} className="px-2 py-0.5 bg-primary-50 text-primary-700 text-[10px] font-medium rounded-full border border-primary-100">
              {s}
            </span>
          ))}
          {prof.specialties.length > 4 && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded-full">
              +{prof.specialties.length - 4}
            </span>
          )}
        </div>
      )}

      <span className="mt-auto text-xs font-semibold text-primary-600 self-start">
        Ver perfil completo →
      </span>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────

const PAGE_SIZE = 12

const ESTADOS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

export function ProfessionalsListPage() {
  const [search, setSearch] = useState('')
  const [filterState, setFilterState] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE)

  useEffect(() => { setDisplayLimit(PAGE_SIZE) }, [search, filterState, filterType, filterSpecialty, onlyVerified])

  const { data: professionals = [], isLoading } = useQuery({
    queryKey: ['professionals-list'],
    queryFn: fetchProfessionals,
  })

  const filtered = professionals.filter((p) => {
    const term = search.toLowerCase()
    const matchesSearch =
      !search ||
      (p.full_name ?? '').toLowerCase().includes(term) ||
      (p.bio ?? '').toLowerCase().includes(term) ||
      (p.city ?? '').toLowerCase().includes(term)

    const matchesState     = !filterState     || p.state === filterState
    const matchesType      = !filterType      || p.user_type === filterType
    const matchesSpecialty = !filterSpecialty || (p.specialties ?? []).includes(filterSpecialty)
    const matchesVerified  = !onlyVerified    || p.is_verified

    return matchesSearch && matchesState && matchesType && matchesSpecialty && matchesVerified
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/home"
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profissionais</h1>
          <p className="text-sm text-slate-500">Encontre profissionais para seus projetos</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, especialidade ou cidade..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
          />
        </div>
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
        >
          <option value="">Todos os estados</option>
          {ESTADOS.map((uf) => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
        >
          <option value="">Todos os tipos</option>
          <option value="profissional">Profissional</option>
          <option value="empresa_prestadora">Empresa Prestadora</option>
        </select>
        <select
          value={filterSpecialty}
          onChange={(e) => setFilterSpecialty(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
        >
          <option value="">Todas especialidades</option>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => setOnlyVerified((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all shrink-0 ${
            onlyVerified
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          <BadgeCheck size={15} />
          Verificados
        </button>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <UserCircle size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-600">Nenhum profissional encontrado</p>
          <p className="text-sm text-slate-400 mt-1">Tente ajustar os filtros</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-400">{filtered.length} profissional{filtered.length !== 1 ? 'is' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, displayLimit).map((p) => (
              <ProfessionalCard key={p.id} prof={p} />
            ))}
          </div>
          {filtered.length > displayLimit && (
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
