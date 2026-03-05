import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, X, ChevronLeft, ImageIcon, LayoutTemplate, Save } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { BR_STATES } from '@/utils/constants'
import type { ProjectCategory } from '@/types'

// ─── Schema ──────────────────────────────────────────────────

const schema = z.object({
  title:       z.string().min(5, 'Título deve ter pelo menos 5 caracteres'),
  description: z.string().min(20, 'Descrição deve ter pelo menos 20 caracteres'),
  budget_min:  z.string().optional(),
  budget_max:  z.string().optional(),
  deadline:    z.string().optional(),
  city:        z.string().min(2, 'Cidade é obrigatória'),
  state:       z.string().length(2, 'Selecione o estado'),
})

type FormData = z.infer<typeof schema>

// ─── Template type ────────────────────────────────────────────

interface ProjectTemplate {
  id:           string
  title:        string
  description:  string | null
  budget_min:   number | null
  budget_max:   number | null
  city:         string | null
  state:        string | null
  category_ids: string[] | null
  created_at:   string
}

// ─── Template Modal ───────────────────────────────────────────

function TemplateModal({
  templates,
  onUse,
  onDelete,
  onClose,
}: {
  templates: ProjectTemplate[]
  onUse: (t: ProjectTemplate) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <LayoutTemplate size={17} /> Meus templates
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 flex-1 pr-1">
          {templates.map((t) => (
            <div key={t.id} className="border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{t.description}</p>
                )}
                {(t.city || t.state) && (
                  <p className="text-xs text-slate-400 mt-0.5">{[t.city, t.state].filter(Boolean).join(', ')}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Button size="sm" onClick={() => { onUse(t); onClose() }}>
                  Usar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 px-2"
                  onClick={() => onDelete(t.id)}
                >
                  <X size={12} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Category Picker ─────────────────────────────────────────

function CategoryPicker({
  categories,
  selected,
  onChange,
}: {
  categories: ProjectCategory[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const active = selected.includes(cat.id)
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => toggle(cat.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
              active
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'border-slate-300 text-slate-600 hover:border-primary-400 hover:text-primary-600'
            )}
          >
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}

// ─── Image Upload ─────────────────────────────────────────────

function ImageUpload({ images, onChange }: { images: File[]; onChange: (f: File[]) => void }) {
  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (images.length + valid.length > 5) {
      toast.error('Máximo 5 imagens por projeto')
      return
    }
    onChange([...images, ...valid])
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((file, i) => (
          <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        {images.length < 5 && (
          <label className="w-24 h-24 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 cursor-pointer hover:border-primary-400 hover:text-primary-500 transition-colors">
            <ImageIcon size={20} />
            <span className="text-xs mt-1">Adicionar</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </label>
        )}
      </div>
      <p className="text-xs text-slate-400">Até 5 imagens (JPG, PNG, WebP). Opcional.</p>
    </div>
  )
}

// ─── Upload to Storage ────────────────────────────────────────

async function uploadImages(projectId: string, files: File[]): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    const ext = file.name.split('.').pop()
    const path = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('project-images').upload(path, file)
    if (error) { console.warn('Upload error:', error.message); continue }
    const { data: { publicUrl } } = supabase.storage.from('project-images').getPublicUrl(path)
    urls.push(publicUrl)
  }
  return urls
}

// ─── Page ─────────────────────────────────────────────────────

export function CreateProjectPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [images, setImages]                         = useState<File[]>([])
  const [isUrgent, setIsUrgent]                     = useState(false)
  const [showTemplateModal, setShowTemplateModal]   = useState(false)

  const { data: categories = [] } = useQuery({
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

  const { data: templates = [] } = useQuery({
    queryKey: ['my-templates', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_templates')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false })
      return (data ?? []) as ProjectTemplate[]
    },
    enabled: !!user?.id,
  })

  const { register, handleSubmit, formState: { errors }, setValue, getValues } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { city: profile?.city ?? '', state: profile?.state ?? '' },
  })

  const applyTemplate = (t: ProjectTemplate) => {
    setValue('title',       t.title)
    setValue('description', t.description ?? '')
    setValue('budget_min',  t.budget_min != null ? String(t.budget_min) : '')
    setValue('budget_max',  t.budget_max != null ? String(t.budget_max) : '')
    setValue('city',        t.city ?? '')
    setValue('state',       (t.state ?? '') as FormData['state'])
    setSelectedCategories(t.category_ids ?? [])
    toast.success('Template carregado!')
  }

  const saveTemplate = useMutation({
    mutationFn: async () => {
      const data = getValues()
      const { error } = await supabase.from('project_templates').insert({
        owner_id:     user!.id,
        title:        data.title,
        description:  data.description || null,
        budget_min:   data.budget_min ? parseFloat(data.budget_min) : null,
        budget_max:   data.budget_max ? parseFloat(data.budget_max) : null,
        city:         data.city || null,
        state:        data.state || null,
        category_ids: selectedCategories,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Salvo como template!')
      queryClient.invalidateQueries({ queryKey: ['my-templates', user?.id] })
    },
    onError: () => toast.error('Erro ao salvar template'),
  })

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Template removido')
      queryClient.invalidateQueries({ queryKey: ['my-templates', user?.id] })
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!user) throw new Error('Não autenticado')

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          client_id:   user.id,
          title:       data.title,
          description: data.description,
          budget_min:  data.budget_min ? parseFloat(data.budget_min) : null,
          budget_max:  data.budget_max ? parseFloat(data.budget_max) : null,
          deadline:    data.deadline || null,
          city:        data.city,
          state:       data.state,
          status:      'open',
          is_urgent:   isUrgent,
        })
        .select()
        .single()

      if (error) throw error

      if (selectedCategories.length > 0) {
        await supabase.from('project_category_assignments').insert(
          selectedCategories.map((catId) => ({ project_id: project.id, category_id: catId }))
        )
      }

      if (images.length > 0) {
        const urls = await uploadImages(project.id, images)
        if (urls.length > 0) {
          await supabase.from('project_images').insert(
            urls.map((url, i) => ({ project_id: project.id, image_url: url, display_order: i }))
          )
        }
      }

      return project
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['my-projects'] })
      queryClient.invalidateQueries({ queryKey: ['empresa-stats'] })
      toast.success('Projeto publicado com sucesso!')
      navigate(`/dashboard/projeto/${project.id}`)
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? ''
      toast.error(msg || 'Erro ao criar projeto. Tente novamente.')
    },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
        >
          <ChevronLeft size={16} /> Voltar
        </button>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Criar novo projeto</h1>
            <p className="text-slate-500 text-sm mt-1">
              Publique seu projeto e receba propostas de profissionais qualificados.
            </p>
          </div>
          {templates.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 flex items-center gap-1.5"
              onClick={() => setShowTemplateModal(true)}
            >
              <LayoutTemplate size={14} /> Templates ({templates.length})
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        {/* Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Informações do projeto</h2>

          <div className="space-y-1.5">
            <Label htmlFor="title" required>Título</Label>
            <Input
              id="title"
              placeholder="Ex: Adesivação de frota de veículos"
              error={errors.title?.message}
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" required>Descrição detalhada</Label>
            <textarea
              id="description"
              rows={5}
              placeholder="Descreva o projeto: tipo de serviço, materiais preferidos, quantidade, local de execução, etc."
              className={cn(
                'flex w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none',
                'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors',
                errors.description ? 'border-red-400' : 'border-slate-300'
              )}
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="budget_min">Orçamento mínimo (R$)</Label>
              <Input id="budget_min" type="number" min="0" step="0.01" placeholder="0,00" {...register('budget_min')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget_max">Orçamento máximo (R$)</Label>
              <Input id="budget_max" type="number" min="0" step="0.01" placeholder="0,00" {...register('budget_max')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deadline">Prazo desejado</Label>
            <Input id="deadline" type="date" min={new Date().toISOString().split('T')[0]} {...register('deadline')} />
          </div>

          {/* Urgente */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setIsUrgent((v) => !v)}
              className={cn(
                'w-10 h-6 rounded-full transition-colors flex items-center px-0.5',
                isUrgent ? 'bg-red-500' : 'bg-slate-200'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-full bg-white shadow transition-transform',
                isUrgent ? 'translate-x-4' : 'translate-x-0'
              )} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">Projeto urgente</p>
              <p className="text-xs text-slate-400">Aparece com destaque vermelho na listagem</p>
            </div>
          </label>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Localização</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city" required>Cidade</Label>
              <Input id="city" placeholder="Ex: São Paulo" error={errors.city?.message} {...register('city')} />
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

        {/* Categories */}
        {categories.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <div>
              <h2 className="font-semibold text-slate-800">Categorias</h2>
              <p className="text-xs text-slate-500 mt-0.5">Ajuda os profissionais certos a encontrarem seu projeto</p>
            </div>
            <CategoryPicker categories={categories} selected={selectedCategories} onChange={setSelectedCategories} />
          </div>
        )}

        {/* Images */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <div>
            <h2 className="font-semibold text-slate-800">Imagens de referência</h2>
            <p className="text-xs text-slate-500 mt-0.5">Fotos do local ou referências visuais ajudam os profissionais</p>
          </div>
          <ImageUpload images={images} onChange={setImages} />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-6 flex-wrap">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1 min-w-[120px]">
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-1.5 shrink-0 text-slate-600"
            isLoading={saveTemplate.isPending}
            onClick={() => saveTemplate.mutate()}
          >
            <Save size={15} /> Salvar template
          </Button>
          <Button type="submit" className="flex-1 min-w-[120px]" isLoading={mutation.isPending}>
            <Upload size={16} />
            Publicar projeto
          </Button>
        </div>
      </form>

      {showTemplateModal && (
        <TemplateModal
          templates={templates}
          onUse={applyTemplate}
          onDelete={(id) => deleteTemplate.mutate(id)}
          onClose={() => setShowTemplateModal(false)}
        />
      )}
    </div>
  )
}
