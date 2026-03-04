import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, Zap } from 'lucide-react'
import { fetchPlansByUserType } from '@/hooks/useSubscription'
import type { SubscriptionPlan } from '@/types'

// ─── Types ────────────────────────────────────────────────────

type Tab = { label: string; userType: string }

const TABS: Tab[] = [
  { label: 'Empresa',       userType: 'empresa' },
  { label: 'Profissional',  userType: 'profissional' },
  { label: 'Fornecedor',    userType: 'fornecedor' },
]

// ─── Plan Card ────────────────────────────────────────────────

function PlanCard({ plan, yearly }: { plan: SubscriptionPlan; yearly: boolean }) {
  const isFree  = plan.price_monthly === 0
  const price   = yearly && plan.price_yearly ? plan.price_yearly / 12 : plan.price_monthly
  const discount = plan.price_yearly && plan.price_monthly > 0
    ? Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)
    : 0

  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-md ${
      isFree
        ? 'border-slate-200 bg-white'
        : 'border-primary-300 bg-gradient-to-b from-primary-50 to-white'
    }`}>
      {/* Yearly discount badge */}
      {yearly && discount > 0 && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
          -{discount}% no anual
        </span>
      )}

      <p className="text-xs font-semibold uppercase tracking-widest text-primary-500 mb-1">
        {plan.display_name}
      </p>
      {plan.description && (
        <p className="text-sm text-slate-500 mb-4 leading-snug">{plan.description}</p>
      )}

      {/* Price */}
      <div className="mb-6">
        {isFree ? (
          <p className="text-4xl font-extrabold text-slate-900">Grátis</p>
        ) : (
          <>
            <div className="flex items-end gap-1">
              <span className="text-sm text-slate-400 self-start mt-2">R$</span>
              <span className="text-4xl font-extrabold text-slate-900">
                {price.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-sm text-slate-400 mb-1">/mês</span>
            </div>
            {yearly && plan.price_yearly && (
              <p className="text-xs text-slate-400 mt-0.5">
                Cobrado R$ {plan.price_yearly.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} /ano
              </p>
            )}
          </>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2.5 flex-1 mb-6">
        {plan.features.map((feat, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
            <Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />
            {feat}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        to="/escolher-plano"
        className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
          isFree
            ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
            : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
      >
        {isFree ? 'Começar gratuitamente' : 'Assinar agora'}
      </Link>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────

function PlanSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 space-y-4 animate-pulse">
      <div className="h-3 w-24 bg-slate-100 rounded" />
      <div className="h-5 w-40 bg-slate-100 rounded" />
      <div className="h-10 w-28 bg-slate-100 rounded" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-100 rounded w-full" />
        ))}
      </div>
      <div className="h-10 bg-slate-100 rounded-xl" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function PricingPage() {
  const [activeTab, setActiveTab] = useState<Tab>(TABS[0])
  const [yearly, setYearly] = useState(false)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['public-plans', activeTab.userType],
    queryFn:  () => fetchPlansByUserType(activeTab.userType),
    staleTime: 1000 * 60 * 10,
  })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-extrabold text-primary-700 tracking-tight">
            Visumo
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Entrar
            </Link>
            <Link
              to="/escolher-plano"
              className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-16">
        {/* Heading */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-2">Planos e preços</p>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-3">
            Encontre o plano certo para você
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto">
            Comece gratuitamente e escale conforme o seu negócio crescer.
            Cancele quando quiser, sem fidelidade.
          </p>
        </div>

        {/* User type tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.userType}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab.userType === tab.userType
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center items-center gap-3 mb-10">
          <span className={`text-sm font-medium ${!yearly ? 'text-slate-900' : 'text-slate-400'}`}>Mensal</span>
          <button
            onClick={() => setYearly((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-primary-600' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${yearly ? 'left-7' : 'left-1'}`} />
          </button>
          <span className={`text-sm font-medium ${yearly ? 'text-slate-900' : 'text-slate-400'}`}>
            Anual
            <span className="ml-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
              até 20% off
            </span>
          </span>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <PlanSkeleton key={i} />)
            : plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} yearly={yearly} />
              ))
          }
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 bg-primary-600 rounded-2xl p-8 text-center text-white">
          <Zap size={28} className="mx-auto mb-3 opacity-80" />
          <h2 className="text-2xl font-bold mb-2">Pronto para começar?</h2>
          <p className="text-primary-200 mb-6 text-sm">
            Crie sua conta gratuitamente e comece a usar o Visumo hoje mesmo.
          </p>
          <Link
            to="/escolher-plano"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-primary-700 font-semibold text-sm hover:bg-primary-50 transition-colors"
          >
            Criar conta grátis
          </Link>
        </div>

        {/* FAQ teaser */}
        <p className="text-center text-sm text-slate-400 mt-8">
          Dúvidas?{' '}
          <Link to="/" className="text-primary-600 hover:underline">Fale conosco</Link>
          {' · '}
          <Link to="/termos" className="hover:text-slate-600 transition-colors">Termos</Link>
          {' · '}
          <Link to="/privacidade" className="hover:text-slate-600 transition-colors">Privacidade</Link>
        </p>
      </main>
    </div>
  )
}
