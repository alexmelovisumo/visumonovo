import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusCircle, RefreshCw, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { USER_TYPE_LABELS } from '@/utils/constants'
import type { Coupon, UserType, CouponType } from '@/types'

// ─── Schema ──────────────────────────────────────────────────

const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  percentage:    'Percentual (%)',
  fixed_amount:  'Valor fixo (R$)',
  free_months:   'Meses grátis',
  lifetime_free: 'Acesso vitalício grátis',
}

const schema = z.object({
  code:                   z.string().min(3, 'Mínimo 3 caracteres').toUpperCase(),
  type:                   z.enum(['percentage', 'fixed_amount', 'free_months', 'lifetime_free']),
  value:                  z.string().min(1, 'Informe o valor'),
  max_uses:               z.string().optional(),
  valid_until:            z.string().optional(),
  applicable_user_types:  z.array(z.enum(['empresa', 'profissional', 'fornecedor', 'fornecedor_empresa', 'empresa_prestadora', 'admin'])).optional(),
})

type FormData = z.infer<typeof schema>

// ─── Random code generator ────────────────────────────────────

function randomCode() {
  return Math.random().toString(36).substring(2, 9).toUpperCase()
}

// ─── Create Form Modal ────────────────────────────────────────

function CreateCouponModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedTypes, setSelectedTypes] = useState<UserType[]>([])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'percentage', value: '', code: '' },
  })

  const couponType = watch('type')

  const toggleUserType = (t: UserType) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from('coupons').insert({
        code:                  data.code,
        type:                  data.type,
        value:                 parseFloat(data.value),
        max_uses:              data.max_uses ? parseInt(data.max_uses) : null,
        valid_until:           data.valid_until || null,
        applicable_user_types: selectedTypes.length > 0 ? selectedTypes : null,
        is_active:             true,
        created_by:            user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast.success('Cupom criado!')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? ''
      toast.error(msg.includes('duplicate') ? 'Código já existe.' : msg || 'Erro ao criar cupom.')
    },
  })

  const USER_TYPES: UserType[] = ['empresa', 'profissional', 'fornecedor', 'fornecedor_empresa', 'empresa_prestadora']

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Novo cupom</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate({ ...d, applicable_user_types: selectedTypes }))} className="p-6 space-y-4">
          {/* Code */}
          <div className="space-y-1.5">
            <Label htmlFor="code" required>Código</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                placeholder="Ex: PROMO20"
                error={errors.code?.message}
                className="uppercase"
                {...register('code')}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => setValue('code', randomCode())}
              >
                <RefreshCw size={14} />
              </Button>
            </div>
            {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label htmlFor="type" required>Tipo</Label>
            <select
              id="type"
              className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
              {...register('type')}
            >
              {(Object.keys(COUPON_TYPE_LABELS) as CouponType[]).map((t) => (
                <option key={t} value={t}>{COUPON_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Value */}
          {couponType !== 'lifetime_free' && (
            <div className="space-y-1.5">
              <Label htmlFor="value" required>
                {couponType === 'percentage' ? 'Percentual (%)' :
                 couponType === 'fixed_amount' ? 'Valor (R$)' :
                 'Número de meses'}
              </Label>
              <Input
                id="value"
                type="number"
                min="0"
                step={couponType === 'percentage' ? '1' : '0.01'}
                placeholder="0"
                error={errors.value?.message}
                {...register('value')}
              />
            </div>
          )}
          {couponType === 'lifetime_free' && (
            <input type="hidden" value="0" {...register('value')} />
          )}

          {/* Max uses */}
          <div className="space-y-1.5">
            <Label htmlFor="max_uses">Limite de usos (vazio = ilimitado)</Label>
            <Input id="max_uses" type="number" min="1" placeholder="Ex: 100" {...register('max_uses')} />
          </div>

          {/* Valid until */}
          <div className="space-y-1.5">
            <Label htmlFor="valid_until">Válido até</Label>
            <Input id="valid_until" type="date" {...register('valid_until')} />
          </div>

          {/* Applicable types */}
          <div className="space-y-2">
            <Label>Aplicável a (vazio = todos)</Label>
            <div className="flex gap-2 flex-wrap">
              {USER_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleUserType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    selectedTypes.includes(t)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
                  }`}
                >
                  {USER_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" isLoading={mutation.isPending}>Criar cupom</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function CouponGeneratorPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Coupon[]
    },
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('coupons').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast.success('Cupom atualizado.')
    },
    onError: () => toast.error('Erro ao atualizar cupom.'),
    onSettled: () => setTogglingId(null),
  })

  const formatValue = (c: Coupon) => {
    if (c.type === 'lifetime_free') return 'Vitalício grátis'
    if (c.type === 'percentage') return `${c.value}%`
    if (c.type === 'fixed_amount') return `R$ ${c.value.toFixed(2)}`
    return `${c.value} mes${c.value !== 1 ? 'es' : ''}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cupons de desconto</h1>
          <p className="text-slate-500 text-sm mt-1">{coupons.length} cupons cadastrados</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <PlusCircle size={16} /> Novo cupom
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <p className="text-center text-slate-400 py-16">Nenhum cupom cadastrado.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Código</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Tipo / Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden sm:table-cell">Usos</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden md:table-cell">Validade</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden lg:table-cell">Aplica a</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs">Ativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map((c) => (
                  <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${!c.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-500">{COUPON_TYPE_LABELS[c.type]}</p>
                      <p className="font-semibold text-slate-900">{formatValue(c)}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-slate-600">
                      {c.current_uses} {c.max_uses ? `/ ${c.max_uses}` : '(ilimitado)'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">
                      {c.valid_until
                        ? format(new Date(c.valid_until), "dd/MM/yyyy", { locale: ptBR })
                        : 'Sem validade'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                      {c.applicable_user_types
                        ? c.applicable_user_types.map((t) => USER_TYPE_LABELS[t]).join(', ')
                        : 'Todos'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setTogglingId(c.id)
                          toggleActive.mutate({ id: c.id, is_active: !c.is_active })
                        }}
                        disabled={togglingId === c.id && toggleActive.isPending}
                        className="text-slate-400 hover:text-primary-600 transition-colors"
                      >
                        {c.is_active
                          ? <ToggleRight size={22} className="text-green-500" />
                          : <ToggleLeft size={22} />
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <CreateCouponModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
