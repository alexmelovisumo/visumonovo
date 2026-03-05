import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  ChevronLeft, MapPin, Star, Globe, Linkedin, Phone,
  MessageCircle, Image as ImageIcon, UserCircle, BadgeCheck, Share2,
  Mail, FolderOpen, X,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { USER_TYPE_LABELS } from '@/utils/constants'
import type { Profile, PortfolioImage } from '@/types'

// ─── Invite Modal ─────────────────────────────────────────────

function InviteModal({
  professionalId,
  professionalName,
  senderId,
  onClose,
}: {
  professionalId: string
  professionalName: string
  senderId: string
  onClose: () => void
}) {
  const [selectedProject, setSelectedProject] = useState('')
  const [message, setMessage] = useState('')

  const { data: myProjects = [] } = useQuery({
    queryKey: ['my-open-projects', senderId],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, title')
        .eq('client_id', senderId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
      return (data ?? []) as { id: string; title: string }[]
    },
  })

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('project_invitations').insert({
        project_id:   selectedProject,
        sender_id:    senderId,
        recipient_id: professionalId,
        message:      message.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Convite enviado!')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? ''
      toast.error(msg.includes('unique') ? 'Você já convidou este profissional para esse projeto.' : 'Erro ao enviar convite.')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Convidar para projeto</h3>
            <p className="text-xs text-slate-500 mt-0.5">{professionalName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Selecionar projeto *</label>
            {myProjects.length === 0 ? (
              <p className="text-sm text-slate-400">Você não tem projetos abertos no momento.</p>
            ) : (
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">Escolha um projeto...</option>
                {myProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Mensagem <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Descreva brevemente por que você quer convidá-lo..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button
            className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            onClick={onClose}
          >
            Cancelar
          </button>
          <Button
            className="flex-1"
            disabled={!selectedProject || myProjects.length === 0}
            isLoading={send.isPending}
            onClick={() => send.mutate()}
          >
            <Mail size={14} /> Enviar convite
          </Button>
        </div>
      </div>
    </div>
  )
}

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

// ─── Rating Summary ──────────────────────────────────────────

const SUB_RATING_LABELS: { label: string; key: keyof ReviewFull }[] = [
  { label: 'Qualidade',        key: 'quality_rating' },
  { label: 'Comunicação',      key: 'communication_rating' },
  { label: 'Pontualidade',     key: 'punctuality_rating' },
  { label: 'Profissionalismo', key: 'professionalism_rating' },
]

function RatingSummary({ reviews }: { reviews: ReviewFull[] }) {
  const avg  = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  const subAverages = SUB_RATING_LABELS.map(({ label, key }) => {
    const values = reviews.map((r) => r[key] as number | null).filter((v): v is number => v !== null)
    return { label, avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null }
  }).filter((s) => s.avg !== null)

  return (
    <div className="bg-slate-50 rounded-xl p-4 mb-5 flex flex-col sm:flex-row gap-5">
      {/* Big avg */}
      <div className="flex flex-col items-center justify-center sm:border-r sm:border-slate-200 sm:pr-5 shrink-0">
        <span className="text-4xl font-extrabold text-slate-900">{avg.toFixed(1)}</span>
        <div className="flex gap-0.5 my-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} size={13} className={s <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
          ))}
        </div>
        <span className="text-xs text-slate-400">{reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''}</span>
      </div>

      {/* Distribution bars */}
      <div className="flex-1 space-y-1.5 justify-center flex flex-col">
        {dist.map(({ star, count }) => (
          <div key={star} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-3 text-right">{star}</span>
            <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${(count / reviews.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 w-3">{count}</span>
          </div>
        ))}
      </div>

      {/* Sub-rating averages */}
      {subAverages.length > 0 && (
        <div className="sm:border-l sm:border-slate-200 sm:pl-5 space-y-1.5 flex flex-col justify-center shrink-0">
          {subAverages.map(({ label, avg: subAvg }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-28">{label}</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={10} className={s <= Math.round(subAvg!) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                ))}
              </div>
              <span className="text-xs text-slate-600 font-medium">{subAvg!.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function ProfessionalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile: myProfile } = useAuthStore()
  const [showInviteModal, setShowInviteModal] = useState(false)

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
        .select('id, rating, quality_rating, communication_rating, punctuality_rating, professionalism_rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name, email)')
        .eq('reviewed_id', id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as ReviewFull[]
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

  // Fetch completed projects
  const { data: completions = [] } = useQuery({
    queryKey: ['professional-completions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_completions')
        .select('project_id, completed_at, project:projects(id, title, city, state)')
        .eq('professional_id', id!)
        .order('completed_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return (data ?? []) as unknown as { project_id: string; completed_at: string; project: { id: string; title: string; city: string | null; state: string | null } | null }[]
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
  const canInvite  = user && (myProfile?.user_type === 'empresa' || myProfile?.user_type === 'empresa_prestadora' || myProfile?.user_type === 'fornecedor_empresa') && id !== user.id

  const handleShare = async () => {
    const url = `${window.location.origin}/profissional/${id}`
    if (navigator.share) {
      await navigator.share({ title: prof?.full_name ?? 'Perfil Visumo', url })
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado!')
    }
  }

  // Register profile view (skip own profile)
  useEffect(() => {
    if (prof && user && prof.id !== user.id) {
      supabase.from('profile_views').insert({ profile_id: prof.id, viewer_id: user.id })
    }
  }, [prof?.id, user?.id])

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
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft size={16} /> Voltar
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Share2 size={14} /> Compartilhar perfil
        </button>
      </div>

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
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xl font-bold text-slate-900">{prof.full_name ?? prof.email}</p>
              {prof.is_verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-xs font-semibold">
                  <BadgeCheck size={12} /> Verificado
                </span>
              )}
              {prof.is_available === false && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-full text-xs font-semibold">
                  Ocupado
                </span>
              )}
              {prof.is_available !== false && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 border border-green-200 rounded-full text-xs font-semibold">
                  Disponível
                </span>
              )}
            </div>
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

        {/* Specialties */}
        {prof.specialties?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Especialidades</p>
            <div className="flex flex-wrap gap-1.5">
              {prof.specialties.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-100"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
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

        {/* Contact + Invite buttons */}
        {(canContact || canInvite) && (
          <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-slate-100">
            {canContact && prof.phone && (
              <Button
                onClick={handleWhatsApp}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <MessageCircle size={15} /> WhatsApp
              </Button>
            )}
            {canContact && (
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
            )}
            {canInvite && (
              <Button
                variant="outline"
                className="flex-1 border-primary-300 text-primary-600 hover:bg-primary-50"
                onClick={() => setShowInviteModal(true)}
              >
                <FolderOpen size={15} /> Convidar para projeto
              </Button>
            )}
          </div>
        )}

        {showInviteModal && user && (
          <InviteModal
            professionalId={id!}
            professionalName={prof.full_name ?? prof.email}
            senderId={user.id}
            onClose={() => setShowInviteModal(false)}
          />
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
              const subRatings = SUB_RATING_LABELS
                .map(({ label, key }) => ({ label, value: r[key] as number | null }))
                .filter((s) => s.value !== null)

              return (
                <div key={r.id} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                  {/* Reviewer name + stars + date */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium text-slate-700">
                      {r.reviewer.full_name ?? r.reviewer.email}
                    </p>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  {/* Sub-ratings (if any) */}
                  {subRatings.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                      {subRatings.map(({ label, value }) => (
                        <div key={label} className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">{label}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} size={9} className={s <= value! ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {r.comment && (
                    <p className="text-sm text-slate-500 leading-relaxed">{r.comment}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {reviews.length === 0 && portfolio.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-400">Este profissional ainda não tem avaliações ou portfólio.</p>
        </div>
      )}

      {/* Completed projects */}
      {completions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FolderOpen size={16} className="text-primary-500" />
            Projetos concluídos ({completions.length})
          </h2>
          <div className="space-y-3">
            {completions.map((c) => (
              c.project && (
                <div key={c.project_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.project.title}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      {(c.project.city || c.project.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />{[c.project.city, c.project.state].filter(Boolean).join('/')}
                        </span>
                      )}
                      <span>
                        {format(new Date(c.completed_at), "MMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full shrink-0">
                    Concluído
                  </span>
                </div>
              )
            ))}
          </div>
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
