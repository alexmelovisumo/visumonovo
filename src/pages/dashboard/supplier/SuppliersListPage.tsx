import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Package, Tag, Store, ChevronLeft, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────

interface ProductWithSupplier {
  id: string
  supplier_id: string
  name: string
  description: string | null
  price: number | null
  category: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  supplier: {
    full_name: string | null
    phone: string | null
    email: string
    city: string | null
    state: string | null
  } | null
}

// ─── Fetch ────────────────────────────────────────────────────

async function fetchProducts(): Promise<ProductWithSupplier[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      supplier:profiles!supplier_id (
        full_name, phone, email, city, state
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as ProductWithSupplier[]
}

// ─── Categories ───────────────────────────────────────────────

const CATEGORIES = [
  'Todos',
  'ACM',
  'Adesivos',
  'Lonas',
  'PVC',
  'Acrílico',
  'Impressão Digital',
  'Equipamentos',
  'Acessórios',
  'Outros',
]

// ─── Product Card ─────────────────────────────────────────────

function ProductCard({ product }: { product: ProductWithSupplier }) {
  const handleContact = () => {
    const phone = product.supplier?.phone?.replace(/\D/g, '')
    const msg = encodeURIComponent(`Olá! Tenho interesse no produto: ${product.name}`)
    if (phone) {
      window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank')
    } else if (product.supplier?.email) {
      window.location.href = `mailto:${product.supplier.email}?subject=Interesse em ${product.name}&body=${decodeURIComponent(msg)}`
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col">
      {/* Image */}
      <div className="w-full h-44 bg-slate-100 shrink-0 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={36} className="text-slate-300" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {product.category && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Tag size={11} />
            <span>{product.category}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-slate-500 border-t border-slate-100 pt-2 mt-auto">
          <Store size={11} />
          <span className="font-medium truncate">{product.supplier?.full_name ?? '—'}</span>
          {product.supplier?.city && (
            <span className="text-slate-400 truncate">· {product.supplier.city}/{product.supplier.state}</span>
          )}
        </div>

        {product.price != null && (
          <p className="text-base font-black text-primary-600">
            R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        )}

        <button
          onClick={handleContact}
          className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
        >
          <MessageCircle size={15} />
          Entrar em contato
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function SuppliersListPage() {
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('Todos')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['suppliers-catalog'],
    queryFn: fetchProducts,
  })

  const filtered = products.filter((p) => {
    const term = search.toLowerCase()
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(term) ||
      (p.description ?? '').toLowerCase().includes(term) ||
      (p.supplier?.full_name ?? '').toLowerCase().includes(term)

    const matchesCategory = category === 'Todos' || p.category === category

    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/home"
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catálogo de Fornecedores</h1>
          <p className="text-sm text-slate-500">Materiais e insumos para comunicação visual</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produtos ou fornecedores..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Package size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-600">Nenhum produto encontrado</p>
          <p className="text-sm text-slate-400 mt-1">Tente ajustar os filtros</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-400">{filtered.length} produto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
