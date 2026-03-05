import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin, Star, Globe, Linkedin, Phone, MessageCircle,
  Image as ImageIcon, UserCircle, BadgeCheck, Share2, ChevronLeft,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useSEO } from '@/hooks/useSEO'
import { USER_TYPE_LABELS } from '@/utils/constants'
import type { Profile, PortfolioImage } from '@/types'

// ─── Review type ─────────────────────────────────────────────

interface ReviewFull {
  id: string
  rating: number
  quality_rating: number | null
  communication_rating: number | null
  punctuality_rating: number | null
  professionalism_rating: number | null
  comment: string | null
  created_at: string
  reviewer: { full_name: string | null; email: string }
}

// ─── Sub-rating labels ────────────────────────────────────────

const SUB_LABELS = [
  { label: 'Qualidade',        key: 'quality_rating' as keyof ReviewFull },
  { label: 'Comunicação',      key: 'communication_rating' as keyof ReviewFull },
  { label: 'Pontualidade',     key: 'punctuality_rating' as keyof ReviewFull },
  { label: 'Profissionalismo', key: 'professionalism_rating' as keyof ReviewFull },
]

// ─── Mini stars ───────────────────────────────────────────────

function MiniStars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} className={s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
      ))}
    </div>
  )
}

// ─── Rating Summary ──────────────────────────────────────────

