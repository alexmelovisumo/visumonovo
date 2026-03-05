import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin, Phone, Globe, Linkedin, MessageCircle, Share2,
  BadgeCheck, Building2, ImageIcon, Star, FolderOpen,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useSEO } from '@/hooks/useSEO'
import { USER_TYPE_LABELS } from '@/utils/constants'
import type { PortfolioImage } from '@/types'

// ─── Types ────────────────────────────────────────────────────

interface CompanyProfile {
  id: string
  full_name: string | null
  profile_image_url: string | null
  avatar_url: string | null
  bio: string | null
  city: string | null
  state: string | null
  phone: string | null
  website: string | null
  linkedin: string | null
  company_name: string | null
  user_type: string
  is_verified: boolean
  is_active: boolean
}

interface ReviewItem {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer: { full_name: string | null; email: string }
}

interface ProjectItem {
  id: string
  title: string
  description: string | null
  category: string | null
  budget_min: number | null
  budget_max: number | null
}

// ─── Mini stars ───────────────────────────────────────────────

function MiniStars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
        />
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function PublicCompanyPage() {
  const { id } = useParams<{ id: string }>()

  const { data: company, isLoading, isError } = useQuery({
    queryKey: ['public-company', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, profile_image_url, avatar_url, bio, city, state, phone, website, linkedin, company_name, user_type, is_verified, is_active')
        .eq('id', id!)
        .in('user_type', ['empresa', 'empresa_prestadora', 'fornecedor_empresa'])
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data as CompanyProfile | null
    },
    enabled: !!id,
  })

  const isPrestadora = company?.user_type === 'empresa_prestadora'

  const { data: portfolio = [] } = useQuery({
    queryKey: ['public-company-portfolio', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_images')
        .select('*')
        .eq('profile_id', id!)
        .order('display_order', { ascending: true })
      if (error) throw error
      return data as PortfolioImage[]
    },
    enabled: !!id && isPrestadora,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['public-company-reviews', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name, email)')
        .eq('reviewed_id', id!)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data ?? []) as unknown as ReviewItem[]
    },
    enabled: !!id,
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['public-company-projects', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, description, category, budget_min, budget_max')
        .eq('client_id', id!)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(6)
      if (error) throw error
      return (data ?? []) as ProjectItem[]
    },
    enabled: !!id,
  })

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: company?.company_name ?? company?.full_name ?? 'Empresa Visumo', url })
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado!')
    }
  }

  useSEO({
    title:       company?.company_name ?? company?.full_name ?? '',
    description: company?.bio?.slice(0, 160) ?? undefined,
    image:       (company?.profile_image_url ?? company?.avatar_url) ?? undefined,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !company) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-center px-4">
        <Building2 size={40} className="text-slate-300" />
        <h1 className="text-xl font-bold text-slate-700">Empresa não encontrada</h1>
        <p className="text-slate-400 text-sm">Este perfil não existe ou não está mais disponível.</p>
        <Link to="/" className="text-primary-600 hover:underline text-sm">Voltar ao início</Link>
      </div>
    )
  }

  const displayName = company.company_name ?? company.full_name ?? 'Empresa'
  const avatar      = company.profile_image_url ?? company.avatar_url
  const initials    = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const whatsapp    = company.phone?.replace(/\D/g, '')
  const avgRating   = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

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

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-start gap-5">
            {avatar ? (
              <img src={avatar} alt={displayName} className="w-20 h-20 rounded-2xl object-cover shrink-0 border-4 border-slate-100" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center shrink-0 border-4 border-slate-100">
                <span className="text-primary-700 text-2xl font-bold">{initials}</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{displayName}</h1>
                {company.is_verified && (
                  <BadgeCheck size={18} className="text-blue-500 shrink-0" />
                )}
              </div>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-700 mt-1 inline-block">
                {USER_TYPE_LABELS[company.user_type as keyof typeof USER_TYPE_LABELS] ?? 'Empresa'}
              </span>

              {reviews.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <MiniStars rating={avgRating} size={13} />
                  <span className="text-xs text-slate-500">
                    {avgRating.toFixed(1)} ({reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''})
                  </span>
                </div>
              )}

              {(company.city || company.state) && (
                <p className="flex items-center gap-1 text-xs text-slate-500 mt-2">
                  <MapPin size={12} /> {[company.city, company.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          {company.bio && (
            <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">{company.bio}</p>
          )}

          {/* External links */}
          <div className="flex flex-wrap gap-4 mt-4">
            {company.website && (
              <a
                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
              >
                <Globe size={14} /> Website
              </a>
            )}
            {company.linkedin && (
              <a
                href={company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
              >
                <Linkedin size={14} /> LinkedIn
              </a>
            )}
          </div>

          {/* Contact buttons */}
          {(whatsapp || company.phone) && (
            <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-slate-100">
              {whatsapp && (
                <a
                  href={`https://wa.me/55${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                >
                  <MessageCircle size={15} /> WhatsApp
                </a>
              )}
              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Phone size={15} /> Ligar
                </a>
              )}
            </div>
          )}
        </div>

        {/* Portfolio (empresa_prestadora only) */}
        {isPrestadora && portfolio.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <ImageIcon size={16} className="text-primary-500" /> Portfólio
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

        {/* Open projects */}
        {projects.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FolderOpen size={16} className="text-primary-500" /> Projetos abertos ({projects.length})
            </h2>
            <div className="space-y-3">
              {projects.map((p) => (
                <div key={p.id} className="border border-slate-100 rounded-xl p-4 space-y-1">
                  <p className="text-sm font-semibold text-slate-800">{p.title}</p>
                  {p.category && (
                    <span className="inline-block text-[10px] px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full">
                      {p.category}
                    </span>
                  )}
                  {p.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>
                  )}
                  {(p.budget_min || p.budget_max) && (
                    <p className="text-xs text-slate-400">
                      Orçamento:{' '}
                      {p.budget_min && p.budget_max
                        ? `${p.budget_min.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} – ${p.budget_max.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                        : (p.budget_min ?? p.budget_max)!.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Star size={16} className="fill-amber-400 text-amber-400" /> Avaliações ({reviews.length})
            </h2>
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-slate-700">
                      {r.reviewer.full_name ?? r.reviewer.email}
                    </p>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <MiniStars rating={r.rating} size={11} />
                      <span className="text-[10px] text-slate-400">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  {r.comment && <p className="text-xs text-slate-500 leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl p-6 text-center space-y-4 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
          <p className="font-bold text-lg">Quer fazer parte do Visumo?</p>
          <p className="text-primary-200 text-sm">
            Conecte-se com empresas, profissionais e fornecedores do mercado de comunicação visual.
          </p>
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

        <p className="text-center text-xs text-slate-400 pb-4">
          <Link to="/" className="hover:text-slate-600">Visumo</Link>
          {' · '}
          <Link to="/termos" className="hover:text-slate-600">Termos</Link>
          {' · '}
          <Link to="/privacidade" className="hover:text-slate-600">Privacidade</Link>
        </p>

      </div>
    </div>
  )
}
