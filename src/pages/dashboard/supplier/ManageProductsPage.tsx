import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusCircle, Edit2, Trash2, Package, X, ImageIcon, ExternalLink, Copy, Star } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Product } from '@/types'

// ─── Schema ──────────────────────────────────────────────────

const UNITS = ['m²', 'm linear', 'un', 'kg', 'rolo', 'folha', 'caixa', 'litro', 'par']

const schema = z.object({
  title:       z.string().min(3, 'Nome muito curto'),
  description: z.string().optional(),
  price:       z.string().optional(),
  unit:        z.string().optional(),
  category:    z.string().optional(),
  is_featured: z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

// ─── Product Form Modal ───────────────────────────────────────

function ProductForm({
  product,
  userId,
  onClose,
}: {
  product?: Product
  userId: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url ?? null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:       product?.title ?? '',
      description: product?.description ?? '',
      price:       product?.price?.toString() ?? '',
      unit:        product?.unit ?? '',
      category:    product?.category ?? '',
      is_featured: product?.is_featured ?? false,
    },
  })

  const handleImage = (file: File | null) => {
    setImageFile(file)
    if (file) setImagePreview(URL.createObjectURL(file))
    else setImagePreview(product?.image_url ?? null)
  }

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      let imageUrl = product?.image_url ?? null

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${userId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, imageFile, { upsert: true })
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
          imageUrl = publicUrl
        }
      }

      const payload = {
        supplier_id:  userId,
        title:        data.title,
        description:  data.description || null,
        price:        data.price ? parseFloat(data.price) : null,
        unit:         data.unit || null,
        category:     data.category || null,
        image_url:    imageUrl,
        is_active:    true,
        is_featured:  data.is_featured ?? false,
      }

      if (product) {
        const { error } = await supabase.from('products').update(payload).eq('id', product.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] })
      toast.success(product ? 'Produto atualizado!' : 'Produto adicionado!')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? ''
      toast.error(msg || 'Erro ao salvar produto.')
    },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{product ? 'Editar produto' : 'Novo produto'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          {/* Image */}
          <div className="space-y-2">
            <Label>Imagem do produto</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                {imagePreview
                  ? <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                  : <Package size={24} className="text-slate-300" />
                }
              </div>
              <label className="flex-1">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 cursor-pointer hover:border-primary-300 transition-colors text-sm text-slate-600">
                  <ImageIcon size={16} />
                  {imageFile ? imageFile.name : 'Escolher imagem'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title" required>Nome do produto</Label>
            <Input id="title" placeholder="Ex: Adesivo vinil fosco" error={errors.title?.message} {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <textarea
              id="description"
              rows={3}
              placeholder="Especificações, cores disponíveis, aplicações..."
              className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input id="price" type="number" min="0" step="0.01" placeholder="0,00" {...register('price')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unidade</Label>
              <select
                id="unit"
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
                {...register('unit')}
              >
                <option value="">Selecione</option>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Categoria</Label>
            <Input id="category" placeholder="Ex: Adesivos, Impressão, Sinalização" {...register('category')} />
          </div>

          {/* Destaque */}
          <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2">
              <Star size={16} className={watch('is_featured') ? 'text-amber-500' : 'text-slate-400'} />
              <div>
                <p className="text-sm font-medium text-slate-800">Produto em destaque</p>
                <p className="text-xs text-slate-400">Aparece com badge dourado na listagem</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setValue('is_featured', !watch('is_featured'))}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${watch('is_featured') ? 'bg-amber-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${watch('is_featured') ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" isLoading={mutation.isPending}>
              {product ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Product Card ─────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onDelete,
  deleting,
}: {
  product: Product
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  return (
    <div className={`bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-all group ${product.is_featured ? 'border-amber-300' : 'border-slate-200 hover:border-primary-300'}`}>
      {/* Featured badge */}
      {product.is_featured && (
        <div className="bg-amber-400 text-white text-[10px] font-bold px-3 py-1 flex items-center gap-1">
          <Star size={10} fill="white" /> DESTAQUE
        </div>
      )}
      {/* Image */}
      <div className="w-full h-40 bg-slate-100 flex items-center justify-center overflow-hidden">
        {product.image_url
          ? <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <Package size={32} className="text-slate-300" />
        }
      </div>

      <div className="p-4 space-y-2">
        <div>
          <p className="font-semibold text-slate-900 text-sm truncate">{product.title}</p>
          {product.category && (
            <p className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full inline-block mt-1">
              {product.category}
            </p>
          )}
        </div>

        {product.description && (
          <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
        )}

        {product.price && (
          <p className="text-sm font-semibold text-slate-800">
            {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            {product.unit && <span className="text-xs font-normal text-slate-400 ml-1">/ {product.unit}</span>}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onEdit} className="flex-1">
            <Edit2 size={13} /> Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={onDelete}
            isLoading={deleting}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function ManageProductsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['my-products', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Product[]
    },
    enabled: !!user?.id,
  })

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] })
      toast.success('Produto removido.')
      setDeletingId(null)
    },
    onError: () => {
      toast.error('Erro ao remover produto.')
      setDeletingId(null)
    },
  })

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingProduct(undefined)
  }

  const publicUrl = user ? `${window.location.origin}/fornecedor/${user.id}` : ''

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    toast.success('Link copiado!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus produtos</h1>
          <p className="text-slate-500 text-sm mt-1">
            {products.length} produto{products.length !== 1 ? 's' : ''} no catálogo
          </p>
        </div>
        <Button onClick={() => { setEditingProduct(undefined); setShowForm(true) }}>
          <PlusCircle size={16} /> Novo produto
        </Button>
      </div>

      {/* Public profile banner */}
      {user && (
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 space-y-3">
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-primary-800">Seu perfil público</p>
            <p className="text-xs text-primary-600 truncate mt-0.5">{publicUrl}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-primary-700 bg-white border border-primary-200 px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors"
            >
              <Copy size={13} /> Copiar link
            </button>
            <Link
              to={`/fornecedor/${user.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-primary-600 px-3 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <ExternalLink size={13} /> Visualizar
            </Link>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Package size={28} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Nenhum produto cadastrado</h3>
          <p className="text-sm text-slate-400 mb-6">
            Adicione seus produtos para aumentar sua visibilidade.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <PlusCircle size={16} /> Adicionar primeiro produto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => openEdit(product)}
              onDelete={() => {
                if (confirm('Remover este produto?')) {
                  setDeletingId(product.id)
                  deleteProduct.mutate(product.id)
                }
              }}
              deleting={deletingId === product.id && deleteProduct.isPending}
            />
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          userId={user!.id}
          onClose={closeForm}
        />
      )}
    </div>
  )
}
