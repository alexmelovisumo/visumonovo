import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  MapPin, Calendar, DollarSign, Eye, Edit2, Trash2,
  ChevronLeft, Clock, CheckCircle2, XCircle, MessageSquare,
  CheckCheck, Paperclip, FileText, Image as ImageIcon, Star,
  CopyPlus, Share2, ListChecks, Plus, Zap, Crown, UserSearch, BadgeCheck, Send,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { notifyEmail } from '@/lib/email'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { PROJECT_STATUS_LABELS, PROPOSAL_STATUS_LABELS } from '@/utils/constants'
import { CompleteProjectModal } from '@/components/common/CompleteProjectModal'
import { WriteReviewModal } from '@/components/common/WriteReviewModal'
import type { Project, Proposal, Profile, ProjectAttachment, ProjectMilestone } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return 'A combinar'
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `A partir de ${fmt(min)}`
  return `Até ${fmt(max!)}`
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
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
      const { data: created, error } = await supabase.from('proposals').insert({
        project_id:      projectId,
        professional_id: userId,
        message:         data.message,
        proposed_value:  parseFloat(data.proposed_value),
        estimated_days:  parseInt(data.estimated_days),
        status:          'pending',
      }).select('id').single()
      if (error) throw error
      return created.id as string
    },
    onSuccess: (proposalId) => {
      toast.success('Proposta enviada!')
      reset()
      onSent()
      notifyEmail('nova_proposta', { proposalId })
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

// ─── Attachments Section ──────────────────────────────────────

function AttachmentsSection({ projectId }: { projectId: string }) {
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['project-attachments', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_attachments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ProjectAttachment[]
    },
  })

  if (isLoading || attachments.length === 0) return null

  const photos = attachments.filter((a) => a.file_type.startsWith('image/'))
  const docs   = attachments.filter((a) => !a.file_type.startsWith('image/'))

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2">
        <Paperclip size={16} /> Arquivos do projeto
      </h2>

      {photos.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
            <ImageIcon size={11} /> Fotos de conclusão
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((a) => (
              <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={a.file_url}
                  alt={a.caption ?? a.file_name}
                  className="w-full aspect-square object-cover rounded-xl hover:opacity-90 transition-opacity border border-slate-100"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {docs.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
            <FileText size={11} /> Documentos
          </p>
          <div className="space-y-2">
            {docs.map((a) => (
              <a
                key={a.id}
                href={a.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all group"
              >
                <FileText size={18} className="text-slate-400 group-hover:text-primary-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{a.file_name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(a.file_size)}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Reject Reason Modal ─────────────────────────────────────

function RejectReasonModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Recusar proposta</h3>
          <p className="text-sm text-slate-500 mt-0.5">Informe o motivo (opcional) — será visível ao profissional.</p>
        </div>
        <div className="p-5">
          <textarea
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            rows={3}
            placeholder="Ex: O prazo não atende nossas necessidades..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button
            className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="flex-1 h-10 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
            onClick={() => onConfirm(reason)}
          >
            Recusar proposta
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Milestones Section ───────────────────────────────────────

function MilestonesSection({
  projectId,
  isOwner,
  isParticipant,
}: {
  projectId: string
  isOwner: boolean
  isParticipant: boolean
}) {
  const queryClient = useQueryClient()
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true })
      if (error) throw error
      return data as ProjectMilestone[]
    },
  })

  const addMilestone = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('project_milestones').insert({
        project_id: projectId,
        title:      newTitle.trim(),
        position:   milestones.length,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] })
      setNewTitle('')
      setAdding(false)
      toast.success('Marco adicionado!')
    },
    onError: () => toast.error('Erro ao adicionar marco.'),
  })

  const toggleMilestone = useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const { error } = await supabase
        .from('project_milestones')
        .update({ is_done, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['milestones', projectId] }),
    onError: () => toast.error('Erro ao atualizar marco.'),
  })

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_milestones').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] })
      toast.success('Marco removido.')
    },
    onError: () => toast.error('Erro ao remover marco.'),
  })

  if (!isOwner && !isParticipant) return null

  const done  = milestones.filter((m) => m.is_done).length
  const total = milestones.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <ListChecks size={16} className="text-primary-500" />
          Marcos do projeto
          {total > 0 && (
            <span className="text-xs text-slate-400 font-normal">
              {done}/{total} concluídos
            </span>
          )}
        </h2>
        {isOwner && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            <Plus size={13} /> Adicionar
          </button>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-4">
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1 text-right">{pct}% concluído</p>
        </div>
      )}

      {/* List */}
      <ul className="space-y-2">
        {milestones.map((m) => (
          <li key={m.id} className="flex items-center gap-3 group">
            <button
              onClick={() => toggleMilestone.mutate({ id: m.id, is_done: !m.is_done })}
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                m.is_done
                  ? 'bg-green-500 border-green-500'
                  : 'border-slate-300 hover:border-primary-400'
              )}
            >
              {m.is_done && <CheckCircle2 size={12} className="text-white" />}
            </button>
            <span className={cn(
              'flex-1 text-sm',
              m.is_done ? 'text-slate-400 line-through' : 'text-slate-800'
            )}>
              {m.title}
            </span>
            {isOwner && (
              <button
                onClick={() => deleteMilestone.mutate(m.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500"
              >
                <Trash2 size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Add form */}
      {isOwner && adding && (
        <div className="flex gap-2 mt-3">
          <input
            autoFocus
            className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Título do marco..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTitle.trim()) addMilestone.mutate()
              if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
            }}
          />
          <Button
            size="sm"
            disabled={!newTitle.trim()}
            isLoading={addMilestone.isPending}
            onClick={() => addMilestone.mutate()}
          >
            Salvar
          </Button>
          <button
            onClick={() => { setAdding(false); setNewTitle('') }}
            className="text-slate-400 hover:text-slate-600 text-sm px-2"
          >
            Cancelar
          </button>
        </div>
      )}

      {total === 0 && !adding && isOwner && (
        <p className="text-sm text-slate-400 text-center py-4">
          Nenhum marco ainda. Adicione etapas para acompanhar o progresso.
        </p>
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
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [rejectingProposalId, setRejectingProposalId] = useState<string | null>(null)

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

  const { data: existingReview } = useQuery({
    queryKey: ['my-review', id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('id')
        .eq('project_id', id!)
        .eq('reviewer_id', user!.id)
        .maybeSingle()
      return data
    },
    enabled: !!id && !!user?.id,
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
    mutationFn: async ({ proposalId, status, rejection_reason }: { proposalId: string; status: string; rejection_reason?: string }) => {
      const { error } = await supabase
        .from('proposals')
        .update({ status, ...(rejection_reason ? { rejection_reason } : {}) })
        .eq('id', proposalId)
      if (error) throw error
    },
    onSuccess: (_, { proposalId, status }) => {
      queryClient.invalidateQueries({ queryKey: ['project-proposals', id] })
      toast.success(status === 'accepted' ? 'Proposta aceita!' : 'Proposta recusada.')
      notifyEmail(
        status === 'accepted' ? 'proposta_aceita' : 'proposta_recusada',
        { proposalId },
      )
    },
    onError: () => toast.error('Erro ao atualizar proposta.'),
  })

  const openChat = useMutation({
    mutationFn: async (proposal: Proposal & { professional: Profile }) => {
      const companyId      = project!.client_id
      const professionalId = proposal.professional_id
      const projectId      = project!.id

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

  const duplicateProject = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          client_id:   user!.id,
          title:       `${project!.title} (cópia)`,
          description: project!.description,
          budget_min:  project!.budget_min,
          budget_max:  project!.budget_max,
          deadline:    project!.deadline,
          city:        project!.city,
          state:       project!.state,
          status:      'open',
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ['my-projects'] })
      toast.success('Projeto duplicado!')
      navigate(`/dashboard/projeto/${newId}`)
    },
    onError: () => toast.error('Erro ao duplicar projeto.'),
  })

  const toggleFeatured = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('projects')
        .update({ is_featured: !project!.is_featured })
        .eq('id', project!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      toast.success(project!.is_featured ? 'Destaque removido' : 'Projeto em destaque!')
    },
    onError: () => toast.error('Erro ao atualizar destaque.'),
  })

  const { data: suggestedProfs = [] } = useQuery({
    queryKey: ['suggested-professionals', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_image_url, specialties, is_verified')
        .in('user_type', ['profissional', 'empresa_prestadora'])
        .eq('is_active', true)
        .eq('is_available', true)
        .limit(12)
      return (data ?? []) as { id: string; full_name: string | null; email: string; profile_image_url: string | null; specialties: string[]; is_verified: boolean }[]
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  })

  const { data: invitedIds = [] } = useQuery({
    queryKey: ['project-invited-ids', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_invitations')
        .select('recipient_id')
        .eq('project_id', id!)
      return (data ?? []).map((r) => r.recipient_id as string)
    },
    enabled: !!id,
  })

  const inviteProfessional = useMutation({
    mutationFn: async (recipientId: string) => {
      const { error } = await supabase.from('project_invitations').insert({
        project_id:   id!,
        sender_id:    user!.id,
        recipient_id: recipientId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-invited-ids', id] })
      toast.success('Convite enviado!')
    },
    onError: () => toast.error('Erro ao enviar convite.'),
  })

  const handleShare = async () => {
    const url = `${window.location.origin}/projeto/${project!.id}`
    if (navigator.share) {
      await navigator.share({ title: project!.title, url })
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado!')
    }
  }

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
  const isProfissional = profile?.user_type === 'profissional' || profile?.user_type === 'empresa_prestadora'
  const isAdmin        = profile?.user_type === 'admin'
  const myProposal     = proposals.find((p) => p.professional_id === user?.id)
  const acceptedProposal = proposals.find((p) => p.status === 'accepted')
  const statusLabel    = PROJECT_STATUS_LABELS[project.status] ?? project.status
  const images         = [...(project.images ?? [])].sort((a, b) => a.display_order - b.display_order)
  const categories     = (project.categories ?? []).map((c) => c.category.name)

  const canFinalize = isOwner && acceptedProposal && project.status !== 'completed' && project.status !== 'cancelled'

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
        <div className="mb-4">
          {/* Badges + título */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={cn(
              'text-xs font-medium px-2.5 py-1 rounded-full',
              project.status === 'open'      ? 'bg-green-100 text-green-700'   :
              project.status === 'completed' ? 'bg-blue-100 text-blue-700'     :
              'bg-slate-100 text-slate-600'
            )}>
              {statusLabel}
            </span>
            {project.is_urgent && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                <Zap size={9} /> URGENTE
              </span>
            )}
            {project.is_featured && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-400 text-white px-2 py-0.5 rounded-full">
                <Crown size={9} /> DESTAQUE
              </span>
            )}
            {categories.map((c) => (
              <span key={c} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{c}</span>
            ))}
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-3">{project.title}</h1>

          {/* Action buttons — full row on mobile */}
          {(isAdmin || isOwner) && (
            <div className="flex gap-2 flex-wrap">
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    project.is_featured
                      ? 'border-amber-300 text-amber-600 hover:bg-amber-50'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  )}
                  onClick={() => toggleFeatured.mutate()}
                  isLoading={toggleFeatured.isPending}
                >
                  <Crown size={14} />
                  {project.is_featured ? 'Remover destaque' : 'Destacar'}
                </Button>
              )}
              {isOwner && (
                <>
                  <Button size="sm" variant="outline" onClick={handleShare} title="Compartilhar">
                    <Share2 size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-primary-300 text-primary-600 hover:bg-primary-50"
                    onClick={() => duplicateProject.mutate()}
                    isLoading={duplicateProject.isPending}
                  >
                    <CopyPlus size={14} /> Duplicar
                  </Button>
                  <Link to={`/dashboard/editar-projeto/${project.id}`}>
                    <Button size="sm" variant="outline"><Edit2 size={14} /> Editar</Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => { if (confirm('Excluir este projeto?')) deleteProject.mutate() }}
                    isLoading={deleteProject.isPending}
                  >
                    <Trash2 size={14} />
                  </Button>
                </>
              )}
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

        {/* Finalizar projeto */}
        {canFinalize && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <Button
              onClick={() => setShowCompleteModal(true)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCheck size={16} /> Finalizar Projeto
            </Button>
            <p className="text-xs text-slate-400 text-center mt-2">
              Marque o projeto como concluído e avalie o profissional
            </p>
          </div>
        )}

        {project.status === 'completed' && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-4 py-3">
              <CheckCheck size={16} className="shrink-0" />
              <span className="text-sm font-medium">Projeto finalizado com sucesso</span>
            </div>

            {isOwner && acceptedProposal && (
              existingReview ? (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
                  <Star size={15} className="fill-amber-500 text-amber-500 shrink-0" />
                  <span className="text-sm font-medium">Você já avaliou este profissional</span>
                </div>
              ) : (
                <Button
                  onClick={() => setShowReviewModal(true)}
                  className="w-full bg-amber-500 hover:bg-amber-600"
                >
                  <Star size={15} /> Avaliar profissional
                </Button>
              )
            )}
          </div>
        )}
      </div>

      {/* Milestones — only for active projects */}
      {(project.status === 'in_progress' || project.status === 'in_negotiation') && (
        <MilestonesSection
          projectId={project.id}
          isOwner={isOwner}
          isParticipant={!!acceptedProposal && acceptedProposal.professional_id === user?.id}
        />
      )}

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

      {/* Project Attachments (photos from completion) */}
      {id && <AttachmentsSection projectId={id} />}

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
                  onReject={(pid) => setRejectingProposalId(pid)}
                  onChat={(prop) => openChat.mutate(prop)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profissionais Sugeridos */}
      {isOwner && project.status === 'open' && (() => {
        const shown = suggestedProfs.filter((p) => p.id !== user?.id && !invitedIds.includes(p.id)).slice(0, 6)
        if (shown.length === 0) return null
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <UserSearch size={16} className="text-primary-500" />
              Profissionais sugeridos
              <span className="text-xs text-slate-400 font-normal">· disponíveis agora</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {shown.map((prof) => {
                const name = prof.full_name ?? prof.email
                const initials = name.charAt(0).toUpperCase()
                const alreadyInvited = invitedIds.includes(prof.id)
                return (
                  <div key={prof.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="shrink-0">
                      {prof.profile_image_url ? (
                        <img src={prof.profile_image_url} alt={name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                          {initials}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
                        {prof.is_verified && <BadgeCheck size={12} className="text-blue-500 shrink-0" />}
                      </div>
                      {prof.specialties?.length > 0 && (
                        <p className="text-[11px] text-slate-400 truncate">{prof.specialties.slice(0, 2).join(' · ')}</p>
                      )}
                    </div>
                    <button
                      disabled={alreadyInvited || inviteProfessional.isPending}
                      onClick={() => inviteProfessional.mutate(prof.id)}
                      className={cn(
                        'shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors',
                        alreadyInvited
                          ? 'text-green-600 bg-green-50 cursor-default'
                          : 'text-primary-600 bg-primary-50 hover:bg-primary-100'
                      )}
                    >
                      {alreadyInvited ? <CheckCircle2 size={12} /> : <Send size={12} />}
                      {alreadyInvited ? 'Convidado' : 'Convidar'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Reject Reason Modal */}
      {rejectingProposalId && (
        <RejectReasonModal
          onConfirm={(reason) => {
            updateProposalStatus.mutate({ proposalId: rejectingProposalId, status: 'rejected', rejection_reason: reason || undefined })
            setRejectingProposalId(null)
          }}
          onClose={() => setRejectingProposalId(null)}
        />
      )}

      {/* Complete Modal */}
      {showCompleteModal && acceptedProposal && (
        <CompleteProjectModal
          projectId={project.id}
          professionalId={acceptedProposal.professional_id}
          professionalName={acceptedProposal.professional?.full_name ?? 'profissional'}
          onClose={() => setShowCompleteModal(false)}
          onComplete={() => {
            setShowCompleteModal(false)
            queryClient.invalidateQueries({ queryKey: ['project', id] })
            queryClient.invalidateQueries({ queryKey: ['project-attachments', id] })
            queryClient.invalidateQueries({ queryKey: ['my-review', id, user?.id] })
          }}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && acceptedProposal && (
        <WriteReviewModal
          projectId={project.id}
          reviewedId={acceptedProposal.professional_id}
          reviewedName={acceptedProposal.professional?.full_name ?? 'profissional'}
          onClose={() => setShowReviewModal(false)}
          onDone={() => {
            setShowReviewModal(false)
            queryClient.invalidateQueries({ queryKey: ['my-review', id, user?.id] })
          }}
        />
      )}
    </div>
  )
}
