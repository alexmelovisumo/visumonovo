import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Handshake, MapPin, DollarSign, Clock, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PROPOSAL_STATUS_LABELS } from '@/utils/constants'
import type { Proposal, Project } from '@/types'

// ─── Proposal Card ─────────────────────────────────────────────

function ProposalCard({
  proposal,
  onWithdraw,
  withdrawing,
}: {
  proposal: Proposal & { project: Project }
  onWithdraw: (id: string) => void
  withdrawing: boolean
}) {
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

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Link to={`/dashboard/projeto/${project.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            Ver projeto <ArrowRight size={14} />
          </Button>
        </Link>
        {proposal.status === 'pending' && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => onWithdraw(proposal.id)}
            isLoading={withdrawing}
          >
            Retirar
          </Button>
        )}
      </div>

      {proposal.status === 'accepted' && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg p-3">
          <span className="font-medium">✓ Proposta aceita!</span>
          <span>Entre em contato com a empresa para combinar os próximos passos.</span>
        </div>
      )}
    </div>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Minhas negociações</h1>
        <p className="text-slate-500 text-sm mt-1">
          {proposals.length} proposta{proposals.length !== 1 ? 's' : ''} enviada{proposals.length !== 1 ? 's' : ''}
        </p>
      </div>

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
                  <ProposalCard key={p.id} proposal={p} onWithdraw={(id) => withdraw.mutate(id)} withdrawing={withdraw.isPending} />
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
