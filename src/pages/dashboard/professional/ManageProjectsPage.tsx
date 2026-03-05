import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase, MapPin, Calendar, DollarSign, ArrowRight,
  MessageCircle, CheckCircle2, AlertTriangle, Clock,
  Star, X, ListChecks,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Proposal, Project } from '@/types'

// ─── Types ────────────────────────────────────────────────────

type CompanyInfo = { id: string; full_name: string | null; company_name: string | null }
type ProposalWithClient = Proposal & { project: Project & { client: CompanyInfo | null } }

// ─── Write Company Review Modal ───────────────────────────────

function WriteCompanyReviewModal({
  projectId,
  companyId,
  companyName,
  onClose,
  onDone,
}: {
  projectId: string
  companyId: string
  companyName: string
  onClose: () => void
  onDone: () => void
}) {
  const { user } = useAuthStore()
  const [rating, setRating]   = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')

  const submit = useMutation({
    mutationFn: async () => {
      if (!rating) throw new Error('Selecione uma nota')
      const { error } = await supabase.from('reviews').insert({
        reviewer_id: user!.id,
        reviewed_id: companyId,
        project_id:  projectId,
        rating,
        comment: comment.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Avaliação enviada!')
      onDone()
    },
    onError: (e: unknown) => {
      const msg = (e as { message?: string })?.message ?? 'Erro ao enviar avaliação'
      toast.error(msg)
    },
  })

  const LABELS = ['', 'Muito ruim', 'Ruim', 'Regular', 'Bom', 'Excelente']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Avaliar empresa</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-500">
          Como foi trabalhar com <span className="font-medium text-slate-700">{companyName}</span>?
        </p>

        {/* Star picker */}
        <div className="flex gap-1 justify-center py-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(s)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={36}
                className={s <= (hovered || rating)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-200'}
              />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <p className="text-center text-sm font-medium text-slate-600 -mt-2">
            {LABELS[rating]}
          </p>
        )}

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comentário (opcional)"
          rows={3}
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            disabled={!rating || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? 'Enviando...' : 'Enviar avaliação'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Deadline badge ───────────────────────────────────────────

function DeadlineBadge({ deadline }: { deadline: string }) {
  const days = differenceInDays(new Date(deadline), new Date())
  if (days < 0)  return <span className="flex items-center gap-1 text-xs font-medium text-red-600"><AlertTriangle size={11} /> Prazo vencido</span>
  if (days <= 3) return <span className="flex items-center gap-1 text-xs font-medium text-orange-600"><AlertTriangle size={11} /> {days}d restantes</span>
  if (days <= 7) return <span className="flex items-center gap-1 text-xs text-amber-600"><Clock size={11} /> {days}d restantes</span>
  return <span className="flex items-center gap-1 text-xs text-slate-500"><Calendar size={11} /> {format(new Date(deadline), 'dd/MM/yyyy', { locale: ptBR })}</span>
}

// ─── Card ─────────────────────────────────────────────────────

function MilestoneBar({ done, total }: { done: number; total: number }) {
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <ListChecks size={11} />
          Marcos: {done}/{total}
        </span>
        <span className="font-medium text-slate-600">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-primary-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ActiveProjectCard({
  proposal,
  conversationId,
  hasReview,
  onReview,
  milestoneDone,
  milestoneTotal,
}: {
  proposal: ProposalWithClient
  conversationId?: string
  hasReview: boolean
  onReview: () => void
  milestoneDone: number
  milestoneTotal: number
}) {
  const p           = proposal.project
  const isCompleted = p.status === 'completed'

  return (
    <div className={cn(
      'bg-white rounded-2xl border p-5 space-y-4',
      isCompleted ? 'border-slate-200' : 'border-green-200'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isCompleted ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mb-2 inline-flex items-center gap-1">
              <CheckCircle2 size={10} /> Concluído
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 mb-2 inline-flex items-center gap-1">
              <Clock size={10} /> Em andamento
            </span>
          )}
          <h3 className="font-semibold text-slate-900 text-sm leading-snug">{p.title}</h3>
        </div>
      </div>

      <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
        {p.city && (
          <span className="flex items-center gap-1">
            <MapPin size={11} /> {p.city}/{p.state}
          </span>
        )}
        <span className="flex items-center gap-1 font-semibold text-slate-700">
          <DollarSign size={11} />
          {proposal.proposed_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={11} /> {proposal.estimated_days}d estimados
        </span>
        {p.deadline && !isCompleted && <DeadlineBadge deadline={p.deadline} />}
      </div>

      {!isCompleted && <MilestoneBar done={milestoneDone} total={milestoneTotal} />}

      <div className="flex gap-2 flex-wrap">
        <Link to={`/dashboard/projeto/${p.id}`} className="flex-1 min-w-[120px]">
          <Button variant="outline" size="sm" className="w-full">
            Ver projeto <ArrowRight size={14} />
          </Button>
        </Link>
        {conversationId && !isCompleted && (
          <Link to={`/dashboard/mensagens/${conversationId}`}>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 shrink-0">
              <MessageCircle size={13} />
            </Button>
          </Link>
        )}
        {isCompleted && (
          hasReview ? (
            <span className="flex items-center gap-1 text-xs text-amber-600 px-2">
              <Star size={12} className="fill-amber-400 text-amber-400" /> Avaliado
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50 shrink-0"
              onClick={onReview}
            >
              <Star size={13} /> Avaliar empresa
            </Button>
          )
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function ManageProjectsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [reviewTarget, setReviewTarget] = useState<{
    projectId: string; companyId: string; companyName: string
  } | null>(null)

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['accepted-proposals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*, project:projects(*, client:profiles!projects_client_id_fkey(id, full_name, company_name))')
        .eq('professional_id', user!.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ProposalWithClient[]
    },
    enabled: !!user?.id,
  })

  const { data: reviewedProjectIds = new Set<string>() } = useQuery({
    queryKey: ['my-company-reviews', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('project_id')
        .eq('reviewer_id', user!.id)
      return new Set((data ?? []).map((r) => r.project_id as string))
    },
    enabled: !!user?.id,
  })

  const { data: convMap = {} } = useQuery({
    queryKey: ['my-conversations-map', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, project_id')
        .or(`participant_one_id.eq.${user!.id},participant_two_id.eq.${user!.id}`)
      if (error) return {}
      return Object.fromEntries((data ?? []).map((c) => [c.project_id, c.id])) as Record<string, string>
    },
    enabled: !!user?.id,
  })

  const activeProjectIds = proposals
    .filter((p) => p.project.status !== 'completed')
    .map((p) => p.project_id)

  const { data: milestoneMap = {} } = useQuery({
    queryKey: ['my-milestones-map', activeProjectIds],
    queryFn: async () => {
      if (activeProjectIds.length === 0) return {}
      const { data } = await supabase
        .from('project_milestones')
        .select('project_id, is_done')
        .in('project_id', activeProjectIds)
      const map: Record<string, { done: number; total: number }> = {}
      for (const m of data ?? []) {
        if (!map[m.project_id]) map[m.project_id] = { done: 0, total: 0 }
        map[m.project_id].total++
        if (m.is_done) map[m.project_id].done++
      }
      return map
    },
    enabled: activeProjectIds.length > 0,
  })

  const active    = proposals.filter((p) => p.project.status !== 'completed')
  const completed = proposals.filter((p) => p.project.status === 'completed')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meus projetos</h1>
        <p className="text-slate-500 text-sm mt-1">
          {proposals.length} projeto{proposals.length !== 1 ? 's' : ''} com proposta aceita
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Briefcase size={28} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Nenhum projeto ativo ainda</h3>
          <p className="text-sm text-slate-400 mb-6">
            Quando uma empresa aceitar sua proposta, o projeto aparecerá aqui.
          </p>
          <Link to="/dashboard/projetos">
            <Button>Buscar projetos</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Em andamento ({active.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {active.map((p) => (
                  <ActiveProjectCard
                    key={p.id}
                    proposal={p}
                    conversationId={convMap[p.project_id]}
                    hasReview={reviewedProjectIds.has(p.project_id)}
                    milestoneDone={milestoneMap[p.project_id]?.done ?? 0}
                    milestoneTotal={milestoneMap[p.project_id]?.total ?? 0}
                    onReview={() => {
                      const client = p.project.client
                      setReviewTarget({
                        projectId: p.project_id,
                        companyId: client?.id ?? '',
                        companyName: client?.company_name ?? client?.full_name ?? 'Empresa',
                      })
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Concluídos ({completed.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {completed.map((p) => (
                  <ActiveProjectCard
                    key={p.id}
                    proposal={p}
                    conversationId={convMap[p.project_id]}
                    hasReview={reviewedProjectIds.has(p.project_id)}
                    milestoneDone={0}
                    milestoneTotal={0}
                    onReview={() => {
                      const client = p.project.client
                      setReviewTarget({
                        projectId: p.project_id,
                        companyId: client?.id ?? '',
                        companyName: client?.company_name ?? client?.full_name ?? 'Empresa',
                      })
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {reviewTarget && (
        <WriteCompanyReviewModal
          projectId={reviewTarget.projectId}
          companyId={reviewTarget.companyId}
          companyName={reviewTarget.companyName}
          onClose={() => setReviewTarget(null)}
          onDone={() => {
            setReviewTarget(null)
            queryClient.invalidateQueries({ queryKey: ['my-company-reviews', user?.id] })
            queryClient.invalidateQueries({ queryKey: ['public-company-reviews', reviewTarget.companyId] })
          }}
        />
      )}
    </div>
  )
}
