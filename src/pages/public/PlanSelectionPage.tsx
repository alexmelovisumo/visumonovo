import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Tag, X, Check, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { createFreeSubscription, createPendingSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SubscriptionPlan } from '@/types'

// ─── Fetch all active plans ───────────────────────────────────

async function fetchAllPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as SubscriptionPlan[]
}

// ─── Coupon validation ────────────────────────────────────────

interface CouponResult {
  valid: boolean
  discountPct: number
  label: string
  code: string
}

async function validateCoupon(code: string): Promise<CouponResult> {
  const normalized = code.trim().toUpperCase()

  const { data } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', normalized)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return { valid: false, discountPct: 0, label: '', code: normalized }

  if (data.valid_until && new Date(data.valid_until) < new Date())
    return { valid: false, discountPct: 0, label: '', code: normalized }

  if (data.max_uses !== null && data.current_uses >= data.max_uses)
    return { valid: false, discountPct: 0, label: '', code: normalized }

  let discountPct = 0
  let label = ''

  if (data.type === 'percentage') {
    discountPct = data.value
    label = `${data.value}% de desconto`
  } else if (data.type === 'lifetime_free') {
    discountPct = 100
    label = 'GRÁTIS PARA SEMPRE'
  }

  return { valid: true, discountPct, label, code: normalized }
}

// ─── Plan icon map ────────────────────────────────────────────
// Ícones SVG inline para corresponder ao visual do bolt.new

