import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Save, ListChecks, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { BR_STATES } from '@/utils/constants'
import type { Project, ProjectCategory, ProjectMilestone } from '@/types'

const schema = z.object({
  title:       z.string().min(5, 'Título deve ter pelo menos 5 caracteres'),
  description: z.string().min(20, 'Descrição deve ter pelo menos 20 caracteres'),
  budget_min:  z.string().optional(),
  budget_max:  z.string().optional(),
  deadline:    z.string().optional(),
  city:        z.string().min(2, 'Cidade é obrigatória'),
  state:       z.string().length(2, 'Selecione o estado'),
  status:      z.enum(['open', 'in_negotiation', 'in_progress', 'completed', 'cancelled']),
})

type FormData = z.infer<typeof schema>

export function EditProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [newMilestone, setNewMilestone]             = useState('')

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, categories:project_category_assignments(category_id)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Omit<Project, 'categories'> & { categories: { category_id: string }[] }
    },
    enabled: !!id,
  })

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      if (error) throw error
      return data as ProjectCategory[]
    },
  })

  const { data: milestones = [], refetch: refetchMilestones } = useQuery({
    queryKey: ['milestones', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', id!)
        .order('position', { ascending: true })
      if (error) throw error
      return data as ProjectMilestone[]
    },
    enabled: !!id,
  })

  const addMilestone = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from('project_milestones').insert({
        project_id: id!,
        title:      title.trim(),
        position:   milestones.length,
      })
      if (error) throw error
    },
    onSuccess: () => { setNewMilestone(''); refetchMilestones() },
    onError:   () => toast.error('Erro ao adicionar marco'),
  })

  const toggleMilestone = useMutation({
    mutationFn: async ({ milestoneId, isDone }: { milestoneId: string; isDone: boolean }) => {
      const { error } = await supabase
        .from('project_milestones')
        .update({ is_done: isDone })
        .eq('id', milestoneId)
      if (error) throw error
    },
    onSuccess: () => refetchMilestones(),
  })

  const deleteMilestone = useMutation({
    mutationFn: async (milestoneId: string) => {
      const { error } = await supabase
        .from('project_milestones')
        .delete()
        .eq('id', milestoneId)
      if (error) throw error
    },
    onSuccess: () => refetchMilestones(),
    onError:   () => toast.error('Erro ao remover marco'),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (project) {
      reset({
        title:       project.title,
        description: project.description,
        budget_min:  project.budget_min?.toString() ?? '',
        budget_max:  project.budget_max?.toString() ?? '',
        deadline:    project.deadline ?? '',
        city:        project.city ?? '',
        state:       project.state ?? '',
        status:      project.status,
      })
      setSelectedCategories(project.categories.map((c) => c.category_id))
    }
  }, [project, reset])

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase
        .from('projects')
        .update({
          title:       data.title,
          description: data.description,
          budget_min:  data.budget_min ? parseFloat(data.budget_min) : null,
          budget_max:  data.budget_max ? parseFloat(data.budget_max) : null,
          deadline:    data.deadline || null,
          city:        data.city,
          state:       data.state,
          status:      data.status,
        })
        .eq('id', id!)
        .eq('client_id', user!.id)

      if (error) throw error

      // Update categories
      await supabase.from('project_category_assignments').delete().eq('project_id', id!)
      if (selectedCategories.length > 0) {
        await supabase.from('project_category_assignments').insert(
          selectedCategories.map((catId) => ({ project_id: id!, category_id: catId }))
        )
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['my-projects'] })
      toast.success('Projeto atualizado!')
      navigate(`/dashboard/projeto/${id}`)
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? ''
      toast.error(msg || 'Erro ao atualizar projeto.')
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Guard: only owner can edit
  if (project && project.client_id !== user?.id) {
    navigate('/dashboard/meus-projetos')
    return null
  }

  const toggleCategory = (id: string) =>
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
        >
          <ChevronLeft size={16} /> Voltar
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Editar projeto</h1>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Informações</h2>

          <div className="space-y-1.5">
            <Label htmlFor="title" required>Título</Label>
            <Input id="title" error={errors.title?.message} {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" required>Descrição</Label>
            <textarea
              id="description"
              rows={5}
              className={cn(
                'flex w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none',
                'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors',
                errors.description ? 'border-red-400' : 'border-slate-300'
              )}
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select id="status" {...register('status')}>
              <option value="open">Aberto</option>
              <option value="in_negotiation">Em negociação</option>
              <option value="in_progress">Em andamento</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="budget_min">Orçamento mínimo (R$)</Label>
              <Input id="budget_min" type="number" min="0" step="0.01" {...register('budget_min')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget_max">Orçamento máximo (R$)</Label>
              <Input id="budget_max" type="number" min="0" step="0.01" {...register('budget_max')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deadline">Prazo</Label>
            <Input id="deadline" type="date" {...register('deadline')} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Localização</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city" required>Cidade</Label>
              <Input id="city" error={errors.city?.message} {...register('city')} />
              {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state" required>Estado</Label>
              <Select id="state" error={errors.state?.message} {...register('state')}>
                <option value="">UF</option>
                {BR_STATES.map((s) => (
                  <option key={s.uf} value={s.uf}>{s.uf} — {s.name}</option>
                ))}
              </Select>
              {errors.state && <p className="text-xs text-red-500">{errors.state.message}</p>}
            </div>
          </div>
        </div>

        {allCategories.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <h2 className="font-semibold text-slate-800">Categorias</h2>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => {
                const active = selectedCategories.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                      active
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-slate-300 text-slate-600 hover:border-primary-400'
                    )}
                  >
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 pb-6">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" isLoading={mutation.isPending}>
            <Save size={16} /> Salvar alterações
          </Button>
        </div>
      </form>

      {/* Milestones — edição independente do form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <ListChecks size={16} className="text-primary-500" />
            Marcos de progresso
          </h2>
          {milestones.length > 0 && (
            <span className="text-xs text-slate-400">
              {milestones.filter((m) => m.is_done).length}/{milestones.length} concluídos
            </span>
          )}
        </div>

        {milestones.length > 0 && (
          <div className="space-y-2">
            {milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-3 group">
                <button
                  type="button"
                  onClick={() => toggleMilestone.mutate({ milestoneId: m.id, isDone: !m.is_done })}
                  className="shrink-0"
                >
                  <CheckCircle2
                    size={18}
                    className={m.is_done
                      ? 'fill-primary-600 text-primary-600'
                      : 'text-slate-300 hover:text-primary-400 transition-colors'}
                  />
                </button>
                <span className={cn(
                  'flex-1 text-sm',
                  m.is_done ? 'line-through text-slate-400' : 'text-slate-700'
                )}>
                  {m.title}
                </span>
                <button
                  type="button"
                  onClick={() => deleteMilestone.mutate(m.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new milestone */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newMilestone}
            onChange={(e) => setNewMilestone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newMilestone.trim()) {
                e.preventDefault()
                addMilestone.mutate(newMilestone)
              }
            }}
            placeholder="Adicionar marco... (Enter para confirmar)"
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!newMilestone.trim() || addMilestone.isPending}
            onClick={() => addMilestone.mutate(newMilestone)}
          >
            <Plus size={15} />
          </Button>
        </div>
      </div>
    </div>
  )
}
