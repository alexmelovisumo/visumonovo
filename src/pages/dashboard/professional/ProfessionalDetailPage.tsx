import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, MapPin, Star, Globe, Linkedin, Phone,
  MessageCircle, Image as ImageIcon, UserCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { USER_TYPE_LABELS } from '@/utils/constants'
import type { Profile, PortfolioImage } from '@/types'

// ─── Stars ───────────────────────────────────────────────────

function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={16}
          className={s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
        />
      ))}
      <span className="text-sm text-slate-500 ml-1">
        {rating.toFixed(1)} ({count} avaliação{count !== 1 ? 'ões' : ''})
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function ProfessionalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile: myProfile } = useAuthStore()

  // Fetch professional profile
  const { data: prof, isLoading } = useQuery({
    queryKey: ['professional-profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!id,
  })

  // Fetch reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ['professional-reviews', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, email)')
        .eq('reviewed_id', id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as { id: string; rating: number; comment: string | null; created_at: string; reviewer: { full_name: string | null; email: string } }[]
    },
    enabled: !!id,
  })

  // Fetch portfolio images
  const { data: portfolio = [] } = useQuery({
    queryKey: ['portfolio', id],
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

  const handleWhatsApp = () => {
    const phone = prof?.phone?.replace(/\D/g, '')
    if (phone) window.open(`https://wa.me/55${phone}`, '_blank')
  }

  const canContact = user && myProfile?.user_type !== 'profissional' && myProfile?.user_type !== 'empresa_prestadora'

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!prof) {
    return (
      <div className="text-center py-20">
        <UserCircle size={40} className="text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500">Profissional não encontrado.</p>
        <button
          onClick={() => navigate(-1)}
          className="text-primary-600 text-sm mt-2 block mx-auto"
        >
          Voltar
        </button>
      </div>
    )
  }

  const initials = (prof.full_name ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ChevronLeft size={16} /> Voltar
      </button>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
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
            <p className="text-xl font-bold text-slate-900">{prof.full_name ?? prof.email}</p>
            <p className="text-sm font-medium text-primary-600 mt-0.5">
              {USER_TYPE_LABELS[prof.user_type]}
            </p>

            {reviews.length > 0 && (
              <div className="mt-2">
                <Stars rating={avgRating} count={reviews.length} />
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

        {/* Bio */}
        {prof.bio && (
          <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
            {prof.bio}
          </p>
        )}

        {/* Links */}
        <div className="flex flex-wrap gap-3 mt-4">
          {prof.website && (
            <a
              href={prof.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
            >
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

        {/* Contact buttons */}
        {canContact && (
          <div className="flex gap-3 mt-5 pt-5 border-t border-slate-100">
            {prof.phone && (
              <Button
                onClick={handleWhatsApp}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <MessageCircle size={15} /> WhatsApp
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (prof.phone) {
                  handleWhatsApp()
                } else if (prof.email) {
                  window.location.href = `mailto:${prof.email}`
                }
              }}
            >
              <Phone size={15} /> Contato
            </Button>
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
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-700">
                    {r.reviewer.full_name ?? r.reviewer.email}
                  </p>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={12}
                        className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                      />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p className="text-sm text-slate-500 leading-relaxed">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {reviews.length === 0 && portfolio.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-400">Este profissional ainda não tem avaliações ou portfólio.</p>
        </div>
      )}

      <div className="pb-4">
        <Link
          to="/dashboard/profissionais"
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <ChevronLeft size={14} /> Ver todos os profissionais
        </Link>
      </div>
    </div>
  )
}
