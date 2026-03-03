import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  MapPin, Calendar, DollarSign, Eye, Edit2, Trash2,
  ChevronLeft, Clock, CheckCircle2, XCircle, MessageSquare,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { PROJECT_STATUS_LABELS, PROPOSAL_STATUS_LABELS } from '@/utils/constants'
import type { Project, Proposal, Profile } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return 'A combinar'
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `A partir de ${fmt(min)}`
  return `Até ${fmt(max!)}`
}

// ─── Send Proposal Form ───────────────────────────────────────

const proposalSchema = z.object({
  message:        z.string().min(30, 'Descreva melhor sua proposta (mín. 30 caracteres)'),
  proposed_value: z.string().min(1, 'Informe o valor'),
  estimated_days: z.string().min(1, 'Informe o prazo'),
})

type ProposalFormData = z.infer<typeof proposalSchema>

function SendProposalForm({
  projectId,
  userId,
  onSent,
}: {
  projectId: string
  userId: string
  onSent: () => void
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
  })

  const mutation = useMutation({
    mutationFn: async (data: ProposalFormData) => {
      const { error } = await supabase.from('proposals').insert({
        project_id:      projectId,
        professional_id: userId,
        message:         data.message,
        proposed_value:  parseFloat(data.proposed_value),
        estimated_days:  parseInt(data.estimated_days),
        status:          'pending',
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Proposta enviada!')
      reset()
      onSent()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? ''
      toast.error(msg || 'Erro ao enviar proposta.')
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="message" required>Sua proposta</Label>
        <textarea
          id="message"
          rows={4}
          placeholder="Descreva sua abordagem, experiência relevante e o que você vai entregar..."
          className={cn(
            'flex w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none',
            'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors',
            errors.message ? 'border-red-400' : 'border-slate-300'
          )}
          {...register('message')}
        />
        {errors.message && <p className="text-xs text-red-500">{errors.message.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="proposed_value" required>Valor proposto (R$)</Label>
          <Input
            id="proposed_value"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            error={errors.proposed_value?.message}
            {...register('proposed_value')}
          />
          {errors.proposed_value && <p className="text-xs text-red-500">{errors.proposed_value.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="estimated_days" required>Prazo (dias)</Label>
          <Input
            id="estimated_days"
            type="number"
            min="1"
            placeholder="Ex: 15"
            error={errors.estimated_days?.message}
            {...register('estimated_days')}
          />
          {errors.estimated_days && <p className="text-xs text-red-500">{errors.estimated_days.message}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full" isLoading={mutation.isPending}>
        Enviar proposta
      </Button>
    </form>
  )
}

// ─── Proposal Card ────────────────────────────────────────────

function ProposalCard({
  proposal,
  isOwner,
  onAccept,
  onReject,
  onChat,
}: {
  proposal: Proposal & { professional: Profile }
  isOwner: boolean
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onChat?: (proposal: Proposal & { professional: Profile }) => void
}) {
  const prof = proposal.professional
  const name = prof.full_name ?? prof.email

  const cardStyle =
    proposal.status === 'accepted'  ? 'bg-green-50 border-green-200'  :
    proposal.status === 'rejected'  ? 'bg-red-50 border-red-200'      :
    proposal.status === 'withdrawn' ? 'bg-slate-50 border-slate-200'  :
    'bg-amber-50 border-amber-200'

  const badgeStyle =
    proposal.status === 'accepted'  ? 'bg-green-100 text-green-700'  :
    proposal.status === 'rejected'  ? 'bg-red-100 text-red-600'      :
    proposal.status === 'withdrawn' ? 'bg-slate-100 text-slate-600'  :
    'bg-amber-100 text-amber-700'

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', cardStyle)}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{name}</p>
          {prof.city && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin size={10} /> {prof.city}/{prof.state}
            </p>
          )}
        </div>
        <span className={cn('text-xs font-medium px-2 py-1 rounded-full shrink-0', badgeStyle)}>
          {PROPOSAL_STATUS_LABELS[proposal.status]}
        </span>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed">{proposal.message}</p>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1 font-semibold text-slate-800">
          <DollarSign size={12} />
          {proposal.proposed_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} /> {proposal.estimated_days} dias
        </span>
        <span className="ml-auto">
          {format(new Date(proposal.created_at), "dd 'de' MMM", { locale: ptBR })}
        </span>
      </div>

      {isOwner && proposal.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => onReject(proposal.id)}
          >
            <XCircle size={14} /> Recusar
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => onAccept(proposal.id)}
          >
            <CheckCircle2 size={14} /> Aceitar
          </Button>
        </div>
      )}

      {proposal.status === 'accepted' && onChat && (
        <Button
          size="sm"
          variant="outline"
          className="w-full mt-1"
          onClick={() => onChat(proposal)}
        >
          <MessageSquare size={14} /> Conversar
        </Button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, images:project_images(*), categories:project_category_assignments(category:project_categories(name))')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Omit<Project, 'categories' | 'images'> & {
        images: { image_url: string; display_order: number }[]
        categories: { category: { name: string } }[]
      }
    },
    enabled: !!id,
  })

  const { data: proposals = [] } = useQuery({
    queryKey: ['project-proposals', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*, professional:profiles(*)')
        .eq('project_id', id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (Proposal & { professional: Profile })[]
    },
    enabled: !!id && !!user,
  })

  const updateProposalStatus = useMutation({
    mutationFn: async ({ proposalId, status }: { proposalId: string; status: string }) => {
      const { error } = await supabase.from('proposals').update({ status }).eq('id', proposalId)
      if (error) throw error
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['project-proposals', id] })
      toast.success(status === 'accepted' ? 'Proposta aceita!' : 'Proposta recusada.')
    },
    onError: () => toast.error('Erro ao atualizar proposta.'),
  })

  const openChat = useMutation({
    mutationFn: async (proposal: Proposal & { professional: Profile }) => {
      const companyId      = project!.client_id
      const professionalId = proposal.professional_id
      const projectId      = project!.id

      // Check for existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('project_id', projectId)
        .or(`and(participant_one_id.eq.${companyId},participant_two_id.eq.${professionalId}),and(participant_one_id.eq.${professionalId},participant_two_id.eq.${companyId})`)
        .maybeSingle()

      if (existing) return existing.id

      const { data: created, error } = await supabase
        .from('conversations')
        .insert({
          project_id:          projectId,
          participant_one_id:  companyId,
          participant_two_id:  professionalId,
        })
        .select('id')
        .single()
      if (error) throw error
      return created.id
    },
    onSuccess: (convId) => {
      navigate(`/dashboard/mensagens/${convId}`)
    },
    onError: () => toast.error('Erro ao abrir conversa.'),
  })

  const deleteProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('projects').delete().eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-projects'] })
      toast.success('Projeto excluído.')
      navigate('/dashboard/meus-projetos')
    },
    onError: () => toast.error('Erro ao excluir projeto.'),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Projeto não encontrado.</p>
        <Link to="/dashboard/meus-projetos" className="text-primary-600 text-sm mt-2 inline-block">
          Voltar
        </Link>
      </div>
    )
  }

  const isOwner        = project.client_id === user?.id
  const isProfissional = profile?.user_type === 'profissional'
  const myProposal     = proposals.find((p) => p.professional_id === user?.id)
  const statusLabel    = PROJECT_STATUS_LABELS[project.status] ?? project.status
  const images         = [...(project.images ?? [])].sort((a, b) => a.display_order - b.display_order)
  const categories     = (project.categories ?? []).map((c) => c.category.name)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ChevronLeft size={16} /> Voltar
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-full',
                project.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
              )}>
                {statusLabel}
              </span>
              {categories.map((c) => (
                <span key={c} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{c}</span>
              ))}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{project.title}</h1>
          </div>
          {isOwner && (
            <div className="flex gap-2 shrink-0">
              <Link to={`/dashboard/editar-projeto/${project.id}`}>
                <Button size="sm" variant="outline"><Edit2 size={14} /> Editar</Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => {
                  if (confirm('Excluir este projeto?')) deleteProject.mutate()
                }}
                isLoading={deleteProject.isPending}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500 mb-5">
          {project.city && (
            <span className="flex items-center gap-1.5"><MapPin size={14} /> {project.city} / {project.state}</span>
          )}
          {project.deadline && (
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {format(new Date(project.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <DollarSign size={14} /> {formatBudget(project.budget_min, project.budget_max)}
          </span>
          <span className="flex items-center gap-1.5 ml-auto">
            <Eye size={14} /> {project.view_count} visualizações
          </span>
        </div>

        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{project.description}</p>
      </div>

      {/* Images */}
      {images.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Imagens de referência</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img, i) => (
              <a key={i} href={img.image_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={img.image_url}
                  alt={`Imagem ${i + 1}`}
                  className="w-full aspect-video object-cover rounded-xl hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Proposals section */}
      {(isOwner || isProfissional) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">
            {isOwner
              ? `Propostas recebidas (${proposals.length})`
              : myProposal ? 'Minha proposta' : 'Enviar proposta'}
          </h2>

          {isProfissional && !myProposal && project.status === 'open' && (
            <SendProposalForm
              projectId={project.id}
              userId={user!.id}
              onSent={() => queryClient.invalidateQueries({ queryKey: ['project-proposals', id] })}
            />
          )}

          {isProfissional && myProposal && (
            <ProposalCard
              proposal={myProposal}
              isOwner={false}
              onAccept={() => {}}
              onReject={() => {}}
              onChat={(p) => openChat.mutate(p)}
            />
          )}

          {isOwner && proposals.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma proposta recebida ainda.</p>
          )}

          {isOwner && proposals.length > 0 && (
            <div className="space-y-3">
              {proposals.map((p) => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  isOwner={true}
                  onAccept={(pid) => updateProposalStatus.mutate({ proposalId: pid, status: 'accepted' })}
                  onReject={(pid) => updateProposalStatus.mutate({ proposalId: pid, status: 'rejected' })}
                  onChat={(prop) => openChat.mutate(prop)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
