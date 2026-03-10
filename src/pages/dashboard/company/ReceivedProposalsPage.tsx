import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Handshake, DollarSign, Clock, CheckCircle2, XCircle,
  MessageCircle, TrendingUp, UserCircle2, ArrowRight, AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { notifyEmail } from '@/lib/email'
import { PROPOSAL_STATUS_LABELS } from '@/utils/constants'

// ─── Types ────────────────────────────────────────────────────

type ReceivedProposal = {
  id: string
  professional_id: string
  project_id: string
  status: string
  message: string
  proposed_value: number
  estimated_days: number
  created_at: string
  project: { id: string; title: string; status: string }
  professional: { id: string; full_name: string | null; avatar_url: string | null }
}

// ─── Proposal Card ─────────────────────────────────────────────

function ProposalCard({
  proposal,
  conversationId,
  onAccept,
  onReject,
  processing,
}: {
  proposal: ReceivedProposal
  conversationId?: string
  onAccept: (id: string) => void
  onReject: (id: string) => void
  processing: boolean
}) {
  const badgeStyle =
    proposal.status === 'accepted'  ? 'bg-green-100 text-green-700'  :
    proposal.status === 'rejected'  ? 'bg-red-100 text-red-600'      :
    proposal.status === 'withdrawn' ? 'bg-slate-100 text-slate-500'  :
    'bg-amber-100 text-amber-700'

  const cardBorder =
    proposal.status === 'accepted' ? 'border-green-200' :
    proposal.status === 'rejected' ? 'border-red-200'   :
    'border-slate-200'

  const prof = proposal.professional

  return (
    <div className={cn('bg-white rounded-2xl border p-5 space-y-4', cardBorder)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {prof.avatar_url ? (
            <img src={prof.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <UserCircle2 size={20} className="text-slate-400" />
            </div>
          )}
          <div className="min-w-0">
            <Link
              to={`/dashboard/profissional/${prof.id}`}
              className="font-semibold text-slate-900 text-sm hover:text-primary-700 transition-colors"
            >
              {prof.full_name ?? 'Profissional'}
            </Link>
            <p className="text-xs text-slate-400">
              {format(new Date(proposal.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full shrink-0', badgeStyle)}>
          {PROPOSAL_STATUS_LABELS[proposal.status as keyof typeof PROPOSAL_STATUS_LABELS] ?? proposal.status}
        </span>
      </div>

      {/* Project */}
      <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
        Projeto: <Link to={`/dashboard/projeto/${proposal.project.id}`} className="font-medium text-slate-700 hover:text-primary-700">
          {proposal.project.title}
        </Link>
      </div>

      {/* Message */}
      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{proposal.message}</p>

      {/* Details */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1 font-semibold text-slate-800">
          <DollarSign size={12} />
          {proposal.proposed_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} /> {proposal.estimated_days} dias
        </span>
      </div>

      {/* Actions */}
      {proposal.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => onAccept(proposal.id)}
            isLoading={processing}
          >
            <CheckCircle2 size={14} /> Aceitar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => onReject(proposal.id)}
            isLoading={processing}
          >
            <XCircle size={14} /> Recusar
          </Button>
        </div>
      )}

      {proposal.status === 'accepted' && (
        <div className="flex items-center justify-between gap-3 bg-green-50 rounded-lg p-3">
          <span className="text-xs font-medium text-green-700">✓ Proposta aceita</span>
          {conversationId ? (
            <Link to={`/dashboard/mensagens/${conversationId}`}>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 shrink-0">
                <MessageCircle size={13} /> Conversar
              </Button>
            </Link>
          ) : (
            <Link to={`/dashboard/projeto/${proposal.project.id}`}>
              <Button size="sm" variant="outline" className="shrink-0">
                Ver projeto <ArrowRight size={13} />
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Reject Reason Modal ──────────────────────────────────────

function RejectReasonModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (reason: string) => void
  onCancel: () => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recusar proposta</h3>
            <p className="text-xs text-slate-500 mt-0.5">Informe um motivo (opcional) para o profissional</p>
          </div>
        </div>
        <div className="p-5">
          <textarea
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
            rows={3}
            placeholder="Ex: Orçamento acima do esperado, prazo incompatível..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
          />
          <p className="text-right text-xs text-slate-400 mt-1">{reason.length}/300</p>
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button
            className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="flex-1 h-10 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            onClick={() => onConfirm(reason.trim())}
            disabled={loading}
          >
            {loading ? 'Recusando...' : 'Confirmar recusa'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Filter Tabs ──────────────────────────────────────────────

const FILTERS = [
  { key: 'all',      label: 'Todas' },
  { key: 'pending',  label: 'Pendentes' },
  { key: 'accepted', label: 'Aceitas' },
  { key: 'rejected', label: 'Recusadas' },
]

// ─── Page ─────────────────────────────────────────────────────

export function ReceivedProposalsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [filter,     setFilter]     = useState('all')
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  // Fetch all proposals received across company projects (two-step to avoid nested select RLS issues)
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['received-proposals', user?.id],
    queryFn: async () => {
      // Step 1: get all non-cancelled projects owned by this user
      const { data: projects, error: projErr } = await supabase
        .from('projects')
        .select('id, title, status')
        .eq('client_id', user!.id)
        .neq('status', 'cancelled')
      if (projErr) throw projErr
      if (!projects?.length) return []

      const projectMap = Object.fromEntries(
        projects.map((p) => [p.id, { id: p.id, title: p.title, status: p.status }])
      )

      // Step 2: get proposals directly (same as ProjectDetailsPage — works with RLS)
      const { data: props, error: propErr } = await supabase
        .from('proposals')
        .select('*, professional:profiles(id, full_name, avatar_url)')
        .in('project_id', projects.map((p) => p.id))
        .order('created_at', { ascending: false })
      if (propErr) throw propErr

      return ((props ?? []) as unknown as ReceivedProposal[]).map((p) => ({
        ...p,
        project: projectMap[p.project_id],
      }))
    },
    enabled: !!user?.id,
  })

  // Build project_id → conversation_id map
  const { data: convMap = {} } = useQuery({
    queryKey: ['company-conversations-map', user?.id],
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

  const updateStatus = useMutation({
    mutationFn: async ({ proposalId, status, rejectionReason }: { proposalId: string; status: string; rejectionReason?: string }) => {
      const payload: Record<string, unknown> = { status }
      if (status === 'rejected' && rejectionReason) payload.rejection_reason = rejectionReason
      const { error } = await supabase.from('proposals').update(payload).eq('id', proposalId)
      if (error) throw error
    },
    onSuccess: (_, { proposalId, status }) => {
      queryClient.invalidateQueries({ queryKey: ['received-proposals'] })
      toast.success(status === 'accepted' ? 'Proposta aceita!' : 'Proposta recusada.')
      notifyEmail(status === 'accepted' ? 'proposta_aceita' : 'proposta_recusada', { proposalId })
      setRejectingId(null)
    },
    onError: () => toast.error('Erro ao atualizar proposta.'),
  })

  const pending  = proposals.filter((p) => p.status === 'pending')
  const accepted = proposals.filter((p) => p.status === 'accepted')
  const rejected = proposals.filter((p) => p.status === 'rejected' || p.status === 'withdrawn')
  const convRate = proposals.length > 0 ? Math.round((accepted.length / proposals.length) * 100) : 0

  const displayed =
    filter === 'pending'  ? pending  :
    filter === 'accepted' ? accepted :
    filter === 'rejected' ? rejected :
    proposals

  return (
    <div className="space-y-6">
      {rejectingId && (
        <RejectReasonModal
          loading={updateStatus.isPending}
          onCancel={() => setRejectingId(null)}
          onConfirm={(reason) => updateStatus.mutate({ proposalId: rejectingId, status: 'rejected', rejectionReason: reason })}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Propostas recebidas</h1>
        <p className="text-slate-500 text-sm mt-1">
          {proposals.length} proposta{proposals.length !== 1 ? 's' : ''} no total
        </p>
      </div>

      {/* Stats */}
      {proposals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',      value: proposals.length, color: 'text-slate-700',   bg: 'bg-slate-50'  },
            { label: 'Pendentes',  value: pending.length,   color: 'text-amber-700',   bg: 'bg-amber-50'  },
            { label: 'Aceitas',    value: accepted.length,  color: 'text-green-700',   bg: 'bg-green-50'  },
            { label: 'Conversão',  value: `${convRate}%`,   color: 'text-primary-700', bg: 'bg-primary-50', icon: true },
          ].map(({ label, value, color, bg, icon }) => (
            <div key={label} className={cn('rounded-xl border border-slate-200 p-4 flex flex-col items-center', bg)}>
              <div className={cn('flex items-center gap-1', color)}>
                {icon && <TrendingUp size={13} />}
                <span className="text-2xl font-bold">{value}</span>
              </div>
              <span className="text-xs text-slate-500 mt-0.5">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {proposals.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const count =
              f.key === 'all'      ? proposals.length :
              f.key === 'pending'  ? pending.length   :
              f.key === 'accepted' ? accepted.length  :
              rejected.length
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  filter === f.key
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-300'
                )}
              >
                {f.label}
                {count > 0 && (
                  <span className={cn('ml-1.5 text-xs font-semibold', filter === f.key ? 'opacity-75' : 'text-slate-400')}>
                    ({count})
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Handshake size={28} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Nenhuma proposta ainda</h3>
          <p className="text-sm text-slate-400 mb-6">
            Quando profissionais enviarem propostas para seus projetos, elas aparecerão aqui.
          </p>
          <Link to="/dashboard/meus-projetos">
            <Button>Ver meus projetos</Button>
          </Link>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-slate-400">Nenhuma proposta neste filtro.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {displayed.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              conversationId={convMap[p.project_id]}
              onAccept={(id) => updateStatus.mutate({ proposalId: id, status: 'accepted' })}
              onReject={(id) => setRejectingId(id)}
              processing={updateStatus.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
