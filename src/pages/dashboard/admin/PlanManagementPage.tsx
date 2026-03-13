import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit2, X, XCircle, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { USER_TYPE_LABELS } from '@/utils/constants'
import type { SubscriptionPlan } from '@/types'

// ─── Schema ──────────────────────────────────────────────────

const schema = z.object({
  display_name:            z.string().min(2, 'Nome muito curto'),
  description:             z.string().optional(),
  price_monthly:           z.string().min(1, 'Informe o preço mensal'),
  price_yearly:            z.string().optional(),
  features:                z.string().min(1, 'Adicione ao menos um benefício'),
  max_active_projects:     z.string().optional(),
  max_proposals_per_month: z.string().optional(),
  payment_link_monthly:    z.string().optional(),
  payment_link_yearly:     z.string().optional(),
  display_order:           z.string().optional(),
  is_active:               z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

// ─── Edit Modal ───────────────────────────────────────────────

function EditPlanModal({ plan, onClose }: { plan: SubscriptionPlan; onClose: () => void }) {
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      display_name:            plan.display_name,
      description:             plan.description ?? '',
      price_monthly:           plan.price_monthly.toString(),
      price_yearly:            plan.price_yearly?.toString() ?? '',
      features:                plan.features.join('\n'),
      max_active_projects:     plan.max_active_projects?.toString() ?? '',
      max_proposals_per_month: plan.max_proposals_per_month?.toString() ?? '',
      payment_link_monthly:    plan.payment_link_monthly ?? '',
      payment_link_yearly:     plan.payment_link_yearly ?? '',
      display_order:           plan.display_order.toString(),
      is_active:               plan.is_active,
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          display_name:            data.display_name,
          description:             data.description || null,
          price_monthly:           parseFloat(data.price_monthly),
          price_yearly:            data.price_yearly ? parseFloat(data.price_yearly) : null,
          features:                data.features.split('\n').map((f) => f.trim()).filter(Boolean),
          max_active_projects:     data.max_active_projects ? parseInt(data.max_active_projects) : null,
          max_proposals_per_month: data.max_proposals_per_month ? parseInt(data.max_proposals_per_month) : null,
          payment_link_monthly:    data.payment_link_monthly || null,
          payment_link_yearly:     data.payment_link_yearly || null,
          display_order:           data.display_order ? parseInt(data.display_order) : plan.display_order,
          is_active:               data.is_active,
        })
        .eq('id', plan.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
      toast.success('Plano atualizado!')
      onClose()
    },
    onError: () => toast.error('Erro ao salvar plano.'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">Editar plano</h2>
            <p className="text-xs text-slate-400 mt-0.5">{plan.name} · {USER_TYPE_LABELS[plan.user_type]}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="display_name" required>Nome exibido</Label>
              <Input id="display_name" error={errors.display_name?.message} {...register('display_name')} />
              {errors.display_name && <p className="text-xs text-red-500">{errors.display_name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="price_monthly" required>Preço mensal (R$)</Label>
              <Input id="price_monthly" type="number" min="0" step="0.01" error={errors.price_monthly?.message} {...register('price_monthly')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price_yearly">Preço anual (R$)</Label>
              <Input id="price_yearly" type="number" min="0" step="0.01" placeholder="Opcional" {...register('price_yearly')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" placeholder="Subtítulo do plano" {...register('description')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="features" required>Benefícios (um por linha)</Label>
            <textarea
              id="features"
              rows={5}
              className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 resize-none focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
              placeholder={"Criar projetos ilimitados\nReceber propostas\nSuporte prioritário"}
              {...register('features')}
            />
            {errors.features && <p className="text-xs text-red-500">{errors.features.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="max_active_projects">Máx. projetos ativos</Label>
              <Input id="max_active_projects" type="number" min="0" placeholder="Ilimitado" {...register('max_active_projects')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max_proposals_per_month">Máx. propostas/mês</Label>
              <Input id="max_proposals_per_month" type="number" min="0" placeholder="Ilimitado" {...register('max_proposals_per_month')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment_link_monthly">Link pagamento mensal (PagBank)</Label>
            <Input id="payment_link_monthly" placeholder="https://pagseguro.uol.com.br/..." {...register('payment_link_monthly')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment_link_yearly">Link pagamento anual (PagBank)</Label>
            <Input id="payment_link_yearly" placeholder="https://pagseguro.uol.com.br/..." {...register('payment_link_yearly')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="display_order">Ordem de exibição</Label>
              <Input id="display_order" type="number" min="0" {...register('display_order')} />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary-600" {...register('is_active')} />
                <span className="text-sm text-slate-700">Plano ativo</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" isLoading={mutation.isPending}>Salvar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Plan Card ────────────────────────────────────────────────

function PlanCard({ plan, onEdit }: { plan: SubscriptionPlan; onEdit: () => void }) {
  return (
    <div className={`bg-white rounded-2xl border p-5 space-y-4 ${plan.is_active ? 'border-green-300 ring-1 ring-green-100' : 'border-slate-100 opacity-55'}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
              {USER_TYPE_LABELS[plan.user_type]}
            </span>
            {plan.is_active ? (
              <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                <Globe size={11} /> Visível online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-200">
                <XCircle size={11} /> Inativo
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-900">{plan.display_name}</h3>
          {plan.description && <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>}
        </div>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Edit2 size={13} /> Editar
        </Button>
      </div>

      <div className="flex items-baseline gap-3">
        <div>
          <span className="text-2xl font-bold text-slate-900">
            {plan.price_monthly === 0 ? 'Grátis' : `R$ ${plan.price_monthly.toFixed(2)}`}
          </span>
          {plan.price_monthly > 0 && <span className="text-xs text-slate-400">/mês</span>}
        </div>
        {plan.price_yearly && (
          <div className="text-sm text-slate-500">
            R$ {plan.price_yearly.toFixed(2)}<span className="text-xs">/ano</span>
          </div>
        )}
      </div>

      <ul className="space-y-1">
        {plan.features.slice(0, 4).map((f, i) => (
          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
            <span className="text-green-500 mt-0.5 shrink-0">✓</span> {f}
          </li>
        ))}
        {plan.features.length > 4 && (
          <li className="text-xs text-slate-400">+{plan.features.length - 4} mais...</li>
        )}
      </ul>

      <div className="flex gap-3 text-xs text-slate-500 pt-1 border-t border-slate-100">
        {plan.payment_link_monthly && (
          <a href={plan.payment_link_monthly} target="_blank" rel="noopener noreferrer"
            className="text-primary-600 hover:underline truncate">
            Link mensal ↗
          </a>
        )}
        {plan.payment_link_yearly && (
          <a href={plan.payment_link_yearly} target="_blank" rel="noopener noreferrer"
            className="text-primary-600 hover:underline truncate">
            Link anual ↗
          </a>
        )}
        {!plan.payment_link_monthly && !plan.payment_link_yearly && (
          <span className="text-slate-300">Sem links de pagamento</span>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function PlanManagementPage() {
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null)
  const [onlyActive, setOnlyActive] = useState(true)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('is_active', { ascending: false })
        .order('display_order', { ascending: true })
      if (error) throw error
      return data as SubscriptionPlan[]
    },
  })

  const activePlans = plans.filter((p) => p.is_active)
  const displayed = onlyActive ? activePlans : plans

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planos de assinatura</h1>
          <p className="text-slate-500 text-sm mt-1">
            {activePlans.length} visíveis online · {plans.length} no total
          </p>
        </div>

        {/* Filtro */}
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-medium shrink-0">
          <button
            onClick={() => setOnlyActive(true)}
            className={`px-4 py-2 transition-colors ${onlyActive ? 'bg-green-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Visíveis online
          </button>
          <button
            onClick={() => setOnlyActive(false)}
            className={`px-4 py-2 transition-colors ${!onlyActive ? 'bg-primary-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Todos ({plans.length})
          </button>
        </div>
      </div>

      {onlyActive && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <Globe size={15} className="shrink-0" />
          Estes são os planos exibidos na página <strong>/escolher-plano</strong>. Edite preços, benefícios e links de pagamento aqui.
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((p) => (
            <PlanCard key={p.id} plan={p} onEdit={() => setEditing(p)} />
          ))}
        </div>
      )}

      {editing && <EditPlanModal plan={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
