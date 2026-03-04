import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ChevronLeft,
  MapPin,
  Phone,
  Mail,
  Package,
  Store,
  Search,
  Tag,
  MessageCircle,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// ─── Types ────────────────────────────────────────────────────

interface SupplierProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  city: string | null
  state: string | null
  phone: string | null
  email: string
  website: string | null
  company_name: string | null
  user_type: string
}

interface SupplierProduct {
  id: string
  title: string
  description: string | null
  price: number | null
  category: string | null
  image_url: string | null
  is_active: boolean
}

// ─── Quote Modal ──────────────────────────────────────────────

function QuoteModal({
  supplierId,
  requesterId,
  product,
  onClose,
}: {
  supplierId: string
  requesterId: string
  product: { id: string; title: string } | null
  onClose: () => void
}) {
  const [message,  setMessage]  = useState('')
  const [quantity, setQuantity] = useState('')

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('quote_requests').insert({
        requester_id:  requesterId,
        supplier_id:   supplierId,
        product_id:    product?.id ?? null,
        product_title: product?.title ?? null,
        message:       message.trim(),
        quantity:      quantity.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Cotação enviada! O fornecedor responderá em breve.')
      onClose()
    },
    onError: () => toast.error('Erro ao enviar cotação.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Solicitar cotação</h3>
          {product && (
            <p className="text-sm text-slate-500 mt-0.5">Produto: <strong>{product.title}</strong></p>
          )}
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Descreva o que você precisa *
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
              placeholder="Ex: Preciso de 50 banners 3×1m em lona com impressão digital frente e verso..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Quantidade / metragem (opcional)
            </label>
            <input
              className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: 50 unidades, 100m², etc."
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
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
            disabled={message.trim().length < 10 || send.isPending}
            onClick={() => send.mutate()}
          >
            {send.isPending ? 'Enviando...' : 'Enviar cotação'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Fetch ────────────────────────────────────────────────────

async function fetchSupplier(id: string): Promise<SupplierProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, bio, city, state, phone, email, website, company_name, user_type')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as SupplierProfile
}

async function fetchSupplierProducts(supplierId: string): Promise<SupplierProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, title, description, price, category, image_url, is_active')
    .eq('supplier_id', supplierId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as SupplierProduct[]
}

// ─── Product Card ─────────────────────────────────────────────

function ProductCard({
  product,
  supplier,
  onQuote,
}: {
  product: SupplierProduct
  supplier: SupplierProfile
  onQuote: (product: { id: string; title: string }) => void
}) {
  const handleContact = () => {
    const phone = supplier.phone?.replace(/\D/g, '')
    const msg = encodeURIComponent(`Olá! Tenho interesse no produto: ${product.title}`)
    if (phone) {
      window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank')
    } else {
      window.location.href = `mailto:${supplier.email}?subject=Interesse em ${product.title}&body=${decodeURIComponent(msg)}`
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col">
      <div className="w-full h-44 bg-slate-100 shrink-0 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={36} className="text-slate-300" />
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">
          {product.title}
        </h3>

        {product.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {product.category && (
          <div className="flex items-center gap-1.5 text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full self-start">
            <Tag size={10} />
            <span>{product.category}</span>
          </div>
        )}

        {product.price != null && (
          <p className="text-base font-black text-primary-600 mt-auto">
            R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        )}

        <div className="mt-1 flex flex-col gap-2">
          <button
            onClick={() => onQuote({ id: product.id, title: product.title })}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <FileText size={15} />
            Solicitar cotação
          </button>
          <button
            onClick={handleContact}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <MessageCircle size={14} />
            Contato direto
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuthStore()
  const [search, setSearch] = useState('')
  const [quoteProduct, setQuoteProduct] = useState<{ id: string; title: string } | null | false>(false)
  // false = closed, null = general quote, { id, title } = product quote

  const { data: supplier, isLoading: loadingSupplier } = useQuery({
    queryKey: ['supplier-profile', id],
    queryFn: () => fetchSupplier(id!),
    enabled: !!id,
  })

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['supplier-products', id],
    queryFn: () => fetchSupplierProducts(id!),
    enabled: !!id,
  })

  const filtered = products.filter((p) => {
    const term = search.toLowerCase()
    return (
      !search ||
      p.title.toLowerCase().includes(term) ||
      (p.description ?? '').toLowerCase().includes(term) ||
      (p.category ?? '').toLowerCase().includes(term)
    )
  })

  const isLoading = loadingSupplier || loadingProducts
  const canContact = user?.id !== id

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="text-center py-20 text-slate-500">
        Fornecedor não encontrado.
      </div>
    )
  }

  const displayName = supplier.company_name || supplier.full_name || 'Fornecedor'
  const phone = supplier.phone?.replace(/\D/g, '')
  const whatsappUrl = phone
    ? `https://wa.me/55${phone}?text=${encodeURIComponent(`Olá ${displayName}, vim pelo Visumo e gostaria de mais informações.`)}`
    : null

  const typeLabel: Record<string, string> = {
    fornecedor: 'Fornecedor',
    fornecedor_empresa: 'Empresa Fornecedora',
  }

  return (
    <div className="space-y-6">
      {/* Quote Modal */}
      {quoteProduct !== false && user && profile && (
        <QuoteModal
          supplierId={id!}
          requesterId={user.id}
          product={quoteProduct}
          onClose={() => setQuoteProduct(false)}
        />
      )}

      {/* Header nav */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/fornecedores"
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <span className="text-sm text-slate-500">Catálogo de Fornecedores</span>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
            {supplier.avatar_url ? (
              <img
                src={supplier.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Store size={32} className="text-slate-300" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-slate-900">{displayName}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                {typeLabel[supplier.user_type] ?? 'Fornecedor'}
              </span>
            </div>

            {(supplier.city || supplier.state) && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-2">
                <MapPin size={13} />
                <span>
                  {[supplier.city, supplier.state].filter(Boolean).join(' / ')}
                </span>
              </div>
            )}

            {supplier.bio && (
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                {supplier.bio}
              </p>
            )}

            {/* Contact buttons */}
            {canContact && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setQuoteProduct(null)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
                >
                  <FileText size={14} />
                  Solicitar cotação
                </button>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
                  >
                    <Phone size={14} />
                    WhatsApp
                  </a>
                )}
                <a
                  href={`mailto:${supplier.email}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  <Mail size={14} />
                  E-mail
                </a>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="shrink-0 text-center bg-slate-50 rounded-xl p-4 min-w-[80px]">
            <p className="text-2xl font-black text-primary-600">{products.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">produto{products.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Products section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-slate-900">Produtos</h2>

          {products.length > 4 && (
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 w-56"
              />
            </div>
          )}
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Package size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">Nenhum produto cadastrado</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <p className="text-slate-500">Nenhum produto encontrado para "{search}"</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400">
              {filtered.length} produto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  supplier={supplier}
                  onQuote={setQuoteProduct}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
