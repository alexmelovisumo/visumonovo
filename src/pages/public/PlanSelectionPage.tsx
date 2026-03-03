import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, Zap, ArrowRight, LogOut, Tag, X, Gift } from 'lucide-react'
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
  discountPct: number   // 0–100
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

  if (!data) {
    return { valid: false, discountPct: 0, label: '', code: normalized }
  }

  // Verifica expiração
  if (data.valid_until && new Date(data.valid_until) < new Date()) {
    return { valid: false, discountPct: 0, label: '', code: normalized }
  }

  // Verifica usos
  if (data.max_uses !== null && data.current_uses >= data.max_uses) {
    return { valid: false, discountPct: 0, label: '', code: normalized }
  }

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

// ─── Helpers ────────────────────────────────────────────────

function applyDiscount(price: number, discountPct: number): number {
  return Math.max(0, price * (1 - discountPct / 100))
}

// ─── Plan Card ───────────────────────────────────────────────

interface PlanCardProps {
  plan: SubscriptionPlan
  coupon: CouponResult | null
  isHighlighted: boolean
  isLoading: boolean
  onSelect: (plan: SubscriptionPlan) => void
}

function PlanCard({ plan, coupon, isHighlighted, isLoading, onSelect }: PlanCardProps) {
  const originalPrice = plan.price_yearly ?? 0
  const hasDiscount = coupon?.valid && coupon.discountPct > 0
  const finalPrice = hasDiscount ? applyDiscount(originalPrice, coupon!.discountPct) : originalPrice
  const isLifetimeFree = hasDiscount && finalPrice === 0

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border-2 p-6 transition-all bg-white',
        isHighlighted
          ? 'border-primary-500 shadow-lg shadow-primary-100 scale-[1.02]'
          : 'border-slate-200 hover:border-primary-300'
      )}
    >
      {isHighlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white shadow">
            <Zap size={11} /> Recomendado
          </span>
        </div>
      )}

      {/* Nome do plano */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">{plan.display_name}</h3>
        {plan.description && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{plan.description}</p>
        )}
      </div>

      {/* Preço */}
      <div className="mb-5">
        {isLifetimeFree ? (
          <div>
            <p className="text-2xl font-black text-green-600">GRÁTIS PARA SEMPRE</p>
            {originalPrice > 0 && (
              <p className="text-sm text-slate-400 line-through mt-0.5">
                R$ {originalPrice.toLocaleString('pt-BR')}/ano
              </p>
            )}
          </div>
        ) : (
          <div>
            {hasDiscount && originalPrice > 0 && (
              <p className="text-sm text-slate-400 line-through">
                R$ {originalPrice.toLocaleString('pt-BR')}/ano
              </p>
            )}
            <div className="flex items-end gap-1">
              <span className="text-sm text-slate-500 mb-1">R$</span>
              <span className="text-3xl font-bold text-slate-900">
                {finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-slate-500 text-sm mb-1">/ano</span>
            </div>
            {hasDiscount && coupon!.discountPct > 0 && finalPrice > 0 && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 mt-1">
                -{coupon!.discountPct}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-2 mb-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check size={14} className="mt-0.5 shrink-0 text-primary-500" />
            <span className="text-sm text-slate-600">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button
        onClick={() => onSelect(plan)}
        isLoading={isLoading}
        variant={isHighlighted ? 'default' : 'outline'}
        className={cn('w-full', isHighlighted && 'shadow-md')}
      >
        {isLifetimeFree ? (
          <><Gift size={15} /> Ativar grátis</>
        ) : (
          <>Assinar agora <ArrowRight size={15} /></>
        )}
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
    <div className="max-w-md mx-auto">
      <p className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-1.5">
        <Tag size={14} className="text-primary-500" /> Tem um cupom?
      </p>

      {coupon?.valid ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <Check size={16} className="text-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-green-700">{coupon.code}</span>
            <span className="text-xs text-green-600 ml-2">— {coupon.label}</span>
          </div>
          <button
            onClick={onRemove}
            className="text-green-400 hover:text-green-600 transition-colors"
            title="Remover cupom"
          >
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
            placeholder="Digite seu cupom"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium tracking-wider placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition-all uppercase"
          />
          <Button
            onClick={handleApply}
            isLoading={loading}
            variant="outline"
            className="px-5 shrink-0"
          >
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
  const { user, profile, signOut, fetchProfile } = useAuthStore()
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)
  const [coupon, setCoupon] = useState<CouponResult | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans-all'],
    queryFn: fetchAllPlans,
  })

  // Qual plano corresponde ao tipo do usuário logado
  const userPlanMap: Record<string, string> = {
    profissional:       'plano_profissional',
    fornecedor:         'plano_fornecedor',
    empresa:            'plano_empresa',
    fornecedor_empresa: 'plano_fornecedor_empresa',
    empresa_prestadora: 'plano_empresa_prestadora',
  }
  const highlightedPlan = profile?.user_type ? (userPlanMap[profile.user_type] ?? '') : ''

  const handleApplyCoupon = async (code: string) => {
    setCouponLoading(true)
    try {
      const result = await validateCoupon(code)
      setCoupon(result)
      if (result.valid) {
        toast.success(`Cupom aplicado: ${result.label}`)
      } else {
        toast.error('Cupom inválido ou expirado.')
      }
    } finally {
      setCouponLoading(false)
    }
  }

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!user) {
      navigate('/cadastro')
      return
    }

    setLoadingPlanId(plan.id)

    try {
      const isLifetimeFree =
        coupon?.valid && coupon.discountPct === 100

      if (isLifetimeFree) {
        // Cupom 100% — cria assinatura ativa sem pagamento
        await createFreeSubscription(user.id, plan.id)
        await fetchProfile(user.id)
        toast.success('Plano ativado com cupom! Bem-vindo ao Visumo.')
        navigate('/dashboard/home', { replace: true })
      } else if ((plan.price_yearly ?? 0) === 0) {
        // Plano gratuito
        await createFreeSubscription(user.id, plan.id)
        await fetchProfile(user.id)
        toast.success('Plano gratuito ativado!')
        navigate('/dashboard/home', { replace: true })
      } else {
        // Plano pago — redireciona para link PagBank
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
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? ''

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
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-bold text-primary-700 text-lg">Visumo</span>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500 hidden sm:block">
                Olá, <strong className="text-slate-700">{profile?.full_name?.split(' ')[0] ?? 'usuário'}</strong>
              </p>
              <button
                onClick={() => { signOut(); navigate('/login') }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Escolha seu plano
          </h1>
          <p className="text-slate-500 text-base max-w-lg mx-auto">
            Planos anuais acessíveis para cada perfil do setor de comunicação visual.
          </p>
        </div>

        {/* Coupon */}
        <div className="mb-10">
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                coupon={coupon}
                isHighlighted={plan.name === highlightedPlan}
                isLoading={loadingPlanId === plan.id}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-sm text-slate-400 mt-10">
          Todos os planos incluem acesso completo à plataforma. Cobrança anual.
        </p>

        {user && (
          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/dashboard/home')}
              className="text-sm text-slate-400 hover:text-slate-600 underline underline-offset-2"
            >
              Pular e ir para o painel →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
