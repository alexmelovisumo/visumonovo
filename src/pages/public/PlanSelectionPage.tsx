import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, Zap, ArrowRight, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import {
  fetchPlansByUserType,
  createFreeSubscription,
  createPendingSubscription,
} from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SubscriptionPlan } from '@/types'

// ─── Helpers ────────────────────────────────────────────────

function formatPrice(value: number) {
  if (value === 0) return 'Grátis'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function yearlySavings(monthly: number, yearly: number | null) {
  if (!yearly || monthly === 0) return null
  const pct = Math.round((1 - yearly / (monthly * 12)) * 100)
  return pct > 0 ? pct : null
}

const POPULAR_PLANS: Record<string, string> = {
  empresa:      'empresa_profissional',
  profissional: 'profissional_basico',
  fornecedor:   'fornecedor_basico',
}

// ─── Plan Card ───────────────────────────────────────────────

interface PlanCardProps {
  plan: SubscriptionPlan
  billing: 'monthly' | 'yearly'
  isPopular: boolean
  isLoading: boolean
  onSelect: (plan: SubscriptionPlan) => void
}

function PlanCard({ plan, billing, isPopular, isLoading, onSelect }: PlanCardProps) {
  const isFree = plan.price_monthly === 0
  const price = billing === 'yearly' && plan.price_yearly ? plan.price_yearly / 12 : plan.price_monthly
  const savings = yearlySavings(plan.price_monthly, plan.price_yearly)

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border-2 p-6 transition-all',
        isPopular
          ? 'border-primary-500 shadow-lg shadow-primary-100 bg-white scale-[1.02]'
          : 'border-slate-200 bg-white hover:border-primary-300'
      )}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white shadow">
            <Zap size={11} /> Mais popular
          </span>
        </div>
      )}

      {/* Plan name */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">{plan.display_name}</h3>
        {plan.description && (
          <p className="text-sm text-slate-500 mt-0.5">{plan.description}</p>
        )}
      </div>

      {/* Price */}
      <div className="mb-5">
        {isFree ? (
          <p className="text-3xl font-bold text-slate-900">Grátis</p>
        ) : (
          <div>
            <div className="flex items-end gap-1">
              <span className="text-sm text-slate-500 mb-1">R$</span>
              <span className="text-3xl font-bold text-slate-900">
                {price.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-slate-500 text-sm mb-1">/mês</span>
            </div>
            {billing === 'yearly' && plan.price_yearly && (
              <p className="text-xs text-slate-500 mt-0.5">
                {formatPrice(plan.price_yearly)}/ano
                {savings && (
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                    -{savings}%
                  </span>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-2.5 mb-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check size={15} className="mt-0.5 shrink-0 text-primary-500" />
            <span className="text-sm text-slate-600">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button
        onClick={() => onSelect(plan)}
        isLoading={isLoading}
        variant={isPopular ? 'default' : isFree ? 'outline' : 'outline'}
        className={cn('w-full', isPopular && 'shadow-md')}
      >
        {isFree ? 'Começar grátis' : 'Assinar agora'}
        {!isFree && <ArrowRight size={16} />}
      </Button>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────

export function PlanSelectionPage() {
  const navigate = useNavigate()
  const { user, profile, signOut, fetchProfile } = useAuthStore()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)

  const userType = profile?.user_type ?? 'empresa'

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans', userType],
    queryFn:  () => fetchPlansByUserType(userType),
    enabled:  true,
  })

  const popularPlanName = POPULAR_PLANS[userType] ?? ''

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!user) {
      navigate('/cadastro')
      return
    }

    setLoadingPlanId(plan.id)

    try {
      if (plan.price_monthly === 0) {
        await createFreeSubscription(user.id, plan.id)
        await fetchProfile(user.id)   // garante profile carregado no store
        toast.success('Plano gratuito ativado!')
        navigate('/dashboard/home', { replace: true })
      } else {
        const price = billing === 'yearly' && plan.price_yearly
          ? plan.price_yearly / 12
          : plan.price_monthly
        await createPendingSubscription(user.id, plan.id, billing, price)
        await fetchProfile(user.id)   // garante profile carregado no store
        toast.info('Assinatura criada. Complete o pagamento.')
        navigate('/dashboard/aguardando-pagamento', { replace: true })
      }
    } catch (err: unknown) {
      // Supabase retorna PostgrestError (não é instância de Error padrão)
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? ''

      console.error('Erro ao selecionar plano:', err)

      // Só redireciona para login se a sessão realmente expirou
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

  const userTypeLabels: Record<string, string> = {
    empresa:      'Empresa',
    profissional: 'Profissional',
    fornecedor:   'Fornecedor',
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
        <div className="text-center mb-10">
          <Badge variant="default" className="mb-3">
            Planos para {userTypeLabels[userType] ?? 'você'}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Escolha o plano ideal
          </h1>
          <p className="text-slate-500 text-base max-w-lg mx-auto">
            Comece gratuitamente e faça upgrade quando precisar de mais recursos.
          </p>

          {/* Billing toggle */}
          {plans.some((p) => p.price_yearly) && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setBilling('monthly')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  billing === 'monthly'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Mensal
              </button>
              <button
                onClick={() => setBilling('yearly')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  billing === 'yearly'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Anual
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                  billing === 'yearly' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
                )}>
                  -25%
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Plans grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div
            className={cn(
              'grid gap-5',
              plans.length <= 3
                ? 'sm:grid-cols-2 lg:grid-cols-3'
                : plans.length === 4
                  ? 'sm:grid-cols-2 lg:grid-cols-4'
                  : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
            )}
          >
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billing={billing}
                isPopular={plan.name === popularPlanName}
                isLoading={loadingPlanId === plan.id}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-sm text-slate-400 mt-10">
          Todos os planos incluem acesso à plataforma. Cancele a qualquer momento.
        </p>

        {/* Skip link (already logged in, has subscription) */}
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
