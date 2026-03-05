import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Star, BadgeCheck, Crown, ChevronLeft, UserCircle, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────

interface RankedProfile {
  id: string
  full_name: string | null
  email: string
  profile_image_url: string | null
  city: string | null
  state: string | null
  is_verified: boolean
  is_featured: boolean
  is_available: boolean
  avg_rating: number
  review_count: number
}

interface RankedSupplier {
  id: string
  full_name: string | null
  email: string
  profile_image_url: string | null
  city: string | null
  state: string | null
  is_verified: boolean
  is_featured: boolean
  avg_rating: number
  review_count: number
}

// ─── Medal ────────────────────────────────────────────────────

function Medal({ position }: { position: number }) {
  if (position === 1) return <span className="text-amber-400 font-black text-lg">1°</span>
  if (position === 2) return <span className="text-slate-400 font-black text-lg">2°</span>
  if (position === 3) return <span className="text-amber-700 font-black text-lg">3°</span>
  return <span className="text-slate-400 font-semibold text-base">{position}°</span>
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      <Star size={12} className="fill-amber-400 text-amber-400" />
      <span className="text-xs font-semibold text-slate-700">{rating.toFixed(1)}</span>
    </span>
  )
}

// ─── Row ──────────────────────────────────────────────────────

function ProfRow({ prof, position }: { prof: RankedProfile; position: number }) {
  const name = prof.full_name ?? prof.email
  const initials = name.charAt(0).toUpperCase()
  const isTop3 = position <= 3

  return (
    <Link
      to={`/dashboard/profissional/${prof.id}`}
      className={cn(
        'flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-md',
        isTop3 ? 'bg-amber-50 border-amber-200 hover:border-amber-300' : 'bg-white border-slate-200 hover:border-primary-300'
      )}
    >
      <div className="w-8 text-center shrink-0">
        <Medal position={position} />
      </div>
      <div className="shrink-0">
        {prof.profile_image_url ? (
          <img src={prof.profile_image_url} alt={name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
            {initials}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
          {prof.is_verified && <BadgeCheck size={13} className="text-blue-500 shrink-0" />}
          {prof.is_featured && <Crown size={13} className="text-amber-500 shrink-0" />}
          {!prof.is_available && (
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium">Ocupado</span>
          )}
        </div>
        {(prof.city || prof.state) && (
          <p className="text-xs text-slate-400 truncate">{[prof.city, prof.state].filter(Boolean).join(', ')}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <Stars rating={prof.avg_rating} />
        <p className="text-[10px] text-slate-400 mt-0.5">{prof.review_count} avaliação{prof.review_count !== 1 ? 'ões' : ''}</p>
      </div>
    </Link>
  )
}

function SupplierRow({ supplier, position }: { supplier: RankedSupplier; position: number }) {
  const name = supplier.full_name ?? supplier.email
  const initials = name.charAt(0).toUpperCase()
  const isTop3 = position <= 3

  return (
    <Link
      to={`/dashboard/fornecedor/${supplier.id}`}
      className={cn(
        'flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-md',
        isTop3 ? 'bg-amber-50 border-amber-200 hover:border-amber-300' : 'bg-white border-slate-200 hover:border-primary-300'
      )}
    >
      <div className="w-8 text-center shrink-0">
        <Medal position={position} />
      </div>
      <div className="shrink-0">
        {supplier.profile_image_url ? (
          <img src={supplier.profile_image_url} alt={name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-sm">
            {initials}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
          {supplier.is_verified && <BadgeCheck size={13} className="text-blue-500 shrink-0" />}
          {supplier.is_featured && <Crown size={13} className="text-amber-500 shrink-0" />}
        </div>
        {(supplier.city || supplier.state) && (
          <p className="text-xs text-slate-400 truncate">{[supplier.city, supplier.state].filter(Boolean).join(', ')}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <Stars rating={supplier.avg_rating} />
        <p className="text-[10px] text-slate-400 mt-0.5">{supplier.review_count} avaliação{supplier.review_count !== 1 ? 'ões' : ''}</p>
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function RankingPage() {
  const { data: professionals = [], isLoading: loadingProfs } = useQuery({
    queryKey: ['ranking-professionals'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_image_url, city, state, is_verified, is_featured, is_available')
        .in('user_type', ['profissional', 'empresa_prestadora'])
        .eq('is_active', true)

      const withRatings = await Promise.all(
        (profiles ?? []).map(async (p) => {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('reviewed_id', p.id)
          const count = reviews?.length ?? 0
          const avg = count > 0 ? reviews!.reduce((s, r) => s + r.rating, 0) / count : 0
          return { ...p, avg_rating: avg, review_count: count } as RankedProfile
        })
      )

      return withRatings
        .filter((p) => p.review_count > 0)
        .sort((a, b) => b.avg_rating - a.avg_rating || b.review_count - a.review_count)
        .slice(0, 15)
    },
    staleTime: 5 * 60_000,
  })

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['ranking-suppliers'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_image_url, city, state, is_verified, is_featured')
        .in('user_type', ['fornecedor', 'fornecedor_empresa'])
        .eq('is_active', true)

      const withRatings = await Promise.all(
        (profiles ?? []).map(async (p) => {
          const { data: reviews } = await supabase
            .from('supplier_reviews')
            .select('rating')
            .eq('supplier_id', p.id)
          const count = reviews?.length ?? 0
          const avg = count > 0 ? reviews!.reduce((s, r) => s + r.rating, 0) / count : 0
          return { ...p, avg_rating: avg, review_count: count } as RankedSupplier
        })
      )

      return withRatings
        .filter((s) => s.review_count > 0)
        .sort((a, b) => b.avg_rating - a.avg_rating || b.review_count - a.review_count)
        .slice(0, 15)
    },
    staleTime: 5 * 60_000,
  })

  const isLoading = loadingProfs || loadingSuppliers

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard/home" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy size={22} className="text-amber-500" />
            Ranking
          </h1>
          <p className="text-sm text-slate-500">Os mais bem avaliados da plataforma</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Professionals */}
          <section className="space-y-3">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <UserCircle size={16} className="text-primary-500" />
              Top Profissionais
            </h2>
            {professionals.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Nenhuma avaliação registrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {professionals.map((p, i) => (
                  <ProfRow key={p.id} prof={p} position={i + 1} />
                ))}
              </div>
            )}
          </section>

          {/* Suppliers */}
          <section className="space-y-3">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <Package size={16} className="text-green-500" />
              Top Fornecedores
            </h2>
            {suppliers.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Nenhuma avaliação registrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {suppliers.map((s, i) => (
                  <SupplierRow key={s.id} supplier={s} position={i + 1} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
