import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { USER_TYPE_LABELS, SUBSCRIPTION_STATUS_LABELS } from '@/utils/constants'
import type { UserSubscription, SubscriptionStatus } from '@/types'

type SubWithUser = UserSubscription & {
  user: { email: string; full_name: string | null; user_type: string }
  plan: { display_name: string; name: string }
}

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  trial:     'bg-amber-100 text-amber-700',
  active:    'bg-green-100 text-green-700',
  pending:   'bg-rose-100 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-500',
  expired:   'bg-slate-100 text-slate-500',
}

const STATUSES: SubscriptionStatus[] = ['active', 'trial', 'pending', 'cancelled', 'expired']

// ─── Page ─────────────────────────────────────────────────────

export function PaymentLogsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all')

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          user:profiles(email, full_name, user_type),
          plan:subscription_plans(display_name, name)
        `)
        .order('created_at', { ascending: false })
        .limit(300)
      if (error) throw error
      return (data as unknown as SubWithUser[]).map((s) => ({
        ...s,
        user: Array.isArray(s.user) ? s.user[0] : s.user,
        plan: Array.isArray(s.plan) ? s.plan[0] : s.plan,
      }))
    },
  })

  const filtered = subscriptions.filter((s) => {
    const u = s.user
    const matchSearch =
      !search ||
      (u?.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (s.coupon_code ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchSearch && matchStatus
  })

  // Aggregate revenue from active subscriptions
  const totalRevenue = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((acc, s) => acc + (s.current_price ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Logs de pagamentos</h1>
        <p className="text-slate-500 text-sm mt-1">
          {subscriptions.length} assinaturas · receita ativa estimada:{' '}
          <span className="font-semibold text-green-700">
            {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} /mês
          </span>
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por e-mail, nome ou cupom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['all', ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-300'
              }`}
            >
              {s === 'all' ? 'Todos' : SUBSCRIPTION_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-400 py-16">Nenhum registro encontrado.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Plano</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden sm:table-cell">Ciclo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden md:table-cell">Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden lg:table-cell">Cupom</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden lg:table-cell">Início</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden xl:table-cell">Vencimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => {
                  const u = s.user
                  const userTypeLabel = u?.user_type
                    ? USER_TYPE_LABELS[u.user_type as keyof typeof USER_TYPE_LABELS]
                    : null
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900 truncate max-w-[180px]">
                            {u?.full_name ?? u?.email ?? '—'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs text-slate-400 truncate max-w-[140px]">{u?.email}</p>
                            {userTypeLabel && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
                                {userTypeLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {s.plan?.display_name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>
                          {SUBSCRIPTION_STATUS_LABELS[s.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-500">
                        {s.billing_cycle === 'monthly' ? 'Mensal' : 'Anual'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-sm font-medium text-slate-900">
                        {s.current_price === 0
                          ? <span className="text-slate-400">Grátis</span>
                          : s.current_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        }
                        {s.discount_applied > 0 && (
                          <span className="text-xs text-green-600 ml-1">(-{s.discount_applied}%)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {s.coupon_code
                          ? <span className="font-mono text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{s.coupon_code}</span>
                          : <span className="text-xs text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                        {s.subscription_start_date
                          ? format(new Date(s.subscription_start_date), 'dd/MM/yyyy', { locale: ptBR })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-xs text-slate-500">
                        {s.subscription_end_date
                          ? format(new Date(s.subscription_end_date), 'dd/MM/yyyy', { locale: ptBR })
                          : s.trial_end_date
                            ? `Trial até ${format(new Date(s.trial_end_date), 'dd/MM/yyyy', { locale: ptBR })}`
                            : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
