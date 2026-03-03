import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusCircle, Edit2, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProjectCategory } from '@/types'

// ─── Schema ──────────────────────────────────────────────────

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const schema = z.object({
  name:          z.string().min(2, 'Nome muito curto'),
  slug:          z.string().min(2, 'Slug inválido').regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  description:   z.string().optional(),
  icon:          z.string().optional(),
  display_order: z.string().optional(),
  is_active:     z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

// ─── Form Modal ───────────────────────────────────────────────

function CategoryModal({
  category,
  onClose,
}: {
  category?: ProjectCategory
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:          category?.name ?? '',
      slug:          category?.slug ?? '',
      description:   category?.description ?? '',
      icon:          category?.icon ?? '',
      display_order: category?.display_order.toString() ?? '0',
      is_active:     category?.is_active ?? true,
    },
  })

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setValue('name', name)
    if (!category) {
      setValue('slug', slugify(name))
    }
  }

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name:          data.name,
        slug:          data.slug,
        description:   data.description || null,
        icon:          data.icon || null,
        display_order: data.display_order ? parseInt(data.display_order) : 0,
        is_active:     data.is_active ?? true,
      }
      if (category) {
        const { error } = await supabase.from('project_categories').update(payload).eq('id', category.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('project_categories').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['project-categories'] })
      toast.success(category ? 'Categoria atualizada!' : 'Categoria criada!')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? ''
      toast.error(msg.includes('duplicate') ? 'Slug já existe.' : msg || 'Erro ao salvar.')
    },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{category ? 'Editar categoria' : 'Nova categoria'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div className="flex gap-3">
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="name" required>Nome</Label>
              <Input
                id="name"
                placeholder="Ex: Sinalização"
                error={errors.name?.message}
                {...register('name')}
                onChange={handleNameChange}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5 w-16">
              <Label htmlFor="icon">Ícone</Label>
              <Input id="icon" placeholder="🔧" className="text-center text-lg" {...register('icon')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug" required>Slug (URL)</Label>
            <Input
              id="slug"
              placeholder="sinalizacao"
              error={errors.slug?.message}
              {...register('slug')}
            />
            {errors.slug && <p className="text-xs text-red-500">{errors.slug.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" placeholder="Breve descrição da categoria" {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="display_order">Ordem</Label>
              <Input id="display_order" type="number" min="0" {...register('display_order')} />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary-600" {...register('is_active')} />
                <span className="text-sm text-slate-700">Ativa</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" isLoading={mutation.isPending}>
              {category ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function CategoryManagementPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ProjectCategory | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_categories')
        .select('*')
        .order('display_order', { ascending: true })
      if (error) throw error
      return data as ProjectCategory[]
    },
  })

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['project-categories'] })
      toast.success('Categoria removida.')
      setDeletingId(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? ''
      toast.error(msg.includes('foreign key') ? 'Categoria em uso por projetos.' : msg || 'Erro ao remover.')
      setDeletingId(null)
    },
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('project_categories').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['project-categories'] })
    },
    onError: () => toast.error('Erro ao atualizar.'),
    onSettled: () => setTogglingId(null),
  })

  const openEdit = (cat: ProjectCategory) => { setEditing(cat); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(undefined) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categorias de projetos</h1>
          <p className="text-slate-500 text-sm mt-1">{categories.length} categorias cadastradas</p>
        </div>
        <Button onClick={() => { setEditing(undefined); setShowModal(true) }}>
          <PlusCircle size={16} /> Nova categoria
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <p className="text-center text-slate-400 py-16">Nenhuma categoria cadastrada.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs w-8">Ord.</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden sm:table-cell">Slug</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden md:table-cell">Descrição</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs">Ativa</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className={`hover:bg-slate-50 transition-colors ${!cat.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-slate-400 text-xs">{cat.display_order}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {cat.icon && <span className="text-lg">{cat.icon}</span>}
                        <span className="font-medium text-slate-900">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{cat.slug}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500 max-w-[200px] truncate">
                      {cat.description ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setTogglingId(cat.id)
                          toggleActive.mutate({ id: cat.id, is_active: !cat.is_active })
                        }}
                        disabled={togglingId === cat.id && toggleActive.isPending}
                        className="text-slate-400 hover:text-primary-600 transition-colors"
                      >
                        {cat.is_active
                          ? <ToggleRight size={22} className="text-green-500" />
                          : <ToggleLeft size={22} />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(cat)}>
                          <Edit2 size={13} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          isLoading={deletingId === cat.id && deleteCategory.isPending}
                          onClick={() => {
                            if (confirm(`Remover "${cat.name}"?`)) {
                              setDeletingId(cat.id)
                              deleteCategory.mutate(cat.id)
                            }
                          }}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <CategoryModal category={editing} onClose={closeModal} />}
    </div>
  )
}
