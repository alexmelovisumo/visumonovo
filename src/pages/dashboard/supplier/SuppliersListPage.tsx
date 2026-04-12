import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Package, Tag, Store, ChevronLeft, MessageCircle, BadgeCheck, Crown, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { FavoriteButton } from '@/components/common/FavoriteButton'

// ─── Types ────────────────────────────────────────────────────

interface ProductWithSupplier {
  id: string
  supplier_id: string
  name: string
  description: string | null
  price: number | null
  unit: string | null
  category: string | null
  image_url: string | null
  is_active: boolean
  is_featured: boolean
  created_at: string
  supplier: {
    full_name: string | null
    phone: string | null
    email: string
    city: string | null
    state: string | null
    is_verified: boolean
    is_featured: boolean
  } | null
}

// ─── Fetch ────────────────────────────────────────────────────

async function fetchProducts(): Promise<ProductWithSupplier[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      supplier:profiles!supplier_id (
        full_name, phone, email, city, state, is_verified, is_featured
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

function ProductCard({
  product,
  avgRating,
  ratingCount,
}: {
  product: ProductWithSupplier
  avgRating: number | null
  ratingCount: number
}) {
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
    <div className={`relative bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-all flex flex-col ${product.is_featured ? 'border-amber-300 shadow-amber-100' : 'border-slate-200'}`}>
      {product.is_featured && (
        <div className="bg-amber-400 text-white text-[10px] font-bold px-3 py-1 flex items-center gap-1">
          <Star size={10} fill="white" /> DESTAQUE
        </div>
      )}
      <div className="absolute top-2 right-2 z-10">
        <FavoriteButton entityType="supplier" entityId={product.supplier_id} />
      </div>
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
          <Link
            to={`/dashboard/fornecedor/${product.supplier_id}`}
            className="font-medium truncate hover:text-primary-600 hover:underline transition-colors inline-flex items-center gap-1"
          >
            {product.supplier?.full_name ?? '—'}
            {product.supplier?.is_verified && (
              <BadgeCheck size={12} className="text-blue-500 shrink-0" />
            )}
            {product.supplier?.is_featured && (
              <Crown size={12} className="text-amber-500 shrink-0" />
            )}
          </Link>
          {product.supplier?.city && (
            <span className="text-slate-400 truncate">· {product.supplier.city}/{product.supplier.state}</span>
          )}
        </div>

        {avgRating !== null && (
          <div className="flex items-center gap-1 text-xs">
            <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
            <span className="font-semibold text-slate-700">{avgRating.toFixed(1)}</span>
            <span className="text-slate-400">({ratingCount})</span>
          </div>
        )}

        {product.price != null && (
          <p className="text-base font-black text-primary-600">
            R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            {product.unit && <span className="text-xs font-normal text-slate-400 ml-1">/ {product.unit}</span>}
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

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'rating'

const PAGE_SIZE = 12

export function SuppliersListPage() {
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('Todos')
  const [sort, setSort]         = useState<SortOption>('newest')
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE)

  useEffect(() => { setDisplayLimit(PAGE_SIZE) }, [search, category, sort])

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['suppliers-catalog'],
    queryFn: fetchProducts,
  })

  const { data: ratingsMap = {} } = useQuery({
    queryKey: ['suppliers-ratings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('supplier_reviews')
        .select('supplier_id, rating')
      const map: Record<string, { sum: number; count: number }> = {}
      for (const r of data ?? []) {
        if (!map[r.supplier_id]) map[r.supplier_id] = { sum: 0, count: 0 }
        map[r.supplier_id].sum   += r.rating
        map[r.supplier_id].count += 1
      }
      return map
    },
  })

  const filtered = products
    .filter((p) => {
      const term = search.toLowerCase()
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(term) ||
        (p.description ?? '').toLowerCase().includes(term) ||
        (p.supplier?.full_name ?? '').toLowerCase().includes(term)

      const matchesCategory = category === 'Todos' || p.category === category

      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      // Featured suppliers first
      const aFeat = a.supplier?.is_featured ?? false
      const bFeat = b.supplier?.is_featured ?? false
      if (aFeat !== bFeat) return aFeat ? -1 : 1
      if (sort === 'price_asc') return (a.price ?? Infinity) - (b.price ?? Infinity)
      if (sort === 'price_desc') return (b.price ?? -Infinity) - (a.price ?? -Infinity)
      if (sort === 'rating') {
        const rA = ratingsMap[a.supplier_id]
        const rB = ratingsMap[b.supplier_id]
        const avgA = rA ? rA.sum / rA.count : 0
        const avgB = rB ? rB.sum / rB.count : 0
        return avgB - avgA
      }
      return 0 // newest: already ordered by DB
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
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
        >
          <option value="newest">Mais recentes</option>
          <option value="rating">Melhor avaliados</option>
          <option value="price_asc">Menor preço</option>
          <option value="price_desc">Maior preço</option>
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
            {filtered.slice(0, displayLimit).map((p) => {
              const r = ratingsMap[p.supplier_id]
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  avgRating={r ? r.sum / r.count : null}
                  ratingCount={r?.count ?? 0}
                />
              )
            })}
          </div>
          {filtered.length > displayLimit && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setDisplayLimit((l) => l + PAGE_SIZE)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-primary-300 hover:text-primary-700 transition-colors"
              >
                Carregar mais ({filtered.length - displayLimit} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