function PlanIcon({ name }: { name: string }) {
  const map: Record<string, { bg: string; icon: React.ReactNode }> = {
    plano_profissional: {
      bg: 'bg-green-500',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    plano_fornecedor: {
      bg: 'bg-orange-500',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      ),
    },
    plano_empresa: {
      bg: 'bg-blue-600',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    plano_fornecedor_empresa: {
      bg: 'bg-blue-500',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    plano_empresa_prestadora: {
      bg: 'bg-teal-500',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
    },
  }

  const config = map[name] ?? { bg: 'bg-slate-500', icon: null }

  return (
    <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center shrink-0', config.bg)}>
      {config.icon}
    </div>
  )
}

// ─── Plan Card ───────────────────────────────────────────────

interface PlanCardProps {
  plan: SubscriptionPlan
  coupon: CouponResult | null
  isLoading: boolean
  onSelect: (plan: SubscriptionPlan) => void
}

function PlanCard({ plan, coupon, isLoading, onSelect }: PlanCardProps) {
  const yearlyPrice = plan.price_yearly ?? 0
  const hasDiscount = coupon?.valid && coupon.discountPct > 0
  const finalPrice = hasDiscount ? Math.max(0, yearlyPrice * (1 - coupon!.discountPct / 100)) : yearlyPrice
  const monthlyEquiv = finalPrice / 12
  const isLifetimeFree = hasDiscount && finalPrice === 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:border-primary-300 transition-all flex flex-col gap-4">
      {/* Icon + Name */}
      <div className="flex items-start gap-4">
        <PlanIcon name={plan.name} />
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-slate-900 leading-tight">{plan.display_name}</h3>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{plan.display_name}</p>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{plan.description}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100" />

      {/* Price */}
      <div>
        {isLifetimeFree ? (
          <div>
            <p className="text-2xl font-black text-green-600">GRÁTIS PARA SEMPRE</p>
            {yearlyPrice > 0 && (
              <p className="text-sm text-slate-400 line-through">
                R$ {yearlyPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /ano
              </p>
            )}
          </div>
        ) : (
          <div>
            {hasDiscount && yearlyPrice > 0 && (
              <p className="text-sm text-slate-400 line-through mb-0.5">
                R$ {yearlyPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /ano
              </p>
            )}
            <p className="text-2xl font-black text-primary-600">
              R$ {finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              <span className="text-base font-medium text-slate-500"> /ano</span>
            </p>
            <p className="text-sm text-slate-400 mt-0.5">
              ou R$ {monthlyEquiv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <Button
        onClick={() => onSelect(plan)}
        isLoading={isLoading}
        className="w-full mt-auto"
      >
        Começar agora <ArrowRight size={15} />
      </Button>
    </div>
  )
}

// ─── Coupon Input ─────────────────────────────────────────────

interface CouponInputProps {
  coupon: CouponResult | null
  onApply: (code: string) => Promise<void>
  onRemove: () => void
  loading: boolean
}

function CouponInput({ coupon, onApply, onRemove, loading }: CouponInputProps) {
  const [value, setValue] = useState('')

  const handleApply = async () => {
    if (!value.trim()) return
    await onApply(value)
    setValue('')
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-md mx-auto">
      <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <Tag size={15} className="text-primary-500" /> Tem um cupom?
      </p>

      {coupon?.valid ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <Check size={16} className="text-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-green-700">{coupon.code}</span>
            <span className="text-xs text-green-600 ml-2">— {coupon.label}</span>
          </div>
          <button onClick={onRemove} className="text-green-400 hover:text-green-600 transition-colors">
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            placeholder="DIGITE O CÓDIGO"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium tracking-widest placeholder:text-slate-300 placeholder:tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition-all uppercase"
          />
          <Button onClick={handleApply} isLoading={loading} variant="outline" className="px-5 shrink-0">
            Aplicar
          </Button>
        </div>
      )}

      {coupon !== null && !coupon.valid && (
        <p className="text-xs text-red-500 mt-1.5">Cupom inválido ou expirado.</p>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────

export function PlanSelectionPage() {
  const navigate = useNavigate()
  const { user, fetchProfile } = useAuthStore()
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)
  const [coupon, setCoupon] = useState<CouponResult | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans-all'],
    queryFn: fetchAllPlans,
  })

  const handleApplyCoupon = async (code: string) => {
    setCouponLoading(true)
    try {
      const result = await validateCoupon(code)
      setCoupon(result)
      if (result.valid) toast.success(`Cupom aplicado: ${result.label}`)
      else toast.error('Cupom inválido ou expirado.')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    // Não está logado → vai para o cadastro com plano pre-selecionado
    if (!user) {
      navigate(`/cadastro?plano=${plan.name}`)
      return
    }

    setLoadingPlanId(plan.id)

    try {
      const isLifetimeFree = coupon?.valid && coupon.discountPct === 100

      if (isLifetimeFree) {
        await createFreeSubscription(user.id, plan.id)
        await fetchProfile(user.id)
        toast.success('Plano ativado com cupom!')
        navigate('/dashboard/home', { replace: true })
      } else {
        const paymentLink = plan.payment_link_yearly
        if (paymentLink) {
          await createPendingSubscription(user.id, plan.id, 'yearly', plan.price_yearly ?? 0)
          await fetchProfile(user.id)
          window.location.href = paymentLink
        } else {
          toast.info('Assinatura criada. Complete o pagamento.')
          navigate('/dashboard/aguardando-pagamento', { replace: true })
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? ''
      if (msg.includes('JWTExpired') || msg.includes('not authenticated')) {
        toast.error('Sessão expirada. Faça login novamente.')
        navigate('/login')
      } else {
        toast.error(msg || 'Erro ao selecionar plano. Tente novamente.')
      }
    } finally {
      setLoadingPlanId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header simples */}
      <header className="bg-white border-b border-slate-100 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronLeft size={16} /> Voltar
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">
            Escolha seu Plano
          </h1>
          <p className="text-slate-500 text-base">
            Selecione o tipo de perfil e veja o investimento anual
          </p>
        </div>

        {/* Coupon */}
        <div className="mb-8">
          <CouponInput
            coupon={coupon}
            onApply={handleApplyCoupon}
            onRemove={() => setCoupon(null)}
            loading={couponLoading}
          />
        </div>

        {/* Plans grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                coupon={coupon}
                isLoading={loadingPlanId === plan.id}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-8">
          Você será direcionado para o pagamento e depois completará seu cadastro
        </p>

        {user && (
          <div className="text-center mt-3">
            <button
              onClick={() => navigate('/dashboard/home')}
              className="text-sm text-slate-400 hover:text-slate-600 underline underline-offset-2"
            >
              Ir para o painel →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
