import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Handshake, MapPin, DollarSign, Clock, ArrowRight, MessageCircle, TrendingUp, Pencil, AlertCircle, Mail, CheckCircle2, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PROPOSAL_STATUS_LABELS } from '@/utils/constants'
import type { Proposal, Project, ProjectInvitation } from '@/types'

// ─── Edit Proposal Modal ──────────────────────────────────────

function EditProposalModal({
  proposal,
  onClose,
}: {
  proposal: Proposal & { project: Project }
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [message, setMessage] = useState(proposal.message)
  const [value,   setValue]   = useState(String(proposal.proposed_value))
  const [days,    setDays]    = useState(String(proposal.estimated_days))

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('proposals')
        .update({
          message:        message.trim(),
          proposed_value: parseFloat(value.replace(',', '.')),
          estimated_days: parseInt(days),
          updated_at:     new Date().toISOString(),
        })
        .eq('id', proposal.id)
        .eq('professional_id', user!.id)
        .eq('status', 'pending')
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-proposals'] })
      toast.success('Proposta atualizada!')
      onClose()
    },
    onError: () => toast.error('Erro ao atualizar proposta.'),
  })

  const isValid =
    message.trim().length >= 10 &&
    parseFloat(value.replace(',', '.')) > 0 &&
    parseInt(days) > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Editar proposta</h3>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{proposal.project.title}</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Valor proposto (R$) *</label>
              <input
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0,00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Prazo (dias) *</label>
              <input
                type="number"
                min={1}
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Mensagem *</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
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
          <button
            className="flex-1 h-10 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
            disabled={!isValid || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Proposal Card ─────────────────────────────────────────────

function ProposalCard({
  proposal,
  onWithdraw,
  withdrawing,
  conversationId,
}: {
  proposal: Proposal & { project: Project }
  onWithdraw: (id: string) => void
  withdrawing: boolean
  conversationId?: string
}) {
  const [editing, setEditing] = useState(false)
  const project = proposal.project

  const badgeStyle =
    proposal.status === 'accepted'  ? 'bg-green-100 text-green-700'   :
    proposal.status === 'rejected'  ? 'bg-red-100 text-red-600'       :
    proposal.status === 'withdrawn' ? 'bg-slate-100 text-slate-500'   :
    'bg-amber-100 text-amber-700'

  const cardBorder =
    proposal.status === 'accepted'  ? 'border-green-200'   :
    proposal.status === 'rejected'  ? 'border-red-200'     :
    'border-slate-200'

  return (
    <>
      {editing && (
        <EditProposalModal proposal={proposal} onClose={() => setEditing(false)} />
      )}

      <div className={cn('bg-white rounded-2xl border p-5 space-y-4', cardBorder)}>
        {/* Project info */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link
              to={`/dashboard/projeto/${project.id}`}
              className="font-semibold text-slate-900 text-sm hover:text-primary-700 transition-colors line-clamp-1"
            >
              {project.title}
            </Link>
            {project.city && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin size={10} /> {project.city}/{project.state}
              </p>
            )}
          </div>
          <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full shrink-0', badgeStyle)}>
            {PROPOSAL_STATUS_LABELS[proposal.status]}
          </span>
        </div>

        {/* Proposal details */}
        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{proposal.message}</p>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1 font-semibold text-slate-800">
            <DollarSign size={12} />
            {proposal.proposed_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> {proposal.estimated_days} dias
          </span>
          <span className="ml-auto text-slate-400">
            {format(new Date(proposal.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>

        {/* Rejection reason */}
        {proposal.status === 'rejected' && proposal.rejection_reason && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Motivo da recusa:</p>
              <p>{proposal.rejection_reason}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Link to={`/dashboard/projeto/${project.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              Ver projeto <ArrowRight size={14} />
            </Button>
          </Link>
          {proposal.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="border-primary-300 text-primary-600 hover:bg-primary-50"
                onClick={() => setEditing(true)}
              >
                <Pencil size={13} /> Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => onWithdraw(proposal.id)}
                isLoading={withdrawing}
              >
                Retirar
              </Button>
            </>
          )}
        </div>

        {proposal.status === 'accepted' && (
          <div className="flex items-center justify-between gap-3 bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-green-700">
              <span className="font-medium">✓ Proposta aceita!</span>
              <span className="hidden sm:inline">Combine os próximos passos com a empresa.</span>
            </div>
            {conversationId && (
              <Link to={`/dashboard/mensagens/${conversationId}`}>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 shrink-0">
                  <MessageCircle size={13} /> Abrir conversa
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function NegotiationsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['my-proposals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*, project:projects(*)')
        .eq('professional_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (Proposal & { project: Project })[]
    },
    enabled: !!user?.id,
  })

  // Build project_id → conversation_id map for accepted proposals
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

  const withdraw = useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase
        .from('proposals')
        .update({ status: 'withdrawn' })
        .eq('id', proposalId)
        .eq('professional_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-proposals'] })
      toast.success('Proposta retirada.')
    },
    onError: () => toast.error('Erro ao retirar proposta.'),
  })

  const accepted  = proposals.filter((p) => p.status === 'accepted')
  const pending   = proposals.filter((p) => p.status === 'pending')
  const others    = proposals.filter((p) => p.status === 'rejected' || p.status === 'withdrawn')
  const convRate  = proposals.length > 0 ? Math.round((accepted.length / proposals.length) * 100) : 0

  // Invitations received
  const { data: invitations = [] } = useQuery({
    queryKey: ['my-invitations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_invitations')
        .select('*, project:projects(id, title, city, state), sender:profiles!project_invitations_sender_id_fkey(id, full_name, profile_image_url)')
        .eq('recipient_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ProjectInvitation[]
    },
    enabled: !!user?.id,
  })

  const respondInvitation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'accepted' | 'declined' }) => {
      const { error } = await supabase
        .from('project_invitations')
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] })
      queryClient.invalidateQueries({ queryKey: ['invitations-badge'] })
      toast.success(status === 'accepted' ? 'Convite aceito! Você pode enviar sua proposta.' : 'Convite recusado.')
    },
    onError: () => toast.error('Erro ao responder convite.'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Minhas negociações</h1>
        <p className="text-slate-500 text-sm mt-1">
          {proposals.length} proposta{proposals.length !== 1 ? 's' : ''} enviada{proposals.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stats summary */}
      {proposals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',      value: proposals.length, color: 'text-slate-700',  bg: 'bg-slate-50'  },
            { label: 'Aceitas',    value: accepted.length,  color: 'text-green-700',  bg: 'bg-green-50'  },
            { label: 'Aguardando', value: pending.length,   color: 'text-amber-700',  bg: 'bg-amber-50'  },
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

      {/* Invitations */}
      {invitations.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-primary-700 mb-3 flex items-center gap-2">
            <Mail size={14} />
            Convites recebidos ({invitations.length})
          </h2>
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div key={inv.id} className="bg-white rounded-2xl border border-primary-200 p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to={`/dashboard/projeto/${inv.project_id}`}
                      className="font-semibold text-slate-900 text-sm hover:text-primary-700 transition-colors"
                    >
                      {inv.project?.title ?? 'Projeto'}
                    </Link>
                    {(inv.project?.city || inv.project?.state) && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {[inv.project.city, inv.project.state].filter(Boolean).join('/')}
                      </p>
                    )}
                  </div>
                  <span className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full shrink-0">Convite</span>
                </div>
                {inv.message && (
                  <p className="text-xs text-slate-500 italic">"{inv.message}"</p>
                )}
                <p className="text-xs text-slate-400">
                  Convite de <span className="font-medium text-slate-600">{inv.sender?.full_name ?? 'Empresa'}</span>
                </p>
                <div className="flex gap-2">
                  <Link to={`/dashboard/projeto/${inv.project_id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Ver projeto <ArrowRight size={13} />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => respondInvitation.mutate({ id: inv.id, status: 'accepted' })}
                    isLoading={respondInvitation.isPending}
                  >
                    <CheckCircle2 size={13} /> Aceitar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => respondInvitation.mutate({ id: inv.id, status: 'declined' })}
                    isLoading={respondInvitation.isPending}
                  >
                    <XCircle size={13} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Handshake size={28} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Nenhuma proposta enviada</h3>
          <p className="text-sm text-slate-400 mb-6">Encontre projetos e envie sua primeira proposta.</p>
          <Link to="/dashboard/projetos">
            <Button>Buscar projetos</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {accepted.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Aceitas ({accepted.length})
              </h2>
              <div className="space-y-4">
                {accepted.map((p) => (
                  <ProposalCard key={p.id} proposal={p} onWithdraw={(id) => withdraw.mutate(id)} withdrawing={withdraw.isPending} conversationId={convMap[p.project_id]} />
                ))}
              </div>
            </section>
          )}

          {pending.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Aguardando resposta ({pending.length})
              </h2>
              <div className="space-y-4">
                {pending.map((p) => (
                  <ProposalCard key={p.id} proposal={p} onWithdraw={(id) => withdraw.mutate(id)} withdrawing={withdraw.isPending} />
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Encerradas ({others.length})
              </h2>
              <div className="space-y-4">
                {others.map((p) => (
                  <ProposalCard key={p.id} proposal={p} onWithdraw={(id) => withdraw.mutate(id)} withdrawing={withdraw.isPending} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
