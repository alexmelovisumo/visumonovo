import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin, Phone, Globe, Store, Package, Share2, ChevronLeft,
  BadgeCheck, Tag, MessageCircle, Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useSEO } from '@/hooks/useSEO'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────

interface SupplierProfile {
  id: string
  full_name: string | null
  profile_image_url: string | null
  avatar_url: string | null
  bio: string | null
  city: string | null
  state: string | null
  phone: string | null
  website: string | null
  company_name: string | null
  is_verified: boolean
  is_active: boolean
}

interface Product {
  id: string
  title: string
  description: string | null
  price: number | null
  category: string | null
  image_url: string | null
  is_active: boolean
}

// ─── Product Card ─────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.title}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-slate-100 flex items-center justify-center">
          <Package size={32} className="text-slate-300" />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm leading-snug">{product.title}</h3>
          {product.category && (
            <span className="inline-flex items-center gap-1 text-[10px] text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full mt-1">
              <Tag size={9} /> {product.category}
            </span>
          )}
        </div>
        {product.description && (
          <p className="text-xs text-slate-500 line-clamp-2 flex-1">{product.description}</p>
        )}
        {product.price !== null && (
          <p className="text-sm font-bold text-slate-900 mt-auto">
            {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function PublicSupplierPage() {
  const { id } = useParams<{ id: string }>()

  const { data: supplier, isLoading, isError } = useQuery({
    queryKey: ['public-supplier', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, profile_image_url, avatar_url, bio, city, state, phone, website, company_name, is_verified, is_active')
        .eq('id', id!)
        .in('user_type', ['fornecedor', 'fornecedor_empresa'])
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data as SupplierProfile | null
    },
    enabled: !!id,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['public-supplier-reviews', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('supplier_reviews')
        .select('rating, comment, created_at')
        .eq('supplier_id', id!)
        .order('created_at', { ascending: false })
      return (data ?? []) as { rating: number; comment: string | null; created_at: string }[]
    },
    enabled: !!id,
  })

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null

  const { data: products = [] } = useQuery({
    queryKey: ['public-supplier-products', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, description, price, category, image_url, is_active')
        .eq('supplier_id', id!)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Product[]
    },
    enabled: !!id,
  })

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: supplier?.full_name ?? 'Fornecedor Visumo', url })
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado!')
    }
  }

  useSEO({
    title:       supplier?.company_name ?? supplier?.full_name ?? '',
    description: supplier?.bio?.slice(0, 160) ?? undefined,
    image:       (supplier?.profile_image_url ?? supplier?.avatar_url) ?? undefined,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !supplier) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-center px-4">
        <Store size={40} className="text-slate-300" />
        <h1 className="text-xl font-bold text-slate-700">Fornecedor não encontrado</h1>
        <p className="text-slate-400 text-sm">Este perfil não existe ou não está mais disponível.</p>
        <Link to="/" className="text-primary-600 hover:underline text-sm">Voltar ao início</Link>
      </div>
    )
  }

  const displayName = supplier.company_name ?? supplier.full_name ?? 'Fornecedor'
  const avatar = supplier.profile_image_url ?? supplier.avatar_url
  const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const whatsappPhone = supplier.phone?.replace(/\D/g, '')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">V</span>
          </div>
          <span className="font-bold text-primary-700 text-base">Visumo</span>
        </Link>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 transition-colors"
        >
          <Share2 size={16} /> Compartilhar
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Back */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft size={16} /> Voltar
        </Link>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          {avatar ? (
            <img src={avatar} alt={displayName} className="w-24 h-24 rounded-2xl object-cover shrink-0 self-start" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-primary-100 flex items-center justify-center shrink-0 self-start">
              <span className="text-primary-700 text-2xl font-bold">{initials}</span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{displayName}</h1>
                {supplier.is_verified && (
                  <BadgeCheck size={18} className="text-blue-500 shrink-0" />
                )}
              </div>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-700 mt-1 inline-block">
                Fornecedor
              </span>
              {avgRating !== null && (
                <div className="flex items-center gap-1.5 mt-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      className={s <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                    />
                  ))}
                  <span className="text-sm font-semibold text-amber-600">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-slate-400">({reviews.length})</span>
                </div>
              )}
            </div>

            {supplier.bio && (
              <p className="text-sm text-slate-600 leading-relaxed">{supplier.bio}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
              {(supplier.city || supplier.state) && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {[supplier.city, supplier.state].filter(Boolean).join(', ')}
                </span>
              )}
              {supplier.website && (
                <a
                  href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                >
                  <Globe size={12} /> Site
                </a>
              )}
            </div>

            {/* Contact buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {whatsappPhone && (
                <a
                  href={`https://wa.me/55${whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  <MessageCircle size={15} /> WhatsApp
                </a>
              )}
              {supplier.phone && (
                <a
                  href={`tel:${supplier.phone}`}
                  className="inline-flex items-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  <Phone size={15} /> Ligar
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Products */}
        {products.length > 0 && (
          <section>
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Package size={16} className="text-primary-500" />
              Produtos ({products.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        {reviews.filter((r) => r.comment).length > 0 && (
          <section>
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Star size={16} className="text-amber-400 fill-amber-400" />
              Avaliações ({reviews.length})
            </h2>
            <div className="space-y-3">
              {reviews.filter((r) => r.comment).slice(0, 5).map((r, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={12}
                        className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-slate-700">{r.comment}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className={cn(
          'rounded-2xl p-6 text-center space-y-4',
          'bg-gradient-to-br from-primary-600 to-primary-800 text-white'
        )}>
          <p className="font-bold text-lg">Quer solicitar uma cotação?</p>
          <p className="text-primary-200 text-sm">Crie sua conta gratuita e entre em contato diretamente com este fornecedor.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/cadastro"
              className="bg-white text-primary-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-primary-50 transition-colors text-sm"
            >
              Criar conta grátis
            </Link>
            <Link
              to="/login"
              className="border border-primary-400 text-white font-medium px-6 py-2.5 rounded-xl hover:bg-primary-700 transition-colors text-sm"
            >
              Já tenho conta
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
