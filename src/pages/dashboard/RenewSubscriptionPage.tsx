import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CreditCard, Zap, ExternalLink, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useSubscription, fetchPlansByUserType, createPendingSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { SUBSCRIPTION_STATUS_LABELS } from '@/utils/constants'
import type { SubscriptionPlan, BillingCycle, UserSubscription } from '@/types'

// ─── Current subscription banner ─────────────────────────────

type SubWithPlan = UserSubscription & { plan?: SubscriptionPlan }

function CurrentSubCard({ sub }: { sub: SubWithPlan }) {
  const isActive = sub.status === 'active' || sub.status === 'trial'
  const statusLabel = SUBSCRIPTION_STATUS_LABELS[sub.status] ?? sub.status

  return (
    <div className={`rounded-2xl border p-5 ${isActive ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
          {isActive ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">{sub.plan?.display_name ?? 'Plano'}</p>
          <p className="text-sm text-slate-500">
            {statusLabel}
            {sub.subscription_end_date && (
              <> · Vence em {format(new Date(sub.subscription_end_date), "dd/MM/yyyy", { locale: ptBR })}</>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-900">
            {sub.current_price === 0 ? 'Grátis'
              : sub.current_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          {sub.current_price > 0 && (
            <p className="text-xs text-slate-400">{sub.billing_cycle === 'yearly' ? '/ano' : '/mês'}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Plan Card ────────────────────────────────────────────────

function PlanCard({
  plan,
  currentPlanId,
  onSelect,
  loading,
}: {
  plan: SubscriptionPlan
  currentPlanId?: string
  onSelect: (plan: SubscriptionPlan, cycle: BillingCycle) => void
  loading: string | null
}) {
  const isCurrent = plan.id === currentPlanId
  const isFree    = plan.price_monthly === 0

  // Somente anual: se existirem links mensais também mostra toggle
  const hasMonthly = !!plan.payment_link_monthly
  const hasYearly  = !!plan.payment_link_yearly || !!plan.price_yearly

  const [cycle, setCycle] = useState<BillingCycle>(hasYearly ? 'yearly' : 'monthly')
  const isLoading = loading === `${plan.id}-${cycle}`

  const price = cycle === 'yearly' && plan.price_yearly
    ? plan.price_yearly
    : plan.price_monthly

  const yearlyDiscount = plan.price_yearly && plan.price_monthly > 0
    ? Math.round(100 - (plan.price_yearly / (plan.price_monthly * 12)) * 100)
    : null

  return (
    <div className={`relative bg-white rounded-2xl border p-6 flex flex-col transition-shadow ${isCurrent ? 'border-primary-400 shadow-md' : 'border-slate-200 hover:shadow-md'}`}>
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Plano atual</span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">{plan.display_name}</h3>
        {plan.description && <p className="text-sm text-slate-500 mt-0.5">{plan.description}</p>}
      </div>

      {/* Toggle mensal/anual — só se ambos os ciclos estiverem disponíveis */}
      {!isFree && hasMonthly && hasYearly && (
        <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setCycle('monthly')}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${cycle === 'monthly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setCycle('yearly')}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${cycle === 'yearly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
          >
            Anual
            {yearlyDiscount && (
              <span className="bg-green-100 text-green-700 text-[10px] px-1 rounded font-bold">-{yearlyDiscount}%</span>
            )}
          </button>
        </div>
      )}

      {/* Badge "Cobrança anual" quando só há plano anual */}
      {!isFree && hasYearly && !hasMonthly && (
        <div className="mb-4">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
            Cobrança anual
          </span>
        </div>
      )}

      {/* Preço */}
      <div className="mb-5">
        {isFree ? (
          <p className="text-3xl font-black text-slate-900">Grátis</p>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900">
                {price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <span className="text-slate-400 text-sm">/{cycle === 'yearly' ? 'ano' : 'mês'}</span>
            </div>
            {cycle === 'yearly' && plan.price_monthly > 0 && (
              <p className="text-xs text-green-600 mt-0.5">
                ≈ {(price / 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
              </p>
            )}
          </>
        )}
      </div>

      {/* Benefícios */}
      <ul className="space-y-2 flex-1 mb-6">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      {isFree ? (
        <div className="text-center text-sm text-slate-400 py-2">Incluído no cadastro</div>
      ) : (
        <Button
          onClick={() => onSelect(plan, cycle)}
          disabled={isCurrent}
          isLoading={isLoading}
          className="w-full"
          variant={isCurrent ? 'outline' : 'default'}
        >
          {isCurrent ? 'Plano ativo' : <><CreditCard size={15} /> Assinar {cycle === 'yearly' ? 'anual' : 'mensal'}</>}
        </Button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function RenewSubscriptionPage() {
  const { user, profile } = useAuthStore()
  const queryClient       = useQueryClient()
  const { data: currentSub } = useSubscription()
  const [loadingKey, setLoadingKey] = useState<string | null>(null)

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans', profile?.user_type],
    queryFn:  () => fetchPlansByUserType(profile!.user_type),
    enabled:  !!profile?.user_type,
  })

  const checkout = useMutation({
    mutationFn: async ({ plan, cycle }: { plan: SubscriptionPlan; cycle: BillingCycle }) => {
      const price = cycle === 'yearly' && plan.price_yearly
        ? plan.price_yearly
        : plan.price_monthly

      // Cria assinatura pendente no banco
      const sub = await createPendingSubscription(user!.id, plan.id, cycle, price)

      // Chama Edge Function que cria checkout hospedado no PagBank.
      // O PagBank notifica o webhook automaticamente ao confirmar o pagamento,
      // ativando a assinatura sem intervenção manual — funciona para qualquer escala.
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            subscription_id: sub.id,
            plan_id:         plan.id,
            billing_cycle:   cycle,
          }),
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string })?.error ?? 'Erro ao criar checkout')
      }

      const { checkout_url } = await res.json()
      if (checkout_url) window.open(checkout_url, '_blank')
    },
    onSuccess: (_, { plan }) => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      toast.success(`Abrindo pagamento para o plano ${plan.display_name}`, {
        description: 'Após o pagamento, seu plano será ativado automaticamente.',
        duration: 6000,
      })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? ''
      toast.error(msg || 'Erro ao processar. Tente novamente.')
    },
    onSettled: () => setLoadingKey(null),
  })

  const handleSelect = (plan: SubscriptionPlan, cycle: BillingCycle) => {
    setLoadingKey(`${plan.id}-${cycle}`)
    checkout.mutate({ plan, cycle })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Assinatura</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie seu plano e pagamentos</p>
      </div>

      {/* Plano atual */}
      {currentSub && <CurrentSubCard sub={currentSub} />}

      {/* Alerta — pagamento pendente */}
      {currentSub?.status === 'pending' && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Aguardando confirmação do pagamento</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Seu plano será ativado automaticamente pelo PagSeguro. Isso pode levar alguns minutos.
            </p>
          </div>
        </div>
      )}

      {/* Grade de planos */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Zap size={14} /> {currentSub ? 'Alterar plano' : 'Escolha seu plano'}
        </h2>

        {plansLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentPlanId={currentSub?.plan_id}
                onSelect={handleSelect}
                loading={loadingKey}
              />
            ))}
          </div>
        )}
      </section>

      {/* Info de pagamento */}
      <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <CreditCard size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-500">
          <p className="font-medium text-slate-700 mb-0.5">Pagamento seguro via PagSeguro</p>
          <p>Aceitamos cartão de crédito, boleto bancário e PIX. Todos os pagamentos são processados pelo PagSeguro com criptografia SSL.</p>
          <a
            href="https://pagseguro.uol.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary-600 hover:underline mt-1.5 text-xs"
          >
            Saiba mais sobre o PagSeguro <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  )
}