function RatingSummary({ reviews }: { reviews: ReviewFull[] }) {
  const avg  = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  const subAverages = SUB_LABELS.map(({ label, key }) => {
    const values = reviews.map((r) => r[key] as number | null).filter((v): v is number => v !== null)
    return { label, avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null }
  }).filter((s) => s.avg !== null)

  return (
    <div className="bg-slate-50 rounded-xl p-4 mb-5 flex flex-col sm:flex-row gap-5">
      <div className="flex flex-col items-center justify-center sm:border-r sm:border-slate-200 sm:pr-5 shrink-0">
        <span className="text-4xl font-extrabold text-slate-900">{avg.toFixed(1)}</span>
        <div className="my-1"><MiniStars rating={avg} size={13} /></div>
        <span className="text-xs text-slate-400">{reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''}</span>
      </div>

      <div className="flex-1 space-y-1.5 flex flex-col justify-center">
        {dist.map(({ star, count }) => (
          <div key={star} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-3 text-right">{star}</span>
            <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(count / reviews.length) * 100}%` }} />
            </div>
            <span className="text-xs text-slate-400 w-3">{count}</span>
          </div>
        ))}
      </div>

      {subAverages.length > 0 && (
        <div className="sm:border-l sm:border-slate-200 sm:pl-5 space-y-1.5 flex flex-col justify-center shrink-0">
          {subAverages.map(({ label, avg: subAvg }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-28">{label}</span>
              <MiniStars rating={subAvg!} size={10} />
              <span className="text-xs text-slate-600 font-medium">{subAvg!.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>()

  const { data: prof, isLoading } = useQuery({
    queryKey: ['public-profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id!)
        .eq('is_active', true)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!id,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['public-reviews', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, quality_rating, communication_rating, punctuality_rating, professionalism_rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name, email)')
        .eq('reviewed_id', id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ReviewFull[]
    },
    enabled: !!id,
  })

  const { data: portfolio = [] } = useQuery({
    queryKey: ['public-portfolio', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_images')
        .select('*')
        .eq('profile_id', id!)
        .order('display_order', { ascending: true })
      if (error) throw error
      return data as PortfolioImage[]
    },
    enabled: !!id,
  })

  const avgRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: prof?.full_name ?? 'Perfil Visumo', url })
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado!')
    }
  }

  const handleWhatsApp = () => {
    const phone = prof?.phone?.replace(/\D/g, '')
    if (phone) window.open(`https://wa.me/55${phone}`, '_blank')
  }

  useSEO({
    title:       prof?.full_name ?? '',
    description: prof?.bio?.slice(0, 160) ?? undefined,
    image:       (prof?.profile_image_url ?? prof?.avatar_url) ?? undefined,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!prof) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <UserCircle size={48} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-700 mb-1">Perfil não encontrado</p>
          <p className="text-sm text-slate-400 mb-4">Este perfil não existe ou está inativo.</p>
          <Link to="/" className="text-primary-600 text-sm hover:underline">Ir para o Visumo</Link>
        </div>
      </div>
    )
  }

  const initials = (prof.full_name ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <ChevronLeft size={18} className="text-slate-400" />
            <span className="font-bold text-primary-700 tracking-tight text-sm">Visumo</span>
          </Link>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Share2 size={15} /> Compartilhar
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Profile header card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-start gap-5">
            {prof.profile_image_url ? (
              <img
                src={prof.profile_image_url}
                alt={prof.full_name ?? ''}
                className="w-20 h-20 rounded-full object-cover shrink-0 border-4 border-slate-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold shrink-0 border-4 border-slate-100">
                {initials}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xl font-bold text-slate-900">{prof.full_name ?? prof.email}</p>
                {prof.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-xs font-semibold">
                    <BadgeCheck size={12} /> Verificado
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-primary-600 mt-0.5">
                {USER_TYPE_LABELS[prof.user_type]}
              </p>

              {reviews.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <MiniStars rating={avgRating} size={14} />
                  <span className="text-sm text-slate-500">
                    {avgRating.toFixed(1)} ({reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''})
                  </span>
                </div>
              )}

              {(prof.city || prof.state) && (
                <p className="flex items-center gap-1.5 text-sm text-slate-500 mt-2">
                  <MapPin size={13} />
                  {[prof.city, prof.state].filter(Boolean).join(', ')}
                  {prof.coverage_radius_km && (
                    <span className="ml-1 text-primary-500">· atende até {prof.coverage_radius_km} km</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {prof.bio && (
            <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">{prof.bio}</p>
          )}

          {prof.specialties?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Especialidades</p>
              <div className="flex flex-wrap gap-1.5">
                {prof.specialties.map((s) => (
                  <span key={s} className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-3 mt-4">
            {prof.website && (
              <a href={prof.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700">
                <Globe size={14} /> Website
              </a>
            )}
            {prof.linkedin && (
              <a
                href={prof.linkedin.startsWith('http') ? prof.linkedin : `https://${prof.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
              >
                <Linkedin size={14} /> LinkedIn
              </a>
            )}
          </div>

          {/* Contact buttons (public — always visible) */}
          {(prof.phone || prof.email) && (
            <div className="flex gap-3 mt-5 pt-5 border-t border-slate-100">
              {prof.phone && (
                <button
                  onClick={handleWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                >
                  <MessageCircle size={15} /> WhatsApp
                </button>
              )}
              {prof.phone && (
                <a
                  href={`tel:${prof.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  <Phone size={15} /> Ligar
                </a>
              )}
            </div>
          )}
        </div>

        {/* Portfolio */}
        {portfolio.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <ImageIcon size={16} /> Portfólio
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {portfolio.map((img) => (
                <a key={img.id} href={img.image_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={img.image_url}
                    alt={img.title ?? 'Portfolio'}
                    className="w-full aspect-square object-cover rounded-xl border border-slate-100 hover:opacity-90 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Star size={16} className="fill-amber-400 text-amber-400" />
              Avaliações ({reviews.length})
            </h2>

            <RatingSummary reviews={reviews} />

            <div className="space-y-4">
              {reviews.map((r) => {
                const subRatings = SUB_LABELS
                  .map(({ label, key }) => ({ label, value: r[key] as number | null }))
                  .filter((s) => s.value !== null)

                return (
                  <div key={r.id} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-medium text-slate-700">
                        {r.reviewer.full_name ?? r.reviewer.email}
                      </p>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <MiniStars rating={r.rating} size={12} />
                        <span className="text-[10px] text-slate-400">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    {subRatings.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                        {subRatings.map(({ label, value }) => (
                          <div key={label} className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">{label}</span>
                            <MiniStars rating={value!} size={9} />
                          </div>
                        ))}
                      </div>
                    )}
                    {r.comment && <p className="text-sm text-slate-500 leading-relaxed">{r.comment}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA — sign up */}
        <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold text-primary-800 mb-1">Você está no Visumo</p>
          <p className="text-xs text-primary-600 mb-4">
            O marketplace B2B de comunicação visual. Conecte-se com profissionais, empresas e fornecedores.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/cadastro"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
              Criar conta grátis
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-primary-300 text-primary-700 text-sm font-semibold hover:bg-primary-100 transition-colors"
            >
              Já tenho conta
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          <Link to="/" className="hover:text-slate-600">Visumo</Link>
          {' · '}
          <Link to="/termos" className="hover:text-slate-600">Termos</Link>
          {' · '}
          <Link to="/privacidade" className="hover:text-slate-600">Privacidade</Link>
        </p>
      </main>
    </div>
  )
}
